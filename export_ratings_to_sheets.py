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
CREDENTIALS_FILE = "google_credentials.json"  # OAuth Client-ID Datei (siehe Anleitung)
TOKEN_FILE       = "token.json"               # Wird automatisch erstellt nach erstem Login
SPREADSHEET_ID   = "1Cfw5NuxihHm_277IdbED9fYpXXyw3YKyEzz_OyTryMI"     # Aus der Google Sheets URL (siehe Anleitung)
SHEET_NAME       = "Ratings"                  # Name des Tabellenblatts
# ============================================================

SCOPES      = ["https://www.googleapis.com/auth/spreadsheets"]
COLUMNS     = ["Heldenname", "overall", "grimSurge", "delusionsDen", "torrentRift", "pvp", "odyssey"]
RATING_KEYS = ["overall", "grimSurge", "delusionsDen", "torrentRift", "pvp", "odyssey"]


def get_credentials():
    """OAuth Login – beim ersten Mal öffnet sich der Browser, danach läuft es automatisch."""
    creds = None

    # Gespeichertes Token laden falls vorhanden
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    # Neu einloggen falls kein Token oder Token abgelaufen
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)

        # Token für nächste Ausführung speichern
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
        print("  ✅  Login erfolgreich, Token gespeichert.")

    return creds


def load_heroes():
    pattern = os.path.join(FOLDER_PATH, "*.json")
    files = glob.glob(pattern)

    if not files:
        print(f"❌ Keine JSON-Dateien in '{FOLDER_PATH}' gefunden.")
        return []

    heroes = []
    for filepath in sorted(files):
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                print(f"  ⚠️  Ungültiges JSON, übersprungen: {filepath}")
                continue

        ratings   = data.get("ratings", {})
        hero_name = data.get("name") or os.path.splitext(os.path.basename(filepath))[0]

        row = [hero_name] + [ratings.get(key, "–") for key in RATING_KEYS]
        heroes.append(row)

    heroes.sort(key=lambda x: x[0].lower())
    return heroes


def clear_and_write(sheet, rows):
    num_rows = len(rows) + 1
    num_cols = len(COLUMNS)
    range_name = f"{SHEET_NAME}!A1:{chr(64 + num_cols)}{num_rows}"

    sheet.values().clear(
        spreadsheetId=SPREADSHEET_ID,
        range=range_name
    ).execute()

    values = [COLUMNS] + rows
    sheet.values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{SHEET_NAME}!A1",
        valueInputOption="RAW",
        body={"values": values}
    ).execute()

    print(f"  ✅  {len(rows)} Helden in '{SHEET_NAME}' geschrieben.")


def format_sheet(sheet, num_rows):
    sheet_id = get_sheet_id(sheet)
    if sheet_id is None:
        print("  ⚠️  Sheet-ID nicht gefunden, Formatierung übersprungen.")
        return

    requests = [
        {
            "repeatCell": {
                "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
                "cell": {
                    "userEnteredFormat": {
                        "textFormat": {"bold": True},
                        "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.2},
                        "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                        "horizontalAlignment": "CENTER"
                    }
                },
                "fields": "userEnteredFormat(textFormat,backgroundColor,foregroundColor,horizontalAlignment)"
            }
        },
        {
            "repeatCell": {
                "range": {"sheetId": sheet_id, "startRowIndex": 1, "endRowIndex": num_rows + 1,
                          "startColumnIndex": 1},
                "cell": {"userEnteredFormat": {"horizontalAlignment": "CENTER"}},
                "fields": "userEnteredFormat.horizontalAlignment"
            }
        },
        {
            "autoResizeDimensions": {
                "dimensions": {
                    "sheetId": sheet_id,
                    "dimension": "COLUMNS",
                    "startIndex": 0,
                    "endIndex": len(COLUMNS)
                }
            }
        }
    ]

    sheet.batchUpdate(
        spreadsheetId=SPREADSHEET_ID,
        body={"requests": requests}
    ).execute()
    print("  ✅  Formatierung angewendet.")


def get_sheet_id(sheet):
    meta = sheet.get(spreadsheetId=SPREADSHEET_ID).execute()
    for s in meta.get("sheets", []):
        if s["properties"]["title"] == SHEET_NAME:
            return s["properties"]["sheetId"]
    return None


def main():
    print("🔐 Google Login ...")
    creds = get_credentials()
    service = build("sheets", "v4", credentials=creds)
    sheet = service.spreadsheets()

    print("\n🔍 Lade Helden-Daten ...")
    heroes = load_heroes()
    if not heroes:
        return
    print(f"   {len(heroes)} Helden gefunden.")

    print("\n📝 Schreibe Daten ...")
    clear_and_write(sheet, heroes)

    print("\n🎨 Formatiere Tabelle ...")
    format_sheet(sheet, len(heroes))

    print(f"\n✨ Fertig! Tabelle verfügbar unter:")
    print(f"   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}")


if __name__ == "__main__":
    main()
