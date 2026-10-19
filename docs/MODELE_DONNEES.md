# openTLPT — Modèle de données (v0.1)

> Complète [BESOINS.md](BESOINS.md). Il y a deux familles de données, **strictement séparées** :
>
> | Famille | Contenu | Où | Qui l'écrit |
> |---|---|---|---|
> | **Référentiel** | Obligations, bonnes pratiques, délais, profils, livrables, textes officiels | Packs JSON **embarqués dans le HTML** (DEC-2), en lecture seule | Mainteneurs du projet, à chaque release |
> | **Exercice** | Dates saisies, réponses aux checklists, livrables suivis, registres, journal | Base SQLite **chiffrée** dans `<nom-de-code>.tlpt` | L'utilisateur, avec chaque action journalisée |
>
> L'exercice ne copie **jamais** le contenu du référentiel. Il le désigne par des **identifiants stables** (`RTS-9.2`, `EU-22`…)
> et enregistre la **version du référentiel** utilisée (ENF-9).

## 1. Référentiel

### 1.1 Organisation en packs

```
referentiel/
├─ schema/pack.schema.json        JSON Schema (draft 2020-12) commun à tous les packs
└─ packs/
   ├─ core.json                   profils, acteurs, phases, événements, faits, livrables, délais
   ├─ dora-rts.json               obligations DORA art. 26-27 et RTS (UE) 2025/1190
   ├─ tiber-eu.json               bonnes pratiques TIBER-EU (janv. 2025)
   ├─ tiber-fr.json               bonnes pratiques TIBER-FR (v2, mars 2025)
   └─ texts/<lang>/<instrument>.json   extraits officiels par langue (24 langues, cf. §1.6)
```

Un pack a un **cadre unique** (`framework`). Ajouter un TIBER national revient à ajouter un pack, sans toucher les autres.
C'est ainsi que l'outil garantit la séparation demandée.

### 1.2 Règle de séparation (contrôlée par le validateur)

| `framework` du pack | `nature` autorisée pour ses éléments | Badge dans l'outil |
|---|---|---|
| `DORA`, `RTS_TLPT` | `obligation` uniquement | **Obligation** |
| `TIBER-EU`, `TIBER-FR`, `TIBER-xx` | `good_practice`, ou `national_obligation` pour une règle de droit national relayée par le guide (ex. FR-04 PASSI LPM, en attente de qualification juridique) | **Bonne pratique (TIBER-xx)** / **Obligation nationale (à qualifier)** |
| `core` | aucun élément de checklist | — |

Toute bonne pratique déclare son **lien** avec les obligations (`relation`) :

| `relation.type` | Sens | Affichage |
|---|---|---|
| `adds` | Va au-delà du RTS | Normal |
| `restates` | Reformule une obligation ; `relation.targets` est obligatoire | Replié sous l'obligation |
| `diverges` | Diffère du RTS ou de TIBER-EU ; `relation.targets` et `relation.note` sont obligatoires | Avertissement ⚠ |

### 1.3 Entités du pack `core`

| Entité | Rôle | Exemple d'ID |
|---|---|---|
| `profiles` | Profils de l'outil choisis à la création. `includes` permet l'union : TI+RT = TI ∪ RT. | `entity`, `ti`, `rt`, `ti_rt` |
| `actors` | Porteurs des exigences | `CT`, `CTL`, `MB` (organe de direction), `TIP`, `RTT`, `BT`, `TLPT_AUTH`, `TM`, `CA` (autorité compétente), `ICT_TPP` |
| `phases` | Étapes du déroulé, ordonnées | `preparation`, `testing_ti`, `testing_rt`, `closure`, `remediation`, `cycle` |
| `events` | Dates que l'utilisateur saisit et dont partent les délais | `N0`, `TESTING_START`, `R0`, `R1`, `N2`… |
| `facts` | Caractéristiques de l'exercice qui conditionnent l'applicabilité | `internal_testers`, `pooled`, `joint`, `ssm_significant`, `oiv_siiv_flags`… |
| `deliverables` | Livrables attendus (suivis par métadonnées, EF-4) | `DLV-SSD`, `DLV-TTIR`, `DLV-RTTR`… |
| `deadlines` | Délais calculables | `D-01` … `D-15` |

### 1.4 Éléments de checklist (`items`) — packs réglementaires et TIBER

```jsonc
{
  "id": "RTS-9.6",                       // stable, unique dans tous les packs
  "nature": "obligation",                // obligation | good_practice | national_obligation
  "matrix_ref": "PR-06",                 // ID lisible des fichiers docs/referentiel/*.md
  "source": { "instrument": "RTS_2025_1190", "article": "9", "paragraph": "6",
              "eli": "http://data.europa.eu/eli/reg_del/2025/1190/oj" },
  "phase": "preparation",
  "carriers": ["CT", "MB"],              // porteurs
  "profiles": ["entity"],                // profils qui voient l'élément
  "display": "check",                    // check (à traiter) | info (jalon externe, à attendre)
  "applies_when": { "all": [ { "fact": "internal_testers", "eq": true } ] },  // facultatif
  "deliverables": ["DLV-SSD"],
  "deadlines": ["D-02"],
  "title":    { "fr": "…", "en": "…" },
  "summary":  { "fr": "…", "en": "…" },  // synthèse ; le texte officiel vient de texts/
  "question": { "fr": "…", "en": "…" },  // facultatif pour une obligation, obligatoire pour une bonne pratique
  "evidence": { "fr": "…", "en": "…" },
  "relation": { "type": "adds|restates|diverges", "targets": ["RTS-…"], "note": {…} } // bonnes pratiques
}
```

- **Textes localisés** (`LocalizedText`) : un objet indexé par code de langue ISO 639-1. `fr` et `en` sont **requis** (l'interface est en FR/EN en v1).
  Les autres langues sont facultatives. En leur absence, l'outil affiche l'anglais et le signale.
- **Conditions** (`applies_when`) : une logique minimale et déclarative, `all` / `any` sur des faits (`eq`, `in`). Pas de code arbitraire.
  Un élément non applicable du fait des conditions est masqué. Un élément que l'utilisateur déclare « non applicable » reste visible et justifié.

### 1.5 Délais (`deadlines`)

```jsonc
{
  "id": "D-11",
  "anchor": "N2",                                   // événement de départ
  "kind": "max",                                     // max | min | before | recurring
  "offset": { "value": 8, "unit": "weeks" },         // days | weeks | months | working_days | years
  "carriers": ["CT"],
  "target": { "deliverable": "DLV-TSR" },            // ou { "milestone": "…" }
  "sources": ["RTS-12.7"],
  "label": { "fr": "…", "en": "…" }
}
```

**Règles de calcul** (implémentées dans le moteur, testées unitairement) :
- `weeks` = 7 × n jours ; `days` = jours calendaires.
- `months` et `years` : même quantième, ramené au dernier jour du mois s'il n'existe pas (31/08 + 6 mois = 28 ou 29/02).
- `working_days` : du lundi au vendredi. Les jours fériés ne sont pas gérés en v1, ce qu'on signale.
- `kind: max` : échéance = ancre + délai ; en retard si non fait à J+1.
- `kind: min` : durée minimale ; alerte si l'événement de fin est saisi avant ancre + délai (ex. 12 semaines entre R0 et R1).
- `kind: before` : à faire avant l'ancre (ex. achats terminés avant `TESTING_START`) ; échéance = date de l'ancre, même planifiée. Tant que l'ancre n'est pas datée, l'action reste « à venir », sans date (jamais en retard).
- `kind: recurring` : fréquence (`every`) entre `anchor` et `until` (ex. rapport hebdomadaire entre R0 et R1).
- Une ancre non saisie rend l'échéance **« en attente de la date X »**, sans calcul ni alerte.
- Une surcharge n'est appliquée que si le délai est `overridable` et la justification non vide. Sinon, elle est ignorée et signalée (`overrideIgnored`) : un délai du RTS ne peut pas être modifié depuis l'interface.
- Implémentation : [`engine/src/deadlines.ts`](../engine/src/deadlines.ts), testée sur le pack core réel.
- L'utilisateur peut **surcharger** une échéance (ex. fréquence de TLPT modulée par l'autorité), avec une justification qui est journalisée.

### 1.6 Textes officiels multilingues

`texts/<lang>/<instrument>.json` contient les **extraits officiels** indexés par ancre (`"9.6"`, `"Annex II"`). Ils sont générés
par un script depuis EUR-Lex. Leur réutilisation est autorisée (décision 2011/833/UE).
Ces fichiers restent séparés des packs : ce sont des données textuelles volumineuses, sans logique.
Chaque fichier porte `retrieved_at`, `celex` et `lang`.
Les packs TIBER **n'ont pas** de textes embarqués, seulement des références (§ « Droits » de BONNES_PRATIQUES_TIBER.md).

### 1.7 En-tête de pack

`pack_id`, `framework`, `version` (semver du pack), `title`, `sources[]` (titre, version, date, URL, date de vérification), `license_note`.
Le **référentiel** complet a une version globale `ref_version` (ex. `2026.10.0`), calculée au build à partir des versions des packs.

## 2. Exercice (fichier `.tlpt`)

### 2.1 Enveloppe du fichier

Le fichier est une enveloppe JSON en UTF-8 : un en-tête en clair **authentifié**, plus un contenu chiffré.

```jsonc
{
  "magic": "openTLPT",
  "format": 1,                          // version du format d'enveloppe
  "file_version": 42,                   // compteur DEC-1 / ENF-8, lisible sans déchiffrer
  "kdf":    { "alg": "argon2id", "m_kib": 65536, "t": 3, "p": 1, "salt": "<b64 16o>" },   // ADR-0003 ; "pbkdf2-sha256" accepté en lecture
  "cipher": { "alg": "AES-256-GCM", "iv": "<b64 12o>" },
  "payload": "<b64 : base SQLite sérialisée, chiffrée>"
}
```

- L'en-tête, sans le champ `payload`, est passé en **AAD** à AES-GCM. Toute modification de `file_version` ou des paramètres casse le déchiffrement.
- Un nouvel IV est tiré à chaque enregistrement, et un nouveau sel à chaque changement de passphrase.
- **Rien d'identifiant en clair** : ni nom de code, ni entité. Le nom du fichier est le seul indice, et c'est le nom de code (DEC-5).
- Implémentation : [`engine/src/envelope.ts`](../engine/src/envelope.ts). Les paramètres KDF sont **bornés** à la lecture (plancher OWASP, plafonds anti-DoS). Les champs inconnus sont refusés. Mauvaise passphrase et fichier altéré renvoient la **même** erreur (`decrypt_failed`). Un fichier PBKDF2 est réécrit en Argon2id à l'enregistrement suivant.
- Contrôle d'écriture concurrente (DEC-1) : avant d'écrire, on relit le `file_version` sur disque. S'il diffère de celui
  qu'on a chargé, l'écriture est refusée.

### 2.2 Schéma SQLite

DDL complet : [`schema/tlpt.sql`](../schema/tlpt.sql). Vue d'ensemble :

```
meta ─────────────── clé/valeur : schema_version, codename, profile, ref_version, created_at, entity_name (facultatif)
facts ────────────── valeurs des faits d'applicabilité (internal_testers, pooled…)
event_dates ──────── date saisie pour chaque événement du core (N0, R0, R1, N2…)
deadline_overrides ─ échéance ou délai surchargé + justification
checklist ────────── réponse par item du référentiel : statut, justification, décideur
parties ──────────── annuaire (rôle = acteur du core, organisation, contact)
deliverables ─────── livrables suivis : réf. au core ou libre, version, statut, sha256, emplacement
provider_checks ──── évaluation des prestataires (items P-xx) par partie, avec empreinte de la preuve
scenarios ────────── scénarios proposés / retenus (threat-led ou X, C/I/A, FCI)
leg_ups ──────────── registre des leg-ups (type, scénario, approbations CT/TM, date)
detections ───────── registre des détections et des mesures validées
plan_changes ─────── changements au plan de test RT (approbations CTL + TM)
weekly_reports ───── rapports hebdomadaires des testeurs (RTS 11(7)) : alimentent D-07 (schéma v2)
sessions ─────────── ouvertures de session (auteur déclaratif, version de l'outil et du référentiel)
journal ──────────── journal chaîné append-only (cf. 2.3)
```

**Version de schéma** : 2 (`meta.schema_version`). Les fichiers v1 sont migrés à l'ouverture ([`engine/src/migrations.ts`](../engine/src/migrations.ts)). La migration est faite dans une transaction et journalisée (`meta.schema_version` 1 → 2). Une version inconnue est refusée.

**Règle d'écriture** : toute écriture dans une table métier passe par une **fonction unique** du moteur. Elle
écrit la ligne **et** l'entrée de journal correspondante dans **la même transaction**. Des déclencheurs SQLite interdisent
`UPDATE` et `DELETE` sur `journal`.

Implémentation : [`engine/src/exercise.ts`](../engine/src/exercise.ts). Les écritures sont **sérialisées** : le hash est calculé
de manière asynchrone, puis la ligne métier et l'entrée de journal sont écrites dans une transaction synchrone. Une écriture
sans changement réel n'est pas journalisée.

### 2.3 Journal chaîné

| Champ | Contenu |
|---|---|
| `seq` | Entier strictement croissant à partir de 1 |
| `ts` | Horodatage ISO 8601 UTC (horloge du poste, déclarative) |
| `session_id`, `author` | Session et nom déclaratif (DEC-3) |
| `action` | `create`, `update`, `delete`, `session_open`, `export`, `anchor`, `integrity_check`, `ref_upgrade` |
| `entity`, `entity_id` | Table et clé concernées |
| `before`, `after` | JSON canonique des valeurs, `null` si sans objet |
| `prev_hash` | `hash` de l'entrée précédente ; 64 « 0 » pour la première |
| `hash` | `SHA-256( JCS({seq, ts, session_id, author, action, entity, entity_id, before, after, prev_hash}) )` en hexadécimal |

- La canonicalisation suit la **JCS (RFC 8785)** : la même entrée donne le même hash dans n'importe quelle implémentation.
- **Vérification** : on recalcule toute la chaîne à l'ouverture. La première rupture est signalée par son `seq`.
- **Ancrage** : l'action `anchor` exporte `{codename, seq, hash, ts}` en texte et en QR, pour l'inscrire dans un PV ou un mail.
  Pour vérifier un ancrage, on contrôle que l'entrée `seq` a toujours ce `hash`.
- Implémentation : [`engine/src/journal.ts`](../engine/src/journal.ts). Une base altérée reste ouvrable, mais la rupture est inscrite dans l'entrée `session_open` (`integrity.ok = false`, `broken_at`).
- Les **pièces jointes ne sont pas stockées** : seule leur empreinte SHA-256, calculée localement, entre dans `after`.

### 2.4 Calculs à la volée (jamais stockés)

Échéances, statuts « en retard / à venir », taux d'avancement par phase et visibilité des items sont **calculés** à partir de :
référentiel + `facts` + `event_dates` + `deadline_overrides` + `checklist`. On n'a donc pas de données dérivées à
synchroniser, et une nouvelle version du référentiel recalcule tout. L'écart de version est signalé (ENF-9).

## 3. Validation

`python3 tools/validate_ref.py` lance deux contrôles. Le premier est le JSON Schema, qui demande le paquet `jsonschema`.
Le second regroupe les règles transverses : unicité des ID, séparation obligations / bonnes pratiques, résolution de toutes
les références, liens items ↔ délais symétriques, cibles `restates` et `diverges` qui sont bien des obligations, et absence
de cycle entre événements. Le script renvoie un code de sortie non nul en cas d'erreur, et doit être lancé en CI.

État au 2026-10-19 : 4 packs (`core` 0.1.0, `dora-rts`, `tiber-eu` et `tiber-fr` en 0.2.0).
Ils totalisent 155 items : 92 obligations, 44 bonnes pratiques TIBER-EU et 19 éléments TIBER-FR, dont 1 `national_obligation`.
S'y ajoutent 14 délais, 22 événements et 16 livrables. La validation passe, y compris contre le schéma.
**Toutes les lignes** de MATRICE_DORA_RTS.md et BONNES_PRATIQUES_TIBER.md sont encodées, à une exception volontaire près :
G-13 (considérant 27) est porté par une note, car il est interprétatif. Le champ `matrix_ref` fait le lien entre chaque item et sa ligne.
Les traductions EN des packs sont des synthèses à faire relire par une personne qui maîtrise le sujet.

## 4. Évolutions prévues

- **Montée de version du référentiel** : un item supprimé ou renommé porte `replaced_by`, et l'outil migre les réponses en le journalisant (`ref_upgrade`).
- **Export partiel en lecture seule** (EF-9, v2) : une projection de `event_dates`, `deliverables` et des statuts de checklist, signée par le hash de tête du journal.
- **Jours fériés** par État membre pour les `working_days`.
