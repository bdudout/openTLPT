# ADR-0003 : Dérivation de clé et chiffrement du fichier `.tlpt`

**Statut :** Proposé — spike du 2026-10-19 concluant, en attente d'acceptation
**Date :** 2026-10-19
**Décideurs :** porteur du projet openTLPT (avec revue sécurité recommandée avant la v1)

## Contexte

Un `.tlpt` contient des informations **très sensibles** : périmètre, *flags*, détections, nom réel de l'entité (facultatif).
Il **circule** sur clé USB, par mail ou sur un partage réseau (DEC-4). S'il fuit vers la blue team, le TLPT perd sa valeur et
risque de ne pas obtenir l'attestation (RTS 5(2)(b)). Le seul secret est une **passphrase** saisie par l'utilisateur.
La menace principale est donc une **attaque hors ligne par dictionnaire** sur un fichier volé. Le coût de la dérivation de clé
est la défense déterminante.

Contraintes :
- tout se passe dans le navigateur, hors ligne ;
- **WebCrypto** est disponible nativement pour AES-GCM, PBKDF2 et SHA-256, mais **pas pour Argon2** ;
- un temps d'ouverture acceptable sur un poste bureautique, de l'ordre d'une seconde ;
- les paramètres doivent pouvoir évoluer sans casser les anciens fichiers.

## Décision

1. **KDF : Argon2id** via une implémentation WASM auditée et figée (candidate : `hash-wasm`, à confirmer au spike).
   - Paramètres par défaut : **m = 64 Mio, t = 3, p = 1**, sortie de 32 octets, **sel aléatoire de 16 octets**.
   - Plancher absolu : m = 19 Mio, t = 2. C'est le minimum OWASP, utilisé seulement si le poste ne supporte pas 64 Mio.
   - Les paramètres effectifs sont **écrits dans l'en-tête** (`kdf`). On peut donc les renforcer plus tard sans casser les anciens fichiers.
2. **Chiffrement : AES-256-GCM** (WebCrypto). La clé est importée **non extractible**. L'**IV aléatoire de 96 bits est renouvelé à chaque enregistrement**.
   L'**en-tête sans `payload`, sérialisé en JSON canonique, sert d'AAD**. Toute altération de `file_version` ou des paramètres fait donc échouer le déchiffrement.
3. **Lecture de PBKDF2-SHA256** (≥ 600 000 itérations) prévue dans le format (`kdf.alg`), **sans être utilisée pour l'écriture**.
   Elle sert de solution de secours documentée si le WASM Argon2 posait un problème bloquant sur un poste.
4. **Hygiène :**
   - la passphrase n'est jamais conservée : seule la `CryptoKey` non extractible reste en mémoire pendant la session ;
   - **verrouillage automatique** après inactivité, 15 min par défaut et réglable, avec effacement de la base en mémoire ;
   - politique de passphrase : **au moins 14 caractères**, avec un indicateur de robustesse local (pas de bibliothèque lourde) et une suggestion de phrase de 5 mots ou plus ;
   - changer de passphrase tire un nouveau sel, rechiffre le fichier et ajoute une entrée au journal ;
   - **aucune récupération possible** : l'interface l'annonce à la création, et l'utilisateur doit le confirmer explicitement.

## Options étudiées

### Option A : PBKDF2-HMAC-SHA256 natif (WebCrypto)
| Dimension | Évaluation |
|---|---|
| Complexité | Très faible : natif, zéro dépendance |
| Résistance | Moyenne : non *memory-hard*, donc parallélisable à bas coût sur GPU ou ASIC |
| Taille | 0 Ko |
| Auditabilité | Excellente (implémentation du navigateur) |

**Pour :** aucune dépendance, aucune surface de chaîne d'approvisionnement.
**Contre :** à coût égal pour l'utilisateur, l'attaquant équipé de GPU va beaucoup plus vite. C'est faible pour un fichier dont la fuite est critique.

### Option B : Argon2id en WASM
| Dimension | Évaluation |
|---|---|
| Complexité | Faible : un appel de fonction, un module WASM de quelques dizaines de Ko |
| Résistance | Élevée : *memory-hard*, c'est le choix recommandé par l'OWASP et le RFC 9106 |
| Taille | Environ 20 à 40 Ko inlinés |
| Auditabilité | Bonne si on fige la version et qu'on contrôle les vecteurs de test RFC 9106 |

**Pour :** l'état de l'art face aux attaques hors ligne.
**Contre :** une dépendance de plus, à figer et à vérifier ; la consommation mémoire doit tenir sur les postes modestes.

### Option C : scrypt en WASM
**Écartée.** Il est *memory-hard* lui aussi, mais Argon2id est la recommandation actuelle et son paramétrage est plus clair.

## Analyse des compromis

Le coût de l'option B tient en **une petite dépendance WASM**. Le gain est un facteur important de résistance aux attaques par
dictionnaire, ce qui est déterminant quand la confidentialité du test est une **exigence réglementaire** (RTS 4(2)(d), 5(2)(b)).
On retient B. Le format reste **agile** grâce au champ `kdf.alg` et à la lecture de PBKDF2.

AES-GCM est natif, rapide et authentifié. Avec un IV aléatoire de 96 bits, la limite de sécurité (environ 2³² chiffrements par clé)
est hors d'atteinte pour un fichier enregistré quelques milliers de fois. En plus, la clé change à chaque changement de passphrase.

## Conséquences

- **Plus facile :** argumenter la confidentialité du `.tlpt` auprès d'un RSSI ou d'une autorité ; renforcer les paramètres plus tard.
- **Plus difficile :** l'ouverture prend environ 1 s, ce qui est voulu ; il faut tester sur des postes à faible mémoire ; une dépendance de plus à surveiller.
- **À revoir :** les paramètres Argon2id à chaque version majeure, d'après les recommandations OWASP ; une option de clé matérielle (WebAuthn PRF ou passkey) pour remplacer ou compléter la passphrase.

## Actions

1. [ ] Spike : mesurer le temps d'Argon2id (64 Mio, t=3) sur un poste bureautique de référence et sur un poste modeste ; calibrer les paramètres par défaut.
2. [ ] Vérifier l'implémentation WASM contre les **vecteurs de test du RFC 9106** dans la CI.
3. [ ] Mettre à jour MODELE_DONNEES §2.1 et ENF-3 : `kdf.alg = "argon2id"` avec `m`, `t`, `p` et `salt`.
4. [ ] Tests : en-tête altéré, rejet ; mauvaise passphrase, erreur générique sans oracle ; IV jamais réutilisé sur 10 000 enregistrements.
5. [ ] Revue de sécurité externe du module `engine/crypto.ts` avant la v1.0.

## Résultats du spike (2026-10-19)

hash-wasm 4.12.0 Argon2id (64 Mio, t=3, p=1) donne **exactement** le vecteur de l'implémentation de référence (argon2-cffi), en 215 à 588 ms selon le navigateur sur Mac. L'enveloppe AES-256-GCM avec l'en-tête en AAD rejette un en-tête altéré et une mauvaise passphrase. Reste à faire : le calibrage sur un poste Windows de référence, et peut-être un durcissement des paramètres. Détails : [spike/README.md](../../spike/README.md).
