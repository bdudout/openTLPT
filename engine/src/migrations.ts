// Migrations du schéma de la base d'exercice. Chaque entrée fait passer de la version clé à la version suivante.
// Elles sont appliquées à l'ouverture, dans une transaction, et journalisées (meta.schema_version).

export const CURRENT_SCHEMA_VERSION = '2';

export const MIGRATIONS: Record<string, { to: string; sql: string[] }> = {
  '1': {
    to: '2',
    sql: [
      `CREATE TABLE weekly_reports (
        id          INTEGER PRIMARY KEY,
        report_date TEXT NOT NULL CHECK (date(report_date) IS NOT NULL),
        summary     TEXT,
        sha256      TEXT CHECK (sha256 IS NULL OR (length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*')),
        file_name   TEXT
      ) STRICT`,
      'ALTER TABLE deliverables ADD COLUMN file_name TEXT',
      'ALTER TABLE deliverables ADD COLUMN file_size INTEGER CHECK (file_size IS NULL OR file_size >= 0)',
    ],
  },
};

/** Versions que cette version d'openTLPT sait ouvrir (avec migration si nécessaire). */
export function isSupportedSchema(v: string | undefined): v is string {
  if (!v) return false;
  let cur = v;
  for (let i = 0; i < 100 && cur !== CURRENT_SCHEMA_VERSION; i++) {
    const m = MIGRATIONS[cur];
    if (!m) return false;
    cur = m.to;
  }
  return cur === CURRENT_SCHEMA_VERSION;
}
