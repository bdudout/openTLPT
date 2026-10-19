# @opentlpt/engine

Moteur métier d'openTLPT en **TypeScript pur** : aucune dépendance d'exécution, aucune horloge, aucune E/S (ADR-0001).
L'interface l'importe, et lui n'importe jamais l'interface.

- `dates.ts` : arithmétique de dates calendaires en UTC (mois ramenés en fin de mois, 29 février, jours ouvrés du lundi au vendredi).
- `applicability.ts` : évaluation des conditions `applies_when` sur les faits de l'exercice.
- `deadlines.ts` : calcul des échéances `max`, `min`, `before` et `recurring` du pack core, surcharges justifiées, cohérence de la chronologie.

Règles : [MODELE_DONNEES §1.5](../docs/MODELE_DONNEES.md). Les tests chargent le **vrai** `referentiel/packs/core.json` :
si un délai change dans le référentiel, les tests le signalent.

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
