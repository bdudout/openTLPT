import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeDeadlines } from '../src/deadlines.ts';
import { effectiveFacts } from '../src/applicability.ts';
import { buildChecklist, type PackDef, type ProfileDef } from '../src/checklist.ts';
import { buildDashboard, deadlinePhases, type DashboardPhaseDef } from '../src/dashboard.ts';
import { createSqliteWasm } from '../src/sqlite-wasm.ts';
import { Exercise } from '../src/exercise.ts';
import type { SqlDbFactory } from '../src/db.ts';
import type { CoreRef, ISODate } from '../src/types.ts';

const load = (n: string) => JSON.parse(readFileSync(new URL(`../../referentiel/packs/${n}.json`, import.meta.url), 'utf8'));
const core = load('core') as CoreRef & { profiles: ProfileDef[]; phases: DashboardPhaseDef[]; deliverables: { id: string; lead_weeks?: number }[] };
const packs = ['dora-rts', 'tiber-eu', 'tiber-fr'].map(load) as PackDef[];
const schemaSql = readFileSync(new URL('../../schema/tlpt.sql', import.meta.url), 'utf8');
const itemPhase = new Map(packs.flatMap((p) => p.items ?? []).map((i) => [i.id, i.phase]));
const phaseOf = deadlinePhases(core.deadlines, (id) => itemPhase.get(id));
const lead = Object.fromEntries(core.deliverables.filter((d) => d.lead_weeks).map((d) => [d.id, d.lead_weeks as number]));
let factory: SqlDbFactory;
before(async () => { factory = await createSqliteWasm(); });

const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map((x) => [x.id, x]));
function dash(today: ISODate, events: Record<string, ISODate>, planned: Record<string, ISODate> = {}, baseline: Record<string, ISODate> = {}, horizonDays?: number) {
  const st = { today, events, planned };
  return buildDashboard({
    today, phases: core.phases, events: core.events, deadlineDefs: core.deadlines, deadlines: computeDeadlines(core, st),
    deadlinePhase: phaseOf, eventDates: events, plannedDates: planned, baselineDates: baseline, leadWeeks: lead,
    checklist: buildChecklist({ packs, profiles: core.profiles, profile: 'entity', facts: effectiveFacts(core.facts, {}), responses: {}, refVersion: 'R' }),
    ...(horizonDays ? { horizonDays } : {}),
  });
}

test('échéance prévisionnelle : calculée sur la date prévue, remplacée par la date réelle', () => {
  const f = byId(computeDeadlines(core, { today: '2026-10-27', events: {}, planned: { N0: '2026-12-01' } }));
  assert.equal(f['D-01']?.due, '2027-03-01');
  assert.equal(f['D-01']?.forecast, true);
  assert.equal(f['D-01']?.state, 'upcoming');
  const a = byId(computeDeadlines(core, { today: '2026-10-27', events: { N0: '2026-11-15' }, planned: { N0: '2026-12-01' } }));
  assert.equal(a['D-01']?.due, '2027-02-15');
  assert.equal(a['D-01']?.forecast, undefined);
  // Le récurrent ne se prévoit pas : il faut une phase active réelle.
  assert.equal(byId(computeDeadlines(core, { today: '2026-10-27', events: {}, planned: { R0: '2026-11-02' } }))['D-07']?.state, 'waiting_anchor');
});

test('durée minimale : fin prévue trop tôt signalée (12 semaines, RTS 11(5))', () => {
  const r = byId(computeDeadlines(core, { today: '2026-10-27', events: { R0: '2026-10-05' }, planned: { R1: '2026-12-01' } }));
  assert.equal(r['D-06']?.state, 'running');
  assert.equal(r['D-06']?.planShort, true); // fin au plus tôt : 2026-12-28
  const ok = byId(computeDeadlines(core, { today: '2026-10-27', events: { R0: '2026-10-05' }, planned: { R1: '2027-01-08' } }));
  assert.equal(ok['D-06']?.planShort, undefined);
  const fc = byId(computeDeadlines(core, { today: '2026-10-27', events: {}, planned: { R0: '2027-01-04' } }));
  assert.equal(fc['D-06']?.state, 'upcoming');
  assert.equal(fc['D-06']?.forecast, true);
});

test('parcours PMO à J+100 : la préparation du SSD (10 semaines) apparaît à lancer, avant d\'entrer dans l\'horizon', () => {
  const d = dash('2026-10-27', { N0: '2026-07-19', INIT_SUBMITTED: '2026-10-07' });
  assert.ok(!d.upcoming.some((a) => a.id === 'D-02'), 'D-02 est à 81 jours : hors horizon de 6 semaines');
  const ssd = d.toStart.find((a) => a.id === 'D-02');
  assert.equal(ssd?.deliverable, 'DLV-SSD');
  assert.equal(ssd?.leadWeeks, 10);
  assert.equal(ssd?.due, '2027-01-19');
  assert.equal(ssd?.startBy, '2026-11-10');
  // Horizon réglable : à 12 semaines, D-02 passe dans « en amont ».
  assert.ok(dash('2026-10-27', { N0: '2026-07-19' }, {}, {}, 84).upcoming.some((a) => a.id === 'D-02'));
});

test('jalons planifiés : prévisionnels dans les listes, glissement par rapport à la référence', () => {
  const d = dash('2026-10-27', { N0: '2026-07-01' }, { TESTING_START: '2026-12-15', SSD_SUBMITTED: '2026-12-10' }, { TESTING_START: '2026-11-30', SSD_SUBMITTED: '2026-12-10' });
  const d03 = d.upcoming.find((a) => a.id === 'D-03') ?? d.toStart.find((a) => a.id === 'D-03');
  assert.equal(d03, undefined, 'D-03 (avant le début de test au 15/12) : à 49 j, hors horizon et sans livrable');
  const ts = d.timeline.find((t) => t.phase === 'testing_ti')?.events.find((e) => e.event === 'TESTING_START');
  assert.equal(ts?.planned, '2026-12-15');
  assert.equal(ts?.slipDays, 15);
  assert.deepEqual(d.kpis.slippage, { tracked: 2, slipped: 1, maxDays: 15 });
  const exp = d.expectedEvents.find((e) => e.event === 'SSD_SUBMITTED');
  assert.equal(exp?.planned, '2026-12-10');
});

test('planning dans la base : référence posée au premier plan, glissement, référence figée, journal', async () => {
  const ex = await Exercise.create(factory, schemaSql, { author: 'Alex', toolVersion: 't', refVersion: 'R', codename: 'MOUETTE', profile: 'entity' });
  await ex.setEventPlan('TESTING_START', '2026-11-30');
  await ex.setEventPlan('TESTING_START', '2026-12-15');
  let [p] = ex.listEventPlans();
  assert.equal(p?.planned_date, '2026-12-15');
  assert.equal(p?.baseline_date, '2026-11-30', 'la référence reste le premier plan');
  assert.equal(ex.loadState('2026-10-27').planned?.TESTING_START, '2026-12-15');
  assert.equal(await ex.rebaseline(), 1);
  [p] = ex.listEventPlans();
  assert.equal(p?.baseline_date, '2026-12-15');
  assert.equal(await ex.rebaseline(), 0, 'rien à figer');
  await ex.setEventPlan('TESTING_START', null);
  assert.equal(ex.listEventPlans().length, 0);
  const actions = ex.db.all<{ action: string }>("SELECT action FROM journal WHERE entity = 'event_plans' ORDER BY seq").map((r) => r.action);
  assert.deepEqual(actions, ['create', 'update', 'update', 'delete']);
  assert.equal((await ex.verify()).ok, true);
  ex.close();
});
