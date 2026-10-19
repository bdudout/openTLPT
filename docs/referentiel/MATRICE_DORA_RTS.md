# Matrice de conformité — DORA art. 26-27 et RTS TLPT (UE) 2025/1190

> **Nature : OBLIGATIONS.** Ce fichier ne contient **que** des exigences juridiquement contraignantes.
> Les bonnes pratiques TIBER sont dans [BONNES_PRATIQUES_TIBER.md](BONNES_PRATIQUES_TIBER.md).
>
> Sources vérifiées le 2026-10-19 sur EUR-Lex (version EN) :
> - Règlement (UE) 2022/2554 (DORA), art. 26 et 27 — ELI http://data.europa.eu/eli/reg/2022/2554/oj
> - Règlement délégué (UE) 2025/1190 du 13/02/2025, JO L du 18/06/2025, en vigueur le 20e jour suivant sa publication,
>   soit le **08/07/2025** (art. 17) — ELI http://data.europa.eu/eli/reg_del/2025/1190/oj
>
> Les libellés ci-dessous sont des **synthèses en français**. Le texte qui fait foi est celui publié au JO dans chaque
> langue officielle. L'outil affichera le texte officiel de l'article dans la langue choisie.

## Légende

- **Porteur** : qui doit agir.
  - **EF** : entité financière (Control Team / CTL)
  - **TIP** : fournisseur de threat intelligence
  - **RTT** : testeurs red team
  - **BT** : blue team
  - **AUT** : autorité TLPT / test managers (TM)
- **Profils outil** : profils pour lesquels l'exigence apparaît dans la checklist.
  - EF = Entité financière
  - TI = Prestataire TI
  - RT = Prestataire RT
  - TI+RT = Prestataire combiné, qui voit l'union des lignes TI et RT
- Les exigences dont le porteur est l'autorité (AUT) sont affichées **en information**, sans être à cocher : ce sont des jalons
  externes qu'il faut attendre ou relancer.

---

## 0. Calendrier réglementaire (délais calculables)

Ces délais alimentent le calcul automatique des échéances (EF-2). Chaque délai part d'une **date de déclenchement**
que l'utilisateur saisit.

| ID délai | Déclencheur (date saisie) | Délai | Échéance / livrable | Porteur | Source |
|---|---|---|---|---|---|
| D-01 | Réception de la notification de l'autorité (N0) | **3 mois** | Informations d'initiation : charte projet (annexe I), contact CTL, testeurs internes ou externes, canaux de communication, nom de code | EF | RTS 9(2) |
| D-02 | N0 | **6 mois** | Document de spécification du périmètre (SSD, annexe II), approuvé par l'organe de direction | EF | RTS 9(6) |
| D-03 | Début de la phase de test | **avant** | Achat ou affectation des testeurs et du TIP terminé | EF | RTS 9(9) |
| D-04 | Début de la phase de test | **avant** | Consultation des TM sur l'analyse de risques et les mesures de maîtrise | EF | RTS 9(10) |
| D-05 | Contractualisation du TIP et des testeurs externes | **avant** | Preuves de conformité au DORA art. 27 et au RTS art. 7(1) transmises aux TM | EF | RTS 9(11) |
| D-06 | Approbation du plan de test red team (début de la phase active, R0) | **≥ 12 semaines** | Durée minimale de la phase active ; fin au plus tôt = R0 + 84 jours | RTT | RTS 11(5) |
| D-07 | Pendant la phase active | **≥ 1 fois / semaine** | Rapport d'avancement des RTT au CT et aux TM | RTT | RTS 11(7) |
| D-08 | Fin de la phase active, convenue entre CT, TIP, RTT et TM (R1) | **4 semaines** | Rapport de test red team (annexe V) remis au CT | RTT | RTS 12(2) |
| D-09 | R1 | **10 semaines** | Rapport de test blue team (annexe VI) remis au CT | BT | RTS 12(4) |
| D-10 | R1 | **10 semaines** | Replay (rejeu) des actions offensives et défensives, et exercice de purple teaming | BT + RTT (+ CT) | RTS 12(5) |
| D-11 | Notification par l'autorité que les rapports RT et BT sont complets (N2) | **8 semaines** | Rapport de synthèse du test (annexe VII) soumis pour approbation | EF | RTS 12(7) |
| D-12 | N2 | **8 semaines** | Plan de remédiation et documentation (DORA 26(6)) transmis à l'autorité TLPT et, si elle est différente, à l'autorité compétente | EF | RTS 13(1) |
| D-13 | Date du TLPT précédent | **≤ 3 ans** (l'autorité compétente peut réduire ou allonger) | Prochain TLPT | EF | DORA 26(1) |
| D-14 | Nombre de TLPT avec testeurs internes | **1 test sur 3** au moins avec des testeurs externes | Contrainte de cycle | EF | DORA 26(8) al. 1 |
| D-15 | Information des autorités des États membres d'accueil | **20 jours ouvrés** | Elles peuvent devenir observatrices ou désigner un TM (côté autorité, information) | AUT | RTS 16(1) |

> **Points de vigilance pour le calcul :**
> - Les délais D-11 et D-12 courent **à partir de la notification de l'autorité (N2)**, et non de la fin du replay.
>   La durée totale de la clôture dépend donc du délai d'évaluation de l'autorité, que le RTS ne fixe pas.
> - D-09 et D-10 sont des **plafonds** (« no later than »). Le rapport BT ne peut être produit qu'après réception du rapport RT (12(4)).
> - Une suspension (11(10)) ne suspend pas la règle des 12 semaines. Le purple teaming limité réalisé en phase de test
>   **compte** dans les 12 semaines (11(10)).
> - Le RTS ne fixe pas de délai à l'autorité pour ses validations : initiation, CT, SSD, TTIR, plan de test RT, rapport de synthèse.
>   L'outil les suit comme des **jalons d'attente**.

---

## 1. Assujettissement et cadre général

| ID | Exigence | Source | Porteur | Profils | Preuve attendue |
|---|---|---|---|---|---|
| G-01 | L'entité identifiée par l'autorité réalise un TLPT au moins tous les 3 ans. Ne sont pas concernées les entités de l'art. 16(1) DORA ni les microentreprises. La fréquence peut être modulée par l'autorité. | DORA 26(1) | EF | EF | Lettre d'identification / notification |
| G-02 | Le TLPT couvre plusieurs ou toutes les fonctions critiques ou importantes (FCI), **sur des systèmes de production**. | DORA 26(2) al. 1 | EF | EF | SSD |
| G-03 | L'entité identifie les systèmes, processus et technologies TIC qui supportent les FCI, y compris ceux externalisés auprès de prestataires TIC tiers. | DORA 26(2) al. 2 | EF | EF | SSD |
| G-04 | L'entité évalue quelles FCI doivent être couvertes. Le périmètre qui en résulte est validé par l'autorité. | DORA 26(2) al. 3 | EF / AUT | EF | SSD approuvé |
| G-05 | Si des prestataires TIC tiers sont dans le périmètre, l'entité organise leur participation et reste **pleinement responsable**. | DORA 26(3) | EF | EF | Accords avec les prestataires |
| G-06 | Test mutualisé (*pooled testing*) possible par accord écrit entre l'entité et le prestataire TIC tiers, sous la direction d'une entité désignée. | DORA 26(4) | EF | EF | Accord écrit |
| G-07 | L'entité, avec les prestataires TIC tiers et les testeurs (mais pas les autorités), applique des contrôles de gestion des risques sur les données, les actifs et la continuité des FCI. | DORA 26(5) | EF (+ TIP, RTT) | EF, TI, RT | Dossier de gestion des risques |
| G-08 | En fin de test, une fois les rapports et plans de remédiation arrêtés, l'entité (et le cas échéant les testeurs externes) fournit à l'autorité la synthèse des constats, les plans de remédiation et la documentation de conformité. | DORA 26(6) | EF (+ RTT externes) | EF, RT | Rapport de synthèse, plan de remédiation, dossier de preuves |
| G-09 | L'autorité délivre une **attestation**. L'entité notifie à l'autorité compétente l'attestation, la synthèse des constats et les plans de remédiation. | DORA 26(7) | AUT → EF | EF | Attestation + notification |
| G-10 | En cas de test mutualisé, l'entité reste pleinement responsable des impacts, même après l'attestation. | DORA 26(7) al. 2 | EF | EF | — |
| G-11 | Testeurs internes : **des testeurs externes au moins tous les trois tests**. | DORA 26(8) al. 1 | EF | EF | Historique des TLPT |
| G-12 | Établissements de crédit importants (« significant » au sens du MSU) : **uniquement des testeurs externes**. | DORA 26(8) al. 2 | EF | EF | Contrats |
| G-13 | Un TLPT mêlant testeurs internes et externes est considéré comme réalisé avec des testeurs internes au sens de l'art. 26(8). | RTS considérant (27) — interprétatif, non normatif. Encodé comme note `NOTE-RECITAL-27`, pas comme item. | EF | EF | — |
| G-14 | Critères d'identification des entités soumises au TLPT. Liste par défaut : G-SII/O-SII, IP/EME au-dessus des seuils, DCT, CCP, plateformes de négociation, (ré)assureurs au-dessus des seuils. | RTS 2 | AUT | EF (info) | — |

## 2. Organisation et confidentialité

| ID | Exigence | Source | Porteur | Profils | Preuve |
|---|---|---|---|---|---|
| O-01 | Nommer un **Control Team Lead** responsable de la gestion quotidienne et des décisions du CT. | RTS 4(1) | EF | EF | Nomination |
| O-02 | Accès aux informations du TLPT limité au **besoin d'en connaître** : CT, organe de direction, testeurs, TIP, autorité. | RTS 4(2)(a) | EF | EF, TI, RT | Liste des personnes informées |
| O-03 | Consulter les TM **avant** d'impliquer tout membre de la blue team. | RTS 4(2)(b) | EF | EF | Trace de consultation |
| O-04 | Le CT est informé de toute détection du TLPT et contient l'escalade éventuelle de la réponse à incident. | RTS 4(2)(c) | EF | EF | Procédure d'escalade |
| O-05 | Dispositifs de **secret** applicables au personnel de l'entité, aux prestataires TIC tiers concernés, aux testeurs et au TIP. | RTS 4(2)(d) | EF | EF, TI, RT | NDA / clauses |
| O-06 | Le CT fournit aux TM toute information sur le TLPT à leur demande. | RTS 4(2)(e) | EF | EF | — |
| O-07 | Les parties désignent le TLPT par son **nom de code** uniquement, dans la mesure du possible. | RTS 4(2)(f) | Tous | EF, TI, RT | Nom de code (cf. D-01) |

## 3. Gestion des risques

| ID | Exigence | Source | Porteur | Profils | Preuve |
|---|---|---|---|---|---|
| R-01 | Pendant la préparation, évaluer les risques du test en production des FCI, y compris l'impact sur le secteur financier et sur la stabilité financière (UE ou nationale). Revoir cette évaluation tout au long du test. | RTS 5(1) | EF | EF | Analyse de risques versionnée |
| R-02 | Couvrir au minimum les risques suivants : (a) accès du TIP et des testeurs externes aux informations sensibles ; (b) non-conformité entraînant l'absence d'attestation, notamment par rupture de confidentialité ou manque d'éthique ; (c) escalade de crise ou d'incident ; (d) phase red team active : interruption, corruption de données, impact sur les tiers ; (e) activité de la blue team, avec les mêmes risques ; (f) restauration incomplète. | RTS 5(2) | EF | EF | Analyse de risques |
| R-03 | TLPT commun (*joint*) ou mutualisé (*pooled*) : chaque CT fait sa propre analyse. L'entité désignée évalue en plus les risques communs, en coopération avec les autres CT. | RTS 6 | EF | EF | Analyse de risques commune |

## 4. Prestataires (TIP / testeurs)

### 4.1 Exigences générales sur les testeurs (DORA 27)

| ID | Exigence | Source | Porteur | Profils | Preuve |
|---|---|---|---|---|---|
| P-01 | Testeurs de la plus haute aptitude et honorabilité. | DORA 27(1)(a) | EF (vérifie) / TIP, RTT (démontrent) | EF, TI, RT | Due diligence |
| P-02 | Capacités techniques et organisationnelles, expertise en threat intelligence, tests d'intrusion et red team. | DORA 27(1)(b) | idem | EF, TI, RT | CV, références |
| P-03 | Certification par un organisme d'accréditation d'un État membre **ou** adhésion à des codes de conduite ou cadres éthiques formels. | DORA 27(1)(c) | idem | EF, TI, RT | Certificats / code de conduite |
| P-04 | Assurance indépendante ou rapport d'audit sur la gestion des risques du TLPT : protection des informations confidentielles, réparation des risques métier. | DORA 27(1)(d) | idem | EF, TI, RT | Rapport d'audit / assurance |
| P-05 | Assurance responsabilité civile professionnelle couvrant la faute et la négligence. | DORA 27(1)(e) | idem | EF, TI, RT | Attestation d'assurance |
| P-06 | Testeurs internes : (a) approbation par l'autorité ; (b) l'autorité a vérifié les ressources et l'absence de conflit d'intérêts ; (c) **le TIP est externe**. | DORA 27(2) | EF | EF | Décision d'approbation |
| P-07 | Les contrats avec les testeurs externes imposent une gestion saine des résultats du TLPT et de leur traitement (production, stockage, agrégation, rapport, communication, destruction). | DORA 27(3) | EF | EF, TI, RT | Contrat |

### 4.2 Exigences détaillées (RTS 7)

| ID | Exigence | Source | Porteur | Profils | Preuve |
|---|---|---|---|---|---|
| P-10 | Le TIP et les testeurs externes fournissent un **CV détaillé** et une **copie des certifications** reconnues par le marché. | RTS 7(1)(a) | TIP, RTT | EF, TI, RT | CV, certificats |
| P-11 | Assurance RC professionnelle couvrant la faute et la négligence. | RTS 7(1)(b) | TIP, RTT | EF, TI, RT | Attestation |
| P-12 | TIP : **au moins 3 références** de missions en test d'intrusion ou red team. | RTS 7(1)(c) | TIP | EF, TI | Références |
| P-13 | Testeurs externes : **au moins 5 références** de missions en test d'intrusion ou red team. | RTS 7(1)(d) | RTT | EF, RT | Références |
| P-14 | Équipe TIP : un manager avec **≥ 5 ans** d'expérience en TI et au moins un autre membre avec **≥ 2 ans**. Compétences en collecte, géopolitique, technique, sectoriel et communication. **≥ 3 missions** TI cumulées. | RTS 7(1)(e)(i)-(iii) | TIP | EF, TI | CV |
| P-15 | Équipe TIP : aucune tâche blue team ni service en conflit d'intérêts. **Séparée** du personnel RT du même prestataire et sans lien hiérarchique avec lui. | RTS 7(1)(e)(iv)-(v) | TIP | EF, TI, TI+RT | Organigramme, déclaration |
| P-16 | Équipe RT externe : un manager avec **≥ 5 ans** et **au moins 2 testeurs** avec ≥ 2 ans chacun. Compétences : métier, reconnaissance, risques, exploits, intrusion physique, ingénierie sociale, vulnérabilités, communication. **≥ 5 missions** cumulées. | RTS 7(1)(f)(i)-(iii) | RTT | EF, RT | CV |
| P-17 | Équipe RT : pas d'emploi ni de prestation pour un TIP qui exerce en même temps des tâches blue team pour une partie au TLPT. **Séparée** du personnel TI du même prestataire. | RTS 7(1)(f)(iv)-(v) | RTT | EF, RT, TI+RT | Organigramme, déclaration |
| P-18 | Restauration en fin de test (TIP et RTT) : suppression sécurisée des mots de passe, identifiants et clés compromis ; communication sécurisée des comptes compromis ; collecte, stockage, gestion et destruction sécurisés des données. | RTS 7(1)(g) | TIP, RTT | EF, TI, RT | PV de restauration |
| P-19 | Restauration propre aux testeurs : désactivation du C2, *kill switches* par périmètre et par date, retrait des backdoors et malwares, notification éventuelle de violation, procédures de restauration de sauvegardes, surveillance de la BT et information du CT en cas de détection. | RTS 7(1)(h) | RTT | EF, RT | PV de restauration |
| P-20 | Activités **interdites** : destruction non autorisée d'équipements ; modification non contrôlée d'informations ou d'actifs ; atteinte intentionnelle à la continuité des FCI ; inclusion non autorisée de systèmes hors périmètre ; divulgation non autorisée des résultats. | RTS 7(1)(i) | TIP, RTT | EF, TI, RT | Règles d'engagement |
| P-21 | Le CT **conserve la documentation** prouvant la conformité aux points (a) à (f). | RTS 7(2) al. 1 | EF | EF | Dossier prestataires |
| P-22 | **Dérogation exceptionnelle** : un prestataire qui ne remplit pas tous les critères (a) à (f) est possible, avec des mesures d'atténuation appropriées et **consignées**. | RTS 7(2) al. 2 | EF | EF | Mesures documentées |

## 5. Phase de préparation (RTS 9)

| ID | Exigence | Source | Porteur | Profils | Délai | Preuve |
|---|---|---|---|---|---|---|
| PR-01 | Le TLPT démarre sur **notification** de l'autorité. | RTS 9(1) | AUT → EF | EF | N0 | Notification |
| PR-02 | Remettre les informations d'initiation : charte projet (annexe I), contact du CTL, testeurs internes ou externes, canaux de communication, nom de code. | RTS 9(2) | EF | EF | D-01 (3 mois) | Dossier d'initiation |
| PR-03 | L'autorité valide les informations d'initiation et le notifie. | RTS 9(3) | AUT | EF (attente) | — | Notification de validation |
| PR-04 | Après cette validation, constituer le CT. Ses missions : canaux de communication, information de l'organe de direction, décisions, exécution conforme, choix du TIP et des testeurs, rédaction du SSD. | RTS 9(4) | EF | EF | après PR-03 | Composition du CT |
| PR-05 | L'autorité valide la composition du CT **et chacune de ses modifications**. | RTS 9(5) | AUT | EF (attente) | — | Validation |
| PR-06 | Remettre le **SSD** (annexe II), **approuvé par l'organe de direction**. | RTS 9(6) | EF | EF | D-02 (6 mois) | SSD + décision de l'organe de direction |
| PR-07 | Critères d'inclusion des FCI : criticité et impact sectoriel, importance pour l'activité, substituabilité, interconnexion, localisation, dépendance du secteur, threat intelligence disponible. | RTS 9(7) | EF | EF | — | Justification dans le SSD |
| PR-08 | Communiquer les informations d'initiation et le SSD au TIP et aux testeurs **une fois contractualisés**, et les informer du processus. | RTS 9(8) | EF | EF, TI, RT | — | Trace d'envoi |
| PR-09 | Achat ou affectation des testeurs et du TIP **terminé avant** la phase de test. | RTS 9(9) | EF | EF | D-03 | Contrats |
| PR-10 | Consulter les TM sur l'analyse de risques **avant** la phase de test. La réviser si l'autorité la juge insuffisante. | RTS 9(10) | EF | EF | D-04 | Avis des TM |
| PR-11 | Évaluer et **documenter** la conformité des prestataires (DORA 27, RTS 7(1)). Remettre les preuves aux TM **avant contractualisation**. **Ne pas contractualiser** si l'autorité s'y oppose (y compris pour des motifs de sécurité nationale). | RTS 9(11) | EF | EF, TI, RT | D-05 | Évaluation + preuves |
| PR-12 | L'autorité approuve le SSD et informe le CTL. | RTS 9(12) | AUT | EF (attente) | — | Approbation |

**Annexe I — charte projet** : CTL (nom, contact) ; testeurs internes, externes ou les deux ; canaux (chiffrement des mails,
data rooms, messagerie instantanée) ; nom de code ; FCI exploitées dans d'autres États membres (avec la liste des États) ;
FCI supportées par des prestataires TIC tiers (avec leur identification) ; échéances prévues pour la préparation, le test,
la clôture et le plan de remédiation.

**Annexe II — SSD** : liste de toutes les FCI. Pour chaque FCI exclue, la justification. Pour chaque FCI incluse : la justification,
les systèmes TIC qui la supportent et, pour chaque système, s'il est externalisé (avec le nom du prestataire), les juridictions
d'utilisation et une description des *flags* préliminaires (C/I/A/authenticité).

## 6. Phase de test — threat intelligence (RTS 10)

| ID | Exigence | Source | Porteur | Profils | Preuve |
|---|---|---|---|---|---|
| TI-01 | Après approbation du SSD, analyser la menace générique et sectorielle (le GTL national peut servir de base), les menaces et vulnérabilités, et la menace et les cibles propres à l'entité, en consultant le CT et les TM. | RTS 10(1) | TIP | TI | Notes d'analyse |
| TI-02 | Présenter les menaces et proposer des scénarios **différenciés** (acteurs et TTP), **couvrant chaque FCI** du périmètre. | RTS 10(2) | TIP | TI, EF | Liste longue de scénarios |
| TI-03 | Le CTL retient **au moins 3 scénarios**. Critères : recommandation du TIP, avis des TM, faisabilité selon les testeurs, profil de l'entité. | RTS 10(3) | EF | EF | Décision de sélection |
| TI-04 | **Au plus 1** scénario non fondé sur la menace (prospectif). | RTS 10(4) al. 1 | EF / TIP | EF, TI | — |
| TI-05 | TLPT mutualisé : au moins 1 scénario inclut les systèmes du prestataire TIC tiers. TLPT commun avec un prestataire intragroupe : au moins 1 scénario inclut les systèmes de ce prestataire. | RTS 10(4) al. 2-3 | EF / TIP | EF, TI | — |
| TI-06 | Remettre au CT le **rapport de threat intelligence ciblée** (TTIR, annexe III) avec les scénarios retenus. | RTS 10(5) | TIP | TI, EF | TTIR |
| TI-07 | Le CT soumet le TTIR aux TM ; l'autorité l'approuve. | RTS 10(6) | EF / AUT | EF | Approbation |

**Annexe III — TTIR** :
- périmètre de la recherche : FCI, géographie, **langue officielle de l'UE utilisée**, prestataires TIC tiers, période couverte ;
- renseignement exploitable : identifiants, domaines sosies, reconnaissance technique, publications des employés, dark web, autres, ciblage physique ;
- analyse du contexte : géopolitique, économique, technologique ;
- profils d'acteurs malveillants ;
- **au moins 3 scénarios de bout en bout**, dont un sur la disponibilité, un sur l'intégrité et un sur la confidentialité ;
- le scénario non fondé sur la menace, s'il y en a un.

## 7. Phase de test — red team (RTS 11)

| ID | Exigence | Source | Porteur | Profils | Délai | Preuve |
|---|---|---|---|---|---|---|
| RT-01 | Après approbation du TTIR, rédiger le **plan de test red team** (annexe IV) à partir du SSD et du TTIR. | RTS 11(1) | RTT | RT | — | Plan de test RT |
| RT-02 | Consulter le CT, le TIP et les TM sur le plan : communication, gestion de projet, préparation et cas d'usage des *leg-ups*, modalités de reporting. | RTS 11(2) | RTT | RT, EF, TI | — | CR de réunion |
| RT-03 | Le **CT et l'autorité** approuvent le plan de test RT. | RTS 11(3) | EF + AUT | EF, RT | — | Approbations |
| RT-04 | Exécuter le test pendant la phase active, après approbation du plan. | RTS 11(4) | RTT | RT | R0 | — |
| RT-05 | Phase active **≥ 12 semaines**, proportionnée au périmètre. Scénarios en séquence ou en parallèle. **Fin convenue** entre le CT, le TIP, les RTT et les TM. | RTS 11(5) | Tous | EF, TI, RT | D-06 | PV de fin de phase active (R1) |
| RT-06 | Toute modification du plan après approbation (calendrier, périmètre, cibles, *flags*) est approuvée par le CTL **et** les TM. | RTS 11(6) | EF + AUT | EF, RT | — | Registre des changements |
| RT-07 | Les RTT font un rapport **au moins hebdomadaire** au CT et aux TM. Le TIP reste disponible. | RTS 11(7) | RTT, TIP | RT, TI, EF | D-07 | Comptes rendus hebdomadaires |
| RT-08 | Le CT fournit **à temps** les *leg-ups* prévus au plan. Tout ajout ou adaptation est approuvé par le CT et les TM. | RTS 11(8) | EF | EF, RT | — | Registre des leg-ups |
| RT-09 | En cas de **détection** par du personnel, le CT propose aux TM des mesures de poursuite qui préservent le secret, et les TM les valident. | RTS 11(9) | EF | EF, RT | — | Registre des détections |
| RT-10 | Circonstances exceptionnelles : le CTL peut **suspendre** le test. En dernier recours, et après validation de l'autorité, il peut le poursuivre en **purple teaming limité**, qui compte dans les 12 semaines. | RTS 11(10) | EF | EF, RT | — | Décision motivée |

**Annexe IV — plan de test RT** : canaux et procédures ; TTP autorisées et interdites (limites éthiques de l'ingénierie sociale) ;
mesures de gestion des risques ; pour chaque scénario : acteur simulé, intention, fonctions et systèmes ciblés, C/I/A/authenticité, *flags* ;
chemins d'attaque prévus, prérequis et *leg-ups* avec leurs échéances ; planning de chaque scénario, découpé au minimum en *in / through / out* ;
particularités de l'infrastructure ; ressources complémentaires.

## 8. Phase de clôture (RTS 12)

| ID | Exigence | Source | Porteur | Profils | Délai | Preuve |
|---|---|---|---|---|---|---|
| CL-01 | Après la phase active, le CTL **informe la blue team** qu'un TLPT a eu lieu. | RTS 12(1) | EF | EF | après R1 | Date d'information |
| CL-02 | Remettre au CT le **rapport de test RT** (annexe V). | RTS 12(2) | RTT | RT | D-08 (R1 + 4 sem.) | Rapport RT |
| CL-03 | Le CT transmet le rapport RT à la BT et aux TM sans délai injustifié. Sur demande des TM, ce rapport ne contient pas d'informations sensibles. | RTS 12(3) | EF | EF | — | Trace de transmission |
| CL-04 | Remettre au CT le **rapport de test BT** (annexe VI). Le CT le transmet aux RTT et aux TM. | RTS 12(4) | BT / EF | EF | D-09 (R1 + 10 sem.) | Rapport BT |
| CL-05 | **Replay** des actions offensives et défensives par la BT et les RTT, puis **purple teaming** sur des sujets choisis ensemble (vulnérabilités, points non testés). | RTS 12(5) | BT, RTT, EF | EF, RT | D-10 (R1 + 10 sem.) | CR replay / PT |
| CL-06 | Après le replay et le PT, **retours réciproques** entre le CT, la BT, les RTT et le TIP. Les TM peuvent y participer. | RTS 12(6) | Tous | EF, TI, RT | — | Retours écrits |
| CL-07 | Après la notification de l'autorité (rapports RT et BT complets, N2), remettre pour approbation le **rapport de synthèse** (annexe VII). Sur demande, il ne contient pas d'informations sensibles. | RTS 12(7) | EF | EF | D-11 (N2 + 8 sem.) | Rapport de synthèse |

**Annexe V — rapport RT** : fonctions et systèmes ciblés ; synthèse de chaque scénario ; *flags* atteints ou non ; chemins d'attaque réussis ou non ;
TTP réussies ou non ; écarts au plan ; *leg-ups* accordés ; actions de la BT connues ; vulnérabilités (criticité), analyse des causes racines,
recommandations priorisées. Si des testeurs internes ont participé, le préciser (RTS 15(3)).

**Annexe VI — rapport BT** : pour chaque étape d'attaque, les détections et les journaux correspondants ; évaluation des constats des RTT ;
preuves collectées ; analyse des causes racines ; enseignements ; sujets de purple teaming.

**Annexe VII — rapport de synthèse** : parties ; plan projet ; périmètre validé et justification ; scénarios et écarts par rapport au TTIR ;
chemins d'attaque et TTP ; *flags* capturés ou non ; écarts au plan RT ; détections de la BT ; PT en phase de test ; *leg-ups* ;
mesures de gestion des risques ; vulnérabilités et criticité ; causes racines ; plan de remédiation de haut niveau ; enseignements.

## 9. Remédiation et attestation (RTS 13-14)

| ID | Exigence | Source | Porteur | Profils | Délai | Preuve |
|---|---|---|---|---|---|---|
| RM-01 | Transmettre les **plans de remédiation** et la documentation DORA 26(6) à l'autorité TLPT et, si elle est différente, à l'autorité compétente. | RTS 13(1) | EF | EF | D-12 (N2 + 8 sem.) | Plan de remédiation |
| RM-02 | Contenu, pour chaque constat : description du manquement ; mesures proposées, priorité et échéance ; **cause racine** ; responsables ; risques à ne pas agir, et le cas échéant risques à agir. | RTS 13(2) | EF | EF | — | Plan de remédiation |
| AT-01 | L'attestation contient les informations de l'annexe VIII. En cas de pluralité d'autorités, c'est l'autorité chef de file qui la délivre. | RTS 14 | AUT | EF (attente) | — | Attestation |
| AT-02 | Notifier à l'autorité compétente l'attestation, la synthèse et les plans de remédiation. | DORA 26(7) | EF | EF | après AT-01 | Notification |

**Annexe VIII — attestation** : dates de début et de fin ; FCI du périmètre ; FCI non testées ; autres entités ; prestataires TIC tiers ;
recours à des testeurs internes ; recours à la dérogation pour les prestataires (cf. remarque R-A ci-dessous) ;
**durée de la phase active en jours calendaires** ; autres autorités et leur rôle ; documents examinés.

## 10. Testeurs internes (RTS 15)

| ID | Exigence | Source | Porteur | Profils | Preuve |
|---|---|---|---|---|---|
| IT-01 | Politique de gestion des testeurs internes : critères d'aptitude, de compétence et de conflit d'intérêts ; responsabilités ; documentée et revue périodiquement. | RTS 15(1)(a) | EF | EF | Politique |
| IT-02 | Mesures pour que le recours aux testeurs internes ne dégrade pas les capacités de défense ni les ressources TIC. | RTS 15(1)(b) | EF | EF | Mesures |
| IT-03 | Ressources et capacités suffisantes des testeurs internes. | RTS 15(1)(c) | EF | EF | Plan de charge |
| IT-04 | Équipe interne : 1 *test lead* et **au moins 2 membres**, tous employés par l'entité ou un prestataire intragroupe depuis **12 mois**, avec des formations prévues. | RTS 15(1) al. 2 (c)-(e) | EF | EF | Liste et ancienneté |
| IT-05 | Mentionner le recours à des testeurs internes dans l'initiation, le rapport RT et le rapport de synthèse. | RTS 15(3) | EF | EF | — |
| IT-06 | Les testeurs d'un prestataire TIC intragroupe sont considérés comme internes. | RTS 15(4) | EF | EF | — |
| IT-07 | Pour approuver le recours à des testeurs internes, l'autorité tient compte des exigences de l'art. 7(1) (information). | RTS 15(2) | AUT | EF (info) | — |

## 11. TLPT communs, mutualisés et transfrontières (RTS 8, 16)

| ID | Exigence | Source | Porteur | Profils | Preuve |
|---|---|---|---|---|---|
| MP-01 | Sauf décision contraire de l'autorité chef de file, **chaque entité** d'un TLPT commun ou mutualisé suit les étapes des art. 9 à 15. | RTS 8(1) | EF | EF | — |
| MP-02 | Dans ce cas, « autorité TLPT » désigne l'autorité chef de file. | RTS 8(2) | — | EF (info) | — |
| MP-03 | Entité présente dans plusieurs États membres : l'autorité d'origine associe les autorités d'accueil, qui ont 20 jours ouvrés pour se positionner (D-15). | RTS 16(1) | AUT | EF (info) | — |
| MP-04 | Un TLPT commun est **préféré** à des TLPT individuels s'il réduit les coûts sans nuire à l'efficacité. | RTS 16(2) | AUT | EF (info) | — |

---

## 12. Remarques sur le texte (à suivre)

- **R-A** : l'annexe VIII (a)(vi)(2) renvoie à « Article 5(3), second subparagraph », qui n'existe pas dans le règlement :
  l'art. 5 n'a que 2 paragraphes. Le renvoi vise vraisemblablement la dérogation de l'**art. 7(2), second alinéa**
  (prestataires non conformes), comme le confirme l'item (g) de l'attestation TIBER-EU. Il faudra le vérifier dans d'autres
  versions linguistiques ou dans un éventuel rectificatif.
- **R-B** : l'art. 11(3) dit « *the TLPT shall inform the control team lead* ». Il faut lire « *the TLPT authority* ».
- **R-C** : le RTS ne fixe pas de délai de réponse à l'autorité. L'outil doit permettre de saisir les dates de validation
  et de signaler une attente anormalement longue, sans alerte réglementaire.
