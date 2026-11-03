# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Players of the mobile gacha game Motto Immortal, many of them free-to-play. They arrive for two jobs of about equal weight: looking up reference data (skill text, stats, relic effects, event dates, tier lists) and deciding how to spend scarce resources (which heroes, relics and totems to invest in, which team to run for campaign, tower, bosses). Most read on a phone.

## Product Purpose

A fan-made companion site that helps players explore heroes, compare ratings, plan upgrades and improve their teams. It brings together hero data, tier lists, guides, event schedules, summon calculators and equipment recommendations. A solo passion project; success is that players make better, faster decisions and trust what the site tells them.

## Positioning

Claims rest on evidence a neighbouring fan wiki could not copy: the owner's own recorded battle logs, a four-level evidence label on every claim, decision-first guides, and a data pipeline built on the Android game clients.

- Own recorded battle logs: guide statements come from recorded fights, labelled Observed (category A) or Interpretation (category B), for one test account.
- Evidence labels: Confirmed / Observed / Community / Untested, so readers see how sure each statement is.
- Decision-first guides: verdict and investment first, details on demand. Two roles: Hero Database (`heroes/[id]`) is the reference, Hero Guide (`guides/[id]`) is the judgement.
- Game-client data pipeline: release dates, events and hero art are extracted from the Android clients and validated before import (`tools/android/`, `npm run import:game-data`).

## Operating Context

- Content is game knowledge first, code second. Hero data lives in `src/data/heroes/*.json`; ratings in `src/data/ratings/`; generated client data in `src/data/generated/` (committed).
- Hero art needs a transparent background (hall backdrop sits behind it).
- Static Astro site on Cloudflare Pages; assets on Cloudflare R2.
- Recorded fights live in `fights/` (gitignored) with handoff reports in `fights/reports/`. Battle-log claims name mode, level gap (level suppression applies only to Odyssey and Tower) and team, and say "on our test account" (one account, heroes level 444, Auto, Global 2.3.8).
- The Tower Defense minigame "The Last Crossing" moved to its own repo and is not part of this project.

## Capabilities and Constraints

- Pages: hero list and detail pages, hero guides, tier list, bosses, Delusions Den, virtues, totems, summon calculator and calendar, events, hero upgrades, tips, design-system preview.
- Locale routes exist in the repo (de, es, ru, zh besides en); multilingual support was not confirmed as a design constraint.
- No invented game facts. Missing data is shown as "Not tested" or "No data", never guessed. No absolute damage numbers from battle logs; ratios, times and counts only.
- Rating tiers from third parties (e.g. TapTap) are labelled Community with source and date, never merged with our own rating.
- Open product decision: how the redesigned guide layout rolls out beyond the Nidhogg pilot (other guides stay as they are for now).

## Brand Commitments

- Name: Motto Immortal Database. Fan project by a solo developer, not affiliated with the game's publisher; never imply it is official.
- The user said the guides must not read as a wall of text: precise and on point, with a strong visual language.
- A positioning answer marked "Other" was given without text and is not recorded.

## Evidence on Hand

- Hero data: `src/data/heroes/` (75 hero files), centralized ratings in `src/data/ratings/hero-ratings.json`.
- Battle logs: `fights/session_nidhogg_*` and `fights/session_zeus_*`; handoff `fights/reports/nidhogg_guide_handoff_2026-11-03.md`, `nidhogg_vs_zeus.md`, `nidhogg_mechanics.md`.
- Guide redesign analysis: `design-system/guide-redesign/` (ANALYSIS, EVIDENCE_MODEL, CONTENT_MAP).
- Not on hand: our own tier ratings for most heroes (Nidhogg has none), usability test results, user analytics findings.

## Product Principles

1. Decision first, action second, details on demand.
2. Every claim shows how we know it (Confirmed, Observed, Community, Untested); missing data stays visible as missing.
3. Two roles, no overlap: the database states facts, the guide gives judgement.
4. Context with every battle result: mode, level gap, team, test account.
5. Phone first: useful at 375 px without horizontal scroll.

## Accessibility & Inclusion

Mobile-first at 375 px with no horizontal scroll. Evidence status must not rely on colour alone (badges also differ by dot shape).
