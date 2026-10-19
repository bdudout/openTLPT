// Référentiel embarqué (DEC-2) : pack core typé pour l'interface.
import coreJson from '../../../referentiel/packs/core.json';
import type { CoreRef, DeadlineDef, EventDef, FactDef } from '../../../engine/src/index.ts';

export type Localized = Record<string, string>;

export interface Labeled { id: string; label: Localized }
export interface PhaseDef extends Labeled { order: number }
export interface UiEventDef extends EventDef, Labeled { set_by: string[] }
export interface UiFactDef extends FactDef, Labeled { help?: Localized }
export interface ProfileDef extends Labeled { includes?: string[]; description?: Localized }
export interface DeliverableDef extends Labeled { phase: string }
export interface UiDeadlineDef extends DeadlineDef { note?: Localized }

interface CorePack extends CoreRef {
  version: string;
  profiles: ProfileDef[];
  actors: Labeled[];
  phases: PhaseDef[];
  events: UiEventDef[];
  facts: UiFactDef[];
  deliverables: DeliverableDef[];
  deadlines: UiDeadlineDef[];
}

export const core = coreJson as unknown as CorePack;

/** Version du référentiel embarqué (ENF-9). Calcul global au build à venir ; v1 = version du pack core. */
export const REF_VERSION = `core-${core.version}`;
export const TOOL_VERSION = '0.1.0';

const index = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map((x) => [x.id, x])) as Record<string, T>;
export const actorsById = index(core.actors);
export const eventsById = index(core.events);
export const phasesById = index(core.phases);
export const deliverablesById = index(core.deliverables);
export const phasesOrdered = [...core.phases].sort((a, b) => a.order - b.order);
