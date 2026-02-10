import json
import os
import glob
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ============================================================
# KONFIGURATION – hier anpassen
# ============================================================
FOLDER_PATH      = "src/data/heroes"          # Ordner mit den Helden-JSON Dateien
CREDENTIALS_FILE = "google_credentials.json"  # OAuth Client-ID Datei
TOKEN_FILE       = "token.json"               # Wird automatisch erstellt nach erstem Login
SPREADSHEET_ID   = "1Cfw5NuxihHm_277IdbED9fYpXXyw3YKyEzz_OyTryMI"     # Aus der Google Sheets URL
SHEET_NAME       = "Ratings"                  # Name des Tabellenblatts
# ============================================================

SCOPES      = ["https://www.googleapis.com/auth/spreadsheets"]
RATING_KEYS = ["overall", "grimSurge", "delusionsDen", "torrentRift", "pvp", "odyssey"]


def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return creds


def fetch_sheet_data(sheet):
    """Liest alle Zeilen aus dem Google Sheet."""
    result = sheet.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{SHEET_NAME}!A1:G"
    ).execute()
    return result.get("values", [])


def build_name_to_file_map():
    """Erstellt eine Map von Heldenname (lowercase) → Dateipfad."""
    pattern = os.path.join(FOLDER_PATH, "*.json")
    files = glob.glob(pattern)
    name_map = {}

    for filepath in files:
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                continue

        # Name aus JSON oder Dateiname als Fallback
        hero_name = data.get("name") or os.path.splitext(os.path.basename(filepath))[0]
        name_map[hero_name.lower()] = filepath

    return name_map


def import_ratings():
    print("🔐 Google Login ...")
    creds = get_credentials()
    service = build("sheets", "v4", credentials=creds)
    sheet = service.spreadsheets()

    print("\n📥 Lese Google Sheet ...")
    rows = fetch_sheet_data(sheet)

    if not rows or len(rows) < 2:
        print("❌ Keine Daten im Sheet gefunden.")
        return

    # Header-Zeile auslesen
    header = rows[0]
    data_rows = rows[1:]
    print(f"   {len(data_rows)} Helden im Sheet gefunden.")

    # Spaltenindex für jedes Rating ermitteln
    col_index = {key: header.index(key) for key in RATING_KEYS if key in header}

    # Name → Dateipfad Map aufbauen
    print("\n🗂️  Lade lokale JSON-Dateien ...")
    name_map = build_name_to_file_map()

    updated = 0
    skipped = 0
    not_found = []

    print("\n🔄 Vergleiche und aktualisiere ...\n")

    for row in data_rows:
        if not row:
            continue

        hero_name = row[0]
        hero_key  = hero_name.lower()

        if hero_key not in name_map:
            not_found.append(hero_name)
            continue

        filepath = name_map[hero_key]

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        current_ratings = data.get("ratings", {})
        changed = False

        for key, idx in col_index.items():
            new_value = row[idx] if idx < len(row) else "–"
            old_value = current_ratings.get(key, "–")

            if new_value != old_value:
                print(f"  ✏️  {hero_name}: {key} {old_value} → {new_value}")
                current_ratings[key] = new_value
                changed = True

        if changed:
            data["ratings"] = current_ratings
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            updated += 1
        else:
            skipped += 1

    # Zusammenfassung
    print(f"\n{'─' * 40}")
    print(f"✅  {updated} Held(en) aktualisiert")
    print(f"⏭️   {skipped} Held(en) unverändert")
    if not_found:
        print(f"⚠️   Nicht gefunden: {', '.join(not_found)}")
    print(f"{'─' * 40}")
    print("\n✨ Import abgeschlossen!")


if __name__ == "__main__":
    import_ratings()
