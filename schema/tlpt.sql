-- openTLPT — schéma de la base d'exercice (contenu chiffré d'un fichier .tlpt)
-- Voir docs/MODELE_DONNEES.md §2. Les identifiants *_ref désignent des éléments du référentiel (packs JSON) ;
-- leur existence est vérifiée par le moteur, pas par SQLite (le référentiel n'est pas dans la base).
-- Version de schéma : 3 (meta.schema_version). Migrations : engine/src/migrations.ts.
-- Dates : TEXT ISO 8601 (YYYY-MM-DD pour les dates, YYYY-MM-DDTHH:MM:SSZ pour les horodatages UTC).

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Métadonnées de l'exercice
-- clés attendues : schema_version, codename, profile, ref_version, created_at,
--                  tool_version, entity_name (facultatif, jamais exporté en clair)
-- ---------------------------------------------------------------------------
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;

-- Faits d'applicabilité (core.facts) ; value encodée en JSON (true, "mixed", 3…)
CREATE TABLE facts (
  fact_ref TEXT PRIMARY KEY,
  value    TEXT NOT NULL CHECK (json_valid(value))
) STRICT;

-- Dates des événements (core.events)
CREATE TABLE event_dates (
  event_ref TEXT PRIMARY KEY,
  date      TEXT NOT NULL CHECK (date(date) IS NOT NULL),
  note      TEXT
) STRICT;

-- Planning : date prévue courante et date de référence (premier plan, ou plan figé) — glissement = prévue − référence
CREATE TABLE event_plans (
  event_ref     TEXT PRIMARY KEY,
  planned_date  TEXT NOT NULL CHECK (date(planned_date) IS NOT NULL),
  baseline_date TEXT CHECK (baseline_date IS NULL OR date(baseline_date) IS NOT NULL),
  note          TEXT
) STRICT;

-- Surcharges justifiées d'échéances (ex. D-13 modulé par l'autorité)
CREATE TABLE deadline_overrides (
  deadline_ref  TEXT PRIMARY KEY,
  due_date      TEXT CHECK (due_date IS NULL OR date(due_date) IS NOT NULL),
  offset_value  INTEGER,
  offset_unit   TEXT CHECK (offset_unit IN ('days','weeks','months','working_days','years')),
  justification TEXT NOT NULL CHECK (length(trim(justification)) > 0),
  decided_by    TEXT NOT NULL,
  CHECK (due_date IS NOT NULL OR (offset_value IS NOT NULL AND offset_unit IS NOT NULL))
) STRICT;

-- Statut des délais de type "check" (fait / date de réalisation)
CREATE TABLE deadline_status (
  deadline_ref TEXT PRIMARY KEY,
  done_date    TEXT CHECK (done_date IS NULL OR date(done_date) IS NOT NULL),
  note         TEXT
) STRICT;

-- Réponses aux items de checklist (obligations, bonnes pratiques)
CREATE TABLE checklist (
  item_ref      TEXT PRIMARY KEY,
  status        TEXT NOT NULL CHECK (status IN ('open','in_progress','done','not_applicable','accepted_gap')),
  justification TEXT,
  decided_by    TEXT,
  ref_version   TEXT NOT NULL,             -- version du référentiel au moment de la réponse (ENF-9)
  CHECK (status NOT IN ('not_applicable','accepted_gap') OR length(trim(coalesce(justification,''))) > 0),
  CHECK (status <> 'accepted_gap' OR decided_by IS NOT NULL)
) STRICT;

-- Annuaire des parties prenantes
CREATE TABLE parties (
  id           INTEGER PRIMARY KEY,
  actor_ref    TEXT NOT NULL,              -- core.actors (CT, TIP, RTT, TM…)
  organisation TEXT,
  person       TEXT,
  contact      TEXT,
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
) STRICT;

-- Livrables suivis (métadonnées seulement, EF-4)
CREATE TABLE deliverables (
  id              INTEGER PRIMARY KEY,
  deliverable_ref TEXT,                    -- core.deliverables ; NULL = livrable libre
  title           TEXT NOT NULL,
  owner_party_id  INTEGER REFERENCES parties(id),
  status          TEXT NOT NULL CHECK (status IN ('expected','draft','submitted','approved','rejected','not_applicable')),
  version         TEXT,
  location        TEXT,                    -- emplacement externe (GED, data room…)
  sha256          TEXT CHECK (sha256 IS NULL OR (length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*')),
  file_name       TEXT,                    -- nom du fichier haché localement (le fichier n'est jamais stocké)
  file_size       INTEGER CHECK (file_size IS NULL OR file_size >= 0),
  submitted_at    TEXT CHECK (submitted_at IS NULL OR date(submitted_at) IS NOT NULL),
  approved_at     TEXT CHECK (approved_at  IS NULL OR date(approved_at)  IS NOT NULL),
  note            TEXT
) STRICT;
CREATE INDEX deliverables_ref ON deliverables(deliverable_ref);

-- Évaluation des prestataires (items P-xx / RTS 7(1), DORA 27)
CREATE TABLE provider_checks (
  party_id        INTEGER NOT NULL REFERENCES parties(id),
  item_ref        TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('open','compliant','non_compliant','derogation')),
  evidence_sha256 TEXT CHECK (evidence_sha256 IS NULL OR length(evidence_sha256) = 64),
  evidence_label  TEXT,
  note            TEXT,
  PRIMARY KEY (party_id, item_ref)
) STRICT;

-- Scénarios proposés / retenus (RTS 10)
CREATE TABLE scenarios (
  id           INTEGER PRIMARY KEY,
  label        TEXT NOT NULL,              -- libellé neutre, sans détail sensible
  threat_led   INTEGER NOT NULL DEFAULT 1 CHECK (threat_led IN (0,1)),  -- 0 = scénario X
  cia          TEXT CHECK (cia IN ('C','I','A','Au') OR cia IS NULL),
  cif_label    TEXT,
  includes_tpp INTEGER NOT NULL DEFAULT 0 CHECK (includes_tpp IN (0,1)),
  selected     INTEGER NOT NULL DEFAULT 0 CHECK (selected IN (0,1))
) STRICT;

-- Registre des leg-ups (RTS 11(8))
CREATE TABLE leg_ups (
  id            INTEGER PRIMARY KEY,
  scenario_id   INTEGER REFERENCES scenarios(id),
  kind          TEXT CHECK (kind IN ('time','information','access') OR kind IS NULL),  -- typologie TIBER-FR (FR-09)
  planned       INTEGER NOT NULL DEFAULT 0 CHECK (planned IN (0,1)),                    -- prévu au plan de test RT
  requested_at  TEXT,
  approved_ct   TEXT,
  approved_tm   TEXT,
  provided_at   TEXT,
  description   TEXT NOT NULL
) STRICT;

-- Registre des détections (RTS 11(9)) et suspensions (11(10))
CREATE TABLE detections (
  id                 INTEGER PRIMARY KEY,
  detected_at        TEXT NOT NULL,
  kind               TEXT NOT NULL CHECK (kind IN ('detection','suspension','limited_purple_teaming','real_incident')),
  description        TEXT NOT NULL,
  measures           TEXT,
  validated_by_tm_at TEXT
) STRICT;

-- Changements du plan de test RT après approbation (RTS 11(6))
CREATE TABLE plan_changes (
  id             INTEGER PRIMARY KEY,
  requested_at   TEXT NOT NULL,
  scope          TEXT NOT NULL CHECK (scope IN ('timeline','scope','targets','flags','other')),
  description    TEXT NOT NULL,
  approved_ctl_at TEXT,
  approved_tm_at  TEXT
) STRICT;

-- Rapports hebdomadaires des testeurs pendant la phase active (RTS 11(7)) : alimentent l'échéance D-07
CREATE TABLE weekly_reports (
  id          INTEGER PRIMARY KEY,
  report_date TEXT NOT NULL CHECK (date(report_date) IS NOT NULL),
  summary     TEXT,                        -- libellé neutre, sans détail sensible
  sha256      TEXT CHECK (sha256 IS NULL OR (length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*')),
  file_name   TEXT
) STRICT;

-- Sessions (DEC-3)
CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,           -- UUID v4
  author       TEXT NOT NULL CHECK (length(trim(author)) > 0),
  opened_at    TEXT NOT NULL,
  tool_version TEXT NOT NULL,
  ref_version  TEXT NOT NULL
) STRICT;

-- ---------------------------------------------------------------------------
-- Journal chaîné append-only (EF-6, MODELE_DONNEES §2.3)
-- hash = SHA-256( JCS({seq, ts, session_id, author, action, entity, entity_id, before, after, prev_hash}) )
-- ---------------------------------------------------------------------------
CREATE TABLE journal (
  seq        INTEGER PRIMARY KEY CHECK (seq >= 1),
  ts         TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  author     TEXT NOT NULL,
  action     TEXT NOT NULL CHECK (action IN ('create','update','delete','session_open','export','anchor','integrity_check','ref_upgrade','file_conflict')),
  entity     TEXT,
  entity_id  TEXT,
  before     TEXT CHECK (before IS NULL OR json_valid(before)),
  after      TEXT CHECK (after  IS NULL OR json_valid(after)),
  prev_hash  TEXT NOT NULL CHECK (length(prev_hash) = 64),
  hash       TEXT NOT NULL UNIQUE CHECK (length(hash) = 64)
) STRICT;

-- seq strictement consécutif
CREATE TRIGGER journal_seq_contiguous BEFORE INSERT ON journal
WHEN NEW.seq <> coalesce((SELECT max(seq) FROM journal), 0) + 1
BEGIN SELECT RAISE(ABORT, 'journal: seq must be contiguous'); END;

-- chaînage : prev_hash = hash de l'entrée précédente (ou 64 zéros pour la première)
CREATE TRIGGER journal_prev_hash BEFORE INSERT ON journal
WHEN NEW.prev_hash <> coalesce((SELECT hash FROM journal WHERE seq = NEW.seq - 1), printf('%.64c', '0'))
BEGIN SELECT RAISE(ABORT, 'journal: prev_hash mismatch'); END;

CREATE TRIGGER journal_no_update BEFORE UPDATE ON journal
BEGIN SELECT RAISE(ABORT, 'journal is append-only'); END;

CREATE TRIGGER journal_no_delete BEFORE DELETE ON journal
BEGIN SELECT RAISE(ABORT, 'journal is append-only'); END;

-- Note : ces déclencheurs protègent contre les erreurs du moteur, pas contre une modification
-- volontaire du fichier (qui peut supprimer les déclencheurs). La preuve d'intégrité repose sur
-- le recalcul de la chaîne et sur l'ancrage externe du hash de tête.
