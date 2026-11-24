---
target: src/pages/bosses
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/daschultheiss/Downloads/Sites/hero-database/src/pages/bosses"
timestamp: 2026-11-24T07-58-18Z
slug: src-pages-bosses
---
Method: DEGRADED, no browser tool (A and B ran as isolated sub-agents; source and CSS review only).

Score 24/40 (Acceptable). Heuristics: 1=3, 2=3, 3=3, 4=2, 5=3, 6=2, 7=2, 8=2, 9=2, 10=2.

Specificity: data layer authored for the product; mechanics section is a stock icon+label card grid. Detector: 0 findings.

Priority issues
- [P1] Mechanic tiles all gold: `--mech: var(--accent-gold)` on `.encounter-mechanic-tiles li` (bosses.css:407) beats `[data-mechanic]` rules (413-419). Defense label #406a5f is 3.2:1 at 11px. colorize.
- [P1] Mechanics cards generic: no severity order, counter or evidence label. distill, clarify.
- [P2] Heavy header; Teams after fight plan; anchor nav not sticky. layout.
- [P2] Mechanics duplicate skill chips; regex category fallback misfires (bossRewards.js). harden.
- [P3] Index fact badges icon-only, no per-boss verdict. clarify.

Personas: Casey (wrapping non-sticky nav, tall cards, hover-only badge titles), Jordan (unexplained jargon, identical cards), Sam (contrast, colour-only chips, inline onerror).

Minor: 10-11px labels; focus-visible gaps on .encounter-sections a/.encounter-more unverified; 375px overflow unverified; no next-boss link.
