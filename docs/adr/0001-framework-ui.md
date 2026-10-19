# ADR-0001 : Framework d'interface

**Statut :** Accepté (2026-10-19), après le spike et la CI Windows. Action ouverte : test sur un compte standard, sur un vrai poste d'entreprise.
**Date :** 2026-10-19
**Décideurs :** porteur du projet openTLPT

## Contexte

L'interface tient dans **un seul fichier HTML** (ENF-1) ouvert localement, sans serveur ni réseau. Elle doit :
- servir des écrans surtout **formulaires et tableaux** : checklists par phase, calendrier des échéances, registres (leg-ups, détections), annuaire, livrables, journal ;
- être **bilingue FR/EN en v1** et extensible aux 24 langues par fichiers i18n, sans recompiler la logique (EF-7) ;
- respecter le **RGAA / WCAG 2.1 AA** (ENF-6) ;
- rester **légère** : le budget du fichier est déjà occupé par SQLite WASM (environ 1 Mo) et les textes officiels (2 à 4 Mo) ;
- être **facile à reprendre par des contributeurs** d'un projet open source sous Apache-2.0, souvent profils cyber/GRC plutôt que front-end ;
- limiter la **surface de chaîne d'approvisionnement** : peu de dépendances, toutes figées.

## Décision

**Svelte 5 + TypeScript**, compilé par Vite. Pas de bibliothèque de composants tierce : un petit jeu de composants maison
(champ, tableau, badge Obligation / Bonne pratique, boîte de dialogue) conçu pour l'accessibilité.
i18n : un dictionnaire JSON par langue, chargé au démarrage, avec une fonction `t(key)` maison. Pas de bibliothèque i18n.

## Options étudiées

### Option A : Svelte 5 + TypeScript
| Dimension | Évaluation |
|---|---|
| Complexité | Faible : composants proches du HTML, réactivité intégrée (*runes*) |
| Taille | Très faible : compilé, sans DOM virtuel, de l'ordre de quelques dizaines de Ko pour l'appli |
| Pérennité | Bonne : projet mûr, large communauté |
| Accessibilité | Avertissements a11y **à la compilation** |
| Familiarité | Moyenne, mais courbe d'apprentissage courte |

**Pour :** sortie minimale, adaptée au fichier unique ; syntaxe lisible par des non-spécialistes ; contrôles a11y intégrés ; peu de dépendances.
**Contre :** écosystème plus petit que React ; Svelte 5 a changé de modèle (*runes*), donc une partie de la documentation en ligne est obsolète.

### Option B : Preact + TypeScript (API React)
| Dimension | Évaluation |
|---|---|
| Complexité | Moyenne : JSX, hooks |
| Taille | Très faible (environ 4 Ko de runtime) |
| Pérennité | Bonne |
| Accessibilité | Pas de contrôle intégré : il faut un linter (eslint-plugin-jsx-a11y) |
| Familiarité | Élevée : API React, très répandue |

**Pour :** vivier de contributeurs React ; runtime minuscule.
**Contre :** compatibilité partielle avec l'écosystème React, qui pousse à des contournements (`preact/compat`) ; plus de code répétitif pour les formulaires.

### Option C : Vanilla TS + Web Components (Lit)
| Dimension | Évaluation |
|---|---|
| Complexité | Élevée pour un écran riche : gestion d'état manuelle |
| Taille | Minimale |
| Pérennité | Excellente (standards du web) |
| Accessibilité | Le Shadow DOM complique certains schémas ARIA et les tests |
| Familiarité | Faible pour ce type d'appli |

**Pour :** aucune dépendance de framework, durée de vie maximale.
**Contre :** beaucoup de code d'infrastructure ; risque d'incohérences ; contribution plus difficile.

### Option D : React 19
**Écartée.** Le runtime (environ 50 Ko compressé avec react-dom) n'apporte rien ici, et l'écosystème encourage à ajouter des dépendances.

## Analyse des compromis

Le critère qui tranche est **taille + lisibilité + a11y intégrée**. Svelte gagne sur les trois.
Preact est l'alternative crédible si le vivier de contributeurs React devient prioritaire. L'architecture le permet :
le **moteur métier** (calcul des échéances, applicabilité, journal, crypto, accès SQLite) est écrit en **TypeScript pur,
sans dépendance UI** et testé à part. Changer de framework ne toucherait que la couche de présentation.

## Conséquences

- **Plus facile :** budget de taille tenu ; formulaires et tableaux rapides à écrire ; a11y contrôlée dès le build.
- **Plus difficile :** recruter des contributeurs Svelte ; ne pas mélanger syntaxe Svelte 4 et Svelte 5.
- **À revoir :** le choix si l'écosystème Svelte s'essouffle, ou si un framework plus standard (Web Components) devient compétitif pour les formulaires.

## Actions

1. [ ] Spike : écran checklist avec badges Obligation / Bonne pratique, bascule FR/EN, contrôle avec un lecteur d'écran (NVDA ou VoiceOver).
2. [ ] Créer le paquet `engine/` (TS pur) séparé de `ui/`, avec la règle d'import : `ui` → `engine`, jamais l'inverse.
3. [ ] Figer la version exacte de Svelte dans le lockfile, avec une version publiée depuis au moins deux semaines.
4. [ ] Ajouter `svelte-check` et les avertissements a11y en **erreurs** dans la CI.

## Résultats du spike (2026-10-19)

Svelte 5.57.1 compilé et inliné : l'appli de test (tableau, badges, bascule FR/EN) s'affiche correctement en `file://` sur les 4 navigateurs testés. Le poids de l'UI est négligeable devant SQLite. Reste à faire : l'audit a11y avec un lecteur d'écran. Détails : [spike/README.md](../../spike/README.md).
