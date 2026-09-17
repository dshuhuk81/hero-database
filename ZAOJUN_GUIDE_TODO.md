# Zaojun Guide Requirements Checklist

Audit date: 2026-09-17  
Guide: `src/pages/guides/zaojun.astro`  
Hero data: `src/data/heroes/zaojun.json`

Status key:

- `[x]` Complete
- `[~]` Partially complete
- `[ ]` Still required
- `[-]` Optional or intentionally out of scope

## Current status

### Hero introduction

- [x] Introduce Zaojun and her combat role.
  - Covered by the hero subtitle, the opening verdict, and the role summary.
- [x] Identify her as the Goddess of Blessings and Virtuous Reckoning.
- [x] Explain that she is a Hearts Archer.
- [x] Describe her unusual hybrid playstyle.
  - The introduction distinguishes her from both Normal-Attack Archers and conventional team-wide supports.
- [x] Explain how she combines damage, healing, protection, and resource mechanics.
  - Damage comes mainly from her Ultimate; Feast of Warding and her Relic heal; Fire Pact protects and transfers HP pressure; allied Energy consumption builds Hearthfire.
- [x] Explain what makes her different from traditional damage dealers and support Deities.
- [x] Establish Hearthfire as the central resource in her kit.
- [x] Use the approved term **Hearthfire** consistently.

### Skill analysis

- [x] Analyze **Unbound Blaze of Kindling**.
  - Covers allied Energy collection, the 1,200-Hearthfire cap, extra-hit thresholds, target selection, repeated targets, partial casts, and charging the next Ultimate during the current animation.
- [x] Analyze **Fire of Lasting Grace**.
  - Covers increased Hearthfire storage from the Fire Pact partner and healing that partner through Zaojun's damage.
- [x] Analyze **Feast of Warding**.
  - Covers its frontmost-ally heal, ricochet damage, unusual ally-stat scaling, and the difference between its target and the Fire Pact target.
- [x] Analyze **Hearthbound Protection**.
  - Covers highest-HP target selection, DMG RED, the partner's HP sacrifice, summon interactions, and sustain requirements.
- [x] Analyze **Everburning Hearthfire**.
  - Covers the loss of Normal Attacks, periodic self-Energy, stacking ATK, and why Attack Speed is poor for her.
- [x] Explain how allied Energy consumption is collected and stored as Hearthfire.
- [x] Explain that Hearthfire adds attacks to the Ultimate and show the level-dependent thresholds.
- [x] Explain the special contribution of the Fire Pact partner at higher Relic investment.

### Game-mode analysis

- [x] State which game modes suit Zaojun best.
  - The guide recommends Hearts Spire and Odyssey.
- [x] Explain her strengths and weaknesses.
- [x] Explain the teams and combat situations in which she excels.
  - Fast Energy spenders, durable Fire Pact targets, bosses, and grouped formations are covered.
- [~] Recommend team compositions and synergies.
  - Individual synergies are covered for Poseidon, Hladgunnr, Caishen, Nuwa, and Nephtys.
  - Complete lineup examples with defined roles are still missing.
- [x] Decide whether she is better in sustained or burst-oriented battles.
  - The guide directly identifies her as a sustained-fight carry with some partial-Ultimate burst flexibility.

### Lore

- [-] A dedicated lore guide is optional and is not required for this gameplay guide.
- [-] Do not add a large lore section merely to satisfy the optional prompt.
  - The existing Goddess identity and hearth/fire symbolism are sufficient context for the gameplay-focused version.

## New to-do list

### Required for full brief coverage

- [x] Add a direct mode recommendation to the **PvE or PvP?** section.
  - Hearts Spire and Odyssey are named as her best modes, while PvP remains qualified.
- [ ] Add two or three complete lineup templates to **Team Building**.
  - Each lineup should identify the Fire Pact candidate, Energy contributors, sustain/protection, and magic-damage follow-up.
  - Suggested categories: sustained boss team, general multi-enemy PvE team, and a cautious PvP option.
  - Use recorded lineups or otherwise verified hero mechanics; do not present speculation as proven performance.
- [x] Add one explicit sustained-versus-burst verdict.
- [x] Standardize the approved resource name as **Hearthfire**.

### Validation before publishing

- [-] Build/type checks will be run manually by the project owner.
- [ ] Open the rendered guide and test every skill/relic tab.
- [ ] Check the new lineup and mode content at desktop and mobile widths.
- [ ] Confirm that the additional content does not make the guide navigation or page length unwieldy.

## Completion definition

The guide is complete when every non-optional requirement above is marked `[x]`, concrete lineup examples are present, and the project owner has completed the manual build and visual checks.
