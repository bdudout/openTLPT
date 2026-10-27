import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { effectiveFacts } from '../src/applicability.ts';
import { buildChecklist, expandProfile, type PackDef, type ProfileDef } from '../src/checklist.ts';
import { buildDashboard, deadlinePhases, type DashboardPhaseDef } from '../src/dashboard.ts';
import { computeDeadlinesForProfile, eventScope } from '../src/scope.ts';
import { factIssues } from '../src/consistency.ts';
import type { CoreRef, EventDef, FactValue, ISODate } from '../src/types.ts';

const load = (n: string) => JSON.parse(readFileSync(new URL(`../../referentiel/packs/${n}.json`, import.meta.url), 'utf8'));
const core = load('core') as CoreRef & { profiles: ProfileDef[]; phases: DashboardPhaseDef[]; events: (EventDef & { set_by: string[] })[] };
const packs = ['dora-rts', 'tiber-eu', 'tiber-fr'].map(load) as PackDef[];
const itemPhase = new Map(packs.flatMap((p) => p.items ?? []).map((i) => [i.id, i.phase]));
const phaseOf = deadlinePhases(core.deadlines, (id) => itemPhase.get(id));
const TODAY = '2026-10-27';
// Situation du parcours « prestataire red team » : préparation de l'entité non saisie, phase active depuis 32 jours.
const RT_EVENTS = { N0: '2026-04-10', TESTING_START: '2026-08-08', TTIR_APPROVED: '2026-09-12', R0: '2026-09-25' };

const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map((x) => [x.id, x]));
const deadlines = (profile: string, events: Record<string, ISODate>, facts: Record<string, FactValue> = {}) =>
  byId(computeDeadlinesForProfile(core, { today: TODAY, events, facts }, core.profiles, profile));

function dash(profile: string, events: Record<string, ISODate>, facts: Record<string, FactValue> = {}) {
  const f = effectiveFacts(core.facts, facts);
  return buildDashboard({
    today: TODAY, phases: core.phases, events: core.events, deadlineDefs: core.deadlines,
    deadlines: computeDeadlinesForProfile(core, { today: TODAY, events, facts }, core.profiles, profile),
    deadlinePhase: phaseOf, eventDates: events, visibleProfiles: expandProfile(core.profiles, profile), factIssues: factIssues(f),
    checklist: buildChecklist({ packs, profiles: core.profiles, profile, facts: f, responses: {}, refVersion: 'R' }),
  });
}

test('prestataire RT : les échéances de l\'entité passent en information, jamais en retard', () => {
  const d = deadlines('rt', RT_EVENTS);
  for (const id of ['D-01', 'D-02', 'D-03', 'D-04', 'D-05']) {
    assert.equal(d[id]?.display, 'info', id);
    assert.equal(d[id]?.otherActor, true, id);
  }
  assert.equal(d['D-01']?.state, 'overdue', 'l\'état reste calculé (information sur le déroulé de l\'entité)');
  for (const id of ['D-06', 'D-07', 'D-08', 'D-10']) assert.equal(d[id]?.display, 'check', id);
  const db = dash('rt', RT_EVENTS);
  assert.equal(db.kpis.overdueDeadlines, 0);
  assert.deepEqual(db.thisWeek.map((a) => a.id), ['D-07']);
  assert.ok(db.compliance.every((c) => c.overdue === 0));
});

test('entité : suit toutes les échéances (responsable de la conformité, DORA 26(3)), sauf celles de la seule autorité', () => {
  const d = deadlines('entity', RT_EVENTS, { cross_border: true });
  for (const id of ['D-01', 'D-02', 'D-03', 'D-04', 'D-05', 'D-06', 'D-07', 'D-08', 'D-09', 'D-10', 'D-11', 'D-12', 'D-13']) assert.equal(d[id]?.display, 'check', id);
  assert.equal(d['D-15']?.display, 'info', 'autorités d\'accueil : porté par l\'autorité');
  assert.ok(!Object.values(d).some((r) => r.otherActor));
});

test('TI seul : rien à cocher dans le calendrier réglementaire ; TI+RT cumule les échéances RT', () => {
  const ti = deadlines('ti', RT_EVENTS);
  assert.ok(Object.values(ti).every((r) => r.display === 'info'));
  const both = deadlines('ti_rt', RT_EVENTS);
  assert.equal(both['D-06']?.display, 'check');
  assert.equal(both['D-01']?.display, 'info');
});

test('jalons attendus filtrés par profil ; validations de l\'autorité signalées', () => {
  const rt = dash('rt', { N0: '2026-04-10' });
  const ev = rt.expectedEvents.map((e) => e.event);
  assert.ok(!ev.includes('INIT_SUBMITTED') && !ev.includes('SSD_SUBMITTED'), 'jalons propres à l\'entité masqués');
  const active = dash('rt', RT_EVENTS).expectedEvents.map((e) => e.event);
  assert.ok(active.includes('R1'), 'fin de phase active : concerne le RT');
  const ent = dash('entity', { N0: '2026-04-10', INIT_SUBMITTED: '2026-06-01' });
  const iv = ent.expectedEvents.find((e) => e.event === 'INIT_VALIDATED');
  assert.equal(iv?.byAuthority, true);
  assert.ok(!ent.expectedEvents.find((e) => e.event === 'PROVIDERS_CONTRACTED')?.byAuthority);
  const vis = expandProfile(core.profiles, 'rt');
  const r0 = core.events.find((e) => e.id === 'R0');
  assert.equal(r0 && eventScope(r0, core.deadlines, vis).relevant, true, 'R0 ouvre D-06 / D-07, portés par les testeurs');
});

test('cohérence : « significant » + testeurs internes ou mixtes = erreur (DORA 26(8) al. 2)', () => {
  const f = effectiveFacts(core.facts, { ssm_significant: true, testers: 'mixed', tlpt_authority: 'ecb' });
  const is = factIssues(f);
  assert.deepEqual(is.map((i) => `${i.severity}:${i.code}`), ['error:ssm_external_only']);
  assert.equal(is[0]?.source, 'DORA-26.8.2');
  assert.deepEqual(factIssues(effectiveFacts(core.facts, { ssm_significant: true, tlpt_authority: 'ecb' })), []);
});

test('cohérence : autorité, TIBER-FR, mutualisé / commun, SIIV', () => {
  const codes = (facts: Record<string, FactValue>) => factIssues(effectiveFacts(core.facts, facts)).map((i) => i.code).sort();
  assert.deepEqual(codes({ ssm_significant: true }), ['ssm_authority_ecb']);
  assert.deepEqual(codes({ national_framework: 'TIBER-FR', tlpt_authority: 'ecb' }), ['tiberfr_not_applicable']);
  assert.deepEqual(codes({ ssm_significant: true, tlpt_authority: 'ecb', national_framework: 'TIBER-FR', testers: 'internal' }), ['ssm_external_only', 'tiberfr_not_applicable']);
  assert.deepEqual(codes({ pooled: true }), ['pooled_requires_tpp']);
  assert.deepEqual(codes({ pooled: true, ict_tpp_in_scope: true, joint: true }), ['pooled_and_joint']);
  assert.deepEqual(codes({ oiv_siiv_flags: true }), ['siiv_without_tiberfr']);
  assert.deepEqual(codes({ national_framework: 'TIBER-FR', oiv_siiv_flags: true }), []);
  assert.deepEqual(codes({}), [], 'valeurs par défaut cohérentes');
});

test('parcours « banque significant » : l\'incohérence remonte dans les alertes du tableau de bord', () => {
  const db = dash('entity', { N0: '2026-09-27' }, { ssm_significant: true, tlpt_authority: 'ecb', testers: 'mixed', national_framework: 'TIBER-FR', joint: true, cross_border: true, ict_tpp_in_scope: true });
  const facts = db.alerts.filter((a) => a.kind === 'facts');
  assert.deepEqual(facts.map((a) => `${a.severity}:${a.code}`), ['error:ssm_external_only', 'warning:tiberfr_not_applicable']);
});
