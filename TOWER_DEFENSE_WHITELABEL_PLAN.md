# Tower Defense: White-Label Hero Plan

Status: planning only. Nothing in this document has been implemented — no
image was generated, no file on R2 was replaced, no JSON or code was
changed. This is the checklist and the per-hero brief to work from when
the user decides to execute.

Goal: replace every trace of "Motto Immortal" specific character
expression in the TD minigame — portrait art, board token, bio text,
ability names and flavor — with an original take on a real, public-domain
Greek or Norse mythological figure, while keeping the TD mechanics,
balance numbers, hero `id`s, classes, and file paths untouched. The 21
internal ids stay as they are (`zeus`, `nuwa`, `set`, ...); only what a
player sees changes.

## 1. What actually needs to change, and what doesn't

| Surface | File / location | Carries game IP today? | Action |
|---|---|---|---|
| Hero portrait (card, detail page, TD token source) | R2 `heroes/{id}.webp`, referenced from `src/data/heroes/{id}.json` | Yes — real extracted game render | Replace the R2 object in place. No JSON edit needed; the URL stays the same. |
| Board token (`public/td/tokens/{id}-v1.webp`) | derived by `scripts/build-td-tokens.mjs` from the portrait above | Yes, derivative of the portrait | Re-run the build script after the portrait swap. No manual edit. |
| Idle animation preview (recruit screen) | `public/td/anims/{id}-idle-v1.webp` + `src/data/tdHeroAnims.json`, sourced from extracted Spine rigs via `scripts/td-spine/` | Yes — actual game animation rig, the highest-risk asset of the three | Drop it for swapped heroes. The code already hides the preview cleanly when `tdHeroAnims.json` has no entry (`recruit.ts`: `previewEl.hidden = !anim`). No code change required to do this — just don't ship an entry for the new figure. A from-scratch replacement (simple CSS sway on the static portrait, or a handful of independently generated frames) is a later, optional nice-to-have, never a re-skin of the extracted rig. |
| Skill/relic icons (`skills/{id}_skill_1..4.webp`, `skills/{id}_relic.webp`) | R2, referenced from the same hero JSON | Likely yes, out of scope for the TD minigame (TD abilities are original class archetypes, not shown from these files in `src/game/td/`) | No action needed for the TD swap; flag for the rest of the fan database separately if it ever comes up. |
| Hero bio text | `src/data/heroes/{id}.json` → `description` | Yes, paraphrased/borrowed game copy | Out of scope for this pass per the user's instruction (no JSON edits). Drafted below anyway so it's ready whenever JSON edits are back on the table. |
| TD ability names ("Rogue Wave", "Frenzied Sand Whirl", "Petrifying Gaze", ...) | `TOWER_DEFENSE_HERO_SKILLS.md`, `src/game/td/page/popover.ts` (`AWAKEN_TEXT`), hero-fx labels | Yes — these are the real in-game skill names, quoted directly as "In-game reference" | Rename per the table below. This doc is a **plan**, not the rewrite itself; the actual file edits are a separate, later step once the user says go. |
| Invented game-only labels (faction `"Starglint"`, tier `"Divine V"`, boss titles `"Ishtar IV"`) | hero/boss JSON | Yes, these are Motto Immortal's own coinages, not mythology | Never reuse these for the replacement figures, regardless of whether the figure's name itself changes. |
| Hero name / id itself | — | No | Confirmed in the previous discussion: real mythological names are not copyrightable. Keeping `zeus` as the internal id while showing "Odin" on screen is also fine — the id is invisible to players. |

## 2. Execution order, once the user says go (not done yet)

1. Generate the portrait art for one hero, spot-check it through `build-td-tokens.mjs --only <id>` to confirm the auto-crop finds the head cleanly (add an entry to `src/data/tdTokenCrops.json` only if it doesn't — confirm with the user first whether that crop-helper file counts as "database" for them).
2. Repeat for all 21, upload each to R2 at the existing `heroes/{id}.webp` key (overwrite in place; the pipeline's own cache in `.cache/td-token-src/` needs clearing per id so it re-fetches).
3. Rebuild all tokens: `node scripts/build-td-tokens.mjs`.
4. Remove the swapped ids from `src/data/tdHeroAnims.json` if they're in there today (or simply never add them) so the recruit screen falls back to the static portrait.
5. Only after the art is approved: revisit hero bio text and `TOWER_DEFENSE_HERO_SKILLS.md` naming as a separate, explicitly-requested step.

## 3. Per-hero brief

Shared style block for every image prompt (write once, reuse):

```
Style: painterly fantasy illustration, digital painting, dramatic rim
lighting, full-body dynamic pose, facing right, plain transparent or
neutral background, strong readable silhouette, mythologically grounded
proportions and age (not androgynous idol-style youth). High detail,
rich but limited color palette per character.

Avoid: glossy 3D CGI render look, porcelain-smooth anime-bishonen faces,
ornate gold filigree crown fused into hair, gemstone-cluster jewelry on
face/collar, pastel jewel-tone color-coding, East-Asian ornamental motifs
on Greek/Norse figures, teen-idol proportions.
```

Each entry below: current id and class (unchanged) → new figure → image
prompt addition → a fresh bio draft (for later, not applied now) → new
ability names with one-line flavor for basic attack and ultimate,
replacing the "In-game reference" line in `TOWER_DEFENSE_HERO_SKILLS.md`.
The mechanic itself (numbers, timing, targeting) does not change — only
the name and the flavor sentence describing it.

---

### amunra → Helios (Warrior)
- **Image:** Mature radiant sun titan, bronze skin, short curled golden hair, solar-flare halo, short battle-spear wreathed in flame, muscular build, orange-and-bronze palette.
- **Bio draft:** "Helios drives the sun's chariot across the sky each day, and no shadow escapes his sight. When he steps onto the battlefield, he brings the sun down to the front line with him."
- **Basic attack — Solar Lance:** a warm-glowing spear thrust; every third hit releases a small sun-disc pulse that weakens nearby enemies' attack.
- **Ultimate — Chariot's Dawn:** Helios rises briefly and fires three solar spears in sequence at the nearest enemies in range, each dealing area damage and refreshing the attack-reduction pulse.

### anubis → Thanatos (Assassin)
- **Image:** Gaunt winged death-spirit, dark grey skin, black feathered wings folded tight, curved twin daggers, deep charcoal-and-violet palette, hood shadowing the upper face.
- **Bio draft:** "Thanatos comes for every mortal in the end, gently or otherwise. On the road, he chooses which one first."
- **Basic attack — Twin Reaping:** fast double-hit with two small daggers.
- **Ultimate — Marked for the Ferry:** Thanatos vanishes and strikes the strongest enemy in range with a 4-hit combo, ending in a 2 s stun.

### artemis → Atalanta (Archer)
- **Image:** Athletic mortal huntress, short practical braid, leather-and-bronze hunting gear, recurve bow drawn, wolf-pelt cloak, forest green-and-bronze palette.
- **Bio draft:** "Atalanta outran every suitor and outshot every hunter who challenged her. She never took a shot she couldn't land."
- **Basic attack — Piercing Shot:** shots pass through the first target and hit the enemy behind it for reduced damage.
- **Ultimate — Calydon's Volley:** for 8 s Atalanta fires a rapid piercing shot every 0.7 s at the most vulnerable enemy in range, briefly pinning each target.

### bastet → Hekate (Assassin)
- **Image:** Triple-aspect night sorceress, short curved blade or twin torches, dark hooded robe, crossroads-key motif, deep indigo-and-black palette.
- **Bio draft:** "Hekate walks where three roads meet, and she is never quite where you last saw her."
- **Basic attack — Crossroads Flurry:** quick melee hit; passively surrounded by two faint orbiting witch-lights that tick small damage to adjacent enemies.
- **Ultimate — Threefold Dance:** Hekate leaps to the densest enemy cluster in range, dealing landing damage, then spins for three rapid hits on all adjacent enemies before returning to her slot.

### caishen → Plutus (Support)
- **Image:** Robed wealth-god, veiled or half-lidded eyes, overflowing coin-horn staff, heavy brocade robe, warm gold-and-burgundy palette.
- **Bio draft:** "Plutus was blinded so he'd hand out his riches without favoring the deserving. He still finds his way to whoever needs it most."
- **Basic attack — Coin Cast:** a thrown gold coin with modest damage.
- **Ultimate — Boundless Horn:** Plutus releases his hoard: for 10 s, any ally in his range whose HP drops below 50% instantly receives a heal (per-ally cooldown applies).

### demeter → Gaia (Tank)
- **Image:** Colossal earth-mother, stone-and-root skin texture, wreathed in wheat and vines, braced wide stance, earthy brown-and-moss-green palette.
- **Bio draft:** "Gaia was here before the gods that came after her. Nothing that grows from the ground grows without her leave."
- **Basic attack — Root Strike:** melee hit with a 15% chance to root the target for 1 s.
- **Ultimate — World-Roots:** Gaia roots herself for 3 s: thorn vines erupt around her, restraining all enemies in her range while she heals per restrained enemy.

### diana → Skadi (Archer)
- **Image:** Norse mountain huntress, fur-lined winter gear, skis or snowshoes at her feet, longbow, pale blue-and-white palette, sharp cold expression.
- **Bio draft:** "Skadi chose the mountains over the sea and never once regretted it. She still hunts alone, and she still never misses."
- **Basic attack — Rime Volley:** every third attack is a 3-arrow quick combo at the same target.
- **Ultimate — Glacial Shockwave:** Skadi fires an icy shockwave in a straight line along the path she faces, damaging all enemies on that line and reducing their armor for 8 s.

### fengyi → Boreas (Mage)
- **Image:** Bearded elder north-wind god, wind-whipped grey robes, ice-crystal beard, staff of swirling frost, pale grey-and-icy-blue palette.
- **Bio draft:** "Boreas breathes and the harvest freezes on the stalk. He does not ask before the north wind turns."
- **Basic attack — Gale Spiral:** a narrow tornado projectile that damages all enemies in a straight line up to his range.
- **Ultimate — Boreal Surge:** Boreas consumes his accumulated gusts (one gained per wave cleared, up to 4) to unleash a large storm over the densest path area in range — damage scales with gusts stored.

### freya → Sif (Support)
- **Image:** Norse harvest goddess, long golden wheat-braided hair, simple woven gown, sheaf of grain or a healing charm in hand, warm gold-and-cream palette.
- **Bio draft:** "Sif's hair grows back gold no matter who cuts it. Where she walks, the field grows back too."
- **Basic attack — Wheat-Ear Dart:** a thrown grain-charm with a 10% chance to stun for 1 s.
- **Ultimate — Golden Harvest:** Sif channels for 8 s, releasing a healing wave every second that restores all allies in her range.

### horus → Vidar (Assassin)
- **Image:** Silent one-booted avenger god, a heavy iron-soled boot prominent, grim stoic face, dark iron-and-brown palette.
- **Bio draft:** "Vidar speaks less than any god and needs to speak least of all. When his moment comes, one boot is enough."
- **Basic attack — Silent Stride:** fast melee hit, +15% attack speed baseline.
- **Ultimate — Marked Reckoning:** Vidar marks the highest-threat enemy in range for 10 s: his attacks against it gain 100% crit chance and each strike reduces its armor by a small stacking amount.

### jormungandr → Fenrir (Warrior)
- **Image:** Monstrous chained wolf-warrior (humanoid/beast hybrid), a broken shackle on one wrist, bared fangs, matted dark grey fur, black-and-rust palette.
- **Bio draft:** "Fenrir was bound because the gods feared what he'd become. The chain only ever slowed him down."
- **Basic attack — Rending Bite:** melee hit that applies a short bleed (damage over 3 s, small stacks).
- **Ultimate — Broken Chain:** for the next 5 s Fenrir stores a share of all damage he takes, then releases it as a shockwave around him.

### medusa → Stheno (Archer)
- **Image:** Immortal gorgon sister, bronze scale-skin, living snake-hair, a bow of bone or bronze, bronze-and-dark-green palette, ferocity rather than a stone-gaze focus.
- **Bio draft:** "Stheno never learned to forgive the ones who wronged her sisters. She doesn't need a gaze to be dangerous."
- **Basic attack — Bronze Arrow:** a bow shot with a faint light trail and a small spark on impact.
- **Ultimate — Gorgon's Glare:** Stheno looks at up to 3 distinct enemies within her range and facing cone, prioritizing those furthest along the path; each takes one hit and is petrified for 3 s.

### momus → Heimdall (Tank)
- **Image:** Golden-toothed watchman god, a gleaming horn at his hip, broad braced stance, rainbow-sheen cloak, gold-and-white palette.
- **Bio draft:** "Heimdall hears the grass grow and sees a hundred leagues in every direction. Nothing gets past the bridge he guards."
- **Basic attack — Watchman's Jab:** quick melee hit; every third hit throws a small horn-blast that deals minor splash damage to adjacent enemies.
- **Ultimate — Gjallarhorn's Call:** Heimdall taunts nearby enemies, then sounds his horn to trigger three bursts in sequence down the path, each damaging and briefly knocking down enemies in a small radius.

### nuwa → Atlas (Tank)
- **Image:** Titan bracing a stone sky-vault on his shoulders, straining muscular back, cracked grey-stone skin, low wide stance, slate-grey-and-white palette.
- **Bio draft:** "Atlas lost a war and got the whole sky as a punishment. He's been holding it up ever since, and he isn't about to stop now."
- **Basic attack — Vault Strike:** a short melee blow with a small stagger chance (0.5 s stun on ~10% of hits).
- **Ultimate — Skybound Wall:** Atlas raises a stone shield wall across his road segment for 6 s: enemies touching it are slowed 40%, and Atlas gains a shield equal to a share of his max HP.

### nyx → Nótt (Assassin)
- **Image:** Norse night-goddess, dark cloak like a mare's mane, starfield-patterned robe, curved blade, deep black-and-silver palette.
- **Bio draft:** "Nótt rides the sky every night on her dark horse, and dawn only comes because her son rides after her."
- **Basic attack — Night Ride:** fast double-hit (two small damage ticks per attack).
- **Ultimate — Starless Passage:** Nótt vanishes and strikes the strongest enemy in her range with a 4-hit combo, ending in a 2 s stun.

### phoenix → Hephaistos (Mage)
- **Image:** Lame forge-god, soot-streaked muscular arms, a flaming hammer or tongs instead of a wand, leather forge-apron, ember orange-and-charcoal palette.
- **Bio draft:** "Hephaistos was thrown from Olympus and built his forge in the wound it left. Everything he makes still carries a little fire in it."
- **Basic attack — Ember Cast:** a ranged fire bolt that applies a small stacking burn (damage over time, max 3 stacks).
- **Ultimate — Forge-Fire Unbound:** Hephaistos sacrifices a share of his current HP and sends a molten firebird down the longest path line in his range, damaging every enemy it passes through.

### poseidon → Ægir (Warrior)
- **Image:** Jötunn sea-king, a kelp-and-barnacle beard, a heavy bronze trident-spear, a wave-crest crown carved from driftwood or coral (not gold filigree), deep teal-and-bronze palette.
- **Bio draft:** "Ægir brews ale for the gods in a cauldron a mile deep, and the sea itself answers when he's in a foul mood."
- **Basic attack — Trident Thrust:** every third attack is charged, dealing bonus damage in a small splash around the target.
- **Ultimate — Rogue Tide:** Ægir sends a tidal wave rolling backward along the path from his position: enemies caught take damage and are pushed back a fixed distance toward the entrance.

### prometheus → Ymir (Tank)
- **Image:** Primordial ice-giant, frost-cracked pale blue skin, a massive braced frame, rime-covered shoulders, pale blue-and-white palette.
- **Bio draft:** "Ymir was the first thing to exist, before there were gods to make anything else. Everything since has been built from what he left behind."
- **Basic attack — Frost Bulwark:** slow, hard melee hit with a brief frost crack on impact.
- **Ultimate — Primordial Resolve:** Ymir enters a braced state for 8 s: gains a shield, takes reduced damage, and emits a frost pulse every 2 s that damages all enemies in a short cone ahead of his facing.

### set → Surtr (Warrior)
- **Image:** Fire-giant of Muspelheim, black volcanic-glass skin, wreathed in flame, a massive flaming sword, red-and-black palette.
- **Bio draft:** "Surtr has been waiting at the border of the world since before it was finished, sword already burning."
- **Basic attack — Ashen Sweep:** hits the target plus one adjacent enemy for reduced damage.
- **Ultimate — Muspel's Wrath:** Surtr dashes forward along the path and back, striking all enemies he passes through three times in quick succession; the final pass deals heavy damage.

### yuelao → Aphrodite (Support)
- **Image:** Mature radiant love-goddess (not a teen-idol face), flowing chiton, a red thread or a dove in hand, warm rose-and-gold palette, serene confident expression.
- **Bio draft:** "Aphrodite ties two fates together with a single thread, and neither one ever quite manages to cut it loose."
- **Basic attack — Bound Thread:** a thin red thread projectile; modest damage, and her passive aura grants her two nearest allies a small shared-defense bonus.
- **Ultimate — Woven Fate:** Aphrodite sends six healing pulses in sequence to the most wounded allies in her range; allies connected by her thread are healed together.

### zeus → Odin (Mage)
- **Image:** One-eyed all-father, long grey beard, wide-brimmed traveler's hat, twin ravens on his shoulders, a carved runic spear, deep grey-and-storm-blue palette.
- **Bio draft:** "Odin traded an eye for wisdom and never once asked for it back. What he still has is worth more than what he gave up."
- **Basic attack — Rune Bolt:** a chain attack that nukes the primary target and bounces to two nearest others.
- **Ultimate — Gungnir's Reach:** (kept as Zeus's separate bespoke visual system today, `zeus-fx.js`; re-flavor as runic lightning arcing from Odin's spear rather than a classical thunderbolt, so it reads distinctly from the god of thunder himself.)

---

## 4. Open questions for the user before any execution step

1. Is `src/data/tdTokenCrops.json` (a pure crop-offset helper, no stats or IP text) acceptable to edit once new art needs a manual crop fix, or should that count as "no JSON changes" too?
2. Which image generation tool/workflow will produce the 21 portraits — Midjourney, a local Stable Diffusion setup, or something else? That decides how literally the prompt blocks above can be pasted in versus needing reformatting.
3. Zeus was flagged in `TOWER_DEFENSE_HERO_SKILLS.md` as "a separate test case by the user" with his own visual system (`zeus-fx.js`) — confirm whether he's in scope for this same swap pass or intentionally held back.
4. Timing: do the bio-text and ability-name rewrites happen in the same pass as the art swap, or strictly after the art is approved, as suggested in section 2?
