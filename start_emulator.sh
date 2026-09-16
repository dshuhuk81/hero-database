#!/usr/bin/env bash
#
# Startet den Emulator und schaltet adb auf root.
#
# Root ist Pflicht: motto_live_extraction.py liest /proc/<pid>/mem und
# /proc/<pid>/maps des Spielprozesses. Frida wird NICHT gebraucht - das
# nutzen nur die capture_*.py fuer Live-Texte.
#
# Das AVD muss ein google_apis-Image sein, kein google_apis_playstore -
# auf Playstore-Images verweigert adbd den Rootbetrieb.
#
#   ./start_emulator.sh                 AVD starten, root, Status
#   ./start_emulator.sh --launch global App gleich mitstarten
#   ./start_emulator.sh --launch cn
#   ./start_emulator.sh --avd Pixel_9   anderes AVD
#   ./start_emulator.sh --cold          ohne Snapshot starten, wenn der Boot haengt
#   ./start_emulator.sh --wipe          Nutzerdaten loeschen, letzte Stufe
#
set -euo pipefail

SDK="${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}"
ADB="${ADB:-$SDK/platform-tools/adb}"
EMULATOR="${EMULATOR:-$SDK/emulator/emulator}"
AVD="${AVD:-MottoRoot}"
SERIAL="${ANDROID_SERIAL:-emulator-5554}"

PKG_GLOBAL="com.goatgames.mot.gb.gp"
PKG_CN="com.tencent.tmgp.seayoo.zero"

launch=""
cold=0
wipe=0

while [ $# -gt 0 ]; do
  case "$1" in
    --avd)    AVD="$2"; shift 2 ;;
    --launch)
      case "$2" in
        global|cn) launch="$2" ;;
        # Vor dem Emulator-Start pruefen, nicht erst nach vier Minuten Boot.
        *) echo "--launch nimmt 'global' oder 'cn', nicht '$2'" >&2; exit 2 ;;
      esac
      shift 2 ;;
    --cold)   cold=1; shift ;;
    --wipe)   wipe=1; cold=1; shift ;;
    -h|--help) awk 'NR<3{next} /^#/{sub(/^# ?/,"");print;next} {exit}' "$0"; exit 0 ;;
    *) echo "unbekannte Option: $1" >&2; exit 2 ;;
  esac
done

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
warn() { printf '\033[33m!! %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[31m!! %s\033[0m\n' "$*" >&2; exit 1; }

[ -x "$ADB" ]      || die "adb nicht gefunden: $ADB"
[ -x "$EMULATOR" ] || die "emulator nicht gefunden: $EMULATOR"

# ------------------------------------------------------------------- Starten
say "Emulator"
"$ADB" start-server >/dev/null 2>&1 || true

# Jeder Zustand zaehlt als "da", nicht nur 'device' - ein bootender Emulator
# steht als 'offline' in der Liste, und ein zweiter Start wuerde scheitern.
if "$ADB" devices | grep -q "^${SERIAL}[[:space:]]"; then
  state="$("$ADB" devices | awk -v s="$SERIAL" '$1==s {print $2}')"
  echo "   laeuft schon ($SERIAL, $state)"
elif pgrep -f "qemu-system.*-avd $AVD" >/dev/null 2>&1; then
  echo "   Prozess laeuft schon, adb sieht ihn noch nicht"
else
  "$EMULATOR" -list-avds | grep -qx "$AVD" \
    || die "AVD '$AVD' gibt es nicht. Vorhanden: $("$EMULATOR" -list-avds | tr '\n' ' ')"

  # Playstore-Images koennen kein adb root - lieber vorher sagen als nachher raten.
  cfg="$HOME/.android/avd/$AVD.avd/config.ini"
  if [ -f "$cfg" ] && grep -q "playstore" "$cfg"; then
    warn "'$AVD' ist ein Playstore-Image - adb root wird scheitern, Memory-Dump geht nicht"
  fi

  # Kein -writable-system: wir schreiben nie nach /system, wir lesen nur
  # /proc/<pid>/mem. Die Option erzwingt eine beschreibbare Kopie des
  # System-Images und bleibt auf API 30 arm64 regelmaessig im Boot haengen.
  opts=(-avd "$AVD")
  if [ "$wipe" -eq 1 ]; then
    opts+=(-no-snapshot-load -wipe-data)
    echo "   starte $AVD (Nutzerdaten werden geloescht)"
  elif [ "$cold" -eq 1 ]; then
    opts+=(-no-snapshot-load)
    echo "   starte $AVD (kalt, ohne Snapshot)"
  else
    echo "   starte $AVD"
  fi
  # Voll abkoppeln: sonst nimmt ein Ctrl-C oder das Schliessen des Terminals
  # den Emulator mit und laesst ihn halb gebootet zurueck.
  nohup "$EMULATOR" "${opts[@]}" >/dev/null 2>&1 &
  disown 2>/dev/null || true
fi

say "Boot abwarten"
"$ADB" -s "$SERIAL" wait-for-device
for _ in $(seq 1 120); do
  [ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && break
  sleep 2
done
if [ "$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; then
  warn "Boot nach 4 Minuten nicht fertig"
  die "haengt meist am Snapshot. Der Reihe nach:
     pkill -f qemu-system
     ./start_emulator.sh --cold     (Snapshot ignorieren)
     ./start_emulator.sh --wipe     (Nutzerdaten loeschen, letzte Stufe)"
fi
echo "   fertig gebootet"

# ----------------------------------------------------------------------- Root
say "Root"
if [ "$("$ADB" -s "$SERIAL" shell id -u 2>/dev/null | tr -d '\r')" = "0" ]; then
  echo "   adbd laeuft schon als root"
else
  root_out="$("$ADB" -s "$SERIAL" root 2>&1 || true)"
  # adb root startet adbd neu - die Verbindung bricht kurz weg.
  sleep 2
  "$ADB" -s "$SERIAL" wait-for-device
  uid="$("$ADB" -s "$SERIAL" shell id -u 2>/dev/null | tr -d '\r')"
  if [ "$uid" = "0" ]; then
    echo "   adbd auf root umgestellt"
  else
    warn "kein Root (uid=$uid). ${root_out:-}"
    die "ohne Root kein Zugriff auf /proc/<pid>/mem - refresh_all.sh wuerde scheitern"
  fi
fi

# ------------------------------------------------------------------- Pakete
say "Installierte Clients"
installed_global=0
installed_cn=0
"$ADB" -s "$SERIAL" shell pm list packages 2>/dev/null | tr -d '\r' > /tmp/.motto_pkgs || true
grep -q "$PKG_GLOBAL" /tmp/.motto_pkgs && { installed_global=1; echo "   GLOBAL  $PKG_GLOBAL"; }
grep -q "$PKG_CN"     /tmp/.motto_pkgs && { installed_cn=1;     echo "   CN      $PKG_CN"; }
[ "$installed_global" -eq 0 ] && [ "$installed_cn" -eq 0 ] \
  && warn "kein Motto-Client installiert - APK mit 'adb install <datei>.apk' aufspielen"
rm -f /tmp/.motto_pkgs

# -------------------------------------------------------------------- Starten
if [ -n "$launch" ]; then
  [ "$launch" = "global" ] && pkg="$PKG_GLOBAL" || pkg="$PKG_CN"
  say "App starten"
  "$ADB" -s "$SERIAL" shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 \
    || warn "Start ueber monkey fehlgeschlagen - App von Hand oeffnen"
  echo "   $pkg gestartet"
fi

# --------------------------------------------------------------------- Fertig
say "Bereit"
cat <<EOF
   Geraet    $SERIAL ($AVD)
   adbd      root

   Jetzt das Spiel oeffnen und BIS IN DIE LOBBY laufen lassen. Auf Splash- oder
   Ladescreen sind die Configs noch nicht im RAM entpackt - der Scan findet nichts.

   Danach:
       cd $PWD && ./refresh_all.sh
EOF
