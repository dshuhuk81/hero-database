#!/usr/bin/env python3
"""Export event rewards (currently: leaderboards) for the site.

Usage: python3 -I scripts/export_event_rewards.py --global X_GLOBAL [--out out/site_data] [--icons DIR] [--art DIR]

Sources (client/config/active/active-rank/): active_rank.json (type per event), active_rank_reward.json
(rank tiers per event id). Reward names and icons come from item.json / money_guide.json, as in export_bosses.py.
Output: event_rewards.global.json with
  events["<event id>"] = {"kind": "leaderboard", "rankType": 3, "ranks": [{"from": 1, "to": 1, "rewards": [[type, id, num]]}]}
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--global", dest="glob", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path("out/site_data"))
    ap.add_argument("--icons", type=Path, help="write 96px WebP reward icons here")
    ap.add_argument("--art", type=Path, default=DEFAULT_ART, help="extracted ui_item PNGs")
    args = ap.parse_args()
    ex = Exporter(args.glob)
    events = leaderboards(ex)
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
