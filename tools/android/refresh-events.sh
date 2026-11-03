#!/usr/bin/env bash
# One-command refresh of release dates and events from the running emulator.
#   tools/android/refresh-events.sh   pull, unpack, export, import into src/data/generated/
# Needs the emulator with both clients running; open the Global game once and visit the lobby first.
set -euo pipefail
TOOLS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$TOOLS/../.." && pwd)"
DATA="${ANDROID_DATA_DIR:-$HOME/Downloads/Sites/android}"
RUN="$TOOLS/run.sh"
DATE="$(date +%Y%m%d)"
D="out/emu_pull/$DATE"
X="${D}_plain"

step() { printf '\n==> %s\n' "$*"; }

step "1/5 emulator status and version"
status="$("$RUN" emu_status.py)"
echo "$status" | grep -E '^\[|versionName' || { echo "emulator not reachable" >&2; exit 1; }
cn_version="$(echo "$status" | awk '/^\[cn\]/{f=1} f&&/versionName=/{sub(/.*versionName=/,""); print; exit}')"

step "2/5 pull -> $D"
[[ -e "$DATA/$D" ]] && { echo "$DATA/$D exists, remove it or run again tomorrow" >&2; exit 1; }
"$RUN" emu_status.py --pull --out "$D" | tail -4
# emu_status nests the files as <label>/files/; the other scripts expect <label>/
for label in global cn; do
  if [[ -d "$DATA/$D/$label/files" ]]; then
    mv "$DATA/$D/$label/files" "$DATA/$D/$label.tmp" && rmdir "$DATA/$D/$label" && mv "$DATA/$D/$label.tmp" "$DATA/$D/$label"
  fi
done
global_version="v$(ls "$DATA/$D/global/download" | grep -E '^[0-9]+$' | sort -n | tail -1)"
echo "Global $global_version, CN ${cn_version:-unknown}"
[[ -n "$cn_version" ]] || { echo "CN version not found" >&2; exit 1; }

step "3/5 unpack config"
"$RUN" unpack_config.py "$D/global" | tail -1
"$RUN" unpack_config.py "$D/cn" | tail -1

step "4/5 export"
"$RUN" export_hero_releases.py --global "$X/x_global" --cn "$X/x_cn" --client-global "$global_version" --client-cn "$cn_version" | head -1
"$RUN" export_events.py --global "$X/x_global" --heroes out/site_data/hero_releases.json | head -1

step "5/5 import and validate"
cd "$REPO"
npm run --silent import:game-data
echo
git status --short src/data/generated
git diff --stat -- src/data/generated
echo
echo "Next: read the warnings above, npm run build, commit src/data/generated/."
