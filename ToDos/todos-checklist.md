# Checklist
Please update each step if its done.

1)
Done: Yes
Progress: Implemented on 2026-05-08. Events now uses the shared Accordion component for campaign navigation and switches campaign slides from the accordion.
We should apply the accordion component that is used in guides and bosses.astro into events.

2)
Done: Yes
Progress: Checked on 2026-05-08. Not duplicate from a user perspective: "At a Glance" is a compact summary of six key stats near the profile, while "Combat Statistics" is the full grouped stat reference after skills.
Hero Detailpage (id.astro) has "At a Glance" which is I suppose a summary of stats, but the real stats are coming directly after skills -> is that considered duplicate content? No action needed other than checking if thats duplicate from a user perspective or needed.

3)
Done: Yes
Progress: Updated on 2026-05-08. Calculator hero portraits now use a higher-focus crop so faces are visible on desktop and mobile.
calculator.astro
The hero images are way too high set maybe with the background-position attribute. Users dont see the face of the heroes.

4)
Done: Yes
Progress: Implemented on 2026-05-08. Calculator now has tab navigation: the first tab keeps the skill value calculator, the second embeds the level gap damage calculator content without its page header.
calculator.astro
We should intgrate a tab navigation here to switch between contents. 1st content is the actual calculator.astro content,
2nd content should be the content on the damage-calculator.astro (without the header).

5)
Done: Yes
Progress: Implemented on 2026-05-11. Added permanent redirects in vercel.json for `/heroes/cashien` and `/heroes/cashien/` to `/heroes/caishen/`.
Google indexing: Add 301 redirect for the typo URL `/heroes/cashien/` to `/heroes/caishen/` (and non-trailing variant).

6)
Done: Yes
Progress: Implemented on 2026-05-11. Summon Calendar no longer links Far-Future entries to `/heroes/...` unless a hero detail page exists (prevents internal 404 link targets).
Google indexing: Remove/disable internal links to non-existent hero pages in the Summon Calendar (far-future entries like `eden`, `hades`, `heket`, `nepthys`).

7)
Done: No
Progress: Pending manual action. In Google Search Console: Sitemaps -> submit `https://motto-immortal.vercel.app/sitemap-index.xml`, then URL Inspection -> "Request indexing" for `/`, `/heros/`, `/bosses/`, `/tips/`, `/summon-calendar/` (and optionally 3-5 top hero detail pages).
Google indexing: In Google Search Console re-submit `sitemap-index.xml` and request indexing for key hub pages (home, `/heros/`, `/bosses/`, `/tips/`, `/summon-calendar/`).
