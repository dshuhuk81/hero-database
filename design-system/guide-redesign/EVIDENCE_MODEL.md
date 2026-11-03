# Evidence Model

Every claim in a guide carries one of four statuses. A status describes how we know,
not how good the claim is.

| Status | Meaning | Typical source | Shown as |
|---|---|---|---|
| Confirmed | Stated in game data or skill/relic text | `src/data/heroes/*.json`, game client dumps | solid border badge "Confirmed" |
| Observed | Seen in our own combat tests. Not guaranteed to repeat | Own fights (tower, boss runs) | half-dashed badge "Observed" + note "not guaranteed" |
| Community | Statement from third parties, source and date named | TapTap, Bilibili, NGA, other guides | outlined badge "Community" + source |
| Untested | Nobody checked it, or it is derived from mechanics only | Reasoning from skill text, no test | dotted badge "Untested" or "Not tested" |

## Rules

1. One badge per claim line, never per section. Lines from the same source (e.g. the
   relic breakpoint steps, all from relic text) may share one badge on the group header.
   Badges stay short (status word only); source and date go into the label text next to it.
2. A number without a status is not allowed in a guide.
3. "Observed" always names the context (e.g. Tower 721, World Boss) and says
   "not guaranteed". Sample size is stated when known.
4. Community statements always name source and date and are never merged with our own
   rating. If we have no rating, say "No rating yet", not an average.
5. Plausible but unproven explanations are Untested and labelled "Interpretation"
   (battle-log handoff: category B). "Observed" = category A. Never present B as A.
   Guide badge: `<EvidenceBadge status="untested" label="Interpretation" />`.
5a. Battle-log claims name mode, level gap (level suppression) and team, and say "on our
   test account" (one account, heroes level 444, Auto, Global 2.3.8). No absolute damage
   numbers; ratios, shares, times and counts only.
5b. Game-code facts (e.g. level suppression from the client scripts) are Confirmed with
   the label "Confirmed (game code)", not Observed.
6. A claim is promoted only by a new test or new data, and the change is dated.
7. Missing data is written "Not tested", never left blank and never guessed.

## Mapping to existing chip classes (components.css)

| New status | Existing class | Note |
|---|---|---|
| Confirmed | none | new |
| Observed | `guide-evidence-chip--observed` | existing label text is fine |
| Community | none | new |
| Untested | `guide-evidence-chip--nodata` (and `--inferred` for derived) | the guide currently labels derived claims "From his mechanics" and some Observed claims with `--inferred`; unify |
| Interpretation | new in `guide-v2.css`: `gx-ev--interpretation` (dotted, ring dot, neutral colour) | category B of the battle-log handoff; has its own badge and is explained in the guide legend (`EvidenceLegend.astro`) |

## Nidhogg examples

| Claim | Status |
|---|---|
| Transform clears buffs, +40% ATK/Max HP per cleared buff, up to 3 | Confirmed (skill_1) |
| Dragon Form ends when Energy is depleted or dragon dies | Confirmed (skill_1 text and coreMechanic) |
| Transform arrives about 13-16 s into a fight | Observed |
| Dragon lived about 44 s in World Boss | Observed |
| Lower mid-tier, skip on tight resources | Community (TapTap, 12 Aug 2026) |
| Whether Energy support moves the transform earlier | Untested |
| Whether ally shields and heals target the dragon | Untested |
| Additive vs multiplicative stacking of Wrath and the +15% windows | Untested |
