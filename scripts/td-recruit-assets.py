#!/usr/bin/env python3
"""Shared placeholder art + sounds for the 12 recruit (filler) heroes.

Generates per recruit (see TOWER_DEFENSE_FILLER_HEROES.md):
- public/td/heroes-alt/{id}-thumb-96.webp   96x96
- public/td/heroes-alt/{id}-card-240.webp   240x587 (matches mythic card format)
- public/td/heroes-alt/{id}-token-192.webp  192x192
- public/td/heroes-alt/anims/{id}-idle-v1.webp  24 frames of 224x224 (sprite sheet)
- public/td/sfx/mythic-{id}-v4_{attack,ultimate}.ogg  (copied from a class donor)

Art: six anonymous class portraits from assets/td/recruit-placeholders, shared
by the two recruits in each class. They match the transparent full-body mythic
renders while keeping common recruits visually interchangeable. Replace the
source for a class to refresh every recruit that uses it.

Run: python3 scripts/td-recruit-assets.py
"""
import json
import math
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ALT = ROOT / "public/td/heroes-alt"
SFX = ROOT / "public/td/sfx"
ART = ROOT / "assets/td/recruit-placeholders"

RECRUITS = {
    # id: (class, display name, donor id for sounds)
    "recruit-bram": ("tank", "Bram", "heimdall"),
    "recruit-tilda": ("tank", "Tilda", "heimdall"),
    "recruit-kellan": ("warrior", "Kellan", "helios"),
    "recruit-sable": ("warrior", "Sable", "helios"),
    "recruit-ash": ("assassin", "Ash", "vidar"),
    "recruit-nyra": ("assassin", "Nyra", "vidar"),
    "recruit-elm": ("mage", "Elm", "boreas"),
    "recruit-ives": ("mage", "Ives", "boreas"),
    "recruit-wren": ("archer", "Wren", "atalanta"),
    "recruit-hollis": ("archer", "Hollis", "atalanta"),
    "recruit-poppy": ("support", "Poppy", "asclepius"),
    "recruit-jory": ("support", "Jory", "asclepius"),
}

def class_art(cls):
    image = Image.open(ART / f"{cls}.webp").convert("RGBA")
    # Ignore nearly transparent generation haze when finding the character bounds.
    mask = image.getchannel("A").point(lambda alpha: 255 if alpha > 16 else 0)
    bounds = mask.getbbox()
    return image.crop(bounds) if bounds else image


def full_body(cls, size):
    width, height = size
    art = class_art(cls)
    art.thumbnail((width - 8, height - 8), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size)
    canvas.alpha_composite(art, ((width - art.width) // 2, height - art.height - 4))
    return canvas


def portrait(cls, size):
    art = Image.open(ART / f"{cls}.webp").convert("RGBA")
    # Crop inside wide weapons and shields so small thumbnails keep the same
    # head-and-shoulders emphasis as the mythic thumb/token art.
    side = round(min(art.width, art.height) * 0.72)
    left = max(0, (art.width - side) // 2)
    crop = art.crop((left, 0, left + side, side))
    return crop.resize((size, size), Image.Resampling.LANCZOS)


def main():
    (ALT / "anims").mkdir(parents=True, exist_ok=True)
    levels_path = ROOT / "src/data/tdAudioLevels.json"
    levels = json.load(open(levels_path))
    art_owner = {}
    for rid, (cls, _name, donor) in RECRUITS.items():
        owner = art_owner.get(cls)
        if owner:
            for variant in ("thumb-96", "card-240", "token-192"):
                shutil.copyfile(ALT / f"{owner}-{variant}.webp", ALT / f"{rid}-{variant}.webp")
            shutil.copyfile(ALT / "anims" / f"{owner}-idle-v1.webp", ALT / "anims" / f"{rid}-idle-v1.webp")
        else:
            portrait(cls, 96).save(ALT / f"{rid}-thumb-96.webp", quality=82, method=4)
            portrait(cls, 192).save(ALT / f"{rid}-token-192.webp", quality=84, method=4)
            full_body(cls, (240, 587)).save(ALT / f"{rid}-card-240.webp", quality=86, method=4)
            # Idle sheet: the shared portrait gets a restrained breathing pulse.
            base_frame = portrait(cls, 224)
            sheet = Image.new("RGBA", (5376, 224))
            for i in range(24):
                scale = 0.97 + 0.03 * ((math.sin(i / 24 * math.tau) + 1) / 2)
                side = round(224 * scale)
                art = base_frame.resize((side, side), Image.Resampling.LANCZOS)
                frame = Image.new("RGBA", (224, 224))
                frame.alpha_composite(art, ((224 - side) // 2, 224 - side))
                sheet.paste(frame, (i * 224, 0))
            sheet.save(ALT / "anims" / f"{rid}-idle-v1.webp", quality=82, method=4)
            art_owner[cls] = rid
        # Sounds: reuse the class donor's files and levels.
        for kind in ("attack", "ultimate"):
            src = SFX / f"mythic-{donor}-v4_{kind}.ogg"
            dst = SFX / f"mythic-{rid}-v4_{kind}.ogg"
            shutil.copyfile(src, dst)
            levels[f"mythic-{rid}-v4_{kind}"] = levels[f"mythic-{donor}-v4_{kind}"]
    json.dump(levels, open(levels_path, "w"), indent=2, ensure_ascii=False)
    open(levels_path, "a").write("\n")
    print(f"recruit assets written for {len(RECRUITS)} heroes")


if __name__ == "__main__":
    main()
