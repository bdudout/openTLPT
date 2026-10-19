import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { effectiveFacts } from '../src/applicability.ts';
import { buildChecklist, expandProfile, formatSource, totalProgress, type ChecklistInput, type PackDef, type ProfileDef } from '../src/checklist.ts';
import type { CoreRef, FactValue } from '../src/types.ts';

const load = (name: string) => JSON.parse(readFileSync(new URL(`../../referentiel/packs/${name}.json`, import.meta.url), 'utf8'));
const core = load('core') as CoreRef & { profiles: ProfileDef[] };
const packs = ['dora-rts', 'tiber-eu', 'tiber-fr'].map(load) as PackDef[];

function run(profile: string, facts: Record<string, FactValue> = {}, responses: ChecklistInput['responses'] = {}) {
  return buildChecklist({ packs, profiles: core.profiles, profile, facts: effectiveFacts(core.facts, facts), responses, refVersion: 'R1' });
}
const ids = (es: { item: { id: string } }[]) => es.map((e) => e.item.id);
const all = (r: ReturnType<typeof run>, kind: 'obligations' | 'practices') => Object.values(r.phases).flatMap((p) => ids(p[kind]));

test('profils : TI+RT = union de TI et RT', () => {
  assert.deepEqual([...expandProfile(core.profiles, 'ti_rt')].sort(), ['rt', 'ti', 'ti_rt']);
  assert.deepEqual([...expandProfile(core.profiles, 'entity')], ['entity']);
});

test('séparation stricte : obligations seulement depuis DORA/RTS, bonnes pratiques seulement depuis TIBER', () => {
  const r = run('entity', { national_framework: 'TIBER-FR' });
  const obl = all(r, 'obligations');
  const bp = all(r, 'practices');
  assert.ok(obl.every((id) => id.startsWith('DORA-') || id.startsWith('RTS-')));
  assert.ok(bp.every((id) => id.startsWith('EU-') || id.startsWith('FR-')));
  assert.ok(obl.length > 60 && bp.length > 40);
});

test('filtrage par profil : un prestataire TI ne voit pas les obligations propres à la red team', () => {
  const ti = all(run('ti'), 'obligations');
  assert.ok(ti.includes('RTS-7.1.c'));      // TIP : 3 références
  assert.ok(!ti.includes('RTS-7.1.d'));     // testeurs : 5 références
  assert.ok(!ti.includes('RTS-9.6'));       // SSD : entité seule
  const tirt = all(run('ti_rt'), 'obligations');
  assert.ok(tirt.includes('RTS-7.1.c') && tirt.includes('RTS-7.1.d') && tirt.includes('RTS-7.1.e.v') && tirt.includes('RTS-7.1.f.v'));
});

test('applicabilité : testeurs internes, mutualisé, transfrontière', () => {
  const ext = all(run('entity'), 'obligations');
  assert.ok(!ext.includes('RTS-15.1') && !ext.includes('DORA-26.8.1'));
  const mixed = all(run('entity', { testers: 'mixed' }), 'obligations');
  assert.ok(mixed.includes('RTS-15.1') && mixed.includes('DORA-26.8.1') && mixed.includes('DORA-27.2'));
  assert.ok(all(run('entity', { pooled: true }), 'obligations').includes('DORA-26.4'));
  assert.ok(all(run('entity', { cross_border: true }), 'obligations').includes('RTS-16.1'));
});

test('TIBER-FR visible seulement si la déclinaison nationale est TIBER-FR ; FR-04 seulement avec des flags SIIV', () => {
  assert.equal(all(run('entity'), 'practices').filter((id) => id.startsWith('FR-')).length, 0);
  const fr = all(run('entity', { national_framework: 'TIBER-FR' }), 'practices');
  assert.ok(fr.includes('FR-01') && !fr.includes('FR-04'));
  assert.ok(all(run('entity', { national_framework: 'TIBER-FR', oiv_siiv_flags: true }), 'practices').includes('FR-04'));
});

test('regroupement par phase et liens : reformulations et divergences rattachées aux obligations', () => {
  const r = run('entity', { national_framework: 'TIBER-FR' });
  assert.ok(ids(r.phases.preparation?.obligations ?? []).includes('RTS-9.2'));
  assert.ok(ids(r.phases.closure?.practices ?? []).includes('EU-T6'));
  assert.deepEqual(r.related['RTS-12.4']?.diverges, ['EU-T6']);
  assert.ok(r.related['RTS-9.6']?.restates.includes('EU-T1'));
  assert.ok(r.related['RTS-13.1']?.diverges.includes('FR-15'));
});

test('progression : seules les obligations « à cocher » comptent ; réponses et versions périmées', () => {
  const base = run('entity');
  const prep = base.phases.preparation?.progress;
  assert.ok(prep && prep.total > 30 && prep.open === prep.total && prep.handled === 0);
  // RTS-9.1 est « info » (jalon de l'autorité) : non compté.
  assert.ok(base.phases.preparation?.obligations.some((e) => e.item.id === 'RTS-9.1'));
  const r = run('entity', {}, {
    'RTS-9.2': { status: 'done', justification: null, decided_by: null, ref_version: 'R1' },
    'RTS-9.7': { status: 'not_applicable', justification: 'x', decided_by: null, ref_version: 'R0' },
    'EU-02': { status: 'done', justification: null, decided_by: null, ref_version: 'R1' },
    'RTS-15.1': { status: 'done', justification: null, decided_by: null, ref_version: 'R1' },
  });
  const p = r.phases.preparation?.progress;
  assert.equal(p?.done, 1);
  assert.equal(p?.not_applicable, 1);
  assert.equal(p?.handled, 2);
  assert.equal(r.phases.preparation?.obligations.find((e) => e.item.id === 'RTS-9.7')?.stale, true);
  assert.deepEqual(r.orphanResponses, ['RTS-15.1']); // testeurs externes : RTS-15.1 n'est plus applicable
  assert.equal(totalProgress(r).handled, 2);       // la bonne pratique EU-02 n'entre pas dans la conformité
});

test('références lisibles', () => {
  assert.equal(formatSource({ instrument: 'RTS_2025_1190', article: '9', paragraph: '2' }), 'RTS 2025/1190, art. 9(2)');
  assert.equal(formatSource({ instrument: 'DORA', article: '26', paragraph: '8', subparagraph: '2' }), 'DORA, art. 26(8) al. 2');
  assert.equal(formatSource({ instrument: 'RTS_2025_1190', article: '7', paragraph: '1', point: 'e(v)' }), 'RTS 2025/1190, art. 7(1)(e)(v)');
  assert.equal(formatSource({ instrument: 'RTS_2025_1190', article: '4', paragraph: '2', point: 'f' }), 'RTS 2025/1190, art. 4(2)(f)');
  assert.equal(formatSource({ instrument: 'TIBER-EU_2025', article: '7.3', section: 'x' }), 'TIBER-EU (2025) §7.3');
});
