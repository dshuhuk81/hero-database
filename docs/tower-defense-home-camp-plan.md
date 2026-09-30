# Tower Defense home screen: War Camp plan

Status: plan, September 30, 2026. Reference prototype: `src/pages/games/tower-defense/menu-concept.astro` (layout and interaction only; icons, font and colors there are placeholders).

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
| Armory, Bestiary | Not built. No equipment feature exists; Bestiary content lives in Glossary (enemies section). See open questions. | |
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
home ─┬─ [Play: Campaign]   → squad (next stage) ─ play
      │      stages reachable from squad ("All stages") and from objective card
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
2. **Play for Campaign skips a level.** Home → squad screen of the next uncleared stage (squad already knows its stage). Squad gets an "All stages" link to `stages` for replays. Back from squad returns to home (stack-based `parentOf` already handles this).
3. **`exitPlay` targets.** Today a campaign run returns to `campaign` via `below === "squad"`. Change to `stages`? No: return to `home` so the new objective and Play are the next step. Free Play still returns to `maps`, Daily and Expedition to their screens.
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

1. Upload background to R2, add path to `assets.js`.
2. New component `src/components/td/TdHome.astro` (markup of the home screen), included from `TdLobby.astro` in place of the current home section. Styles in `td.css` under `.td-camp-home-*`.
3. New module `src/game/td/page/home.ts`: mode selection, Play target, objective, badges; wire through `ctx.actions` like the other modules. Move summary rendering for the four modes out of `campaign.ts` / `daily.ts` / `expedition.ts` home hooks into data these modules expose.
4. `nav.ts`: remove `campaign`, update `PARENT`, hide app bar on home, update `exitPlay`.
5. Remove the Campaign hub section and its styles; add "All stages" to the squad screen.
6. Save field for selected mode.
7. Tests: `npm run test:tower-defense`; manual pass at the viewports listed in `docs/tower-defense-ui-plan.md` (owner tests visuals).
8. Delete `menu-concept.astro` and the `public/td/concepts` image once live. Update `TOWER_DEFENSE_SPEC.md` and the UI plan status.

## Open questions

1. **Armory and Bestiary.** Neither exists. Options: drop from dock (recommended for now), or Bestiary = direct link to Glossary's enemy section. An Armory needs a whole equipment system; separate decision.
2. **Commander level / player profile.** The concept shows one; the game has none. Drop, or plan a profile (total stars, stages cleared) later?
3. **Play for Campaign:** straight to squad of the next stage (recommended), or to the stage list?
4. **After a campaign run:** back to home (recommended) or to the stage list?
5. **Heroes and Summon on the dock** means they are no longer framed as campaign-only. They still only matter for Campaign (Free Play uses the full roster). OK, or show a short "Campaign" label on those screens?
