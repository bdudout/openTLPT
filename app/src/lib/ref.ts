// Référentiel embarqué (DEC-2) : pack core typé pour l'interface.
import coreJson from '../../../referentiel/packs/core.json';
import doraRtsJson from '../../../referentiel/packs/dora-rts.json';
import tiberEuJson from '../../../referentiel/packs/tiber-eu.json';
import tiberFrJson from '../../../referentiel/packs/tiber-fr.json';
import type { CoreRef, DeadlineDef, EventDef, FactDef, ItemDef, PackDef } from '../../../engine/src/index.ts';

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

/** Packs d'items (obligations puis bonnes pratiques), dans l'ordre d'affichage. */
export const packs = [doraRtsJson, tiberEuJson, tiberFrJson] as unknown as PackDef[];

/** Version du référentiel embarqué (ENF-9) : versions de tous les packs. */
export const REF_VERSION = [core as unknown as PackDef, ...packs].map((p) => `${p.pack_id}@${p.version}`).join('+');

export const itemsById: Record<string, ItemDef> = Object.fromEntries(packs.flatMap((p) => p.items ?? []).map((i) => [i.id, i]));
export const TOOL_VERSION = '0.1.0';

const index = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map((x) => [x.id, x])) as Record<string, T>;
export const actorsById = index(core.actors);
export const eventsById = index(core.events);
export const phasesById = index(core.phases);
export const deliverablesById = index(core.deliverables);
export const phasesOrdered = [...core.phases].sort((a, b) => a.order - b.order);
