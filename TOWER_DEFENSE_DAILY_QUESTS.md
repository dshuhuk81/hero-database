# Tower Defense — Daily Quests (R10 concept, OWNER-APPROVED October 2, 2026)

Drafted October 2, 2026, after the owner's reference screenshot (a Daily screen from the
inspiration game: fixed task list, activity points, milestone bar with chests, Go buttons,
refresh countdown). Mechanics inspiration only — no copied art, names or text
(`docs/td-asset-pipeline.md` rule 1). Owner decisions on the draft: **(1) task list as
proposed, (2) default chest numbers, (3) reset at UTC midnight.** Numbers are first
guesses for R12.

## 1. What it is

A meta screen of **fixed daily activities** — the same list every day, each "do X once"
across the game's modes. Not in-run objectives. Completing a task grants **activity
points**; an **activity bar** above the list pays **milestone chests** at point thresholds.
A countdown shows the time to the daily reset. Unclaimed points and chests expire at reset.

## 2. The activity list (proposal, 10 tasks)

Each task: id, text, points, Go target. All counters live at the meta layer — a screen or
run result reports the event; no in-fight sim telemetry except where noted.

| # | Task | Pts | Counted when | Go target |
|---|---|---|---|---|
| 1 | Clear a campaign stage | 10 | `stage-clear.ts` pays a first-clear or replay clear | Campaign map |
| 2 | Clear a Heroic campaign stage | 20 | stage clear on a Heroic stage | Campaign map |
| 3 | Reach the Daily Trial goal | 20 | `page/daily.ts` goal reached (fires once per day already) | Daily Trial |
| 4 | Finish an Expedition | 20 | `page/expedition.ts` completion (paid once per expedition) | Expedition |
| 5 | Clear a Challenge | 15 | `page/challenges.ts` tier clear | Challenges |
| 6 | Clear wave 10 in Free Play | 10 | run ends at wave ≥ 10 (`page/results.ts`) | Free Play |
| 7 | Perform a summon | 10 | summon screen completes a pull | Summon |
| 8 | Buy a blessing-tree node | 10 | `page/blessings.ts` purchase | Blessings |
| 9 | Use a Divine Intervention in a run | 10 | run result reports an intervention fired (Thunderfall or Shield; new field on the result) | Free Play |
| 10 | Promote a hero or buy a hero level | 10 | campaign roster upgrade purchase | Roster |

Total available: 135. Milestones at 20/40/60/80/100, so a player needs ~3/4 of the list for
the top chest; one session of normal play (campaign + trial + one more mode) reaches 60-80.

Open for the owner: drop or swap any task; #9 and #10 are the two that need a new counter
field (#9 a result flag, #10 a hook in the roster upgrade flow) — everything else reuses an
existing "paid" moment.

## 3. Economy — activity chests

Reward currency: **Favor**, with Divine Seals at the two top milestones (seals are the
summon currency and the slowest daily-earned one). Existing daily baseline for an active
player: Daily Trial 100 Favor + 15 seals, Expedition 300 Favor, Challenges 40-120 Favor —
roughly 440-520 Favor + 15 seals before quests exist.

Budget rule: quests add about **+50% Favor** for a do-everything player, so they matter
without replacing play.

| Milestone | Chest (default) | Chest (lean option) |
|---|---|---|
| 20 | 30 Favor | 20 Favor |
| 40 | 40 Favor | 25 Favor |
| 60 | 50 Favor + 10 seals | 30 Favor + 5 seals |
| 80 | 60 Favor | 35 Favor |
| 100 | 80 Favor + 15 seals | 45 Favor + 10 seals |
| **Total** | **260 Favor + 25 seals** | **155 Favor + 15 seals** |

Default sits at the +50% rule; the lean option is ~+30%. Owner picks; R12 validates.

No overlap to resolve: the only existing daily system is the Daily Trial (the "daily goal"
100 Favor in the mechanics overview **is** the trial's goal reward — verified October 2,
there is no separate daily-goal feature). Quests stack on top; task #3 points at the trial
as one of the activities.

## 4. Refresh, save, no-backend

- Reset at **UTC midnight**, keyed exactly like `daily.js` (`dailyDate()`), so quests and
  the Daily Trial share a clock; countdown shows time to next reset.
- Save record under `td:v1`: `quests: { date, activity, tasks: { taskId: claimed }, milestones: [claimed thresholds] }`. New date ⇒ fresh record; unclaimed points/chests expire (reference behavior).
- Claiming a task pays its points immediately; chests are claimed from the bar (reference
  shows claim states, so currency lands only on claim, not on completion).
- **No anti-tamper**: client-side save, same accepted trade-off as the rest of the meta
  layer (the leaderboard, M25, is the only feature that deferred for this reason).

## 5. UI (home entry + screen)

- Home screen gains a Daily entry (orb icon) with a badge: unclaimed points/chests or
  activity progress. Existing home patterns from `page/home.ts`.
- Quest screen: activity bar with five chests (locked / ready / claimed states), the task
  list (icon, text, points, progress "0/1", Go button deep-linking to the feature, Claim
  button when done), countdown footer.
- The reference has Daily / Weekly / Achievements tabs: **Daily only**. Weekly is deferred
  (no design), achievements stay where they are; tabs can be added later without rework.
- Go targets use the existing in-game navigation (`page/nav.ts` / route module); tasks whose
  feature is not unlocked yet (e.g. Expedition before it opens) still show, Go leads to the
  locked screen with its usual lock message.

## 6. Build scope after approval (R10 development, est. M)

1. `src/game/td/quests.js` (pure logic like `daily.js`): task table, activity total,
   milestone table, date/reset, claim functions; save fields in `page/save.ts`.
2. Event hooks at the ten "counted when" sites (nine existing pay moments + two new
   counters: intervention-fired flag on run results, roster-upgrade hook).
3. Quest screen + home entry + badge (`page/quests.ts`, UI per section 5).
4. `scripts/test-td-quests.mjs`: required checks below.
5. Numbers into tuning (task points, chest contents as data, not code).

## 7. Required checks (tests)

1. A fresh day starts at 0 activity, all tasks unclaimed.
2. Each task pays points exactly once per day (repeating the activity does not double-pay).
3. Claiming a task pays points; claiming again pays nothing.
4. A chest is claimable exactly at its threshold; below it, it is not.
5. Claiming a chest pays its Favor/seals into the save wallet once.
6. After UTC midnight (simulated date), activity resets and unclaimed chests are gone.
7. Each Go button lands on its target screen (navigation unit test or DOM check).
8. A full simulated day (clear stage → trial goal → expedition → claim all) ends with the
   exact expected wallet delta.
9. Save with no `quests` record (old saves) loads as a fresh day — no migration needed.
