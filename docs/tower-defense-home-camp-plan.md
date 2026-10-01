# Tower Defense home screen: War Camp plan

Status: home screen built September 30, 2026 on branch `tower-main-home-screen` (steps 1-8 below; the background still needs its R2 upload). Phase 2 first step built the same day (see "Phase 2 as built"). The reference prototype (`menu-concept.astro`) and its concept image were deleted once the screen was in place.

## Goal

Replace the current card-grid main menu (`data-td-screen="home"` in `src/components/td/TdLobby.astro`) with a full-bleed scene menu: camp artwork fills the screen, controls float on the edges, one big Play button in the middle-right. Styling follows `design-system/STYLE_GUIDELINES.md` and the existing `td.css` tokens, not the prototype's inline colors.

## Layout (landscape)

```text
┌────────────────────────────────────────────────────────────────┐
│ [crest] Title          ( Favor · Seals  + )        [⚙]        │  top bar
│                                                                │
│ ▌Current objective                                   [Campaign]│  mode rail
│ ▌Stage 2-2 name                                      [Daily  1]│  (right edge,
│ ▌━━━━━━───────                                       [Exped.  ]│   selected one
│                                                      [Free    ]│   expanded)
│                      CAMP SCENE                                │
│                                          (▶) PLAY              │
│                                              Stage 2-2         │
│                                                                │
│      [Heroes] [Summon 1] [Blessings] [Glossary] [Help]   Exit  │  dock
└────────────────────────────────────────────────────────────────┘
```

| Prototype element | Becomes | Data source |
| --- | --- | --- |
| Profile crest + "Commander Lv. 27" | Game title crest only ("Tower Defense"). No player level. | none (no account level exists) |
| Wallet pill (403 / 1,545 / +) | Existing global wallet (`wallet.ts`): Favor + Divine Seals chips, button opens inventory panel. | `wallet.ts` |
| Messages button | Dropped. | no inbox exists |
| Settings button | `data-td-go="settings"` | `nav.ts` |
| "Review concept" chip, "Selected" box | Dropped (prototype only). | |
| Current objective | Next campaign stage + chapter progress bar. Falls back to Daily Trial when campaign is finished. | `campaign.ts` (`nextStage`, `chapterLaurels`) |
| Mode rail (4 medallions) | Campaign, Daily Trial, Expedition, Free Play. Selecting one changes the Play target and the scene subtitle; does not navigate. | summaries already rendered for current home cards (`campaign.ts`, `daily.ts`, `expedition.ts`, `renderLobby`) |
| Mode badges | Daily: "1" when today's trial not yet cleared. Others: none for now. | `daily.ts` |
| Play button | Launches the selected mode (see Navigation). Kicker shows its context: "Stage 2-2", "Today", "Stage III", "Best 155,868". | per mode |
| Dock | Heroes, Summon, Divine Blessings, Glossary, How to play. | `data-td-go` |
| Armory, Bestiary | Left out (owner decision). | |
| "Current menu" exit | "Exit to database" link (`/`). | |
| Rotate cover | Dropped; the existing orient gate (`orient.ts`) already covers phones in portrait for every screen. | |

Dock badges: Summon shows a dot when a summon is affordable (`canSummon`), Heroes when any hero can level up (`canLevelUp`), Blessings when Favor covers the cheapest unbought node. Only real, actionable states; no decorative badges.

## Navigation changes

Current tree (`nav.ts` PARENT):

```text
home ─┬─ maps ─ mode ─ play           (Free Play)
      ├─ campaign ─┬─ stages ─ squad ─ play
      │            ├─ heroes
      │            └─ summon
      ├─ daily ─ play
      ├─ expedition ─ play
      ├─ blessings / help / glossary
      └─ settings ─ save
```

New tree:

```text
home ─┬─ [Play: Campaign]   → stages ─ squad ─ play
      │      run ends → back to stages; Back from stages → home
      ├─ [Play: Daily]      → daily ─ play
      ├─ [Play: Expedition] → expedition ─ play
      ├─ [Play: Free Play]  → maps ─ mode ─ play
      ├─ heroes             (dock, was under campaign)
      ├─ summon             (dock, was under campaign)
      ├─ blessings / glossary / help   (dock)
      └─ settings ─ save    (top bar)
```

Consequences:

1. **`campaign` hub screen goes away.** Its three activities (journey, heroes, summon) are now home elements (objective + Play, dock). Its "Your company" strip moves to the Heroes screen header or is dropped. `PARENT`: `heroes: "home"`, `summon: "home"`, `stages: "home"`. Remove `"campaign"` from `ScreenId`; old history entries with `tdScreen: "campaign"` fall back to `home` via `isScreen`.
2. **Play for Campaign opens the stage list** (owner decision), with the next uncleared stage preselected. Back from stages goes to home.
3. **`exitPlay` targets.** A campaign run returns to `stages` (owner decision): `exitPlay` maps `below === "squad"` to `stages`; `go("stages")` finds stages lower in the stack and goes back in history, so the stack becomes home → stages and Back from there reaches home. Result screen buttons (`results.ts` `tdToLobby = "campaign"`, two places) change to `stages`. Free Play still returns to `maps`, Daily and Expedition to their screens.
4. **Selected mode is state.** Persist the last selected mode in the save (`save.ts`, e.g. `ui.homeMode`), default Campaign for new players. Finishing a run sets it to that run's mode, so Play means "again / next".
5. **Home has no app bar.** `nav.render` hides `.td-appbar` when `id === "home"`; the camp top bar replaces it. Wallet element is shared: move the wallet node into the camp top bar on home and back into the app bar elsewhere (same move pattern as `panels.embed`), or render the wallet chips twice from `wallet.ts`. Recommend the move: one DOM node, one listener.
6. **Wallet chip rules** (`td.css` `data-screen` selectors) lose the `campaign` entry.
7. **Keyboard.** Mode rail is a radio group (arrow keys move and select, `role="radiogroup"`); Enter on the rail or Play launches. Escape on home stays a no-op. Autofocus goes to Play.
8. **Internal links** that target `campaign` (wallet panel links, result screen "Back", reward notes): grep `data-td-go="campaign"` and `go("campaign")`, point to `home` or `stages`.

## Art and assets

- Background: `public/td/concepts/camp-menu-bg-v1.png` moves to R2 as `td/ui/camp-home.webp` via `assets.js` (no files under `public/td/`, per M1-M4 decision). Keep a solid fallback color while it loads.
- Optional later: per-mode scene tint or a second layer (campfire flicker, banner sway) as CSS or PixelLab loops. Not in first pass.
- Icons: use the TD icon set already in `TdLobby.astro` (same paths as current home cards), not the prototype's.
- Fonts and colors: site tokens (`--accent-gold`, `--text-*`, `--td-fs-*`), no Georgia/Inter literals.

## Small screens

- Short landscape phones (667x375, 844x390): top bar 52px, rail medallions 42px, objective card collapses to one line, dock labels hidden below 400px height (icons + `aria-label` stay).
- Tablets portrait and desktop windows narrower than tall: objective and rail stack above Play, dock stays bottom. No scroll on home at any supported viewport.

## Implementation steps

All done September 30, 2026, except the R2 upload in step 1 (owner). Where the build differs from the plan text, see "As built" below.

1. Upload background to R2, add path to `assets.js`.
2. New component `src/components/td/TdHome.astro` (markup of the home screen), included from `TdLobby.astro` in place of the current home section. Styles in `td.css` under `.td-camp-home-*`.
3. New module `src/game/td/page/home.ts`: mode selection, Play target, objective, badges; wire through `ctx.actions` like the other modules. Move summary rendering for the four modes out of `campaign.ts` / `daily.ts` / `expedition.ts` home hooks into data these modules expose.
4. `nav.ts`: remove `campaign`, update `PARENT`, hide app bar on home, update `exitPlay`.
5. Remove the Campaign hub section and its styles; point result screen buttons at `stages`.
6. Save field for selected mode.
7. Tests: `npm run test:tower-defense`; manual pass at the viewports listed in `docs/tower-defense-ui-plan.md` (owner tests visuals).
8. Delete `menu-concept.astro` and the `public/td/concepts` image once live. Update `TOWER_DEFENSE_SPEC.md` and the UI plan status.

## As built (September 30, 2026)

- Background: `public/td/ui/camp-home.webp` (1672x941, WebP q80, about 300 KB, converted from the concept PNG) is the upload source, like the other R2 art kept under `public/td/`. `assets.js` exports `campHomeArt()` (`td/ui/camp-home.webp`); `home.ts` sets it on the scene, and `--bg-overlay` shows until it loads. Upload: `node scripts/upload-to-r2.mjs --prefix td/ui/`.
- Files: `src/components/td/TdHome.astro` (markup), `src/game/td/page/home.ts` (mode rail, Play, objective, badges), `.td-camp-home*` in `td.css`. `campaign.ts`, `daily.ts` and `expedition.ts` expose `homeSummary()` in place of the old home card hooks; `campaign.ts` also exposes `focusNextStage()` so Play opens the stage list on the next stage's chapter (its card has autofocus). `route.ts` keeps only `roman()`; the route rail markup and styles went with the home cards.
- Save: `ui.homeMode` (`"campaign" | "daily" | "expedition" | "free"`, default Campaign, sanitized in `sanitizeSave`). A run sets it when it starts (`session.ts`), so a quit run also counts; picking a mode on the rail sets it too.
- Wallet: one node, moved between the app bar and the home top bar by `wallet.place()` from the page's `onShow`. Its dropdown is capped to the home screen's height there and scrolls.
- Objective: not a button; Play is the one action. When every stage is cleared it shows the Daily Trial (cleared or not, with the reset time).
- Mode notes: Campaign "Begin 1-1" / "Continue 2-2" / "All stages cleared"; Daily "New trial" (badge 1) / "Cleared today"; Expedition "Not started" / "Stage II of III" / "Camp reward waiting"; Free Play "Best 155,868" / "No runs yet". The Play note under the button carries the stage name, today's battlefield with the reset countdown, lives left, or the Free Play map (the next-run shard boost when one is pending).
- Small screens: the menu frame keeps every landscape phone at about 390 logical px tall, so "short" means a frame up to 420px (slim bars, one-line objective). Dock labels drop only below 360px (frames under the zoom floor), since at 390 they fit and hiding them there would hide them on every phone. Portrait frames use `@container td-home (orientation: portrait)`.
- "Your company" strip: dropped with the Campaign hub.

## Decisions (owner, September 30, 2026)

1. Armory and Bestiary: left out.
2. Commander level / player profile: left out.
3. Play for Campaign: opens the stage list.
4. After a campaign run: back to the stage list; Back from there goes home.
5. Heroes and Summon: on the dock now. Making the collection count in every mode is Phase 2 below, planned but not started.

## Phase 2: one hero collection for every mode (first step built September 30, 2026)

### Problem

Today Free Play and Expedition give every player the full roster at base stats, while Campaign uses only owned heroes with their levels, Stars, Evolution and skill levels (`campaignHeroes` in `src/game/td/campaign.js`, applied only for campaign stages in `session.ts`). So Free Play already offers all content for free, and nothing earned in Campaign shows up anywhere else. With Heroes and Summon on the home dock, the split becomes even more visible.

### Target

One collection, owned and upgraded through Campaign, used by every mode except the Daily Trial.

| Mode | Heroes available | Upgrades applied | Rewards |
| --- | --- | --- | --- |
| Campaign | Owned, squad of `squadSize` | Yes | Gold, Hero XP, Seals (as today) |
| Free Play | Owned only | Yes | Favor (as today) plus a small share of Gold / Hero XP |
| Expedition | Owned only | Yes | Favor + Seals (as today) plus a small share of Gold / Hero XP |
| Daily Trial | Full roster, base stats (unchanged) | No | As today |

Daily Trial stays equal for everyone: it is the one mode that compares players on the same setup (`session.ts` already skips Favor there for that reason).

Campaign keeps its own reason to exist: it is the only place to unlock heroes through stage rewards and the main Seal source, and its stages are authored challenges. Free Play and Expedition become places where your collection matters and that feed back into it.

### Design questions to settle before building

1. **Balance of upgraded heroes in Free Play.** Levels and Stars scale attack and health many times over (levels to 60, Stars to 5, Evolution V). Free Play tiers are tuned for base heroes. Options:
   a. Apply upgrades and let difficulty tiers scale with squad strength (`heroMight`), so the best score still needs skill.
   b. Apply upgrades as they are, add harder tiers on top; high scores follow collection strength.
   c. Owned heroes only, base stats (collection matters, upgrades do not). Simplest, weakest link to Campaign.
   Recommendation: start with c as a first step, then a once `td:sweep` can measure it.
2. **Squad limit.** Campaign uses a squad of 6 picked before the run; Free Play recruits in-run from the whole deck. Free Play with all owned heroes in the deck, or a squad pick before the run too? Recommendation: whole owned deck, no squad screen, so Free Play stays quick to start.
3. **Divine Blessings (Favor).** They apply to Free Play and Expedition, not to Campaign. Keep that split, or let them apply everywhere? Keeping it avoids rebalancing Campaign stages.
4. **Rewards from Free Play and Expedition.** How much Gold / Hero XP, if any. Must not make new heroes faster to get (see summon progression decisions): no extra Seals beyond the current Expedition reward.
5. **Existing saves.** Players who only played Free Play have used all heroes; after the change they own only the 6 starters. Accept (fan project, small player base), or grant a one-time Seal gift on migration?
6. **Free Play maps.** Stay open from the start, or unlock with campaign chapters? Recommendation: stay open; the hero gate is enough.

### Implementation outline

1. Rename the save's `campaign` block concept to "collection" in code (`campaignHeroes` → `collectionHeroes`); keep the save key and add a migration only if the shape changes (`campaign.js` save check).
2. `session.ts`: build the hero list for Free Play and Expedition from the collection (owned filter, and upgrades per decision 1); Daily unchanged.
3. `recruit.ts`: deck shows owned heroes only; empty-state text when a class is missing.
4. Rewards: extend `results.ts` / `expedition.ts` with Gold and Hero XP per decision 4.
5. Wallet chip rules in `td.css`: Gold / Hero XP visible where they are earned.
6. Glossary and How to play: explain that heroes are unlocked in Campaign and summoned with Seals.
7. Balance: extend `npm run td:sweep` and `npm run test:td-balance` with owned-roster and upgraded-roster cases; retune Free Play and Expedition tiers.
8. Tests: `npm run test:tower-defense`; update `TOWER_DEFENSE_SPEC.md`.

Phase 2 is independent of the home screen work and can ship after it.

### Phase 2 as built (September 30, 2026)

Decisions taken (the plan's recommendations where it had one):

1. Balance: option c. Free Play and Expedition use owned heroes at base stats; upgrades stay Campaign only. Option a (upgrades plus tiers scaled by `heroMight`) is the next step once measured.
2. Squad limit: the whole owned deck in Free Play, no squad screen.
3. Divine Blessings: unchanged split (Free Play and Expedition only).
4. Rewards: `collectionRewards` in `tdCampaign.json`, 10 Gold + 5 Hero XP per cleared wave, up to 30 waves per run (a 10-wave run pays 100 + 50, about 40% of a campaign replay's rate per wave). No Seals. Expedition pays per stage, on top of its Favor and Seals.
5. Existing saves: no migration gift. An Expedition already in progress keeps its roster.
6. Free Play maps: stay open.

Implementation: `ownedHeroes()` and `collectionReward()` in `campaign.js` (`campaignHeroes` renamed to `collectionHeroes` in code and scripts; the save key stays `campaign`, no migration). `session.ts` passes the owned ids as Free Play's `allowedHeroes`; `page/expedition.ts` passes the owned heroes as the pool for `newExpedition` and the camp; `newExpedition` tolerates a pool with one slot type. `recruit.ts` shows an empty-state line when a tile type has no owned hero. `results.ts` pays the collection share for Free Play and Expedition (not Daily, Campaign or debug runs) and shows it under "For your heroes". Wallet: Gold chip also on the map select, run length and Expedition screens; the inventory group is "Hero collection". How to play has a "Your heroes" section; the Glossary's "Campaign upgrades" entry became "Hero collection".

Balance: starters only (gaia, fenrir, vidar, boreas, atalanta, asclepius), seed 99, Normal, cheapest / carry policy: Moonlit Pass L10 / W19, Verdant Crossing L8 / W2, Sunscar Ruins W5 / W17, Sunscar Basin W19 / W25. `test:td-balance` now requires at least one starter win on a Free Play battlefield; `td:sweep -- --owned=starters` adds the starter deck. Tiers were not retuned: a new player can win, and more heroes still help.

Open for the next step: decision 1a (upgrades in Free Play and Expedition with tier scaling), upgraded-roster cases in `td:sweep`, and a Free Play screen line showing how many heroes the player owns.

