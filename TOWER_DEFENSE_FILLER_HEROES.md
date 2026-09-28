# Tower Defense — Filler Heroes (Recruits)

Content + integration proposal · 28 September 2026 · English · Status: **proposal, not yet implemented**

Goal: enlarge the summon pool with generic low-value heroes ("recruits") so that
x10 summons produce commons, duplicates and dust income feel meaningful, and the
new-hero pity (`pityNewInMulti`, currently `false`) can be re-enabled later
without emptying the collection. This file follows the format of
`TOWER_DEFENSE_MYTHIC_HEROES.md`; unlike the 21 mythic heroes, recruits are
**mortal defenders of the crossing** — no myth anchors, no biographies, random
fantasy names. The mythic roster premise ("gods, monsters, and mortal
champions") already covers them.

## Design rules

- **12 recruits, 2 per class** (Archer, Warrior, Tank, Mage, Assassin, Support).
  Pool grows 21 → 33, crossing the ~30 threshold noted for pity re-enable.
- **Tier `D`** for all recruits (display-only field; the summon-reveal glow
  checks `S`/`A` only, so recruits correctly get no glow). They sit below the
  existing D-tier mythic heroes in power.
- **Stats ≈ 20–25 % below the weakest existing class member**, cheaper deploy
  cost. Recruits are early-game bodies and duplicate fodder, never a pull goal.
- **Abilities reuse the six existing basic abilities** and **existing ultimate
  variants** — no new combat code.
- **No featured rotation membership.** They enter the pool as weight-1 commons.
- Ids are `recruit-*` so they can never collide with database hero ids, and no
  file under `src/data/heroes/` is touched (standing rule).

## Roster

Base stats for `gameBalance.json`. DPS figures are atk × aps for comparison with
the weakest current class member (in parentheses).

| ID | Name (display) | Class | Slot | Range | ATK | APS | DPS | HP | Armor | MR | Crit | Ult CD | Ult pow | Cost | Ability | Ult variant |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `recruit-bram` | Bram | Tank | road | 60 | 15 | 1.50 | 23 (31) | 1050 | 260 | 160 | 0 | 22.5 | 0.9 | 85 | taunt | shield_wall |
| `recruit-tilda` | Tilda | Tank | road | 60 | 14 | 1.40 | 20 (31) | 1120 | 240 | 150 | 0 | 22.5 | 0.9 | 90 | taunt | mass_taunt |
| `recruit-kellan` | Kellan | Warrior | road | 70 | 30 | 1.30 | 39 (59) | 700 | 120 | 90 | 0.06 | 22.5 | 0.9 | 90 | cleave | war_cry |
| `recruit-sable` | Sable | Warrior | road | 70 | 28 | 1.35 | 38 (59) | 730 | 110 | 80 | 0.06 | 22.5 | 0.9 | 95 | cleave | knockback |
| `recruit-ash` | Ash | Assassin | road | 90 | 32 | 0.85 | 27 (30) | 450 | 90 | 100 | 0.06 | 15 | 0.9 | 70 | execute | rapid_strike |
| `recruit-nyra` | Nyra | Assassin | road | 90 | 30 | 0.90 | 27 (30) | 470 | 85 | 95 | 0.06 | 15 | 0.9 | 75 | execute | claw_sweep |
| `recruit-elm` | Elm | Mage | platform | 160 | 36 | 0.50 | 18 (23) | 330 | 50 | 70 | 0.1 | 18 | 0.9 | 95 | nuke | weaken_burst |
| `recruit-ives` | Ives | Mage | platform | 160 | 34 | 0.52 | 18 (23) | 350 | 45 | 65 | 0.1 | 18 | 0.9 | 100 | nuke | rebirth_flame |
| `recruit-wren` | Wren | Archer | platform | 210 | 55 | 0.55 | 30 (40) | 320 | 30 | 40 | 0.2 | 18 | 0.9 | 90 | volley | moon_barrage |
| `recruit-hollis` | Hollis | Archer | platform | 210 | 52 | 0.58 | 30 (40) | 340 | 25 | 35 | 0.2 | 18 | 0.9 | 95 | volley | piercing_shot |
| `recruit-poppy` | Poppy | Support | platform | 170 | 28 | 0.50 | 14 (18) | 350 | 100 | 130 | 0.04 | 25 | 0.9 | 70 | aura | fortune_shower |
| `recruit-jory` | Jory | Support | platform | 170 | 26 | 0.52 | 14 (18) | 370 | 95 | 125 | 0.04 | 25 | 0.9 | 75 | aura | fate_link |

`synergies`: none (empty array) — recruits have no bond memberships.

### Display text (`tdSkinMythic.json` entries)

Skin test requires the display name to differ from the `gameBalance.json` name,
so the balance rows carry `Recruit {Name}` and the skin carries the short name.

| ID | skin `name` | `title` | `skillName` (ultimate) |
|---|---|---|---|
| `recruit-bram` | Bram | Shield of the Watch | Hold the Gate |
| `recruit-tilda` | Tilda | Voice at the Barricade | Everyone Behind Me |
| `recruit-kellan` | Kellan | Sword for Hire | Rallying Swing |
| `recruit-sable` | Sable | The Crossing's Bouncer | Not One Step |
| `recruit-ash` | Ash | Quiet Blade | Three Quick Debts |
| `recruit-nyra` | Nyra | Alley Tactics | Sweep the Dark |
| `recruit-elm` | Elm | Hedge Mage | Find the Seam |
| `recruit-ives` | Ives | Self-Taught | Back to the Forge |
| `recruit-wren` | Wren | Bow of the Militia | Volley at Will |
| `recruit-hollis` | Hollis | Fletcher's Eye | Straight Through |
| `recruit-poppy` | Poppy | Field Medic | Shares for All |
| `recruit-jory` | Jory | The Unlikeliest Chaplain | One More Breath |

## Assets (skin test requires real files per hero)

`scripts/test-td-skin.mjs` asserts per-id files exist:
`public/td/heroes-alt/{id}-{thumb-96,card-240,token-192}.webp`, a 24-frame idle
anim `{id}-idle-v1.webp`, and `public/td/sfx/mythic-{id}-v4_{attack,ultimate}.ogg`.

Proposal for generics, one script run (`scripts/td-recruit-assets.py`, Pillow):

1. **Art:** class silhouette/glyph on a muted class-colored background, rendered
   at 96/240/192 px; the idle anim reuses the card frame 24× (static loop is
   legal — the test only checks the file exists and `frames: 24`). Class colors
   follow the existing gold/violet palette; recruits get a desaturated variant
   so they read as "common" next to mythic art.
2. **Sounds:** copy the class-appropriate existing mythic attack/ultimate ogg
   (e.g. a tank's files for Bram/Tilda) to the recruit file names; add a
   `CREDITS-recruits.txt` noting the reuse. No new audio production.
3. If real art arrives later, only the files are replaced — ids and stats stay.

## Integration checklist

1. `src/data/gameBalance.json`: append the 12 rows above.
2. `src/data/gameBalance.tuning.json`: add `heroSkills` entries per recruit with
   the listed `variant` (copy the block of the variant's donor hero, adjust
   nothing else; `skinTuning` only swaps `skillName`).
3. `src/data/tdSkinMythic.json`: add the 12 display entries.
4. Run the asset script; verify `public/td/heroes-alt/` and `public/td/sfx/`.
5. Tests: `test-td-skin`, `test-td-summon`, `test-td-campaign`,
   `test:tower-defense`, then `td:upgrade-sweep` and `td:economy`.
6. Update `TOWER_DEFENSE_SPEC.md` (pool composition, featured-chance example)
   and `TOWER_DEFENSE_ROADMAP.md` (this milestone, pity re-evaluation).

## Expected balance impact (measure, then document)

- **Featured chance** drops from 5/25 ≈ 20 % (N=21) to 5/37 ≈ 13.5 % (N=33).
  The UI computes it from the rules function, so no stale display.
- **New heroes per 600-seal x10** drops (more commons) — re-run
  `td:upgrade-sweep`; the SPEC's "about 4 new heroes and 6 copies" line must be
  re-measured and updated.
- **Campaign sweeps** (`test-td-campaign`) draw squads from the roster; win
  rates may shift slightly because recruits are weaker picks. Starters are
  fixed, so early stages should be stable; record before/after numbers.
- **Dust economy** improves: more duplicates per x10 → more dust → the
  dust→copies exchange (100 dust/copy) gets more traffic. Watch whether dust
  income outpaces the sinks; `dust.perCopy` 30 is the knob.
- **Pity:** keep `pityNewInMulti: false` for the first batch. Re-evaluate after
  the sweep numbers are in; with 33 heroes a guaranteed new hero per x10 still
  completes the collection in ~33 multis, so the owner may want batch 2
  (another 6–12 recruits) before enabling it.

## Open questions for the owner

1. 12 recruits (pool 33) or straight to 18 (pool 39)? Proposal starts with 12.
2. Names/titles: keep the generated set above or adjust to taste.
3. Placeholder art acceptable for now, or wait for real recruit art?
