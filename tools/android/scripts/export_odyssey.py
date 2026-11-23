"""Write out/site_data/odyssey.global.json: Odyssey quest chains, their rewards and feature unlocks.

Usage: python3 -I scripts/export_odyssey.py --global X_GLOBAL [--out out/site_data]
X_GLOBAL is an unpacked Global client (client/config/... and EN_US/ language chunks),
e.g. out/emu_pull/20261123_plain/x_global.

Sources (all from the client, nothing curated):
  client/config/quest_special.json         chains 1 (Odyssey stages), 2 (chapters), 3 (Celestial Spire)
  client/config/open_condition/...json     feature unlocks
  client/config/item.json                  drop type 103
  client/config/equip/equip_detail.json    drop type 102
  client/config/money_guide.json           drop types >= 104 (the type is the currency id)
Anything that does not resolve is kept with its raw key and listed under "unresolved".
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from export_hero_releases_md import language_pairs  # noqa: E402

CHAINS = {
    "1": ("odyssey", "Odyssey stages"),
    "2": ("chapters", "Odyssey chapters"),
    "3": ("spire", "Celestial Spire"),
}
# Stage ids above this are never reached in normal play (99999, 999999, 9999999).
STAGE_SENTINEL = 99999


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def rows(table, id_field=None):
    """Collect {key: row}. With id_field, walk version/group levels and keep dicts that carry id_field."""
    if id_field is None:
        return {k: v for k, v in table.items() if not k.startswith("__") and isinstance(v, dict)}
    found = {}

    def walk(node):
        for key, value in node.items():
            if key.startswith("__") or not isinstance(value, dict):
                continue
            if id_field in value:
                if key in found and found[key] != value:
                    raise ValueError(f"row {key} differs between versions")
                found[key] = value
            else:
                walk(value)

    walk(table)
    return found


def stage_label(stage_id):
    if stage_id >= STAGE_SENTINEL:
        return None
    chapter, stage = divmod(stage_id, 100)
    return f"Prologue {stage}" if chapter == 0 else f"{chapter}-{stage}"


class Resolver:
    def __init__(self, root):
        cfg = root / "client/config"
        self.text = language_pairs(root / "EN_US")
        self.items = rows(load(cfg / "item.json"), "item_id")
        self.equip = rows(load(cfg / "equip/equip_detail.json"), "id")
        self.money = rows(load(cfg / "money_guide.json"), "id")
        self.unresolved = {}

    def tr(self, key, context):
        if not key:
            return None
        for candidate in (key, key.removeprefix("tid#"), "tid#" + key.removeprefix("tid#")):
            if candidate in self.text and self.text[candidate].strip():
                return self.text[candidate].strip()
        self.unresolved.setdefault(key, context)
        return None

    def reward(self, drop, context):
        kind, rid, amount = drop
        if kind == 103:
            row = self.items.get(str(rid))
            out = {"kind": "item", "id": rid, "amount": amount}
            if row:
                out.update(name=self.tr(row["name"], context), icon=row.get("icon"), quality=row.get("quality"))
        elif kind == 102:
            row = self.equip.get(str(rid))
            out = {"kind": "equipment", "id": rid, "amount": amount}
            if row:
                out.update(name=self.tr(row["name"], context), icon=row.get("icon"), quality=row.get("quality"),
                           qualityName=self.tr(row.get("quality_name"), context))
        else:
            row = self.money.get(str(kind))
            out = {"kind": "currency", "id": kind, "amount": amount}
            if row:
                out.update(name=self.tr(row["name"], context), icon=row.get("icon"))
        if not out.get("name"):
            out["name"] = None
            self.unresolved.setdefault(f"drop {kind}/{rid}", context)
        return out


def special_chains(table):
    """Return {type_id: {quest_id: row}}.

    Older clients key quest_special by type; newer ones add a version level
    ({"0": {"1": {...}}, "1": {"1": {...}}}) with disjoint quest ids, which are merged here.
    """
    merged = {}
    for key, value in table.items():
        if key.startswith("__") or not isinstance(value, dict):
            continue
        if any(isinstance(v, dict) and "ID" in v for v in value.values()):
            merged.setdefault(key, {}).update(rows(value))
            continue
        for type_id, quests in value.items():
            if isinstance(quests, dict) and not type_id.startswith("__"):
                bucket = merged.setdefault(type_id, {})
                for qid, row in rows(quests).items():
                    if qid in bucket and bucket[qid] != row:
                        raise ValueError(f"quest {qid} differs between versions")
                    bucket[qid] = row
    return merged


def chain_quests(table, res):
    by_id = rows(table)
    ids = set(by_id)
    targets = {str(q.get("next_mission")) for q in by_id.values()}
    starts = sorted(ids - targets, key=int) or sorted(ids, key=int)[:1]
    order, seen = [], set()
    for start in starts:
        cur = start
        while cur in by_id and cur not in seen:
            seen.add(cur)
            order.append(cur)
            cur = str(by_id[cur].get("next_mission"))
    order += sorted(ids - seen, key=int)  # orphans, kept so nothing is dropped
    out = []
    for qid in order:
        q = by_id[qid]
        ctx = f"quest {qid}"
        entry = {
            "id": q["ID"],
            "text": res.tr(q["name"], ctx),
            "targetType": q["target_type"],
            "target": q["target_value"],
            "rewards": [res.reward(d, ctx) for d in q["drop"]],
        }
        if q["target_type"] == 1:
            entry["chapter"], entry["stage"] = divmod(q["target_value"], 100)
        elif q["target_type"] == 2:
            entry["chapter"] = q["target_value"] - 1  # "Clear Prologue" has target 1, chapter n has n + 1
        out.append(entry)
    return out


def condition(row):
    kinds, params = row["unlock_condition"], row["unlock_condition_param"]
    cond = {}
    for kind, param in zip(kinds, params):
        if kind == "stage_id":
            cond["stageId"] = param
            cond["stage"] = stage_label(param)
            cond["never"] = param >= STAGE_SENTINEL
        elif kind == "vip":
            cond["vip"] = param
        else:
            cond.setdefault("other", []).append({"kind": kind, "param": param})
    return cond


def unlock_variants(table):
    """open_condition holds complete variants keyed by version ({"1": {...}, "2": {...}}) in newer
    clients and a flat table in older ones. Return {variant: {id: row}}."""
    variants = {k: rows(v) for k, v in table.items()
                if not k.startswith("__") and isinstance(v, dict) and "unlock_condition" not in v}
    return variants or {"1": rows(table)}


def unlocks(table, res, labels=None):
    """One entry per unlock id; condition per variant ("conditions": {"1": {...}, "2": {...}}).
    Name/description come from the first variant that has them. Without a client name the
    name comes from data/unlock_labels.json ("nameSource": "label"); still unnamed entries are
    marked "hidden" when the label file says so."""
    labels = labels or {}
    named = labels.get("labels", {})
    hide_unnamed = labels.get("hideUnnamed", False)
    variants = unlock_variants(table)
    ids = sorted({i for v in variants.values() for i in v}, key=int)
    out = []
    for key in ids:
        present = {name: v[key] for name, v in variants.items() if key in v}
        ctx = f"unlock {key}"
        name = desc = icon = None
        for row in present.values():
            name = name or (res.tr(row.get("name"), ctx) if row.get("name") else None)
            desc = desc or (res.tr(row.get("open_des"), ctx) if row.get("open_des") else None)
            icon = icon or (Path(row["icon_img"]).stem if row.get("icon_img") else None)
        first = next(iter(present.values()))
        conditions = {}
        for variant, row in present.items():
            cond = condition(row)
            if row.get("start_time"):
                cond["startTime"] = row["start_time"]
            if row.get("vip_unlock"):
                cond["vipUnlock"] = row["vip_unlock"]
            conditions[variant] = cond
        key_name = first["key"].strip()
        source = "client" if name else None
        if not name and key_name in named:
            name, source = named[key_name]["name"], "label"
        out.append({
            "id": first["id"],
            "key": key_name,
            "name": name,
            "nameSource": source,
            "hidden": bool(hide_unnamed and not name),
            "description": desc,
            "conditions": conditions,
            "popup": bool(first.get("window_show")),
            "icon": icon,
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--global", dest="glob", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path("out/site_data"))
    ap.add_argument("--labels", type=Path, default=Path(__file__).parent / "data/unlock_labels.json",
                    help="names for unlocks without English client text")
    args = ap.parse_args()
    labels = load(args.labels) if args.labels.exists() else {}
    root = args.glob
    cfg = root / "client/config"
    res = Resolver(root)
    special = special_chains(load(cfg / "quest_special.json"))
    chains = []
    for type_id, (key, label) in CHAINS.items():
        if type_id in special:
            chains.append({"key": key, "label": label, "quests": chain_quests(special[type_id], res)})
    data = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "client": "global",
        "source": str(root),
        "chains": chains,
        "unlocks": unlocks(load(cfg / "open_condition/open_condition.json"), res, labels),
        "unresolved": [{"key": k, "where": v} for k, v in sorted(res.unresolved.items())],
    }
    args.out.mkdir(parents=True, exist_ok=True)
    target = args.out / "odyssey.global.json"
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    hidden = [u["key"] for u in data["unlocks"] if u["hidden"]]
    if hidden:
        print(f"{len(hidden)} unnamed unlock(s) hidden (add a name to {args.labels.name} to show one): {', '.join(hidden)}")
    counts = ", ".join(f"{c['key']} {len(c['quests'])}" for c in chains)
    print(f"wrote {target}: {counts}, unlocks {len(data['unlocks'])}, unresolved {len(data['unresolved'])}")


if __name__ == "__main__":
    main()
