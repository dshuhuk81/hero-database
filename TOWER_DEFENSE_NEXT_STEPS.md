# Tower Defense Campaign --- Implementation Roadmap & Save System

## 1. Implementation Roadmap

The roadmap should be **risk-oriented**: build the smallest vertical
slice first, while defining the data model so later systems slot in
without rewriting Campaign.

## Build the loop before the systems

The first playable target should be:

**Campaign map → select stage → select heroes → play TD → win → receive
reward → next stage**

No gacha, duplicates, quests, rarity, pity, equipment, factions, daily
rewards, etc. yet.

If that loop isn't enjoyable, those systems won't fix it.

### Phase 0 --- Lock the architectural decisions

Before coding, define these once:

  Decision             Recommendation
  -------------------- ---------------------------------------------
  Hero identity        Same hero IDs/data as existing game
  Campaign ownership   Separate player save/progression
  Squad                `maxSquadSize`, initially 4
  Stage                Fully data-driven JSON
  Rewards              Generic reward objects
  Hero progression     Level + Rank, but Rank inactive initially
  Currency             Generic currency system, not hardcoded Gold

Avoid code such as `rewardGold = 500`.

Instead use a generic reward structure:

``` json
{
  "rewards": [
    { "type": "currency", "id": "gold", "amount": 500 },
    { "type": "currency", "id": "summon_seal", "amount": 50 },
    { "type": "material", "id": "hero_xp", "amount": 100 }
  ]
}
```

Even if V0 only understands Gold, the structure already supports
everything later.

------------------------------------------------------------------------

## Phase 1 --- Campaign MVP

### Goal: 3 playable levels

Build only:

**Campaign button → Campaign screen → Stage 1-1 / 1-2 / 1-3 → Battle**

A stage definition could contain:

``` json
{
  "id": "1-1",
  "chapter": 1,
  "stage": 1,
  "name": "First Defense",
  "mapId": "campaign_01",
  "squadSize": 4,
  "waves": "waves_1_1",
  "rewards": [],
  "unlockAfter": null
}
```

Progression:

``` text
1-1 → complete → unlock 1-2
1-2 → complete → unlock 1-3
```

Don't even build rewards yet.

**Test question:** Does playing a sequence of authored TD levels feel
meaningfully different from the existing mode?

------------------------------------------------------------------------

## Phase 2 --- Squad system

Add:

> **Choose 4 heroes before starting.**

Inside the level, only those heroes are available.

Don't implement ownership yet. For testing, pretend the player owns 6--8
heroes.

**Test question:** Does restricting the roster create interesting
decisions?

This is one of the most important Campaign assumptions to validate.

------------------------------------------------------------------------

## Phase 3 --- Player save

Create the permanent Campaign profile:

``` json
{
  "campaign": {
    "highestStage": "1-3",
    "completedStages": ["1-1", "1-2"],
    "currencies": {
      "gold": 0,
      "summon_seal": 0
    },
    "heroes": {}
  }
}
```

Keep static game data and player data strictly separate.

Static game data:

> Zeus exists.

Player data:

> This player owns Zeus, Lv12, Rank 2.

------------------------------------------------------------------------

## Phase 4 --- Hero ownership

Introduce the first collection mechanic.

Player starts with Heracles.

Example progression:

-   1-1 reward: Zaojun
-   1-2 reward: Meret
-   1-3 reward: Divine Seals

The squad selector can now distinguish owned and locked heroes.

Still **no gacha**.

------------------------------------------------------------------------

## Phase 5 --- Rewards

Make the generic reward system functional.

Initially add only:

-   **Gold** --- Hero upgrading
-   **Hero XP** --- Hero leveling
-   **Divine Seals** --- Future summoning

Now the meta-loop exists:

``` text
PLAY
 ↓
WIN
 ↓
REWARD
 ↓
ACCOUNT CHANGES
 ↓
PLAY NEXT STAGE
```

------------------------------------------------------------------------

## Phase 6 --- Hero leveling

Add simple hero progression:

``` text
Zeus
Lv. 1

ATK 120
HP 800

[LEVEL UP]
100 Gold
50 Hero XP
```

Initially:

> Level → stats

Do not yet build ascension, awakening, skill levels, equipment, rarity,
or duplicate upgrades.

------------------------------------------------------------------------

## Phase 7 --- Build 10-stage Chapter 1

Stop developing meta systems temporarily and build gameplay.

Create:

``` text
1-1
1-2
1-3
...
1-10 Boss
```

Introduce enemy mechanics progressively.

The target is roughly **30--60 minutes of playable Campaign**.

------------------------------------------------------------------------

## Phase 8 --- Summoning

Only after the collection loop works manually should gacha be
introduced.

Smallest version:

``` text
SUMMON

100 Divine Seals

[ SUMMON ]

        ↓

     ZEUS
```

Start with:

-   one banner
-   one currency
-   one summon button

Do not immediately build ten-pulls, elaborate animations, multiple
banners, pity systems, wishlists, etc.

First prove:

> Campaign → currency → summon → new hero → change squad → campaign

------------------------------------------------------------------------

## Phase 9 --- Duplicates

Summoning can now return an already-owned hero.

Player state can become:

``` json
{
  "heroId": "odin",
  "level": 12,
  "rank": 2,
  "copies": 1
}
```

Example:

``` text
Zeus ★★
1/2 copies until ★★★
```

Initially implement only Rank 1--3 to validate the mechanic.

------------------------------------------------------------------------

## Phase 10 --- Stars + milestones

Give players reasons to replay stages.

Example:

``` text
1-7

★★★

Complete
Lose ≤5 lives
Use ≤3 heroes
```

Chapter progress:

``` text
10 ★ → 500 Gold
20 ★ → 300 Divine Seals
30 ★ → Hero Card
```

------------------------------------------------------------------------

## Phase 11 --- Quests

Only add quests once enough systems exist for them to reference.

Examples:

-   Complete 3 stages
-   Level a hero 3 times
-   Summon 1 hero
-   Earn 5 stars
-   Defeat 200 enemies

Avoid implementing a generic quest framework around hypothetical future
mechanics too early.

------------------------------------------------------------------------

## Campaign V1 checkpoint

At this point Campaign contains:

``` text
Campaign
│
├── Chapters
├── Stages
├── Squad selection
├── Hero ownership
├── Rewards
├── Gold
├── XP
├── Hero levels
├── Summoning
├── Duplicates
├── Hero ranks
├── Stars
├── Milestones
└── Quests
```

Only after playing this version should additional systems be evaluated:

-   Faction bonuses
-   Relics
-   Hero bonds
-   Hard mode
-   Daily/weekly quests
-   Equipment
-   Ascension
-   Auto-clear
-   Multiple banners
-   Pity
-   Special events

------------------------------------------------------------------------

## Implementation roadmap

  Sprint   Build                Playable result
  -------- -------------------- --------------------------------
  **0**    Data architecture    Future-proof foundation
  **1**    3 campaign stages    Basic Campaign
  **2**    Squad selection      Strategic roster restriction
  **3**    Save/profile         Persistent progression
  **4**    Hero ownership       Collection starts
  **5**    Rewards/resources    Progress loop
  **6**    Hero levels          Power progression
  **7**    10-level Chapter 1   Real playable prototype
  **8**    Summoning            Gacha loop
  **9**    Duplicates/ranks     Collection progression
  **10**   Stars/milestones     Replayability
  **11**   Quests               Retention/progression guidance
  **12**   Chapter 2            Validate scaling

Chapter 2 is deliberately late.

If making Chapter 2 is easy, the architecture worked.

If Chapter 2 requires changing campaign code, hero code, reward code and
UI logic everywhere, the systems have become too tightly coupled.

------------------------------------------------------------------------

## Architecture principle

Think of Campaign as **configuration + reusable engines**:

``` text
                 CAMPAIGN ENGINE
                       │
       ┌───────────────┼───────────────┐
       ↓               ↓               ↓
   STAGE DATA      PLAYER DATA      HERO DATA
       │               │               │
       ↓               ↓               ↓
 map / waves       ownership       stats/skills
 enemies           currencies      artwork
 rules             progression     metadata
 rewards           completion
```

A new stage should ideally mean:

> **Create data.**

Not:

> **Write new game logic.**

A new hero should mean adding hero data. A new chapter should mean
adding stage definitions.

### Avoid premature abstraction

**Design the data model for tomorrow, but only implement today's
behavior.**

It is sensible for the reward schema to support different types now. It
is not necessary to build a generic 17-currency inventory framework
because it might be useful six months later.

The immediate target should therefore be **Sprint 0--3**:

> Campaign → choose stage → select four heroes → fight → complete →
> unlock next stage → persistent progress.

Everything else attaches to that spine incrementally.

------------------------------------------------------------------------

# 2. Save / Load System

For the first version, the existing JSON save/load approach is enough.

Do **not** introduce a backend/database yet.

The important improvement is to stop treating the save as a dump of
current game state and define a proper **versioned player-save format**.

Example:

``` json
{
  "saveVersion": 1,
  "player": {
    "createdAt": "2026-09-27",
    "lastPlayedAt": "2026-09-27"
  },

  "campaign": {
    "currentChapter": 1,
    "highestStage": "1-4",
    "completedStages": {
      "1-1": { "stars": 3 },
      "1-2": { "stars": 2 },
      "1-3": { "stars": 3 }
    }
  },

  "currencies": {
    "gold": 2450,
    "heroXp": 720,
    "divineSeals": 340
  },

  "heroes": {
    "heracles": {
      "owned": true,
      "level": 8,
      "rank": 1,
      "copies": 0
    },
    "meret": {
      "owned": true,
      "level": 5,
      "rank": 1,
      "copies": 1
    }
  },

  "summoning": {
    "totalSummons": 4,
    "legendaryPity": 4
  },

  "milestones": {},
  "quests": {}
}
```

## `saveVersion` is important

Later the hero or campaign system will change.

An old save might contain:

``` text
saveVersion: 1
```

The game can detect it and automatically migrate it to V2 rather than
breaking the player's progress.

------------------------------------------------------------------------

## Save Stage V0 --- Existing JSON

Keep the current JSON file save/load.

Implement the structured and versioned format first.

Advantages:

-   Free
-   Simple
-   Works locally
-   No backend
-   No accounts
-   Good enough for development

------------------------------------------------------------------------

## Save Stage V1 --- Local automatic persistence

For a browser game, add **IndexedDB** as the primary automatic local
save.

Keep manual:

-   **Export Save**
-   **Import Save**

as backup/transfer functionality.

Conceptually:

``` text
GAME STATE
    │
    ├── Auto Save → IndexedDB
    │
    └── Export → player-save.json

Start Game
    │
    ├── IndexedDB save exists → LOAD
    │
    └── no save → NEW GAME
```

This remains **€0/month** and requires no account system.

------------------------------------------------------------------------

## Save Stage V2 --- Optional cloud saves later

Only add cloud saving if the game eventually needs:

-   multiple devices
-   accounts
-   persistent online identity
-   server-controlled progression
-   competitive systems requiring server authority

A free-tier cloud/database service could be considered later.

Do not make this decision necessary for the Campaign prototype.

Cloud introduces considerably more complexity:

-   authentication
-   database schemas
-   security rules
-   synchronization
-   save conflicts
-   maintenance

------------------------------------------------------------------------

## Important limitation of local saves

Local/browser saves mean progress is not automatically synchronized
between devices.

For example:

``` text
Chrome on PC ≠ automatically iPhone
```

Clearing browser/site data can also remove local saves.

Therefore the JSON system should remain, but its purpose becomes:

> **Backup / Transfer Save**

rather than the main saving mechanism.

A future UI could simply show:

``` text
SAVE DATA

✓ Progress automatically saved

[ Export Save ]
[ Import Save ]

Last saved: just now
```

------------------------------------------------------------------------

## Rotating backups

Maintain 2--3 local snapshots:

``` text
currentSave
backupSave1
backupSave2
```

Saving can conceptually work as:

``` text
current → backup1
backup1 → backup2

validate game state

write → current
```

If the current save becomes corrupt, the previous snapshot can be
recovered.

------------------------------------------------------------------------

## Save validation

Validate important structures when loading:

``` text
saveVersion ✓
campaign ✓
currencies ✓
heroes ✓
```

If a newer game version introduces properties that don't exist in an
older save, supply defaults during migration.

------------------------------------------------------------------------

# Revised roadmap including save architecture

Saving should move very early in development:

  Step        Build
  ----------- ------------------------------------
  **0**       Define Campaign/player data models
  **1**       **Save manager + `saveVersion`**
  **2**       3 Campaign stages
  **3**       Stage progression/unlocks
  **4**       Squad selection
  **5**       Hero ownership
  **6**       Rewards/currencies
  **7**       Hero leveling
  **8**       Chapter 1
  **9**       Summoning
  **10**      Duplicates/ranks
  **11**      Stars/milestones
  **12**      Quests
  **Later**   Optional cloud account/save

------------------------------------------------------------------------

# Central PlayerState

Establish one architectural rule:

> **Every Campaign system modifies one central `PlayerState`; the
> SaveManager only knows how to serialize, validate, migrate and persist
> that state.**

Campaign code should not directly write JSON files, `localStorage`,
IndexedDB, etc.

The storage implementation can then evolve:

``` text
PlayerState
     │
     ↓
 SaveManager
     │
     ├── JsonSaveProvider
     │
     ├── IndexedDbSaveProvider
     │
     └── CloudSaveProvider (later)
```

The Campaign itself doesn't care where the data is stored.

This makes it possible to start with:

``` text
JsonSaveProvider
```

move to:

``` text
IndexedDbSaveProvider
```

and eventually add:

``` text
CloudSaveProvider
```

without rewriting Campaign.

## Recommended approach

**JSON first → IndexedDB auto-save → optional cloud much later.**

This is the lowest-cost and lowest-risk approach.

No paid service or backend is required to build the complete
Campaign/gacha prototype.
