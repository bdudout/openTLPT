// Instantané de l'exercice : toutes les données dérivées (échéances, checklists, tableau de bord, matrice),
// calculées une seule fois pour un export ou une vue de synthèse.
import {
  buildChecklist, buildDashboard, buildRequirements, checkEventOrder, computeDeadlinesForProfile, deadlinePhases, deliverableRows,
  effectiveFacts, expandProfile, factIssues, type DashboardPhaseDef, type Exercise,
} from '../../../engine/src/index.ts';
import { REF_VERSION, core, itemsById, packs, type DeliverableDef } from './ref.ts';

const phaseOf = deadlinePhases(core.deadlines, (id) => itemsById[id]?.phase);
/** Délais de préparation des livrables (semaines), pour « Préparations à lancer ». */
export const leadWeeks: Record<string, number> = Object.fromEntries(
  (core.deliverables as unknown as { id: string; lead_weeks?: number }[]).filter((d) => d.lead_weeks).map((d) => [d.id, d.lead_weeks as number]),
);

export function snapshot(ex: Exercise, st: ReturnType<Exercise['loadState']>, horizonWeeks = 6) {
  const plans = ex.listEventPlans();
  const meta = ex.meta();
  const profile = meta.profile ?? 'entity';
  const facts = effectiveFacts(core.facts, st.facts);
  const deadlines = computeDeadlinesForProfile(core, st, core.profiles, profile);
  const issues = factIssues(facts);
  const responses = ex.checklistResponses();
  const checklist = buildChecklist({ packs, profiles: core.profiles, profile, facts, responses, refVersion: REF_VERSION });
  const deliverables = ex.listDeliverables();
  const dRows = deliverableRows(core.deliverables as unknown as (DeliverableDef & { profiles?: string[] })[], deliverables, core.deadlines, deadlines, core.profiles, profile, facts);
  const legups = ex.listLegUps();
  const detections = ex.listDetections();
  const reports = ex.listWeeklyReports();
  const scenarios = ex.listScenarios();
  const flags = ex.listFlags();
  const dash = buildDashboard({
    today: st.today, phases: core.phases as unknown as DashboardPhaseDef[], events: core.events, deadlineDefs: core.deadlines,
    deadlines, deadlinePhase: phaseOf, eventDates: st.events, checklist,
    weeklyReports: reports.map((r) => r.report_date), legups, detections, scenarios, flags, facts,
    orderIssues: checkEventOrder(core, st.events), visibleProfiles: expandProfile(core.profiles, profile), factIssues: issues,
    plannedDates: st.planned ?? {}, baselineDates: Object.fromEntries(plans.filter((p) => p.baseline_date).map((p) => [p.event_ref, p.baseline_date as string])),
    leadWeeks, horizonDays: horizonWeeks * 7, expectedDeliverables: dRows.rows.map((r) => r.def.id), deliverables,
  });
  const req = buildRequirements({
    packs, profiles: core.profiles, profile, facts, responses, refVersion: REF_VERSION, deadlines, deliverables, lastAnswers: ex.lastAnswers(),
  });
  return { meta, st, facts, issues, deadlines, checklist, dash, req, deliverables, dRows, legups, detections, reports, scenarios, flags, plans, journal: ex.journalStats(), author: ex.author, phaseOf };
}

export type Snapshot = ReturnType<typeof snapshot>;
