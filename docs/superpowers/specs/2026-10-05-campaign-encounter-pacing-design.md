# Campaign Encounter Pacing: readable stages instead of horde waves

> **Superseded (October 5, 2026):** the owner chose the continuous timeline (Option B) and the waves were removed. See
> [Timeline Stages](2026-10-05-timeline-stages-design.md). This document keeps the analysis and the wave-era decisions as history;
> the pilot stages 1-4, 1-7, 1-9 and 1-10 it describes were converted to timelines with every other stage.

Status: approved by the owner on October 5, 2026 ("Mache das"); decisions 1, 2, 4 and 5 taken as recommended, decision 3
(squad cap) not taken. Implemented the same day: phase 0 (`npm run td:stage-lint`), phase 1 (kill counter, stage summary,
incoming chips, `stageForecast` in `sim.js`), the pilot stages 1-4, 1-7, 1-9 and 1-10 (phase 2, awaiting the owner's
playtest) and free relocation (P4). Phase 3 (roll-out to the other 78 stages) is open.
Priority list and decision history: [Tower Defense Roadmap](../../../TOWER_DEFENSE_ROADMAP.md).
Reference analyses: Watcher of Realms (WoR) campaign analysis and scaling CSV (see the roadmap section
"Reference: Watcher of Realms"). Related: [Campaign R18 Rollout and Stage-Load Audit Design](2026-10-04-campaign-r18-stage-load-design.md),
[TOWER_DEFENSE_SPEC.md](../../../TOWER_DEFENSE_SPEC.md) (current rules).

## 1. The problem, in the owner's words

Stage 1-10 played with 1 platform hero, 1 healer and 4 ground heroes: "I could not stop anything". With fewer
ground heroes there are not enough blockers. There are too many flyers and ground units at once. WoR gives a
fixed, known amount of enemies per stage, so the player has an overview of what is coming; our wave system
"pours out hordes" that are hard to influence.

## 2. What the data says

WoR (normal chapters, all 287 stages in the CSV, medians per chapter) against our authored campaign
(counts as the simulator spawns them, after `board.waveShape`):

| | WoR | Ours |
|---|---|---|
| Enemies per stage, chapter 1 | 11 (stages 1-1 to 1-9: 8 to 14) | 21 (1-1), 24 (1-4), 58 (1-7), 56 (1-9), 72 (1-10) |
| Enemies per stage, chapter 4 | 32 | 56 (4-3) |
| Spawn groups per stage | 9 (ch. 1), 15 to 29 later | 4 to 8 waves of 1 to 3 groups |
| Spawn window of the whole stage | 53 s (ch. 1), 97 to 234 s later | one wave 5 to 20 s, then a pause |
| Enemy types per stage | 3 to 7 | 4 to 7, mixed inside each wave |
| Spawn pressure | 0.1 to 0.26 enemies/s | 0.6 to 0.9 enemies/s inside a wave |

Four causes follow from this, in order of weight:

1. **Volume.** We spawn two to five times as many enemies per stage as WoR in the same chapter.
2. **Shape.** A WoR stage is one long timeline of small groups (about 20 groups of 1 to 5 over 2 to 4
   minutes) with a visible total (kill counter such as 2/28). Ours is a short burst of 4 to 15 enemies, then
   a pause, and the player sees only the next wave.
3. **Mix.** Our waves combine ground, flyers and supports (menders, shieldbearers, hexers). The stage needs
   blockers *and* platform damage at the same time; with six heroes and block limits Tank 3 / Warrior 2 /
   Assassin 1, a squad that covers one cannot cover the other. Stage 1-10 wave 7 is 8 shieldbearers, 4 menders,
   12 flyers and 14 grunts raw (after shaping about 20 enemies).
4. **Leverage.** The player cannot answer what the game shows: relocation costs 25% of the deploy price, the
   squad is fixed at six, and only the next wave is announced.

## 3. Goals

- The player sees the whole stage before it starts and what comes next while playing.
- At any moment few enemies are on the field, so one hero placement visibly changes the outcome.
- A wave poses one problem at a time (swarm, flyers, armour, healers), so a squad can answer it.
- Numbers are shaped like WoR's pacing but are never copied (owner rule, October 5).

## 4. Proposal

### P1. Stage forecast (information, no balance change)

- The HUD shows a **kill counter** `killed / total` for the stage, like WoR.
- Before the first wave a **stage summary**: total enemies, per kind counts (for example "36 enemies: 14 grunts,
  8 flyers, 6 runners, 4 brutes, boss"), and the gates.
- During play the next-wave chips become a **timeline strip** with the next three groups per gate and their
  arrival times. It replaces the current "Next wave / 7x Grunts / 2x Menders" chips and the quest chip moves
  next to it.
- Pure UI plus one pure function `stageForecast(game)` built on the existing `wavePreview()`. No effect on
  balance, so it can ship first and be judged on its own.

### P2. One problem at a time (composition rules)

Every wave has one headline kind (swarm, runners, flyers, brutes, summoners) and at most one support kind.
Rules, enforced by a new lint script `npm run td:stage-lint` (report only, never edits `tdCampaign.json`):

- at most 3 enemy kinds per wave, at most 2 in chapter 1;
- flyers never share a wave with more than one other ground kind, and never exceed what the squad's
  platform slots can answer (first guess: 3 flyers per occupied platform hero, to be measured);
- supports (mender, shieldbearer, hexer) only appear with a headline kind that gives the player time to reach them;
- the first wave of a stage with two gates contains at most two enemies per gate in its first 10 seconds.

### P3. Fewer enemies, spread over time

- Target enemies per stage by chapter, as a first guess shaped like WoR but not equal to it: chapter 1 about
  12 to 22, chapter 2 about 20 to 28, chapters 3 to 4 about 28 to 36, later chapters about 32 to 40 plus the
  boss. This cuts our current counts by 40 to 70%.
- Spawn pressure capped at 0.4 enemies/s inside a wave (gap and per-gate round robin already exist).
- Mechanically this is the `?lean` experiment made principled: bot measurements (October 5) show that fewer,
  tougher enemies at equal total health are harder for the bot, so every reshaped stage needs its `hpScale`
  retuned (about 0.55 to 0.8 of today's value at count x0.6).
- A new script `npm run td:stage-reshape` proposes counts per group from the target curve and keeps the
  authored composition; it prints a diff and never writes the campaign file.

### P4. Player leverage (owner decides each item)

| Item | Today | Proposal |
|---|---|---|
| Relocation | 25% of the deploy price, any time | free between waves, 25% during a wave |
| Squad size | 6, same from stage 1 | keep 6; stage 1-1 to 1-4 may cap the roster at 4 to teach blocker plus platform (optional) |
| Block limits | Tank 3, Warrior 2, Assassin 1 | unchanged; re-measure after P3 |
| Auto start | 10 s countdown | keep; the forecast makes the choice informed |

### P5. Time model (decide after P1 to P3 have been played)

- **Option A, recommended:** keep waves as phases (wave-clear bonus, quests, blessings, wave interest and
  mutator offers hang on them) and present them as one timeline (P1). Lowest risk.
- **Option B:** a true continuous timeline like WoR: a stage is a list of timed groups with no pauses; waves,
  quests and interest need a rework. Only worth it if A still feels like hordes after P3.

## 5. Delivery plan

| Phase | Work | Check |
|---|---|---|
| 0 Measure | `td:stage-lint` and a per-stage table of count, peak enemies alive, flyer share, kinds per wave for all 82 stages (extends `td:wor-compare`) | baseline numbers committed to the roadmap |
| 1 Forecast UI | P1: kill counter, stage summary, timeline strip | owner plays 1-1 to 1-10 and confirms it reads better |
| 2 Pilot | P2 and P3 on 1-7, 1-9, 1-10 (the owner's walls) and 1-4 (flyers), `hpScale` by bot lower bound, then owner playtest | owner clears each pilot stage with a mixed squad (for example 2 platform and 4 ground) and with a lean squad (1 platform, 1 healer, 4 ground) |
| 3 Roll-out | the rest of chapter 1, then chapters 2 to 13 chapter by chapter with lint and bot sweeps | `td:stage-lint` clean, owner playtest per chapter |
| 4 Leverage | P4 items the owner approves | win-rate and pacing scripts |
| 5 Decide | Option A or B | owner |

R12 (balance pass) keeps its other steps. Step 7 (campaign `hpScale` with `td-board-tune.mjs`) moves **after**
phase 3, because retuning `hpScale` before the counts change would be done twice.

## 6. Decisions needed from the owner

1. Is Option A (waves as one timeline) acceptable for now?
2. Are the chapter targets in P3 about right, or should the first chapters be even smaller?
3. Do you want the optional squad cap (4) for stages 1-1 to 1-4?
4. Free relocation between waves: yes or no?
5. Start with phase 0 and 1 (no balance risk) in parallel to the pilot, or one after the other?

## 7. What this does not change

Hero kits, class block limits, Divine Interventions, boss rules, gold economy and the R18 presentation.
