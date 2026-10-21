import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeDeadlines, checkEventOrder } from '../src/deadlines.ts';
import { effectiveFacts } from '../src/applicability.ts';
import { buildChecklist, type PackDef, type ProfileDef, type Response } from '../src/checklist.ts';
import { buildDashboard, deadlinePhases, type DashboardPhaseDef } from '../src/dashboard.ts';
import type { LegUpRecord, DetectionRecord } from '../src/registers.ts';
import type { CoreRef, FactValue, ISODate } from '../src/types.ts';

const load = (n: string) => JSON.parse(readFileSync(new URL(`../../referentiel/packs/${n}.json`, import.meta.url), 'utf8'));
const core = load('core') as CoreRef & { profiles: ProfileDef[]; phases: DashboardPhaseDef[] };
const packs = ['dora-rts', 'tiber-eu', 'tiber-fr'].map(load) as PackDef[];
const itemPhase = new Map(packs.flatMap((p) => p.items ?? []).map((i) => [i.id, i.phase]));
const phaseOf = deadlinePhases(core.deadlines, (id) => itemPhase.get(id));

interface Opts {
  today: ISODate; events: Record<string, ISODate>; facts?: Record<string, FactValue>;
  done?: Record<string, ISODate>; responses?: Record<string, Response>; reports?: ISODate[];
  legups?: LegUpRecord[]; detections?: DetectionRecord[];
}
function dash(o: Opts) {
  const st = { today: o.today, events: o.events, facts: o.facts ?? {}, done: o.done ?? {}, occurrences: { 'D-07': o.reports ?? [] } };
  const facts = effectiveFacts(core.facts, st.facts);
  return buildDashboard({
    today: o.today, phases: core.phases, events: core.events, deadlineDefs: core.deadlines,
    deadlines: computeDeadlines(core, st), deadlinePhase: phaseOf, eventDates: o.events,
    checklist: buildChecklist({ packs, profiles: core.profiles, profile: 'entity', facts, responses: o.responses ?? {}, refVersion: 'R' }),
    weeklyReports: o.reports ?? [], legups: o.legups ?? [], detections: o.detections ?? [], orderIssues: checkEventOrder(core, o.events),
  });
}
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

test('rattachement des échéances aux phases', () => {
  assert.equal(phaseOf['D-01'], 'preparation');
  assert.equal(phaseOf['D-06'], 'testing_rt');
  assert.equal(phaseOf['D-11'], 'closure');
  assert.equal(phaseOf['D-12'], 'remediation');
  assert.equal(phaseOf['D-13'], 'cycle');
});

test('exercice vierge : rien à faire cette semaine, la notification est le premier jalon attendu', () => {
  const d = dash({ today: '2026-10-21', events: {} });
  assert.deepEqual(d.thisWeek, []);
  assert.deepEqual(d.upcoming, []);
  assert.ok(d.expectedEvents.some((e) => e.event === 'N0'));
  assert.ok(!d.expectedEvents.some((e) => e.event === 'HOST_INFORMED'), 'autorités d\'accueil : sans objet hors transfrontière');
  assert.ok(!d.expectedEvents.some((e) => e.event === 'INIT_SUBMITTED'), 'prérequis N0 non daté');
  assert.equal(d.currentPhase, undefined);
  assert.equal(d.timeline.find((t) => t.phase === 'cycle')?.status, 'permanent');
});

test('cette semaine / en amont : retards d\'abord, puis échéances de la semaine ; horizon de 6 semaines', () => {
  // N0 = 2026-07-25 → D-01 = 2026-10-25 (dans 4 j) ; D-02 = 2027-01-25 (hors horizon).
  // Début de phase de test planifié au 2026-11-20 → D-03 / D-04 « avant » dans 30 j (en amont).
  // TLPT précédent 2023-10-01 → D-13 = 2026-10-01 : en retard.
  const d = dash({ today: '2026-10-21', events: { N0: '2026-07-25', TESTING_START: '2026-11-20', PREV_TLPT: '2023-10-01' } });
  assert.deepEqual(ids(d.thisWeek), ['D-13', 'D-01']);
  assert.equal(d.thisWeek[0]?.overdue, true);
  assert.equal(d.thisWeek[1]?.daysLeft, 4);
  assert.deepEqual(ids(d.upcoming), ['D-03', 'D-04']);
  assert.equal(d.upcoming[0]?.beforeEvent, 'TESTING_START');
  assert.ok(!ids(d.upcoming).includes('D-02'));
  assert.equal(d.currentPhase, 'preparation');
  assert.deepEqual(d.nextMilestone, { event: 'TESTING_START', date: '2026-11-20' });
  // Les jalons qui suivent N0 sont désormais attendus.
  const exp = d.expectedEvents.map((e) => e.event);
  assert.ok(exp.includes('INIT_SUBMITTED') && exp.includes('PROVIDERS_CONTRACTED') && exp.includes('SSD_SUBMITTED'));
});

test('une échéance réalisée disparaît des listes', () => {
  const d = dash({ today: '2026-10-21', events: { N0: '2026-07-25' }, done: { 'D-01': '2026-10-20' } });
  assert.ok(!ids(d.thisWeek).includes('D-01'));
});

test('phase active : le rapport hebdomadaire de la semaine en cours est à faire tant qu\'il n\'est pas reçu', () => {
  const events = { N0: '2026-01-05', TESTING_START: '2026-07-01', TTIR_APPROVED: '2026-08-10', R0: '2026-09-07' };
  const missing = dash({ today: '2026-10-21', events, reports: ['2026-10-12'] });
  const w = missing.thisWeek.find((a) => a.kind === 'weekly_report');
  assert.equal(w?.id, 'D-07');
  assert.equal(w?.due, '2026-10-25'); // fin de la semaine en cours (période du 19 au 25 octobre)
  assert.equal(missing.currentPhase, 'testing_rt');
  const ok = dash({ today: '2026-10-21', events, reports: ['2026-10-12', '2026-10-20'] });
  assert.ok(!ok.thisWeek.some((a) => a.kind === 'weekly_report'));
});

test('jalons : statut des phases d\'après leurs événements de début et de fin', () => {
  const d = dash({ today: '2026-10-21', events: { N0: '2026-01-05', TESTING_START: '2026-07-01', TTIR_APPROVED: '2026-08-10', R0: '2026-09-07' } });
  const st = Object.fromEntries(d.timeline.map((t) => [t.phase, t.status]));
  assert.deepEqual(st, { cycle: 'permanent', preparation: 'done', testing_ti: 'done', testing_rt: 'in_progress', closure: 'not_started', remediation: 'not_started' });
  assert.ok(d.timeline.find((t) => t.phase === 'preparation')?.events.find((e) => e.event === 'N0')?.past);
});

test('conformité par étape : socle puis chaque phase, avec retards ; total = socle + au fil du test', () => {
  const d = dash({
    today: '2026-10-21', events: { N0: '2026-07-01' },
    responses: { 'RTS-4.1': { status: 'done', justification: null, decided_by: null, ref_version: 'R' },
      'RTS-9.2': { status: 'done', justification: null, decided_by: null, ref_version: 'R' } },
  });
  assert.deepEqual(d.compliance.map((c) => c.step), ['standing', 'preparation', 'testing_ti', 'testing_rt', 'closure', 'remediation']);
  assert.equal(d.compliance[0]?.progress.handled, 1);
  const prep = d.compliance.find((c) => c.step === 'preparation');
  assert.equal(prep?.progress.handled, 1);
  assert.equal(prep?.overdue, 1); // D-01 dépassée (2026-10-01)
  assert.equal(d.overall.total.handled, 2);
  assert.equal(d.overall.total.total, d.overall.standing.total + d.overall.stepwise.total);
});

test('alertes : registres et chronologie', () => {
  const d = dash({
    today: '2026-10-21', events: { N0: '2026-10-01', INIT_SUBMITTED: '2026-09-01' },
    legups: [{ id: 3, scenario_id: null, kind: 'access', planned: false, requested_at: null, approved_ct: null, approved_tm: null, provided_at: '2026-10-10', description: 'Compte de rebond' }],
    detections: [{ id: 5, detected_at: '2026-10-12', kind: 'detection', description: 'Alerte EDR', measures: null, validated_by_tm_at: null }],
  });
  assert.deepEqual(d.alerts.map((a) => `${a.kind}:${a.code}`), ['legup:legup_not_approved', 'detection:detection_not_validated', 'order:event_order']);
  assert.equal(d.alerts[0]?.recordId, 3);
});

test('KPI : jour du TLPT, préparation, phase active, clôture, registres, réponses, livrables', () => {
  const prep = dash({ today: '2026-10-21', events: { N0: '2026-07-01' } });
  assert.equal(prep.kpis.dayOfTlpt, 112);
  assert.equal(prep.kpis.preparationDaysLeft, 72); // D-02 = 2027-01-01 (N0 + 6 mois)
  const planned = dash({ today: '2026-10-21', events: { N0: '2026-07-01', TESTING_START: '2026-11-20' } });
  assert.equal(planned.kpis.preparationDaysLeft, 72, 'début de test seulement planifié : la préparation continue');
  const active = dash({ today: '2026-10-21', events: { N0: '2026-01-05', TESTING_START: '2026-07-01', R0: '2026-09-07' }, reports: ['2026-09-10', '2026-09-17'] });
  assert.equal(active.kpis.activeWeek, 7);
  assert.equal(active.kpis.activeMinEnd, '2026-11-30');
  assert.equal(active.kpis.activeDaysToMin, 40);
  assert.deepEqual(active.kpis.weekly, { covered: 2, total: 6 });
  assert.equal(active.kpis.preparationDaysLeft, undefined, 'préparation terminée');
  const closure = dash({ today: '2026-12-10', events: { N0: '2026-01-05', R0: '2026-09-07', R1: '2026-12-01' } });
  assert.equal(closure.kpis.activeDurationDays, 85);
  assert.equal(closure.kpis.closureDaysLeft, 61); // R1 + 10 semaines = 2027-02-09
  const reg = dash({
    today: '2026-10-21', events: {},
    responses: { 'RTS-9.7': { status: 'not_applicable', justification: 'x', decided_by: null, ref_version: 'R' },
      'RTS-4.1': { status: 'accepted_gap', justification: 'x', decided_by: 'DG', ref_version: 'OLD' } },
    legups: [
      { id: 1, scenario_id: null, kind: 'access', planned: true, requested_at: null, approved_ct: null, approved_tm: null, provided_at: '2026-10-01', description: 'a' },
      { id: 2, scenario_id: null, kind: 'time', planned: false, requested_at: null, approved_ct: null, approved_tm: null, provided_at: '2026-10-02', description: 'b' },
    ],
    detections: [{ id: 1, detected_at: '2026-10-03', kind: 'detection', description: 'c', measures: null, validated_by_tm_at: null }],
  });
  assert.equal(reg.kpis.notApplicable, 1);
  assert.equal(reg.kpis.acceptedGaps, 1);
  assert.equal(reg.kpis.staleAnswers, 1);
  assert.deepEqual(reg.kpis.legups, { total: 2, unplanned: 1, flagged: 1 });
  assert.deepEqual(reg.kpis.detections, { total: 1, unvalidated: 1 });
});

test('KPI livrables : attendus, remis, approuvés, avec empreinte', () => {
  const st = { today: '2026-10-21' as ISODate, events: {}, facts: {}, done: {} };
  const facts = effectiveFacts(core.facts, {});
  const d = buildDashboard({
    today: st.today, phases: core.phases, events: core.events, deadlineDefs: core.deadlines, deadlines: computeDeadlines(core, st),
    deadlinePhase: phaseOf, eventDates: {}, checklist: buildChecklist({ packs, profiles: core.profiles, profile: 'entity', facts, responses: {}, refVersion: 'R' }),
    expectedDeliverables: ['DLV-INIT', 'DLV-SSD', 'DLV-TSR'],
    deliverables: [
      { id: 1, deliverable_ref: 'DLV-INIT', title: 'x', owner_party_id: null, status: 'approved', version: null, location: null, sha256: 'a'.repeat(64), file_name: null, file_size: null, submitted_at: null, approved_at: null, note: null },
      { id: 2, deliverable_ref: 'DLV-SSD', title: 'y', owner_party_id: null, status: 'submitted', version: null, location: null, sha256: null, file_name: null, file_size: null, submitted_at: null, approved_at: null, note: null },
      { id: 3, deliverable_ref: null, title: 'libre', owner_party_id: null, status: 'approved', version: null, location: null, sha256: null, file_name: null, file_size: null, submitted_at: null, approved_at: null, note: null },
    ],
  });
  assert.deepEqual(d.kpis.deliverables, { expected: 3, submitted: 2, approved: 1, fingerprinted: 1 });
});
