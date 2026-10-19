# openTLPT — application (fichier HTML unique)

Interface Svelte 5 + TypeScript (ADR-0001), construite en **un seul fichier** `dist/index.html` (ADR-0004).
On l'ouvre par double-clic, sans installation, sans réseau et sans droits admin (ENF-11).

Fonctions de cette première version :
- **création** d'un exercice : nom de code, rôle, auteur, passphrase d'au moins 14 caractères, avec confirmation explicite qu'aucune récupération n'est possible ;
- **ouverture** d'un fichier `.tlpt`. L'intégrité du journal est vérifiée, une rupture déclenche une alerte, et un fichier PBKDF2 sera réécrit en Argon2id ;
- **calendrier des échéances réglementaires**, calculé par le moteur à partir des dates de la chronologie et des caractéristiques de l'exercice, avec une alerte si la chronologie est incohérente ;
- **checklists par phase** (onglet dédié) :
  - deux colonnes séparées : *Obligations DORA / RTS*, qui comptent dans la progression, et *Bonnes pratiques TIBER*, signalées comme non contraignantes ;
  - filtrage par rôle et par caractéristiques de l'exercice ; TIBER-FR n'apparaît que si la déclinaison nationale est choisie ;
  - statuts : à traiter, en cours, traité, non applicable (justification), écart accepté (justification + décideur) ;
  - chaque réponse est journalisée ;
  - les divergences TIBER / RTS sont signalées des deux côtés ;
- **enregistrement** : écriture directe via la File System Access API (Chrome, Edge), avec contrôle des conflits (DEC-1). Sinon, l'enregistrement produit un téléchargement (Firefox, Safari) ;
- **verrouillage** : la clé et la base sont retirées de la mémoire ;
- **FR / EN**.

```bash
(cd ../engine && npm ci) && npm ci
```

```bash
npm run build
```

```bash
npm run check
```

```bash
npm run test:e2e
```

Le test E2E ouvre `dist/index.html` en `file://` dans Chromium, Firefox et WebKit. Il couvre la création, la saisie, l'enregistrement,
le verrouillage, la réouverture par un autre auteur, la mauvaise passphrase et la bascule FR / EN, et vérifie qu'il n'y a aucune requête réseau ni erreur console.

Pas encore couvert : registres (leg-ups, détections, rapports hebdomadaires), livrables, surcharges dans l'interface, verrouillage automatique après inactivité.
