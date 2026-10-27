import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSqliteWasm } from '../src/sqlite-wasm.ts';
import { Exercise, ExerciseError } from '../src/exercise.ts';
import { computeDeadlines } from '../src/deadlines.ts';
import { effectiveFacts } from '../src/applicability.ts';
import { sha256Hex, utf8 } from '../src/bytes.ts';
import {
  deliverableRows, detectionIssues, legUpIssues, reportsOutsideActivePhase, withDeliverableDates,
  type DeliverableDefLike, type LegUpRecord, type DetectionRecord,
} from '../src/registers.ts';
import type { SqlDbFactory } from '../src/db.ts';
import type { CoreRef } from '../src/types.ts';
import type { ProfileDef } from '../src/checklist.ts';

const schemaSql = readFileSync(new URL('../../schema/tlpt.sql', import.meta.url), 'utf8');
const schemaV1 = readFileSync(new URL('./fixtures/tlpt-v1.sql', import.meta.url), 'utf8');
const core = JSON.parse(readFileSync(new URL('../../referentiel/packs/core.json', import.meta.url), 'utf8')) as
  CoreRef & { profiles: ProfileDef[]; deliverables: DeliverableDefLike[] };

let factory: SqlDbFactory;
before(async () => { factory = await createSqliteWasm(); });
const info = (author = 'Camille (PMO)') => ({ author, toolVersion: 't', refVersion: 'R1' });
const create = () => Exercise.create(factory, schemaSql, { ...info(), codename: 'HERON', profile: 'entity' });

test('migration v1 → v4 (via v2, v3) sur une base v1 réelle', async () => {
  // Base v1 : schéma v1, métadonnées posées par le moteur, puis version déclarée 1 et journal vierge
  // (équivalent d'un fichier v1 dont on n'a gardé que les données : la chaîne vide est valide).
  const db = factory.open();
  db.exec(schemaV1);
  const fakeFactory: SqlDbFactory = { sqliteVersion: factory.sqliteVersion, open: () => db };
  const exV1 = await Exercise.create(fakeFactory, 'SELECT 1', { ...info(), codename: 'HERON', profile: 'entity' });
  exV1.db.exec('DROP TRIGGER journal_no_delete');
  exV1.db.exec('DELETE FROM journal');
  exV1.db.exec('DELETE FROM sessions');
  exV1.db.exec("UPDATE meta SET value = '1' WHERE key = 'schema_version'");
  exV1.db.exec(`CREATE TRIGGER journal_no_delete BEFORE DELETE ON journal BEGIN SELECT RAISE(ABORT, 'journal is append-only'); END`);
  assert.equal(exV1.db.get<{ n: number }>("SELECT count(*) AS n FROM sqlite_master WHERE name = 'weekly_reports'")?.n, 0);
  const bytes = exV1.db.export();
  exV1.close();

  const ex = await Exercise.open(factory, bytes, info('Dominique (CTL)'));
  assert.equal(ex.integrityAtOpen.ok, true);
  assert.equal(ex.meta().schema_version, '4');
  assert.equal(ex.db.get<{ n: number }>("SELECT count(*) AS n FROM sqlite_master WHERE name = 'event_plans'")?.n, 1);
  assert.equal(ex.db.get<{ n: number }>("SELECT count(*) AS n FROM sqlite_master WHERE name = 'flags'")?.n, 1);
  assert.equal(ex.db.get<{ n: number }>("SELECT count(*) AS n FROM sqlite_master WHERE name = 'weekly_reports'")?.n, 1);
  const cols = ex.db.all<{ name: string }>('PRAGMA table_info(deliverables)').map((c) => c.name);
  assert.ok(cols.includes('file_name') && cols.includes('file_size'));
  const migs = ex.db.all<{ before: string; after: string }>("SELECT before, after FROM journal WHERE entity = 'meta' AND entity_id = 'schema_version' AND action = 'update' ORDER BY seq");
  assert.deepEqual(migs.map((m) => `${m.before}->${m.after}`), ['{"value":"1"}->{"value":"2"}', '{"value":"2"}->{"value":"3"}', '{"value":"3"}->{"value":"4"}']);
  assert.equal((await ex.verify()).ok, true);
  await ex.saveWeeklyReport(null, { report_date: '2027-05-07' });
  ex.close();
});

test('version de schéma inconnue toujours refusée', async () => {
  const ex = await create();
  ex.db.exec("UPDATE meta SET value = '9' WHERE key = 'schema_version'");
  const bytes = ex.db.export();
  ex.close();
  await assert.rejects(Exercise.open(factory, bytes, info()), ExerciseError);
});

test('livrables : création, mise à jour partielle, suppression, toutes journalisées ; empreinte contrôlée', async () => {
  const ex = await create();
  const hash = await sha256Hex(utf8('contenu du SSD v1'));
  const id = await ex.saveDeliverable(null, { deliverable_ref: 'DLV-SSD', title: 'SSD', status: 'draft', version: '0.9' });
  assert.equal(id, 1);
  await ex.saveDeliverable(id, { status: 'submitted', submitted_at: '2027-03-20', sha256: hash, file_name: 'ssd-v1.pdf', file_size: 12345 });
  const [d] = ex.listDeliverables();
  assert.equal(d?.status, 'submitted');
  assert.equal(d?.version, '0.9', 'mise à jour partielle : champs non fournis conservés');
  assert.equal(d?.sha256, hash);
  assert.equal(await ex.saveDeliverable(id, { status: 'submitted' }), id); // inchangé : pas d'entrée
  await assert.rejects(ex.saveDeliverable(id, { sha256: 'ABC' }), ExerciseError);
  await assert.rejects(ex.saveDeliverable(id, { submitted_at: '2027-02-30' }), ExerciseError);
  await assert.rejects(ex.saveDeliverable(null, { status: 'draft' }), ExerciseError);
  await ex.deleteDeliverable(id);
  assert.equal(ex.listDeliverables().length, 0);
  const actions = ex.db.all<{ action: string }>("SELECT action FROM journal WHERE entity = 'deliverables' ORDER BY seq").map((r) => r.action);
  assert.deepEqual(actions, ['create', 'update', 'delete']);
  const upd = ex.db.get<{ before: string; after: string }>("SELECT before, after FROM journal WHERE entity = 'deliverables' AND action = 'update'");
  assert.match(upd?.before ?? '', /"status":"draft"/);
  assert.match(upd?.after ?? '', /"status":"submitted"/);
  assert.equal((await ex.verify()).ok, true);
  ex.close();
});

test('rapports hebdomadaires → D-07 couverte semaine par semaine', async () => {
  const ex = await create();
  await ex.setEventDate('R0', '2027-05-03');
  for (const d of ['2027-05-07', '2027-05-14']) await ex.saveWeeklyReport(null, { report_date: d, summary: 'Point hebdo' });
  const run = () => Object.fromEntries(computeDeadlines(core, ex.loadState('2027-05-26')).map((r) => [r.id, r]));
  assert.equal(run()['D-07']?.state, 'recurring_missing');
  assert.deepEqual(run()['D-07']?.periods?.map((p) => p.covered), [true, true, false]);
  await ex.saveWeeklyReport(null, { report_date: '2027-05-21' });
  assert.equal(run()['D-07']?.state, 'recurring_ok');
  assert.deepEqual(reportsOutsideActivePhase(ex.listWeeklyReports(), '2027-05-10', '2027-05-31'), [1]);
  ex.close();
});

test('leg-ups : RTS 11(8) — ajout non prévu fourni sans double approbation signalé', async () => {
  const ex = await create();
  const planned = await ex.saveLegUp(null, { kind: 'access', planned: true, provided_at: '2027-06-10', description: 'Compte standard sur le poste X' });
  const added = await ex.saveLegUp(null, { kind: 'information', planned: false, requested_at: '2027-06-12', approved_ct: '2027-06-12', provided_at: '2027-06-13', description: 'Explication du blocage du payload' });
  const [p, a] = ex.listLegUps();
  assert.equal(p?.id, planned);
  assert.equal(p?.planned, true);
  assert.deepEqual(legUpIssues(p as LegUpRecord), []);
  assert.deepEqual(legUpIssues(a as LegUpRecord).map((i) => i.code), ['legup_not_approved']);
  await ex.saveLegUp(added, { approved_tm: '2027-06-14' });
  const a2 = ex.listLegUps().find((l) => l.id === added) as LegUpRecord;
  assert.deepEqual(legUpIssues(a2).map((i) => i.code), ['legup_approved_after']);
  await assert.rejects(ex.saveLegUp(null, { description: '  ' }), ExerciseError);
  ex.close();
});

test('détections : RTS 11(9) / 11(10) — validation des TM exigée ; incident réel signalé', () => {
  const base: DetectionRecord = { id: 1, detected_at: '2027-06-20', kind: 'detection', description: 'Alerte EDR', measures: null, validated_by_tm_at: null };
  assert.deepEqual(detectionIssues(base).map((i) => i.source), ['RTS-11.9']);
  assert.deepEqual(detectionIssues({ ...base, validated_by_tm_at: '2027-06-21' }), []);
  assert.deepEqual(detectionIssues({ ...base, kind: 'limited_purple_teaming', validated_by_tm_at: '2027-06-25' }).map((i) => i.code), ['purple_validated_after']);
  assert.deepEqual(detectionIssues({ ...base, kind: 'real_incident' }).map((i) => i.code), ['real_incident']);
  assert.deepEqual(detectionIssues({ ...base, kind: 'suspension' }), []);
});

test('détections journalisées et persistées après chiffrement / réouverture', async () => {
  const ex = await create();
  await ex.saveDetection(null, { detected_at: '2027-06-20', kind: 'detection', description: 'Alerte SOC' });
  await assert.rejects(ex.saveDetection(null, { kind: 'detection', description: 'x' }), ExerciseError);
  const bytes = await ex.exportBytes();
  ex.close();
  const ex2 = await Exercise.open(factory, bytes, info('Dominique (CTL)'));
  assert.equal(ex2.listDetections()[0]?.description, 'Alerte SOC');
  assert.equal((await ex2.verify()).ok, true);
  ex2.close();
});

test('livrables attendus : filtrés par profil et faits, rapprochés du suivi et des échéances', async () => {
  const ex = await create();
  await ex.setEventDate('N0', '2026-10-01');
  await ex.saveDeliverable(null, { deliverable_ref: 'DLV-SSD', title: 'SSD', status: 'draft' });
  await ex.saveDeliverable(null, { title: 'Note interne au comité', status: 'draft' });
  const st = ex.loadState('2026-10-19');
  const facts = effectiveFacts(core.facts, st.facts);
  const res = computeDeadlines(core, st);
  const { rows, extra } = deliverableRows(core.deliverables, ex.listDeliverables(), core.deadlines, res, core.profiles, 'entity', facts);
  const ssd = rows.find((r) => r.def.id === 'DLV-SSD');
  assert.equal(ssd?.record?.status, 'draft');
  assert.deepEqual(ssd?.deadlines.map((d) => [d.id, d.due]), [['D-02', '2027-04-01']]);
  assert.ok(!rows.some((r) => r.def.id === 'DLV-IT-POLICY'), 'politique testeurs internes masquée (testeurs externes)');
  assert.deepEqual(extra.map((e) => e.title), ['Note interne au comité']);
  const ti = deliverableRows(core.deliverables, [], core.deadlines, res, core.profiles, 'ti', facts).rows.map((r) => r.def.id);
  assert.ok(ti.includes('DLV-TTIR') && !ti.includes('DLV-SSD'));
  ex.close();
});

test('remise d\'un livrable = réalisation de l\'échéance qui le cible (sauf date explicite)', async () => {
  const ex = await create();
  await ex.setEventDate('N0', '2026-07-01');
  await ex.saveDeliverable(null, { deliverable_ref: 'DLV-INIT', title: 'Charte', status: 'submitted', submitted_at: '2026-09-25' });
  await ex.saveDeliverable(null, { deliverable_ref: 'DLV-SSD', title: 'SSD', status: 'draft' });
  const st = withDeliverableDates(core.deadlines, ex.loadState('2026-10-19'), ex.listDeliverables());
  const r = Object.fromEntries(computeDeadlines(core, st).map((d) => [d.id, d]));
  assert.equal(r['D-01']?.state, 'done_on_time');
  assert.equal(r['D-01']?.doneOn, '2026-09-25');
  assert.equal(r['D-02']?.state, 'upcoming'); // SSD en rédaction : pas de date de remise
  await ex.setDeadlineDone('D-01', '2026-10-05'); // une date explicite prime
  const st2 = withDeliverableDates(core.deadlines, ex.loadState('2026-10-19'), ex.listDeliverables());
  assert.equal(Object.fromEntries(computeDeadlines(core, st2).map((d) => [d.id, d]))['D-01']?.state, 'done_late');
  ex.close();
});
