# Tower Defense R4: Battle Economy Redesign

**Status:** Implemented October 2, 2026  
**Roadmap item:** R4  
**Date:** October 2, 2026

## Goal

Move all hero power progression out of a battle. A deployed hero uses the permanent level,
stars, evolution and skill levels from the player's collection in every game mode. Battle gold
funds roster deployment and tactical repositioning.

## Battle gold

Gold keeps its current sources: starting gold, enemy rewards, wave-clear rewards, quests,
interest and sell refunds. R4 does not tune those values; the later R12 balance pass will do so.

Gold has these uses:

1. Deploy a hero for the hero's displayed deployment cost.
2. Relocate a deployed hero between waves for 25% of that deployment cost, rounded to the
   nearest whole gold. A relocation must end on an empty tile that accepts the hero's slot type.
3. Sell a hero using the existing 50% refund rule. The refund is based on deployment gold paid;
   relocation fees are spent and are not added to the refundable amount.

Relocation is unavailable while a wave is active. Starting relocation highlights compatible
empty tiles. Confirming a tile spends the gold and moves the existing unit; cancelling does
nothing. The unit keeps its entity identity and combat state so relocation cannot heal it or
reset charge and cooldowns.

## Hero power in battle

The simulator receives collection-enhanced heroes from `collectionHeroes()` as it does today.
Their permanent stats and unlocked skill effects are the complete source of hero progression.

R4 removes these battle purchases and their runtime state:

- battle ranks and rank stat multipliers;
- attack or health focus;
- class-path selection and class-path combat effects;
- battle Awakening;
- repeatable attack and health training.

Collection level, stars, evolution and skill levels remain on each hero and are displayed in
the battle interface. A defeated hero that is deployed again retains the same collection power,
because it is a new placement of the same permanently upgraded hero.

Virtues, run boons, targeting priorities, pantheon bonds and Divine Interventions remain battle
systems. They do not spend gold in R4.

## Interface

The selected-hero panel removes the Upgrade, Awaken and Train actions and all focus/path choice
controls. It shows a compact permanent-progression summary: level, stars, evolution and the
levels of the hero's four skills.

Between waves, a deployed hero offers **Relocate** and **Sell**. Relocate reports its exact cost
before tile selection. During a wave the Relocate control is disabled with a short explanation.
The board uses the existing placement highlights and input handling for the destination step.

Deck cards and board badges stop showing battle rank. Where space permits, they show permanent
collection level. The recruit preview no longer mentions a starting battle rank.

## Blessing-tree migration

Existing node IDs and purchased levels stay valid so saves need no refund or destructive
migration. Their names, descriptions and effects change in place:

- `odin_dominion` / Master Smith: deployment costs are reduced by 3% per level.
- Each class `*_ascension`: heroes of that class deploy for 10% less.
- Each class `*_rite`: relocating a hero of that class costs 30% less.
- Each class `*_apotheosis`: heroes of that class gain 15% attack and maximum health.

Deployment discounts combine additively and are capped at 50%. Relocation is calculated from
the discounted deployment cost, then the class relocation discount is applied. Apotheosis is
always active; it no longer waits for an in-battle Awakening purchase.

## Expedition migration

The Veteran Training camp card remains and keeps the existing `veterans` save field. A veteran
gets 10% attack and maximum health during the rest of that Expedition instead of entering at
battle rank 2. Its card and roster labels describe the percentage bonus.

This bonus stacks multiplicatively with collection stats and blessings. It is local to the
Expedition and does not change the collection.

## Challenges and run records

The `unrefined` challenge ID remains in saves, but its presentation becomes **Hold Position**:
win without relocating a hero. Existing completions remain valid. Run facts replace the upgrade
counter with a relocation counter.

The Trio, One Class, Swift, Hoarder and other challenge rules remain unchanged. Selling and
redeploying still count a hero as fielded.

## Simulator and caller cleanup

The simulator removes `upgradeInfo()`, `trainingInfo()` and `upgrade()`, along with tuning and
bookkeeping used only by battle upgrades. Placement creates a hero directly from its permanent
stats and applies run-specific modifiers once.

The command-line runners stop spending spare gold on upgrades. They continue deploying heroes;
automated relocation policy is deferred to the later balance pass. UI and test callers are
updated to stop relying on battle levels, paths, focus, Awakening or training.

Class-path code and tuning are deleted when no remaining system uses them. Status reactions stay
available through hero kits and class Infusion blessings.

## Compatibility and verification

Old saves load without losing collection progress, Favor-tree purchases, Expedition veterans or
challenge rewards. A saved battle is not part of the save format, so removed per-battle upgrade
state needs no migration.

Focused checks cover deployment discounts, relocation rules and state preservation, sell value,
permanent progression display, blessing effects, Expedition veterans and challenge evaluation.
The owner will handle simulation and balance runs. The project build is excluded by repository
instructions.
