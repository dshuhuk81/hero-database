#!/usr/bin/env python3
"""Export CN-client attributes and Chinese skill texts for heroes that are not released on Global yet.

Writes src/data/upcoming-heroes/<site id>.json for every src/data/heroes/*.json with "release": false.
Chinese text is the source; "en" fields are filled in by hand/translation and are kept across re-runs
(an "en" value is only reset when the Chinese source text changed).

    tools/android/run.sh export_upcoming_heroes.py --cn out/emu_pull/<date>_plain/x_cn [--pull-name <date>]

The CN pull must be unpacked (unpack_config.py), so that <cn>/client/config/hero_detail.json,
<cn>/skill_detail and <cn>/ZH_CN exist.
"""
import argparse
import glob
import json
import os
import re
import sys
import zlib
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
HEROES_DIR = REPO / "src" / "data" / "heroes"
OUT_DIR = REPO / "src" / "data" / "upcoming-heroes"

# Same mapping and scale as scripts/validate-hero-detail-stats.mjs (verified against released heroes).
ABSOLUTE_SCALE = 1923.746
ABSOLUTE_STAT_MAP = {"atk": "901", "hp": "902", "armor": "941", "magicRes": "942"}
PERCENT_STAT_MAP = {
    "dodgeRate": "904", "hitBonus": "905", "critRate": "906", "critRes": "907",
    "atkSpdBonus": "915", "critDmgBonus": "919", "healEff": "928", "pDmgBonus": "931",
    "controlRes": "944", "ultimatePWR": "949",
}
# skill_detail "type": 1 ultimate, 2 basic attack, 3 active skill, 4 passive (checked against the CN client).
KIND_BY_TYPE = {1: "ultimate", 2: "basic", 3: "skill", 4: "passive"}


def load_chunks(folder):
    """Read a client table folder (numbered raw-DEFLATE or plain JSON chunks) into one dict."""
    out = {}
    for path in glob.glob(os.path.join(folder, "*")):
        if not os.path.basename(path).isdigit():
            continue
        raw = Path(path).read_bytes()
        try:
            data = json.loads(raw.decode("utf-8-sig"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            data = json.loads(zlib.decompress(raw, -15).decode("utf-8-sig"))
        for key, value in (data.items() if isinstance(data, dict) else data):
            out[str(key)] = value
    return out


def derive_stats(attr_base):
    stats = {}
    for name, attr in ABSOLUTE_STAT_MAP.items():
        if attr in attr_base:
            stats[name] = round(attr_base[attr] * ABSOLUTE_SCALE)
    for name, attr in PERCENT_STAT_MAP.items():
        if attr in attr_base:
            stats[name] = round(attr_base[attr] * 100, 1)
    return stats


def preview_heroes():
    heroes = []
    for path in sorted(HEROES_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("release") is False and data.get("heroID"):
            heroes.append((data["id"], int(data["heroID"])))
    return heroes


def build_skills(hero, skills, lang, previous):
    result = []
    old = {s["slot"]: s for s in (previous or {}).get("skills", [])}
    for slot_key in sorted(hero.get("skill", {}), key=int):
        levels = sorted(hero["skill"][slot_key], key=lambda pair: pair[0])
        rows = [skills[str(skill_id)] for skill_id, _ in levels]
        base = rows[0]
        slot = int(slot_key)
        zh_name = lang.get(base["name"], "")
        zh_des = lang.get(base["des"], "")
        upgrades = [
            {"level": index + 2, "zh": lang.get(row["des"], "")}
            for index, row in enumerate(rows[1:])
        ]
        entry = {
            "slot": slot,
            "kind": KIND_BY_TYPE.get(base.get("type"), "skill"),
            "zh": {"name": zh_name, "description": zh_des},
            "upgrades": upgrades,
        }
        # Keep an existing translation only while its Chinese source is unchanged.
        prev = old.get(slot)
        if prev and prev.get("zh") == entry["zh"]:
            entry["en"] = prev.get("en")
        if prev and prev.get("zh") == entry["zh"]:
            for upgrade, prev_up in zip(upgrades, prev.get("upgrades", [])):
                if prev_up.get("zh") == upgrade["zh"] and prev_up.get("en"):
                    upgrade["en"] = prev_up["en"]
        result.append(entry)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--cn", required=True, help="unpacked CN pull (the x_cn folder)")
    parser.add_argument("--pull-name", help="label stored in the files, default: parent folder name")
    args = parser.parse_args()

    cn = Path(args.cn).resolve()
    pull_name = args.pull_name or cn.parent.name
    hero_detail = json.loads((cn / "client" / "config" / "hero_detail.json").read_text(encoding="utf-8"))
    skills = load_chunks(str(cn / "skill_detail"))
    lang = load_chunks(str(cn / "ZH_CN"))
    skins = json.loads((cn / "client" / "config" / "hero_skin.json").read_text(encoding="utf-8"))
    skins = [skin for skin in skins.values() if isinstance(skin, dict)]
    ex_equip = json.loads((cn / "client" / "config" / "ex_equip" / "ex_equip_detail.json").read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    missing = []
    for site_id, game_id in preview_heroes():
        hero = hero_detail.get(str(game_id))
        if not hero or not hero.get("skill"):
            missing.append(site_id)
            continue
        target = OUT_DIR / f"{site_id}.json"
        previous = json.loads(target.read_text(encoding="utf-8")) if target.exists() else None
        attr_base = hero.get("attr_base", {})
        doc = {
            "id": site_id,
            "gameId": game_id,
            "source": {"client": "cn", "pull": pull_name},
            "cnName": lang.get(hero.get("name", ""), ""),
            "attrBase": {k: v for k, v in attr_base.items() if k != "__m"},
            "stats": derive_stats(attr_base),
            "skills": build_skills(hero, skills, lang, previous),
        }
        # Default skin (lowest id): which icon belongs to which skill slot, and the hero-screen backdrop.
        default_skin = min((s for s in skins if s.get("hero") == game_id), key=lambda s: s["id"], default=None)
        if default_skin:
            doc["art"] = {
                "skillIcons": {str(slot): default_skin.get(f"skill_icon_{slot}") for slot in (1, 2, 3, 4) if default_skin.get(f"skill_icon_{slot}")},
                "detailBackground": os.path.splitext(os.path.basename(default_skin.get("detail_background") or ""))[0] or None,
            }
            doc["art"]["relicIcon"] = default_skin.get("ex_equip_skill_icon")
        # Artifact (relic): ex_equip_detail is keyed by the hero game id; each level unlocks its own effect.
        relic_row = ex_equip.get(str(game_id))
        if relic_row and relic_row.get("ex_skill"):
            rows = [skills[str(skill_id)] for skill_id in relic_row["ex_skill"] if str(skill_id) in skills]
            prev_relic = (previous or {}).get("relic") or {}
            relic = {
                "zh": {"name": lang.get(f"tid#ExEquipName{game_id}", ""), "skillName": lang.get(rows[0]["name"], "") if rows else ""},
                "levels": [{"level": index + 1, "zh": lang.get(row["des"], "")} for index, row in enumerate(rows)],
            }
            if prev_relic.get("zh") == relic["zh"] and prev_relic.get("en"):
                relic["en"] = prev_relic["en"]
            for level, prev_level in zip(relic["levels"], prev_relic.get("levels", [])):
                if prev_level.get("zh") == level["zh"] and prev_level.get("en"):
                    level["en"] = prev_level["en"]
            doc["relic"] = relic
        if previous and previous.get("enSource"):
            doc["enSource"] = previous["enSource"]
        target.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {target.relative_to(REPO)} ({len(doc['skills'])} skills)")
    if missing:
        print("not in this CN pull (no preview written): " + ", ".join(missing), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
