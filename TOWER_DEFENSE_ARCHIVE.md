

## Roadmap M7: Remove the ratings from the hero and hero selection (done September 25, 2026)
- i dont find them very helpful and i dont think we should display them.
- Done (September 25, 2026): the recruit sheet was the only place showing tiers. Hero cards lost their tier badge (`.td-tier` styles removed, card grid now two columns) and the preview line reads "Class - cost gold". `tier` stays in `gameBalance.json` because it still sets ultimate power (`tuning.tierUltPower`); players just don't see it.
