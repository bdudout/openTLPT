# openTLPT

**Outil open source, local et portable, pour piloter la conformité d'un exercice TLPT au sens de DORA, de la notification à l'attestation.**

*Open-source, local and portable tool to track compliance of a DORA Threat-Led Penetration Test (TLPT), from notification to attestation.*

> ⚠️ **Préversion 0.1.** L'outil est utilisable pour essai. Il ne remplace ni les textes officiels, ni les échanges avec votre autorité TLPT (voir [Avertissement](#avertissement)).
> Le fichier `openTLPT.html` de chaque build est téléchargeable dans les artefacts de la [CI](../../actions).

---

## À quoi sert openTLPT ?

Un TLPT (*threat-led penetration test*) DORA dure de 12 à 18 mois. Il enchaîne des délais réglementaires stricts, des validations
de l'autorité, des livrables au contenu imposé et des exigences sur les prestataires. Il implique plusieurs équipes, dont l'une
(la *blue team*) ne doit rien savoir. openTLPT aide le **PMO ou le Control Team Lead** à :

1. **Savoir à tout moment ce qui est exigé**, et le distinguer de ce qui est seulement recommandé.
   Les obligations (DORA et RTS 2025/1190) et les bonnes pratiques (TIBER-EU, TIBER-FR…) sont **toujours séparées**.
2. **Ne rater aucune échéance** : les délais du RTS sont calculés à partir des dates réelles de l'exercice.
3. **Se poser les bonnes questions au bon moment** : une checklist par phase, filtrée selon votre rôle et les caractéristiques de l'exercice.
4. **Garder une trace opposable** : chaque action est inscrite dans un journal chaîné par SHA-256 dont on peut prouver l'intégrité. Les livrables sont suivis par leur empreinte.
5. **Protéger le secret du test** : un exercice = un fichier chiffré désigné par son **nom de code**, qui ne quitte jamais le poste.

**Pour qui ?**

| Profil | Ce qu'il voit |
|---|---|
| **Entité financière** (PMO, Control Team Lead) | Tout le parcours : périmètre, prestataires, échéances, livrables, registres |
| **Prestataire de threat intelligence (TI)** | Ses obligations : compétences, références, séparation des équipes, TTIR, restauration… |
| **Prestataire red team (RT)** | Ses obligations : équipe, références, plan de test, rapports hebdomadaires, rapport RT, restauration… |
| **Prestataire TI + RT** | L'union des deux, avec les exigences de séparation des équipes (RTS 7(1)(e)(v) et (f)(v)) |

## Ce que l'outil suit : deux familles de points de conformité

Les **92 obligations** du référentiel (DORA art. 26-27 et RTS 2025/1190) sont classées en deux familles.
La liste complète, générée depuis le référentiel, se trouve dans **[docs/POINTS_DE_CONFORMITE.md](docs/POINTS_DE_CONFORMITE.md)**.

### A. Points de conformité permanents (le socle) — 47 obligations

Ils **valent pour tout l'exercice**, quel que soit le calendrier. On les établit au cadrage, puis on les **revérifie à chaque
changement** : nouveau prestataire, modification du périmètre, recours à des testeurs internes, incident.

| Thème | Exemples | Références |
|---|---|---|
| Assujettissement, fréquence, périmètre | TLPT au moins tous les 3 ans ; FCI en production ; systèmes TIC sous-jacents, y compris externalisés | DORA 26(1)-(2), RTS 2 |
| Prestataires TIC tiers, test mutualisé, maîtrise des risques | Participation des prestataires TIC tiers ; accord écrit de test mutualisé ; contrôles contre l'impact sur les FCI | DORA 26(3)-(5) |
| Testeurs internes ou externes | Externes au moins un test sur trois ; établissements « significant » : externes uniquement ; politique et équipe interne | DORA 26(8), 27(2), RTS 15 |
| Exigences sur les prestataires | Aptitude, certification, assurance ; 3 références (TI) et 5 (RT) ; expérience de l'équipe ; séparation TI / RT ; activités interdites | DORA 27, RTS 7 |
| Organisation et confidentialité | Control Team Lead ; besoin d'en connaître ; consultation des TM avant d'impliquer la blue team ; nom de code | RTS 4 |
| Gestion des risques du TLPT | Analyse des risques du test en production, revue tout au long du test, risques minimaux à couvrir | RTS 5, 6 |
| TLPT communs, mutualisés, transfrontières | Chaque entité suit les étapes ; autorité chef de file ; autorités d'accueil | RTS 8, 16 |

### B. Points de conformité au fil du test — 45 obligations

Ce sont les **étapes datées, les livrables et les validations** à obtenir **phase par phase**. L'outil les présente au moment où
ils se posent, et calcule les délais.

| Phase | Ce dont il faut s'assurer | Échéances calculées |
|---|---|---|
| **Préparation** | Informations d'initiation (charte, CTL, nom de code) ; constitution et validation du CT ; SSD approuvé par l'organe de direction ; preuves de conformité des prestataires **avant** contrat ; achats terminés et consultation des TM sur les risques **avant** la phase de test | D-01 (3 mois), D-02 (6 mois), D-03, D-04, D-05 |
| **Test : threat intelligence** | Analyse de la menace ; au moins 3 scénarios dont un seul au plus non fondé sur la menace ; TTIR remis puis approuvé par l'autorité | — |
| **Test : red team** | Plan de test approuvé par le CT et l'autorité ; phase active d'au moins 12 semaines ; rapport au moins hebdomadaire ; leg-ups approuvés ; mesures validées après une détection ; suspension ou purple teaming limité encadrés | D-06 (≥ 12 semaines), D-07 (hebdomadaire) |
| **Clôture** | Information de la blue team ; rapport RT (4 semaines) ; rapport BT et replay + purple teaming (10 semaines) ; restauration ; retours réciproques ; rapport de synthèse (8 semaines après la notification de l'autorité) | D-08, D-09, D-10, D-11 |
| **Remédiation et attestation** | Plan de remédiation (8 semaines), avec une analyse des causes racines pour chaque constat ; attestation de l'autorité ; notification à l'autorité compétente | D-12 |
| **Cycle** | Prochain TLPT, modulable par l'autorité ; positionnement des autorités d'accueil | D-13 (3 ans), D-15 (20 jours ouvrés) |

### Et les bonnes pratiques TIBER ?

**63 bonnes pratiques** sont mises à disposition : 44 viennent de TIBER-EU (2025) et 19 de TIBER-FR (v2), qui ne s'affichent que si cette déclinaison est choisie.
Elles sont **toujours présentées à part**, avec la mention « non contraignante », et **ne comptent jamais dans la conformité**.
Chacune déclare son lien avec les obligations :
- **complète** : elle va au-delà du RTS ;
- **reformule** : même exigence que l'obligation ;
- **⚠ diffère** : l'écart est signalé des deux côtés. Exemples : la cible de 6 semaines de TIBER-EU pour le rapport blue team face aux 10 semaines du RTS ; l'attestation signée par tous les participants dans TIBER-FR.

Une règle de droit national relayée par un guide est marquée « obligation nationale (à qualifier) » : c'est le cas de PASSI LPM pour les *flags* sur des SIIV (TIBER-FR).

## Fonctionnalités (préversion 0.1)

| Onglet | Contenu |
|---|---|
| **Échéances et chronologie** | Les 14 échéances réglementaires, chacune avec son statut (à venir, bientôt, en retard, fait, fait en retard, en attente d'une date…) ; la chronologie de l'exercice par phase, avec alerte en cas d'incohérence ; les caractéristiques de l'exercice qui rendent les items applicables ou non |
| **Checklists** | Pour chaque phase, deux colonnes séparées : *Obligations*, avec l'avancement, et *Bonnes pratiques*. Statuts : à traiter, en cours, traité, non applicable (justification obligatoire), écart accepté (justification et décideur obligatoires) |
| **Livrables** | Livrables attendus et leurs échéances ; statut, version, emplacement, dates ; **empreinte SHA-256 calculée sur le poste**, sans copier le document, puis vérification « conforme » ou « différent ». La date de remise vaut réalisation de l'échéance |
| **Registres** | Rapports hebdomadaires, qui alimentent D-07 ; leg-ups, avec alerte RTS 11(8) ; détections, suspensions et purple teaming limité, avec alertes RTS 11(9) / 11(10) |

Sont aussi proposés :
- la création et l'ouverture d'un exercice chiffré ;
- l'enregistrement direct (Chrome, Edge) avec protection contre l'écrasement d'un fichier modifié ailleurs, ou un téléchargement (Firefox, Safari) ;
- le verrouillage ;
- l'interface en FR et en EN ;
- les thèmes clair et sombre ;
- l'affichage mobile.

**À venir** : annuaire des parties prenantes et évaluation des prestataires (art. 27), scénarios, changements du plan de test, surcharges dans
l'interface, verrouillage automatique, textes officiels dans les 24 langues de l'UE, autres déclinaisons nationales TIBER.

## Utilisation

1. **Récupérer `openTLPT.html`**, artefact `openTLPT-html` du dernier build vert dans l'onglet [Actions](../../actions), et l'ouvrir par **double-clic**.
   Rien à installer, **aucun droit administrateur**, aucun accès réseau. Les navigateurs testés sont Edge (y compris en « sécurité renforcée »), Chrome, Firefox et Safari.
2. **Nouvel exercice** : nom de code, rôle, votre nom, passphrase d'au moins 14 caractères. **Sans la passphrase, le fichier est définitivement illisible.**
3. **Saisir les dates** au fil de l'eau. Les échéances, les checklists et les alertes se mettent à jour.
4. **Enregistrer** : le fichier `<nom-de-code>.tlpt` est chiffré. On peut le transporter (clé USB, partage) et le confier à un autre acteur qui connaît la passphrase.

## Sécurité, confidentialité, traçabilité

- **Chiffrement** :
  - AES-256-GCM, avec une clé dérivée de la passphrase par Argon2id (64 Mio, t=3) ;
  - l'en-tête du fichier est authentifié ;
  - un mauvais mot de passe et un fichier altéré renvoient la même erreur, pour ne rien révéler.
- **Aucune donnée ne quitte le poste** : une politique de sécurité de la page (CSP) interdit tout réseau. Rien n'est écrit dans le stockage du navigateur. Le nom de code est le seul indice visible, porté par le nom du fichier.
- **Journal chaîné** :
  - chaque modification enregistre la valeur avant et après, l'auteur et l'horodatage ;
  - toute altération est détectée à l'ouverture ;
  - l'**ancrage** du dernier hash, recopié dans un PV ou un mail, prouve après coup que l'historique n'a pas été réécrit.
- **Fichier unique et reproductible** : deux builds du même code donnent le même SHA-256, ce qui permet de vérifier qu'on utilise la bonne version.

Détails : [ADR-0003 (chiffrement)](docs/adr/0003-kdf-chiffrement.md) et [modèle de données](docs/MODELE_DONNEES.md).

## Documentation

| Document | Contenu |
|---|---|
| [docs/POINTS_DE_CONFORMITE.md](docs/POINTS_DE_CONFORMITE.md) | **Liste complète des points suivis**, par famille, thème et phase (générée) |
| [docs/referentiel/MATRICE_DORA_RTS.md](docs/referentiel/MATRICE_DORA_RTS.md) | Matrice des obligations avec les délais vérifiés sur le texte officiel, et remarques sur le texte |
| [docs/referentiel/BONNES_PRATIQUES_TIBER.md](docs/referentiel/BONNES_PRATIQUES_TIBER.md) | Bonnes pratiques TIBER-EU et TIBER-FR, et écarts avec le RTS |
| [docs/BESOINS.md](docs/BESOINS.md) | Expression de besoins et décisions de cadrage |
| [docs/MODELE_DONNEES.md](docs/MODELE_DONNEES.md) | Référentiel JSON, base d'exercice, journal, enveloppe chiffrée |
| [docs/adr/](docs/adr/README.md) | Décisions d'architecture (UI, SQLite WASM, chiffrement, fichier unique) |

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| [`referentiel/`](referentiel/) | Le référentiel en packs JSON (core, DORA/RTS, TIBER-EU, TIBER-FR) et son JSON Schema |
| [`engine/`](engine/) | Moteur métier en TypeScript : échéances, checklists, registres, journal chaîné, enveloppe chiffrée |
| [`app/`](app/) | Application Svelte, construite en **un seul fichier HTML** |
| [`schema/`](schema/) | Schéma SQLite de la base d'exercice |
| [`tools/`](tools/) | Validateur du référentiel, générateur des points de conformité |
| [`spike/`](spike/) | Spike technique (fichier unique en `file://`, Edge en sécurité renforcée) |

## Développement

```bash
python3 tools/validate_ref.py
```

```bash
python3 tools/gen_compliance_doc.py
```

```bash
cd engine && npm ci && npm test
```

```bash
cd app && npm ci && npm run build && npm run test:e2e
```

La CI valide le référentiel et vérifie que le document des points de conformité est à jour. Elle teste aussi le moteur, et l'application
en `file://` sous Ubuntu et Windows (Chromium, Firefox, WebKit, Edge, et Edge en sécurité renforcée).

## Avertissement

Les synthèses du référentiel **ne remplacent ni les textes officiels** publiés au Journal officiel de l'UE, ni les guides des autorités.
Elles n'ont **pas valeur de conseil juridique**. En cas de doute, le texte du règlement et les échanges avec votre autorité TLPT prévalent.
Les documents TIBER (BCE, Banque de France) ne sont **pas** reproduits : seules des références et des synthèses figurent ici.
openTLPT n'est affilié ni à la BCE, ni à la Banque de France, ni à aucune autorité de supervision.

## Licence

Code et contenus originaux : [Apache-2.0](LICENSE). Les textes réglementaires de l'UE proviennent d'EUR-Lex, dont la réutilisation est autorisée (décision 2011/833/UE).
