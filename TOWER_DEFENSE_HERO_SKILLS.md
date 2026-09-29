# Tower Defense: hero effect language

Updated for M24c (September 27, 2026) after the white-label swap to the mythic roster
(`TOWER_DEFENSE_MYTHIC_HEROES.md`, `src/data/tdSkinMythic.json`). Internal ids, stats and
combat variants did not change; only the presentation follows the new identities.

The earlier per-hero mechanic proposals in this file were written for the old identities
(Nuwa, Zeus, Caishen and so on) and are superseded by the mythic content pack. They remain
in git history.

## Rules

- **No straight line as damage.** Ranged attacks travel as a projectile (arrow, fragment,
  gust, coin, pulse) with a trail and land with an impact. Melee heroes show a weapon arc
  or an impact at the target; nothing is drawn across the gap. Chains are forked,
  re-struck lightning. Heals flow along a curve. Enemy archer shots are small travelling
  arrows, Hexer curses spiral in, Assassin dashes leave afterimages on a bent path.
- **Status is visible on the enemy.** Poison: green bubbles rise, swell and pop. Burn: flame
  tongues and embers. Chill: frost flakes drift down and the sprite turns pale blue. Wet:
  drips that splash at the feet. Frozen: a faceted ice shell with glints. The health bar
  pips stay as the static cue.
- **Timing is presentation only.** Effects run on game time: they pause with the game,
  speed up with game speed and finish their tails between waves. Ranged impacts wait for
  their projectile; combat has already resolved.
- **Budget.** Everything draws through one pooled sprite system and two shared Graphics
  (`src/game/td/fx-kit.js`, 900 sprites, 160 shapes). Status particles are optional spawns:
  they are skipped when the pool is busy and their interval stretches past 24 statused
  enemies. Measured: sim step plus draw at 41 to 53 statused enemies with every ultimate
  firing, median 0.9 to 1.5 ms and p95 about 3.5 ms of JavaScript per frame.
- **Reduced motion.** Particle counts drop to a quarter, nothing drifts, lightning does
  not fork or flicker, status particles are off (pips remain).

## Roster

| Hero (id) | Class | Basic attack | Status | Ultimate |
|---|---|---|---|---|
| Atlas (`nuwa`) | Tank | Heavy downward arc, dust ring, rock chips | none | Sky vault lifts over him with stars, ground shockwaves; golden motes on healed allies |
| Ymir (`prometheus`) | Tank | Frost crescent, flying ice shards | Burn (flames on enemies) | Jagged fault cracks race out, ice spikes erupt at their ends, frost mist |
| Heimdall (`momus`) | Tank | Clean gold arc and a white glint | none | Horn blast: five bridge-coloured sound waves in his facing, wide warning ring |
| Gaia (`demeter`) | Tank | Earth bursts up under the target, dust, a leaf | none | Ring of stone spikes rises, leaves spiral in to heal her |
| Aegir (`poseidon`) | Warrior | Water crescent with spray | Wet (drips) | Three rolling wave crests travel forward with spray |
| Helios (`amunra`) | Warrior | White-hot gold arc, sun twinkle | none | Sun disc with turning rays, a cone of noon light, flare on the target |
| Surtr (`set`) | Warrior | Flaming sword arc, rising embers | none | Three alternating sweeps of a burning sword, flame pillars, embers flow back to him |
| Fenrir (`jormungandr`) | Warrior | Fangs snap shut on the target, venom drips | Poison (bubbles) | Great jaw closes, venom ring and bubbles, a short howl ring |
| Nott (`nyx`) | Assassin | Night crescent and a star | none | Darkness gathers on the target, four crescent cuts, scattered stars |
| Hecate (`bastet`) | Assassin | Three short cuts, one per road, torch flicker | none | Three torches circle the crossroads, three large cuts, splash ring |
| Vidar (`horus`) | Assassin | Single precise thrust glint | none | Crossed strikes and a heavy stomp with debris (each ultimate hit also lands a thrust) |
| Thanatos (`anubis`) | Assassin | Pale breath and falling black feathers | none | Dark scythe sweep with a pale edge, soul wisps rise, slow breathing rings |
| Odin (`zeus`) | Mage | Forked runic lightning, re-struck 20 times a second, sparks and a rune at impact | none | Rune circle turns under the target, five bolts fall from the sky |
| Hephaestus (`phoenix`) | Mage | Lobbed molten fragment with ember trail, anvil sparks | Burn | Hammer lands: molten rings, spark fountain, flame pillars |
| Boreas (`fengyi`) | Mage | Three shards spiral in a gust, snow burst | none | Snow vortex spins up and climbs, inward frost rings |
| Skadi (`diana`) | Archer | Pale arrow with frost trail, ice glint | none | Hunt mark over her, frost ring under the volley; buffed allies get white twinkles |
| Atalanta (`artemis`) | Archer | Fast arrow, green streak, leaves | none | Charged arrow flies the full pierce line with wind rings and torn leaves |
| Stheno (`medusa`) | Archer | Venom arrow dripping poison, splash with bubbles | Poison | Serpent eyes flare, grey motes snake to each gazed enemy, stone burst |
| Plutus (`caishen`) | Support | Spinning coin | none | Coin fountain and a gold ring; coins rain on healed allies |
| Harmonia (`yuelao`) | Support | Pulse with two harmonising motes, chord rings | none | Two interlocking rings widen, notes rise |
| Asclepius (`freya`) | Support | Staff pulse with a twin-serpent helix | none | Twin serpents climb the staff, two heartbeat rings, rising crosses |

Support heal actions flow to the ally along a curve: coins (Plutus), notes (Harmonia),
a serpent helix of motes (Asclepius). Warrior cleaves draw a crescent around the target in
the hero's element; Mage splashes draw a ring at the real splash radius. Tank class
ultimates keep the existing hold circle, which marks the real stop radius.

Mage Arc path bounces use Odin's lightning for every Mage.

### Recruits and support auras (September 29, 2026)

The 12 recruits have their own `PROFILES` entry (plain mortal colours: steel, bronze,
leather, hedge green, candle gold) with a `kind` field. Heroes without a hand-made entry
fall back to class builders in `hero-fx.js` (`CLASS_MELEE`, `CLASS_SHOTS`,
`CLASS_IMPACTS`, `CLASS_ULTS`), humbler than the named heroes:

| Class | Attack | Ultimate |
|-------|--------|----------|
| Tank (Bram, Tilda) | Short heavy shield bash, dust ring | Shield dome over the hero, ground ring, rock chips |
| Warrior (Kellan, Sable) | Steel arc with sparks | Two wide sweeps, dust ring, sparks |
| Assassin (Ash, Nyra) | Two quick dagger cuts, smoke puff | Three crossed cuts inside a smoke cloud |
| Mage (Elm, Ives) | Arcane orb on a light arc (Ives: ember trail) | Charged orb lands and bursts at the splash radius |
| Archer (Wren, Hollis) | Plain arrow with a short streak | Five arrows fall around the target |
| Support (Poppy, Jory) | Soft pulse with one helper mote; heals flow as crosses (Poppy) or motes (Jory) | Widening rings and rising motes over the hero |

Support passive aura (`render.js` `updateAuraFx`): every hero with the `aura` ability
has a pulsing underglow and ring in its profile colour, plus a slow wave that runs out to
the aura's real edge (its range) every 2.8 s. Allies inside an aura (`supportAuraFor`)
carry a faint rim at their feet in the support's colour; allies under a timed ult buff
(`buffUntil`) get a brighter, faster gold rim. Reduced motion: static glow and a faint
fixed range ring. Presentation only.

## Files

- `src/game/td/fx-kit.js`: canvas-painted white textures (glow, ember, streak, bubble,
  ring, drop, flame, flake, shard, coin, leaf, feather, note, plus, rock, twinkle, arrow,
  fragment, fang, three runes), the particle pool (velocity, gravity, drag, bezier paths
  with helix, trails, end callbacks) and shape helpers (bolt, crescent, ring).
- `src/game/td/hero-fx.js`: `PROFILES` (name, colour, accent) and the per-hero melee,
  projectile, impact and ultimate builders.
- `src/game/td/zeus-fx.js`: Odin's lightning, with the CC0 strips in `public/td/fx/zeus`.
- `src/game/td/status-fx.js`: status particles on enemies.
- `src/game/td/render.js`: wiring, the ice shell and chill tint, travelling enemy shots,
  curses, dash afterimages and heal flows for effects without a hero profile.

No new image files: all new textures are painted at runtime, so nothing was uploaded to R2.

## Open points

- Ymir: resolved September 27, 2026 (Chill instead of Burn).
- Tank hold circles from several tanks at once are large filled areas; they could be
  toned down if they crowd the board.
