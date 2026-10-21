// Instantané de l'exercice : toutes les données dérivées (échéances, checklists, tableau de bord, matrice),
// calculées une seule fois pour un export ou une vue de synthèse.
import {
  buildChecklist, buildDashboard, buildRequirements, checkEventOrder, computeDeadlines, deadlinePhases, deliverableRows,
  effectiveFacts, type DashboardPhaseDef, type Exercise,
} from '../../../engine/src/index.ts';
import { REF_VERSION, core, itemsById, packs, type DeliverableDef } from './ref.ts';

const phaseOf = deadlinePhases(core.deadlines, (id) => itemsById[id]?.phase);

export function snapshot(ex: Exercise, st: ReturnType<Exercise['loadState']>) {
  const meta = ex.meta();
  const profile = meta.profile ?? 'entity';
  const facts = effectiveFacts(core.facts, st.facts);
  const deadlines = computeDeadlines(core, st);
  const responses = ex.checklistResponses();
  const checklist = buildChecklist({ packs, profiles: core.profiles, profile, facts, responses, refVersion: REF_VERSION });
  const deliverables = ex.listDeliverables();
  const dRows = deliverableRows(core.deliverables as unknown as (DeliverableDef & { profiles?: string[] })[], deliverables, core.deadlines, deadlines, core.profiles, profile, facts);
  const legups = ex.listLegUps();
  const detections = ex.listDetections();
  const reports = ex.listWeeklyReports();
  const dash = buildDashboard({
    today: st.today, phases: core.phases as unknown as DashboardPhaseDef[], events: core.events, deadlineDefs: core.deadlines,
    deadlines, deadlinePhase: phaseOf, eventDates: st.events, checklist,
    weeklyReports: reports.map((r) => r.report_date), legups, detections,
    orderIssues: checkEventOrder(core, st.events), expectedDeliverables: dRows.rows.map((r) => r.def.id), deliverables,
  });
  const req = buildRequirements({
    packs, profiles: core.profiles, profile, facts, responses, refVersion: REF_VERSION, deadlines, deliverables, lastAnswers: ex.lastAnswers(),
  });
  return { meta, st, facts, deadlines, checklist, dash, req, deliverables, dRows, legups, detections, reports, journal: ex.journalStats(), author: ex.author, phaseOf };
}

export type Snapshot = ReturnType<typeof snapshot>;
