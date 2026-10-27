// Livrables et registres (leg-ups, détections, rapports hebdomadaires) : types et contrôles purs.
// Les contrôles signalent des écarts au RTS ; ils n'empêchent jamais la saisie (la réalité prime, l'écart est tracé).
import { isApplicable, type Facts } from './applicability.ts';
import { diffDays } from './dates.ts';
import { expandProfile, type ProfileDef } from './checklist.ts';
import type { Condition, DeadlineDef, DeadlineResult, ExerciseState, ISODate } from './types.ts';

export type DeliverableStatus = 'expected' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'not_applicable';
export type LegUpKind = 'time' | 'information' | 'access';
export type DetectionKind = 'detection' | 'suspension' | 'limited_purple_teaming' | 'real_incident';

export interface DeliverableRecord {
  id: number;
  deliverable_ref: string | null;
  title: string;
  owner_party_id: number | null;
  status: DeliverableStatus;
  version: string | null;
  location: string | null;
  sha256: string | null;
  file_name: string | null;
  file_size: number | null;
  submitted_at: ISODate | null;
  approved_at: ISODate | null;
  note: string | null;
}

export interface LegUpRecord {
  id: number;
  scenario_id: number | null;
  kind: LegUpKind | null;
  /** Prévu au plan de test RT (approuvé avec lui) ; sinon ajout ou adaptation soumis à approbation CT + TM. */
  planned: boolean;
  requested_at: ISODate | null;
  approved_ct: ISODate | null;
  approved_tm: ISODate | null;
  provided_at: ISODate | null;
  description: string;
}

export interface DetectionRecord {
  id: number;
  detected_at: ISODate;
  kind: DetectionKind;
  description: string;
  measures: string | null;
  validated_by_tm_at: ISODate | null;
}

export interface WeeklyReportRecord {
  id: number;
  report_date: ISODate;
  summary: string | null;
  sha256: string | null;
  file_name: string | null;
}

export type Cia = 'C' | 'I' | 'A' | 'Au';
export type FlagStatus = 'planned' | 'in_progress' | 'reached' | 'not_reached';

export interface ScenarioRecord {
  id: number;
  label: string;
  /** Fondé sur la menace ; sinon scénario prospectif (« X »), au plus un (RTS 10(4)). */
  threat_led: boolean;
  cia: Cia | null;
  cif_label: string | null;
  /** Inclut les systèmes d'un prestataire TIC tiers (RTS 10(4) al. 2-3). */
  includes_tpp: boolean;
  /** Retenu par le CTL (RTS 10(3)). */
  selected: boolean;
}

export interface FlagRecord {
  id: number;
  scenario_id: number | null;
  label: string;
  cia: Cia | null;
  status: FlagStatus;
  reached_at: ISODate | null;
  attack_path: string | null;
  ttps: string | null;
}

export interface Issue { code: string; source: string }

/**
 * Scénarios et flags (RTS 10(3), 10(4) ; plan de test RT, RTS 11(1) et annexe IV). Les contrôles d'ensemble ne s'appliquent qu'une fois un
 * scénario retenu ; l'absence de flag n'est signalée qu'à partir de la phase active.
 */
export function scenarioIssues(scenarios: ScenarioRecord[], flags: FlagRecord[], facts: Facts, activeStarted: boolean): (Issue & { recordId?: number })[] {
  const sel = scenarios.filter((s) => s.selected);
  if (!sel.length) return [];
  const issues: (Issue & { recordId?: number })[] = [];
  if (sel.length < 3) issues.push({ code: 'scenarios_too_few', source: 'RTS-10.3' });
  if (sel.filter((s) => !s.threat_led).length > 1) issues.push({ code: 'scenarios_x_max', source: 'RTS-10.4' });
  if ((facts.pooled === true || (facts.joint === true && facts.ict_tpp_in_scope === true)) && !sel.some((s) => s.includes_tpp)) {
    issues.push({ code: 'scenarios_tpp_missing', source: 'RTS-10.4' });
  }
  if (activeStarted) {
    for (const s of sel) if (!flags.some((f) => f.scenario_id === s.id)) issues.push({ code: 'scenario_no_flag', source: 'RTS-11.1', recordId: s.id });
  }
  for (const f of flags) if (f.status === 'reached' && !f.reached_at) issues.push({ code: 'flag_no_date', source: 'RTS-11.1', recordId: f.id });
  return issues;
}

/** RTS 11(8) : un leg-up ajouté ou adapté (non prévu au plan) doit être approuvé par le CT et les TM avant d'être fourni. */
export function legUpIssues(l: LegUpRecord): Issue[] {
  const issues: Issue[] = [];
  if (l.planned || !l.provided_at) return issues;
  if (!l.approved_ct || !l.approved_tm) issues.push({ code: 'legup_not_approved', source: 'RTS-11.8' });
  for (const a of [l.approved_ct, l.approved_tm]) {
    if (a && diffDays(a, l.provided_at) < 0) { issues.push({ code: 'legup_approved_after', source: 'RTS-11.8' }); break; }
  }
  return issues;
}

/** RTS 11(9) et 11(10) : mesures après détection et purple teaming limité validés par les TM ; incident réel signalé. */
export function detectionIssues(d: DetectionRecord): Issue[] {
  const issues: Issue[] = [];
  if ((d.kind === 'detection' || d.kind === 'limited_purple_teaming') && !d.validated_by_tm_at) {
    issues.push({ code: 'detection_not_validated', source: d.kind === 'detection' ? 'RTS-11.9' : 'RTS-11.10' });
  }
  if (d.kind === 'limited_purple_teaming' && d.validated_by_tm_at && diffDays(d.validated_by_tm_at, d.detected_at) < 0) {
    issues.push({ code: 'purple_validated_after', source: 'RTS-11.10' });
  }
  if (d.kind === 'real_incident') issues.push({ code: 'real_incident', source: 'RTS-5.2' });
  return issues;
}

/** Rapports hebdomadaires datés hors de la phase active [R0, R1] (information). */
export function reportsOutsideActivePhase(reports: WeeklyReportRecord[], r0?: ISODate, r1?: ISODate): number[] {
  return reports
    .filter((r) => (r0 && diffDays(r0, r.report_date) < 0) || (r1 && diffDays(r.report_date, r1) < 0))
    .map((r) => r.id);
}

export interface DeliverableDefLike {
  id: string;
  phase: string;
  profiles?: string[];
  applies_when?: Condition;
}

export interface DeliverableRow<D extends DeliverableDefLike = DeliverableDefLike> {
  def: D;
  record?: DeliverableRecord;
  /** Échéances dont ce livrable est la cible, avec leur état calculé. */
  deadlines: DeadlineResult[];
}

/** Livrables attendus pour le profil et les faits, chacun rapproché de son suivi et de ses échéances. */
export function deliverableRows<D extends DeliverableDefLike>(
  defs: D[], records: DeliverableRecord[], deadlineDefs: DeadlineDef[], deadlineResults: DeadlineResult[],
  profiles: ProfileDef[], profile: string, facts: Facts,
): { rows: DeliverableRow<D>[]; extra: DeliverableRecord[] } {
  const visible = expandProfile(profiles, profile);
  const results = new Map(deadlineResults.map((r) => [r.id, r]));
  const byRef = new Map(records.filter((r) => r.deliverable_ref).map((r) => [r.deliverable_ref as string, r]));
  const rows = defs
    .filter((d) => (d.profiles ?? []).some((p) => visible.has(p)) && isApplicable(d.applies_when, facts))
    .map((def) => {
      const record = byRef.get(def.id);
      const deadlines = deadlineDefs
        .filter((dl) => dl.target?.deliverable === def.id)
        .map((dl) => results.get(dl.id))
        .filter((r): r is DeadlineResult => !!r);
      return { def, ...(record ? { record } : {}), deadlines };
    });
  const known = new Set(rows.map((r) => r.def.id));
  const extra = records.filter((r) => !r.deliverable_ref || !known.has(r.deliverable_ref));
  return { rows, extra };
}

/**
 * Une échéance dont la cible est un livrable est réputée réalisée à la date de remise de ce livrable,
 * sauf si une date de réalisation a été saisie explicitement pour l'échéance (elle prime).
 */
export function withDeliverableDates(deadlines: DeadlineDef[], st: ExerciseState, records: DeliverableRecord[]): ExerciseState {
  const submitted = new Map(records.filter((r) => r.deliverable_ref && r.submitted_at).map((r) => [r.deliverable_ref as string, r.submitted_at as ISODate]));
  const done: Partial<Record<string, ISODate>> = { ...(st.done ?? {}) };
  for (const d of deadlines) {
    const target = d.target?.deliverable;
    const date = target ? submitted.get(target) : undefined;
    if (date && !done[d.id] && (d.kind === 'max' || d.kind === 'before')) done[d.id] = date;
  }
  return { ...st, done };
}
