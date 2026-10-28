#!/usr/bin/env bash
# Runs one of the scripts in tools/android/scripts from the game-data directory.
#   tools/android/run.sh export_events.py --global out/emu_pull/<date>_plain/x_global --heroes out/site_data/hero_releases.json
# ANDROID_DATA_DIR  where client dumps, art and out/ live (default ~/Downloads/Sites/android)
# ANDROID_PYTHON    interpreter with UnityPy etc. (default <data dir>/.venv-arm/bin/python)
set -euo pipefail
TOOLS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ANDROID_DATA_DIR="${ANDROID_DATA_DIR:-$HOME/Downloads/Sites/android}"
[[ $# -ge 1 ]] || { echo "usage: $0 <script.py|script.sh> [args...]" >&2; exit 2; }
SCRIPT="$TOOLS/scripts/$1"
[[ -f "$SCRIPT" ]] || { echo "no such script: $SCRIPT" >&2; exit 2; }
cd "$ANDROID_DATA_DIR"
if [[ "$SCRIPT" == *.sh ]]; then exec "$SCRIPT" "${@:2}"; fi
exec "${ANDROID_PYTHON:-$ANDROID_DATA_DIR/.venv-arm/bin/python}" -I "$SCRIPT" "${@:2}"
