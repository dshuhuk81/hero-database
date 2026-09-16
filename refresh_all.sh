#!/usr/bin/env bash
#
# Holt frische Daten und baut alles Abgeleitete neu.
#
# Global und CN sind zwei verschiedene Apps - ein Lauf bedient den Client, der
# gerade im Emulator laeuft. Fuer beide: App wechseln, Skript nochmal starten.
# Die abgeleiteten Artefakte werden jedes Mal komplett neu gebaut, also auch
# fuer den Client, der diesmal nicht extrahiert wurde.
#
#   ./refresh_all.sh              laufenden Client erkennen und extrahieren
#   ./refresh_all.sh --global     Global erzwingen
#   ./refresh_all.sh --cn         CN erzwingen
#   ./refresh_all.sh --no-extract nur neu bauen, keine Extraktion
#   ./refresh_all.sh --no-site    Dashboard-Build ueberspringen
#
set -euo pipefail

PROJECT="/Users/daschultheiss/android"
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
BACKUP_ROOT="$PROJECT/.schedule_backups"

PKG_GLOBAL="com.goatgames.mot.gb.gp"
PKG_CN="com.tencent.tmgp.seayoo.zero"

want=""
do_extract=1
do_site=1

for arg in "$@"; do
  case "$arg" in
    --global)     want="GLOBAL" ;;
    --cn)         want="CN" ;;
    --no-extract) do_extract=0 ;;
    --no-site)    do_site=0 ;;
    -h|--help)    awk 'NR<3{next} /^#/{sub(/^# ?/,"");print;next} {exit}' "$0"; exit 0 ;;
    *)            echo "unbekannte Option: $arg" >&2; exit 2 ;;
  esac
done

cd "$PROJECT"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
warn() { printf '\033[33m!! %s\033[0m\n' "$*" >&2; }
die() { printf '\033[31m!! %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- Extraktion
if [ "$do_extract" -eq 1 ]; then
  say "Client suchen"

  [ -x "$ADB" ] || die "adb nicht gefunden: $ADB  (Pfad via ADB= setzen)"
  "$ADB" start-server >/dev/null 2>&1 || true
  "$ADB" devices | grep -qE '\sdevice$' || die "kein Geraet verbunden - Emulator starten"

  pid_global="$("$ADB" shell pidof "$PKG_GLOBAL" 2>/dev/null | tr -d '\r' || true)"
  pid_cn="$("$ADB" shell pidof "$PKG_CN" 2>/dev/null | tr -d '\r' || true)"

  if [ -z "$want" ]; then
    if [ -n "$pid_global" ] && [ -n "$pid_cn" ]; then
      die "beide Clients laufen - mit --global oder --cn entscheiden"
    elif [ -n "$pid_global" ]; then
      want="GLOBAL"
    elif [ -n "$pid_cn" ]; then
      want="CN"
    else
      die "kein Motto-Prozess gefunden - Spiel starten und bis in die Lobby laufen lassen"
    fi
  fi

  if [ "$want" = "GLOBAL" ]; then
    [ -n "$pid_global" ] || die "Global laeuft nicht (pidof $PKG_GLOBAL leer)"
    echo "   GLOBAL, pid $pid_global"
    say "Extraktion GLOBAL"
    python3 motto_live_extraction.py
  else
    [ -n "$pid_cn" ] || die "CN laeuft nicht (pidof $PKG_CN leer)"
    echo "   CN, pid $pid_cn"
    say "Extraktion CN"
    # Ohne --baseline-release vergleicht die News-Check-Sektion gegen die
    # Global-RELEASE_SCHEDULE.md und meldet jede CN-Abweichung als Neuheit.
    baseline_cn="$PROJECT/live_extractions_cn/latest/release_schedule_extracted.md"
    if [ -f "$baseline_cn" ]; then
      python3 motto_live_extraction.py \
        --package "$PKG_CN" \
        --output-root "$PROJECT/live_extractions_cn" \
        --baseline-release "$baseline_cn"
    else
      warn "kein CN-Vorlauf gefunden - News Check laeuft gegen Global und rauscht"
      python3 motto_live_extraction.py \
        --package "$PKG_CN" \
        --output-root "$PROJECT/live_extractions_cn"
    fi
  fi

  echo
  echo "   Discovery-Report:"
  if [ "$want" = "GLOBAL" ]; then
    sed -n '/^## News Check/,/^## /p' live_extractions/latest/DISCOVERY_REPORT.md | head -20
  else
    sed -n '/^## News Check/,/^## /p' live_extractions_cn/latest/DISCOVERY_REPORT.md | head -20
  fi
else
  say "Extraktion uebersprungen (--no-extract)"
fi

# ------------------------------------------------------------------ Baseline
say "Baseline sichern"
stamp="$(date +%Y%m%d_%H%M%S)"
backup="$BACKUP_ROOT/$stamp"
mkdir -p "$backup"
have_baseline=0
for f in EVENT_SCHEDULE.json EVENT_SCHEDULE_CN.json; do
  if [ -f "$f" ]; then
    cp "$f" "$backup/$f"
    have_baseline=1
  fi
done
if [ "$have_baseline" -eq 1 ]; then
  echo "   $backup"
else
  warn "keine bisherigen Schedules - erster Lauf, kein Diff moeglich"
fi

# ------------------------------------------------------- Abgeleitete Artefakte
# Reihenfolge zwingend: CN zuerst, Global braucht dessen JSON fuer Versatz
# und fuer Teil 2 des zusammengefuehrten Markdowns.
# Server-Startdatum je Client, falls in server_starts.json hinterlegt. Ohne das
# bleiben god_trial, weekly_activities, battlepass & Co. undatiert - sie haengen
# am Alter des Servers, nicht am Kalender.
server_start() {
  [ -f server_starts.json ] || return 0
  python3 -c "
import json,sys
try: v=json.load(open('server_starts.json')).get(sys.argv[1])
except Exception: v=None
print(v or '')
" "$1"
}

# Ein fehlgeschlagener Lauf legt trotzdem ein Verzeichnis an und zieht `latest`
# auf sich. Deshalb nicht dem Symlink folgen, sondern den neuesten Lauf nehmen,
# der wirklich einen Config enthaelt.
pick_dump() {
  local root="$1" label="$2" good latest_run
  good="$(python3 resolve_dump.py "$root" 2>/dev/null)" || {
    die "kein $label-Lauf mit Config unter $root - erst eine Extraktion, die durchlaeuft"
  }
  latest_run="$(readlink "$root/latest" 2>/dev/null || true)"
  if [ -n "$latest_run" ] && [ "$latest_run" != "$good" ]; then
    warn "$label: latest zeigt auf $(basename "$latest_run") - der Lauf hat keinen Config."
    warn "$label: nehme stattdessen $(basename "$good")"
  fi
  printf '%s' "$good"
}

say "Event-Kalender CN"
cn_dump="$(pick_dump live_extractions_cn CN)"
echo "   Dump: $(basename "$cn_dump")"
cn_args=(--root "$cn_dump")
[ -f "$backup/EVENT_SCHEDULE_CN.json" ] && cn_args+=(--baseline "$backup/EVENT_SCHEDULE_CN.json")
cn_start="$(server_start CN)"
if [ -n "$cn_start" ]; then
  cn_args+=(--server-start "$cn_start")
  echo "   Server-Start CN: $cn_start"
else
  warn "kein Server-Start fuer CN in server_starts.json - server-tag-relative Events bleiben undatiert"
fi
python3 extract_event_schedule.py "${cn_args[@]}"

say "Event-Kalender GLOBAL"
gl_dump="$(pick_dump live_extractions GLOBAL)"
echo "   Dump: $(basename "$gl_dump")"
gl_args=(--root "$gl_dump" --compare EVENT_SCHEDULE_CN.json --merge EVENT_SCHEDULE_CN.json)
[ -f "$backup/EVENT_SCHEDULE.json" ] && gl_args+=(--baseline "$backup/EVENT_SCHEDULE.json")
gl_start="$(server_start GLOBAL)"
if [ -n "$gl_start" ]; then
  gl_args+=(--server-start "$gl_start")
  echo "   Server-Start GLOBAL: $gl_start"
else
  warn "kein Server-Start fuer GLOBAL in server_starts.json - server-tag-relative Events bleiben undatiert"
fi
python3 extract_event_schedule.py "${gl_args[@]}"

say "Artefakt-Kalender"
python3 build_event_calendar.py

say "Dashboard-Daten"
python3 build_dashboard_data.py

if [ "$do_site" -eq 1 ]; then
  if [ -d dashboard/node_modules ]; then
    say "Dashboard bauen"
    (cd dashboard && npm run build 2>&1 | tail -3)
  else
    warn "dashboard/node_modules fehlt - 'cd dashboard && npm install' nachholen"
  fi
fi

# ---------------------------------------------------------------------- Diff
say "Was sich geaendert hat"
if [ "$have_baseline" -eq 1 ]; then
  python3 - "$backup" <<'PY'
import json, sys
from pathlib import Path

backup = Path(sys.argv[1])
project = Path("/Users/daschultheiss/android")


def index(data):
    out = {}
    for bucket in ("running", "upcoming", "past"):
        for ev in data.get(bucket, []):
            out[str(ev["id"])] = ev
    return out


changed_any = False
for label, name in (("GLOBAL", "EVENT_SCHEDULE.json"), ("CN", "EVENT_SCHEDULE_CN.json")):
    old_path, new_path = backup / name, project / name
    if not old_path.is_file():
        continue
    old = index(json.loads(old_path.read_text(encoding="utf-8")))
    new = index(json.loads(new_path.read_text(encoding="utf-8")))

    added = [new[k] for k in new.keys() - old.keys()]
    removed = [old[k] for k in old.keys() - new.keys()]
    moved = [
        (new[k], old[k])
        for k in new.keys() & old.keys()
        if (new[k].get("start"), new[k].get("end")) != (old[k].get("start"), old[k].get("end"))
    ]

    if not (added or removed or moved):
        print(f"   {label}: keine Aenderung an den Absolut-Terminen")
        continue

    changed_any = True
    print(f"   {label}: +{len(added)} neu / ~{len(moved)} verschoben / -{len(removed)} entfallen")
    for ev in sorted(added, key=lambda e: e.get("start") or ""):
        print(f"     + {(ev.get('start') or '')[:10]}  {ev['name']:24} {ev.get('hero') or ev['label']}")
    for new_ev, old_ev in sorted(moved, key=lambda p: p[0].get("start") or ""):
        print(f"     ~ {new_ev['name']:24} {(old_ev.get('start') or '')[:10]} -> {(new_ev.get('start') or '')[:10]}")
    for ev in sorted(removed, key=lambda e: e.get("start") or ""):
        print(f"     - {(ev.get('start') or '')[:10]}  {ev['name']:24} {ev['label']}")

if not changed_any:
    print("\n   Der Patch bringt keine neuen oder verschobenen Termine.")
PY
else
  echo "   uebersprungen - keine Baseline"
fi

say "Fertig"
cat <<EOF
   EVENT_SCHEDULE.md         Global + CN, getrennte Teile
   EVENT_SCHEDULE_CN.md      CN allein
   EVENT_CALENDAR.html       Artefakt-Kalender
   dashboard/dist/           statische Seite
   Baseline dieses Laufs     $backup
EOF
