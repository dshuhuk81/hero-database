#!/usr/bin/env python3
"""Export event rewards (leaderboards, Mystery Shop wish pool, login day lists) for the site.

Usage: python3 -I scripts/export_event_rewards.py --global X_GLOBAL [--out out/site_data] [--icons DIR] [--art DIR]

Sources (client/config/active/active-rank/): active_rank.json (type per event), active_rank_reward.json
(rank tiers per event id). Reward names and icons come from item.json / money_guide.json, as in export_bosses.py.
and active/active_mystery_shop/active_gacha_mystery.json (items a player can put on the wish list, per event id).
and active/carnival.json + carnival_quest.json (login events: one quest per day, target_type 83, target_value = day).
Output: event_rewards.global.json with
  events["<event id>"] = {"kind": "leaderboard", "rankType": 3, "ranks": [{"from": 1, "to": 1, "rewards": [[type, id, num]]}]}
  events["<event id>"] = {"kind": "wishlist", "rewards": [[type, id, num]]}      (Mystery Shop, ordered by "sort")
  events["<event id>"] = {"kind": "daily", "days": [{"day": 1, "rewards": [[type, id, num]]}]}   (login events)
  items["type/id"]     = {name, icon, quality, ...}   (shared by all events)
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from export_bosses import DEFAULT_ART, Exporter, rows, write_icons, load  # noqa: E402


def leaderboards(ex):
    base = ex.cfg / "active/active-rank"
    ranks = rows(load(base / "active_rank.json"))
    rewards = rows(load(base / "active_rank_reward.json"))
    out = {}
    for event_id, meta in sorted(ranks.items()):
        tiers = rows(rewards.get(event_id, {}))
        if not tiers:
            continue
        ctx = f"leaderboard {event_id}"
        out[event_id] = {
            "kind": "leaderboard",
            "rankType": meta.get("type"),
            "ranks": ex.ranks(tiers, ctx),
        }
    return out


def mystery_shops(ex):
    pools = rows(load(ex.cfg / "active/active_mystery_shop/active_gacha_mystery.json"))
    out = {}
    for event_id, pool in sorted(pools.items()):
        entries = sorted(rows(pool).values(), key=lambda r: r["sort"])
        rewards = []
        for entry in entries:
            rewards.extend(ex.rewards(entry["reward"], f"mystery shop {event_id}"))
        if rewards:
            out[event_id] = {"kind": "wishlist", "rewards": rewards}
    return out


LOGIN_DAYS = 83  # carnival quest target_type: login day count


def login_days(ex):
    base = ex.cfg / "active"
    active = rows(load(base / "active.json"))
    carnival = load(base / "carnival.json")
    quests = load(base / "carnival_quest.json")
    out = {}
    for event_id, event in sorted(active.items()):
        if event.get("logic_system_tag") != "CommonCarnivalSystemTag":
            continue
        row = rows(carnival.get(str(event.get("open_id")), {})).get(str(event.get("version")))
        group = rows(quests.get(str(row.get("quest")), {})) if row else {}
        if not group or any(q.get("target_type") != LOGIN_DAYS for q in group.values()):
            continue  # only plain day-by-day login lists are exported
        days = [{"day": q["target_value"], "rewards": ex.rewards(q["reward"], f"login {event_id}")}
                for q in sorted(group.values(), key=lambda q: q["target_value"])]
        out[event_id] = {"kind": "daily", "days": days}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--global", dest="glob", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path("out/site_data"))
    ap.add_argument("--icons", type=Path, help="write 96px WebP reward icons here")
    ap.add_argument("--art", type=Path, default=DEFAULT_ART, help="extracted ui_item PNGs")
    args = ap.parse_args()
    ex = Exporter(args.glob)
    events = {**leaderboards(ex), **mystery_shops(ex), **login_days(ex)}
    data = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "client": "global",
        "source": str(args.glob),
        "events": events,
        "items": dict(sorted(ex.used.items())),
        "unresolved": [{"key": k, "where": v} for k, v in sorted(ex.unresolved.items())],
    }
    args.out.mkdir(parents=True, exist_ok=True)
    target = args.out / "event_rewards.global.json"
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {target}: {len(events)} events, {len(data['items'])} items, unresolved {len(data['unresolved'])}")
    for u in data["unresolved"]:
        print(f"  unresolved {u['key']} ({u['where']})")
    if args.icons:
        missing = write_icons(data["items"], args.art, args.icons)
        print(f"icons -> {args.icons}" + (f", missing: {', '.join(missing)}" if missing else ""))


if __name__ == "__main__":
    main()
