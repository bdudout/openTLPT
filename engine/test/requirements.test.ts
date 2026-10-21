import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeDeadlines } from '../src/deadlines.ts';
import { effectiveFacts } from '../src/applicability.ts';
import { formatSource, type PackDef, type ProfileDef, type Response } from '../src/checklist.ts';
import { buildRequirements, filterRequirements, toCsv } from '../src/requirements.ts';
import { createSqliteWasm } from '../src/sqlite-wasm.ts';
import { Exercise } from '../src/exercise.ts';
import type { DeliverableRecord } from '../src/registers.ts';
import type { CoreRef, FactValue } from '../src/types.ts';
import type { SqlDbFactory } from '../src/db.ts';

const load = (n: string) => JSON.parse(readFileSync(new URL(`../../referentiel/packs/${n}.json`, import.meta.url), 'utf8'));
const core = load('core') as CoreRef & { profiles: ProfileDef[] };
const packs = ['dora-rts', 'tiber-eu', 'tiber-fr'].map(load) as PackDef[];
const schemaSql = readFileSync(new URL('../../schema/tlpt.sql', import.meta.url), 'utf8');
let factory: SqlDbFactory;
before(async () => { factory = await createSqliteWasm(); });

const R = (status: Response['status'], v = 'R'): Response => ({ status, justification: status === 'done' ? null : 'motif', decided_by: status === 'accepted_gap' ? 'DG' : null, ref_version: v });

function req(profile = 'entity', facts: Record<string, FactValue> = {}, responses: Record<string, Response> = {}, events: Record<string, string> = {}, deliverables: DeliverableRecord[] = []) {
  const f = effectiveFacts(core.facts, facts);
  return buildRequirements({
    packs, profiles: core.profiles, profile, facts: f, responses, refVersion: 'R',
    deadlines: computeDeadlines(core, { today: '2026-10-21', events, facts }), deliverables,
  });
}

test('matrice : toutes les obligations (92), aucune bonne pratique ; exclusions motivées', () => {
  const r = req();
  assert.equal(r.rows.length, 92);
  assert.ok(r.rows.every((x) => x.item.nature === 'obligation'));
  assert.equal(r.rows.filter((x) => x.applicable).length + r.excluded, 92);
  const it = r.rows.find((x) => x.item.id === 'RTS-15.1');
  assert.equal(it?.applicable, false);
  assert.equal(it?.excludedBy, 'condition'); // testeurs externes
  const ti = req('ti').rows.find((x) => x.item.id === 'RTS-9.6');
  assert.equal(ti?.excludedBy, 'profile'); // SSD : entité seule
});

test('synthèse : global = socle + au fil du test ; jalons d\'information à part ; regroupement par texte', () => {
  const r = req('entity', {}, { 'RTS-4.1': R('done'), 'RTS-9.2': R('done'), 'RTS-9.7': R('not_applicable'), 'DORA-27.1.a': R('accepted_gap'), 'RTS-7.1.a': R('in_progress') });
  assert.equal(r.overall.total, r.byFamily.standing.total + r.byFamily.stepwise.total);
  assert.equal(r.overall.handled, 4);
  assert.equal(r.overall.in_progress, 1);
  assert.equal(r.byFamily.standing.handled, 2);
  assert.equal(r.byFamily.stepwise.handled, 2);
  assert.ok(r.info > 0);
  assert.equal(r.overall.total + r.info + r.excluded, 92);
  const keys = r.byText.map((t) => t.key);
  assert.equal(keys[0], 'DORA 26');
  assert.ok(keys.indexOf('RTS 7') < keys.indexOf('RTS 12'), 'tri numérique des articles');
  assert.ok(!keys.includes('RTS 16'), 'articles sans exigence applicable absents');
  assert.equal(r.byText.find((t) => t.key === 'RTS 9')?.count.handled, 2);
});

test('liens : échéances et livrables, retard, réponse à revoir', () => {
  const del: DeliverableRecord = { id: 1, deliverable_ref: 'DLV-INIT', title: 'x', owner_party_id: null, status: 'submitted', version: null, location: null, sha256: null, file_name: null, file_size: null, submitted_at: null, approved_at: null, note: null };
  const r = req('entity', {}, { 'RTS-9.6': R('done', 'OLD') }, { N0: '2026-07-01' }, [del]);
  const r92 = r.rows.find((x) => x.item.id === 'RTS-9.2');
  assert.deepEqual(r92?.deadlines.map((d) => d.id), ['D-01']);
  assert.equal(r92?.overdue, true); // D-01 = 2026-10-01
  assert.deepEqual(r92?.deliverables, [{ id: 'DLV-INIT', status: 'submitted' }]);
  assert.deepEqual(r.rows.find((x) => x.item.id === 'RTS-9.6')?.deliverables, [{ id: 'DLV-SSD', status: 'untracked' }]);
  assert.equal(r.rows.find((x) => x.item.id === 'RTS-9.6')?.stale, true);
});

test('filtres : texte (accents ignorés, référence), famille, statut, porteur, texte de référence, retards', () => {
  const r = req('entity', {}, { 'RTS-9.2': R('done') }, { N0: '2026-07-01' });
  const ref = (x: (typeof r.rows)[number]) => formatSource(x.item.source);
  assert.deepEqual(filterRequirements(r.rows, { q: '9(2)' }, ref).map((x) => x.item.id), ['RTS-9.2']);
  assert.ok(filterRequirements(r.rows, { q: 'référence' }, ref).some((x) => x.item.id === 'RTS-7.1.c'));
  assert.ok(filterRequirements(r.rows, { q: 'reference' }, ref).some((x) => x.item.id === 'RTS-7.1.c'), 'accents ignorés');
  assert.ok(filterRequirements(r.rows, { family: 'standing' }).every((x) => x.family === 'standing'));
  assert.deepEqual(filterRequirements(r.rows, { status: 'handled' }).map((x) => x.item.id), ['RTS-9.2']);
  assert.ok(filterRequirements(r.rows, { carrier: 'TIP' }).every((x) => x.item.carriers.includes('TIP')));
  assert.ok(filterRequirements(r.rows, { textKey: 'DORA 27' }).every((x) => x.item.id.startsWith('DORA-27')));
  assert.deepEqual(filterRequirements(r.rows, { overdueOnly: true }).map((x) => x.item.id), ['RTS-9.2']);
  assert.ok(filterRequirements(r.rows, {}).every((x) => x.applicable), 'les exigences hors périmètre ne sont pas listées');
});

test('CSV : séparateur ;, guillemets, retours à la ligne', () => {
  const csv = toCsv(['ID', 'Exigence'], [['RTS-9.2', 'Remettre ; vite'], ['X', 'dit "oui"\nfin'], ['Y', null]]);
  assert.equal(csv, 'ID;Exigence\r\nRTS-9.2;"Remettre ; vite"\r\nX;"dit ""oui""\nfin"\r\nY;\r\n');
});

test('dernière réponse par exigence et export journalisé', async () => {
  const ex = await Exercise.create(factory, schemaSql, { author: 'Camille', toolVersion: 't', refVersion: 'R', codename: 'HERON', profile: 'entity' });
  await ex.setChecklist('RTS-9.2', 'in_progress');
  await ex.setChecklist('RTS-9.2', 'done');
  assert.equal(ex.lastAnswers()['RTS-9.2']?.author, 'Camille');
  await ex.recordExport('requirements_csv', { rows: 61 });
  const e = ex.db.get<{ entity_id: string; after: string }>("SELECT entity_id, after FROM journal WHERE action = 'export' ORDER BY seq DESC LIMIT 1");
  assert.equal(e?.entity_id, 'requirements_csv');
  assert.match(e?.after ?? '', /"rows":61/);
  assert.equal((await ex.verify()).ok, true);
  ex.close();
});
