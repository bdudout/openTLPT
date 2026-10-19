# ADR-0002 : Moteur SQLite dans le navigateur

**Statut :** Accepté (2026-10-19), après le spike et la CI Windows. Action ouverte : test sur un compte standard, sur un vrai poste d'entreprise.
**Date :** 2026-10-19
**Décideurs :** porteur du projet openTLPT

## Contexte

La base d'exercice est une base SQLite ([schema/tlpt.sql](../../schema/tlpt.sql)) qui vit **en mémoire**. Elle est **sérialisée,
chiffrée** puis écrite dans le fichier `.tlpt` (MODELE_DONNEES §2.1). Le moteur doit donc :
- **sérialiser et désérialiser** la base complète en `Uint8Array` (`sqlite3_serialize` / `deserialize`) ;
- supporter les **tables `STRICT`** (SQLite ≥ 3.37), les **fonctions JSON** (`json_valid`) et les **déclencheurs** ;
- fonctionner **sans réseau ni serveur**, en `file://`. Le binaire WASM est inliné dans le HTML (ADR-0004), et il ne faut donc
  ni `fetch` d'un `.wasm`, ni Worker chargé par URL, ni en-têtes COOP/COEP ;
- **ne rien persister dans le navigateur** (pas d'OPFS, pas d'IndexedDB) : l'unique copie des données est le fichier `.tlpt` chiffré.
  Une copie en clair dans le stockage du navigateur annulerait le chiffrement et la portabilité.

## Décision

**Build officiel SQLite WASM (`@sqlite.org/sqlite-wasm`), en mode base mémoire uniquement**, sur le thread principal.
L'appli désactive toute VFS persistante (OPFS, kvvfs). Le binaire WASM est passé directement au module (`wasmBinary` / `instantiateWasm`)
à partir des octets inlinés.

Repli : **sql.js**, si le spike montre que le build officiel ne s'initialise pas proprement en `file://` à partir d'octets inlinés.
Dans les deux cas, l'accès à la base passe par une **interface interne** (`engine/db.ts` : `open(bytes)`, `exec`, `query`,
`transaction`, `export(): Uint8Array`). L'outil n'en dépend donc pas.

## Options étudiées

### Option A : SQLite WASM officiel (sqlite.org)
| Dimension | Évaluation |
|---|---|
| Complexité | Moyenne : l'API « oo1 » est simple ; l'initialisation sans fetch demande une configuration explicite |
| Taille | Environ 1 Mo de WASM (≈ 1,3 Mo en base64) |
| Pérennité | Excellente : maintenu par l'équipe SQLite, au rythme des versions de SQLite |
| Fonctionnalités | STRICT, JSON, déclencheurs, `sqlite3_js_db_export` et `deserialize` disponibles |

**Pour :** source amont, mises à jour de sécurité rapides, version de SQLite récente garantie.
**Contre :** pensé d'abord pour OPFS et les Workers, d'où une configuration à adapter au mode « tout inline » ; API un peu bas niveau.

### Option B : sql.js (Emscripten)
| Dimension | Évaluation |
|---|---|
| Complexité | Faible : `new SQL.Database(bytes)`, `db.export()` |
| Taille | Environ 1 Mo de WASM |
| Pérennité | Bonne, mais projet communautaire avec des versions moins fréquentes, qui peuvent retarder sur SQLite |
| Fonctionnalités | Base mémoire et export natifs : correspond exactement au modèle choisi |

**Pour :** API idéale pour notre cas (mémoire + export) ; facile à inliner (`wasmBinary`).
**Contre :** dépend d'un mainteneur tiers ; il faut vérifier que la version de SQLite embarquée suit les correctifs.

### Option C : wa-sqlite
**Écartée pour la v1.** Il est conçu pour des VFS asynchrones (OPFS, IndexedDB) qui ne nous servent pas. La complexité est inutile.

### Option D : pas de SQL (JSON en mémoire)
**Écartée.** On perdrait les contraintes déclaratives (CHECK, déclencheurs du journal) et le format `.tlpt` ne serait plus
lisible par des outils standards après déchiffrement, ce qui est utile pour l'audit et la réversibilité.

## Analyse des compromis

Les deux options principales sont fonctionnellement équivalentes pour une base mémoire exportée. La différence porte sur la
**maintenance de sécurité** (l'avantage va au build officiel) et la **simplicité d'intégration** (l'avantage va à sql.js).
L'interface `engine/db.ts` rend le choix réversible pour un coût faible. On part donc sur l'amont officiel et on garde sql.js comme repli testé.

Il faut noter que les **déclencheurs** du journal ne sont qu'une protection contre les erreurs du moteur. L'intégrité réelle repose sur
le recalcul de la chaîne de hash et sur l'ancrage externe (EF-6). Le choix du moteur ne change rien au modèle de sécurité.

## Conséquences

- **Plus facile :** contraintes SQL réelles ; schéma testable hors navigateur (déjà fait avec sqlite3 3.51) ; un `.tlpt` déchiffré s'ouvre avec n'importe quel client SQLite.
- **Plus difficile :** environ 1,3 Mo ajoutés au HTML ; initialisation WASM à maîtriser en `file://`.
- **À revoir :** une persistance locale via OPFS, seulement si un jour un mode « poste unique non portable » est demandé (hors besoin actuel).

## Actions

1. [ ] Spike : initialiser le build officiel à partir d'octets inlinés en `file://` sous Chrome, Edge, Firefox et Safari ; charger `tlpt.sql` ; vérifier STRICT, JSON et déclencheurs ; tester export puis réimport.
2. [ ] Même test avec sql.js pour qualifier le repli.
3. [ ] Écrire `engine/db.ts` et ses tests de contrat, que les deux implémentations doivent passer.
4. [ ] Vérifier qu'aucune donnée n'est écrite dans OPFS, IndexedDB ou localStorage (test automatisé qui inspecte le stockage après une session).
5. [ ] Surveiller les avis de sécurité SQLite et mettre la version à jour à chaque release d'openTLPT.

## Résultats du spike (2026-10-19)

Build officiel 3.53.4 instancié depuis des octets inlinés (`wasmBinary`) **sans fetch** sur Chromium, Chrome, Firefox et WebKit. STRICT, JSON, déclencheurs, serialize et deserialize fonctionnent. Les chemins Worker et OPFS sont neutralisés au build par un plugin qui échoue si le code amont change. Le repli sql.js n'a pas été nécessaire. Détails : [spike/README.md](../../spike/README.md).
