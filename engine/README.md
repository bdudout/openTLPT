# @opentlpt/engine

Moteur métier d'openTLPT en TypeScript. L'interface l'importe, et lui n'importe jamais l'interface (ADR-0001).
Il n'appelle jamais l'horloge système et ne fait aucune E/S : la date du jour, l'horodatage et les octets de la base lui sont passés.

| Module | Rôle | Dépendance d'exécution |
|---|---|---|
| `dates.ts` | Dates calendaires en UTC : fin de mois, 29 février, jours ouvrés | aucune |
| `applicability.ts` | Conditions `applies_when` sur les faits de l'exercice | aucune |
| `deadlines.ts` | Échéances `max` / `min` / `before` / `recurring`, surcharges justifiées, cohérence de la chronologie | aucune |
| `checklist.ts` | Socle permanent (obligations `standing`, par thème et avec sa propre progression) et checklists par phase (obligations `stepwise`) : filtrage par profil (TI+RT = TI ∪ RT) et par applicabilité. Obligations et bonnes pratiques en **listes séparées**, et seules les obligations entrent dans la progression. Liens reformule / diffère / complète, réponses périmées ou orphelines | aucune |
| `registers.ts` | Livrables et registres (leg-ups, détections, rapports hebdomadaires). Contrôles RTS 11(8), 11(9) et 11(10). Rapprochement livrables / échéances, la date de remise valant réalisation | aucune |
| `migrations.ts` | Migrations de schéma (v1 → v2), appliquées et journalisées à l'ouverture | aucune |
| `jcs.ts`, `bytes.ts` | JSON canonique (RFC 8785), base64, SHA-256 (WebCrypto) | aucune |
| `db.ts` | **Contrat** d'accès SQLite (`SqlDb`, `SqlDbFactory`) | aucune |
| `sqlite-wasm.ts` | Adaptateur SQLite WASM officiel, base mémoire uniquement (ADR-0002) | `@sqlite.org/sqlite-wasm` |
| `journal.ts` | Journal chaîné SHA-256 : préparation, insertion, vérification, ancrage | aucune |
| `kdf.ts` | Argon2id (écriture), PBKDF2 (lecture), bornes des paramètres, politique de passphrase (ADR-0003) | `hash-wasm` |
| `envelope.ts` | Enveloppe `.tlpt` : en-tête en AAD, AES-256-GCM, session (une dérivation par ouverture), contrôle DEC-1 | aucune (WebCrypto) |
| `exercise.ts` | Exercice : création, ouverture, mutations journalisées en transaction, `loadState()` pour le calcul des échéances | aucune |

Les tests utilisent les **vrais** moteurs (SQLite WASM, Argon2id) et le **vrai** référentiel (`core.json`, `schema/tlpt.sql`).

```bash
npm ci
```

```bash
npm test
```

```bash
npm run typecheck
```

`npm test` demande Node.js ≥ 22.18, qui exécute directement les fichiers `.ts`.
