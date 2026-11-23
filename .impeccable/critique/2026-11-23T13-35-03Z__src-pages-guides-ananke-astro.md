---
target: src/pages/guides/ananke.astro
total_score: 22
max_score: 36
na_heuristics: 9
p0_count: 0
p1_count: 3
target_identity: "file:/Users/daschultheiss/Downloads/Sites/hero-database/src/pages/guides/ananke.astro"
target_fingerprint: "sha256:f85225b1cb296bcede3f3015260f85131a55814812fdd83bb1cdba3bb70f88c6"
target_path: /Users/daschultheiss/Downloads/Sites/hero-database/src/pages/guides/ananke.astro
timestamp: 2026-11-23T13-35-03Z
slug: src-pages-guides-ananke-astro
---
Method: dual-agent (A: design review sub-agent, B: detector + browser sub-agent)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Sticky section nav highlights section; 9 links overflow sideways at 390 |
| 2 | Match System / Real World | 3 | Kill participation, Gap 269, Lv1-Lv4 name effect stages unexplained |
| 3 | User Control and Freedom | 3 | Skill explorer + back links work; long sections not collapsible |
| 4 | Consistency and Standards | 2 | Old colour-only guide-evidence-chip vs EvidenceBadge; good/bad mode cards identical; Next tests pills look like links |
| 5 | Error Prevention | 2 | F2P "No high priority" ~9000px down; "Strong on paper" can be misread as a buy signal |
| 6 | Recognition Rather Than Recall | 2 | Mobile skill selector icon-only; duel chart has no axis |
| 7 | Flexibility and Efficiency | 2 | No skim path; verdict not on top, nothing collapses |
| 8 | Aesthetic and Minimalist Design | 2 | Raw game text outranks guide judgement; repeated how-to-read notes; 70-word run-on |
| 9 | Error Recovery | n/a | No inputs |
| 10 | Help and Documentation | 3 | How-to-read and Next tests explain method |
| Total | | 22/36 | Acceptable (61%) |

## Design Specificity Verdict
Content is product-specific (fight timings, Tower 725 gap 269, duel chart, honest open questions); structure is the generic old guide template with identical centred H2 + flourish per section. Next to the Nidhogg pilot it reads as an essay in cards.
Deterministic scan: CLI clean (0) on ananke.astro + GuideSectionNav, StrengthWeakness, SupportStrip. Browser detector 68 (390) / 66 (1280): low-contrast 31-35 (3.7-3.9:1 muted text in heket-engine, breakpoint, mode cards), tiny-text 33 (11px guide-skill-panel-takeaway, guide-function-note), undersized-ui-text 13 (10px skill badges, Lv labels), line-length 4 at desktop (97-209ch), straggler 6, nested-cards 1. False positives: 9px mobile nav and dark-glow (site chrome), overused-font Inter (deliberate), kicker-above-heading (documented pattern), cyan gradient (faction accent).

## Priority Issues
- [P1] Decision comes last: verdict ananke.astro:269 and F2P line :253 at bottom of 10,729px page. Fix: VerdictCard on top with evidence-tagged stats; end section becomes recap. Command: /impeccable layout
- [P1] Most claims unlabelled: only 4 mode cards carry colour-only Observed chip. Fix: EvidenceBadge across takeaways, relic breakpoints, Mark Cycle, team notes, stat map, investment, verdict. Command: /impeccable clarify
- [P1] Mobile skill buttons have no accessible name: components.css <=720px hides `.guide-skill-selector button > span` (display:none), img alt="" (ananke.astro:138); shared across guides. Fix: visually-hidden name or aria-label, short visible name, tabs pattern. Command: /impeccable harden
- [P2] Wall of text / inverted hierarchy: raw skill text 13px primary vs In practice 11px secondary; 70-word team note; mode card text ~3.7:1; positive Odyssey card looks like failures. Fix: details/link for raw text, promote takeaway, hero-chip lineups, ModeRow, secondary text colour. Command: /impeccable distill
- [P2] Battle context incomplete: no per-mode sample size, "high share" vague, no gap for Odyssey/Alliance Boss, Lv 446 vs account 444, no test-account/Auto/version line, chart unscaled. Fix: per-mode n + gap, measured ratio or No data, confidence line, axis label; verify 444/446 in fights/. Command: /impeccable clarify

## Persona Red Flags
- Casey: 9 screens to verdict; nav cut off; unlabelled skill icons; 15/34 tap targets under 44px (guide-back 33.5px, chip links 26.5px).
- Jordan: unexplained jargon; Mode talents with no action; Next tests pills look tappable.
- Sam: nameless skill buttons; colour-only evidence chips; ~3.7:1 body text.
- F2P investor: F2P line buried and unlabelled; relic cost missing; 9 team heroes with no "if you only own X".

## Minor Observations
- `--weight-regular` (components.css:4319) is undefined; token is --weight-normal.
- Inline styles and scoped style block (:296-325) against project rule.
- Dead `suppression` array (:40-45).
- "12 s" vs "12.7 s".
- Uniform H2 + flourish, no rhythm.
- "Zeus dealt far more" lacks ratio.
- Site footer "@GOAT Games. All rights reserved." could read as official.
- Desktop verdict card ~300px empty right.

## Questions to Consider
- Does a low-priority, unproven hero need 9 sections, or a one-screen "Not yet" card?
- What if every claim were a chart like the duel chart?
- Why does a judgement guide give its largest text to the game's own skill description?
