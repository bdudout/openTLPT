# Revue par parcours utilisateurs — 2026-10-27

Les parcours ont été simulés sur le **build réel** (`openTLPT.html` en `file://`, Chromium) avec `app/tests/personas.mjs`, qu'on peut rejouer :

```bash
cd app && npm run build
```

```bash
node tests/personas.mjs "file://$PWD/dist/index.html" /tmp/personas
```

Aucune erreur technique n'est apparue (console vide, aucune requête réseau). Les constats portent sur l'**adéquation au métier**.

## Les trois parcours

| Rôle | Profil | Situation simulée |
|---|---|---|
| **PMO white team** (control team) | Entité financière | Soumise à TIBER-FR, prestataires TIC tiers dans le périmètre. J+100 depuis la notification : initiation remise et validée, préparation en cours. |
| **Responsable process d'un prestataire red team externe** | Prestataire RT | Phase active depuis 32 jours (semaine 5). Rapports hebdomadaires et leg-up prévu au plan saisis. |
| **Banque « significant »** (MSU, autorité TLPT : BCE) | Entité financière | Groupe, TLPT commun intragroupe, transfrontière, prestataires TIC tiers, testeurs mixtes, TIBER-FR choisi. J+30. |

## Constats

### PMO white team

| # | Constat | Gravité |
|---|---|---|
| P1 | **Le SSD (D-02, dans 84 jours) n'apparaît pas dans « À préparer en amont »**, dont l'horizon est de 6 semaines. Or le SSD se prépare des mois à l'avance, avec l'approbation de l'organe de direction. Les livrables lourds sont donc invisibles au moment où il faudrait les lancer. | Élevée |
| P2 | **Les dates prévues et réelles ne se distinguent pas.** Une date future est traitée comme planifiée, mais il n'existe ni planning de référence ni mesure du glissement. Un PMO pilote d'abord un planning. | Élevée |
| P3 | Les « prochains jalons à dater » mélangent les actions du PMO (contrats, SSD) et les validations attendues de l'autorité (« Composition du CT validée ») sans les distinguer. | Moyenne |
| P4 | Il n'y a ni **évaluation des prestataires** (DORA 27, RTS 7), ni annuaire des parties prenantes, ni surcharge de D-13 dans l'interface. Ces manques étaient déjà connus. | Élevée |
| P5 | La carte « Supports de comité » est placée **au-dessus des KPI** et repousse l'essentiel sous la ligne de flottaison. | Faible |

### Responsable process red team externe

| # | Constat | Gravité |
|---|---|---|
| R1 | **Le tableau de bord affiche 4 échéances « en retard » qui ne le concernent pas** (D-01 à D-04 : initiation, achats, analyse de risques, SSD, toutes à la charge de l'entité). Le KPI « Échéances en retard : 4 » est faux pour ce profil, et la liste « À terminer cette semaine » est polluée. **Les échéances et les jalons ne sont pas filtrés par profil**, alors que les obligations le sont. | **Bloquante** |
| R2 | Les « prochains jalons à dater » proposent des événements de l'entité (informations d'initiation, SSD) au lieu des siens (plan de test approuvé, fin de phase active, remise du rapport RT). | Élevée |
| R3 | **Il n'existe pas de support hebdomadaire RT** : TIBER-FR prévoit un point hebdomadaire RT → CT / TCT sur une trame (activités, constats, blocages, plan de la semaine suivante). L'outil propose à la place un support « organe de direction », sans objet pour un prestataire. | Élevée |
| R4 | **Il n'y a pas de registre des scénarios, *flags* et chemins d'attaque**. C'est pourtant le cœur du travail RT, et ce registre alimente le rapport RT (annexe V : *flags* atteints ou non, chemins réussis ou non, TTP) et le rapport de synthèse. | Élevée |
| R5 | Les livrables affichés mêlent ce que le RT **produit** (plan de test, rapport RT, PV de restauration) et ce qu'il **reçoit** (rapport BT), sans distinction. | Moyenne |
| R6 | Une étape sans aucune obligation pour ce profil s'affiche « 0/0 » dans « Conformité par étape » (Test : threat intelligence). | Faible |

### Banque « significant » (BCE, groupe)

| # | Constat | Gravité |
|---|---|---|
| B1 | **Aucune alerte sur des caractéristiques incompatibles** : un établissement « significant » déclare des **testeurs mixtes**, alors que DORA 26(8) al. 2 impose des testeurs **externes uniquement**. | **Bloquante** |
| B2 | **TIBER-FR est accepté alors que l'autorité est la BCE.** Le guide TIBER-FR exclut explicitement les établissements « significant » ; il faudrait signaler ce point et orienter vers le guide TLPT de la BCE (MSU), qui reste à intégrer au référentiel. | Élevée |
| B3 | **TLPT commun : pas de gestion des entités participantes.** Le RTS 8(1) impose à *chaque* entité de suivre les étapes 9 à 15, mais l'outil ne connaît qu'une entité par fichier. Il manque l'entité chef de file, l'autorité chef de file et l'état par entité. | Élevée |
| B4 | Le D-13 s'affiche en retard de 4 jours (TLPT précédent il y a plus de 3 ans), mais rien n'invite à enregistrer une éventuelle modulation de la fréquence par l'autorité. C'est lié à P4 (pas de surcharge dans l'interface). | Moyenne |
| B5 | Le socle compte 39 obligations à cocher : la charge est lourde au cadrage. Pour un groupe, une **reprise des réponses d'un TLPT précédent ou d'une entité sœur** ferait gagner du temps. | Moyenne |

### Constats transverses

| # | Constat | Gravité |
|---|---|---|
| T1 | **Pas d'export calendrier** : les échéances ne peuvent pas être poussées dans l'agenda (Outlook). Un fichier `.ics` téléchargé, sans réseau, suffirait. | Moyenne |
| T2 | Pas de rappel à l'ouverture des actions de la semaine (« depuis votre dernière session : 2 échéances dépassées »). | Faible |

## Suivi des corrections

| Date | Piste | Constats corrigés | Vérification |
|---|---|---|---|
| 2026-10-27 | **1. Portée par profil** (`engine/src/scope.ts`) | R1, R2, R6, P3 | Le profil **Entité** suit toutes les échéances, sauf celles portées par la seule autorité. Il reste en effet responsable de la conformité, y compris des livrables des prestataires (DORA 26(3)). Un **prestataire** ne suit que les siennes : les autres passent en « information — autre acteur », sans retard et sans saisie possible. Les jalons attendus sont filtrés de la même façon, et les validations de l'autorité sont signalées « à obtenir de l'autorité ». Une étape sans obligation affiche « — ». Parcours RT rejoué : **0** échéance en retard au lieu de **4**. |
| 2026-10-27 | **2. Cohérence des caractéristiques** (`engine/src/consistency.ts`) | B1, B2 | Règles contrôlées : « significant » + testeurs internes ou mixtes (DORA 26(8) al. 2, **erreur**) ; « significant » sans la BCE comme autorité ; TIBER-FR avec la BCE ou un « significant » ; test mutualisé sans prestataire TIC tiers (DORA 26(4)) ; mutualisé et commun cochés ensemble (RTS 1(18)) ; *flags* SIIV hors TIBER-FR. Les alertes apparaissent près des caractéristiques, dans le tableau de bord et dans les supports de comité (agrégées pour la direction). Parcours banque rejoué : erreur et avertissement affichés. |

| 2026-10-27 | **3. Planification** (`engine/src/deadlines.ts`, `dashboard.ts`, table `event_plans`, schéma v3) | P1, P2 | Chaque jalon a une date **réelle** et une date **prévue** ; la première date prévue fait référence (« Figer le planning de référence » pour la renouveler) et le **glissement** s'affiche dans la chronologie, la frise, un KPI et les supports de comité. Les échéances se calculent sur la date prévue tant que la date réelle manque (« prévisionnel ») ; une fin de phase active prévue avant 12 semaines est signalée. Chaque livrable porte un **délai de préparation** (`lead_weeks`) : parcours PMO rejoué, le SSD apparaît dans « Préparations à lancer » (à lancer au plus tard 10 semaines avant D-02) alors qu'il est hors de l'horizon. Horizon réglable de 4 à 12 semaines. P3 avait été traité par la piste 1. |
| 2026-10-27 | **5. Supports par profil** (`app/src/lib/deck.ts`) | R3, P5 | Les trames proposées dépendent du profil : l'entité garde Control Team, organe de direction et test managers ; un prestataire RT obtient le **point hebdomadaire RT → CT / TM** (activités, leg-ups, détections, blocages, plan de la semaine suivante, zones « [à compléter] ») et le **point prestataire → client** ; un prestataire TI, le point client. La carte des supports passe **sous les KPI**. |

Les tests correspondants se trouvent dans `engine/test/scope.test.ts` (7 tests) et `engine/test/planning.test.ts` (5 tests), et dans les scénarios « planification » et « profils et cohérence » de `app/tests/e2e.mjs`.

## Pistes d'amélioration priorisées

| Priorité | Piste | Constats traités | Effort |
|---|---|---|---|
| ✅ **1** | **Filtrer échéances, jalons et KPI par profil** : rattacher chaque échéance et chaque événement aux profils de leurs porteurs (CT / entité / organe de direction → entité ; TIP → TI ; RTT → RT). Pour un prestataire, afficher les jalons de l'entité en information, sans retard. | R1, R2, R6 | S |
| ✅ **2** | **Contrôles de cohérence des caractéristiques**, avec des alertes motivées : « significant » + testeurs internes ou mixtes (DORA 26(8) al. 2) ; TIBER-FR + BCE ou « significant » (guide non applicable) ; test mutualisé sans prestataire TIC tiers ; testeurs internes sur deux tests de suite. | B1, B2 | S |
| ✅ **3** | **Planification** : date prévue et date réelle pour chaque jalon, glissement affiché, et **délais de préparation par livrable** (par ex. SSD : commencer 10 semaines avant D-02) pour l'alimentation « en amont ». Option : horizon réglable (4, 6, 8 ou 12 semaines). | P1, P2, P3 | M |
| **4** | **Registre des scénarios et des *flags*** : scénarios (fondé sur la menace ou X, C/I/A, FCI), *flags*, avancement, chemins d'attaque, leg-ups rattachés. Il alimente le rapport RT et le rapport de synthèse. | R4 | M |
| ✅ **5** | **Supports par profil** : trame **hebdomadaire RT → CT / TM** (activités de la semaine, *flags*, blocages, leg-ups demandés, plan de la semaine suivante), trame prestataire → client à la place de « organe de direction ». La carte de supports passe sous les KPI. | R3, P5 | S |
| **6** | **Évaluation des prestataires (DORA 27, RTS 7)** et annuaire des parties prenantes : grille critère par critère, preuves par empreinte, dérogation 7(2) motivée, blocage « pas de contrat avant les preuves aux TM » (D-05). | P4 | M |
| **7** | **TLPT commun ou mutualisé** : liste des entités participantes, entité et autorité chefs de file, état des étapes 9 à 15 par entité. | B3 | L |
| **8** | **Export `.ics`** des échéances et jalons, surcharge de D-13 dans l'interface, reprise des réponses d'un exercice précédent. | T1, B4, B5 | S |

Effort : S = quelques jours ; M = une à deux semaines ; L = plus.
