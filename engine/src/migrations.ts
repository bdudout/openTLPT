// Migrations du schéma de la base d'exercice. Chaque entrée fait passer de la version clé à la version suivante.
// Elles sont appliquées à l'ouverture, dans une transaction, et journalisées (meta.schema_version).

export const CURRENT_SCHEMA_VERSION = '4';

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
  '2': {
    to: '3',
    sql: [
      `CREATE TABLE event_plans (
        event_ref     TEXT PRIMARY KEY,
        planned_date  TEXT NOT NULL CHECK (date(planned_date) IS NOT NULL),
        baseline_date TEXT CHECK (baseline_date IS NULL OR date(baseline_date) IS NOT NULL),
        note          TEXT
      ) STRICT`,
    ],
  },
  '3': {
    to: '4',
    sql: [
      `CREATE TABLE flags (
  id          INTEGER PRIMARY KEY,
  scenario_id INTEGER REFERENCES scenarios(id),
  label       TEXT NOT NULL,              -- libellé neutre, sans détail sensible
  cia         TEXT CHECK (cia IN ('C','I','A','Au') OR cia IS NULL),
  status      TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','reached','not_reached')),
  reached_at  TEXT CHECK (reached_at IS NULL OR date(reached_at) IS NOT NULL),
  attack_path TEXT,                       -- chemin d'attaque résumé (annexe V : réussi ou non)
  ttps        TEXT                        -- techniques MITRE ATT&CK (ex. T1566, T1078)
) STRICT`,
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
