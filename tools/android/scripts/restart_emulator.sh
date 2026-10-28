#!/usr/bin/env bash
# Restart the Android emulator, wait until it is booted, enable adb root, optionally start a game.
# Keeps the AVD data (no wipe). Safe to run when the emulator is not running yet.
#
# Usage:
#   scripts/restart_emulator.sh [--avd NAME] [--cold] [--launch global|cn]
#     --avd NAME      AVD to start (default: Pixel_9a_R)
#     --cold          cold boot, ignore the quick-boot snapshot (-no-snapshot-load)
#     --launch X      start the Global (com.goatgames.mot.gb.gp) or CN (com.tencent.tmgp.seayoo.zero) client
set -euo pipefail

SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$SDK/platform-tools/adb"
EMU="$SDK/emulator/emulator"
AVD="Pixel_9a_R"
COLD=0
LAUNCH=""
BOOT_TIMEOUT=300

while [[ $# -gt 0 ]]; do
  case "$1" in
    --avd) AVD="$2"; shift 2 ;;
    --cold) COLD=1; shift ;;
    --launch) LAUNCH="$2"; shift 2 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Unbekannte Option: $1" >&2; exit 2 ;;
  esac
done

case "$LAUNCH" in
  "") PKG="" ;;
  global) PKG="com.goatgames.mot.gb.gp" ;;
  cn) PKG="com.tencent.tmgp.seayoo.zero" ;;
  *) echo "--launch erwartet global oder cn" >&2; exit 2 ;;
esac

if ! "$EMU" -list-avds | grep -qx "$AVD"; then
  echo "AVD '$AVD' nicht gefunden. Vorhanden:" >&2
  "$EMU" -list-avds >&2
  exit 1
fi

if "$ADB" devices | grep -q "^emulator-.*device"; then
  echo "Beende laufenden Emulator ..."
  "$ADB" emu kill >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do
    pgrep -f "qemu-system.*-avd $AVD" >/dev/null || break
    sleep 1
  done
  if pgrep -f "qemu-system.*-avd $AVD" >/dev/null; then
    echo "Emulator reagiert nicht auf 'adb emu kill'. Bitte manuell schliessen." >&2
    exit 1
  fi
fi

ARGS=(-avd "$AVD")
[[ "$COLD" == 1 ]] && ARGS+=(-no-snapshot-load)
echo "Starte $AVD ${COLD:+(cold boot)} ..."
nohup "$EMU" "${ARGS[@]}" >/dev/null 2>&1 &

"$ADB" wait-for-device
echo "Warte auf Boot (max ${BOOT_TIMEOUT}s) ..."
for _ in $(seq 1 "$BOOT_TIMEOUT"); do
  [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] && break
  sleep 1
done
if [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]]; then
  echo "Boot nicht abgeschlossen nach ${BOOT_TIMEOUT}s." >&2
  exit 1
fi

"$ADB" root >/dev/null 2>&1 || true
sleep 2
echo "Boot fertig. adb uid: $("$ADB" shell id -u | tr -d '\r') (0 = root)"

if [[ -n "$PKG" ]]; then
  echo "Starte $PKG ..."
  "$ADB" shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
fi
echo "Fertig."
