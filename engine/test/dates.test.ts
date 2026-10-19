import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, addMonths, addOffset, addWorkingDays, addYears, diffDays, isValidISODate, isWorkingDay, toDayNumber,
} from '../src/dates.ts';

test('dates invalides ou inexistantes rejetées', () => {
  assert.throws(() => toDayNumber('2026-02-30'));
  assert.throws(() => toDayNumber('2026-13-01'));
  assert.throws(() => toDayNumber('19/10/2026'));
  assert.equal(isValidISODate('2028-02-29'), true);
  assert.equal(isValidISODate('2027-02-29'), false);
});

test('jours et semaines, y compris à travers le changement d\'heure', () => {
  assert.equal(addDays('2026-10-24', 2), '2026-10-26'); // passage à l'heure d'hiver le 25/10/2026
  assert.equal(addDays('2027-03-27', 2), '2027-03-29'); // passage à l'heure d'été le 28/03/2027
  assert.equal(addOffset('2026-12-28', { value: 1, unit: 'weeks' }), '2027-01-04');
  assert.equal(diffDays('2026-01-01', '2027-01-01'), 365);
  assert.equal(diffDays('2028-01-01', '2029-01-01'), 366);
});

test('mois : quantième conservé, ramené en fin de mois si besoin', () => {
  assert.equal(addMonths('2026-10-01', 3), '2027-01-01');
  assert.equal(addMonths('2026-08-31', 6), '2027-02-28');
  assert.equal(addMonths('2027-08-31', 6), '2028-02-29'); // année bissextile
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-03-31', -1), '2026-02-28');
  assert.equal(addMonths('2026-11-15', 2), '2027-01-15');
});

test('années : 29 février ramené au 28', () => {
  assert.equal(addYears('2028-02-29', 3), '2031-02-28');
  assert.equal(addYears('2028-02-29', 4), '2032-02-29');
  assert.equal(addYears('2026-07-08', 3), '2029-07-08');
});

test('jours ouvrés (lundi-vendredi), date de départ non comptée', () => {
  assert.equal(isWorkingDay('2026-10-17'), false); // samedi
  assert.equal(isWorkingDay('2026-10-19'), true);  // lundi
  assert.equal(addWorkingDays('2026-10-16', 1), '2026-10-19'); // vendredi + 1 = lundi
  assert.equal(addWorkingDays('2026-10-17', 1), '2026-10-19'); // samedi + 1 = lundi
  assert.equal(addWorkingDays('2026-10-19', 20), '2026-11-16'); // 4 semaines pleines
  assert.equal(addWorkingDays('2026-10-19', 0), '2026-10-19');
  assert.throws(() => addWorkingDays('2026-10-19', -1));
});
