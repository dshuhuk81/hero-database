# Hero Guide Redesign - Analysis

Status: proposal, nothing live changed. Date: 2026-11-03.
Scope of evidence: `src/pages/guides/nidhogg.astro`, `src/pages/heroes/[id].astro`,
`src/data/heroes/nidhogg.json`, `src/data/ratings/*.json`, `src/styles/tokens.css`.
Companion files: `EVIDENCE_MODEL.md`, `CONTENT_MAP.md`.
Wireframe: `/design-system/guide-wireframe` (`src/pages/design-system/guide-wireframe.astro`).

## 1. Two roles, no overlap

| Page | Role | Contains | Does not contain |
|---|---|---|---|
| Hero Database `heroes/[id]` | Reference | Skill text, numbers, relic text, stats, ratings | Interpretation, advice, "in practice" prose |
| Hero Guide `guides/[id]` | Judgement | Verdict, investment, modes, team, tests | Skill text copies, full upgrade tables |

- Both pages link to each other prominently (guide header -> "Full skill text", database
  header/verdict card -> "Read the guide").
- Today the Nidhogg guide copies all skill and relic text (section "Skills: What They
  Mean") and repeats strengths/weaknesses that the data file already holds. That is the
  main duplication to remove.

## 2. Principle

Decision first, action second, details on demand.
Each section answers exactly one player question. If two sections answer the same
question they are merged (see CONTENT_MAP.md).

## 3. New guide structure (5 sections instead of 10)

| # | Section | Player question | Start target (not evidence-based) |
|---|---|---|---|
| 01 | Verdict & Investment | Should I build him? | 60-100 words, Quick Overview, confidence line |
| 02 | Where he works | Which mode do I use him in? | 1 sentence per mode, or "Not tested" |
| 03 | Build & Investment | What do I invest, where does he stand? | Relic breakpoints, stats, position, only evidenced synergies |
| 04 | How he works | What is the one mechanic I must understand? | One compact diagram |
| 05 | Testing & Details | How sure is this, what is open? | Observations, limits, open questions, link to skills |

The closing "Verdict" section at the page end is removed; its content moves into 01.
Section 01 and 03 both mention investment on purpose but answer different questions:
01 = "worth it?" (one line), 03 = "what exactly?" (breakpoints and target).

## 4. Three separate relic/investment facts

These are currently blended in one callout ("Investment takeaway") and the f2p string.

| Fact | Meaning | Nidhogg source | Value |
|---|---|---|---|
| Relic Lv3 / Lv4 | What the relic upgrade unlocks | `relic.upgrades.level3/level4` | Lv3 stun or 200% ATK True DMG; Lv4 60% True DMG |
| `recommendedRelicLevel` | Target value to aim for | `nidhogg.json` | 30 |
| Investment priority | Is spending resources worth it | `f2pInvestment` (text) + community | "Low priority on tight resources" |

Rules:
- Never write "Lv4" and "30" as if they were the same scale. The data does not say at
  which relic level the Lv3/Lv4 upgrades unlock (open data question).
- Third-party tier statements (TapTap, 12 Aug 2026, "lower mid-tier") are shown with the
  Community badge and the source date, never as our rating.

## 5. Team Building

No verified partners (`synergyPartners: []`, `synergyLinks: []`, guide says "no hero
confirmed"). Replace the three large function cards by one line:
"No confirmed teammates yet." plus the planned test (Energy support + dragon survival).
Cards come back only when at least one pairing is Observed or Confirmed.

## 6. Hero Database page changes

1. Rating "N/A": hide it (Nidhogg has no entry in `hero-ratings.json`); when a rating
   exists, put it inside the verdict card instead of the banner.
2. Core Mechanic moves to the top, directly under the banner (now below the ratings panel).
3. Tag chips: currently unexplained ("Self Atk Up", "Area Damage", sliced to 6). Phrase as
   "Brings: ..." or add a one-line explanation.
4. Skills: one-line summary per skill, full text collapsed.
5. Stats: all 8+ non-zero stats get equal weight today; highlight only best and worst
   (rank based, logic exists in `[id].astro` `rankOf`).
6. Add a verdict card ("Fazit") with link to the guide.

## 7. Own combat tests are kept

Transform at about 13-16 s, dragon lifetime per mode (Tower 721 about 11-12 s, World Boss
about 44 s, some Odyssey/Alliance Boss fights until the end), human death 1.1-5.6 s after
dragon death, team damage share 87-97% in good fights. All labelled
"Observed, not guaranteed".

## 8. Validation plan (later, not part of this task)

Usability test, 5-8 players. Tasks: F2P build decision, relic target, mode choice, damage
problem diagnosis, find skill values. Measure solve rate, time, misreadings. Word targets
in section 3 are starting values and get adjusted by the results.

## 9. Verified / Deviations

Every claim of the brief was checked against the files. Differences:

| Brief assumption | Finding |
|---|---|
| `ratings` field on hero | Not in `nidhogg.json`. Ratings come from `src/data/ratings/hero-ratings.json`; Nidhogg has no entry, so the page shows "N/A" in the banner and in all tiles. Confirmed. |
| `relicBreakpoints` field | Does not exist in `nidhogg.json` (only named in PROJECT_MEMORY.md). Relic breakpoints are derived from `relic.upgrades`. |
| `recommendedRelicLevel` | Exists, value 30. Not displayed on the hero page or guide. `invest.json` (shown as "Investment" tab) has no Nidhogg entry, so that tab is absent. |
| `f2pInvestment` | Exists in JSON, but is rendered by neither page (hero page has no reader for it; guide hard-codes similar prose). |
| `content-creator` | Does not exist in `nidhogg.json`. |
| `coreMechanic` | Exists (`summary`, `depthRating: high`, `commonlyMisunderstood: true`). Rendered on the hero page below the ratings panel. |
| `synergies` tags | 13 tags, not 6; the hero page slices to 6 after dedupe, so the chips shown are an arbitrary subset. |
| `synergyPartners`, `synergyLinks` | Both empty. Supports the "No confirmed teammates yet" rule. |
| `virtueSets` | Contains one empty placeholder entry (label "", no virtues). `[id].astro` checks `virtueSets.length > 0`, so a "Virtues" tab and an empty panel likely render on the live page. Not fixed here (no live changes); worth a separate fix. |
| "Evidence status" vocabulary | Guide uses chip classes `observed / inferred / nodata` and labels "Observed", "From his mechanics", "No hero confirmed". `inferred` class is used for text labelled "Observed" (guide PvE rows). Mapping in EVIDENCE_MODEL.md. |
| Mode "Campaign", "PvP" | WRONG in the first draft: I wrote "Not tested" because the old guide had no such data. The battle logs in `fights/session_nidhogg_20261102_162736` (gitignored; summary in `fights/reports/nidhogg_guide_handoff.md`) hold 19 fights: Odyssey 50-42 x2 (2 wins), Tower 718-721 x12 (3 wins), Alliance Boss x1, World Boss x1, friend battles (PvP) x3 (1 win). The redesigned guide now uses them; PvP is no longer "Not tested" but n = 3. |
| Mode names | "Alliance Boss" in earlier notes is the Mindsea Nightmare boss (replayable); "World Boss" is a Torment Rift boss (rotating). Corrected in the guide (handoff 2026-11-03). |
| Tower and campaign counts | Handoff 2026-11-03: 49 Nidhogg fights = 15 Odyssey sub-fights (all won), Tower 718-720 x6 (3 won), Tower 721 x18 (0 won), Nightmare boss x6, Torment Rift boss x1, PvP x3. 9 fights ended before any transform. Odyssey logs hold 32 sub-fights; only 15 contain Nidhogg. |
| Level suppression | New in the guide (game code, Odyssey and Tower only). Explains why campaign (~95 levels behind) is easy and Tower 721 (267 behind, caps) is not. |
| Zeus comparison | New in the guide. Only the clean swaps count (Nightmare boss, Tower 721). My earlier "team share next to Zeus" numbers from raw events were removed; they were not clean comparisons. |
| Dropped own calculation | "~40x dragon vs human damage per second" was my own computation and is no longer in the guide; the handoff states the dragon deals 90-96% of his damage. |
| Old guide stats vs logs | "87-97% damage share in good fights" held in only 6 of 19 fights (87-98%); World Boss was 11%. "Transform 13-16 s": 15 of 19 fights (casts 13.2-16.2 s); 4 fights never transformed (two PvP losses, Tower 719, Tower 720). Logs say the full-Energy moment can be as early as 11.0 s. |
| "Public rating: Lower mid-tier" | Community statement (TapTap, 12 Aug 2026) shown in the guide's fact strip without a source label; the final Verdict does name the source. |
| Guide has 10 sections | Counted: Glance, Engine, Plays Out, Skills, Relic Investment, Strengths/Weaknesses, Team Building, PvE or PvP, Build/Battle Plan/Counterplay, Verdict = 10. Confirmed. |
| Rating "N/A" in two places | Banner and overall tile on the hero page; confirmed in `[id].astro` lines 224 and 279. |

Combat numbers in section 7 were re-checked against `fights/.../HERO_ANALYSIS.json` and
`fights/reports/nidhogg_mechanics.md` (transform casts, result, length, share). Dragon
lifetimes (~11-12 s, ~44 s) and the 1.1-5.6 s window are taken from the handoff report;
the per-fight JSON has no dragon-death event, so they were not recomputed. All numbers
come from one account at one investment level.
