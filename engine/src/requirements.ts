// Matrice de conformité : toutes les obligations (DORA / RTS) de l'exercice, applicables ou non, avec leur état.
// Les bonnes pratiques TIBER n'y figurent pas : elles ne comptent jamais dans la conformité.
import { isApplicable, type Facts } from './applicability.ts';
import { expandProfile, isObligationPack, type ChecklistStatus, type ItemDef, type PackDef, type ProfileDef, type Response } from './checklist.ts';
import type { DeadlineResult } from './types.ts';
import type { DeliverableRecord, DeliverableStatus } from './registers.ts';

export type RequirementStatus = ChecklistStatus | 'info';
export type Family = 'standing' | 'stepwise';

export interface RequirementRow {
  item: ItemDef;
  family: Family;
  /** Thème (socle) ou phase (au fil du test). */
  group: string;
  /** Regroupement par texte : « DORA 26 », « RTS 9 »… */
  textKey: string;
  applicable: boolean;
  /** Raison de l'exclusion quand l'exigence n'est pas applicable. */
  excludedBy?: 'profile' | 'condition';
  status: RequirementStatus;
  response?: Response;
  stale: boolean;
  deadlines: DeadlineResult[];
  deliverables: { id: string; status: DeliverableStatus | 'untracked' }[];
  /** Une échéance liée est en retard. */
  overdue: boolean;
  lastAnswer?: { ts: string; author: string };
}

export interface Count { total: number; handled: number; open: number; in_progress: number; done: number; not_applicable: number; accepted_gap: number }

export interface RequirementsResult {
  rows: RequirementRow[];
  /** Exigences applicables « à cocher » (hors jalons d'information). */
  overall: Count;
  byFamily: Record<Family, Count>;
  byText: { key: string; count: Count }[];
  info: number;
  excluded: number;
}

export interface RequirementsInput {
  packs: PackDef[];
  profiles: ProfileDef[];
  profile: string;
  facts: Facts;
  responses: Partial<Record<string, Response>>;
  refVersion: string;
  deadlines: DeadlineResult[];
  deliverables: DeliverableRecord[];
  lastAnswers?: Partial<Record<string, { ts: string; author: string }>>;
}

const emptyCount = (): Count => ({ total: 0, handled: 0, open: 0, in_progress: 0, done: 0, not_applicable: 0, accepted_gap: 0 });

function add(c: Count, s: ChecklistStatus) {
  c.total++;
  c[s]++;
  if (s === 'done' || s === 'not_applicable' || s === 'accepted_gap') c.handled++;
}

export function textKey(i: ItemDef): string {
  const name = i.source.instrument === 'DORA' ? 'DORA' : i.source.instrument === 'RTS_2025_1190' ? 'RTS' : i.source.instrument;
  return `${name} ${i.source.article}`;
}

export function buildRequirements(input: RequirementsInput): RequirementsResult {
  const visible = expandProfile(input.profiles, input.profile);
  const results = new Map(input.deadlines.map((r) => [r.id, r]));
  const tracked = new Map(input.deliverables.filter((d) => d.deliverable_ref).map((d) => [d.deliverable_ref as string, d.status]));
  const rows: RequirementRow[] = [];
  const overall = emptyCount();
  const byFamily: Record<Family, Count> = { standing: emptyCount(), stepwise: emptyCount() };
  const byText = new Map<string, Count>();
  let info = 0;
  let excluded = 0;

  for (const pack of input.packs) {
    if (!isObligationPack(pack)) continue;
    for (const item of pack.items ?? []) {
      const family: Family = item.scope === 'standing' ? 'standing' : 'stepwise';
      const inProfile = item.profiles.some((p) => visible.has(p));
      const inCondition = isApplicable(item.applies_when, input.facts);
      const applicable = inProfile && inCondition;
      const response = input.responses[item.id];
      const isInfo = (item.display ?? 'check') === 'info';
      const status: RequirementStatus = isInfo ? 'info' : response?.status ?? 'open';
      const deadlines = (item.deadlines ?? []).map((d) => results.get(d)).filter((r): r is DeadlineResult => !!r);
      const row: RequirementRow = {
        item, family, group: family === 'standing' ? item.theme ?? '' : item.phase, textKey: textKey(item),
        applicable, ...(applicable ? {} : { excludedBy: inProfile ? 'condition' : 'profile' }),
        status, ...(response ? { response } : {}), stale: !!response && response.ref_version !== input.refVersion,
        deadlines,
        deliverables: (item.deliverables ?? []).map((id) => ({ id, status: tracked.get(id) ?? 'untracked' })),
        overdue: deadlines.some((d) => d.state === 'overdue' && d.display === 'check'),
        ...(input.lastAnswers?.[item.id] ? { lastAnswer: input.lastAnswers[item.id] as { ts: string; author: string } } : {}),
      };
      rows.push(row);
      if (!applicable) { excluded++; continue; }
      if (status === 'info') { info++; continue; }
      add(overall, status);
      add(byFamily[family], status);
      const tk = (byText.get(row.textKey) ?? (byText.set(row.textKey, emptyCount()), byText.get(row.textKey))) as Count;
      add(tk, status);
    }
  }
  const order = (k: string) => { const [n, a] = k.split(' '); return [n === 'DORA' ? 0 : 1, Number(a)] as const; };
  return {
    rows, overall, byFamily, info, excluded,
    byText: [...byText.entries()].sort((a, b) => { const x = order(a[0]); const y = order(b[0]); return x[0] - y[0] || x[1] - y[1]; })
      .map(([key, count]) => ({ key, count })),
  };
}

export interface RequirementFilter {
  q?: string;
  family?: Family | '';
  group?: string;
  status?: RequirementStatus | '' | 'handled' | 'unhandled';
  carrier?: string;
  textKey?: string;
  overdueOnly?: boolean;
  staleOnly?: boolean;
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Filtre les lignes applicables (la recherche porte sur l'identifiant, la référence et les textes FR / EN). */
export function filterRequirements(rows: RequirementRow[], f: RequirementFilter, refText: (r: RequirementRow) => string = () => ''): RequirementRow[] {
  const q = f.q ? norm(f.q.trim()) : '';
  return rows.filter((r) => {
    if (!r.applicable) return false;
    if (f.family && r.family !== f.family) return false;
    if (f.group && r.group !== f.group) return false;
    if (f.textKey && r.textKey !== f.textKey) return false;
    if (f.carrier && !r.item.carriers.includes(f.carrier)) return false;
    if (f.overdueOnly && !r.overdue) return false;
    if (f.staleOnly && !r.stale) return false;
    if (f.status === 'handled' && !['done', 'not_applicable', 'accepted_gap'].includes(r.status)) return false;
    if (f.status === 'unhandled' && !['open', 'in_progress'].includes(r.status)) return false;
    if (f.status && f.status !== 'handled' && f.status !== 'unhandled' && r.status !== f.status) return false;
    if (q) {
      const hay = norm([r.item.id, r.item.matrix_ref ?? '', refText(r), ...Object.values(r.item.title), ...Object.values(r.item.summary)].join(' '));
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

/** CSV (RFC 4180) ; séparateur « ; » par défaut, lisible par Excel en français. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][], sep = ';'): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /["\r\n]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(cell).join(sep)).join('\r\n') + '\r\n';
}
