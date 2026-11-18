# Ananke guide

Add `/guides/ananke` and its entry in `src/data/guides.ts`. This is an English hero guide for players deciding whether to invest in Ananke. Hades is outside the request.

## Approach

Extend the existing Nidhogg guide's components, typography, palette and responsive layout. A separate visual design would break the established guide family; a long article would hide the investment decision. Preserve existing shared components and hero data.

## Content

Approved with the owner's correction: this is a general information guide, not a presentation of battle data. Lead with the hero's role and investment considerations, followed by mechanics, relic stages, build functions and partner options, mode considerations, strengths and limitations, and sources. Use current `src/data/heroes/ananke.json` skill and relic text. The supplied battle reports are background for plausibility checks. Publish no test results, damage comparisons, fight counts, win rates or cast timings without the owner's separate decision. Present potentially valuable test findings to the owner separately. Show source confidence clearly. Never invent tier grades, duplicate requirements, stat targets or hidden synergies.

Use compact summaries, existing comparison bars and disclosures for skill upgrades and research detail. Link to the hero database and external sources. Preserve existing hero JSON edits. No new dependencies, production build or deployment.

## Verification

Run Astro checks, render the new route in the dev server, and inspect desktop and mobile for overflow, images, disclosures and section navigation. Verify source links and the guide-index entry. Record source-access gaps rather than claiming a complete comment review.
