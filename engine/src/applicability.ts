// Évaluation déclarative des conditions `applies_when` (MODELE_DONNEES §1.4) : pas de code arbitraire.
import type { Condition, FactDef, FactTest, FactValue } from './types.ts';

export type Facts = Partial<Record<string, FactValue>>;

/** Faits effectifs : valeurs saisies, complétées par les valeurs par défaut du référentiel. */
export function effectiveFacts(defs: FactDef[], given: Facts = {}): Facts {
  const out: Facts = {};
  for (const def of defs) {
    const v = given[def.id] ?? def.default;
    if (v !== undefined) out[def.id] = v;
  }
  for (const [k, v] of Object.entries(given)) {
    if (!(k in out) && v !== undefined) out[k] = v;
  }
  return out;
}

function testFact(test: FactTest, facts: Facts): boolean {
  const value = facts[test.fact];
  if (value === undefined) return false;
  if (test.eq !== undefined) return value === test.eq;
  if (test.in !== undefined) return test.in.includes(value);
  return false;
}

/** Une condition absente vaut « toujours applicable ». Un fait inconnu rend le test faux. */
export function isApplicable(cond: Condition | undefined, facts: Facts): boolean {
  if (!cond) return true;
  if ('all' in cond) return cond.all.every((t) => testFact(t, facts));
  return cond.any.some((t) => testFact(t, facts));
}
