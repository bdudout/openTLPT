// Tableau de bord : ce qui est à faire cette semaine, à préparer en amont, les jalons et la conformité par étape.
// Fonction pure : tout est dérivé de la date du jour, du référentiel et de l'état de l'exercice.
import { addDays, diffDays } from './dates.ts';
import { detectionIssues, legUpIssues, type DetectionRecord, type Issue, type LegUpRecord } from './registers.ts';
import { stepwiseProgress, totalProgress, type ChecklistResult, type Progress } from './checklist.ts';
import type { DeadlineDef, DeadlineResult, EventDef, EventOrderIssue, ISODate } from './types.ts';
import type { DeliverableRecord } from './registers.ts';
import { eventScope } from './scope.ts';
import type { FactIssue } from './consistency.ts';

export interface DashboardPhaseDef { id: string; order: number; starts_at?: string; ends_at?: string }

export interface DashboardInput {
  today: ISODate;
  phases: DashboardPhaseDef[];
  events: EventDef[];
  deadlineDefs: DeadlineDef[];
  deadlines: DeadlineResult[];
  /** Phase de rattachement de chaque échéance (via l'obligation source). */
  deadlinePhase: Record<string, string>;
  eventDates: Partial<Record<string, ISODate>>;
  checklist: ChecklistResult;
  weeklyReports?: ISODate[];
  legups?: LegUpRecord[];
  detections?: DetectionRecord[];
  orderIssues?: EventOrderIssue[];
  /** Profils visibles (profil courant et ceux qu'il inclut) : filtre les jalons attendus. Absent = tout afficher. */
  visibleProfiles?: Set<string>;
  /** Incohérences des caractéristiques de l'exercice (ajoutées aux alertes). */
  factIssues?: FactIssue[];
  /** Livrables attendus (identifiants) et suivis, pour les indicateurs de livrables. */
  expectedDeliverables?: string[];
  deliverables?: DeliverableRecord[];
  /** « Cette semaine » : aujourd'hui + n jours (défaut 7). */
  weekDays?: number;
  /** « En amont » : jusqu'à aujourd'hui + n jours (défaut 42, soit 6 semaines). */
  horizonDays?: number;
}

export type ActionKind = 'deadline' | 'weekly_report';

export interface ActionItem {
  kind: ActionKind;
  /** Identifiant d'échéance (D-xx). */
  id: string;
  due: ISODate;
  daysLeft: number;
  overdue: boolean;
  phase?: string;
  /** Pour une échéance « avant X » : l'événement X. */
  beforeEvent?: string;
}

export interface ExpectedEvent {
  event: string;
  phase: string;
  /** À obtenir de l'autorité (validation, approbation) plutôt qu'à réaliser. */
  byAuthority?: boolean;
}

export type PhaseStatus = 'not_started' | 'in_progress' | 'done' | 'permanent';

export interface TimelinePhase {
  phase: string;
  status: PhaseStatus;
  start?: ISODate;
  end?: ISODate;
  events: { event: string; date?: ISODate; past: boolean }[];
}

export interface StepCompliance {
  /** 'standing' pour le socle, sinon l'identifiant de phase. */
  step: string;
  progress: Progress;
  overdue: number;
  dueSoon: number;
}

export interface Alert {
  kind: 'legup' | 'detection' | 'order' | 'facts';
  severity?: 'error' | 'warning';
  recordId?: number;
  code: string;
  source?: string;
  label: string;
}

/** Indicateurs synthétiques d'un TLPT (tous optionnels : absents tant que la donnée n'existe pas). */
export interface Kpis {
  /** Jours écoulés depuis la notification (J0 = N0). */
  dayOfTlpt?: number;
  /** Préparation : jours restants avant la limite des 6 mois (D-02), négatif si dépassée. */
  preparationDaysLeft?: number;
  /** Phase active en cours : semaine n (1 = première), fin au plus tôt (12 semaines) et jours restants. */
  activeWeek?: number;
  activeMinEnd?: ISODate;
  activeDaysToMin?: number;
  /** Phase active terminée : durée en semaines (arrondi bas) et jours. */
  activeDurationDays?: number;
  /** Clôture : jours restants avant les 10 semaines (rapport BT, replay, purple teaming). */
  closureDaysLeft?: number;
  /** Rapports hebdomadaires : semaines couvertes / écoulées. */
  weekly?: { covered: number; total: number };
  /** Réponses aux obligations. */
  acceptedGaps: number;
  notApplicable: number;
  staleAnswers: number;
  /** Registres. */
  legups: { total: number; unplanned: number; flagged: number };
  detections: { total: number; unvalidated: number };
  /** Livrables : attendus, remis (ou approuvés), approuvés, avec empreinte. */
  deliverables?: { expected: number; submitted: number; approved: number; fingerprinted: number };
  /** Échéances ouvertes en retard (toutes phases). */
  overdueDeadlines: number;
}

export interface Dashboard {
  kpis: Kpis;
  thisWeek: ActionItem[];
  upcoming: ActionItem[];
  expectedEvents: ExpectedEvent[];
  timeline: TimelinePhase[];
  currentPhase?: string;
  nextMilestone?: { event: string; date: ISODate };
  compliance: StepCompliance[];
  overall: { standing: Progress; stepwise: Progress; total: Progress };
  alerts: Alert[];
}

const OPEN_STATES = new Set(['upcoming', 'due_soon', 'overdue']);

export function buildDashboard(input: DashboardInput): Dashboard {
  const week = input.weekDays ?? 7;
  const horizon = input.horizonDays ?? 42;
  const today = input.today;
  const defs = new Map(input.deadlineDefs.map((d) => [d.id, d]));

  // 1. Actions datées : échéances ouvertes, à faire cette semaine (retards compris) ou en amont.
  const thisWeek: ActionItem[] = [];
  const upcoming: ActionItem[] = [];
  for (const r of input.deadlines) {
    if (r.display !== 'check' || !r.due) continue;
    const def = defs.get(r.id);
    const phase = input.deadlinePhase[r.id];
    const base = { id: r.id, due: r.due, daysLeft: diffDays(today, r.due), ...(phase ? { phase } : {}) };
    if (r.kind === 'recurring') {
      // Rapport de la semaine en cours : dû à la fin de la période si aucun rapport n'y figure encore.
      const start = addDays(r.due, -6);
      const covered = (input.weeklyReports ?? []).some((d) => diffDays(start, d) >= 0 && diffDays(d, r.due as ISODate) >= 0);
      if (!covered) thisWeek.push({ ...base, kind: 'weekly_report', overdue: false });
      continue;
    }
    if (!OPEN_STATES.has(r.state)) continue;
    const item: ActionItem = { ...base, kind: 'deadline', overdue: r.state === 'overdue',
      ...(r.kind === 'before' && def ? { beforeEvent: def.anchor } : {}) };
    if (item.daysLeft <= week) thisWeek.push(item);
    else if (item.daysLeft <= horizon) upcoming.push(item);
  }
  const byDue = (a: ActionItem, b: ActionItem) => (a.overdue === b.overdue ? diffDays(b.due, a.due) : a.overdue ? -1 : 1);
  thisWeek.sort(byDue);
  upcoming.sort(byDue);

  // 2. Prochains jalons attendus : événements non datés dont tous les prérequis sont datés.
  //    Un événement qui ne sert qu'à des échéances non applicables est ignoré (ex. autorités d'accueil hors transfrontière).
  const anchorsOf = new Map<string, DeadlineResult[]>();
  for (const d of input.deadlineDefs) {
    const r = input.deadlines.find((x) => x.id === d.id);
    if (!r) continue;
    for (const ev of [d.anchor, d.end_event, d.until]) if (ev) anchorsOf.set(ev, [...(anchorsOf.get(ev) ?? []), r]);
  }
  const irrelevant = (ev: string) => { const rs = anchorsOf.get(ev); return !!rs && rs.every((r) => r.state === 'not_applicable'); };
  const expectedEvents: ExpectedEvent[] = [];
  for (const e of input.events) {
    if (input.eventDates[e.id] || irrelevant(e.id) || !(e.after ?? []).every((p) => !!input.eventDates[p])) continue;
    const sc = input.visibleProfiles ? eventScope(e, input.deadlineDefs, input.visibleProfiles) : undefined;
    if (sc && !sc.relevant) continue;
    expectedEvents.push({ event: e.id, phase: e.phase, ...(sc?.byAuthority ? { byAuthority: true } : {}) });
  }

  // 3. Jalons : statut de chaque phase d'après ses événements de début et de fin.
  const phases = [...input.phases].sort((a, b) => a.order - b.order);
  const timeline: TimelinePhase[] = phases.map((p) => {
    const start = p.starts_at ? input.eventDates[p.starts_at] : undefined;
    const end = p.ends_at ? input.eventDates[p.ends_at] : undefined;
    const reached = (d?: ISODate) => !!d && diffDays(d, today) >= 0;
    const status: PhaseStatus = !p.starts_at ? 'permanent' : reached(end) ? 'done' : reached(start) ? 'in_progress' : 'not_started';
    const events = input.events.filter((e) => e.phase === p.id).map((e) => {
      const date = input.eventDates[e.id];
      return { event: e.id, ...(date ? { date } : {}), past: reached(date) };
    });
    return { phase: p.id, status, ...(start ? { start } : {}), ...(end ? { end } : {}), events };
  });
  const inProgress = timeline.filter((t) => t.status === 'in_progress');
  const currentPhase = inProgress[inProgress.length - 1]?.phase;
  const future = Object.entries(input.eventDates)
    .filter((e): e is [string, ISODate] => !!e[1] && diffDays(today, e[1]) > 0)
    .sort((a, b) => diffDays(b[1], a[1]));
  const nextMilestone = future[0] ? { event: future[0][0], date: future[0][1] } : undefined;

  // 4. Conformité par étape : socle, puis chaque phase (préparation comprise), avec retards et échéances proches.
  const counts = (phase: string) => {
    const rs = input.deadlines.filter((r) => input.deadlinePhase[r.id] === phase && r.display === 'check');
    return { overdue: rs.filter((r) => r.state === 'overdue').length, dueSoon: rs.filter((r) => r.state === 'due_soon').length };
  };
  const empty: Progress = { total: 0, open: 0, in_progress: 0, done: 0, not_applicable: 0, accepted_gap: 0, handled: 0 };
  const compliance: StepCompliance[] = [
    { step: 'standing', progress: input.checklist.standing.progress, ...counts('cycle') },
    ...phases.filter((p) => p.id !== 'cycle').map((p) => ({ step: p.id, progress: input.checklist.phases[p.id]?.progress ?? empty, ...counts(p.id) })),
  ];

  // 5. Alertes des registres et de la chronologie.
  const alerts: Alert[] = [];
  const push = (kind: Alert['kind'], id: number, label: string, is: Issue[]) => {
    for (const i of is) alerts.push({ kind, recordId: id, code: i.code, source: i.source, label });
  };
  for (const l of input.legups ?? []) push('legup', l.id, l.description, legUpIssues(l));
  for (const d of input.detections ?? []) push('detection', d.id, d.description, detectionIssues(d));
  for (const f of input.factIssues ?? []) alerts.push({ kind: 'facts', code: f.code, source: f.source, severity: f.severity, label: f.facts.join(', ') });
  for (const o of input.orderIssues ?? []) alerts.push({ kind: 'order', code: 'event_order', label: `${o.event}<${o.mustFollow}` });

  // 6. Indicateurs.
  const res = new Map(input.deadlines.map((r) => [r.id, r]));
  const ev = input.eventDates;
  const allEntries = [...input.checklist.standing.obligations, ...Object.values(input.checklist.phases).flatMap((p) => p.obligations)];
  const kpis: Kpis = {
    acceptedGaps: allEntries.filter((e) => e.status === 'accepted_gap').length,
    notApplicable: allEntries.filter((e) => e.status === 'not_applicable').length,
    staleAnswers: allEntries.filter((e) => e.stale).length,
    legups: {
      total: (input.legups ?? []).length,
      unplanned: (input.legups ?? []).filter((l) => !l.planned).length,
      flagged: (input.legups ?? []).filter((l) => legUpIssues(l).length > 0).length,
    },
    detections: {
      total: (input.detections ?? []).length,
      unvalidated: (input.detections ?? []).filter((d) => detectionIssues(d).some((i) => i.code === 'detection_not_validated')).length,
    },
    overdueDeadlines: input.deadlines.filter((r) => r.state === 'overdue' && r.display === 'check').length,
  };
  if (ev.N0) kpis.dayOfTlpt = diffDays(ev.N0, today);
  const d02 = res.get('D-02');
  const testingStarted = !!ev.TESTING_START && diffDays(ev.TESTING_START, today) >= 0; // une date future est seulement planifiée
  if (d02?.due && !d02.state.startsWith('done') && !testingStarted) kpis.preparationDaysLeft = diffDays(today, d02.due);
  if (ev.R0 && !ev.R1 && diffDays(ev.R0, today) >= 0) {
    kpis.activeWeek = Math.floor(diffDays(ev.R0, today) / 7) + 1;
    const d06 = res.get('D-06');
    if (d06?.due) { kpis.activeMinEnd = d06.due; kpis.activeDaysToMin = diffDays(today, d06.due); }
  }
  if (ev.R0 && ev.R1) kpis.activeDurationDays = diffDays(ev.R0, ev.R1);
  const d10 = res.get('D-10');
  if (ev.R1 && d10?.due && !d10.state.startsWith('done')) kpis.closureDaysLeft = diffDays(today, d10.due);
  const d07 = res.get('D-07');
  if (d07?.periods && ev.R0) kpis.weekly = { covered: d07.periods.filter((p) => p.covered).length, total: d07.periods.length };
  if (input.expectedDeliverables) {
    const expected = new Set(input.expectedDeliverables);
    const tracked = (input.deliverables ?? []).filter((d) => d.deliverable_ref && expected.has(d.deliverable_ref));
    kpis.deliverables = {
      expected: expected.size,
      submitted: tracked.filter((d) => d.status === 'submitted' || d.status === 'approved').length,
      approved: tracked.filter((d) => d.status === 'approved').length,
      fingerprinted: tracked.filter((d) => !!d.sha256).length,
    };
  }

  return {
    kpis,
    thisWeek, upcoming, expectedEvents, timeline,
    ...(currentPhase ? { currentPhase } : {}), ...(nextMilestone ? { nextMilestone } : {}),
    compliance,
    overall: { standing: input.checklist.standing.progress, stepwise: stepwiseProgress(input.checklist), total: totalProgress(input.checklist) },
    alerts,
  };
}

/** Phase de rattachement des échéances : celle de leur première obligation source. */
export function deadlinePhases(deadlineDefs: DeadlineDef[], itemPhase: (itemId: string) => string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of deadlineDefs) {
    const p = d.sources.map(itemPhase).find(Boolean);
    if (p) out[d.id] = p;
  }
  return out;
}
