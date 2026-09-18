# Hero rating system

This folder is the single place for hero ratings and their calculation.

## Quick workflow

1. Open `hero-ratings.json`.
2. Rate the hero in the six contexts using only `S+`, `S`, `A`, `B`, `C`, or `D`.
3. Leave an unknown context as an empty string. Never guess a rating.
4. Run `npm run validate:ratings`.
5. Run `npm run ratings:report` to review every input and calculated Overall in
   one table. Use `npm run ratings:report > rating-review.md` to share it.

Do **not** enter an Overall tier. Overall is calculated automatically.

## What the tiers mean

| Tier | Meaning |
| --- | --- |
| S+ | Exceptional and defining in this context |
| S | Among the strongest choices |
| A | Strong and broadly useful |
| B | Good, but replaceable or situational |
| C | Limited, niche, or noticeably outclassed |
| D | Poor choice in this context |

Compare heroes under similar investment. A rating describes performance in its
context, not how rare, popular, or visually impressive a hero is.

## Progression assumptions

| Stage | Account state | Investment assumption |
| --- | --- | --- |
| Early | Chapters 1–39 | Limited resources, usually Relic 0–10 |
| Midgame | Chapters 40–54 | Selective investment, usually Relic 10–30 |
| Endgame | Chapter 55+ | High to maximum investment, usually Relic 30+ |

Lucky summons do not change these assumptions. If an Early account has an
unusually well-built hero, that hero may perform above the listed Early rating.

## Overall calculation

Overall answers: **How valuable is this hero as a general recommendation for
most accounts?**

| Rating | Weight |
| --- | ---: |
| PvE Early | 25% |
| PvE Midgame | 25% |
| PvE Endgame | 20% |
| PvP Early | 5% |
| PvP Midgame | 10% |
| PvP Endgame | 15% |

Tier scores are `D=1`, `C=2`, `B=3`, `A=4`, `S=5`, and `S+=6`. Missing
ratings are excluded and the remaining weights are normalized. Such an Overall
is marked **Provisional** until all six ratings exist.

The weighted score becomes a tier at these boundaries:

| Overall | Minimum score |
| --- | ---: |
| S+ | 5.50 |
| S | 4.60 |
| A | 3.60 |
| B | 2.60 |
| C | 1.60 |
| D | 1.00 |

The executable source of truth is `ratingSystem.js` next to this document.

## Exceptional account impact

The formula can miss unique account-changing value. A hero may therefore move
up or down by **one tier maximum**. Every adjustment requires a short reason.

```json
{
  "name": "Example Hero",
  "pveearly": "A",
  "pvemidgame": "S",
  "pveendgame": "S",
  "pvpearly": "B",
  "pvpmidgame": "A",
  "pvpendgame": "A",
  "overallAdjustment": 1,
  "overallReason": "Unlocks a reliable early boss team with no equivalent substitute."
}
```

Use `1` to move up one tier, `-1` to move down one tier, and `0` for no
adjustment. Adjustments are for exceptional progression impact, investment
efficiency, irreplaceability, or severe practical limitations—not personal
preference.

## Review checklist

- Was the hero compared at the stage's expected investment?
- Is each rating based on actual play or reliable evidence?
- Would another reviewer understand the difference between adjacent tiers?
- Is an Overall adjustment truly exceptional and clearly explained?
- Are uncertain values left empty rather than guessed?
