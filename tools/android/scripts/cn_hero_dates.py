#!/usr/bin/env python3
"""List the raw hero enable_time values of the CN or Global client, including future and placeholder dates (2099 etc.).

The site export (export_hero_releases.py) turns placeholders into null on purpose. This view keeps them, so you can
see which heroes are prepared in a client but not dated yet. The other client is shown next to it when given.
Default view is CN; with --primary global the Global dates lead and CN is the comparison column.

Faction = first digit of the game id: 1 Spades, 2 Diamonds, 3 Clubs, 4 Hearts, 5 Starglint.
Status: released (date <= today), upcoming (real future date), placeholder (2099 or 2027-12-12 style), none (no enable_time).

Usage: tools/android/run.sh cn_hero_dates.py --cn out/emu_pull/<date>_plain/x_cn [--global out/emu_pull/<date>_plain/x_global]
         [--primary cn|global] [--only upcoming|placeholder|open] [--today YYYY-MM-DD]
  Global view: --primary global --global <x_global> [--cn <x_cn>]
  --only open   = everything not released yet (upcoming + placeholder)
"""
import argparse
import json
import re
from datetime import date
from pathlib import Path

FACTION = {1: "Spades", 2: "Diamonds", 3: "Clubs", 4: "Hearts", 5: "Starglint"}
PLACEHOLDER = re.compile(r"^(2099-|2027-12-12)")


def load(root):
    p = Path(root) / "client/config/hero_detail.json"
    return {k: v for k, v in json.loads(p.read_text()).items() if isinstance(v, dict)}


def skin_names(root):
    p = Path(root) / "client/config/hero_skin.json"
    out = {}
    for s in json.loads(p.read_text()).values():
        if isinstance(s, dict) and s.get("hero") and s.get("portrait") and "CommonTemp" not in s["portrait"]:
            h = s["hero"]
            if h not in out or s["id"] < out[h][0]:
                out[h] = (s["id"], re.sub(r"^A_UI_Portrait_|_Img$", "", s["portrait"]))
    return {h: n for h, (_, n) in out.items()}


def status(et, today):
    if not et:
        return "none"
    if PLACEHOLDER.match(et):
        return "placeholder"
    return "released" if et[:10] <= today else "upcoming"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cn", type=Path)
    ap.add_argument("--global", dest="glob", type=Path)
    ap.add_argument("--primary", choices=["cn", "global"], default="cn", help="client whose dates lead the list")
    ap.add_argument("--only", choices=["upcoming", "placeholder", "open"])
    ap.add_argument("--today", default=date.today().isoformat())
    a = ap.parse_args()

    roots = {"cn": a.cn, "global": a.glob}
    other_key = "global" if a.primary == "cn" else "cn"
    if not roots[a.primary]:
        ap.error(f"--primary {a.primary} needs --{a.primary}")
    cn, names = load(roots[a.primary]), skin_names(roots[a.primary])
    gl = load(roots[other_key]) if roots[other_key] else {}
    if roots[other_key]:
        names = {**skin_names(roots[other_key]), **names}  # fall back to the other client's names
    a.glob = roots[other_key]
    rows = []
    for k, v in cn.items():
        gid = int(k)
        if not 1000 <= gid <= 5999:
            continue
        et = v.get("enable_time") or ""
        st = status(et, a.today)
        if a.only == "open" and st not in ("upcoming", "placeholder"):
            continue
        if a.only in ("upcoming", "placeholder") and st != a.only:
            continue
        g = gl.get(k)
        gtxt = "-" if not a.glob else ("kein Eintrag" if g is None else ((g.get("enable_time") or "ohne Datum")[:10]))
        rows.append((et[:10] or "~", gid, names.get(gid, "?"), FACTION[gid // 1000], st, v.get("is_visible"), gtxt))
    rows.sort(key=lambda r: (r[0], r[1]))

    lead, cmp_ = ("CN", "Global") if a.primary == "cn" else ("Global", "CN")
    print(f"{lead}-Client, Stand {a.today}: {len(rows)} Helden" + (f" (Filter: {a.only})" if a.only else ""))
    print(f"{lead + ' enable_time':<15}{'ID':>5}  {'intern':<14}{'Fraktion':<10}{'Status':<12}{'sichtbar':<9}{cmp_ if a.glob else ''}")
    for et, gid, n, f, st, vis, g in rows:
        print(f"{et:<15}{gid:>5}  {n:<14}{f:<10}{st:<12}{str(vis):<9}{g if a.glob else ''}")


if __name__ == "__main__":
    main()
