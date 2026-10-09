# Tower Defense: Hero Talents (G5) - concept

Written October 9, 2026. Status: **approved by owner, T1 to T5 effects done (data, save, logic, Tier I and Tier II battle effects, UI); cues, balance pass and icons open**. Source idea: G5 in
[TOWER_DEFENSE_GAMEPLAY_IDEAS.md](../TOWER_DEFENSE_GAMEPLAY_IDEAS.md). All numbers are first guesses.

Owner decisions (October 9, 2026): unlock after Chapter 4; prices as proposed; switching never free;
common recruits get no talents; all 22 signature pairs; UI must fit the home screen (War Camp),
be mobile-first with small, clear design elements, and use PixelLab for every icon.

## 1. Why

From Chapter 4 on, the board asks new questions (Elites, board events, themed rules), but the
squad answers them the same way it did in Chapter 1: every upgrade a hero gets after that point
is a bigger number (levels, stars, Evolution, skill ranks). A hero never plays differently. Talents
add the missing layer: at two points in a hero's growth the player picks **one of two talents that
change how the hero behaves**. The same Archer can become a line-piercer for a straight road or a
two-target shooter for a crowded fork; the same Tank can hold a fourth enemy or punish every hit.

Goals:
- Late-game squad decisions: "which version of this hero does this stage need?"
- Reasons to replay a stage with a different setup (third laurel, Heroic).
- Side-grades, not power creep: A and B in a slot are worth about the same; a talent is never
  required to clear a stage.
- Readable: one sentence per talent, visible on the board and in the squad screen.

Non-goals: a skill tree, random rolls, talent currencies of their own, in-battle picks (nothing is
picked during a battle since October 5).

## 2. The rules in one page

- Each hero has **two talent slots**:
  - **Tier I, class talent**: two choices shared by the hero's class (12 talents for 6 classes).
  - **Tier II, signature talent**: two choices that change the hero's own ultimate (one pair per
    mythic hero and Isis, 44 talents).
- **Unlock** (owner, changed October 9, 2026): Tier I opens after clearing **Chapter 4** at **Level 20**
  (needs 1 star). Tier II opens after clearing **Chapter 8** at **Level 40** (needs 3 stars), so a new hero
  must still be grown before it changes shape.
- **Cost** (owner): unlocking a slot is a one-time price per hero (Tier I: 1,000 Gold and 30 Seal
  Dust; Tier II: 3,000 Gold and 150 Seal Dust).
- **Switching** (owner: never free): changing a chosen talent costs Gold, Tier I 200, Tier II 500
  (my number, owner to confirm). Switching only between battles; a deployed hero keeps its talent.
- **Recruits** (common rarity, `recruit-*`): no talents at all, neither tier (owner).
- **Scope** (owner): all 22 signature pairs, not a prototype subset.
- Talents are collection stats like levels and stars: they apply in every mode where the hero
  plays at collection strength (Campaign, Heroic, Expedition, Daily Trial for owned heroes).
- The talent is fixed for the battle; a redeployed hero keeps it.
- Eligible heroes: rarity epic, legendary or lord (22 heroes incl. Isis); the 12 recruits are excluded.

## 3. Tier I: class talents

| Class | A | B |
|---|---|---|
| Tank | **Iron Wall**: holds 4 enemies instead of 3; its attacks deal 30% less damage. | **Thorns**: enemies that hit it take 25% of the damage back. |
| Warrior | **Whirlwind**: the cleave strikes every enemy in its pattern for 50% (instead of up to 5 for 70%). | **Duelist**: no cleave; +50% damage to the enemy it holds, +100% against Elites and bosses. |
| Assassin | **Stalker**: dash reach +50%; always hunts enemies nobody holds, runners first. | **Executioner**: its hits finish ground enemies (not bosses) below 12% health. |
| Mage | **Focus Lens**: no splash; +35% damage to the main target (chain bounces stay). | **Wildfire**: splash radius +50%, splash share 35% -> 25%. |
| Archer | **Piercing Shot**: each arrow flies on through its target and hits up to 2 more enemies in line for 60%. | **Multishot**: shoots 2 targets at once for 65% each. |
| Support | **Warden**: healing beyond full health becomes a barrier for 6 s (up to 20% of max health). | **War Hymn**: heals 40% less; its attack aura is 60% stronger. |

Each pair answers a different board: Iron Wall for a single long choke, Thorns against swarms;
Whirlwind for groups, Duelist for Elites and bosses; Piercing Shot for straight roads, Multishot for
forks and two gates.

## 4. Tier II: signature talents (first drafts)

Every pair changes the hero's ultimate in two directions. Drafts for the owner to cut or rename;
numbers come with the build.

| Hero | Ultimate | A | B |
|---|---|---|---|
| Atlas | Celestial Bulwark | **Sky Pillar**: the wall holds 2 more enemies. | **World's Weight**: allies in his pattern also get the shield. |
| Ymir | Titan's Expose | **Frost Expose**: exposed enemies are Chilled. | **Giant's Reach**: expose covers a wider area, shorter duration. |
| Heimdall | Bifrost Ward | **Rainbow Bridge**: the ward also covers neighbouring allies at half strength. | **Gjallarhorn**: when the ward ends it bursts and stuns enemies around him. |
| Aegir | Tidal Surge | **Undertow**: weaker knockback, enemies are Wet and slowed. | **Rogue Wave**: knockback twice as far, fewer targets. |
| Helios | Solar Rush | **Zenith**: the rush window lasts longer. | **Blinding Noon**: struck enemies deal 30% less damage for a few seconds. |
| Surtr | Crimson Cleave | **Blood Pact**: the lifesteal also heals neighbouring allies. | **Ragnarok**: the cleave leaves burning ground. |
| Fenrir | Venom Coil | **Lock Jaw**: the bitten target is held in place (stun). | **Pack Howl**: neighbouring allies attack faster for a few seconds. |
| Nott | Shadow Step | **Eclipse**: the veil after her ultimate lasts 6 s instead of 3 s (the class veil already exists). | **Twin Stars**: the step strikes two enemies. |
| Hecate | Claw Sweep | **Three Roads**: the sweep reaches every tile around her. | **Torchlight**: the sweep leaves fire that burns. |
| Vidar | Flurry | **Silent Fury**: more strikes, each weaker. | **Vengeance**: the flurry grows stronger the more health he is missing. |
| Thanatos | Featherfall Judgment | **Reaper**: the judgment finishes enemies below 15% health. | **Soul Harvest**: every kill during the ultimate refunds charge. |
| Odin | Chain Lightning | **Storm Lord**: two more bolts. | **Rune Mark**: the struck target takes 20% more damage from everyone for 6 s. |
| Hephaestus | Molten Ground | **Forge Bed**: the molten area lasts longer and is wider. | **Hammerfall**: one heavy blow instead of the pool, with a short stun. |
| Boreas | Ice Shockwave | **Deep Freeze**: the shockwave freezes. | **Northwind**: the shockwave pushes enemies back one tile. |
| Isis | Sun Beam | **Long Noon**: the beam lasts longer. | **Twin Beam**: the beam fires both ways. |
| Skadi | Moon Barrage | **Hunt Mark**: the barrage focuses one target. | **Wide Barrage**: more targets, less damage each. |
| Atalanta | Limitless Shots | **Endless Quiver**: the window lasts 2 s longer. | **Wind Step**: every shot in the window slows its target. |
| Stheno | Petrifying Gaze | **Stone Stare**: one target, longer petrify, works on Elites. | **Coiled Gaze**: more targets, shorter petrify. |
| Plutus | Fortune Shower | **Golden Tithe**: more Nectar, less healing. | **Midas Touch**: more healing, no Nectar. |
| Asclepius | Valkyrie's Call | **Second Life**: once per stage, a fallen ally returns at 30% health. | **Serpent Rod**: the heal turns into healing over time for the whole squad. |
| Harmonia | Fate Link | **Shared Fate**: linked allies split damage taken. | **Harmony**: linked allies attack faster. |
| Gaia | Rooted Sanctuary | **Deep Roots**: stronger ward, she cannot be relocated while it holds. | **Overgrowth**: the sanctuary also roots enemies in her pattern. |

## 5. UI concept

Reference: the War Camp home screen (`TdHome.astro`, `.td-camp-home-*` in `td.css`). Its patterns
carry over: emblem medallions with Pixel art, a gold glow on the selected item, small corner badges,
the dark scene behind floating controls, one dominant idea per screen.

**Principles (from `design-system/STYLE_GUIDELINES.md`):** mobile is designed first (narrow layout
at up to 480 px, a 16 px gutter, no horizontal page scroll except the existing tab strip); tap
targets at least 44 px; labels always visible, no hover-only information; cards only where the
boundaries group something comparable (talent cards are comparable, so they are cards); colours
carry meaning only (gold = chosen or unlocked, grey = locked, the class colour on the class mark).

**Heroes screen, new "Talents" tab (after Skills).** The tab rail gets one more entry with a
Pixel-art icon (`td/ui/talents/tab-v1.webp`). Content, top to bottom:

```
+----------------------------------------+
|  Level 20  - Tier I  [Class talent]    |  <- status line, one sentence
|  [ Iron Wall      ]  [ Thorns        ] |  <- two talent cards, 50/50
|   holds 4 enemies     25% reflected    |
|   chosen: gold rim    locked: grey     |
|----------------------------------------|
|  Level 40 - Tier II  [Signature]       |
|  [ Sky Pillar     ]  [ World's Weight] |
|----------------------------------------|
|  Switch costs 200 Gold                 |  <- only when a choice is set
+----------------------------------------+
```

- Each talent card: icon (56 px, Pixel art, class-coloured frame), name (one line), one sentence
  of text, and a state: chosen (gold rim and a small check), available (dashed rim, price shown on
  the unlock button), locked (grey, requirement text "Level 20" or "Clear Chapter 4").
- The unlock button is the primary gold button of the screen (`.td-button--primary` pattern) with
  its price beside the Gold icon; switching is a secondary ghost button. Both 44 px tall.
- Locked rows never look clickable: no hover state until the requirement is met.
- Roster card: a small red dot as for level-ups, when a talent slot can be unlocked.

**Squad screen.** Each lineup slot (84 x 84) gets a small corner badge: a Pixel talent glyph for
Tier I, a second, gold glyph when Tier II is set. Tapping the slot already opens the hero, so no new
gesture is needed; the names appear in the hero flyout.

**Battle.** The selected-hero panel gets one line per talent (icon plus name, no text). Nothing
appears on the board except the talent's own effect cues.

**Glossary.** A "Talents" section under Heroes: per class the two Tier I talents as cards, then one
card per hero with its Tier II pair. Uses the glossary card pattern already there.

**Icons (PixelLab only, owner rule).** 56 talent icons plus the tab icon: `td/ui/talents/{id}-v1.webp`,
drawn at 32 px and stored at 64 px, the same pipeline as the currency and emblem icons. Until an
icon is on R2 the card shows the class glyph with an A or B letter.

**Motion.** Choosing a talent: the chosen card's gold rim fades in over 180 ms; no other movement.
Respect `prefers-reduced-motion`.

## 6. Data and code

- **`src/data/tdTalents.json`** (new): `unlock` (chapter, tier levels and prices), `class` (per
  class two talents: `id`, `name`, `text`, `effect`), `heroes` (per hero two talents). Effects are
  data where they are a number on an existing knob (`blockLimit`, `splash.radius`, `damageShare`,
  `heal`, `aura.bonus`), and a named rule where they need code (`thorns`, `execute`, `pierceLine`,
  `multishot`, `barrier`, ultimate variants).
- **Save:** `campaign.talents = { heroId: { I: "archer_pierce", II: "odin_rune_mark" } }` plus
  `talentUnlocks = { heroId: ["I", "II"] }`; `CAMPAIGN_SAVE_VERSION` 12, default empty, sanitized
  against `tdTalents.json` on load.
- **`campaign.js`:** `talentSlots(progress, hero)`, `unlockTalent`, `chooseTalent`, and
  `collectionHeroes()` adds `talents: ["archer_pierce", ...]` to the hero.
- **`talents.js`** (new, pure): `applyTalents(kit, hero)` returns the class kit with the data
  knobs changed (used by `sim.kit(hero)`), and `hasTalent(hero, rule)` for code paths.
- **`sim.js` hooks:** `damageHero` (Thorns reflect), `basicAttack` (Executioner, Piercing Shot line,
  Multishot second target, Duelist bonus, Focus Lens / Wildfire through the kit), `healHero`
  (Warden barrier as a hero shield), `findEnemyTarget` block limit (Iron Wall through the kit),
  `castUltimate` variants per signature talent.
- **Tests:** `scripts/test-td-talents.mjs`: save round trip and migration, unlock rules and costs,
  every Tier I effect in a minimal sim, collection heroes carry talents, a hero without talents
  plays exactly as today.
- **Balance:** `npm run td:sweep` with each talent forced on for its class (A versus B versus
  none); a talent pair is accepted when A and B stay within about 10% win rate of each other and
  neither beats "none" by more than about 15% on its home board.

## 7. Build plan

| Step | Content | Size |
|---|---|---|
| T1 | `tdTalents.json`, save version 12, unlock, choose and switch logic in `campaign.js`, tests (**done**, October 9, 2026) | S |
| T2 | Tier I class talents in the sim (12 effects) and `talents.js`, tests (**done**, October 9, 2026) | M |
| T3 | Heroes screen "Talents" tab, squad-slot badge, battle popover chips, glossary section (**done**, October 9, 2026; owner check on dev pending) | M |
| T4 | Tier II for one hero per class (Atlas, Surtr, Nott, Odin, Atalanta, Plutus), owner playtest (**built**, October 9, 2026; playtest pending) | M |
| T5 | Remaining Tier II talents (**effects built**, October 9, 2026), Effekseer cues and `td:sweep` balance pass (**open**) | L |
| T6 | PixelLab talent icons (owner pipeline), spec and glossary final | M |

T1 to T3 make the feature playable with class talents; T4 is the checkpoint where the owner decides
whether the signature tier is worth the remaining 32 effects.

## 8. Decisions (October 9, 2026)

1. Unlock after Chapter 4 (Tier I) and Chapter 8 (Tier II, changed October 9), plus Level 20 / Level 40 per hero.
2. Prices as proposed (one-time per slot).
3. Switching is never free: 200 Gold (Tier I), 500 Gold (Tier II). Owner to confirm the numbers.
4. Recruits (common) have no talents.
5. All 22 signature pairs are built, the step T4 checkpoint is kept only as a playtest point.
