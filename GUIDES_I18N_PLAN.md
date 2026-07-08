# Guides I18N Plan

## Goal
Translate `/guides` pages (currently English-only) into de/es/ru/zh, same pattern as tips/events/heroes.

## Pattern (established, reuse exactly)
- Per-component `c = { key: { en, de, es, ru, zh } }` object of `LocalizedString` (see `src/i18n/helpers.ts`).
- Read via `pickLang(c.key, locale)`.
- Page/component accepts `locale?: Locale` prop, default `defaultLocale`.
- `src/pages/[locale]/guides/{slug}.astro` thin wrapper: `getStaticPaths` over `locales.filter(l => l !== defaultLocale)`, renders base page with `locale` prop.
- Register route in `src/i18n/config.ts` `localizedRoutes` set (or detail-route regex like `isLocalizedHeroDetailRoute`).
- Translations are AI-generated (no source text exists elsewhere for guide prose) - confirmed acceptable by user.

## Gap found
None of these have any i18n wiring today:
- `src/pages/guides/index.astro` (66 lines)
- `src/pages/guides/divine-throne.astro` (343 lines)
- `src/pages/guides/nephtys.astro` (759 lines)
- `src/pages/guides/nut.astro` (591 lines)
- `src/pages/guides/xuannv.astro` (757 lines)

nav.ts already has localized labels/descriptions for guide nav entries - only page body content is missing.

## Staged execution (>10 files total, so split; do NOT do all at once)

1. **Wiring**: `src/i18n/config.ts` - add `/guides` and `/guides/{slug}` (nephtys, nut, xuannv, divine-throne) to `localizedRoutes` / add a guide-detail matcher like `isLocalizedHeroDetailRoute`.
2. **guides/index.astro**: convert card grid + hero/subtitle text to `c={}`/`pickLang`, add `src/pages/[locale]/guides/index.astro` wrapper.
3. **nephtys.astro**: same treatment (759 lines of prose to translate x4 languages) + wrapper.
4. **nut.astro**: same + wrapper.
5. **xuannv.astro**: same + wrapper.
6. **divine-throne.astro**: same + wrapper.

Each stage = its own task/session. Confirm translations read naturally (not just literal) per language before moving to next stage.

## Status
Not started. Plan only, saved per user request 2026-07-08.
