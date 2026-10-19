# Bonnes pratiques TIBER-EU et TIBER-FR

> **Nature : BONNES PRATIQUES — non contraignantes.** Les obligations sont dans [MATRICE_DORA_RTS.md](MATRICE_DORA_RTS.md).
> Une bonne pratique n'est **jamais** présentée dans l'outil comme exigible. Quand elle reprend une obligation du RTS, on
> renvoie à l'ID de l'obligation au lieu de la dupliquer.
>
> Sources lues le 2026-10-19 :
> - **TIBER-EU Framework**, BCE / Eurosystème, version de **janvier 2025**, publiée le 11/02/2025 et alignée sur le RTS TLPT.
>   https://www.ecb.europa.eu/pub/pdf/other/ecb.tiber_eu_framework_2025~b32eff9a10.en.pdf
> - **TIBER-FR National Implementation Guide**, Banque de France / ACPR / AMF, **version 2**, mars 2025.
>   https://banque-france.fr/system/files/2025-03/Guide_TIBER_2025_V5.pdf
>
> **Statut juridique.**
> - Le RTS (considérant 1) permet d'appliquer TIBER-EU ou une déclinaison nationale *dans la mesure où* elle est
>   cohérente avec DORA et le RTS.
> - TIBER-FR se décrit comme un ensemble de recommandations, sans obligation juridique : DORA et le RTS fixent le **« quoi »**,
>   TIBER fixe le **« comment »**.
> - **TIBER-FR ne s'applique pas** aux établissements de crédit « significant » du MSU, dont l'autorité TLPT est la BCE.
>
> **Droits de réutilisation.**
> - La couverture du PDF TIBER-EU porte la mention « ECB-RESTRICTED », alors que le document est publié sur le site de la BCE.
> - TIBER-FR est « © Banque de France ».
> - Ce fichier ne contient donc que des **synthèses et références**, aucune reproduction. Il faudra vérifier les conditions
>   de réutilisation avant d'embarquer des extraits dans l'outil.

## Légende

- **Réf.** : l'identifiant de la bonne pratique, préfixé par son référentiel.
  - `EU-` : TIBER-EU
  - `FR-` : TIBER-FR
- **Type** :
  - **Δ** : ajoute quelque chose au RTS
  - **≈** : reformule une obligation (on renvoie alors à son ID)
  - **≠** : diffère du RTS ou de TIBER-EU, et doit donc être affichée avec un avertissement
- **Question à se poser** : ce que l'outil affichera dans la checklist contextuelle, au bon moment.

---

## 0. Repères calendaires TIBER (indicatifs)

| Réf. | Repère | Type | Rapport au RTS |
|---|---|---|---|
| EU-T1 | Préparation : **6 mois maximum** après la notification écrite, qui marque le début du test. | ≈ | Cohérent avec D-02 |
| EU-T2 | Réunion d'initiation au plus tard à **3 mois**. Réunions de cadrage et de lancement au plus tard à **6 mois**. | Δ | Le RTS ne fixe pas de réunions |
| EU-T3 | Phase TI : **4 à 6 semaines** (indicatif). | Δ | Le RTS ne fixe pas de durée |
| EU-T4 | Plan de test RT : **2 à 3 semaines** (indicatif). | Δ | Le RTS ne fixe pas de durée |
| EU-T5 | Clôture : rapports et replay/PT ≤ 10 semaines, puis évaluation par les TM, puis 360° et rapport de synthèse + remédiation ≤ 8 semaines. **Au total, plus de 18 semaines possibles.** | ≈ | D-08 à D-12 |
| EU-T6 | La figure de clôture indique « BT report (6 weeks) », alors que le texte TIBER-EU dit **10 semaines**, comme le RTS. | ≠ | Afficher 10 semaines comme obligation et 6 semaines comme cible indicative éventuelle |
| EU-T7 | Le TCT contacte l'entité **le plus tôt possible, avant la notification**, pour anticiper les achats et le budget. | Δ | — |
| FR-T1 | Test TIBER-FR « généralement » réalisé dans un **cycle de 3 ans**, modulable par l'autorité. | ≈ | G-01 |
| FR-T2 | Réunions régulières de suivi entre le TCT-FR et le CT pendant la préparation. | Δ | — |

## 1. Avant le test : gouvernance et confidentialité

| Réf. | Bonne pratique | Type | Phase | Profils | Question à se poser |
|---|---|---|---|---|---|
| EU-01 | Le **Generic Threat Landscape (GTL)** national sert de base au TTIR et au cadrage. Il est recommandé, mais pas obligatoire. | Δ | Avant / préparation | EF, TI | Un GTL est-il disponible auprès de notre autorité, et l'a-t-on transmis au TIP ? |
| EU-02 | CT **restreint** : membres seniors, ayant accès au sommet de la chaîne d'escalade des incidents, capables de décider. Possibilité de **NDA** pour les membres du CT. | Δ | Préparation | EF | Chaque membre du CT est-il indispensable ? A-t-il signé un NDA ? |
| EU-03 | Procédures d'escalade pour **éviter les actions obligatoires en cas d'incident réel** : CSIRT externe, partage d'information, forces de l'ordre. | Δ | Préparation | EF | Qui coupe l'escalade vers le CERT, l'ISAC ou la police si la BT détecte le test ? |
| EU-04 | Le CT peut ordonner à tout moment un arrêt temporaire ou définitif du test. | ≈ | Test | EF | Le critère d'arrêt est-il écrit et connu des RTT ? |
| EU-05 | **Nom de code** choisi par l'entité, qui ne doit pas permettre de l'identifier. | ≈ (O-07) | Préparation | EF | Le nom de code est-il neutre, sans lien avec le nom ou le secteur de l'entité ? |
| EU-06 | **Due diligence** sur les systèmes du périmètre : sauvegardes et restauration opérationnelles **avant** tout test. | Δ | Préparation | EF | A-t-on vérifié les sauvegardes et la restauration de chaque système ciblé ? |
| EU-07 | Contrats TIP/RTT : exigences de sécurité au moins égales à celles de l'entité ; indemnisation ; destruction des données et notification des violations ; activités interdites, en ajoutant **chantage, menaces et corruption d'employés**. | Δ (complète P-07, P-20) | Préparation | EF, TI, RT | Le contrat interdit-il explicitement le chantage et la corruption de salariés ? |
| EU-08 | Prévoir dans les contrats TIC tiers **le droit de tester l'infrastructure du fournisseur**, ou l'ajouter aux futurs contrats. | Δ | Préparation | EF | Nos contrats d'externalisation autorisent-ils un red team sur l'infrastructure du fournisseur ? |
| EU-09 | Test multi-parties : limiter le nombre de parties, désigner un CT chef de file, utiliser **le même TIP et le même RTT** pour tous. | Δ | Préparation | EF | Le nombre de parties est-il gérable ? |
| FR-01 | Le périmètre, avec ses *flags*, est approuvé par un **dirigeant ou un membre du conseil qui signe une attestation de périmètre**. Ce sponsor porte la remédiation. | Δ (complète PR-06) | Préparation | EF | Qui est le sponsor exécutif ? A-t-il signé l'attestation de périmètre ? |
| FR-02 | L'entité reste responsable de l'**évaluation juridique et experte indépendante** du test prévu. | Δ | Préparation | EF | A-t-on fait valider le test par le juridique (droit du travail, données personnelles, intrusion physique) ? |

## 2. Cadrage (SSD)

| Réf. | Bonne pratique | Type | Profils | Question à se poser |
|---|---|---|---|---|
| EU-10 | Repère : **au plus 10 FCI** par entité testée. Une FCI dans le périmètre n'est pas forcément attaquée. | Δ | EF | Le périmètre est-il réaliste pour 12 semaines de test ? |
| EU-11 | Utiliser la **BIA** ou le référentiel de continuité comme base d'identification des FCI. | Δ | EF | Le SSD est-il cohérent avec notre BIA et notre registre des FCI DORA ? |
| EU-12 | **Au moins un *flag*** par système du périmètre. Toute l'infrastructure peut servir de point d'entrée ou de rebond. | Δ | EF | Chaque système a-t-il un *flag* avec son critère C/I/A ? |
| EU-13 | Des composants non critiques peuvent être ajoutés au périmètre (préproduction, sauvegardes) s'ils ne gênent pas le test des FCI. | Δ | EF | Faut-il inclure les sauvegardes ou la préproduction ? |
| EU-14 | Réunion de cadrage avec les TM, et le TIP et les RTT s'ils sont déjà contractualisés. Les *flags* doivent au minimum être discutés avec les TM. | Δ | EF, TI, RT | Les *flags* ont-ils été revus avec le TM ? |

## 3. Achat des prestataires

| Réf. | Bonne pratique | Type | Profils | Question à se poser |
|---|---|---|---|---|
| EU-15 | Appliquer les exigences minimales des **TIBER-EU Services Procurement Guidelines (GSPP)**. Préférer des prestataires accrédités. | Δ | EF, TI, RT | Les GSPP ont-elles été utilisées comme grille d'évaluation ? |
| EU-16 | Lancer l'achat **le plus tôt possible**, éventuellement avant la notification. | Δ | EF | Le délai d'achat interne est-il compatible avec l'échéance de 6 mois ? |
| EU-17 | Une fois les contrats signés : **mettre à jour le plan projet** avec le TM et organiser une **réunion de lancement** (*launch meeting*) avec le CT, les TM, le TIP et les RTT. | Δ | EF, TI, RT | La réunion de lancement a-t-elle eu lieu ? Le planning final est-il partagé ? |
| EU-18 | Testeurs internes : recommandation d'adjoindre **au moins un manager RT externe expérimenté**, et de prévoir des ressources de secours. | Δ | EF | Qui apporte le regard externe ? |
| FR-03 | **Un même prestataire peut assurer TI et RT**, s'il garantit des ressources suffisantes et l'**indépendance des équipes TI et RT** (la RT ne doit pas influencer le rapport TI). | ≈ (P-15, P-17) | EF, TI+RT | Comment le prestataire combiné prouve-t-il la séparation des équipes (organigramme, cloisonnement) ? |
| FR-04 | **Spécificité FR** : si des *flags* portent sur des **SIIV d'un OIV**, utiliser des prestataires **PASSI LPM**, basés dans l'UE, **sans sous-traitance hors PASSI LPM**. Le rapport doit pouvoir être produit à l'ANSSI sur demande. Sans *flag* SIIV, des prestataires **PASSI-RGS** basés dans l'UE sont recommandés. | ≠ / à qualifier | EF, TI, RT | Un *flag* porte-t-il sur un SIIV ? Si oui, le prestataire est-il PASSI LPM ? |

> FR-04 relève en partie du **droit national (LPM, règles ANSSI)**. Ce n'est donc pas qu'une bonne pratique. Il faudra le faire
> qualifier par un juriste avant de choisir son badge dans l'outil. Une option : un badge « Obligation nationale ».

## 4. Threat intelligence

| Réf. | Bonne pratique | Type | Profils | Question à se poser |
|---|---|---|---|---|
| EU-19 | L'entité fournit au TIP : son évaluation de la menace et son registre, les attaques récentes, les TTIR antérieurs si c'est pertinent. Le TIP peut échanger avec la CTI interne **en préservant le secret**. | Δ | EF, TI | Quelles informations internes donne-t-on au TIP, et comment garde-t-on la CTI interne dans l'ignorance du test ? |
| EU-20 | **Réunion de sélection des scénarios** à partir d'une liste longue. Critères stratégiques en plus : scénarios des tests précédents, besoin de *leg-ups*. | Δ (complète TI-03) | EF, TI, RT | Les scénarios évitent-ils de rejouer ceux du test précédent ? |
| EU-21 | Si aucun scénario X n'a été défini, **un scénario peut être transformé en scénario X** pendant la phase active, avec l'accord des TM, du CT et des RTT. | Δ | EF, RT | — |
| EU-22 | Commencer à **planifier les leg-ups dès la phase TI**. Ne jamais proposer comme leg-up un accès direct aux *flags* ni la désactivation de contrôles de sécurité. | Δ | EF, RT | Les leg-ups envisagés sont-ils réalistes, c'est-à-dire obtenables par un attaquant patient ? |
| EU-23 | **Réunion TTIR** : présentation du rapport en version finale, retours de toutes les parties, mise à jour possible des *flags*. Le CT met à jour sa gestion des risques après le TTIR. | Δ | EF, TI, RT | L'analyse de risques a-t-elle été revue après le TTIR ? |
| FR-05 | Phase TI en 4 étapes : **collecte ciblée → cartographie des acteurs → scénarios → passation**. **Reconnaissance passive uniquement** pendant la TI, pour ne pas être détecté. | Δ | TI | La collecte TI est-elle restée passive ? |
| FR-06 | Atelier TI **à mi-parcours** pour présenter les premiers scénarios. Réunion de **passation** (*handover*) en fin de TI, avec le CT, le TCT-FR et la RT. | Δ | EF, TI, RT | L'atelier à mi-parcours est-il planifié ? |
| FR-07 | Scénario d'**intrusion physique** envisageable. Il est facultatif : le CT peut l'exclure avec l'accord du TCT-FR. | Δ | EF, TI, RT | Veut-on un scénario physique ? A-t-on les autorisations et protections juridiques nécessaires ? |

## 5. Red team

| Réf. | Bonne pratique | Type | Profils | Question à se poser |
|---|---|---|---|---|
| EU-24 | Plan de test RT : ajouter la **fréquence de reporting** et la **protection de la vie privée** des personnes ciblées par l'ingénierie sociale. | Δ (complète l'annexe IV) | RT, EF | Comment protège-t-on les données des salariés ciblés ? |
| EU-25 | Intrusion physique : garanties (**consentement formel** de l'entité), sans franchir de limite légale. | Δ | EF, RT | Une lettre d'autorisation signée accompagne-t-elle chaque testeur sur site ? |
| EU-26 | En plus du point hebdomadaire, des **points quotidiens** et un canal sécurisé ad hoc avec le CT et les TM sont **fortement recommandés**. | Δ | EF, RT | Un point quotidien est-il en place ? |
| EU-27 | **Toutes les actions des RTT sont journalisées**, pour le replay, le rapport et la traçabilité. Les leg-ups sont **dûment consignés**. | Δ | RT, EF | Le journal RT est-il horodaté et exportable ? Le registre des leg-ups est-il à jour ? |
| EU-28 | Vulnérabilité **critique** découverte : le CT peut lancer une remédiation en concertation avec le TM, en limitant l'impact sur le test. | Δ | EF | Qui décide de corriger pendant le test ? |
| EU-29 | Restauration **planifiée avec le CT et la BT**, idéalement **après** le replay et le PT. | Δ (complète P-18/P-19) | EF, RT, TI | La restauration est-elle planifiée après le replay ? |
| FR-08 | Plan RT : chaque scénario découpé en **RECON / IN / THROUGH / OUT**, et toutes les TTP **mappées sur MITRE ATT&CK**. | ≠ (le RTS demande in/through/out) | RT | Les TTP sont-elles mappées sur ATT&CK ? |
| FR-09 | Typologie des leg-ups : **gain de temps / information / accès**. Ils sont obtenus par les processus normaux de l'entité, de façon réaliste. Activation avec le CT, **sauf objection du TCT-FR**. | Δ | EF, RT | Chaque leg-up est-il typé et justifié ? |
| FR-10 | Point **quotidien** CT/RT, point **hebdomadaire** avec le TCT-FR (modèle de présentation du TCT-FR), réunion ad hoc en cas de problème critique. Participation du TIP encouragée. | Δ | EF, RT, TI | — |
| FR-11 | Petits écarts au plan tolérés s'ils n'ont pas d'impact sur le planning ni sur l'analyse de risques. En cas de détection, se référer aux bonnes pratiques de purple teaming TIBER-EU. | Δ | EF, RT | Cet écart change-t-il le planning ou les risques ? Si oui, il faut une approbation (RT-06). |
| FR-12 | Rapport RT : synthèse lisible par la gouvernance, chronologie détaillée (dont les **artefacts restés sur le SI**), constats classés par sévérité. Version **provisoire** à la fin de la RT, version **finale** après le replay et le PT. | Δ / ≠ | RT | La version finale intègre-t-elle les constats du replay ? Le délai de 4 semaines (D-08) s'applique au rapport remis au CT. |

## 6. Clôture

| Réf. | Bonne pratique | Type | Profils | Question à se poser |
|---|---|---|---|---|
| EU-30 | Rapports RT et BT **très sensibles** : maîtriser l'accès, la diffusion, la conservation et la destruction. Version expurgée (noms de machines, adresses IP) sur demande du TM. | Δ | EF, RT | Qui a accès aux rapports, et quand seront-ils détruits ? |
| EU-31 | Les deux rapports contiennent une **chronologie** des événements et des détections. Le TM donne son retour sur le rapport RT en version finale. | Δ | EF, RT | Les chronologies RT et BT sont-elles alignées sur la même référence horaire ? |
| EU-32 | Replay et PT **après que le rapport BT a pris une forme substantielle**, tout en respectant le plafond de 10 semaines. | Δ | EF, RT | Le rapport BT est-il assez avancé pour le replay ? |
| EU-33 | Sujets de PT possibles : points non testés, étapes alternatives, scénarios alternatifs, preuves de concept, remédiation envisagée, **exercices de continuité d'activité**. | Δ | EF, RT | — |
| EU-34 | **Réunion 360°**, organisée par le TM, avec retours écrits de chaque partie **avant l'approbation** du rapport de synthèse et du plan de remédiation. | Δ (complète CL-06) | EF, TI, RT | Les retours 360° sont-ils remis avant l'approbation ? |
| EU-35 | Obtenir le **retour du TM avant d'envoyer** la version finale du rapport de synthèse et du plan de remédiation. | Δ | EF | Une revue informelle par le TM est-elle prévue ? |
| EU-36 | Envoyer aussi le rapport de synthèse et le plan de remédiation à l'**autorité compétente** si elle n'est pas l'autorité TLPT. | ≈ (RM-01) | EF | — |
| FR-13 | Replay : **au moins deux demi-journées**. Partie 1 : rejeu sur table en comparant les chronologies RT et BT. Partie 2 : **rejeu pratique**, la RT rejouant des attaques et la BT testant sa détection. Participants requis : RT, BT, CT, TM. TIP facultatif. | Δ | EF, RT | Deux demi-journées sont-elles réservées ? |
| FR-14 | Commencer à rédiger le **rapport de synthèse dès la préparation**. Constats en **niveau élevé** seulement. Présentation au **C-level** pour validation au plus haut niveau. | Δ | EF | Le rapport de synthèse est-il pré-rempli au fil de l'eau ? |
| FR-15 | Le rapport de synthèse TIBER-FR **contient** le plan de remédiation. | ≠ (le RTS prévoit deux livrables, D-11 et D-12) | EF | Les deux livrables réglementaires sont-ils bien identifiables séparément ? |
| FR-16 | 360° : **questionnaire** envoyé par le TCT-FR avant l'atelier, réponses non partagées entre participants, retours anonymisés vers le TKC. | Δ | EF, TI, RT | — |
| FR-17 | **Attestation TIBER-FR/DORA signée par tous les participants**. Le TCT-FR peut refuser la conformité (manquement d'un prestataire, test compromis) : le test **ne compte alors pas dans le cycle de 3 ans**. | ≠ (le RTS : l'autorité délivre l'attestation) | EF, TI, RT | Le secret et la qualité ont-ils été tenus jusqu'au bout ? |
| EU-37 | L'attestation TIBER-EU mentionne si **le TIP et les RTT respectaient les GSPP**. | Δ (cf. remarque R-A de la matrice) | EF | — |

---

## 7. Écarts notables à afficher dans l'outil

| # | Sujet | RTS (obligation) | TIBER (bonne pratique) |
|---|---|---|---|
| 1 | Délai du rapport BT | ≤ 10 semaines après R1 | Figure TIBER-EU : 6 semaines (indicatif) ; texte : 10 semaines |
| 2 | Signataires de l'attestation | Autorité TLPT (chef de file) | TIBER-FR : tous les participants |
| 3 | Plan de remédiation | Livrable distinct (D-12) | TIBER-FR : inclus dans le rapport de synthèse |
| 4 | Découpage du plan RT | *in / through / out* | TIBER-FR : RECON / IN / THROUGH / OUT + MITRE ATT&CK |
| 5 | Prestataire TI + RT | Autorisé si les équipes sont séparées (RTS 7(1)(e)(v), (f)(v)) | TIBER-FR : explicitement autorisé, avec garanties de ressources |
| 6 | Prestataires sur SIIV (FR) | — | PASSI LPM (renvoi à la LPM, à qualifier juridiquement) |

## 8. Référentiels restant à intégrer

- **Guide TLPT de la BCE pour les établissements « significant »** (novembre 2025, annoncé dans la presse spécialisée). C'est la source
  de référence quand l'autorité TLPT est la BCE, à qui TIBER-FR ne s'applique pas.
- **Guidances TIBER-EU** citées par le framework : CT, Initiation Documents, SSD, TTIR, RTTP, RTTR, BTTR, Purple Teaming, TSR,
  Remediation Plan, Attestation, GSPP.
- **Autres TIBER nationaux** (NL, DE, BE, LU…) : seulement leurs spécificités publiées par rapport à TIBER-EU.
