# TD UI Reference: AAA Screen Analysis

Status: analysis and recommendations only. No UI code changed. Written to
capture what the reference screens teach us and how it maps onto our own
TD implementation, so the recommendations below can be picked up one at
a time later.

Source: 8 screenshots from a mobile gacha RPG's tower-defense sub-mode,
supplied September 27, 2026 across four messages: (1-2) campaign world
map and a selected node, (3) squad-select before battle, (4-6) three
in-combat moments (early wave, mid-fight with ultimates charging,
placement/targeting mode), (7-8) two post-battle screens (hero XP, then
rewards).

## 1. What each screen shows

| # | Screen | Key elements |
|---|---|---|
| 1 | Campaign map, zoomed | Node path (N3-1…N3-8) with checkmarks for cleared nodes, one EXP bonus node off the path, chapter tabs at the bottom with checkmarks per finished chapter, persistent currency bar top-right, a right-side detail panel for the selected node (name, flavor text, small rewards preview, a thumbnail with a magnifier for a full map preview, recommended power, attempt counter, Auto-Battle and Fight buttons) |
| 2 | Campaign map, wider | Same map, more of it visible; adds a **milestone reward track** across the top (chest icons that unlock as nodes clear, decoupled from the node path itself) and a chapter-completion breadcrumb further along (Ch. I…V) |
| 3 | Squad select | Full roster grid (every owned hero, sorted by level, green checkmarks on ones already in a saved loadout), the stage's own info panel (name, thumbnail, recommended power, attempt counter), a **loadout strip** of exactly 5 hero slots plus a separate locked "reinforcement" slot (an ally-borrow slot, not a hero you own), a single Lord/leader slot shown empty, and one Start button gated on nothing but the squad being filled |
| 4 | Combat, early | Minimal always-on HUD: kill/wave counter top-center, lives top-center, pause/speed/settings top-right, a resource-generation button bottom-left (percentage toward the next tick), a summon-point counter bottom-right ("16, Einsetzbar: 8"), and a bottom bar of every squad hero as a portrait with **level number** and a **class-role icon**, highlighted ones ready to place |
| 5 | Combat, mid-fight | Once heroes are placed, the bottom-left area switches from the resource button to an **ultimate-charge row**: one circular icon per deployed hero showing % charge, updating live. The bottom hero bar now only lists heroes *not yet placed* |
| 6 | Combat, placement | Selecting a placed hero brings up a header card (portrait, name, level, a status tag like "Blocken 2") and a **grid-based range/targeting overlay**: highlighted tiles in a cone or radius in the hero's actual facing, with a plain-language cancel affordance ("Zum Abbrechen zurückziehen" — drag back to cancel) instead of a separate cancel button |
| 7 | Victory, part 1 | Every squad hero shown at once with level, a growth/XP bar, and a note that max-level heroes convert XP to a banked "overflow" bonus instead of wasting it; a loading spinner for "uploading battle data" sits below, blocking nothing but visually implying a wait |
| 8 | Victory, part 2 | Reward chest breakdown (a couple of currencies with a `+X%` bonus badge each), quick-nav shortcuts to Stats/Hero/Camp screens, and the actual decision buttons: Retry (shows its energy cost) and Complete |

## 2. Cross-cutting structure the reference follows

Five clearly separated altitudes, one screen (or screen-state) per
altitude, never mixed:

1. **World / macro** (screens 1-2): where am I in the campaign, what's
   left, what do I get for finishing a chunk of it. Currency bar is the
   only thing that's *always* on screen here.
2. **Preparation / squad** (screen 3): am I bringing the right team,
   sized against a stated recommended power, before I spend an
   attempt.
3. **Live combat** (screens 4-6): the HUD only ever shows what changes
   turn to turn — a resource meter, a bench of what's not yet placed,
   an ultimate row once something *is* placed. It swaps content instead
   of showing everything permanently, which keeps the play area clear.
4. **Placement micro-interaction** (screen 6): a targeting overlay
   appears only while a hero is selected, is spatially exact (real
   tiles, real facing), and its cancel affordance is physical (drag
   back) rather than a UI button competing for thumb space.
5. **Aftermath / macro again** (screens 7-8): growth first, currency
   second — the two are photographed separately here, but nothing
   about that split is load-bearing; it's presentation, not a hard
   requirement of the genre.

## 3. Where this does and doesn't apply to our game

Worth saying plainly: our TD is a single-map, wave-count minigame
(`TdLobby.astro` picks a map and a run length — 10, 20 or endless), not
a multi-chapter world campaign with dozens of numbered nodes. Screens
1-2's node-chain-with-checkmarks structure doesn't transplant onto that
shape, and building one would be scope far beyond a fan-site minigame.
What *does* transplant, and is a real gap today, is the two ideas
underneath it: **a milestone reward track** and **a recommended-power
signal before committing to a run** — both are map/mode-agnostic ideas,
not campaign-specific ones.

## 4. Gap analysis against the current implementation

| Reference idea | Where it would live in our code | Status today |
|---|---|---|
| Recommended power before starting | `TdLobby.astro` map/run-length picker | **Missing.** The lobby shows map art and run length (10/20/endless) but nothing that tells the player "your current roster is under/over-tuned for this." |
| Milestone reward track (rewards tied to progress, separate from the moment-to-moment score) | HUD (`hud.ts`) or the lobby | **Missing.** Wave clears grant gold and Favor already, but there's no visible "reach wave 5/10/15 for a bonus" strip the player can glance at mid-run. |
| Squad-select as its own dedicated screen with a loadout strip | `recruit.ts` (per-ring recruitment sheet) | **Different by design, not missing.** Our game recruits per empty ring during setup and mid-run rather than pre-building a 5-hero squad before Start. That's a deliberate TD convention (you react to the map as it plays out), not a gap — flagging only so it isn't "fixed" into something it was never meant to be. |
| Bottom bar of available heroes with level + role icon | `hud.ts`'s deck (`[data-td-deck]`) | **Already matches.** This is functionally the same idea as screens 4-5's hero bar. |
| Ultimate-charge row once heroes are placed | HUD | **Missing.** We show hero HP and level on the board, but nothing currently gives an at-a-glance ultimate-readiness read the way screen 5's charge-percentage row does — worth checking against `TOWER_DEFENSE_ROADMAP.md`'s open UI items, since this is the same instinct as "Inspector stats too thin" (already fixed) one level up: readiness, not just current stats. |
| Placement targeting overlay (range ring, facing cone) | `render.js` (`drawRangeRing`), `popover.ts` | **Already matches**, including the range-ring visibility pass done earlier this week. The reference's drag-back-to-cancel is a nice-to-have, not a gap — our current tap-to-deselect is an equally standard pattern for this genre. |
| Combined vs. split victory screen | `results.ts` / `TdOverlays.astro` results panel | **Already combined in ours** — stats, comparison, achievements, Favor and shard choice are one panel today, not two. This matches your own read of the reference (screens 7-8 are worse split) rather than needing a change. |

## 5. Recommendations, in priority order

1. **Add a recommended-power (or recommended-squad-strength) read-out to the lobby**, shown next to the map/run-length choice. Doesn't need real "power score" math like the reference (that assumes a gacha stat system we don't have) — a simpler, honest version fits better: something like "clears comfortably with the trunk of the Favor tree bought" vs. "expect a tight 10-wave run," derived from the same balance sweep data `npm run td:sweep` already produces.
2. **Add a milestone strip to the HUD** for the current run: 2-3 wave thresholds with a bonus each (extra gold, a Favor tick, etc.), visible the whole run the way the reference's chest row sits above the map permanently. Gives the player a mid-run goal beyond "don't die."
3. **Add an ultimate-readiness indicator** per deployed hero, most naturally as a small ring or percentage on the hero's board token (which already carries a level border per `drawLevelBorder`) rather than a separate row, since our board is smaller than the reference's dedicated bottom strip.
4. Everything else compared above is either already implemented, or a deliberate and correct difference for how our game actually plays (per-ring recruiting instead of a pre-built squad, a combined results screen). No change recommended there.

Nothing above has been built. This is the reference for whichever of
these the user wants to schedule next.
