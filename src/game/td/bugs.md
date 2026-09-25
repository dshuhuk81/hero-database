# Bugs or UI/UX issues on the Tower Defense Game

## Bug 01 [FIXED]
When i place a hero on the field, the hero images is not shown or visible on the circular element - its blank.

Root cause: PixiJS v8 normalizes the internal texture reference, so `sprite.texture === PIXI.Texture.EMPTY` was always false and the loaded texture never got swapped in.
Fix: changed comparison to `sprite.texture !== loadedTex` in `updateHeroSprite`.


## UI Issue 01 [FIXED]
The Interface is heavily cluttered. Currently its only suiting desktop web with a wide monitor. The Buttons for Starting and selecting buffs and upgrades are on the lower right corner, mostly even on my macbook out of screen. Its not a good UI handline. Everything should at least be so constructed that it fits well.

Root cause: command panel had no height constraint - hero list (6 classes) expanded it to full content height, pushing note + CTA below viewport fold. Internal scroll mechanism was in place (.td-command-body with overflow-y:auto) but .td-command itself had no max-height.
Fix (final): added `position: sticky; top: 0; max-height: 100svh` to `.td-command`. Panel now sticks to viewport top, caps at viewport height, hero list scrolls inside, note + CTA always visible at bottom without leaving the map.


## UI Issue 03 [FIXED] Inspector stats too thin
Show exact numbers in the selected-hero inspector: attack damage, attacks/sec, range.
Infinitode shows Range 4.5, Damage 61.8, Atk Speed 0.266, Crit 8.26% - all readable at a glance.
We only show level, synergy %, and upgrade cost.

Fix: the hero popover shows Attack (effective value, gold when boosted), Speed, Range and Crit in a four-column row.

## UI Issue 04 [FIXED] Favor Tree is a flat list - needs visual node graph
The Blessings panel (pre-run) shows nodes as plain buttons in a list.
Should be a visual connected tree with 3 tiers, dependency lines, and clear unlock state.
Reference: Infinitode research screen with gold-highlighted selected nodes and arrows between tiers.

Fix: the Blessings panel draws the trunk and class branches as a node graph with connecting lines (`page/blessings.ts`).

## UI Issue 05 [FIXED] Range circle lacks presence
Our range ring is a thin 2px stroke. Infinitode uses a glowing filled circle (low alpha fill + strong stroke).
Make the selected-hero range ring more prominent: thicker stroke, slight glow fill, or pulsing opacity.

Fix: `drawRangeRing` in `render.js` draws a low-alpha fill, a glow band and a 3px edge.

## UI Issue 06 [FIXED] Level badge too small / easy to miss
Hero level shows as tiny "Lv2" floating text above the hero circle.
Should be part of the hero visual itself - e.g. a small badge integrated into the circle border.
Infinitode shows "L2" directly ON the tower tile.

Fix: the token border has one gold arc per level, and a number disc sits on the border (a star once Awakened).

## UI Issue 02 [DEFERRED - large scope]
Speaking of which. The game is obviously not a mobile app. But its not useable on a phone.
But that might be too large to solve at the moment.
It would require a complete mobile first approach - maybe only using landscape format. That also would tackle UI Issue 01 as well cause interactive elements and menues needed a restructural thinking of how they are placed, seen and used.

## UI Issue 03b [FIXED] Deselect hero on empty canvas click
When i have a hero selected, and i click on the canvas - i d like to deselect the hero. because the button for starting the next round gets pushed down.

Root cause: activateSlot() showed a text prompt when clicking an empty slot with nothing selected, never cleared selectedEntityId. Clicks on open canvas (no slot) were ignored entirely.
Fix: clicking an empty slot or open canvas with no selectedHeroId now clears selectedEntityId, hides inspector, resets uiSelected.

## Bug 02 [FIXED] Nyx attacks out of range
Nyx attacks the enemies when they come on the battlefield no matter how far she is away. since she is a ground hero that should be possible. she should only attack when enemies come into her attack range.

Root cause: findTarget() for shadow_step variant returned any alive enemy sorted by HP, with no range filter. Normal heroes filter by hero.range first; Nyx skipped it.
Fix: added Math.hypot range check to shadow_step target list in sim.js:436.


## UI Issue 07 [FIXED] Hero popover wastes height on wide screens
In the bottom sheet (landscape phones), the three focus or training options and the Rotate / Details / Sell row were stacked, so the sheet covered most of the map.

Fix: the stage is a CSS container. From 440px stage width the three options sit in one row; from 540px the upgrade button and the action buttons share a row.
