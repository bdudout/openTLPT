# Points de conformité suivis par openTLPT

> Document **généré** par `tools/gen_compliance_doc.py` à partir des packs du référentiel. Ne pas modifier à la main.
> Référentiel : `core@0.1.0` · `dora-rts@0.3.0` · `tiber-eu@0.2.0` · `tiber-fr@0.2.0`. Les libellés sont des synthèses : le texte qui fait foi est celui publié au JO de l'UE.

## Lecture

openTLPT distingue deux familles d'**obligations** (DORA art. 26-27 et règlement délégué (UE) 2025/1190) :

| Famille | Nombre | Ce que c'est | Quand s'en assurer |
|---|---|---|---|
| **A. Points permanents (socle)** | 47 | Conditions qui valent pour tout l'exercice : assujettissement, périmètre, testeurs, exigences sur les prestataires, organisation, confidentialité, gestion des risques | Dès le cadrage, puis à revérifier à chaque changement (prestataire, périmètre, testeurs, incident) |
| **B. Points au fil du test** | 45 | Étapes datées, livrables et validations exigés phase par phase, de la notification à l'attestation | Au moment de l'étape concernée ; les délais sont calculés par l'outil |

Les **bonnes pratiques TIBER** (63 éléments, partie D) ne sont **pas** des obligations : elles aident à se poser les bonnes questions et ne comptent jamais dans la conformité.

Colonnes : **Profils** = rôles qui voient l'item (Entité financière, prestataire TI, prestataire RT ; TI+RT voit les deux). **Condition** = l'item n'apparaît que si la caractéristique de l'exercice est remplie. **Info** = jalon qui dépend de l'autorité, affiché sans case à cocher.

## A. Points de conformité permanents (47)

### Assujettissement, fréquence et périmètre (5)

| ID | Exigence | Référence | Porteur | Profils | Condition |
|---|---|---|---|---|---|
| `DORA-26.1` | TLPT au moins tous les 3 ans | DORA, art. 26(1) | Entité financière | Entité | — |
| `DORA-26.2.1` | Plusieurs ou toutes les FCI, en production | DORA, art. 26(2) al. 1 | Entité financière | Entité | — |
| `DORA-26.2.2` | Identifier les systèmes TIC qui supportent les FCI | DORA, art. 26(2) al. 2 | Entité financière | Entité | — |
| `DORA-26.2.3` | Évaluer les FCI à couvrir ; périmètre validé par l'autorité | DORA, art. 26(2) al. 3 | Entité financière, Autorité compétente | Entité | — |
| `RTS-2` | Critères d'identification des entités soumises au TLPT *(info)* | RTS 2025/1190, art. 2 | Autorité TLPT | Entité | — |

### Prestataires TIC tiers, test mutualisé et maîtrise des risques du test (3)

| ID | Exigence | Référence | Porteur | Profils | Condition |
|---|---|---|---|---|---|
| `DORA-26.3` | Organiser la participation des prestataires TIC tiers | DORA, art. 26(3) | Entité financière | Entité | Prestataires TIC tiers dans le périmètre |
| `DORA-26.4` | Test mutualisé par accord écrit | DORA, art. 26(4) | Entité financière, Prestataire TIC tiers | Entité | TLPT mutualisé (DORA 26(4)) |
| `DORA-26.5` | Contrôles de gestion des risques du test | DORA, art. 26(5) | Entité financière, Prestataire TIC tiers, Testeurs (red team), Prestataire de threat intelligence | Entité, TI, RT | — |

### Testeurs internes ou externes (6)

| ID | Exigence | Référence | Porteur | Profils | Condition |
|---|---|---|---|---|---|
| `DORA-26.8.1` | Testeurs externes au moins tous les trois tests | DORA, art. 26(8) al. 1 | Entité financière | Entité | Testeurs utilisés ∈ {internes, mixtes} |
| `DORA-26.8.2` | Établissement « significant » : testeurs externes uniquement | DORA, art. 26(8) al. 2 | Entité financière | Entité | Établissement de crédit « significant » (MSU) |
| `DORA-27.2` | Conditions du recours aux testeurs internes | DORA, art. 27(2) | Entité financière, Autorité compétente | Entité | Testeurs utilisés ∈ {internes, mixtes} |
| `RTS-15.1` | Dispositif pour testeurs internes | RTS 2025/1190, art. 15(1) | Entité financière | Entité | Testeurs utilisés ∈ {internes, mixtes} |
| `RTS-15.2` | Approbation des testeurs internes au regard de l'art. 7(1) *(info)* | RTS 2025/1190, art. 15(2) | Autorité TLPT | Entité | Testeurs utilisés ∈ {internes, mixtes} |
| `RTS-15.4` | Testeurs intragroupe = testeurs internes *(info)* | RTS 2025/1190, art. 15(4) | Entité financière | Entité | — |

### Exigences sur les prestataires (TI et red team) (19)

| ID | Exigence | Référence | Porteur | Profils | Condition |
|---|---|---|---|---|---|
| `DORA-27.1.a` | Testeurs de la plus haute aptitude et honorabilité | DORA, art. 27(1)(a) | Control team, Prestataire de threat intelligence, Testeurs (red team) | Entité, TI, RT | — |
| `DORA-27.1.b` | Capacités et expertise démontrées | DORA, art. 27(1)(b) | Control team, Prestataire de threat intelligence, Testeurs (red team) | Entité, TI, RT | — |
| `DORA-27.1.c` | Certification ou code de conduite | DORA, art. 27(1)(c) | Control team, Prestataire de threat intelligence, Testeurs (red team) | Entité, TI, RT | — |
| `DORA-27.1.d` | Assurance indépendante ou rapport d'audit | DORA, art. 27(1)(d) | Control team, Prestataire de threat intelligence, Testeurs (red team) | Entité, TI, RT | — |
| `DORA-27.1.e` | Assurance responsabilité civile professionnelle | DORA, art. 27(1)(e) | Control team, Prestataire de threat intelligence, Testeurs (red team) | Entité, TI, RT | — |
| `DORA-27.3` | Contrats : gestion saine des résultats | DORA, art. 27(3) | Entité financière | Entité, TI, RT | — |
| `RTS-7.1.a` | CV détaillés et copies des certifications | RTS 2025/1190, art. 7(1)(a) | Prestataire de threat intelligence, Testeurs (red team) | Entité, TI, RT | — |
| `RTS-7.1.b` | Assurance RC professionnelle | RTS 2025/1190, art. 7(1)(b) | Prestataire de threat intelligence, Testeurs (red team) | Entité, TI, RT | — |
| `RTS-7.1.c` | TIP : au moins 3 références | RTS 2025/1190, art. 7(1)(c) | Prestataire de threat intelligence | Entité, TI | — |
| `RTS-7.1.d` | Testeurs externes : au moins 5 références | RTS 2025/1190, art. 7(1)(d) | Testeurs (red team) | Entité, RT | — |
| `RTS-7.1.e.i` | Composition et expérience de l'équipe TI | RTS 2025/1190, art. 7(1)(e)(i)-(iii) | Prestataire de threat intelligence | Entité, TI | — |
| `RTS-7.1.e.iv` | TI : pas de tâches blue team ni de conflit d'intérêts | RTS 2025/1190, art. 7(1)(e)(iv) | Prestataire de threat intelligence | Entité, TI | — |
| `RTS-7.1.e.v` | Équipe TI séparée de l'équipe RT du même prestataire | RTS 2025/1190, art. 7(1)(e)(v) | Prestataire de threat intelligence | Entité, TI | — |
| `RTS-7.1.f.i` | Composition et expérience de la red team | RTS 2025/1190, art. 7(1)(f)(i)-(iii) | Testeurs (red team) | Entité, RT | — |
| `RTS-7.1.f.iv` | Red team : indépendance vis-à-vis d'un TIP faisant du blue team | RTS 2025/1190, art. 7(1)(f)(iv) | Testeurs (red team) | Entité, RT | — |
| `RTS-7.1.f.v` | Équipe RT séparée de l'équipe TI du même prestataire | RTS 2025/1190, art. 7(1)(f)(v) | Testeurs (red team) | Entité, RT | — |
| `RTS-7.1.i` | Activités interdites | RTS 2025/1190, art. 7(1)(i) | Prestataire de threat intelligence, Testeurs (red team) | Entité, TI, RT | — |
| `RTS-7.2.1` | Conserver les preuves de conformité des prestataires | RTS 2025/1190, art. 7(2) al. 1 | Control team | Entité | — |
| `RTS-7.2.2` | Dérogation exceptionnelle pour un prestataire | RTS 2025/1190, art. 7(2) al. 2 | Entité financière | Entité | Dérogation prestataire (RTS 7(2) al. 2) |

### Organisation et confidentialité (7)

| ID | Exigence | Référence | Porteur | Profils | Condition |
|---|---|---|---|---|---|
| `RTS-4.1` | Nommer un Control Team Lead | RTS 2025/1190, art. 4(1) | Entité financière | Entité | — |
| `RTS-4.2.a` | Accès limité au besoin d'en connaître | RTS 2025/1190, art. 4(2)(a) | Entité financière | Entité, TI, RT | — |
| `RTS-4.2.b` | Consulter les TM avant d'impliquer la blue team | RTS 2025/1190, art. 4(2)(b) | Control team | Entité | — |
| `RTS-4.2.c` | Être informé des détections et contenir l'escalade | RTS 2025/1190, art. 4(2)(c) | Control team | Entité | — |
| `RTS-4.2.d` | Dispositifs de secret | RTS 2025/1190, art. 4(2)(d) | Entité financière | Entité, TI, RT | — |
| `RTS-4.2.e` | Informer les TM sur demande | RTS 2025/1190, art. 4(2)(e) | Control team | Entité | — |
| `RTS-4.2.f` | Désigner le TLPT par son nom de code | RTS 2025/1190, art. 4(2)(f) | Entité financière, Prestataire de threat intelligence, Testeurs (red team) | Entité, TI, RT | — |

### Gestion des risques du TLPT (3)

| ID | Exigence | Référence | Porteur | Profils | Condition |
|---|---|---|---|---|---|
| `RTS-5.1` | Analyser les risques du test en production | RTS 2025/1190, art. 5(1) | Control team | Entité | — |
| `RTS-5.2` | Types de risques à couvrir au minimum | RTS 2025/1190, art. 5(2) | Control team | Entité | — |
| `RTS-6` | Risques des TLPT communs ou mutualisés | RTS 2025/1190, art. 6 | Control team | Entité | TLPT mutualisé (DORA 26(4)) ou TLPT commun (RTS 1(18)) |

### TLPT communs, mutualisés et transfrontières (4)

| ID | Exigence | Référence | Porteur | Profils | Condition |
|---|---|---|---|---|---|
| `RTS-8.1` | Chaque entité suit les étapes des art. 9 à 15 | RTS 2025/1190, art. 8(1) | Entité financière | Entité | TLPT mutualisé (DORA 26(4)) ou TLPT commun (RTS 1(18)) |
| `RTS-8.2` | Autorité chef de file *(info)* | RTS 2025/1190, art. 8(2) | Autorité TLPT | Entité | TLPT mutualisé (DORA 26(4)) ou TLPT commun (RTS 1(18)) |
| `RTS-16.1` | Association des autorités d'accueil *(info)* | RTS 2025/1190, art. 16(1) | Autorité TLPT | Entité | FCI exploitées dans plusieurs États membres |
| `RTS-16.2` | Préférence pour le TLPT commun *(info)* | RTS 2025/1190, art. 16(2) | Autorité TLPT | Entité | TLPT commun (RTS 1(18)) ou FCI exploitées dans plusieurs États membres |

## B. Points de conformité au fil du test (45)

### Préparation (12)

| ID | Exigence | Référence | Délai | Livrable | Profils | Condition |
|---|---|---|---|---|---|---|
| `RTS-9.1` | Notification de l'autorité *(info)* | RTS 2025/1190, art. 9(1) | — | — | Entité | — |
| `RTS-9.2` | Remettre les informations d'initiation | RTS 2025/1190, art. 9(2) | `D-01` ≤ 3 mois après « Réception de la notification TLPT » | Informations d'initiation (charte projet) | Entité | — |
| `RTS-9.3` | Validation de l'initiation par l'autorité *(info)* | RTS 2025/1190, art. 9(3) | — | Informations d'initiation (charte projet) | Entité | — |
| `RTS-9.4` | Constituer le control team | RTS 2025/1190, art. 9(4) | — | — | Entité | — |
| `RTS-9.5` | Validation de la composition du CT et de ses changements *(info)* | RTS 2025/1190, art. 9(5) | — | — | Entité | — |
| `RTS-9.6` | Remettre le SSD approuvé par l'organe de direction | RTS 2025/1190, art. 9(6) | `D-02` ≤ 6 mois après « Réception de la notification TLPT » | Document de spécification du périmètre | Entité | — |
| `RTS-9.7` | Critères d'inclusion des FCI | RTS 2025/1190, art. 9(7) | — | Document de spécification du périmètre | Entité | — |
| `RTS-9.8` | Partager l'initiation et le SSD avec les prestataires | RTS 2025/1190, art. 9(8) | — | — | Entité, TI, RT | — |
| `RTS-9.9` | Prestataires en place avant la phase de test | RTS 2025/1190, art. 9(9) | `D-03` avant « Début de la phase de test » | — | Entité, TI, RT | — |
| `RTS-9.10` | Consulter les TM sur l'analyse de risques | RTS 2025/1190, art. 9(10) | `D-04` avant « Début de la phase de test » | Analyse de risques et mesures de maîtrise | Entité | — |
| `RTS-9.11` | Évaluer les prestataires et transmettre les preuves avant contrat | RTS 2025/1190, art. 9(11) | `D-05` avant « Contrats TIP / testeurs externes signés » | Preuves de conformité des prestataires (DORA 27, RTS 7(1)) | Entité, TI, RT | — |
| `RTS-9.12` | Approbation du SSD par l'autorité *(info)* | RTS 2025/1190, art. 9(12) | — | Document de spécification du périmètre | Entité | — |

### Test : threat intelligence (7)

| ID | Exigence | Référence | Délai | Livrable | Profils | Condition |
|---|---|---|---|---|---|---|
| `RTS-10.1` | Analyse de la menace et du ciblage | RTS 2025/1190, art. 10(1) | — | — | Entité, TI | — |
| `RTS-10.2` | Proposer des scénarios différenciés couvrant chaque FCI | RTS 2025/1190, art. 10(2) | — | — | Entité, TI | — |
| `RTS-10.3` | Sélectionner au moins 3 scénarios | RTS 2025/1190, art. 10(3) | — | — | Entité | — |
| `RTS-10.4.1` | Au plus un scénario non fondé sur la menace | RTS 2025/1190, art. 10(4) al. 1 | — | — | Entité, TI | — |
| `RTS-10.4.2` | Scénario incluant le prestataire TIC tiers ou intragroupe | RTS 2025/1190, art. 10(4) al. 2-3 | — | — | Entité, TI | TLPT mutualisé (DORA 26(4)) ou TLPT commun (RTS 1(18)) |
| `RTS-10.5` | Remettre le TTIR | RTS 2025/1190, art. 10(5) | — | Rapport de threat intelligence ciblée | Entité, TI | — |
| `RTS-10.6` | Approbation du TTIR par l'autorité | RTS 2025/1190, art. 10(6) | — | Rapport de threat intelligence ciblée | Entité | — |

### Test : red team (10)

| ID | Exigence | Référence | Délai | Livrable | Profils | Condition |
|---|---|---|---|---|---|---|
| `RTS-11.1` | Rédiger le plan de test red team | RTS 2025/1190, art. 11(1) | — | Plan de test red team | Entité, RT | — |
| `RTS-11.2` | Consulter CT, TIP et TM sur le plan | RTS 2025/1190, art. 11(2) | — | Plan de test red team | Entité, TI, RT | — |
| `RTS-11.3` | Approbation du plan de test RT | RTS 2025/1190, art. 11(3) | — | Plan de test red team | Entité, RT | — |
| `RTS-11.4` | Exécuter le test après approbation du plan | RTS 2025/1190, art. 11(4) | — | — | Entité, RT | — |
| `RTS-11.5` | Phase active d'au moins 12 semaines, fin convenue | RTS 2025/1190, art. 11(5) | `D-06` ≥ 12 semaines entre « Plan de test RT approuvé, début de la phase active » et « Fin convenue de la phase active » | — | Entité, TI, RT | — |
| `RTS-11.6` | Approuver toute modification du plan | RTS 2025/1190, art. 11(6) | — | — | Entité, RT | — |
| `RTS-11.7` | Rapport au moins hebdomadaire ; TIP disponible | RTS 2025/1190, art. 11(7) | `D-07` chaque semaine de « Plan de test RT approuvé, début de la phase active » à « Fin convenue de la phase active » | Rapports hebdomadaires d'avancement | Entité, TI, RT | — |
| `RTS-11.8` | Fournir les leg-ups à temps | RTS 2025/1190, art. 11(8) | — | — | Entité, RT | — |
| `RTS-11.9` | Détection : mesures de poursuite validées par les TM | RTS 2025/1190, art. 11(9) | — | — | Entité, RT | — |
| `RTS-11.10` | Suspension ou purple teaming limité | RTS 2025/1190, art. 11(10) | — | — | Entité, RT | — |

### Clôture (10)

| ID | Exigence | Référence | Délai | Livrable | Profils | Condition |
|---|---|---|---|---|---|---|
| `RTS-7.1.g` | Procédures de restauration (TIP et testeurs) | RTS 2025/1190, art. 7(1)(g) | — | PV de restauration | Entité, TI, RT | — |
| `RTS-7.1.h` | Restauration technique par les testeurs | RTS 2025/1190, art. 7(1)(h) | — | PV de restauration | Entité, RT | — |
| `RTS-12.1` | Informer la blue team | RTS 2025/1190, art. 12(1) | — | — | Entité | — |
| `RTS-12.2` | Rapport de test red team sous 4 semaines | RTS 2025/1190, art. 12(2) | `D-08` ≤ 4 semaines après « Fin convenue de la phase active » | Rapport de test red team | Entité, RT | — |
| `RTS-12.3` | Transmettre le rapport RT à la BT et aux TM | RTS 2025/1190, art. 12(3) | — | Rapport de test red team | Entité | — |
| `RTS-12.4` | Rapport de test blue team sous 10 semaines | RTS 2025/1190, art. 12(4) | `D-09` ≤ 10 semaines après « Fin convenue de la phase active » | Rapport de test blue team | Entité | — |
| `RTS-12.5` | Replay et purple teaming sous 10 semaines | RTS 2025/1190, art. 12(5) | `D-10` ≤ 10 semaines après « Fin convenue de la phase active » | Compte rendu replay et purple teaming | Entité, RT | — |
| `RTS-12.6` | Retours réciproques sur le processus | RTS 2025/1190, art. 12(6) | — | Retours réciproques sur le processus | Entité, TI, RT | — |
| `RTS-12.7` | Rapport de synthèse sous 8 semaines après notification | RTS 2025/1190, art. 12(7) | `D-11` ≤ 8 semaines après « Notification : rapports RT et BT jugés complets » | Rapport de synthèse du test | Entité | — |
| `RTS-15.3` | Mentionner le recours aux testeurs internes | RTS 2025/1190, art. 15(3) | — | Informations d'initiation (charte projet), Rapport de test red team, Rapport de synthèse du test | Entité, RT | Testeurs utilisés ∈ {internes, mixtes} |

### Remédiation et attestation (6)

| ID | Exigence | Référence | Délai | Livrable | Profils | Condition |
|---|---|---|---|---|---|---|
| `DORA-26.6` | Remettre synthèse, plans de remédiation et preuves | DORA, art. 26(6) | — | Rapport de synthèse du test, Plan de remédiation | Entité, RT | — |
| `DORA-26.7.1` | Attestation et notification à l'autorité compétente | DORA, art. 26(7) al. 1 | — | Attestation TLPT | Entité | — |
| `DORA-26.7.2` | Responsabilité maintenue en test mutualisé *(info)* | DORA, art. 26(7) al. 2 | — | — | Entité | TLPT mutualisé (DORA 26(4)) |
| `RTS-13.1` | Plan de remédiation sous 8 semaines après notification | RTS 2025/1190, art. 13(1) | `D-12` ≤ 8 semaines après « Notification : rapports RT et BT jugés complets » | Plan de remédiation | Entité | — |
| `RTS-13.2` | Contenu du plan de remédiation | RTS 2025/1190, art. 13(2) | — | Plan de remédiation | Entité | — |
| `RTS-14.1` | Attestation délivrée par l'autorité *(info)* | RTS 2025/1190, art. 14(1) | — | Attestation TLPT | Entité | — |

## C. Échéances calculées automatiquement (14)

L'outil calcule chaque échéance à partir des dates saisies dans la chronologie. Seules celles marquées *surchargeable* peuvent être modifiées, avec une justification journalisée.

| ID | Échéance | Règle | Source | Remarque |
|---|---|---|---|---|
| `D-01` | Remise des informations d'initiation | ≤ 3 mois après « Réception de la notification TLPT » | RTS-9.2 | — |
| `D-02` | Remise du SSD approuvé par l'organe de direction | ≤ 6 mois après « Réception de la notification TLPT » | RTS-9.6 | — |
| `D-03` | Prestataires en place avant la phase de test | avant « Début de la phase de test » | RTS-9.9 | — |
| `D-04` | Consultation des TM sur l'analyse de risques | avant « Début de la phase de test » | RTS-9.10 | — |
| `D-05` | Preuves de conformité des prestataires aux TM avant contrat | avant « Contrats TIP / testeurs externes signés » | RTS-9.11 | — |
| `D-06` | Phase red team active d'au moins 12 semaines | ≥ 12 semaines entre « Plan de test RT approuvé, début de la phase active » et « Fin convenue de la phase active » | RTS-11.5 | Le purple teaming limité (RTS 11(10)) compte dans la durée. |
| `D-07` | Rapport au moins hebdomadaire au CT et aux TM | chaque semaine de « Plan de test RT approuvé, début de la phase active » à « Fin convenue de la phase active » | RTS-11.7 | — |
| `D-08` | Rapport de test red team | ≤ 4 semaines après « Fin convenue de la phase active » | RTS-12.2 | — |
| `D-09` | Rapport de test blue team | ≤ 10 semaines après « Fin convenue de la phase active » | RTS-12.4 | — |
| `D-10` | Replay et purple teaming | ≤ 10 semaines après « Fin convenue de la phase active » | RTS-12.5 | — |
| `D-11` | Rapport de synthèse soumis pour approbation | ≤ 8 semaines après « Notification : rapports RT et BT jugés complets » | RTS-12.7 | — |
| `D-12` | Plan de remédiation transmis | ≤ 8 semaines après « Notification : rapports RT et BT jugés complets » | RTS-13.1 | — |
| `D-13` | TLPT au moins tous les 3 ans | ≤ 3 ans après « Date d'attestation du TLPT précédent » | DORA-26.1 | surchargeable ; Fréquence modulable par l'autorité compétente : surcharge justifiée. |
| `D-15` | Positionnement des autorités d'accueil | ≤ 20 jours ouvrés après « Information des autorités d'accueil » | RTS-16.1 | information (autorité) ; si FCI exploitées dans plusieurs États membres |

## D. Bonnes pratiques TIBER mises à disposition (63) — non contraignantes

Type de lien avec les obligations : **complète** (va au-delà du RTS), **reformule** (même exigence, repliée sous l'obligation), **diffère** (écart signalé ⚠ des deux côtés).

### Cycle et assujettissement (2)

| ID | Cadre | Bonne pratique | Lien | Question à se poser | Condition |
|---|---|---|---|---|---|
| `EU-T7` | TIBER-EU | Contact anticipé avec l'autorité | complète | Le budget et les achats sont-ils anticipés avant la notification ? | — |
| `FR-T1` | TIBER-FR | Cycle de 3 ans modulable | reformule `DORA-26.1` | La date du prochain TLPT est-elle connue ? | Déclinaison nationale TIBER = TIBER-FR |

### Préparation (24)

| ID | Cadre | Bonne pratique | Lien | Question à se poser | Condition |
|---|---|---|---|---|---|
| `EU-T1` | TIBER-EU | Préparation : 6 mois au plus | reformule `RTS-9.6` | Le planning de préparation tient-il dans les 6 mois ? | — |
| `EU-T2` | TIBER-EU | Réunions d'initiation, de cadrage et de lancement | complète `RTS-9.2`, `RTS-9.6` | Les trois réunions de préparation sont-elles planifiées avec le TM ? | — |
| `EU-01` | TIBER-EU | S'appuyer sur le Generic Threat Landscape | complète `RTS-10.1` | Un GTL est-il disponible, et l'a-t-on transmis au TIP ? | — |
| `EU-02` | TIBER-EU | Control team restreint et senior, avec NDA | complète `RTS-4.2.a` | Chaque membre du CT est-il indispensable, et a-t-il signé un NDA ? | — |
| `EU-03` | TIBER-EU | Bloquer les escalades externes obligatoires | complète `RTS-4.2.c` | Qui arrête l'escalade vers le CERT, l'ISAC ou la police si la BT détecte le test ? | — |
| `EU-05` | TIBER-EU | Nom de code neutre | reformule `RTS-4.2.f` | Le nom de code est-il sans lien avec le nom ou le secteur de l'entité ? | — |
| `EU-06` | TIBER-EU | Vérifier sauvegardes et restauration avant le test | complète `RTS-5.2` | Les sauvegardes et la restauration de chaque système ciblé ont-elles été vérifiées ? | — |
| `EU-07` | TIBER-EU | Clauses contractuelles TIP/RTT | complète `DORA-27.3`, `RTS-7.1.i` | Le contrat interdit-il explicitement le chantage et la corruption de salariés ? | — |
| `EU-08` | TIBER-EU | Droit de tester l'infrastructure des fournisseurs | complète `DORA-26.3` | Nos contrats d'externalisation autorisent-ils un red team sur l'infrastructure du fournisseur ? | — |
| `EU-09` | TIBER-EU | Test multi-parties : peu de parties, mêmes prestataires | complète `RTS-8.1` | Le nombre de parties reste-t-il gérable ? | TLPT mutualisé (DORA 26(4)) ou TLPT commun (RTS 1(18)) |
| `EU-10` | TIBER-EU | Au plus 10 FCI par entité | complète `RTS-9.7` | Le périmètre est-il réaliste pour 12 semaines de test ? | — |
| `EU-11` | TIBER-EU | Partir de la BIA | complète `DORA-26.2.3` | Le SSD est-il cohérent avec la BIA et le registre des FCI DORA ? | — |
| `EU-12` | TIBER-EU | Au moins un flag par système | complète `RTS-9.6` | Chaque système a-t-il un flag avec son critère C/I/A ? | — |
| `EU-13` | TIBER-EU | Composants non critiques en option | complète | Faut-il inclure les sauvegardes ou la préproduction ? | — |
| `EU-14` | TIBER-EU | Réunion de cadrage, flags revus avec le TM | complète `RTS-9.6` | Les flags ont-ils été revus avec le TM ? | — |
| `EU-15` | TIBER-EU | Appliquer les GSPP, préférer des prestataires accrédités | complète `RTS-9.11` | Les GSPP ont-elles servi de grille d'évaluation ? | — |
| `EU-16` | TIBER-EU | Lancer l'achat au plus tôt | complète `RTS-9.9` | Le délai d'achat interne est-il compatible avec l'échéance des 6 mois ? | — |
| `EU-17` | TIBER-EU | Mettre à jour le plan et faire la réunion de lancement | complète `RTS-9.8` | La réunion de lancement a-t-elle eu lieu, et le planning final est-il partagé ? | — |
| `EU-18` | TIBER-EU | Testeurs internes : un manager RT externe | complète `RTS-15.1` | Qui apporte le regard externe à l'équipe interne ? | Testeurs utilisés ∈ {internes, mixtes} |
| `FR-T2` | TIBER-FR | Points de suivi réguliers avec le TCT-FR | complète | Une fréquence de point avec le TCT-FR est-elle convenue ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-01` | TIBER-FR | Sponsor exécutif et attestation de périmètre | complète `RTS-9.6` | Qui est le sponsor exécutif, et a-t-il signé l'attestation de périmètre ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-02` | TIBER-FR | Évaluation juridique indépendante | complète `RTS-5.2` | Le juridique a-t-il validé le test (droit du travail, données personnelles, intrusion physique) ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-03` | TIBER-FR | Prestataire unique TI + RT : ressources et indépendance | reformule `RTS-7.1.e.v`, `RTS-7.1.f.v` | Comment le prestataire prouve-t-il la séparation des équipes TI et RT ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-04` | TIBER-FR | Flags sur SIIV : prestataires PASSI LPM *(obligation nationale à qualifier)* | complète | Un flag porte-t-il sur un SIIV ? Si oui, le prestataire est-il PASSI LPM ? | Déclinaison nationale TIBER = TIBER-FR et Flags sur des SIIV d'un OIV (FR) |

### Test : threat intelligence (8)

| ID | Cadre | Bonne pratique | Lien | Question à se poser | Condition |
|---|---|---|---|---|---|
| `EU-T3` | TIBER-EU | Phase TI : 4 à 6 semaines (indicatif) | complète | La phase TI est-elle dimensionnée entre 4 et 6 semaines ? | — |
| `EU-19` | TIBER-EU | Informations internes pour le TIP | complète `RTS-10.1` | Comment garde-t-on la CTI interne dans l'ignorance du test ? | — |
| `EU-20` | TIBER-EU | Réunion de sélection des scénarios | complète `RTS-10.3` | Les scénarios évitent-ils de rejouer ceux du test précédent ? | — |
| `EU-22` | TIBER-EU | Planifier les leg-ups dès la phase TI | complète | Les leg-ups envisagés sont-ils réalistes, c'est-à-dire obtenables par un attaquant patient ? | — |
| `EU-23` | TIBER-EU | Réunion TTIR et mise à jour des risques | complète `RTS-10.5` | L'analyse de risques a-t-elle été revue après le TTIR ? | — |
| `FR-05` | TIBER-FR | TI en 4 étapes, reconnaissance passive | complète `RTS-10.1` | La collecte TI est-elle restée passive ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-06` | TIBER-FR | Atelier TI à mi-parcours et passation | complète `RTS-10.2` | L'atelier à mi-parcours est-il planifié ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-07` | TIBER-FR | Scénario d'intrusion physique facultatif | complète | Veut-on un scénario physique, avec les autorisations et protections juridiques nécessaires ? | Déclinaison nationale TIBER = TIBER-FR |

### Test : red team (12)

| ID | Cadre | Bonne pratique | Lien | Question à se poser | Condition |
|---|---|---|---|---|---|
| `EU-T4` | TIBER-EU | Plan de test RT : 2 à 3 semaines (indicatif) | complète | Le temps de rédaction du plan RT est-il prévu dans le planning ? | — |
| `EU-04` | TIBER-EU | Arrêt du test à tout moment | reformule `RTS-11.10` | Le critère d'arrêt est-il écrit et connu des RTT ? | — |
| `EU-21` | TIBER-EU | Transformer un scénario en scénario X | complète `RTS-10.4.1` | Un scénario X serait-il plus utile qu'un scénario fondé sur la menace déjà bloqué ? | — |
| `EU-24` | TIBER-EU | Plan RT : reporting et vie privée | complète `RTS-11.1` | Comment protège-t-on les données des salariés ciblés ? | — |
| `EU-25` | TIBER-EU | Intrusion physique : consentement formel | complète `RTS-11.1` | Une lettre d'autorisation signée accompagne-t-elle chaque testeur sur site ? | Scénario d'intrusion physique |
| `EU-26` | TIBER-EU | Points quotidiens en plus du point hebdomadaire | complète `RTS-11.7` | Un point quotidien est-il en place ? | — |
| `EU-27` | TIBER-EU | Journaliser toutes les actions RT et les leg-ups | complète `RTS-11.8` | Le journal RT est-il horodaté et exportable ? | — |
| `EU-28` | TIBER-EU | Remédiation d'une vulnérabilité critique en cours de test | complète | Qui décide de corriger pendant le test ? | — |
| `FR-08` | TIBER-FR | Plan RT en RECON/IN/THROUGH/OUT et MITRE ATT&CK | ⚠ diffère `RTS-11.1` | Les TTP sont-elles mappées sur ATT&CK ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-09` | TIBER-FR | Typologie et réalisme des leg-ups | complète `RTS-11.8` | Chaque leg-up est-il typé et justifié ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-10` | TIBER-FR | Points quotidiens CT/RT, hebdomadaires avec le TCT-FR | complète `RTS-11.7` | Le modèle de point hebdomadaire du TCT-FR est-il utilisé ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-11` | TIBER-FR | Petits écarts tolérés | complète `RTS-11.6` | Cet écart modifie-t-il le planning ou les risques ? Si oui, une approbation est nécessaire. | Déclinaison nationale TIBER = TIBER-FR |

### Clôture (14)

| ID | Cadre | Bonne pratique | Lien | Question à se poser | Condition |
|---|---|---|---|---|---|
| `EU-T5` | TIBER-EU | Clôture : plus de 18 semaines possibles | reformule `RTS-12.2`, `RTS-12.4`, `RTS-12.5`, `RTS-12.7`, `RTS-13.1` | Le planning de clôture tient-il compte du délai d'évaluation des TM ? | — |
| `EU-T6` | TIBER-EU | Rapport BT : cible indicative de 6 semaines | ⚠ diffère `RTS-12.4` | Le rapport BT sera-t-il assez tôt pour préparer le replay ? | — |
| `EU-29` | TIBER-EU | Restauration planifiée après le replay | complète `RTS-7.1.g`, `RTS-7.1.h` | La restauration est-elle planifiée après le replay ? | — |
| `EU-30` | TIBER-EU | Rapports RT et BT très sensibles | complète `RTS-12.3` | Qui a accès aux rapports, et quand seront-ils détruits ? | — |
| `EU-31` | TIBER-EU | Chronologies RT et BT alignées | complète `RTS-12.2`, `RTS-12.4` | Les chronologies RT et BT utilisent-elles la même référence horaire ? | — |
| `EU-32` | TIBER-EU | Replay quand le rapport BT est substantiel | complète `RTS-12.5` | Le rapport BT est-il assez avancé pour le replay ? | — |
| `EU-33` | TIBER-EU | Sujets de purple teaming | complète `RTS-12.5` | La liste des sujets de PT est-elle établie avec la BT et les RTT ? | — |
| `EU-34` | TIBER-EU | Réunion 360° avant l'approbation du rapport de synthèse | complète `RTS-12.5` | Les retours 360° de toutes les parties sont-ils remis avant l'approbation ? | — |
| `EU-35` | TIBER-EU | Revue informelle par le TM avant envoi | complète `RTS-12.7`, `RTS-13.1` | Une revue informelle par le TM est-elle prévue ? | — |
| `FR-12` | TIBER-FR | Rapport RT provisoire puis final | ⚠ diffère `RTS-12.2` | Les artefacts restés sur le SI sont-ils listés ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-13` | TIBER-FR | Replay : deux demi-journées au moins | complète `RTS-12.5` | Deux demi-journées sont-elles réservées ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-14` | TIBER-FR | Rapport de synthèse rédigé au fil de l'eau | complète `RTS-12.7` | Le rapport de synthèse est-il pré-rempli au fil de l'eau ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-15` | TIBER-FR | Rapport de synthèse rédigé au fil de l'eau, constats en haut niveau | ⚠ diffère `RTS-12.7`, `RTS-13.1` | Les deux livrables réglementaires (synthèse et remédiation) restent-ils identifiables séparément ? | Déclinaison nationale TIBER = TIBER-FR |
| `FR-16` | TIBER-FR | Questionnaire 360° du TCT-FR | complète `RTS-12.6` | Chaque partie a-t-elle renvoyé son questionnaire ? | Déclinaison nationale TIBER = TIBER-FR |

### Remédiation et attestation (3)

| ID | Cadre | Bonne pratique | Lien | Question à se poser | Condition |
|---|---|---|---|---|---|
| `EU-36` | TIBER-EU | Copie à l'autorité compétente | reformule `RTS-13.1` | L'autorité compétente est-elle destinataire ? | — |
| `EU-37` | TIBER-EU | Attestation : conformité aux GSPP mentionnée | complète `RTS-14.1` | Une éventuelle dérogation prestataire est-elle documentée pour l'attestation ? | — |
| `FR-17` | TIBER-FR | Attestation signée par tous ; risque de non-reconnaissance | ⚠ diffère `RTS-14.1` | Le secret et la qualité ont-ils été tenus jusqu'au bout ? | Déclinaison nationale TIBER = TIBER-FR |
