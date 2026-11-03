# Content Map - nidhogg.astro

Actions: KEEP = stays as is, CONDENSE = shortened, MOVE = goes to another place,
REMOVE = dropped (information survives elsewhere or was duplicate).
New sections: 01 Verdict & Investment, 02 Where he works, 03 Build & Investment,
04 How he works, 05 Testing & Details.

| # | Current section | Player question it answers | Action | Target | Reason |
|---|---|---|---|---|---|
| 1 | Nidhogg at a Glance (verdict, fact strip, key warning) | Is he worth building? | CONDENSE | 01 | Cut to 60-100 words, add confidence line, label the community rating |
| 2 | The Dragon Engine (4 steps, return arrow, 2 rule boxes) | How does his kit work? | CONDENSE | 04 | Reduce to 3 steps: Energy, Transform, hold Dragon Form. Numbers stay in Hero Database |
| 3 | How Dragon Form Plays Out (4 test tiles) | How reliable is the dragon? | MOVE | 05 (accordion) | Own tests, badge Observed; one summary line stays in 01 |
| 4 | Skills: What They Mean (skill explorer, upgrades, relic panel) | What do the skills say? | REMOVE (duplicate) | Hero Database skills | Full text is already on `heroes/[id]`; "In practice" lines become 1-line summaries there. Guide links to it |
| 5 | Relic Investment (4 tiles + takeaway) | What does the relic add, what do I invest? | CONDENSE | 03 | Keep breakpoints as short rows; separate unlock (Lv3/Lv4), target (30), priority (Low, Community) |
| 6 | Strengths & Weaknesses | What is good and bad? | MOVE | 05 and 02 | Strengths merge into 04/02, weaknesses into 05 limits; items repeated in other sections are dropped |
| 7 | Team Building (3 function cards, all "No hero confirmed") | Who goes with him? | CONDENSE | 03 | One line "No confirmed teammates yet" plus planned test |
| 8 | PvE or PvP? (4 mode cards) | Which mode? | CONDENSE | 02 | One row per mode with evidence badge: PvE, PvP, Boss, Campaign |
| 9 | Build, Battle Plan & Counterplay: Position | Where do I place him? | CONDENSE | 03 | One line, badge Untested (derived) |
| 9 | ...: Damage & Energy (stat map) | Which stats help? | CONDENSE | 03 | Short stat list tied to skills |
| 9 | ...: If it goes wrong (diagnose table) | Why does it fail? | MOVE | 05 | "Symptom -> cause" rows kept, inside an accordion |
| 9 | ...: Documented interference (chips) | What shuts the form down? | MOVE | 04 | Merged into the mechanic diagram (exit conditions) |
| 10 | Verdict (end of page) | Is he worth it? (again) | REMOVE | 01 | Duplicates the first section; open questions move to 05 |

## Result

- 10 sections -> 5; duplicated questions "worth building?" (1, 10), "which mode?" (6/8),
  "what does the relic do?" (4, 5) are answered once.
- Nothing is lost that is not in `nidhogg.json` or the observation list in 05.

## Hero Database (`heroes/[id].astro`) - changes mapped

| Current element | Action |
|---|---|
| Banner rating "N/A" | REMOVE when no rating; show inside verdict card when present |
| Tag chips (6 of 13, unexplained) | CONDENSE as "Brings: ..." |
| Tier Ratings panel with all-N/A tiles | REMOVE tiles without data; keep explanation line |
| Core Mechanic (below ratings) | MOVE to top, under banner |
| Skills (all text open, tabbed) | CONDENSE: 1-line summary, full text collapsed |
| Stats (all non-zero, equal weight) | CONDENSE: highlight best and worst |
| Virtues (empty placeholder set) | REMOVE empty entry (data fix, separate task) |
| (missing) Link to guide | ADD verdict card with guide link |
