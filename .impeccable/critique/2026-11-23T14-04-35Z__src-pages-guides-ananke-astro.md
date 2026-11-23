---
target: src/pages/guides/ananke.astro
total_score: 23
max_score: 36
na_heuristics: 9
p0_count: 0
p1_count: 2
target_identity: "file:/Users/daschultheiss/Downloads/Sites/hero-database/src/pages/guides/ananke.astro"
target_fingerprint: "sha256:2f100536175409cf82054d5365bb3a44919de3860d6be0212dd940bc241d0535"
target_path: /Users/daschultheiss/Downloads/Sites/hero-database/src/pages/guides/ananke.astro
timestamp: 2026-11-23T14-04-35Z
slug: src-pages-guides-ananke-astro
---
Method: dual-agent (A: design review sub-agent, B: detector + browser sub-agent). P0 from A (numbers unsupported by evidence doc) verified against git history: all were published by the owner on 2026-11-18 (77dba343, 651ad04c), after the 2026-11-13 doc; downgraded to P2 records issue.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Nav/selector state fine; no evidence status per claim (deferred) |
| 2 | Match System / Real World | 3 | sub-fights, Might, kill participation, vague "No high priority" |
| 3 | User Control and Freedom | 3 | Back link, sticky nav, details |
| 4 | Consistency and Standards | 2 | No FightRecord; v1 guide-diagnose inset; MechanicFlow wraps 3+1 at 1280 with orphan arrow |
| 5 | Error Prevention | 2 | Odyssey 14/15 vs Low priority not reconciled |
| 6 | Recognition Rather Than Recall | 2 | Skill names in Stats before Mechanic; icon-only mobile selector |
| 7 | Flexibility and Efficiency | 3 | Nav, details, DB link |
| 8 | Aesthetic and Minimalist Design | 2 | 7 grey hedging notes; Low tile repeats verdict; paragraph team rows |
| 9 | Error Recovery | n/a | No inputs |
| 10 | Help and Documentation | 3 | Confidence line, next tests; no evidence legend (deferred) |
| Total | | 23/36 | Acceptable (64%) |

## Deterministic scan
CLI clean (0) on page + 7 imports. Browser detector 9 (390) / 3 (1280), down from 68/66. Guide: ai-color-palette on .gx-verdict (pilot faction gradient, likely intended). Chrome: 9px mobile-label (real), mobile nav 3.8:1, footer 4.49:1, stragglers in support strip/footer, overused-font Inter (deliberate), unattributable dark-glow. Measurements 390: no overflow, 7852px tall (was 10729), no heading skips, guide tap target under 44: gx-badge-link 24.5px; skill button names run together ("DemiseSkill").

## Priority Issues
- [P1] Mobile verdict below the fold: banner ~600px + ~100px gap; LOW PRIORITY at ~860px on 844px viewport. Fix: shorter mobile banner (shared), remove gap, optional verdict line in banner. /impeccable layout
- [P1] Battle context incomplete: Odyssey no level gap; PvP never names Ananke's team; no client version; win bar labelled "Death 23.7 s". Fix: mode/gap/team meta per row and duel panel; version in confidence line (owner data needed). /impeccable clarify
- [P2] Pilot inconsistency + defects: no FightRecord for approved counts; v1 diagnose inset; MechanicFlow 3+1 wrap at 1280; Build/Needs overflow 36px gx-row-ico (also Nidhogg); skill h3 weight 400; Ultimate badge leaf green. /impeccable polish
- [P2] Evidence doc stale: page numbers published 2026-11-18 not recorded in doc; "90, 75, 90 s" vs captures 92.2/75.4/92.2 (gameplay ~73 for run 2). Fix: record the 11-18 decision, confirm 75 vs 73, point code comment there. /impeccable clarify
- [P2] Hedging prose: 7 grey notes + paragraph team rows. Fix: collapse into badges later; merge Build notes now; team rows to hero chips. /impeccable distill

## Persona Red Flags
- Casey: verdict below fold; ~700px duel panel; icon-only skills; 24.5px DB chip.
- Jordan: unexplained Mark, True DMG, level suppression, sub-fights, Might, stage 5115; skill names before Mechanic.
- Sam: no evidence status (deferred); banner badges announce twice (alt + text); skill names run together; 11px duel labels.
- F2P: "No high priority" without alternative; "test relic Lv4" asks to spend; Odyssey 14/15 vs Low unreconciled.

## Minor Observations
- Inline style= for dynamic banner/flow icons/bar widths; bar width could be a custom property.
- guide-body--heket leftover; parked suppression array.
- "Skill 1 - Ultimate" hyphen; "Meret or Idunn" in one chip.
- Desktop duel bars ~900px wide.
- Diamonds cyan dominates; gold nearly absent.
- ~200px dead space after links.

## Questions to Consider
- Does Low priority hold given Odyssey 14/15?
- One-line spender advice instead of four rows?
- Mechanic before Build?
