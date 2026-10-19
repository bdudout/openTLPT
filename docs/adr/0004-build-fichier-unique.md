# ADR-0004 : Build en fichier HTML unique

**Statut :** Accepté (2026-10-19), après le spike et la CI Windows. Action ouverte : test sur un compte standard, sur un vrai poste d'entreprise.
**Date :** 2026-10-19
**Décideurs :** porteur du projet openTLPT

## Contexte

openTLPT est distribué sous la forme d'**un seul fichier `openTLPT.html`** (ENF-1), ouvert par double-clic (`file://`).
Il ne fait aucun appel réseau et n'envoie aucune télémétrie. On peut le copier sur une clé USB avec les fichiers `.tlpt`. Ce fichier doit embarquer :
l'appli Svelte (ADR-0001), SQLite WASM (ADR-0002), Argon2id WASM (ADR-0003), le référentiel JSON (DEC-2) et les extraits
officiels en 24 langues (EF-7).
L'application doit être **autoporteuse et utilisable sans aucun droit administrateur** (ENF-11) : rien à installer,
pas d'extension, pas de serveur local, aucun réglage du navigateur ou de l'OS à modifier.
Les utilisateurs (PMO, RSSI) doivent pouvoir **vérifier qu'ils ont la bonne version** (ENF-5). La publication passera par un dépôt GitHub une fois le MVP prêt.

## Décision

1. **Vite + `vite-plugin-singlefile`** : JS et CSS sont inlinés dans le HTML. Les **WASM et le référentiel** sont importés comme ressources
   inlinées (`?inline` / base64 pour les WASM, JSON importé pour les packs), puis instanciés à partir des octets, **sans `fetch`**.
2. **CSP stricte en `<meta>`**, qui ferme le réseau par construction :
   `default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'`.
   Un test de CI vérifie que la page ne tente **aucune** requête réseau.
3. **Build reproductible** : lockfile figé, `npm ci`, versions exactes, `SOURCE_DATE_EPOCH`, aucun horodatage ni chemin absolu dans la sortie.
   Deux builds du même commit doivent donner le **même SHA-256**, et la CI le vérifie.
4. **Vérification par l'utilisateur** : chaque release publie le **SHA-256** du HTML. La version, la version du référentiel et le hash sont affichés
   dans « À propos » et inscrits dans le journal à chaque session. Une **signature** (Sigstore ou minisign) est à prévoir avec la publication GitHub.
5. **Budget de taille** : **8 Mo au plus** pour le HTML, avec une alerte en CI au-delà de 6 Mo. Répartition estimée :
   appli < 0,3 Mo, SQLite environ 1,3 Mo en base64, Argon2 < 0,1 Mo, référentiel environ 0,3 Mo, extraits en 24 langues 2 à 4 Mo (compressés si nécessaire, cf. actions).
6. **Mode dégradé sans File System Access API** (Firefox, Safari) : ouverture par `<input type=file>` et enregistrement par téléchargement d'un nouveau
   `.tlpt` (ENF-4). Le contrôle de version (DEC-1) se fait alors à la réouverture. L'utilisateur est clairement prévenu.

## Options étudiées

### Option A : Vite + vite-plugin-singlefile
| Dimension | Évaluation |
|---|---|
| Complexité | Faible : configuration standard, support Svelte natif |
| Maîtrise de la sortie | Bonne, avec quelques ajustements pour inliner les WASM |
| Pérennité | Bonne : Vite est l'outil par défaut de l'écosystème Svelte |

**Pour :** chaîne standard, documentation abondante, rechargement à chaud en développement.
**Contre :** le plugin singlefile est une dépendance tierce de plus ; l'inlining des WASM est à valider.

### Option B : esbuild + script d'assemblage maison
| Dimension | Évaluation |
|---|---|
| Complexité | Moyenne : script d'inlining à écrire et maintenir |
| Maîtrise de la sortie | Totale, ce qui facilite la reproductibilité |
| Pérennité | Bonne (esbuild), mais le script est à notre charge |

**Pour :** sortie déterministe et lisible ; peu de dépendances.
**Contre :** on réinvente l'intégration Svelte, le développement et les tests.

### Option C : application de bureau (Electron / Tauri)
**Écartée.** Elle exige une installation, et donc souvent des droits admin, contraire à ENF-11. Elle produit un binaire par OS, plus difficile à vérifier,
et s'éloigne du besoin de portabilité « un fichier ».

### Option D : HTML + ressources à côté (dossier)
**Écartée.** Les navigateurs bloquent souvent le chargement de WASM ou de JSON voisins en `file://`, et un dossier se disperse facilement.

## Analyse des compromis

L'option A donne le meilleur rapport entre simplicité et risque. La **reproductibilité**, qui serait l'avantage de B, s'obtient aussi avec A par des
réglages et une vérification en CI. Si la sortie de Vite se montre non déterministe ou trop difficile à inliner, on bascule sur B
sans toucher au code applicatif.

Le choix du **`file://`** a des implications à vérifier au spike. WebCrypto (`crypto.subtle`) et la File System Access API exigent un
*contexte sécurisé*. Chromium traite `file://` comme tel, mais le comportement exact (autorisations, `showSaveFilePicker`) varie selon
les navigateurs et les politiques d'entreprise (GPO).

## Conséquences

- **Plus facile :** distribution par simple copie ; vérification par hash ; absence de réseau garantie par la CSP et testée.
- **Plus difficile :** taille du fichier ; mises à jour manuelles, puisque l'utilisateur doit remplacer son HTML ; comportement `file://` variable selon les navigateurs et les GPO.
- **À revoir :** le chargement **paresseux** des extraits officiels (ne décompresser que la langue choisie) si le budget est dépassé ; la signature des releases au passage sur GitHub. **Pas de variante « servie en local »** (serveur sur le poste) : elle contredirait ENF-11. Si une GPO bloque une API en `file://`, la réponse est le mode dégradé, pas un serveur.

## Actions

1. [ ] **Spike unique** couvrant ADR-0001 à ADR-0004 : HTML minimal (Svelte, SQLite inliné, Argon2 inliné, un pack) ouvert en `file://` sous Chrome, Edge, Firefox et Safari.
   À vérifier : `crypto.subtle` disponible ; `showOpenFilePicker` et `showSaveFilePicker` (Chromium) ; mode dégradé (Firefox, Safari) ; CSP sans violation ; aucune requête réseau ; test avec une GPO restrictive si possible ; **test sur un compte utilisateur standard, sans droits admin**, sur un poste Windows d'entreprise (Edge).
2. [ ] Script `tools/check_reproducible.sh` : deux builds propres doivent donner le même SHA-256.
3. [ ] Test de taille en CI (alerte à 6 Mo, échec à 8 Mo).
4. [ ] Mesurer la taille réelle des extraits en 24 langues. Si nécessaire, les compresser (`CompressionStream` gzip, natif) et ne décompresser que la langue active.
5. [ ] À la création du dépôt GitHub (après le MVP) : workflow de release qui publie le HTML, son SHA-256 et sa signature.

## Résultats du spike (2026-10-19)

Fichier unique de 2,73 Mo sans fichier annexe, **build reproductible** (SHA-256 identique sur deux builds). La CSP bloque tout réseau et aucune requête n'est observée. Le mode dégradé par téléchargement fonctionne sous Firefox et WebKit. Reste à faire : le test Windows / Edge sur un compte standard, et le test manuel du sélecteur natif de la FSA API. Détails : [spike/README.md](../../spike/README.md).

**Risque R-JIT, levé en grande partie par la CI Windows** : Edge 154 en StrictMode passe 10/10, avec un WASM interprété environ 15 fois plus lent. Constat initial : la politique Edge `EnhanceSecurityMode` désactive le JIT. WebAssembly passe alors par un interpréteur plus lent, et n'est pas supporté en 32 bits.
Une simulation `--jitless` (sans WebAssembly) fait échouer SQLite et Argon2. Parades : détecter l'absence de WASM et afficher un message explicite ;
tester dans la CI Windows avec Edge en StrictMode ; décider si besoin d'un repli PBKDF2 natif (amendement de l'ADR-0003).
Il reste à faire tester un compte standard sur un vrai poste avec ses GPO, par un bêta-testeur.
