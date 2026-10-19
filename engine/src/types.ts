// Types du référentiel (sous-ensemble utile au moteur) — cf. referentiel/schema/pack.schema.json.

/** Date calendaire ISO 8601 `YYYY-MM-DD`, sans heure ni fuseau. */
export type ISODate = string;

export type OffsetUnit = 'days' | 'weeks' | 'months' | 'working_days' | 'years';
export interface Offset { value: number; unit: OffsetUnit }

export type FactValue = boolean | string | number;

export interface FactTest { fact: string; eq?: FactValue; in?: FactValue[] }
export type Condition = { all: FactTest[] } | { any: FactTest[] };

export interface FactDef {
  id: string;
  type: 'boolean' | 'enum' | 'integer';
  values?: string[];
  default?: FactValue;
}

export interface EventDef { id: string; phase: string; after?: string[] }

export type DeadlineKind = 'max' | 'min' | 'before' | 'recurring';

export interface DeadlineDef {
  id: string;
  anchor: string;
  kind: DeadlineKind;
  offset?: Offset;
  every?: Offset;
  until?: string;
  end_event?: string;
  carriers: string[];
  target?: { deliverable?: string; milestone?: Record<string, string> };
  overridable?: boolean;
  display?: 'check' | 'info';
  applies_when?: Condition;
  sources: string[];
  label: Record<string, string>;
}

/** Ce dont le moteur a besoin du pack core. */
export interface CoreRef {
  facts: FactDef[];
  events: EventDef[];
  deadlines: DeadlineDef[];
}

// ---------------------------------------------------------------------------
// Données de l'exercice (issues de la base .tlpt)

export interface DeadlineOverride {
  /** Échéance imposée (ex. date fixée par l'autorité). */
  due_date?: ISODate;
  /** Ou délai modifié (ex. fréquence TLPT modulée). */
  offset?: Offset;
  justification: string;
}

export interface ExerciseState {
  /** Date du jour (injectée : le moteur n'appelle jamais l'horloge). */
  today: ISODate;
  /** Dates des événements saisis (event_dates). */
  events: Partial<Record<string, ISODate>>;
  /** Faits d'applicabilité saisis (facts) ; les absents prennent leur valeur par défaut. */
  facts?: Partial<Record<string, FactValue>>;
  /** Surcharges justifiées (deadline_overrides). */
  overrides?: Partial<Record<string, DeadlineOverride>>;
  /** Date de réalisation d'une échéance (deadline_status.done_date). */
  done?: Partial<Record<string, ISODate>>;
  /** Pour les échéances récurrentes : dates des réalisations (ex. rapports hebdomadaires). */
  occurrences?: Partial<Record<string, ISODate[]>>;
}

// ---------------------------------------------------------------------------
// Résultats

export type DeadlineState =
  | 'not_applicable'   // conditions d'applicabilité non remplies
  | 'waiting_anchor'   // l'événement de départ n'est pas encore saisi
  | 'upcoming'         // échéance future, hors fenêtre d'alerte
  | 'due_soon'         // échéance dans la fenêtre d'alerte
  | 'overdue'          // échéance dépassée, non réalisée
  | 'done_on_time'
  | 'done_late'
  | 'running'          // durée minimale en cours (fin non saisie)
  | 'min_met'          // durée minimale respectée
  | 'min_violated'     // fin saisie avant la durée minimale
  | 'recurring_ok'
  | 'recurring_missing';

export interface Period { start: ISODate; end: ISODate; covered: boolean }

export interface DeadlineResult {
  id: string;
  kind: DeadlineKind;
  state: DeadlineState;
  display: 'check' | 'info';
  /** Échéance calculée (max/before), ou date de fin au plus tôt (min). */
  due?: ISODate;
  /** Jours restants jusqu'à `due` (négatif si dépassé). */
  daysLeft?: number;
  doneOn?: ISODate;
  /** Événement manquant quand state = waiting_anchor. */
  missingEvent?: string;
  overridden?: { justification: string };
  /** Surcharge présente mais refusée (délai non surchargeable ou justification vide). */
  overrideIgnored?: boolean;
  /** Récurrent : périodes écoulées et leur couverture. */
  periods?: Period[];
}

export interface EventOrderIssue { event: string; date: ISODate; mustFollow: string; otherDate: ISODate }
