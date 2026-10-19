// Dérivation de clé (ADR-0003). Argon2id pour l'écriture ; PBKDF2-SHA256 accepté en lecture seulement.
import { argon2id } from 'hash-wasm';
import { fromBase64, utf8 } from './bytes.ts';

export interface Argon2idParams { alg: 'argon2id'; m_kib: number; t: number; p: number; salt: string }
export interface Pbkdf2Params { alg: 'pbkdf2-sha256'; iterations: number; salt: string }
export type KdfParams = Argon2idParams | Pbkdf2Params;

/** Paramètres par défaut d'écriture (ADR-0003). */
export const DEFAULT_ARGON2ID = { m_kib: 65_536, t: 3, p: 1 } as const;
/** Plancher OWASP, refusé en dessous ; plafonds contre les fichiers piégés (DoS mémoire / CPU). */
export const ARGON2ID_BOUNDS = { m_kib: [19_456, 1_048_576], t: [2, 20], p: [1, 4] } as const;
export const PBKDF2_BOUNDS = { iterations: [600_000, 10_000_000] } as const;
export const SALT_BYTES = 16;

const inRange = (v: unknown, [lo, hi]: readonly [number, number]) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** Retourne la liste des problèmes (vide si les paramètres sont acceptables). */
export function kdfParamProblems(k: unknown): string[] {
  if (!k || typeof k !== 'object') return ['kdf absent'];
  const p = k as Record<string, unknown>;
  const problems: string[] = [];
  let salt: Uint8Array | undefined;
  try { salt = typeof p.salt === 'string' ? fromBase64(p.salt) : undefined; } catch { salt = undefined; }
  if (!salt || salt.length < SALT_BYTES) problems.push(`sel absent ou < ${SALT_BYTES} octets`);
  if (p.alg === 'argon2id') {
    const allowed = new Set(['alg', 'm_kib', 't', 'p', 'salt']);
    if (Object.keys(p).some((x) => !allowed.has(x))) problems.push('champ kdf inconnu');
    if (!inRange(p.m_kib, ARGON2ID_BOUNDS.m_kib)) problems.push('m_kib hors bornes');
    if (!inRange(p.t, ARGON2ID_BOUNDS.t)) problems.push('t hors bornes');
    if (!inRange(p.p, ARGON2ID_BOUNDS.p)) problems.push('p hors bornes');
  } else if (p.alg === 'pbkdf2-sha256') {
    const allowed = new Set(['alg', 'iterations', 'salt']);
    if (Object.keys(p).some((x) => !allowed.has(x))) problems.push('champ kdf inconnu');
    if (!inRange(p.iterations, PBKDF2_BOUNDS.iterations)) problems.push('iterations hors bornes');
  } else {
    problems.push(`algorithme kdf non supporté : ${String(p.alg)}`);
  }
  return problems;
}

/** Fonction de dérivation injectable (tests, instrumentation). Renvoie 32 octets. */
export type DeriveFn = (passphrase: string, params: KdfParams) => Promise<Uint8Array>;

export const deriveKeyBytes: DeriveFn = async (passphrase, params) => {
  const salt = fromBase64(params.salt);
  if (params.alg === 'argon2id') {
    return argon2id({ password: passphrase, salt, parallelism: params.p, iterations: params.t,
      memorySize: params.m_kib, hashLength: 32, outputType: 'binary' });
  }
  const base = await crypto.subtle.importKey('raw', utf8(passphrase) as Uint8Array<ArrayBuffer>, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as Uint8Array<ArrayBuffer>, iterations: params.iterations }, base, 256);
  return new Uint8Array(bits);
};

/** Politique de passphrase à la création et au changement (ADR-0003) : 14 caractères au moins. */
export const MIN_PASSPHRASE_LENGTH = 14;
export function passphraseProblems(p: string): string[] {
  const problems: string[] = [];
  if ([...p].length < MIN_PASSPHRASE_LENGTH) problems.push(`au moins ${MIN_PASSPHRASE_LENGTH} caractères`);
  if (p.trim() !== p) problems.push('pas d\'espace en début ou fin');
  return problems;
}
