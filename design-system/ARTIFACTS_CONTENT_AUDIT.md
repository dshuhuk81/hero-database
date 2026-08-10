# Artifact guide content audit

## Outcome

The page now answers the primary player question before explaining the underlying probability model. A player with newly awakened gear can identify the artifact by equipped position, count visible Awakened Effects instead of guessing a hidden tier, and follow a worked Zeus magic-DPS plan.

The original guide was technically detailed and internally useful, but its opening assumed that readers already understood three different meanings of “tier.” It also delayed the actionable build advice until after the formula, pool tables, material catalogue, and simulator.

## Changes already applied

- Added a **Start with your hero** section immediately after the page introduction.
- Defined the three concepts separately: equipped position, visible Awakened Effect count, and material strength.
- Replaced the simulator’s “Awakened Tier” control with “Visible Awakened Effects.”
- Added an end-to-end Zeus magic-DPS example with targets for all four equipped positions.
- Made the safe order explicit: unlock four effects, refine effect names, lock the finished result, then enhance effect levels.
- Removed the broken “last-slot cliff” navigation link.
- Removed the raw HTML import and build-time string extraction from `artifacts.astro`.
- Extracted embedded image data into `public/artifacts/`.

## Remaining readability risks and recommendations

### 1. “Slot” still has two possible meanings

The guide uses “Slot 1–4” for equipped artifact positions and “open slots” for unlocked effect lines. This is understandable after the new glossary, but easy to misread later on.

**Recommendation:** use **equipped position** for the artifact location and **open effect** for a rerolled line everywhere. Keep “Slot 1–4” only as a short in-game locator, for example “equipped position (Slot 1).”

### 2. The two stone families have near-identical names

“Refine stones” target a stat, while a “Refining Stone” pays for an attempt. Capitalization is not enough to separate them when scanning.

**Recommendation:** introduce editorial aliases and show the game label second:

- **Targeting Stone** — the stat-specific T1–T5 material.
- **Attempt Stone** — the item named Refining Stone, consumed once per attempt.

Use those aliases consistently in headings, cost readouts, and simulator controls.

### 3. “Pin,” “weight,” “floor,” and “cliff” are expert vocabulary

The probability section explains each term, but the playbook later assumes readers remember them.

**Recommendation:** use an immediate plain-language gloss on first reuse: “guarantee (pin),” “selection score (weight),” and “removed below 1% (floor).” Reserve “cliff” for optional advanced analysis.

### 4. The page is still reference-heavy

The complete tables and probability explanation are valuable, but the long page can bury the simulator after the player-first answer.

**Recommendation:** add a prominent “Open the simulator” link to the Zeus example and consider moving the deep material catalogue after the simulator. Do not hide the core workflow in an accordion.

### 5. Role presets are generic

The Zeus example solves one common case, while the target-set table still requires a player to know whether a hero deals physical or magic damage and whether Ultimate Power matters more than attack speed.

**Recommendation:** connect hero detail data to this page later. A hero selector could prefill role, damage type, equipped position, and four recommended effects, while still letting advanced players override every choice.

### 6. Some certainty statements need editorial ownership

Phrases such as “nothing here is an estimate,” “retrying is cheap,” and “this is free value” are absolute. Availability and player economy can change between patches.

**Recommendation:** show a compact verification date near the simulator and qualify economy advice by source and patch. Keep the mathematical claims separate from farming recommendations.

## Suggested next iteration

The highest-value follow-up is a hero/role preset above the simulator. It should preselect the appropriate equipped position and effects, then state why the fourth effect was chosen. This turns the current Zeus example into a reusable workflow without duplicating a guide for every hero.
