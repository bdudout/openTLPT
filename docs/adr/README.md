# Décisions d'architecture (ADR)

| N° | Titre | Statut | Décision en une ligne |
|---|---|---|---|
| [0001](0001-framework-ui.md) | Framework d'interface | Accepté | Svelte 5 + TypeScript ; moteur métier en TS pur, séparé de l'UI |
| [0002](0002-sqlite-wasm.md) | Moteur SQLite dans le navigateur | Accepté | SQLite WASM officiel, base mémoire seulement, sans OPFS ; repli sql.js derrière `engine/db.ts` |
| [0003](0003-kdf-chiffrement.md) | Dérivation de clé et chiffrement | Accepté | Argon2id (64 Mio, t=3, p=1) + AES-256-GCM avec l'en-tête en AAD ; PBKDF2 en lecture seulement |
| [0004](0004-build-fichier-unique.md) | Build en fichier HTML unique | Accepté | Vite + singlefile, WASM inlinés, CSP qui ferme le réseau, build reproductible, budget de 8 Mo |

Contrainte transverse à tous les ADR : **application autoporteuse, aucun droit admin** (ENF-11). Toute option qui demande une installation, une extension, un serveur local ou un réglage système est écartée d'office.

Le **spike commun** du 2026-10-19 est concluant sur Chromium, Chrome, Firefox et WebKit ([spike/README.md](../../spike/README.md)). La **CI Windows** valide Chromium, Firefox, Edge et **Edge StrictMode** (10/10, Argon2 ≈ 4 s en StrictMode). Les quatre ADR sont **acceptés** depuis le 2026-10-19. Il reste une action ouverte : faire tester un compte standard sur un vrai poste d'entreprise.

Format : contexte, décision, options étudiées, compromis, conséquences, actions. Un ADR accepté ne se modifie pas : on le
**remplace** par un nouvel ADR (statut *Superseded*).
