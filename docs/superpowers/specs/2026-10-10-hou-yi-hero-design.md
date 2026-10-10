# Hou Yi Hero Design

Date: October 10, 2026
Status: approved conversational design; written specification awaiting owner review

## Purpose

Add Hou Yi as a complete playable Tower Defense hero. The result includes collection and combat
data, progression, two signature talents, player-facing copy, procedural combat effects, authored
Effekseer supplements, UI art, a separate animation-friendly character source, board animation,
and focused automated verification.

Hou Yi is a Legendary Archer who gives the roster a deliberate anti-Flyer specialist. His combat
identity is a nine-arrow ultimate that prefers Flyers, can distribute repeated arrows onto a small
number of targets, and turns focused single-target fire into his Evolution V payoff.

The implementation must preserve the approved backlog design. Numbers and rules in this document
are binding first-pass values; a later balance pass may propose changes but must not silently fold
them into the initial implementation.

## Scope and exclusions

In scope:

- one new playable hero with internal ID `houyi`;
- Legendary rarity, Archer class, Platform slot;
- `divine-guardians` and `wildborn` mythology memberships;
- the Crow-Feather Arrow basic presentation;
- the Ten in the Sky counter;
- the Nine Suns Fall ultimate and five skill ranks;
- The Last Sky Evolution V;
- Sun Hunter and Droughtbreaker signature talents;
- procedural and Effekseer visual specifications;
- one UI hero-art master and one separate animation-source master;
- derived card, thumbnail, token, splash, idle preview and board-figure assets;
- focused tests and the relevant Tower Defense validation suites.

Out of scope:

- changing the approved combat identity or tuning it before the first working implementation;
- audio generation or borrowed placeholder audio;
- a new mythology group, class, status or reaction;
- R2 upload, deployment or production build;
- changing unrelated Archer or campaign balance;
- reusing copyrighted game artwork as an image-generation reference.

## Player-facing identity

- **Name:** Hou Yi
- **Title:** Archer Beneath the Last Sun
- **Class:** Archer
- **Slot:** Platform
- **Rarity:** Legendary
- **Groups:** Divine Guardians, Wildborn
- **Damage:** Physical
- **Combat role:** Anti-Flyer, target prioritization and controlled multi-target burst
- **Basic:** Crow-Feather Arrow
- **Trait:** Ten in the Sky
- **Ultimate:** Nine Suns Fall
- **Evolution V:** The Last Sky
- **Tier-II talents:** Sun Hunter and Droughtbreaker

### Short collection description

The court archer who brought down the false suns watches the skies above the Last Crossing. Every
impossible target adds heat to his next volley; when nine suns answer the bowstring, nowhere in his
reach is safe.

This is original game copy. It is not a quotation or translation from another game.

## Base data

Hou Yi uses `diana` as a technical `statSource`. That mapping lends only normalized balance inputs;
it contributes no identity, text, art or combat mechanics.

The generated row uses:

| Field | Value |
|---|---|
| `id` | `houyi` |
| `class` | `Archer` |
| `slot` | `platform` |
| `range` | `210` |
| `ability` | `volley` |
| `damageType` | `physical` |
| `rarity` | `legendary` |
| `cost` | `22` Nectar |
| `ultCooldown` | `22` seconds before skill-rank modifiers |
| `mythologyGroups` | `["divine-guardians", "wildborn"]` |

The balance generator needs an authored rarity override for new TD identities whose selected
database source has a different generated rarity. The override is data, not a Hou-Yi-specific
branch. Existing rows must remain byte-for-byte stable apart from the appended Hou Yi row.

## Combat mechanics

### Basic — Crow-Feather Arrow

Hou Yi uses the standard Archer basic attack and target rules. The attack is physical, travels as
a visible arrow, and receives the existing Archer class bonus against Flyers. The presentation uses
a dark feathered arrow with a restrained red-gold streak; it does not add Burn.

### Trait — Ten in the Sky

- A successful Hou Yi basic-attack hit on a Flyer or Elite grants one `sunCounter`.
- The counter is stored on the deployed Hou Yi combat entity, starts at zero and caps at nine.
- Splash, pierce, Multishot and other secondary hits do not grant extra counters unless the basic
  attack's primary target is a Flyer or Elite.
- Each counter multiplies every damaging arrow of the next Nine Suns Fall by `1 + 0.04 * counters`.
- All counters are consumed when a valid ultimate cast begins.
- A cast with no valid target does not begin and does not consume counters.
- Selling, death and redeployment follow normal entity-state behavior; counters do not become a
  collection stat and do not transfer to a replacement entity.

The combat UI shows nine compact sun pips on Hou Yi's inspect/status presentation. Effects may
celebrate a newly filled pip, but the static UI remains authoritative when motion is reduced.

### Ultimate — Nine Suns Fall

At skill rank I, Hou Yi fires nine arrows. Each arrow deals 95% of the resolved ultimate attack
value before normal mitigation and the stored sun multiplier.

Target selection is deterministic:

1. collect living, targetable enemies inside Hou Yi's real attack pattern;
2. order Flyers first;
3. within each Flyer/non-Flyer partition, order by greatest path progress;
4. use stable entity order as the final tie-break;
5. give every selected enemy one arrow before assigning any repeated arrow;
6. continue round-robin through that ordered selection;
7. an enemy receives no more than three arrows in a normal cast.

The number of arrows may be lower than the rank's nominal arrow count when the three-arrow cap
cannot place more arrows. The implementation must not select enemies outside the real pattern to
fill the count.

Combat damage resolves immediately according to normal simulation rules. Presentation emits one
cast event and one arrow/impact phase per allocated arrow so animation timing cannot alter damage.

### Skill ranks

| Rank | Effect |
|---|---|
| I | Nine arrows, 95% ATK each |
| II | Each arrow deals 105% ATK |
| III | Maximum arrow count becomes ten |
| IV | Ultimate cooldown is reduced by 10% |
| V | Every Flyer hit is stunned for two seconds |

Rank V applies the two-second stun once per hit Flyer per cast. Repeated arrows refresh to the same
cast endpoint rather than chaining several two-second stuns.

The generic campaign `ultPower` rank bonus must not be added on top of this custom rank table.
Hou Yi's ultimate rank reads `campaignSkillLevels.ultimate` directly. Evolution bonuses that are
not the awakened-ultimate flag continue to use the common collection system.

### Evolution V — The Last Sky

When exactly one valid target exists at cast start:

- all nominal arrows are allocated to that target;
- the first three arrows use full arrow damage;
- the fourth and every later arrow use 45% of the current arrow damage;
- the normal three-arrow cap is ignored for this single-target case;
- sun counters multiply both full and reduced arrows;
- Flyer stun still resolves once for the cast, not once per arrow.

If two or more valid targets exist, normal distribution and the three-arrow cap apply.

## Talents

Hou Yi remains eligible for the two existing Archer class talents. His Tier-II pair is:

### Sun Hunter

- Flyers retain absolute first priority.
- Every enemy killed by an ultimate arrow queues one additional arrow.
- A bonus arrow uses the current skill-rank damage and stored sun multiplier.
- Bonus arrows follow the same deterministic target ordering and normal three-arrow cap.
- Up to nine bonus arrows may be created by one cast.
- If no legal allocation remains, the queued arrow is discarded.
- In The Last Sky's one-target case, bonus arrows use the 45% reduced share after the first three.

This safety limit prevents self-extending waves from turning into an unbounded simulation loop
without changing the approved talent identity.

### Droughtbreaker

- The cast fires at most five arrows, including rank-III's nominal increase.
- Every arrow creates a 55 px impact explosion centered on its assigned target.
- The explosion damages other valid enemies for 40% of that arrow's resolved direct damage.
- The directly struck target is excluded from its own explosion.
- Every directly struck target and explosion target receives Burn worth 40% of the damage that
  particular hit dealt over four seconds.
- Explosion damage cannot recursively create another explosion.
- The Last Sky may still place all five arrows on its sole target; no adjacent target means no
  explosion damage, while the direct target still receives Burn.

## Visual design

Hou Yi is a male mythic Chinese court archer, visually about 30–40 years old, calm and focused.
His design uses dark cinnabar red, lacquered black, antique gold and small jade accents. He carries
a broad ritual bow. A black solar-bird motif and nine small sun discs distinguish him from the
existing Greek and Norse Archers.

Avoid modern generic wuxia armor, Japanese elements, western longbows, giant shoulder armor,
European crowns and a fire-mage silhouette. Historical details are inspiration rather than a claim
that a single surviving portrait of the mythological figure exists.

### UI hero-art master

The UI master is a polished transparent full-body illustration in the visual realism of the current
mythic roster. Hou Yi stands in a dynamic three-quarter pose and draws his broad bow diagonally
upward. A white-gold arrowhead and nine restrained red sun discs supply the Legendary presentation.
The face, complete body, bow, hands and feet remain visible so the standard asset exporter can also
derive card, thumbnail, token and splash crops.

The UI master may contain controlled energy and dramatic cloth movement. It must contain no text,
logo, UI frame, floor, scenery or opaque background.

### Animation-source master

The animation source is a separate transparent full-body image of exactly the same person, face,
hair, clothing, palette, bow, quiver and body proportions.

Pose requirements:

- three-quarter view facing screen-right;
- both feet complete, separated and placed on the same ground line;
- stable, balanced stance with slightly bent knees;
- left hand holds the bow vertically beside the body;
- right hand remains visibly separated near, but not pulling, the string;
- both elbows, wrists and shoulders remain readable;
- the bow, string, quiver and limbs overlap as little as possible;
- no crossed legs, extreme foreshortening or hidden hand;
- short controlled cloth layers rather than long free-hanging ribbons.

It contains no drawn arrow energy, sun discs, glow, particles, ground shadow or scenery. The board
renderer supplies all projectiles and effects.

### Image-generation sequence

1. Generate only the UI master and present it for owner approval.
2. Do not derive runtime assets until that master is approved.
3. Use the approved UI master as an identity reference for the animation-source generation.
4. Present the animation source separately for approval.
5. Generate PixelLab animation only from the approved animation source.

Both masters are project assets and must be copied into a versioned Hou Yi artifact directory.
Generated outputs may not remain only in the image tool's private output directory.

## Board animation

The animation-source master produces these pure-character clips:

- `idle`, 8 frames: controlled breathing, tiny weight shift, bow remains vertical;
- `attack`, 8 frames: raises bow, draws one ordinary arrow to the right, releases and returns;
- `ultimate`, 12 frames: plants stance, raises bow, performs a strong ceremonial full draw angled
  slightly upward, releases once and returns.

The clips contain no projectile, impact, sunlight, discs, particles or attack trail. The weapon,
costume, anatomy and palette remain unchanged. PixelLab frame generation begins only after the
animation source is approved and a non-secret presence check confirms `PIXELLAB_API_KEY` exists.

## Combat effects and Effekseer

### Procedural baseline

The renderer must fully communicate the skill without authored atlases:

- sun-counter pips in UI;
- actual selected targets receive small static sun markers;
- arrows travel from Hou Yi's registered figure hand position to each target;
- every impact has a white-gold core with a narrow red rim;
- Flyer stun uses the existing stun/readability convention;
- Droughtbreaker shows the real 55 px explosion boundary and existing Burn cue.

Reduced Motion retains static target markers, direct arrow streaks and one impact flash. It removes
orbiting discs, drifting embers, repeated pulses and decorative motion.

### Authored supplement

The initial integration reuses `holy` for the impact supplement. A new `sun-arrow` atlas family is
created only if owner review finds that the procedural nine-arrow sequence lacks a distinct identity.
If created, it supplements rather than replaces projectile travel and real target geometry.

Proposed events:

- `ultHouYiMark`: selected-target marker;
- `ultHouYiArrow`: travelling arrow presentation metadata;
- `ultHouYiImpact`: direct hit;
- `ultHouYiDrought`: 55 px talent explosion;
- `houYiSunGain`: optional quiet counter-fill cue.

No visual event owns damage, targeting, counter consumption, stun or Burn timing.

## Data and code boundaries

Expected files:

- `src/data/gameBalance.tuning.json`: roster, stat source, rarity override and `nine_suns` values;
- `scripts/build-game-balance.mjs`: generic rarity-override support;
- `src/data/gameBalance.json`: regenerated derived hero row;
- `src/data/tdSkinMythic.json`: display identity, groups and asset metadata;
- `src/data/tdTalents.json`: Sun Hunter and Droughtbreaker;
- `src/game/td/sim.js`: counter, targeting, damage, awakening and talent mechanics;
- `src/game/td/skills.js`: player-facing skill, awakening and talent wording where applicable;
- `src/game/td/hero-fx.js`: profile, projectile, markers and procedural fallback;
- `src/game/td/authored-fx.js`: optional `holy` supplement and event routing;
- `src/game/td/assets.js`: board-figure registration after animation approval;
- `TOWER_DEFENSE_MYTHIC_HEROES.md`: mythic persona entry;
- focused Hou Yi tests plus updates to existing validation tests;
- versioned assets under `public/td/heroes-alt/` only after their source masters are approved.

The new targeting and arrow-allocation helpers should be small pure functions where practical. The
simulation owns rules; the renderer consumes emitted presentation facts and never reselects targets.

## Save compatibility and failure behavior

- Adding `houyi` to the roster requires no save-version bump. Existing saves simply do not own him.
- Missing progress fields use existing defaults: skill rank I, no Evolution V and no talents.
- Unknown or stale Hou Yi talent IDs are sanitized through the existing talent loader.
- Missing UI or figure assets fall back through existing skin/token behavior during development.
- Missing Effekseer atlases or a full FX pool leave procedural effects intact.
- A target dying between emitted presentation phases does not retarget damage; combat already resolved.
- Invalid targets at cast request prevent the cast and preserve charge and sun counters.

## Verification

Focused tests must demonstrate:

1. generated row is Legendary, physical Archer, Platform, cost 22 and has both groups;
2. no existing generated hero row changes when Hou Yi is added;
3. only primary basic hits on Flyers and Elites grant one counter, capped at nine;
4. the sun multiplier affects every ultimate arrow and counters are consumed exactly once;
5. target ordering is Flyer first, then path progress, with stable ties;
6. distinct enemies get one arrow before repeats and normal targets never exceed three arrows;
7. each skill rank changes only its approved parameter;
8. rank-V Flyer stun is one two-second status per cast;
9. The Last Sky allocates all arrows to one target with the approved three-full/rest-45% split;
10. Sun Hunter adds arrows on kills, respects allocation rules and stops at nine extras;
11. Droughtbreaker caps the cast at five, uses 55 px explosions and applies non-recursive Burn;
12. both Archer class talents still work with Hou Yi;
13. collection, summon, skin and mythology validators accept the new hero;
14. procedural FX work with authored atlases missing and with Reduced Motion enabled;
15. approved art exports contain alpha, complete feet and usable face/token crops;
16. board clips preserve identity, weapon and anatomy and contain no baked combat effects.

Run the focused Hou Yi tests during implementation, then the skin validator and relevant Tower
Defense suites. Do not run `npm run build`; repository policy reserves production builds for the
owner.

## Approval gates

1. Written specification approval.
2. Implementation-plan approval and execution choice.
3. Gameplay/data implementation review.
4. UI hero-art prompt review, generation and image approval.
5. Animation-source prompt review, generation and image approval.
6. PixelLab clip review.
7. Effekseer/procedural FX review.
8. Final integration and verification review.

No later gate is implied by approval of an earlier one.
