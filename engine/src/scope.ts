// Portée par profil (revue des parcours, piste 1) : une échéance ou un jalon ne « concerne » un profil que si l'un
// de ses porteurs relève de ce profil. Les autres restent visibles en information, sans retard ni action.
import { computeDeadlines } from './deadlines.ts';
import { expandProfile, type ProfileDef } from './checklist.ts';
import type { CoreRef, DeadlineDef, DeadlineResult, EventDef, ExerciseState } from './types.ts';

/** Profil de rattachement de chaque acteur. Les autorités sont externes : elles ne relèvent d'aucun profil. */
export const ACTOR_PROFILE: Record<string, string | null> = {
  FE: 'entity', CT: 'entity', CTL: 'entity', MB: 'entity', BT: 'entity', ICT_TPP: 'entity',
  TIP: 'ti', RTT: 'rt',
  TLPT_AUTH: null, TM: null, CA: null,
};

export const AUTHORITY_ACTORS = new Set(['TLPT_AUTH', 'TM', 'CA']);

export function actorsConcern(actors: string[], visible: Set<string>): boolean {
  return actors.some((a) => { const p = ACTOR_PROFILE[a]; return !!p && visible.has(p); });
}

/**
 * L'échéance concerne-t-elle le profil ?
 * - Entité : toutes, sauf celles portées par la seule autorité — elle reste pleinement responsable de la conformité
 *   du TLPT, y compris des livrables des prestataires (DORA 26(3)), que le control team reçoit et relance.
 * - Prestataires : seulement celles dont ils sont porteurs.
 */
export function deadlineConcerns(def: DeadlineDef, visible: Set<string>): boolean {
  if (visible.has('entity')) return !def.carriers.every((a) => AUTHORITY_ACTORS.has(a));
  return actorsConcern(def.carriers, visible);
}

/** Échéances du profil : celles des autres acteurs passent en `display: 'info'` (jamais « en retard » pour lui). */
export function computeDeadlinesForProfile(core: CoreRef, st: ExerciseState, profiles: ProfileDef[], profile: string): DeadlineResult[] {
  const visible = expandProfile(profiles, profile);
  const defs = new Map(core.deadlines.map((d) => [d.id, d]));
  return computeDeadlines(core, st).map((r) => {
    const def = defs.get(r.id);
    return def && r.display === 'check' && !deadlineConcerns(def, visible) ? { ...r, display: 'info', otherActor: true } : r;
  });
}

export interface EventScope {
  /** Le profil agit sur cet événement (il le produit). */
  own: boolean;
  /** Événement produit par l'autorité (validation, approbation, notification) : à obtenir, pas à réaliser. */
  byAuthority: boolean;
  /** Le profil doit le suivre (il le produit, ou il ouvre une échéance qui le concerne). */
  relevant: boolean;
}

export function eventScope(ev: EventDef & { set_by?: string[] }, deadlines: DeadlineDef[], visible: Set<string>): EventScope {
  const setBy = ev.set_by ?? [];
  const own = actorsConcern(setBy, visible);
  const byAuthority = setBy.length > 0 && setBy.every((a) => AUTHORITY_ACTORS.has(a));
  const anchors = deadlines.some((d) => [d.anchor, d.end_event, d.until].includes(ev.id) && deadlineConcerns(d, visible));
  // L'entité pilote l'ensemble du déroulé : elle suit tous les jalons, y compris les validations de l'autorité.
  const relevant = visible.has('entity') || own || anchors;
  return { own, byAuthority, relevant };
}
