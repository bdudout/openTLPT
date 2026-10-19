// Journal append-only chaîné par SHA-256 (EF-6, MODELE_DONNEES §2.3).
// hash = SHA-256( JCS({seq, ts, session_id, author, action, entity, entity_id, before, after, prev_hash}) )
import { sha256Hex } from './bytes.ts';
import { canonicalize, type JsonValue } from './jcs.ts';
import type { SqlDb } from './db.ts';

export const GENESIS_HASH = '0'.repeat(64);

export type JournalAction =
  | 'create' | 'update' | 'delete' | 'session_open' | 'export' | 'anchor' | 'integrity_check' | 'ref_upgrade' | 'file_conflict';

export interface JournalInput {
  ts: string;
  session_id: string;
  author: string;
  action: JournalAction;
  entity: string | null;
  entity_id: string | null;
  before: JsonValue;
  after: JsonValue;
}

export interface JournalEntry extends JournalInput { seq: number; prev_hash: string; hash: string }

type HashedFields = Omit<JournalEntry, 'hash'>;

export async function entryHash(e: HashedFields): Promise<string> {
  return sha256Hex(canonicalize({
    seq: e.seq, ts: e.ts, session_id: e.session_id, author: e.author, action: e.action,
    entity: e.entity, entity_id: e.entity_id, before: e.before, after: e.after, prev_hash: e.prev_hash,
  }));
}

export function journalHead(db: SqlDb): { seq: number; hash: string } {
  const row = db.get<{ seq: number; hash: string }>('SELECT seq, hash FROM journal ORDER BY seq DESC LIMIT 1');
  return row ?? { seq: 0, hash: GENESIS_HASH };
}

/** Prépare l'entrée suivante (asynchrone : hachage). À insérer avec `insertEntry` sans écriture intercalée. */
export async function prepareEntry(db: SqlDb, input: JournalInput): Promise<JournalEntry> {
  const head = journalHead(db);
  const fields: HashedFields = { ...input, seq: head.seq + 1, prev_hash: head.hash };
  return { ...fields, hash: await entryHash(fields) };
}

/** Insertion synchrone (utilisable dans une transaction). Les déclencheurs vérifient seq et prev_hash. */
export function insertEntry(db: SqlDb, e: JournalEntry): void {
  db.exec('INSERT INTO journal (seq, ts, session_id, author, action, entity, entity_id, before, after, prev_hash, hash) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [
    e.seq, e.ts, e.session_id, e.author, e.action, e.entity, e.entity_id,
    e.before === null ? null : canonicalize(e.before), e.after === null ? null : canonicalize(e.after),
    e.prev_hash, e.hash,
  ]);
}

export type ChainCheck =
  | { ok: true; length: number; head: string }
  | { ok: false; brokenAt: number; reason: 'seq' | 'prev_hash' | 'hash'; length: number };

interface JournalRow {
  [k: string]: string | number | null;
  seq: number; ts: string; session_id: string; author: string; action: string;
  entity: string | null; entity_id: string | null; before: string | null; after: string | null;
  prev_hash: string; hash: string;
}

/** Recalcule toute la chaîne. La première rupture est signalée par son seq. */
export async function verifyChain(db: SqlDb): Promise<ChainCheck> {
  const rows = db.all<JournalRow>('SELECT * FROM journal ORDER BY seq');
  let prev = GENESIS_HASH;
  let expectedSeq = 1;
  for (const r of rows) {
    if (r.seq !== expectedSeq) return { ok: false, brokenAt: expectedSeq, reason: 'seq', length: rows.length };
    if (r.prev_hash !== prev) return { ok: false, brokenAt: r.seq, reason: 'prev_hash', length: rows.length };
    const computed = await entryHash({
      seq: r.seq, ts: r.ts, session_id: r.session_id, author: r.author, action: r.action as JournalAction,
      entity: r.entity, entity_id: r.entity_id,
      before: r.before === null ? null : (JSON.parse(r.before) as JsonValue),
      after: r.after === null ? null : (JSON.parse(r.after) as JsonValue),
      prev_hash: r.prev_hash,
    });
    if (computed !== r.hash) return { ok: false, brokenAt: r.seq, reason: 'hash', length: rows.length };
    prev = r.hash;
    expectedSeq++;
  }
  return { ok: true, length: rows.length, head: prev };
}

/** Ancrage externe : à recopier dans un PV ou un mail. */
export interface Anchor { codename: string; seq: number; hash: string; ts: string }

export function verifyAnchor(db: SqlDb, a: Anchor): boolean {
  const row = db.get<{ hash: string }>('SELECT hash FROM journal WHERE seq = ?', [a.seq]);
  return row?.hash === a.hash;
}
