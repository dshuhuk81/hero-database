import json
import os
import glob

# ============================================================
# KONFIGURATION – hier bei Bedarf anpassen
# ============================================================
FOLDER_PATH = "src/data/heroes"  # Ordner mit den Helden-JSON Dateien
ODYSSEY_RATING = "B"       # Standard-Rating für odyssey
# ============================================================

def add_odyssey_rating(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    ratings = data.get("ratings")

    if ratings is None:
        print(f"  ⚠️  Kein 'ratings'-Block gefunden: {filepath}")
        return False

    if "odyssey" in ratings:
        print(f"  ℹ️  'odyssey' bereits vorhanden, übersprungen: {filepath}")
        return False

    # Neues Dict mit odyssey direkt nach pvp einfügen
    new_ratings = {}
    for key, value in ratings.items():
        new_ratings[key] = value
        if key == "pvp":
            new_ratings["odyssey"] = ODYSSEY_RATING

    # Falls kein "pvp" vorhanden, odyssey ans Ende hängen
    if "odyssey" not in new_ratings:
        new_ratings["odyssey"] = ODYSSEY_RATING

    data["ratings"] = new_ratings

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  ✅  odyssey '{ODYSSEY_RATING}' hinzugefügt: {filepath}")
    return True


def main():
    # Findet alle .json Dateien im angegebenen Ordner
    pattern = os.path.join(FOLDER_PATH, "*.json")
    files = glob.glob(pattern)

    if not files:
        print(f"Keine helden.json Dateien in '{FOLDER_PATH}' gefunden.")
        return

    print(f"🔍 {len(files)} Datei(en) gefunden in '{os.path.abspath(FOLDER_PATH)}'\n")

    updated = 0
    for filepath in sorted(files):
        if add_odyssey_rating(filepath):
            updated += 1

    print(f"\n✨ Fertig! {updated}/{len(files)} Datei(en) aktualisiert.")


if __name__ == "__main__":
    main()
