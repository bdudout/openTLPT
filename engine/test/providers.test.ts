import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSqliteWasm } from '../src/sqlite-wasm.ts';
import { Exercise } from '../src/exercise.ts';
import { criteriaFor, evaluateProviders, type CriterionDef } from '../src/providers.ts';
import type { SqlDbFactory } from '../src/db.ts';

const schemaSql = readFileSync(new URL('../../schema/tlpt.sql', import.meta.url), 'utf8');
const items = (JSON.parse(readFileSync(new URL('../../referentiel/packs/dora-rts.json', import.meta.url), 'utf8')).items) as CriterionDef[];
let factory: SqlDbFactory;
before(async () => { factory = await createSqliteWasm(); });
const SHA = 'a'.repeat(64);

test('grille tirée du référentiel : critères TI et RT distincts (DORA 27(1), RTS 7(1))', () => {
  const ti = criteriaFor(items, 'TIP').map((c) => c.id);
  const rt = criteriaFor(items, 'RTT').map((c) => c.id);
  assert.ok(ti.includes('RTS-7.1.c') && !ti.includes('RTS-7.1.d'), 'TIP : 3 références, pas 5');
  assert.ok(rt.includes('RTS-7.1.d') && !rt.includes('RTS-7.1.c'), 'RTT : 5 références');
  assert.ok(ti.includes('DORA-27.1.a') && rt.includes('DORA-27.1.e'));
  assert.ok(!ti.includes('RTS-7.1.g'), 'la restauration relève de la clôture, pas de la sélection');
  assert.ok(!ti.includes('RTS-7.2.1'), 'la conservation des preuves incombe au CT, pas au prestataire');
});

test('évaluation en base : prêt seulement si tout est conforme ou en dérogation motivée ; contrat avant preuves signalé', async () => {
  const ex = await Exercise.create(factory, schemaSql, { author: 'Alex', toolVersion: 't', refVersion: 'R', codename: 'MOUETTE', profile: 'entity' });
  const tip = await ex.saveParty(null, { actor_ref: 'TIP', organisation: 'Intel SA', person: 'C. Martin', contact: 'c.martin@example.org' });
  await ex.saveParty(null, { actor_ref: 'TM', organisation: 'Autorité' });
  const crit = criteriaFor(items, 'TIP');
  let [ev] = evaluateProviders(items, ex.listParties(), ex.listProviderChecks(), '2027-01-10');
  assert.equal(ev?.ready, false);
  assert.equal(ev?.counts.open, crit.length);
  assert.equal(ev?.issues[0]?.code, 'provider_contracted_not_ready');
  for (const c of crit) await ex.setProviderCheck(tip, c.id, { status: 'compliant', evidence_sha256: SHA, evidence_label: 'dossier.pdf' });
  await ex.setProviderCheck(tip, 'RTS-7.1.c', { status: 'derogation' });
  [ev] = evaluateProviders(items, ex.listParties(), ex.listProviderChecks(), '2027-01-10');
  assert.deepEqual(ev?.issues.map((i) => i.code), ['provider_contracted_not_ready', 'provider_derogation_unjustified']);
  await ex.setProviderCheck(tip, 'RTS-7.1.c', { note: 'Dérogation RTS 7(2) : 2 références, expérience compensée' });
  [ev] = evaluateProviders(items, ex.listParties(), ex.listProviderChecks(), '2027-01-10');
  assert.equal(ev?.ready, true);
  assert.deepEqual(ev?.issues, []);
  // Conformité déclarée sans preuve : signalée.
  await ex.setProviderCheck(tip, 'RTS-7.1.a', { evidence_sha256: null, evidence_label: null });
  assert.deepEqual(evaluateProviders(items, ex.listParties(), ex.listProviderChecks())[0]?.issues.map((i) => i.code), ['provider_no_evidence']);
  await assert.rejects(ex.deleteParty(tip), /désactivez/);
  await ex.saveParty(tip, { active: false });
  assert.equal(evaluateProviders(items, ex.listParties(), ex.listProviderChecks()).length, 0, 'partie inactive non évaluée');
  const n = ex.db.get<{ n: number }>("SELECT count(*) AS n FROM journal WHERE entity = 'provider_checks'")?.n;
  assert.equal(n, crit.length + 3);
  assert.equal((await ex.verify()).ok, true);
  ex.close();
});
