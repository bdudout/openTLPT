// Adaptateur SqlDbFactory pour le build officiel SQLite WASM (@sqlite.org/sqlite-wasm), base mémoire uniquement :
// aucune VFS persistante (ni OPFS, ni kvvfs) n'est jamais utilisée (ADR-0002).
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Row, SqlDb, SqlDbFactory, SqlValue } from './db.ts';

export interface SqliteWasmOptions {
  /** Binaire WASM déjà en mémoire (navigateur, fichier unique : pas de fetch). Inutile sous Node. */
  wasmBinary?: Uint8Array;
}

// Typage minimal de l'API « oo1 » utilisée ici.
interface Oo1Db {
  pointer: number;
  exec(opts: { sql: string; bind?: SqlValue[]; rowMode?: 'object'; returnValue?: 'resultRows' }): Row[];
  exec(sql: string): void;
  transaction<T>(fn: () => T): T;
  checkRc(rc: number): void;
  close(): void;
}
interface Sqlite3 {
  version: { libVersion: string };
  oo1: { DB: new (filename?: string, flags?: string) => Oo1Db };
  capi: {
    sqlite3_js_db_export(db: Oo1Db): Uint8Array;
    sqlite3_deserialize(db: number, schema: string, data: number, dbSize: number, bufSize: number, flags: number): number;
    SQLITE_DESERIALIZE_FREEONCLOSE: number;
    SQLITE_DESERIALIZE_RESIZEABLE: number;
  };
  wasm: { allocFromTypedArray(bytes: Uint8Array): number };
}

class WasmDb implements SqlDb {
  #db: Oo1Db;
  #s: Sqlite3;
  constructor(s: Sqlite3, db: Oo1Db) { this.#s = s; this.#db = db; }

  exec(sql: string, params?: SqlValue[]): void {
    if (params) this.#db.exec({ sql, bind: params });
    else this.#db.exec(sql);
  }
  all<T extends Row = Row>(sql: string, params: SqlValue[] = []): T[] {
    return this.#db.exec({ sql, bind: params, rowMode: 'object', returnValue: 'resultRows' }) as T[];
  }
  get<T extends Row = Row>(sql: string, params: SqlValue[] = []): T | undefined {
    return this.all<T>(sql, params)[0];
  }
  transaction<T>(fn: () => T): T { return this.#db.transaction(fn); }
  export(): Uint8Array { return this.#s.capi.sqlite3_js_db_export(this.#db); }
  close(): void { this.#db.close(); }
}

export async function createSqliteWasm(opts: SqliteWasmOptions = {}): Promise<SqlDbFactory> {
  const init = sqlite3InitModule as unknown as (o: object) => Promise<Sqlite3>;
  const s = await init({ ...(opts.wasmBinary ? { wasmBinary: opts.wasmBinary } : {}), print: () => {}, printErr: () => {} });
  return {
    sqliteVersion: s.version.libVersion,
    open(bytes?: Uint8Array): SqlDb {
      const db = new s.oo1.DB(':memory:', 'c');
      if (bytes) {
        const p = s.wasm.allocFromTypedArray(bytes);
        const rc = s.capi.sqlite3_deserialize(db.pointer, 'main', p, bytes.length, bytes.length,
          s.capi.SQLITE_DESERIALIZE_FREEONCLOSE | s.capi.SQLITE_DESERIALIZE_RESIZEABLE);
        db.checkRc(rc);
      }
      db.exec('PRAGMA foreign_keys = ON');
      return new WasmDb(s, db);
    },
  };
}
