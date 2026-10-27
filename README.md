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
| **Tableau de bord** (accueil) | **Bandeau** : nom de code, phase en cours, J+n depuis la notification, prochain jalon, cadre applicable, type de testeurs, intégrité du journal et dernier ancrage, avec un bouton « Ancrer le journal ». **KPI** : conformité globale (socle et déroulé), échéances en retard, compte à rebours des 6 mois de préparation, semaine n / 12 de la phase active et fin au plus tôt, compte à rebours de la clôture (10 semaines), couverture des rapports hebdomadaires, livrables remis, approuvés et avec empreinte, leg-ups (non prévus, alertes), détections non validées, écarts acceptés et réponses à revoir. **Listes** : *À terminer cette semaine* (retards en tête), *À préparer en amont* (horizon réglable : 4, 6, 8 ou 12 semaines), *Préparations à lancer* (livrables lourds dont la préparation doit commencer avant d'entrer dans l'horizon, par ex. le SSD 10 semaines avant D-02), *Prochains jalons à dater*, avec saisie directe. **Frise** des jalons par phase, avec dates prévues et glissement. KPI **jalons en glissement**. **Conformité par étape**, du socle à la remédiation, avec accès direct à chaque checklist. **Alertes** |
| **Supports de comité** (PowerPoint, depuis le tableau de bord) | Trois trames **.pptx** générées sur le poste, sans réseau : **Comité de suivi Control Team** (synthèse et KPI, actions de la semaine et à préparer, jalons, conformité par étape, livrables et empreintes, leg-ups, détections, alertes et décisions, prochaines étapes) ; **Organe de direction** (synthèse exécutive, jalons majeurs, conformité par étape, livrables clés, points d'attention et décisions attendues : **agrégats uniquement**, sans détail des registres, RTS 9(4)(b)) ; **Test managers / autorité TLPT** (échéances réglementaires, livrables transmis et empreintes, leg-ups et détections à valider, prochaines étapes). Pour un **prestataire**, les trames sont adaptées : **point hebdomadaire red team → CT / TM** (RTS 11(7), trame TIBER-FR : synthèse de la semaine, activités et constats, leg-ups, détections, blocages et décisions attendues, plan de la semaine suivante, rapports hebdomadaires et empreintes) et **point prestataire → client** (ses échéances, ses livrables, ses obligations, points d'attention). Seul le nom de code apparaît, avec un pied de page « Confidentiel — besoin d'en connaître (RTS 4(2)(a)) ». Chaque génération est journalisée |
| **Exigences** (conformité globale) | **Matrice unique des 92 obligations DORA / RTS**, sans les bonnes pratiques TIBER. **Synthèse** : pourcentage traité, socle et déroulé, répartition par statut et par texte (DORA 26, DORA 27, RTS 4 à 16), avec des pastilles qui servent de filtres. **Tableau** : référence, intitulé, famille et thème ou phase, porteur, statut, justification et décideur, échéances et livrables liés, dernière réponse (date et auteur, tirées du journal). **Recherche et filtres** : texte, famille, thème ou phase, statut, porteur, texte de référence, en retard, à revoir. **Hors périmètre** : chaque exigence exclue, avec sa raison (rôle ou condition). **Export CSV** pour Excel et **impression ou PDF** avec un en-tête daté (auteur, état du journal, dernier ancrage, version du référentiel), chaque export étant journalisé |
| **Échéances et chronologie** | Les 14 échéances réglementaires, **filtrées selon votre rôle** (un prestataire voit celles de l'entité en information, sans faux retard), avec des **alertes de cohérence** sur les caractéristiques (par ex. « significant » + testeurs internes, TIBER-FR avec la BCE), chacune avec son statut (à venir, bientôt, en retard, fait, fait en retard, en attente d'une date…) ; la chronologie de l'exercice par phase, avec une **date réelle et une date prévue** par jalon, le **glissement** par rapport au planning de référence (qu'on peut figer), des échéances **prévisionnelles** tant que le jalon n'a pas eu lieu, un signal si la fin prévue de la phase active ne respecte pas les 12 semaines, et une alerte en cas d'incohérence ; les caractéristiques de l'exercice qui rendent les items applicables ou non |
| **Checklists** | Un onglet **Socle permanent**, qui regroupe les 47 points par thème avec leur propre progression, puis un onglet par phase pour les **points au fil du test**. Un résumé global indique « Socle x/y · Au fil du test x/y ». Dans chaque vue, deux colonnes séparées : *Obligations*, avec l'avancement, et *Bonnes pratiques*. Statuts : à traiter, en cours, traité, non applicable (justification obligatoire), écart accepté (justification et décideur obligatoires) |
| **Livrables** | Livrables attendus et leurs échéances ; statut, version, emplacement, dates ; **empreinte SHA-256 calculée sur le poste**, sans copier le document, puis vérification « conforme » ou « différent ». La date de remise vaut réalisation de l'échéance |
| **Parties prenantes** | **Annuaire** (control team, prestataires, test managers, blue team…) et **évaluation des prestataires TI et RT** (DORA 27, RTS 7) : grille tirée du référentiel, statut par critère, empreinte de chaque preuve, dérogation RTS 7(2) motivée, alerte si le contrat est signé avant une évaluation complète (RTS 9(11), D-05) |
| **Registres** | **Scénarios, flags et chemins d'attaque** : scénarios retenus (au moins 3, au plus un prospectif « X », un scénario incluant le prestataire TIC tiers en TLPT mutualisé ou commun, RTS 10), flags par scénario avec statut, date, chemin d'attaque et TTP, pour alimenter le rapport RT (annexe V) et le rapport de synthèse ; les leg-ups se rattachent à un scénario. Rapports hebdomadaires, qui alimentent D-07 ; leg-ups, avec alerte RTS 11(8) ; détections, suspensions et purple teaming limité, avec alertes RTS 11(9) / 11(10) |

Sont aussi proposés :
- la création et l'ouverture d'un exercice chiffré ;
- l'enregistrement direct (Chrome, Edge) avec protection contre l'écrasement d'un fichier modifié ailleurs, ou un téléchargement (Firefox, Safari) ;
- le verrouillage ;
- l'interface en FR et en EN ;
- les thèmes clair et sombre ;
- l'affichage mobile.

**À venir** : annuaire des parties prenantes et évaluation des prestataires (art. 27), scénarios, changements du plan de test, surcharges dans
l'interface, verrouillage automatique, textes officiels dans les 24 langues de l'UE, autres déclinaisons nationales TIBER.

## Ce que l'outil ne fait pas, par choix

Pour rester simple (décision DEC-6 de [BESOINS.md](docs/BESOINS.md)) : un fichier suit **un exercice et un acteur**. Pas de gestion multi-entités des TLPT communs ou mutualisés (chaque entité tient son propre fichier), pas d'export calendrier `.ics`, pas de surcharge de l'échéance du prochain TLPT (D-13) dans l'interface, pas de reprise des réponses d'un exercice précédent.

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
| [docs/REVUE_PERSONAS.md](docs/REVUE_PERSONAS.md) | Revue par parcours utilisateurs (PMO white team, prestataire red team, banque « significant ») et pistes priorisées |
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

Code et contenus originaux : [Apache-2.0](LICENSE).
Composants embarqués dans `openTLPT.html` : SQLite (domaine public), Svelte (MIT), hash-wasm (MIT), PptxGenJS (MIT), JSZip (MIT, sous double licence MIT / GPLv3). Les textes réglementaires de l'UE proviennent d'EUR-Lex, dont la réutilisation est autorisée (décision 2011/833/UE).
