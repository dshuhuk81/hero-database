#!/usr/bin/env bash
# Downloads all hero portraits, skill images, and relic images from Cloudflare R2
# Output: ~/Downloads/hero-images/{heroes,skills}/

BASE="https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev"
OUT="$HOME/Downloads/hero-images"

mkdir -p "$OUT/heroes"
mkdir -p "$OUT/skills"

HEROES=(
  amunra anubis aquarius ares aries artemis athena bastet cancer canopicjar
  capricorn cashien cronus demeter diana dionysus eris fengyi freya geb gemini
  hecate hela hephaestus heracles hladgunnr horus idun iris isis jinchan
  jingwei jiutian-xuannv jormungandr khepri kraken leo libra medusa mengpo
  meret momus nemesis nezha nuba nut nuwa nymphia nyx pan phoenix pisces
  poseidon prometheus ratatoskr sagittarius scorpio sekhmet set skadi surtr
  tailao taurus tefnut treant ullr ushabti virgo wenshen yanluo yuelao zeus
)

TOTAL=${#HEROES[@]}
COUNT=0

for id in "${HEROES[@]}"; do
  COUNT=$((COUNT + 1))
  echo "[$COUNT/$TOTAL] $id"

  # Portrait
  curl -sf -o "$OUT/heroes/${id}.webp" "$BASE/heroes/${id}.webp" \
    && echo "  portrait ok" || echo "  portrait MISSING"

  # Skills 1-4
  for n in 1 2 3 4; do
    curl -sf -o "$OUT/skills/${id}_skill_${n}.webp" "$BASE/skills/${id}_skill_${n}.webp" \
      && echo "  skill_$n ok" || echo "  skill_$n MISSING"
  done

  # Relic
  curl -sf -o "$OUT/skills/${id}_relic.webp" "$BASE/skills/${id}_relic.webp" \
    && echo "  relic ok" || echo "  relic MISSING"
done

echo ""
echo "Done. Files saved to $OUT"
