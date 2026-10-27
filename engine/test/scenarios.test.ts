import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSqliteWasm } from '../src/sqlite-wasm.ts';
import { Exercise } from '../src/exercise.ts';
import { scenarioIssues, type FlagRecord, type ScenarioRecord } from '../src/registers.ts';
import type { SqlDbFactory } from '../src/db.ts';

const schemaSql = readFileSync(new URL('../../schema/tlpt.sql', import.meta.url), 'utf8');
let factory: SqlDbFactory;
before(async () => { factory = await createSqliteWasm(); });

const sc = (id: number, o: Partial<ScenarioRecord> = {}): ScenarioRecord =>
  ({ id, label: `S${id}`, threat_led: true, cia: null, cif_label: null, includes_tpp: false, selected: true, ...o });
const fl = (id: number, scenario_id: number, o: Partial<FlagRecord> = {}): FlagRecord =>
  ({ id, scenario_id, label: `F${id}`, cia: 'C', status: 'planned', reached_at: null, attack_path: null, ttps: null, ...o });
const codes = (xs: { code: string }[]) => xs.map((x) => x.code);

test('scénarios : rien tant qu\'aucun n\'est retenu, puis au moins 3 et au plus un « X » (RTS 10(3), 10(4))', () => {
  assert.deepEqual(scenarioIssues([sc(1, { selected: false })], [], {}, false), []);
  assert.deepEqual(codes(scenarioIssues([sc(1), sc(2)], [], {}, false)), ['scenarios_too_few']);
  assert.deepEqual(codes(scenarioIssues([sc(1), sc(2, { threat_led: false }), sc(3, { threat_led: false })], [], {}, false)), ['scenarios_x_max']);
  assert.deepEqual(scenarioIssues([sc(1), sc(2), sc(3, { threat_led: false })], [], {}, false), []);
});

test('TLPT mutualisé ou commun avec prestataire : un scénario doit inclure le prestataire TIC tiers (RTS 10(4))', () => {
  const three = [sc(1), sc(2), sc(3)];
  assert.deepEqual(codes(scenarioIssues(three, [], { pooled: true }, false)), ['scenarios_tpp_missing']);
  assert.deepEqual(codes(scenarioIssues(three, [], { joint: true, ict_tpp_in_scope: true }, false)), ['scenarios_tpp_missing']);
  assert.deepEqual(scenarioIssues([sc(1), sc(2), sc(3, { includes_tpp: true })], [], { pooled: true }, false), []);
});

test('phase active : scénario retenu sans flag signalé ; flag atteint sans date signalé', () => {
  const three = [sc(1), sc(2), sc(3)];
  const flags = [fl(1, 1), fl(2, 2, { status: 'reached' })];
  assert.deepEqual(scenarioIssues(three, flags, {}, false).map((i) => `${i.code}:${i.recordId}`), ['flag_no_date:2']);
  assert.deepEqual(scenarioIssues(three, flags, {}, true).map((i) => `${i.code}:${i.recordId}`), ['scenario_no_flag:3', 'flag_no_date:2']);
});

test('registre en base : scénarios, flags, suppression protégée, journal', async () => {
  const ex = await Exercise.create(factory, schemaSql, { author: 'Alex', toolVersion: 't', refVersion: 'R', codename: 'MOUETTE', profile: 'rt' });
  const s1 = await ex.saveScenario(null, { label: 'Fraude au paiement', cia: 'I', selected: true });
  const s2 = await ex.saveScenario(null, { label: 'Scénario prospectif', threat_led: false });
  assert.deepEqual(ex.listScenarios().map((s) => [s.id, s.threat_led, s.selected]), [[s1, true, true], [s2, false, false]]);
  const f = await ex.saveFlag(null, { scenario_id: s1, label: 'Ordre de virement modifié', cia: 'I' });
  assert.equal(ex.listFlags()[0]?.status, 'planned');
  await ex.saveFlag(f, { status: 'reached', reached_at: '2027-03-02', attack_path: 'hameçonnage → poste → application', ttps: 'T1566, T1078' });
  assert.equal(ex.listFlags()[0]?.reached_at, '2027-03-02');
  await assert.rejects(ex.deleteScenario(s1), /utilisé/);
  await assert.rejects(ex.saveFlag(f, { reached_at: '2027-02-30' }));
  await ex.deleteScenario(s2);
  const actions = ex.db.all<{ e: string; a: string }>("SELECT entity AS e, action AS a FROM journal WHERE entity IN ('scenarios', 'flags') ORDER BY seq").map((r) => `${r.e}:${r.a}`);
  assert.deepEqual(actions, ['scenarios:create', 'scenarios:create', 'flags:create', 'flags:update', 'scenarios:delete']);
  assert.equal((await ex.verify()).ok, true);
  ex.close();
});
