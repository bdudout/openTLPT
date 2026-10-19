# openTLPT — Expression de besoins (v0.2)

> Statut : cadrage validé (points ouverts tranchés, référentiel constitué), 2026-10-19. Aucun développement engagé.

## 1. Vision

openTLPT est un outil **local, portable et open source** de pilotage de la conformité d'un exercice
**TLPT au sens de DORA**. Il permet à chaque acteur de faire un exercice conforme et de se poser
**les bonnes questions au bon moment**, en distinguant toujours :

| Nature | Sources | Statut dans l'outil |
|---|---|---|
| **Obligation** | Règlement (UE) 2022/2554 (DORA), art. 26 et 27 ; règlement délégué (UE) 2025/1190 (RTS TLPT) | Badge « Obligation », référence d'article, texte officiel |
| **Bonne pratique** | TIBER-EU (version alignée DORA, 02/2025) et guides BCE associés ; TIBER-FR ; autres TIBER nationaux (NL, DE, BE, LU…) | Badge « Bonne pratique » + nom du référentiel, jamais présentée comme exigible |

Nom : **openTLPT** (aucun projet existant sous ce nom au 2026-10-19).

## 2. État de l'art (résumé)

Il n'existe pas d'outil open source de suivi de conformité DORA TLPT local, multilingue et traçable.
Les outils les plus proches couvrent seulement une partie du besoin :
- un planner MCP de scoping TIBER-EU (CSOAI, MIT) : génération de documents, sans suivi ni traçabilité ;
- Filigran OpenCTI / OpenAEV : threat intel et exécution de scénarios, pas le pilotage de conformité ;
- des checkers de maturité en ligne et des plateformes GRC commerciales (SaaS, non portables).

## 3. Utilisateurs et profils

À la création d'une base, on choisit **un profil**. Il filtre les obligations, les questions et les livrables affichés :

1. **Entité financière** : PMO ou Control Team Lead de l'entité testée (profil principal) ;
2. **Prestataire Threat Intelligence (TI)** ;
3. **Prestataire Red Team (RT)** ;
4. **Prestataire TI + RT combiné**. Le RTS et TIBER-EU encadrent la séparation des équipes ; l'outil doit afficher ces règles.

Les autres acteurs (autorité / TCT, white team, blue team, prestataires ICT tiers) sont des **parties
prenantes suivies**, pas des utilisateurs.

## 4. Périmètre v1

- **Un seul TLPT par base** : un fichier = un exercice.
- **Phases couvertes** : Préparation → Test (TI puis RT) → Clôture.
- Hors v1 : vue multi-TLPT, suivi du cycle triennal, rotation des testeurs entre exercices, consolidation groupe.

## 5. Exigences fonctionnelles

### EF-1 Référentiel de contenu (séparé des données utilisateur)
- Le référentiel est versionné : chaque élément a un identifiant stable, une source (texte + article/section), une nature (Obligation / Bonne pratique), une phase, les profils concernés et une date de version.
- Un contenu ajouté n'est jamais mélangé avec un contenu existant : chaque référentiel national est un « pack » distinct.
- Les textes **DORA et RTS** sont proposés dans les **24 langues officielles** (extraits pertinents tirés d'EUR-Lex, réutilisation autorisée par la décision 2011/833/UE).
- Les bonnes pratiques TIBER sont données en **référence + synthèse**. On ne copie pas le texte intégral sans vérifier la licence de chaque document BCE ou banque centrale nationale.

### EF-2 Déroulé de l'exercice et jalons
- Saisie du calendrier : notification par l'autorité, dates de début et de fin de chaque phase.
- **Calcul automatique des échéances réglementaires** à partir des dates saisies (délais du RTS, cf. §9).
- Statut de chaque jalon : à venir / en cours / en retard / fait / non applicable (justifié).
- Alertes **à l'ouverture** de l'outil : échéances proches ou dépassées. Il n'y a pas de serveur, donc pas de notification push.

### EF-3 Checklist contextuelle par étape
- À chaque étape, deux listes séparées :
  - **Obligations** DORA/RTS, avec lien vers le texte officiel dans la langue choisie ;
  - **Questions de bonne pratique** TIBER, en indiquant le référentiel (EU, FR, NL…).
- Réponses possibles : *traité*, *non applicable* (justification obligatoire), *écart accepté* (justification + décideur).
- Cette checklist ne bloque pas le passage à l'étape suivante. Une étape close avec des obligations ouvertes est signalée en rouge.

### EF-4 Livrables (suivi seulement)
- Liste des livrables attendus par phase et par profil : documents d'initiation, scope specification, rapport TI, plan de test RT, rapport RT, rapport blue team, rapport de synthèse, plan de remédiation, attestation…
- Les métadonnées seules sont enregistrées : responsable, échéance, version, statut, emplacement externe, **empreinte SHA-256** du fichier, calculée localement sans stocker le document.

### EF-5 Parties prenantes
- Annuaire de l'exercice : rôles (CT, TCT, TI, RT, ICT tiers…) et contacts.
- Pour les prestataires : suivi des **critères de l'art. 27** (aptitude, références, assurance, certifications…) sous forme de checklist avec pièces justificatives (empreinte).

### EF-6 Traçabilité
- **Journal append-only chaîné par hash** (SHA-256) : chaque action enregistre son horodatage, son auteur (nom déclaratif), l'objet modifié, l'ancienne et la nouvelle valeur, et le hash de l'entrée précédente.
- **Vérification d'intégrité** à l'ouverture et à la demande.
- **Ancrage** : on exporte le hash de tête (texte et QR) pour l'inscrire dans un PV ou un mail. On peut ainsi prouver qu'une chaîne n'a pas été entièrement réécrite.
- Export du journal (CSV/JSON) pour l'audit.

### EF-7 Langues
- **Textes réglementaires** : 24 langues dès la v1.
- **Interface** : FR et EN en v1. Les autres langues s'ajoutent par simple fichier i18n, sans recompiler la logique.
- On peut afficher le même article dans deux langues côte à côte, par exemple pour un groupe transfrontalier.

### EF-8 Exports
- Tableau de bord PDF ou impression : avancement, jalons, écarts.
- Export complet de la base chiffrée (sauvegarde) et du journal en clair (audit).

## 6. Exigences non fonctionnelles

| ID | Exigence |
|---|---|
| ENF-1 | **Un seul fichier HTML** autonome. Aucune dépendance réseau à l'exécution, aucune télémétrie. |
| ENF-2 | Données dans un **fichier `.tlpt` séparé** (SQLite sérialisée, chiffrée). On transporte le HTML et le `.tlpt`. |
| ENF-3 | **Chiffrement par passphrase** : AES-256-GCM (WebCrypto), clé dérivée par **Argon2id** (WASM, 64 Mio / t=3 / p=1), verrouillage après inactivité. Voir [ADR-0003](adr/0003-kdf-chiffrement.md). Pas de récupération possible sans la passphrase, à afficher clairement. |
| ENF-4 | Enregistrement direct sur le disque via la File System Access API (**Chrome / Edge**). Sur Firefox et Safari : mode dégradé avec export et import manuels, signalé à l'utilisateur. |
| ENF-5 | Intégrité du HTML lui-même : hash publié pour chaque release, et build reproductible. |
| ENF-6 | Accessibilité RGAA / WCAG 2.1 AA. |
| ENF-11 | **Application autoporteuse, sans aucun droit administrateur.** L'utilisateur n'a besoin que du fichier `openTLPT.html` et d'un navigateur déjà présent sur le poste (Edge, Chrome, Firefox, Safari). Sont **exclus** : installeur, exécutable, extension de navigateur, serveur local, service, modification de la configuration du navigateur ou de l'OS, dépendance à un réglage GPO particulier. Si une fonction du navigateur est bloquée par la politique de l'entreprise (ex. File System Access API), l'outil bascule seul en mode dégradé (ENF-4), sans demander d'intervention. Les outils de build (Node.js) ne concernent que les mainteneurs et s'installent eux aussi sans droits admin (Node portable / nvm). |
| ENF-7 | Licence du code : **Apache-2.0** (recommandée pour faciliter l'adoption, avec concession de brevets explicite). Licence des contenus à documenter source par source. |

## 7. Architecture envisagée (voir §8 Décisions et les [ADR](adr/README.md) 0001 à 0004)

```
openTLPT.html  (unique, autonome)
 ├─ UI (framework léger, compilé et inliné)
 ├─ Moteur SQLite WASM (sql.js) ─ base en mémoire
 ├─ Crypto (WebCrypto AES-GCM + KDF)
 ├─ Journal chaîné (SHA-256)
 └─ Référentiel embarqué (packs JSON : DORA, RTS, TIBER-EU, TIBER-FR, …)
          │
          ▼  lecture/écriture chiffrée
   exercice-XXXX.tlpt  (sur disque, clé USB, partage…)
```

Taille cible : extraits DORA art. 26-27 et RTS en 24 langues, soit environ 2–4 Mo. C'est acceptable dans un fichier unique.

## 8. Décisions (validées le 2026-10-19)

| # | Sujet | Décision | Exigence induite |
|---|---|---|---|
| DEC-1 | Ouvertures concurrentes du `.tlpt` | **Compteur de version** dans le fichier, vérifié à chaque enregistrement. Si la version sur disque a changé depuis l'ouverture, l'enregistrement est **refusé** et l'utilisateur est alerté. Pas de fichier de verrou, peu fiable sur une clé USB ou un partage réseau. | ENF-8 |
| DEC-2 | Mise à jour du référentiel | Référentiel **embarqué dans chaque release** du HTML, avec un **numéro de version affiché**. Un pack importable signé sera envisagé dans une version ultérieure. | EF-1, ENF-9 |
| DEC-3 | Identité de l'auteur | Nom déclaratif **demandé à chaque ouverture**, **affiché en permanence** dans l'interface et **inscrit dans le journal** à l'ouverture de chaque session. | EF-6 |
| DEC-4 | Échanges entre l'entité et les prestataires | **Chaque acteur tient son propre `.tlpt`.** Plus tard : export partiel **en lecture seule**, limité aux jalons et aux livrables. | EF-9 (v2) |
| DEC-5 | Nom de code | **Obligatoire à la création** de l'exercice. Il est utilisé partout dans l'interface et dans le nom du fichier, et le vrai nom de l'entité n'apparaît jamais dans le nom du fichier. Base réglementaire : RTS 4(2)(f) et 9(2)(e). | EF-2, ENF-10 |

### Exigences ajoutées par ces décisions

- **ENF-8** : le `.tlpt` porte un compteur de version incrémenté à chaque enregistrement. Si la version sur disque est supérieure à la version chargée, l'écriture est bloquée. L'utilisateur peut alors recharger le fichier ou enregistrer sous un autre nom. L'événement est journalisé.
- **ENF-9** : la version du référentiel (ex. `ref-2026.10`) et la date de vérification des sources sont affichées dans l'interface et inscrites dans le journal à la création de l'exercice. Si l'exercice a été créé avec une version plus ancienne du référentiel, l'outil le signale et liste les éléments modifiés.
- **ENF-10** : à la création, le nom de code est saisi avant tout autre champ. Le nom de fichier proposé est `<nom-de-code>.tlpt`. L'outil avertit si le nom de code contient le nom de l'entité (champ facultatif, stocké chiffré).
- **EF-6 (complément)** : à chaque ouverture, une boîte de dialogue demande le nom de l'utilisateur, prérempli avec le dernier nom utilisé. Une entrée « ouverture de session » est ajoutée au journal, avec l'auteur et la version de l'outil. Le nom courant reste visible dans l'en-tête.
- **EF-9 (v2)** : export partiel en lecture seule (jalons, statuts et empreintes des livrables, sans contenu sensible). Il est signé par le hash de tête du journal, pour qu'une contrepartie puisse le consulter.

## 9. Référentiel

**Fait (2026-10-19)**, avec des délais vérifiés sur le texte officiel :
- [referentiel/MATRICE_DORA_RTS.md](referentiel/MATRICE_DORA_RTS.md) : les obligations et le calendrier calculable (D-01 à D-15) ;
- [referentiel/BONNES_PRATIQUES_TIBER.md](referentiel/BONNES_PRATIQUES_TIBER.md) : les bonnes pratiques TIBER-EU et TIBER-FR, séparées des obligations, avec les écarts signalés.

Objectif initial de cette étape :

Construire la **matrice de conformité** source par source : chaque exigence, son article, la phase, le
profil concerné, le livrable associé et le **délai** avec son point de départ.
Les délais du RTS 2025/1190 doivent tous être relus sur le texte officiel avant d'être codés. Parmi eux :
la soumission des documents d'initiation après la notification, la durée minimale de la phase active red team,
les délais des rapports RT et blue team, le purple teaming, le rapport de synthèse et le plan de remédiation.
Pour chaque délai de TIBER-EU/FR, on indiquera aussi s'il diffère du délai réglementaire, sans jamais le présenter comme obligatoire.
