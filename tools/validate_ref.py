#!/usr/bin/env python3
"""Validate openTLPT referential packs.

Usage: python3 tools/validate_ref.py [referentiel_dir]

Checks:
  1. JSON Schema (if the `jsonschema` package is installed; skipped otherwise, with a warning)
  2. Cross-pack rules the schema cannot express:
     - ids unique across all packs
     - Obligation / good-practice separation by framework
     - every reference resolves (phases, actors, profiles, facts, events, deliverables, deadlines, items)
     - restates/diverges relations point to obligations
     - item <-> deadline links are symmetric
     - event precedence graph is acyclic
"""
import json
import sys
from pathlib import Path

OBLIGATION_FRAMEWORKS = {"DORA", "RTS_TLPT", "DORA+RTS_TLPT"}


def load_packs(ref_dir):
    packs = []
    for path in sorted((ref_dir / "packs").glob("*.json")):
        with path.open(encoding="utf-8") as f:
            packs.append((path.name, json.load(f)))
    return packs


def schema_check(ref_dir, packs, errors):
    try:
        import jsonschema
    except ImportError:
        print("WARN  jsonschema not installed: schema validation skipped (pip install jsonschema)")
        return
    with (ref_dir / "schema" / "pack.schema.json").open(encoding="utf-8") as f:
        schema = json.load(f)
    validator = jsonschema.Draft202012Validator(schema)
    for name, pack in packs:
        for err in sorted(validator.iter_errors(pack), key=lambda e: list(e.path)):
            loc = "/".join(str(p) for p in err.path)
            errors.append(f"{name}: schema: {loc}: {err.message}")


def cross_check(packs, errors):
    kinds = ["profiles", "actors", "phases", "events", "facts", "deliverables", "deadlines", "items"]
    index = {k: {} for k in kinds}
    seen = {}
    for name, pack in packs:
        for kind in kinds:
            for obj in pack.get(kind, []):
                oid = obj["id"]
                if oid in seen:
                    errors.append(f"{name}: duplicate id {oid} (already in {seen[oid]})")
                seen[oid] = name
                index[kind][oid] = (name, pack, obj)

    def ref(name, ctx, kind, oid):
        if oid not in index[kind]:
            errors.append(f"{name}: {ctx}: unknown {kind[:-1]} '{oid}'")

    def check_condition(name, ctx, cond):
        for test in cond.get("all", []) + cond.get("any", []):
            fid = test["fact"]
            if fid not in index["facts"]:
                errors.append(f"{name}: {ctx}: unknown fact '{fid}'")
                continue
            fact = index["facts"][fid][2]
            vals = [test["eq"]] if "eq" in test else test["in"]
            for v in vals:
                if fact["type"] == "boolean" and not isinstance(v, bool):
                    errors.append(f"{name}: {ctx}: fact '{fid}' is boolean, got {v!r}")
                if fact["type"] == "enum" and v not in fact.get("values", []):
                    errors.append(f"{name}: {ctx}: '{v}' not a value of fact '{fid}'")

    # framework / nature separation
    for name, pack in packs:
        fw = pack["framework"]
        for item in pack.get("items", []):
            nature = item["nature"]
            if fw == "core":
                errors.append(f"{name}: core pack must not contain items ({item['id']})")
            elif fw in OBLIGATION_FRAMEWORKS and nature != "obligation":
                errors.append(f"{name}: {item['id']}: regulatory pack may only hold obligations (got {nature})")
            elif fw in OBLIGATION_FRAMEWORKS and item.get("scope") not in ("standing", "stepwise"):
                errors.append(f"{name}: {item['id']}: obligation without scope (standing | stepwise)")
            elif fw.startswith("TIBER-") and nature == "obligation":
                errors.append(f"{name}: {item['id']}: TIBER pack must not hold 'obligation' items")
            if fw.startswith("TIBER-") and "scope" in item:
                errors.append(f"{name}: {item['id']}: scope is reserved to obligations")

    for prof_id, (name, _, prof) in index["profiles"].items():
        for inc in prof.get("includes", []):
            ref(name, f"profile {prof_id}", "profiles", inc)

    for ph_id, (name, _, ph) in index["phases"].items():
        for key in ("starts_at", "ends_at"):
            if key in ph:
                ref(name, f"phase {ph_id}.{key}", "events", ph[key])

    for ev_id, (name, _, ev) in index["events"].items():
        ref(name, f"event {ev_id}", "phases", ev["phase"])
        for a in ev["set_by"]:
            ref(name, f"event {ev_id}.set_by", "actors", a)
        for e in ev.get("after", []):
            ref(name, f"event {ev_id}.after", "events", e)
        for s in ev.get("sources", []):
            ref(name, f"event {ev_id}.sources", "items", s)

    for d_id, (name, _, dl) in index["deliverables"].items():
        ref(name, f"deliverable {d_id}", "phases", dl["phase"])
        for key in ("producers", "recipients", "approved_by"):
            for a in dl.get(key, []):
                ref(name, f"deliverable {d_id}.{key}", "actors", a)
        for p in dl.get("profiles", []):
            ref(name, f"deliverable {d_id}.profiles", "profiles", p)
        if "applies_when" in dl:
            check_condition(name, f"deliverable {d_id}", dl["applies_when"])

    for dl_id, (name, _, dl) in index["deadlines"].items():
        ref(name, f"deadline {dl_id}.anchor", "events", dl["anchor"])
        for key in ("until", "end_event"):
            if key in dl:
                ref(name, f"deadline {dl_id}.{key}", "events", dl[key])
        for a in dl["carriers"]:
            ref(name, f"deadline {dl_id}.carriers", "actors", a)
        tgt = dl.get("target", {}).get("deliverable")
        if tgt:
            ref(name, f"deadline {dl_id}.target", "deliverables", tgt)
        for s in dl["sources"]:
            ref(name, f"deadline {dl_id}.sources", "items", s)
            if s in index["items"] and dl_id not in index["items"][s][2].get("deadlines", []):
                errors.append(f"{name}: deadline {dl_id} cites {s} but {s}.deadlines does not list {dl_id}")
        if "applies_when" in dl:
            check_condition(name, f"deadline {dl_id}", dl["applies_when"])

    for it_id, (name, _, it) in index["items"].items():
        ref(name, f"item {it_id}", "phases", it["phase"])
        for a in it["carriers"]:
            ref(name, f"item {it_id}.carriers", "actors", a)
        for p in it["profiles"]:
            ref(name, f"item {it_id}.profiles", "profiles", p)
        for d in it.get("deliverables", []):
            ref(name, f"item {it_id}.deliverables", "deliverables", d)
        for d in it.get("deadlines", []):
            ref(name, f"item {it_id}.deadlines", "deadlines", d)
            if d in index["deadlines"] and it_id not in index["deadlines"][d][2]["sources"]:
                errors.append(f"{name}: item {it_id} lists {d} but {d}.sources does not cite {it_id}")
        if "applies_when" in it:
            check_condition(name, f"item {it_id}", it["applies_when"])
        rel = it.get("relation")
        if rel:
            for t in rel.get("targets", []):
                ref(name, f"item {it_id}.relation", "items", t)
                if rel["type"] in ("restates", "diverges") and t in index["items"]:
                    if index["items"][t][2]["nature"] != "obligation":
                        errors.append(f"{name}: item {it_id}: {rel['type']} target {t} is not an obligation")

    for name, pack in packs:
        for note in pack.get("notes", []):
            for t in note.get("targets", []):
                if t not in seen:
                    errors.append(f"{name}: note {note['id']}: unknown target '{t}'")

    # acyclic event precedence
    graph = {e: index["events"][e][2].get("after", []) for e in index["events"]}
    state = {}

    def visit(node, stack):
        if state.get(node) == 1:
            errors.append(f"event precedence cycle: {' -> '.join(stack + [node])}")
            return
        if state.get(node) == 2:
            return
        state[node] = 1
        for prev in graph.get(node, []):
            visit(prev, stack + [node])
        state[node] = 2

    for e in graph:
        visit(e, [])

    return {k: len(v) for k, v in index.items()}


def main():
    ref_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "referentiel"
    packs = load_packs(ref_dir)
    errors = []
    schema_check(ref_dir, packs, errors)
    counts = cross_check(packs, errors)
    print("packs:", ", ".join(f"{n} ({p['framework']} {p['version']})" for n, p in packs))
    print("counts:", ", ".join(f"{k}={v}" for k, v in counts.items()))
    for e in errors:
        print("ERROR", e)
    print("OK" if not errors else f"{len(errors)} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
