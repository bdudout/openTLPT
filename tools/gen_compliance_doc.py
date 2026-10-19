#!/usr/bin/env python3
"""Génère docs/POINTS_DE_CONFORMITE.md à partir des packs du référentiel (source unique de vérité).

Usage :
  python3 tools/gen_compliance_doc.py           # écrit le document
  python3 tools/gen_compliance_doc.py --check   # échoue si le document n'est pas à jour (CI)
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKS = ROOT / "referentiel" / "packs"
OUT = ROOT / "docs" / "POINTS_DE_CONFORMITE.md"

INSTRUMENT = {"DORA": "DORA", "RTS_2025_1190": "RTS 2025/1190", "TIBER-EU_2025": "TIBER-EU (2025)", "TIBER-FR_V2": "TIBER-FR v2"}
PROFILE_SHORT = {"entity": "Entité", "ti": "TI", "rt": "RT", "ti_rt": "TI+RT"}
FACT_VALUE = {
    "external": "externes", "internal": "internes", "mixed": "mixtes",
    "national": "autorité nationale", "ecb": "BCE", "none": "aucune", "TIBER-FR": "TIBER-FR",
}
UNIT = {"days": "jours", "weeks": "semaines", "months": "mois", "working_days": "jours ouvrés", "years": "ans"}

# Thèmes des points permanents, par instrument et article (premier critère qui correspond).
THEMES = [
    ("Assujettissement, fréquence et périmètre", lambda s: (s["instrument"] == "DORA" and s["article"] == "26" and s.get("paragraph") in ("1", "2")) or (s["instrument"] == "RTS_2025_1190" and s["article"] == "2")),
    ("Prestataires TIC tiers, test mutualisé et maîtrise des risques du test", lambda s: s["instrument"] == "DORA" and s["article"] == "26" and s.get("paragraph") in ("3", "4", "5")),
    ("Testeurs internes ou externes", lambda s: (s["instrument"] == "DORA" and (s["article"] == "27" and s.get("paragraph") == "2" or s["article"] == "26" and s.get("paragraph") == "8")) or (s["instrument"] == "RTS_2025_1190" and s["article"] == "15")),
    ("Exigences sur les prestataires (TI et red team)", lambda s: (s["instrument"] == "DORA" and s["article"] == "27") or (s["instrument"] == "RTS_2025_1190" and s["article"] == "7")),
    ("Organisation et confidentialité", lambda s: s["instrument"] == "RTS_2025_1190" and s["article"] == "4"),
    ("Gestion des risques du TLPT", lambda s: s["instrument"] == "RTS_2025_1190" and s["article"] in ("5", "6")),
    ("TLPT communs, mutualisés et transfrontières", lambda s: s["instrument"] == "RTS_2025_1190" and s["article"] in ("8", "16")),
]


def load():
    packs = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in sorted(PACKS.glob("*.json"))}
    return packs["core"], [packs["dora-rts"]], [packs[k] for k in ("tiber-eu", "tiber-fr") if k in packs]


def ref(s):
    name = INSTRUMENT.get(s["instrument"], s["instrument"])
    if s["instrument"].startswith("TIBER"):
        return f"{name} §{s['article']}"
    r = f"art. {s['article']}"
    if s.get("paragraph"):
        r += f"({s['paragraph']})"
    if s.get("subparagraph"):
        r += f" al. {s['subparagraph']}"
    if s.get("point"):
        p = s["point"]
        head = "".join(ch for ch in p if ch.isalpha() and p.index(ch) < (p.find("(") if "(" in p else len(p)))
        r += f"({head}){p[len(head):]}" if head else f"({p})"
    return f"{name}, {r}"


def cell(text):
    return str(text).replace("|", "\\|").replace("\n", " ")


def condition(cond, facts):
    if not cond:
        return "—"
    key, tests = next(iter(cond.items()))
    parts = []
    for t in tests:
        label = facts.get(t["fact"], t["fact"])
        if "eq" in t:
            v = t["eq"]
            parts.append(label if v is True else f"non {label}" if v is False else f"{label} = {FACT_VALUE.get(v, v)}")
        else:
            parts.append(f"{label} ∈ {{{', '.join(FACT_VALUE.get(v, v) for v in t['in'])}}}")
    return (" et " if key == "all" else " ou ").join(parts)


def profiles(ps):
    return ", ".join(PROFILE_SHORT.get(p, p) for p in ps)


def offset(o):
    return f"{o['value']} {UNIT[o['unit']]}"


def deadline_text(d, events):
    a = events.get(d["anchor"], d["anchor"])
    if d["kind"] == "max":
        return f"≤ {offset(d['offset'])} après « {a} »"
    if d["kind"] == "min":
        return f"≥ {offset(d['offset'])} entre « {a} » et « {events.get(d['end_event'], d['end_event'])} »"
    if d["kind"] == "before":
        return f"avant « {a} »"
    return f"chaque {offset(d['every']).replace('1 semaines', 'semaine')} de « {a} » à « {events.get(d['until'], d['until'])} »"


def build():
    core, obl_packs, bp_packs = load()
    fr = lambda x: (x or {}).get("fr", "")
    facts = {f["id"]: fr(f["label"]) for f in core["facts"]}
    events = {e["id"]: fr(e["label"]) for e in core["events"]}
    phases = sorted(core["phases"], key=lambda p: p["order"])
    phase_label = {p["id"]: fr(p["label"]) for p in phases}
    actors = {a["id"]: fr(a["label"]) for a in core["actors"]}
    deliverables = {d["id"]: fr(d["label"]) for d in core["deliverables"]}
    deadlines = {d["id"]: d for d in core["deadlines"]}

    obligations = [i for p in obl_packs for i in p["items"]]
    practices = [(p["framework"], i) for p in bp_packs for i in p["items"]]
    standing = [i for i in obligations if i["scope"] == "standing"]
    stepwise = [i for i in obligations if i["scope"] == "stepwise"]
    versions = " · ".join(f"`{p['pack_id']}@{p['version']}`" for p in [core, *obl_packs, *bp_packs])

    L = []
    w = L.append
    w("# Points de conformité suivis par openTLPT")
    w("")
    w("> Document **généré** par `tools/gen_compliance_doc.py` à partir des packs du référentiel. Ne pas modifier à la main.")
    w(f"> Référentiel : {versions}. Les libellés sont des synthèses : le texte qui fait foi est celui publié au JO de l'UE.")
    w("")
    w("## Lecture")
    w("")
    w("openTLPT distingue deux familles d'**obligations** (DORA art. 26-27 et règlement délégué (UE) 2025/1190) :")
    w("")
    w(f"| Famille | Nombre | Ce que c'est | Quand s'en assurer |")
    w("|---|---|---|---|")
    w(f"| **A. Points permanents (socle)** | {len(standing)} | Conditions qui valent pour tout l'exercice : assujettissement, périmètre, testeurs, exigences sur les prestataires, organisation, confidentialité, gestion des risques | Dès le cadrage, puis à revérifier à chaque changement (prestataire, périmètre, testeurs, incident) |")
    w(f"| **B. Points au fil du test** | {len(stepwise)} | Étapes datées, livrables et validations exigés phase par phase, de la notification à l'attestation | Au moment de l'étape concernée ; les délais sont calculés par l'outil |")
    w("")
    w(f"Les **bonnes pratiques TIBER** ({len(practices)} éléments, partie D) ne sont **pas** des obligations : elles aident à se poser les bonnes questions et ne comptent jamais dans la conformité.")
    w("")
    w("Colonnes : **Profils** = rôles qui voient l'item (Entité financière, prestataire TI, prestataire RT ; TI+RT voit les deux). **Condition** = l'item n'apparaît que si la caractéristique de l'exercice est remplie. **Info** = jalon qui dépend de l'autorité, affiché sans case à cocher.")
    w("")

    w(f"## A. Points de conformité permanents ({len(standing)})")
    w("")
    by_theme = defaultdict(list)
    for i in standing:
        theme = next((name for name, test in THEMES if test(i["source"])), "Autres")
        by_theme[theme].append(i)
    for name, _ in THEMES + [("Autres", None)]:
        items = by_theme.get(name)
        if not items:
            continue
        w(f"### {name} ({len(items)})")
        w("")
        w("| ID | Exigence | Référence | Porteur | Profils | Condition |")
        w("|---|---|---|---|---|---|")
        for i in items:
            info = " *(info)*" if i.get("display") == "info" else ""
            w(f"| `{i['id']}` | {cell(fr(i['title']))}{info} | {ref(i['source'])} | {cell(', '.join(actors.get(a, a) for a in i['carriers']))} | {profiles(i['profiles'])} | {cell(condition(i.get('applies_when'), facts))} |")
        w("")

    w(f"## B. Points de conformité au fil du test ({len(stepwise)})")
    w("")
    for ph in phases:
        items = [i for i in stepwise if i["phase"] == ph["id"]]
        if not items:
            continue
        w(f"### {phase_label[ph['id']]} ({len(items)})")
        w("")
        w("| ID | Exigence | Référence | Délai | Livrable | Profils | Condition |")
        w("|---|---|---|---|---|---|---|")
        for i in items:
            info = " *(info)*" if i.get("display") == "info" else ""
            dl = "<br>".join(f"`{d}` {deadline_text(deadlines[d], events)}" for d in i.get("deadlines", []) if d in deadlines) or "—"
            dv = ", ".join(deliverables.get(d, d) for d in i.get("deliverables", [])) or "—"
            w(f"| `{i['id']}` | {cell(fr(i['title']))}{info} | {ref(i['source'])} | {cell(dl)} | {cell(dv)} | {profiles(i['profiles'])} | {cell(condition(i.get('applies_when'), facts))} |")
        w("")

    w(f"## C. Échéances calculées automatiquement ({len(core['deadlines'])})")
    w("")
    w("L'outil calcule chaque échéance à partir des dates saisies dans la chronologie. Seules celles marquées *surchargeable* peuvent être modifiées, avec une justification journalisée.")
    w("")
    w("| ID | Échéance | Règle | Source | Remarque |")
    w("|---|---|---|---|---|")
    for d in core["deadlines"]:
        notes = []
        if d.get("overridable"):
            notes.append("surchargeable")
        if d.get("display") == "info":
            notes.append("information (autorité)")
        if d.get("applies_when"):
            notes.append(f"si {condition(d['applies_when'], facts)}")
        if d.get("note"):
            notes.append(fr(d["note"]))
        w(f"| `{d['id']}` | {cell(fr(d['label']))} | {cell(deadline_text(d, events))} | {', '.join(d['sources'])} | {cell(' ; '.join(notes) or '—')} |")
    w("")

    w(f"## D. Bonnes pratiques TIBER mises à disposition ({len(practices)}) — non contraignantes")
    w("")
    w("Type de lien avec les obligations : **complète** (va au-delà du RTS), **reformule** (même exigence, repliée sous l'obligation), **diffère** (écart signalé ⚠ des deux côtés).")
    w("")
    rel_label = {"adds": "complète", "restates": "reformule", "diverges": "⚠ diffère"}
    for ph in phases:
        items = [(fw, i) for fw, i in practices if i["phase"] == ph["id"]]
        if not items:
            continue
        w(f"### {phase_label[ph['id']]} ({len(items)})")
        w("")
        w("| ID | Cadre | Bonne pratique | Lien | Question à se poser | Condition |")
        w("|---|---|---|---|---|---|")
        for fw, i in items:
            rel = i.get("relation", {})
            link = rel_label.get(rel.get("type"), "")
            if rel.get("targets"):
                link += " " + ", ".join(f"`{t}`" for t in rel["targets"])
            nat = " *(obligation nationale à qualifier)*" if i["nature"] == "national_obligation" else ""
            w(f"| `{i['id']}` | {fw} | {cell(fr(i['title']))}{nat} | {link} | {cell(fr(i.get('question')))} | {cell(condition(i.get('applies_when'), facts))} |")
        w("")
    return "\n".join(L).rstrip() + "\n"


def main():
    text = build()
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != text:
            print(f"{OUT.relative_to(ROOT)} n'est pas à jour : lancer python3 tools/gen_compliance_doc.py")
            return 1
        print("OK")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"écrit : {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
