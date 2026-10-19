// Interface d'accès à la base d'exercice (ADR-0002). Le reste du moteur ne dépend que de ce contrat :
// changer d'implémentation SQLite (officielle, sql.js) ne touche pas la logique métier.

export type SqlValue = string | number | null | Uint8Array;
export type Row = Record<string, SqlValue>;

export interface SqlDb {
  /** Exécute une ou plusieurs instructions (paramètres : instruction unique). */
  exec(sql: string, params?: SqlValue[]): void;
  /** Toutes les lignes d'une requête, en objets colonne → valeur. */
  all<T extends Row = Row>(sql: string, params?: SqlValue[]): T[];
  /** Première ligne, ou undefined. */
  get<T extends Row = Row>(sql: string, params?: SqlValue[]): T | undefined;
  /** Exécute `fn` dans une transaction (COMMIT si succès, ROLLBACK si exception). Synchrone. */
  transaction<T>(fn: () => T): T;
  /** Image binaire complète de la base (sqlite3_serialize). */
  export(): Uint8Array;
  close(): void;
}

export interface SqlDbFactory {
  /** Base vide en mémoire, ou désérialisée depuis `bytes`. Les clés étrangères sont activées. */
  open(bytes?: Uint8Array): SqlDb;
  /** Version de SQLite (traçabilité). */
  readonly sqliteVersion: string;
}
