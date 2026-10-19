# openTLPT

**Outil open source, local et portable, pour piloter la conformité d'un exercice TLPT au sens de DORA**, de la notification
à l'attestation. Il est destiné au PMO ou au Control Team Lead de l'entité financière, et aux prestataires de threat intelligence et de red team.

*Open-source, local and portable tool to track compliance of a DORA Threat-Led Penetration Test (TLPT), from notification to attestation.*

> ⚠️ **Statut : préversion 0.1.** Il est possible de créer et d'ouvrir un exercice chiffré, de suivre ses échéances réglementaires et de renseigner les checklists par phase (obligations et bonnes pratiques séparées). Les livrables et les registres restent à faire.
> Le fichier `openTLPT.html` de chaque build est téléchargeable dans les artefacts de la [CI](../../actions).

## Principes

- **Obligations et bonnes pratiques strictement séparées.**
  - Les *obligations* viennent de DORA (règlement (UE) 2022/2554, art. 26-27) et du règlement délégué (UE) 2025/1190 (RTS TLPT).
  - Les *bonnes pratiques* viennent de TIBER-EU, de TIBER-FR et des autres déclinaisons nationales. Elles ne sont jamais présentées comme exigibles.
- **Les bonnes questions au bon moment** : une checklist contextuelle par phase, et des échéances calculées à partir des dates réelles de l'exercice.
- **Autoporteur, sans droits administrateur** : un seul fichier `openTLPT.html`, ouvert dans le navigateur déjà présent sur le poste. Rien à installer, aucun réseau, aucune télémétrie.
- **Données chiffrées et portables** : un exercice = un fichier `<nom-de-code>.tlpt`, avec une base SQLite chiffrée en AES-256-GCM et une clé dérivée par Argon2id.
- **Traçabilité** : journal append-only chaîné par SHA-256, avec ancrage externe possible du hash de tête.
- **Multilingue** : textes réglementaires officiels dans les 24 langues de l'UE ; interface en FR et EN pour commencer.

## Contenu du dépôt

| Dossier | Contenu |
|---|---|
| [`docs/`](docs/) | [Expression de besoins](docs/BESOINS.md), [modèle de données](docs/MODELE_DONNEES.md), [décisions d'architecture (ADR)](docs/adr/README.md) |
| [`docs/referentiel/`](docs/referentiel/) | [Matrice des obligations DORA / RTS](docs/referentiel/MATRICE_DORA_RTS.md) et [bonnes pratiques TIBER-EU / TIBER-FR](docs/referentiel/BONNES_PRATIQUES_TIBER.md), en version lisible |
| [`referentiel/`](referentiel/) | Le même référentiel en packs JSON, avec leur JSON Schema |
| [`schema/`](schema/) | Schéma SQLite de la base d'exercice |
| [`tools/`](tools/) | Validateur du référentiel |
| [`engine/`](engine/) | Moteur métier en TypeScript : échéances, journal chaîné, enveloppe chiffrée `.tlpt` |
| [`app/`](app/) | Application Svelte construite en un fichier HTML unique |
| [`spike/`](spike/) | Spike technique : fichier HTML unique avec Svelte, SQLite WASM et Argon2id, testé en `file://` |

## Vérifier le référentiel

```bash
python3 tools/validate_ref.py
```

## Avertissement

Les synthèses du référentiel ne remplacent ni les textes officiels publiés au Journal officiel de l'UE, ni les guides des autorités.
Elles n'ont pas valeur de conseil juridique. Les documents TIBER (BCE, Banque de France) ne sont **pas** reproduits : seules des références et des synthèses figurent ici.
openTLPT n'est affilié ni à la BCE, ni à la Banque de France, ni à aucune autorité de supervision.

## Licence

Code et contenus originaux : [Apache-2.0](LICENSE). Les textes réglementaires de l'UE proviennent d'EUR-Lex, dont la réutilisation est autorisée par la décision 2011/833/UE.
