import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSqliteWasm } from '../src/sqlite-wasm.ts';
import { Exercise, ExerciseError } from '../src/exercise.ts';
import { GENESIS_HASH, verifyAnchor, verifyChain } from '../src/journal.ts';
import { createSession, openEnvelope, seal } from '../src/envelope.ts';
import { computeDeadlines } from '../src/deadlines.ts';
import type { SqlDbFactory } from '../src/db.ts';
import type { CoreRef } from '../src/types.ts';

const schemaSql = readFileSync(new URL('../../schema/tlpt.sql', import.meta.url), 'utf8');
const core = JSON.parse(readFileSync(new URL('../../referentiel/packs/core.json', import.meta.url), 'utf8')) as CoreRef;
const FAST = { argon2: { m_kib: 19_456, t: 2, p: 1 } };

let factory: SqlDbFactory;
before(async () => { factory = await createSqliteWasm(); });

function clock(start = '2026-10-19T09:00:00Z') {
  let t = Date.parse(start);
  return () => new Date((t += 1000)).toISOString().replace(/\.\d{3}Z$/, 'Z');
}
const info = (author = 'Camille (PMO)') => ({ author, toolVersion: '0.1.0-test', refVersion: '2026.10.0', clock: clock() });

async function newExercise() {
  return Exercise.create(factory, schemaSql, { ...info(), codename: 'HERON', profile: 'entity' });
}

test('création : schéma, session et métadonnées journalisés, chaîne valide', async () => {
  const ex = await newExercise();
  const meta = ex.meta();
  assert.equal(meta.codename, 'HERON');
  assert.equal(meta.profile, 'entity');
  assert.equal(meta.schema_version, '4');
  const actions = ex.db.all<{ action: string; entity: string | null }>('SELECT action, entity FROM journal ORDER BY seq');
  assert.equal(actions[0]?.action, 'session_open');
  assert.ok(actions.slice(1).every((a) => a.action === 'create' && a.entity === 'meta'));
  const check = await ex.verify();
  assert.equal(check.ok, true);
  assert.equal(ex.db.get<{ prev_hash: string }>('SELECT prev_hash FROM journal WHERE seq = 1')?.prev_hash, GENESIS_HASH);
  ex.close();
});

test('validation à la création : nom de code, profil, auteur, nom d\'entité dans le nom de code', async () => {
  await assert.rejects(Exercise.create(factory, schemaSql, { ...info(), codename: '', profile: 'entity' }), ExerciseError);
  await assert.rejects(Exercise.create(factory, schemaSql, { ...info(), codename: 'X', profile: 'entity' }), ExerciseError);
  await assert.rejects(Exercise.create(factory, schemaSql, { ...info(), codename: 'HERON', profile: 'admin' as 'entity' }), ExerciseError);
  await assert.rejects(Exercise.create(factory, schemaSql, { ...info('   '), codename: 'HERON', profile: 'entity' }), ExerciseError);
  await assert.rejects(Exercise.create(factory, schemaSql, { ...info(), codename: 'Banque Exemple TLPT', profile: 'entity', entityName: 'Banque Exemple' }), ExerciseError);
});

test('mutations : avant / après journalisés, sans écriture si rien ne change, suppression', async () => {
  const ex = await newExercise();
  assert.equal(await ex.setEventDate('N0', '2026-10-01'), true);
  assert.equal(await ex.setEventDate('N0', '2026-10-01'), false); // inchangé : pas d'entrée
  assert.equal(await ex.setEventDate('N0', '2026-10-02', 'courrier reçu le 2'), true);
  assert.equal(await ex.setEventDate('N0', null), true);
  const rows = ex.db.all<{ action: string; before: string | null; after: string | null }>(
    "SELECT action, before, after FROM journal WHERE entity = 'event_dates' ORDER BY seq");
  assert.deepEqual(rows.map((r) => r.action), ['create', 'update', 'delete']);
  assert.equal(rows[1]?.before, '{"date":"2026-10-01","note":null}');
  assert.equal(rows[1]?.after, '{"date":"2026-10-02","note":"courrier reçu le 2"}');
  assert.equal(rows[2]?.after, null);
  await assert.rejects(ex.setEventDate('N0', '2026-02-30'), ExerciseError);
  assert.equal((await ex.verify()).ok, true);
  ex.close();
});

test('checklist : justification et décideur exigés, version du référentiel enregistrée', async () => {
  const ex = await newExercise();
  await assert.rejects(ex.setChecklist('RTS-9.2', 'not_applicable'), ExerciseError);
  await assert.rejects(ex.setChecklist('RTS-9.2', 'accepted_gap', 'motif'), ExerciseError);
  await ex.setChecklist('RTS-9.2', 'accepted_gap', 'Retard du prestataire', 'DG adjoint');
  assert.equal(ex.db.get<{ ref_version: string }>("SELECT ref_version FROM checklist WHERE item_ref = 'RTS-9.2'")?.ref_version, '2026.10.0');
  await assert.rejects(ex.setDeadlineOverride('D-13', { offset: { value: 2, unit: 'years' }, justification: '', decidedBy: 'x' }), ExerciseError);
  ex.close();
});

test('écritures concurrentes : la chaîne reste contiguë', async () => {
  const ex = await newExercise();
  const events = ['N0', 'INIT_SUBMITTED', 'INIT_VALIDATED', 'CT_VALIDATED', 'SSD_SUBMITTED', 'SSD_APPROVED'];
  await Promise.all(events.map((e, i) => ex.setEventDate(e, `2026-1${i < 3 ? 0 : 1}-0${i + 1}`)));
  const check = await ex.verify();
  assert.equal(check.ok, true);
  assert.equal(ex.db.all('SELECT * FROM event_dates').length, events.length);
  ex.close();
});

test('altération de la base détectée (même en supprimant les déclencheurs)', async () => {
  const ex = await newExercise();
  await ex.setEventDate('N0', '2026-10-01');
  await ex.setEventDate('R0', '2027-05-03');
  const seq = ex.db.get<{ seq: number }>("SELECT seq FROM journal WHERE entity_id = 'N0'")?.seq ?? 0;
  ex.db.exec('DROP TRIGGER journal_no_update');
  ex.db.exec("UPDATE journal SET after = '{\"date\":\"2026-12-01\",\"note\":null}' WHERE seq = ?", [seq]);
  const check = await verifyChain(ex.db);
  assert.equal(check.ok, false);
  assert.equal(check.ok === false && check.brokenAt, seq);
  assert.equal(check.ok === false && check.reason, 'hash');
  ex.close();
});

test('ancrage : vérifiable plus tard, invalide si la chaîne est réécrite', async () => {
  const ex = await newExercise();
  await ex.setEventDate('N0', '2026-10-01');
  const a = await ex.anchor();
  assert.equal(a.codename, 'HERON');
  await ex.setFact('pooled', true);
  assert.equal(verifyAnchor(ex.db, a), true);
  ex.db.exec('DROP TRIGGER journal_no_update');
  ex.db.exec("UPDATE journal SET hash = ? WHERE seq = ?", ['f'.repeat(64), a.seq]);
  assert.equal(verifyAnchor(ex.db, a), false);
  ex.close();
});

test('parcours complet : créer → saisir → chiffrer → rouvrir → vérifier → calculer les échéances', async () => {
  const ex = await newExercise();
  await ex.setEventDate('N0', '2026-10-01');
  await ex.setFact('cross_border', true);
  await ex.setEventDate('HOST_INFORMED', '2026-10-05');
  await ex.setDeadlineDone('D-01', '2026-12-15');
  await ex.setDeadlineOverride('D-13', { offset: { value: 2, unit: 'years' }, justification: 'Fréquence réduite par l\'autorité', decidedBy: 'RSSI' });
  await ex.setEventDate('PREV_TLPT', '2025-03-15');
  await ex.setChecklist('RTS-9.2', 'done');

  const session = await createSession('phrase de passe suffisamment longue', FAST);
  const text = await seal(session, await ex.exportBytes());
  ex.close();

  assert.ok(!text.includes('HERON'), 'le nom de code n\'apparaît pas en clair dans le fichier');
  const opened = await openEnvelope(text, 'phrase de passe suffisamment longue');
  const ex2 = await Exercise.open(factory, opened.dbBytes, { ...info('Dominique (CTL)') });
  assert.equal(ex2.integrityAtOpen.ok, true);
  assert.equal((await ex2.verify()).ok, true);
  const sessions = ex2.db.all<{ author: string }>('SELECT author FROM sessions ORDER BY opened_at');
  assert.deepEqual(sessions.map((s) => s.author), ['Camille (PMO)', 'Dominique (CTL)']);
  assert.ok(ex2.db.get("SELECT 1 AS x FROM journal WHERE action = 'export'"));

  const r = Object.fromEntries(computeDeadlines(core, ex2.loadState('2026-10-19')).map((d) => [d.id, d]));
  assert.equal(r['D-01']?.state, 'done_on_time');
  assert.equal(r['D-02']?.due, '2027-04-01');
  assert.equal(r['D-13']?.due, '2027-03-15');
  assert.equal(r['D-13']?.overridden?.justification, 'Fréquence réduite par l\'autorité');
  assert.equal(r['D-15']?.due, '2026-11-02');
  // Clés étrangères actives après réouverture.
  assert.throws(() => ex2.db.exec("INSERT INTO deliverables (title, status, owner_party_id) VALUES ('x', 'draft', 999)"));
  ex2.close();
});

test('ouverture : version de schéma inconnue refusée', async () => {
  const ex = await newExercise();
  ex.db.exec("UPDATE meta SET value = '99' WHERE key = 'schema_version'");
  const bytes = ex.db.export();
  ex.close();
  await assert.rejects(Exercise.open(factory, bytes, info()), /schéma 99/);
});

test('ouverture d\'une base altérée : signalée dans la session, pas bloquante', async () => {
  const ex = await newExercise();
  await ex.setEventDate('N0', '2026-10-01');
  ex.db.exec('DROP TRIGGER journal_no_update');
  ex.db.exec("UPDATE journal SET author = 'Mallory' WHERE seq = 2");
  const bytes = ex.db.export();
  ex.close();
  const ex2 = await Exercise.open(factory, bytes, info());
  assert.equal(ex2.integrityAtOpen.ok, false);
  const last = ex2.db.get<{ after: string }>("SELECT after FROM journal WHERE action = 'session_open' ORDER BY seq DESC LIMIT 1");
  assert.match(last?.after ?? '', /"ok":false/);
  ex2.close();
});
