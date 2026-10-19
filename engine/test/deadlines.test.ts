import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeDeadlines, checkEventOrder } from '../src/deadlines.ts';
import { effectiveFacts, isApplicable } from '../src/applicability.ts';
import type { CoreRef, DeadlineResult, ExerciseState } from '../src/types.ts';

// Le vrai pack core du référentiel : les tests échouent si un délai réglementaire change sans mise à jour.
const core = JSON.parse(readFileSync(new URL('../../referentiel/packs/core.json', import.meta.url), 'utf8')) as CoreRef;

const byId = (rs: DeadlineResult[]) => Object.fromEntries(rs.map((r) => [r.id, r]));
const run = (st: Partial<ExerciseState>) =>
  byId(computeDeadlines(core, { today: '2026-10-19', events: {}, ...st }));

test('le pack core contient bien les délais attendus', () => {
  assert.deepEqual(core.deadlines.map((d) => d.id),
    ['D-01', 'D-02', 'D-03', 'D-04', 'D-05', 'D-06', 'D-07', 'D-08', 'D-09', 'D-10', 'D-11', 'D-12', 'D-13', 'D-15']);
});

test('sans aucune date : tout est en attente, rien n\'est en retard', () => {
  const r = run({});
  for (const id of ['D-01', 'D-02', 'D-06', 'D-07', 'D-08', 'D-09', 'D-10', 'D-11', 'D-12', 'D-13']) {
    assert.equal(r[id]?.state, 'waiting_anchor', id);
  }
  for (const id of ['D-03', 'D-04', 'D-05']) assert.equal(r[id]?.state, 'upcoming', id); // « avant X », X non daté
  assert.equal(r['D-15']?.state, 'not_applicable'); // cross_border = false par défaut
});

test('préparation : RTS 9(2) 3 mois et 9(6) 6 mois après la notification', () => {
  const r = run({ events: { N0: '2026-10-01' } });
  assert.equal(r['D-01']?.due, '2027-01-01');
  assert.equal(r['D-02']?.due, '2027-04-01');
  assert.equal(r['D-01']?.state, 'upcoming');
  assert.equal(r['D-01']?.daysLeft, 74);
});

test('notification un 31 : échéance ramenée en fin de mois', () => {
  const r = run({ events: { N0: '2026-08-31' }, today: '2026-08-31' });
  assert.equal(r['D-01']?.due, '2026-11-30');
  assert.equal(r['D-02']?.due, '2027-02-28');
});

test('alerte, retard et réalisation (à temps / en retard)', () => {
  const soon = run({ events: { N0: '2026-07-25' }, today: '2026-10-19' }); // D-01 = 2026-10-25
  assert.equal(soon['D-01']?.state, 'due_soon');
  assert.equal(soon['D-01']?.daysLeft, 6);
  const late = run({ events: { N0: '2026-07-01' } });                       // D-01 = 2026-10-01
  assert.equal(late['D-01']?.state, 'overdue');
  assert.equal(late['D-01']?.daysLeft, -18);
  const ok = run({ events: { N0: '2026-07-01' }, done: { 'D-01': '2026-10-01' } });
  assert.equal(ok['D-01']?.state, 'done_on_time');
  const ko = run({ events: { N0: '2026-07-01' }, done: { 'D-01': '2026-10-02' } });
  assert.equal(ko['D-01']?.state, 'done_late');
});

test('fenêtre d\'alerte paramétrable', () => {
  const st: ExerciseState = { today: '2026-10-19', events: { N0: '2026-08-01' } }; // D-01 = 2026-11-01
  assert.equal(byId(computeDeadlines(core, st))['D-01']?.state, 'due_soon');
  assert.equal(byId(computeDeadlines(core, st, { warnDays: 7 }))['D-01']?.state, 'upcoming');
});

test('« avant » : achats et consultation des TM avant le début de la phase de test', () => {
  const planned = run({ events: { TESTING_START: '2027-04-15' } });
  assert.equal(planned['D-03']?.due, '2027-04-15');
  assert.equal(planned['D-03']?.state, 'upcoming');
  const started = run({ events: { TESTING_START: '2026-10-12' } });
  assert.equal(started['D-04']?.state, 'overdue');
  const done = run({ events: { TESTING_START: '2026-10-12' }, done: { 'D-04': '2026-10-05' } });
  assert.equal(done['D-04']?.state, 'done_on_time');
  const doneEarly = run({ done: { 'D-05': '2026-09-30' } }); // fait avant que l'événement soit daté
  assert.equal(doneEarly['D-05']?.state, 'done_on_time');
});

test('RTS 11(5) : phase active d\'au moins 12 semaines', () => {
  const running = run({ events: { R0: '2027-05-03' }, today: '2027-06-01' });
  assert.equal(running['D-06']?.state, 'running');
  assert.equal(running['D-06']?.due, '2027-07-26'); // fin au plus tôt = R0 + 84 jours
  assert.equal(running['D-06']?.daysLeft, 55);
  const met = run({ events: { R0: '2027-05-03', R1: '2027-07-26' } });
  assert.equal(met['D-06']?.state, 'min_met');
  const violated = run({ events: { R0: '2027-05-03', R1: '2027-07-25' } });
  assert.equal(violated['D-06']?.state, 'min_violated');
  assert.equal(violated['D-06']?.daysLeft, 1); // il manquait 1 jour
});

test('RTS 11(7) : rapport au moins hebdomadaire pendant la phase active', () => {
  const st = { events: { R0: '2027-05-03' }, today: '2027-05-26' }; // 3 semaines écoulées + semaine en cours
  const missing = run({ ...st, occurrences: { 'D-07': ['2027-05-07', '2027-05-14'] } });
  assert.equal(missing['D-07']?.state, 'recurring_missing');
  assert.deepEqual(missing['D-07']?.periods?.map((p) => p.covered), [true, true, false]);
  assert.equal(missing['D-07']?.due, '2027-05-30'); // fin de la semaine en cours
  const ok = run({ ...st, occurrences: { 'D-07': ['2027-05-03', '2027-05-14', '2027-05-21'] } });
  assert.equal(ok['D-07']?.state, 'recurring_ok');
  // Une fois R1 saisie, les périodes s'arrêtent à la fin de la phase active et il n'y a plus d'échéance « en cours ».
  const ended = run({ events: { R0: '2027-05-03', R1: '2027-05-17' }, today: '2027-09-01',
    occurrences: { 'D-07': ['2027-05-05', '2027-05-12'] } });
  assert.equal(ended['D-07']?.periods?.length, 2);
  assert.equal(ended['D-07']?.state, 'recurring_ok');
  assert.equal(ended['D-07']?.due, undefined);
});

test('clôture : RTS 12(2) 4 semaines, 12(4) et 12(5) 10 semaines après R1', () => {
  const r = run({ events: { R1: '2027-07-30' }, today: '2027-08-02' });
  assert.equal(r['D-08']?.due, '2027-08-27');
  assert.equal(r['D-09']?.due, '2027-10-08');
  assert.equal(r['D-10']?.due, '2027-10-08');
});

test('RTS 12(7) et 13(1) : 8 semaines après la notification N2, et non après R1', () => {
  const noN2 = run({ events: { R1: '2027-07-30' } });
  assert.equal(noN2['D-11']?.state, 'waiting_anchor');
  assert.equal(noN2['D-11']?.missingEvent, 'N2');
  const r = run({ events: { R1: '2027-07-30', N2: '2027-11-02' }, today: '2027-11-03' });
  assert.equal(r['D-11']?.due, '2027-12-28');
  assert.equal(r['D-12']?.due, '2027-12-28');
});

test('DORA 26(1) : 3 ans, surchargeable avec justification', () => {
  const r = run({ events: { PREV_TLPT: '2025-03-15' } });
  assert.equal(r['D-13']?.due, '2028-03-15');
  const o = run({ events: { PREV_TLPT: '2025-03-15' },
    overrides: { 'D-13': { offset: { value: 2, unit: 'years' }, justification: 'Fréquence réduite par l\'autorité (courrier du 2026-05-12)' } } });
  assert.equal(o['D-13']?.due, '2027-03-15');
  assert.equal(o['D-13']?.overridden?.justification.startsWith('Fréquence'), true);
});

test('surcharge refusée : délai réglementaire non surchargeable, ou justification vide', () => {
  const r = run({ events: { N0: '2026-10-01' }, overrides: { 'D-01': { due_date: '2027-06-01', justification: 'confort' } } });
  assert.equal(r['D-01']?.due, '2027-01-01');
  assert.equal(r['D-01']?.overrideIgnored, true);
  const e = run({ events: { PREV_TLPT: '2025-03-15' }, overrides: { 'D-13': { due_date: '2030-01-01', justification: '  ' } } });
  assert.equal(e['D-13']?.due, '2028-03-15');
  assert.equal(e['D-13']?.overrideIgnored, true);
});

test('RTS 16(1) : 20 jours ouvrés, seulement si transfrontière, affiché en information', () => {
  const r = run({ events: { HOST_INFORMED: '2026-10-19' }, facts: { cross_border: true } });
  assert.equal(r['D-15']?.state, 'upcoming');
  assert.equal(r['D-15']?.due, '2026-11-16');
  assert.equal(r['D-15']?.display, 'info');
});

test('applicabilité : valeurs par défaut, all / any, fait inconnu', () => {
  const facts = effectiveFacts(core.facts, { testers: 'mixed' });
  assert.equal(facts.pooled, false);
  assert.equal(isApplicable({ any: [{ fact: 'testers', in: ['internal', 'mixed'] }] }, facts), true);
  assert.equal(isApplicable({ all: [{ fact: 'testers', eq: 'external' }] }, facts), false);
  assert.equal(isApplicable({ all: [{ fact: 'inconnu', eq: true }] }, facts), false);
  assert.equal(isApplicable(undefined, facts), true);
});

test('cohérence de la chronologie des événements', () => {
  assert.deepEqual(checkEventOrder(core, { N0: '2026-10-01', INIT_SUBMITTED: '2026-12-15' }), []);
  const issues = checkEventOrder(core, { R0: '2027-05-03', R1: '2027-04-30', N0: '2026-10-01', INIT_SUBMITTED: '2026-09-01' });
  assert.deepEqual(issues.map((i) => `${i.event}<${i.mustFollow}`).sort(), ['INIT_SUBMITTED<N0', 'R1<R0']);
});

test('exercice complet : toutes les échéances calculées, aucune exception', () => {
  const events = {
    PREV_TLPT: '2023-11-20', N0: '2026-10-01', HOST_INFORMED: '2026-10-05', INIT_SUBMITTED: '2026-12-15',
    INIT_VALIDATED: '2027-01-10', CT_VALIDATED: '2027-01-20', PROVIDERS_CONTRACTED: '2027-02-15',
    SSD_SUBMITTED: '2027-03-20', SSD_APPROVED: '2027-04-05', TESTING_START: '2027-04-12', TTIR_APPROVED: '2027-05-20',
    R0: '2027-06-07', R1: '2027-08-30', BT_INFORMED: '2027-08-31', RTTR_SUBMITTED: '2027-09-24',
    BTTR_SUBMITTED: '2027-10-29', REPLAY_PT_DONE: '2027-11-05', N2: '2027-11-19',
  };
  assert.deepEqual(checkEventOrder(core, events), []);
  const r = byId(computeDeadlines(core, { today: '2027-11-22', events, facts: { cross_border: true } }));
  assert.equal(Object.keys(r).length, 14);
  assert.equal(r['D-06']?.state, 'min_met');      // 12 semaines pile
  assert.equal(r['D-08']?.state, 'overdue');      // non marqué fait
  assert.equal(r['D-11']?.due, '2028-01-14');
  assert.equal(r['D-13']?.state, 'overdue');      // dernier TLPT > 3 ans
});
