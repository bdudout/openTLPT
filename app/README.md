# openTLPT — application (fichier HTML unique)

Interface Svelte 5 + TypeScript (ADR-0001), construite en **un seul fichier** `dist/index.html` (ADR-0004).
On l'ouvre par double-clic, sans installation, sans réseau et sans droits admin (ENF-11).

Fonctions de cette première version :
- **tableau de bord** (accueil d'un exercice) : bandeau d'identité, KPI du TLPT, actions de la semaine, actions à préparer en amont et jalons à dater, frise des phases, conformité par étape avec accès direct aux checklists, alertes, ancrage du journal ;
- **création** d'un exercice : nom de code, rôle, auteur, passphrase d'au moins 14 caractères, avec confirmation explicite qu'aucune récupération n'est possible ;
- **ouverture** d'un fichier `.tlpt`. L'intégrité du journal est vérifiée, une rupture déclenche une alerte, et un fichier PBKDF2 sera réécrit en Argon2id ;
- **calendrier des échéances réglementaires**, calculé par le moteur à partir des dates de la chronologie et des caractéristiques de l'exercice, avec une alerte si la chronologie est incohérente ;
- **exigences (conformité globale)** : matrice unique des obligations, avec synthèse, recherche et filtres, exigences hors périmètre motivées, export CSV et impression ou PDF journalisés ;
- **checklists de conformité** (onglet dédié) :
  - **socle permanent** : les points valables pour tout l'exercice, regroupés par thème avec leur propre progression ;
  - **un onglet par phase** pour les points à assurer au fil du test ;
  - un résumé global « Socle · Au fil du test · Total » ;
  - deux colonnes séparées : *Obligations DORA / RTS*, qui comptent dans la progression, et *Bonnes pratiques TIBER*, signalées comme non contraignantes ;
  - filtrage par rôle et par caractéristiques de l'exercice ; TIBER-FR n'apparaît que si la déclinaison nationale est choisie ;
  - statuts : à traiter, en cours, traité, non applicable (justification), écart accepté (justification + décideur) ;
  - chaque réponse est journalisée ;
  - les divergences TIBER / RTS sont signalées des deux côtés ;
- **livrables attendus** (onglet dédié) :
  - filtrés par rôle et par caractéristiques, chacun avec les échéances qui le ciblent ;
  - suivi : statut, version, emplacement, dates de remise et d'approbation ;
  - **empreinte SHA-256 calculée sur le poste** : le document n'est jamais copié. On peut ensuite vérifier qu'un fichier est conforme ou différent ;
  - la date de remise vaut réalisation de l'échéance, sauf si une date est saisie à la main ;
  - livrables libres possibles ;
- **registres** (onglet dédié) :
  - rapports hebdomadaires, qui alimentent D-07, avec l'empreinte du fichier en option ;
  - leg-ups, avec alerte RTS 11(8) si un leg-up non prévu est fourni sans double approbation ;
  - détections, suspensions et purple teaming limité, avec alerte RTS 11(9) / 11(10) tant que les test managers n'ont pas validé, et signalement d'un incident réel ;
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

Pas encore couvert : annuaire des parties prenantes et évaluation des prestataires (art. 27), scénarios, changements du plan de test, surcharges dans l'interface, verrouillage automatique après inactivité.
