# Stage ratings and chapter milestones (M26 Sprint 10) - proposal

Status: implemented September 29, 2026 (see roadmap M26 Sprint 10). Owner decisions: no player-facing name (icons only), rule as below, rewards as below (may be a bit high, revisit), automatic payout instead of a claim button.
Concept source: `TOWER_DEFENSE_NEXT_STEPS.md` phase 10 ("Stars + milestones").

Goal: give players a reason to replay cleared campaign stages, and add a finite,
earned source of Divine Seals ("one chapter cannot fund summons").

## 1. Name: Laurels, not stars

Heroes already have **Stars** (0-5, bought with copies + Gold). A second "star" on stage
cards would be confusing. Proposal: stage ratings are **Laurels** (0-3 per stage, a
laurel wreath icon in the painted item style, gold). Chapter milestones are
"Laurel rewards".

## 2. How a stage earns Laurels

One rule for every stage, based only on lives kept (the Sanctuary's integrity):

| Laurels | Condition | For 15 lives |
|---------|-----------|--------------|
| 1 | Clear the stage | any win |
| 2 | Clear with at least 50% of the stage's lives | 8+ lives |
| 3 | Clear with at least 90% of the stage's lives | 14+ lives (one leak allowed) |

Why only lives:
- Easy to read, no per-stage rule text, same logic as common TD games.
- The save already stores `bestLives` per cleared stage, so existing players get their
  Laurels immediately (no new tracking, retroactive).
- A "use 3 heroes or fewer" goal (concept example) was dropped: squads are 5 heroes now,
  and it would push players further away from Tanks and Supports.
  Per-stage challenge goals can come later as a separate idea.

### Measured difficulty (bots, current data, 35 random squads per stage, first attempt)

Share of **all runs** reaching each rating (cheapest / carry bot policy):

| Stage | Lives | 1 Laurel (win) | 2 Laurels (>=50%) | 3 Laurels (no leak) |
|-------|-------|----------------|-------------------|---------------------|
| 1-1 | 20 | 100 / 100% | 100 / 100% | 83 / 83% |
| 1-2 | 15 | 81 / 95% | 52 / 90% | 33 / 43% |
| 1-3 | 15 | 60 / 77% | 20 / 26% | 0 / 0% |
| 1-4 | 15 | 66 / 80% | 51 / 43% | 20 / 20% |
| 1-5 | 14 | 51 / 60% | 40 / 31% | 17 / 0% |
| 1-6 | 15 | 54 / 57% | 40 / 46% | 26 / 23% |
| 1-7 | 16 | 66 / 69% | 40 / 43% | 11 / 11% |
| 1-8 | 15 | 66 / 60% | 54 / 40% | 29 / 9% |
| 1-9 | 18 | 60 / 17% | 51 / 9% | 17 / 0% |
| 1-10 | 15 | 60 / 43% | 43 / 29% | 23 / 6% |

The 3-Laurel column counts only leak-free runs; 90% (one leak allowed) sits a bit above it.
Bots pick random squads, never reposition and ignore Stars/Evolution, so real players
land higher. Reading: 2 Laurels is a natural second attempt, 3 Laurels needs a good squad
or upgrades (a replay goal, not a first-try goal). 1-3 is the outlier (no bot run kept
75%+). Check in play; if it stays at 0, lower its hpScale slightly or give it +2 lives.

## 3. Chapter milestones

Chapter 1: 10 stages x 3 = 30 Laurels. Three one-time rewards:

| Laurels | Reward | Worth |
|---------|--------|-------|
| 10 | 1,000 Gold + 500 Hero XP | about one mid-chapter clear; reached by clearing the chapter with some 2-Laurel stages |
| 20 | 180 Divine Seals | 3 pulls |
| 30 | 300 Divine Seals + 100 Seal Dust | 5 pulls + 1 copy of any owned hero (dust copy price 100) |

Totals: +480 Divine Seals per chapter (+80% on the 600 from first clears), all earned by
play and finite. For comparison: Daily goal 105 / week, Daily + one Expedition a day
525 / week, replays 150 per chapter run. "New heroes stay hard to get" holds: no
guaranteed new hero (the concept's "Hero card" becomes a dust copy of an owned hero).

Rewards are claimed with a button on the chapter progress bar (a small chest per
milestone) rather than paid silently, so the moment is visible.

## 4. Where players see it

- **Stage card:** three small Laurels under the stage number (filled / empty).
- **Stage drawer:** the three conditions with the stage's real numbers ("Keep 8 of 15
  lives", "Keep 14 of 15 lives"), best result, filled ones checked.
- **Stages screen:** chapter progress bar under the grid: Laurels x / 30 with the three
  milestone chests (locked / ready to claim / claimed).
- **Results screen after a win:** Laurels earned this run, "New best" when it improved.
- **Home Campaign card:** "Laurels 17 / 30" next to the route.

## 5. Implementation outline

- Data (`tdCampaign.json`): `laurels: { thresholds: [0, 0.5, 0.9] }` and per chapter
  `milestones: [{ laurels: 10, rewards: [...] }, ...]` in the existing reward format.
- Logic (`campaign.js`): `stageLaurels(stage, cleared)`, `chapterLaurels(campaign, progress,
  chapterId)`, `claimMilestone(...)` using the existing reward payout.
- Save: campaign version 8 adds `milestonesClaimed: { [chapterId]: number[] }`; Laurels
  themselves are derived from `bestLives`, so nothing else migrates.
- UI: `TdLobby.astro` + `page/campaign.ts` (card, drawer, progress bar, claim),
  `page/results.ts` (Laurels earned), laurel icon (painted item art on R2 like the other
  currency icons, or an inline SVG until the art exists).
- Tests (`test-td-campaign.mjs`): thresholds, retroactive Laurels from old saves,
  claim once, cannot claim below the threshold, v7 -> v8 migration.
- Docs: spec (Campaign section), roadmap, `TOWER_DEFENSE_MECHANICS_OVERVIEW.md`
  (new seal source).

## Decisions needed

1. Name: Laurels (recommended) or another word / keep "stars".
2. Rule: lives-based 1 / 50% / 90% (recommended), or other goals.
3. Milestone rewards: the table above, or other amounts.
4. Claim button (recommended) or automatic payout.
