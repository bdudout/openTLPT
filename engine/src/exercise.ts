// Base d'exercice : création, ouverture, mutations journalisées, chargement de l'état pour le calcul des échéances.
// Règle (MODELE_DONNEES §2.2) : toute écriture métier passe par `#write`, qui écrit la ligne ET l'entrée de journal
// dans la même transaction. Les écritures sont sérialisées (file d'attente) pour garder la chaîne contiguë.
import { canonicalize, type JsonValue } from './jcs.ts';
import { insertEntry, journalHead, prepareEntry, verifyChain, type Anchor, type ChainCheck, type JournalAction } from './journal.ts';
import { isValidISODate } from './dates.ts';
import type { ChecklistStatus, Response } from './checklist.ts';
import type { Row, SqlDb, SqlDbFactory, SqlValue } from './db.ts';
import type { DeadlineOverride, ExerciseState, FactValue, ISODate, OffsetUnit } from './types.ts';

export const SCHEMA_VERSION = '1';
export const PROFILES = ['entity', 'ti', 'rt', 'ti_rt'] as const;
export type Profile = (typeof PROFILES)[number];

/** Tables à clé unique modifiables par le moteur, et leur clé primaire. */
const KEYED_TABLES = {
  meta: 'key',
  facts: 'fact_ref',
  event_dates: 'event_ref',
  deadline_overrides: 'deadline_ref',
  deadline_status: 'deadline_ref',
  checklist: 'item_ref',
} as const;
type KeyedTable = keyof typeof KEYED_TABLES;

export interface SessionInfo {
  author: string;
  toolVersion: string;
  refVersion: string;
  /** Horodatage ISO 8601 UTC (injectable pour les tests). */
  clock?: () => string;
  /** Identifiant de session (défaut : crypto.randomUUID). */
  sessionId?: string;
}

export interface CreateOptions extends SessionInfo {
  codename: string;
  profile: Profile;
  /** Nom réel de l'entité : facultatif, jamais exporté en clair (DEC-5). */
  entityName?: string;
}

const CODENAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _-]{1,39}$/u;

export class ExerciseError extends Error {
  constructor(message: string) { super(message); this.name = 'ExerciseError'; }
}

const defaultClock = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

export class Exercise {
  readonly db: SqlDb;
  readonly sessionId: string;
  readonly author: string;
  readonly refVersion: string;
  readonly toolVersion: string;
  /** Résultat de la vérification d'intégrité faite à l'ouverture. */
  readonly integrityAtOpen: ChainCheck;
  #clock: () => string;
  #queue: Promise<unknown> = Promise.resolve();

  private constructor(db: SqlDb, info: SessionInfo, integrity: ChainCheck) {
    if (!info.author.trim()) throw new ExerciseError('Nom de l\'auteur requis (DEC-3).');
    this.db = db;
    this.author = info.author.trim();
    this.refVersion = info.refVersion;
    this.toolVersion = info.toolVersion;
    this.sessionId = info.sessionId ?? crypto.randomUUID();
    this.#clock = info.clock ?? defaultClock;
    this.integrityAtOpen = integrity;
  }

  /** Nouvel exercice : schéma, session, métadonnées, le tout journalisé. */
  static async create(factory: SqlDbFactory, schemaSql: string, opts: CreateOptions): Promise<Exercise> {
    if (!CODENAME_RE.test(opts.codename)) throw new ExerciseError('Nom de code invalide (2 à 40 caractères, lettres, chiffres, espace, - ou _).');
    if (!PROFILES.includes(opts.profile)) throw new ExerciseError(`Profil inconnu : ${String(opts.profile)}`);
    if (opts.entityName && opts.codename.toLowerCase().includes(opts.entityName.trim().toLowerCase())) {
      throw new ExerciseError('Le nom de code ne doit pas contenir le nom de l\'entité (DEC-5).');
    }
    const db = factory.open();
    db.exec(schemaSql);
    const ex = new Exercise(db, opts, { ok: true, length: 0, head: journalHead(db).hash });
    await ex.#openSession(factory.sqliteVersion);
    await ex.#write('meta', 'schema_version', { value: SCHEMA_VERSION });
    await ex.#write('meta', 'codename', { value: opts.codename });
    await ex.#write('meta', 'profile', { value: opts.profile });
    await ex.#write('meta', 'ref_version', { value: opts.refVersion });
    await ex.#write('meta', 'tool_version', { value: opts.toolVersion });
    await ex.#write('meta', 'created_at', { value: ex.#clock() });
    if (opts.entityName?.trim()) await ex.#write('meta', 'entity_name', { value: opts.entityName.trim() });
    return ex;
  }

  /** Ouvre une base déchiffrée : contrôle de version de schéma, vérification de la chaîne, nouvelle session journalisée. */
  static async open(factory: SqlDbFactory, dbBytes: Uint8Array, info: SessionInfo): Promise<Exercise> {
    const db = factory.open(dbBytes);
    const version = db.get<{ value: string }>("SELECT value FROM meta WHERE key = 'schema_version'")?.value;
    if (version !== SCHEMA_VERSION) {
      db.close();
      throw new ExerciseError(`Version de schéma ${String(version)} non supportée (attendue : ${SCHEMA_VERSION}).`);
    }
    const integrity = await verifyChain(db);
    const ex = new Exercise(db, info, integrity);
    await ex.#openSession(factory.sqliteVersion);
    return ex;
  }

  async #openSession(sqliteVersion: string): Promise<void> {
    const opened = this.#clock();
    const integrity = this.integrityAtOpen.ok
      ? { ok: true, length: this.integrityAtOpen.length }
      : { ok: false, broken_at: this.integrityAtOpen.brokenAt, reason: this.integrityAtOpen.reason };
    await this.#serial(async () => {
      const entry = await prepareEntry(this.db, {
        ts: opened, session_id: this.sessionId, author: this.author, action: 'session_open',
        entity: 'sessions', entity_id: this.sessionId, before: null,
        after: { tool_version: this.toolVersion, ref_version: this.refVersion, sqlite: sqliteVersion, integrity },
      });
      this.db.transaction(() => {
        this.db.exec('INSERT INTO sessions (id, author, opened_at, tool_version, ref_version) VALUES (?,?,?,?,?)',
          [this.sessionId, this.author, opened, this.toolVersion, this.refVersion]);
        insertEntry(this.db, entry);
      });
    });
  }

  /** File d'attente : une écriture à la fois (préparation asynchrone du hash + transaction synchrone). */
  #serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.#queue.then(fn, fn);
    this.#queue = run.catch(() => undefined);
    return run;
  }

  /** Écriture générique journalisée sur une table à clé unique. `after = null` supprime la ligne. Sans changement : rien n'est journalisé. */
  #write(table: KeyedTable, id: string, after: Record<string, SqlValue> | null): Promise<boolean> {
    return this.#serial(async () => {
      const pk = KEYED_TABLES[table];
      const before = this.db.get(`SELECT * FROM ${table} WHERE ${pk} = ?`, [id]);
      const beforeVal = before ? stripKey(before, pk) : null;
      if (canonicalize(beforeVal as JsonValue) === canonicalize(after as JsonValue)) return false;
      const action: JournalAction = !before ? 'create' : after ? 'update' : 'delete';
      const entry = await prepareEntry(this.db, {
        ts: this.#clock(), session_id: this.sessionId, author: this.author, action,
        entity: table, entity_id: id, before: beforeVal as JsonValue, after: after as JsonValue,
      });
      this.db.transaction(() => {
        if (after) {
          const cols = Object.keys(after);
          const placeholders = cols.map(() => '?').join(',');
          const updates = cols.map((c) => `${c} = excluded.${c}`).join(', ');
          this.db.exec(`INSERT INTO ${table} (${pk}, ${cols.join(', ')}) VALUES (?, ${placeholders}) ON CONFLICT(${pk}) DO UPDATE SET ${updates}`,
            [id, ...cols.map((c) => after[c] ?? null)]);
        } else {
          this.db.exec(`DELETE FROM ${table} WHERE ${pk} = ?`, [id]);
        }
        insertEntry(this.db, entry);
      });
      return true;
    });
  }

  // --- API métier -----------------------------------------------------------

  async setEventDate(eventRef: string, date: ISODate | null, note: string | null = null): Promise<boolean> {
    if (date !== null && !isValidISODate(date)) throw new ExerciseError(`Date invalide : ${date}`);
    return this.#write('event_dates', eventRef, date === null ? null : { date, note });
  }

  async setFact(factRef: string, value: FactValue | null): Promise<boolean> {
    return this.#write('facts', factRef, value === null ? null : { value: JSON.stringify(value) });
  }

  async setChecklist(itemRef: string, status: ChecklistStatus, justification: string | null = null, decidedBy: string | null = null): Promise<boolean> {
    if ((status === 'not_applicable' || status === 'accepted_gap') && !justification?.trim()) {
      throw new ExerciseError('Justification obligatoire pour « non applicable » et « écart accepté ».');
    }
    if (status === 'accepted_gap' && !decidedBy?.trim()) throw new ExerciseError('Décideur obligatoire pour un écart accepté.');
    return this.#write('checklist', itemRef, { status, justification, decided_by: decidedBy, ref_version: this.refVersion });
  }

  async setDeadlineDone(deadlineRef: string, doneDate: ISODate | null, note: string | null = null): Promise<boolean> {
    if (doneDate !== null && !isValidISODate(doneDate)) throw new ExerciseError(`Date invalide : ${doneDate}`);
    return this.#write('deadline_status', deadlineRef, doneDate === null ? null : { done_date: doneDate, note });
  }

  async setDeadlineOverride(deadlineRef: string, o: (DeadlineOverride & { decidedBy: string }) | null): Promise<boolean> {
    if (o === null) return this.#write('deadline_overrides', deadlineRef, null);
    if (!o.justification.trim() || !o.decidedBy.trim()) throw new ExerciseError('Justification et décideur obligatoires pour une surcharge.');
    return this.#write('deadline_overrides', deadlineRef, {
      due_date: o.due_date ?? null, offset_value: o.offset?.value ?? null, offset_unit: o.offset?.unit ?? null,
      justification: o.justification, decided_by: o.decidedBy,
    });
  }

  // --- Lecture ---------------------------------------------------------------

  meta(): Record<string, string> {
    return Object.fromEntries(this.db.all<{ key: string; value: string }>('SELECT key, value FROM meta').map((r) => [r.key, r.value]));
  }

  /** Réponses aux checklists, pour `buildChecklist`. */
  checklistResponses(): Record<string, Response> {
    type R = { item_ref: string; status: string; justification: string | null; decided_by: string | null; ref_version: string };
    const out: Record<string, Response> = {};
    for (const r of this.db.all<R>('SELECT item_ref, status, justification, decided_by, ref_version FROM checklist')) {
      out[r.item_ref] = { status: r.status as ChecklistStatus, justification: r.justification, decided_by: r.decided_by, ref_version: r.ref_version };
    }
    return out;
  }

  /** État de l'exercice pour `computeDeadlines` (les occurrences récurrentes viendront des registres). */
  loadState(today: ISODate): ExerciseState {
    const events: Record<string, ISODate> = {};
    for (const r of this.db.all<{ event_ref: string; date: string }>('SELECT event_ref, date FROM event_dates')) events[r.event_ref] = r.date;
    const facts: Record<string, FactValue> = {};
    for (const r of this.db.all<{ fact_ref: string; value: string }>('SELECT fact_ref, value FROM facts')) facts[r.fact_ref] = JSON.parse(r.value) as FactValue;
    const done: Record<string, ISODate> = {};
    for (const r of this.db.all<{ deadline_ref: string; done_date: string | null }>('SELECT deadline_ref, done_date FROM deadline_status')) {
      if (r.done_date) done[r.deadline_ref] = r.done_date;
    }
    const overrides: Record<string, DeadlineOverride> = {};
    type OvRow = { deadline_ref: string; due_date: string | null; offset_value: number | null; offset_unit: string | null; justification: string };
    for (const r of this.db.all<OvRow>('SELECT deadline_ref, due_date, offset_value, offset_unit, justification FROM deadline_overrides')) {
      overrides[r.deadline_ref] = {
        justification: r.justification,
        ...(r.due_date ? { due_date: r.due_date } : {}),
        ...(r.offset_value !== null && r.offset_unit ? { offset: { value: r.offset_value, unit: r.offset_unit as OffsetUnit } } : {}),
      };
    }
    return { today, events, facts, done, overrides };
  }

  // --- Intégrité et export ------------------------------------------------------

  verify(): Promise<ChainCheck> { return verifyChain(this.db); }

  /** Ancre le hash de tête courant et journalise l'ancrage. Le texte renvoyé est à recopier dans un PV ou un mail. */
  anchor(): Promise<Anchor> {
    return this.#serial(async () => {
      const head = journalHead(this.db);
      const codename = this.meta().codename ?? '';
      const a: Anchor = { codename, seq: head.seq, hash: head.hash, ts: this.#clock() };
      const entry = await prepareEntry(this.db, {
        ts: a.ts, session_id: this.sessionId, author: this.author, action: 'anchor',
        entity: 'journal', entity_id: String(head.seq), before: null, after: { ...a },
      });
      this.db.transaction(() => insertEntry(this.db, entry));
      return a;
    });
  }

  /** Image de la base à chiffrer. Journalise l'export avant de sérialiser, pour qu'il figure dans le fichier écrit. */
  exportBytes(): Promise<Uint8Array> {
    return this.#serial(async () => {
      const entry = await prepareEntry(this.db, {
        ts: this.#clock(), session_id: this.sessionId, author: this.author, action: 'export',
        entity: null, entity_id: null, before: null, after: { head_seq: journalHead(this.db).seq },
      });
      this.db.transaction(() => insertEntry(this.db, entry));
      return this.db.export();
    });
  }

  close(): void { this.db.close(); }
}

function stripKey(row: Row, pk: string): Record<string, SqlValue> {
  const out: Record<string, SqlValue> = {};
  for (const [k, v] of Object.entries(row)) if (k !== pk) out[k] = v;
  return out;
}
