// Calcul des échéances (MODELE_DONNEES §1.5). Fonctions pures : aucune horloge, aucune E/S.
// Rien n'est stocké : on recalcule à partir du référentiel et de l'état de l'exercice (§2.4).
import { addDays, addOffset, diffDays } from './dates.ts';
import { effectiveFacts, isApplicable, type Facts } from './applicability.ts';
import type {
  CoreRef, DeadlineDef, DeadlineResult, EventOrderIssue, ExerciseState, ISODate, Offset, Period,
} from './types.ts';

export interface ComputeOptions {
  /** Fenêtre d'alerte « échéance proche », en jours calendaires (défaut : 14). */
  warnDays?: number;
}

function stateFromDue(due: ISODate, today: ISODate, warnDays: number): Pick<DeadlineResult, 'state' | 'daysLeft'> {
  const daysLeft = diffDays(today, due);
  if (daysLeft < 0) return { state: 'overdue', daysLeft };
  return { state: daysLeft <= warnDays ? 'due_soon' : 'upcoming', daysLeft };
}

function requireOffset(def: DeadlineDef, key: 'offset' | 'every'): Offset {
  const o = def[key];
  if (!o) throw new Error(`${def.id} : '${key}' manquant pour kind=${def.kind}`);
  return o;
}

/** Une surcharge n'est prise en compte que si le délai est surchargeable et la justification non vide. */
function usableOverride(def: DeadlineDef, st: ExerciseState) {
  const o = st.overrides?.[def.id];
  if (!o) return { override: undefined, ignored: false };
  if (!def.overridable || !o.justification.trim()) return { override: undefined, ignored: true };
  return { override: o, ignored: false };
}

export function computeDeadline(
  def: DeadlineDef, st: ExerciseState, facts: Facts, opts: ComputeOptions = {},
): DeadlineResult {
  const warnDays = opts.warnDays ?? 14;
  const base: DeadlineResult = { id: def.id, kind: def.kind, state: 'not_applicable', display: def.display ?? 'check' };
  if (!isApplicable(def.applies_when, facts)) return base;

  const { override, ignored } = usableOverride(def, st);
  const res: DeadlineResult = { ...base };
  if (override) res.overridden = { justification: override.justification };
  if (ignored) res.overrideIgnored = true;

  // Ancre : date réelle, sinon date prévue (échéance prévisionnelle). Le récurrent ne se prévoit pas.
  const actual = st.events[def.anchor];
  const planned = def.kind === 'recurring' ? undefined : st.planned?.[def.anchor];
  const anchor = actual ?? planned;
  if (!actual && planned) res.forecast = true;
  const doneOn = st.done?.[def.id];
  if (doneOn) res.doneOn = doneOn;

  switch (def.kind) {
    case 'max': {
      if (!anchor && !override?.due_date) return { ...res, state: 'waiting_anchor', missingEvent: def.anchor };
      const due = override?.due_date ?? addOffset(anchor as ISODate, override?.offset ?? requireOffset(def, 'offset'));
      res.due = due;
      if (doneOn) return { ...res, state: diffDays(doneOn, due) >= 0 ? 'done_on_time' : 'done_late', daysLeft: diffDays(st.today, due) };
      return { ...res, ...stateFromDue(due, st.today, warnDays) };
    }

    case 'before': {
      // « à faire avant l'événement X » : tant que X n'est ni passé ni planifié, l'action reste à venir, sans date.
      if (!anchor) return doneOn ? { ...res, state: 'done_on_time' } : { ...res, state: 'upcoming', missingEvent: def.anchor };
      res.due = anchor;
      if (doneOn) return { ...res, state: diffDays(doneOn, anchor) >= 0 ? 'done_on_time' : 'done_late', daysLeft: diffDays(st.today, anchor) };
      return { ...res, ...stateFromDue(anchor, st.today, warnDays) };
    }

    case 'min': {
      if (!anchor) return { ...res, state: 'waiting_anchor', missingEvent: def.anchor };
      const earliestEnd = addOffset(anchor, override?.offset ?? requireOffset(def, 'offset'));
      res.due = earliestEnd;
      const endEvent = def.end_event;
      if (!endEvent) throw new Error(`${def.id} : 'end_event' manquant pour kind=min`);
      const end = st.events[endEvent];
      if (end) return { ...res, state: diffDays(earliestEnd, end) >= 0 ? 'min_met' : 'min_violated', daysLeft: diffDays(end, earliestEnd) };
      const plannedEnd = st.planned?.[endEvent];
      if (plannedEnd && diffDays(earliestEnd, plannedEnd) < 0) res.planShort = true;
      return { ...res, state: actual ? 'running' : 'upcoming', daysLeft: diffDays(st.today, earliestEnd) };
    }

    case 'recurring': {
      if (!anchor) return { ...res, state: 'waiting_anchor', missingEvent: def.anchor };
      const every = requireOffset(def, 'every');
      const until = def.until ? st.events[def.until] : undefined;
      const limit = until ?? st.today;
      const occ = (st.occurrences?.[def.id] ?? []).slice().sort();
      const periods: Period[] = [];
      let start = anchor;
      // Les périodes entièrement écoulées doivent être couvertes ; la période en cours donne la prochaine échéance.
      for (let guard = 0; guard < 10_000; guard++) {
        const next = addOffset(start, every);
        const end = addDays(next, -1);
        if (diffDays(end, limit) < 0) {
          if (!until) {
            res.due = end;
            res.daysLeft = diffDays(st.today, end);
          }
          break;
        }
        periods.push({ start, end, covered: occ.some((d) => diffDays(start, d) >= 0 && diffDays(d, end) >= 0) });
        start = next;
      }
      res.periods = periods;
      return { ...res, state: periods.every((p) => p.covered) ? 'recurring_ok' : 'recurring_missing' };
    }
  }
}

/** Calcule toutes les échéances du référentiel, dans l'ordre du pack core. */
export function computeDeadlines(core: CoreRef, st: ExerciseState, opts: ComputeOptions = {}): DeadlineResult[] {
  const facts = effectiveFacts(core.facts, st.facts);
  return core.deadlines.map((d) => computeDeadline(d, st, facts, opts));
}

/** Contrôle de cohérence : un événement daté ne peut pas précéder un événement qu'il doit suivre (`after`). */
export function checkEventOrder(core: CoreRef, events: ExerciseState['events']): EventOrderIssue[] {
  const issues: EventOrderIssue[] = [];
  for (const ev of core.events) {
    const date = events[ev.id];
    if (!date) continue;
    for (const prev of ev.after ?? []) {
      const otherDate = events[prev];
      if (otherDate && diffDays(otherDate, date) < 0) issues.push({ event: ev.id, date, mustFollow: prev, otherDate });
    }
  }
  return issues;
}
