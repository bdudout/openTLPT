// Checklists contextuelles par phase (EF-3). Fonctions pures.
// Règle de séparation : les obligations (packs DORA/RTS) et les bonnes pratiques (packs TIBER) sont
// renvoyées dans deux listes distinctes ; une bonne pratique n'est jamais comptée dans la conformité.
import { isApplicable, type Facts } from './applicability.ts';
import type { Condition } from './types.ts';

export type Nature = 'obligation' | 'good_practice' | 'national_obligation';
export type ChecklistStatus = 'open' | 'in_progress' | 'done' | 'not_applicable' | 'accepted_gap';

export interface LegalRefDef {
  instrument: string; article: string; paragraph?: string; subparagraph?: string; point?: string; section?: string;
}
export interface ItemDef {
  id: string;
  nature: Nature;
  /** Obligations : point permanent (socle) ou point à assurer au fil du test. */
  scope?: 'standing' | 'stepwise';
  /** Obligations du socle : thème (core.themes). */
  theme?: string;
  matrix_ref?: string;
  source: LegalRefDef;
  phase: string;
  carriers: string[];
  profiles: string[];
  display?: 'check' | 'info';
  applies_when?: Condition;
  deliverables?: string[];
  deadlines?: string[];
  title: Record<string, string>;
  summary: Record<string, string>;
  question?: Record<string, string>;
  evidence?: Record<string, string>;
  relation?: { type: 'adds' | 'restates' | 'diverges'; targets?: string[]; note?: Record<string, string> };
}
export interface PackDef { pack_id: string; framework: string; version: string; items?: ItemDef[] }

export interface ProfileDef { id: string; includes?: string[] }

export interface Response {
  status: ChecklistStatus;
  justification: string | null;
  decided_by: string | null;
  ref_version: string;
}

export interface Entry {
  item: ItemDef;
  framework: string;
  status: ChecklistStatus;
  response?: Response;
  /** Réponse donnée avec une autre version du référentiel (ENF-9) : à revoir. */
  stale: boolean;
}

export interface Progress {
  total: number; open: number; in_progress: number; done: number; not_applicable: number; accepted_gap: number;
  /** Traités = fait + non applicable + écart accepté. */
  handled: number;
}

export interface PhaseChecklist {
  phase: string;
  obligations: Entry[];
  practices: Entry[];
  /** Progression sur les seules obligations « à cocher » (display=check). */
  progress: Progress;
}

export interface ChecklistInput {
  packs: PackDef[];
  profiles: ProfileDef[];
  profile: string;
  facts: Facts;
  responses: Partial<Record<string, Response>>;
  refVersion: string;
}

export interface StandingChecklist {
  /** Obligations permanentes (socle), valables pour tout l'exercice. */
  obligations: Entry[];
  /** Bonnes pratiques liées à au moins une obligation du socle (aussi visibles dans leur phase). */
  practices: Entry[];
  progress: Progress;
}

export interface ChecklistResult {
  /** Points au fil du test (et bonnes pratiques), par phase. */
  phases: Record<string, PhaseChecklist>;
  /** Socle permanent : séparé des phases, avec sa propre progression. */
  standing: StandingChecklist;
  /** Réponses qui ne correspondent plus à un item visible (profil, applicabilité ou référentiel modifiés). */
  orphanResponses: string[];
  /** Bonnes pratiques qui reformulent ou contredisent chaque obligation (affichage replié / avertissement). */
  related: Record<string, { restates: string[]; diverges: string[]; adds: string[] }>;
}

/** Profils effectifs : le profil choisi et ceux qu'il inclut (TI+RT = TI ∪ RT), récursivement. */
export function expandProfile(profiles: ProfileDef[], id: string): Set<string> {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const out = new Set<string>();
  const visit = (pid: string) => {
    if (out.has(pid)) return;
    out.add(pid);
    for (const inc of byId.get(pid)?.includes ?? []) visit(inc);
  };
  visit(id);
  return out;
}

const OBLIGATION_FRAMEWORKS = new Set(['DORA', 'RTS_TLPT', 'DORA+RTS_TLPT']);

export function isObligationPack(p: PackDef): boolean { return OBLIGATION_FRAMEWORKS.has(p.framework); }

function emptyProgress(): Progress {
  return { total: 0, open: 0, in_progress: 0, done: 0, not_applicable: 0, accepted_gap: 0, handled: 0 };
}

export function buildChecklist(input: ChecklistInput): ChecklistResult {
  const visibleProfiles = expandProfile(input.profiles, input.profile);
  const phases: Record<string, PhaseChecklist> = {};
  const related: ChecklistResult['related'] = {};
  const visible = new Set<string>();
  const standing: StandingChecklist = { obligations: [], practices: [], progress: emptyProgress() };
  const allPractices: Entry[] = [];

  for (const pack of input.packs) {
    if (pack.framework === 'core') continue;
    const obligationPack = isObligationPack(pack);
    for (const item of pack.items ?? []) {
      if (!item.profiles.some((p) => visibleProfiles.has(p))) continue;
      if (!isApplicable(item.applies_when, input.facts)) continue;
      visible.add(item.id);
      const response = input.responses[item.id];
      const entry: Entry = {
        item, framework: pack.framework, status: response?.status ?? 'open',
        ...(response ? { response } : {}),
        stale: !!response && response.ref_version !== input.refVersion,
      };
      if (obligationPack && item.scope === 'standing') {
        standing.obligations.push(entry);
        if ((item.display ?? 'check') === 'check') {
          standing.progress.total++;
          standing.progress[entry.status]++;
        }
        continue;
      }
      const ph = (phases[item.phase] ??= { phase: item.phase, obligations: [], practices: [], progress: emptyProgress() });
      if (obligationPack) {
        ph.obligations.push(entry);
        if ((item.display ?? 'check') === 'check') {
          ph.progress.total++;
          ph.progress[entry.status]++;
        }
      } else {
        ph.practices.push(entry);
        allPractices.push(entry);
        if (item.relation) {
          for (const target of item.relation.targets ?? []) {
            const r = (related[target] ??= { restates: [], diverges: [], adds: [] });
            r[item.relation.type].push(item.id);
          }
        }
      }
    }
  }
  const finish = (p: Progress) => { p.handled = p.done + p.not_applicable + p.accepted_gap; };
  for (const ph of Object.values(phases)) finish(ph.progress);
  finish(standing.progress);
  const standingIds = new Set(standing.obligations.map((e) => e.item.id));
  standing.practices = allPractices.filter((e) => (e.item.relation?.targets ?? []).some((t) => standingIds.has(t)));
  const orphanResponses = Object.keys(input.responses).filter((id) => !visible.has(id)).sort();
  return { phases, standing, orphanResponses, related };
}

function addProgress(t: Progress, p: Progress): void {
  for (const k of Object.keys(t) as (keyof Progress)[]) t[k] += p[k];
}

/** Progression des points au fil du test (toutes phases). */
export function stepwiseProgress(result: ChecklistResult): Progress {
  const t = emptyProgress();
  for (const ph of Object.values(result.phases)) addProgress(t, ph.progress);
  return t;
}

/** Progression globale sur les obligations : socle + au fil du test. */
export function totalProgress(result: ChecklistResult): Progress {
  const t = stepwiseProgress(result);
  addProgress(t, result.standing.progress);
  return t;
}

/** Référence lisible : « RTS 2025/1190, art. 9(2)(a) », « TIBER-EU (2025) §7.3 ». */
export function formatSource(s: LegalRefDef): string {
  const names: Record<string, string> = {
    DORA: 'DORA', RTS_2025_1190: 'RTS 2025/1190', 'TIBER-EU_2025': 'TIBER-EU (2025)', 'TIBER-FR_V2': 'TIBER-FR v2',
  };
  const name = names[s.instrument] ?? s.instrument;
  if (s.instrument.startsWith('TIBER')) return `${name} §${s.article}`;
  let ref = `art. ${s.article}`;
  if (s.paragraph) ref += `(${s.paragraph})`;
  if (s.subparagraph) ref += ` al. ${s.subparagraph}`;
  if (s.point) {
    const m = /^([a-z]+)(.*)$/.exec(s.point);
    ref += m ? `(${m[1]})${m[2]}` : `(${s.point})`;
  }
  return `${name}, ${ref}`;
}
