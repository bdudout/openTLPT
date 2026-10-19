# Spike technique commun (ADR-0001 à ADR-0004) — 2026-10-19

Objectif : vérifier qu'un **fichier HTML unique**, ouvert en `file://` sans droits admin (ENF-11), peut embarquer
Svelte, SQLite WASM, Argon2id et le référentiel, sans accès réseau.

## Lancer

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run test:browsers
```

Le build produit `dist/index.html`, un fichier unique **sans aucun fichier annexe**. Le banc d'essai s'exécute à l'ouverture de la page,
et `tests/run-browsers.mjs` l'ouvre en `file://` dans chaque moteur.

Versions figées, toutes publiées au moins deux semaines avant le spike : svelte 5.57.1, vite 8.3.2, @sveltejs/vite-plugin-svelte 7.3.1,
vite-plugin-singlefile 2.3.3, @sqlite.org/sqlite-wasm 3.53.4-build2 (SQLite 3.53.4), hash-wasm 4.12.0, playwright 1.63.0.

## Résultats (macOS, Apple Silicon)

| Test | Chromium 155 | Chrome 155 | Firefox 155 | WebKit 26.6 (Safari) |
|---|---|---|---|---|
| `file://` en contexte sécurisé, `crypto.subtle` présent | ✅ | ✅ | ✅ | ✅ |
| SQLite WASM instancié depuis des octets inlinés, sans `fetch` | ✅ 72 ms | ✅ 90 ms | ✅ 95 ms | ✅ 141 ms |
| `tlpt.sql` : STRICT, `json_valid`, CHECK de justification | ✅ | ✅ | ✅ | ✅ |
| Journal chaîné (SHA-256 + JCS), UPDATE / DELETE bloqués, chaîne vérifiée | ✅ | ✅ | ✅ | ✅ |
| Export puis réimport de la base (serialize / deserialize) | ✅ | ✅ | ✅ | ✅ |
| Argon2id 64 Mio / t=3 / p=1 = vecteur de référence (argon2-cffi) | ✅ 215 ms | ✅ 230 ms | ✅ 588 ms | ✅ 237 ms |
| Enveloppe AES-256-GCM, en-tête en AAD ; en-tête altéré et mauvaise passphrase rejetés | ✅ | ✅ | ✅ | ✅ |
| Référentiel inliné (155 items, 14 délais) | ✅ | ✅ | ✅ | ✅ |
| Aucune requête hors `file:` / `data:` / `blob:` ; `fetch` externe bloqué par la CSP | ✅ | ✅ | ✅ | ✅ |
| Rien dans localStorage ni IndexedDB | ✅ | ✅ | ✅ | ✅ |
| File System Access API | présente | présente | absente → téléchargement ✅ | absente → téléchargement ✅ |

- **Taille** : `dist/index.html` = **2,73 Mo**, dont environ 1,16 Mo pour le WASM SQLite en base64. Le budget de 8 Mo laisse de la place pour les extraits officiels en 24 langues.
- **Reproductibilité** : deux builds propres donnent le même SHA-256 (`27aac5fb8bdc0c561892d78f8270b907fa87ae501d414eaf08306ef3c3fbd747`).
- **Erreurs console** : uniquement celles qui sont attendues, c'est-à-dire le `fetch` vers example.com bloqué par la CSP. Aucune autre.

## Écarts trouvés et traités

1. **Vite 8 ne sait pas inliner un `.wasm` via `?inline`.** J'ai ajouté le plugin `opentlpt-inline-sqlite-wasm`, qui expose le binaire en base64 comme module virtuel.
2. **sqlite-wasm contient des chemins Worker et OPFS** (`sqlite3Worker1Promiser`, proxy OPFS). Vite les extrayait dans un fichier `.js` séparé.
   Le plugin `opentlpt-strip-sqlite-workers` les neutralise. Il **échoue au build** si les motifs disparaissent, ce qui force une revue à chaque montée de version.
   C'est cohérent avec ADR-0002, qui exclut OPFS et les Workers.

## Risque identifié : postes sans JIT (Edge « sécurité renforcée »)

Les postes d'entreprise peuvent activer la politique Edge **EnhanceSecurityMode**, qui désactive le JIT JavaScript.
D'après Microsoft, WebAssembly passe alors par un **interpréteur** plus lent, et n'est **pas pris en charge sur les systèmes 32 bits**.

Simulations sur ce Mac (Chromium 155, Playwright) :

| Configuration | Résultat |
|---|---|
| Normale | 10/10 ✅ |
| `--js-flags=--jitless` (V8 sans JIT, pire cas : WebAssembly absent) | **6 tests en échec** (SQLite, Argon2, AES dépendant d'Argon2) |
| `--jitless --wasm-jitless` (tentative d'interpréteur WASM) | identique : ce build Chromium n'embarque pas l'interpréteur d'Edge, donc non concluant |
| Optimiseurs JS désactivés (`--no-opt --no-sparkplug --no-maglev`) | 10/10 ✅ (AES + Argon2 : 1,6 s) |

Conclusion : **impossible de valider le comportement réel d'Edge en mode renforcé depuis macOS.** Parades retenues :
1. **Détection** au démarrage : si `WebAssembly` est absent, afficher un message clair (pas de page blanche) qui explique la cause et liste les solutions sans droits admin.
2. **Test réel** dans la CI Windows (GitHub Actions `windows-latest` : Edge préinstallé, politique `EnhanceSecurityMode=StrictMode` posée dans le registre du runner).
3. Décision à prendre si l'interpréteur est trop lent ou absent : un repli PBKDF2 natif (WebCrypto, non concerné par le JIT) en écriture, et/ou une exception à demander à la DSI (liste de contournement Edge).

## Reste à vérifier (hors de portée de ce poste)

- [ ] **Windows, Microsoft Edge, compte utilisateur standard sans droits admin** : pas de poste Windows disponible. Le test se fera dans la CI Windows (voir ci-dessus), puis auprès d'un bêta-testeur sur un vrai poste bancaire avec ses GPO.
- [ ] **Edge en mode de sécurité renforcée (StrictMode)** : WebAssembly interprété ; mesurer les temps d'ouverture et d'enregistrement.
- [ ] **Sélecteur natif de la File System Access API** (Chrome / Edge) : enregistrer puis rouvrir un `.tlpt` à la main. Cette étape n'est pas automatisable en headless.
- [ ] **Calibrage d'Argon2id** sur un portable Windows de bureau. Sur ce Mac, il prend 0,2 à 0,6 s, ce qui laisse de la marge pour durcir les paramètres (t=4 ou m=128 Mio) si le poste de référence le permet.
