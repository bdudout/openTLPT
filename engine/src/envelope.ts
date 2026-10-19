// Enveloppe chiffrée du fichier .tlpt (MODELE_DONNEES §2.1, ADR-0003).
// En-tête JSON en clair et authentifié (AAD = JCS de l'en-tête sans `payload`) + base SQLite chiffrée AES-256-GCM.
import { fromBase64, randomBytes, toBase64, utf8 } from './bytes.ts';
import { canonicalize, type JsonValue } from './jcs.ts';
import {
  DEFAULT_ARGON2ID, SALT_BYTES, deriveKeyBytes, kdfParamProblems, passphraseProblems,
  type Argon2idParams, type DeriveFn, type KdfParams,
} from './kdf.ts';

export const MAGIC = 'openTLPT';
export const FORMAT = 1;
const IV_BYTES = 12;

export interface EnvelopeHeader {
  magic: typeof MAGIC;
  format: typeof FORMAT;
  file_version: number;
  kdf: KdfParams;
  cipher: { alg: 'AES-256-GCM'; iv: string };
}
export interface Envelope extends EnvelopeHeader { payload: string }

export type TlptErrorCode =
  | 'not_tlpt'            // pas un fichier openTLPT
  | 'unsupported_format'  // version de format inconnue
  | 'bad_params'          // en-tête invalide ou paramètres hors bornes
  | 'decrypt_failed'      // mauvaise passphrase OU fichier altéré (volontairement indistinguables)
  | 'weak_passphrase'
  | 'file_conflict';      // le fichier sur disque a changé depuis l'ouverture (DEC-1)

export class TlptError extends Error {
  readonly code: TlptErrorCode;
  readonly details: string[];
  constructor(code: TlptErrorCode, message: string, details: string[] = []) {
    super(message);
    this.name = 'TlptError';
    this.code = code;
    this.details = details;
  }
}

/** Session ouverte : la clé (non extractible) et les paramètres KDF restent en mémoire ; jamais la passphrase. */
export interface Session {
  readonly key: CryptoKey;
  readonly kdf: KdfParams;
  /** Version du fichier telle que lue ou dernièrement écrite. */
  fileVersion: number;
}

export interface CryptoOptions {
  derive?: DeriveFn;
  /** Paramètres Argon2id pour une nouvelle clé (défaut : ADR-0003). */
  argon2?: Omit<Argon2idParams, 'alg' | 'salt'>;
}

const ENVELOPE_KEYS = ['magic', 'format', 'file_version', 'kdf', 'cipher', 'payload'];

/** Analyse et valide un texte d'enveloppe, sans déchiffrer. */
export function parseEnvelope(text: string): Envelope {
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { throw new TlptError('not_tlpt', 'Fichier illisible : ce n\'est pas un fichier openTLPT.'); }
  if (!obj || typeof obj !== 'object' || (obj as Record<string, unknown>).magic !== MAGIC) {
    throw new TlptError('not_tlpt', 'Ce n\'est pas un fichier openTLPT.');
  }
  const e = obj as Record<string, unknown>;
  if (e.format !== FORMAT) throw new TlptError('unsupported_format', `Format ${String(e.format)} non supporté par cette version d'openTLPT.`);
  const problems: string[] = [];
  if (Object.keys(e).some((k) => !ENVELOPE_KEYS.includes(k))) problems.push('champ inconnu dans l\'en-tête');
  if (!Number.isInteger(e.file_version) || (e.file_version as number) < 0) problems.push('file_version invalide');
  problems.push(...kdfParamProblems(e.kdf));
  const c = e.cipher as Record<string, unknown> | undefined;
  if (!c || c.alg !== 'AES-256-GCM' || typeof c.iv !== 'string' || Object.keys(c).length !== 2) problems.push('cipher invalide');
  else {
    try { if (fromBase64(c.iv).length !== IV_BYTES) problems.push('IV invalide'); } catch { problems.push('IV invalide'); }
  }
  if (typeof e.payload !== 'string' || e.payload.length === 0) problems.push('payload absent');
  if (problems.length) throw new TlptError('bad_params', 'En-tête du fichier invalide.', problems);
  return e as unknown as Envelope;
}

/** Lecture du compteur de version sans déchiffrer (contrôle d'écriture concurrente, DEC-1). */
export function readFileVersion(text: string): number {
  return parseEnvelope(text).file_version;
}

function aad(header: EnvelopeHeader): Uint8Array<ArrayBuffer> {
  return utf8(canonicalize(header as unknown as JsonValue)) as Uint8Array<ArrayBuffer>;
}

async function importKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as Uint8Array<ArrayBuffer>, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Nouvelle clé Argon2id avec un sel neuf : création d'un exercice ou changement de passphrase. */
export async function createSession(passphrase: string, opts: CryptoOptions = {}): Promise<Session> {
  const problems = passphraseProblems(passphrase);
  if (problems.length) throw new TlptError('weak_passphrase', 'Passphrase trop faible.', problems);
  const kdf: Argon2idParams = { alg: 'argon2id', ...(opts.argon2 ?? DEFAULT_ARGON2ID), salt: toBase64(randomBytes(SALT_BYTES)) };
  const kp = kdfParamProblems(kdf);
  if (kp.length) throw new TlptError('bad_params', 'Paramètres Argon2id refusés.', kp);
  const key = await importKey(await (opts.derive ?? deriveKeyBytes)(passphrase, kdf));
  return { key, kdf, fileVersion: 0 };
}

/** Chiffre la base avec la clé de session : IV neuf, version incrémentée, aucune nouvelle dérivation. */
export async function seal(session: Session, dbBytes: Uint8Array): Promise<string> {
  const header: EnvelopeHeader = {
    magic: MAGIC, format: FORMAT, file_version: session.fileVersion + 1, kdf: session.kdf,
    cipher: { alg: 'AES-256-GCM', iv: toBase64(randomBytes(IV_BYTES)) },
  };
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: fromBase64(header.cipher.iv) as Uint8Array<ArrayBuffer>, additionalData: aad(header) },
    session.key, dbBytes as Uint8Array<ArrayBuffer>);
  session.fileVersion = header.file_version;
  return JSON.stringify({ ...header, payload: toBase64(new Uint8Array(ct)) });
}

export interface Opened {
  dbBytes: Uint8Array;
  session: Session;
  /** Le fichier utilisait PBKDF2 : la session a été rekeyée en Argon2id, et le prochain enregistrement l'écrira ainsi. */
  kdfUpgraded: boolean;
}

/** Déchiffre un fichier .tlpt. Une seule dérivation Argon2id par ouverture (ADR-0003). */
export async function openEnvelope(text: string, passphrase: string, opts: CryptoOptions = {}): Promise<Opened> {
  const env = parseEnvelope(text);
  const { payload, ...header } = env;
  const derive = opts.derive ?? deriveKeyBytes;
  const key = await importKey(await derive(passphrase, header.kdf));
  let pt: ArrayBuffer;
  try {
    pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(header.cipher.iv) as Uint8Array<ArrayBuffer>, additionalData: aad(header) },
      key, fromBase64(payload) as Uint8Array<ArrayBuffer>);
  } catch {
    throw new TlptError('decrypt_failed', 'Impossible d\'ouvrir le fichier : passphrase incorrecte ou fichier altéré.');
  }
  if (header.kdf.alg === 'argon2id') {
    return { dbBytes: new Uint8Array(pt), session: { key, kdf: header.kdf, fileVersion: header.file_version }, kdfUpgraded: false };
  }
  const upgraded = await createSessionUnchecked(passphrase, opts);
  upgraded.fileVersion = header.file_version;
  return { dbBytes: new Uint8Array(pt), session: upgraded, kdfUpgraded: true };
}

// Rekey sans contrôle de politique : un ancien fichier dont la passphrase est plus courte doit rester ouvrable.
async function createSessionUnchecked(passphrase: string, opts: CryptoOptions): Promise<Session> {
  const kdf: Argon2idParams = { alg: 'argon2id', ...(opts.argon2 ?? DEFAULT_ARGON2ID), salt: toBase64(randomBytes(SALT_BYTES)) };
  const key = await importKey(await (opts.derive ?? deriveKeyBytes)(passphrase, kdf));
  return { key, kdf, fileVersion: 0 };
}

/** Changement de passphrase : sel et clé neufs ; la version continue de croître. */
export async function changePassphrase(session: Session, newPassphrase: string, opts: CryptoOptions = {}): Promise<Session> {
  const next = await createSession(newPassphrase, opts);
  next.fileVersion = session.fileVersion;
  return next;
}

/** DEC-1 : refuse d'écraser un fichier modifié sur disque depuis l'ouverture ou le dernier enregistrement. */
export function assertNoConflict(diskText: string | null, session: Session): void {
  if (diskText === null) return; // nouveau fichier
  const onDisk = readFileVersion(diskText);
  if (onDisk !== session.fileVersion) {
    throw new TlptError('file_conflict',
      `Le fichier a été modifié ailleurs (version ${onDisk} sur disque, ${session.fileVersion} chargée). Rechargez-le ou enregistrez sous un autre nom.`);
  }
}
