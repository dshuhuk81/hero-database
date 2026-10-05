# Campaign landscape phone review — October 5, 2026

Source: owner-provided `screenshots_campaigns.zip`, eleven screenshots covering stages
1-1, 1-7, 2-1, 3-3 and 3-6. This is screenshot evidence, not a live-device interaction test.
Parent priority list: [Tower Defense Roadmap](../../TOWER_DEFENSE_ROADMAP.md).
Design reference: [Tilted Board and Landscape HUD](../../TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md).

## Findings

- The shared tilted presentation is visible across the five submitted stages, including
  different board layouts and gate counts. Heroes, platform height and the action dock
  remain broadly consistent. This does not certify every Campaign stage or edge tapping.
- Stage identification and the wave/quest preview overlap at the upper left. The landscape
  CSS gives both the same top position, overriding the earlier title/preview separation.
- On 3-6, the centred boss health bar overlaps the active blessing chips when many buffs
  are present. These independent HUD areas need explicit space reservations.
- The long reaction-discovery notice on 2-1 still takes substantial battlefield space;
  use a short gameplay announcement and put the explanation in the reference UI.
- Dense combat on 1-1 still makes damage numbers difficult to attribute. Treat this as
  the next combat-readability pass, not a balance change.

## Lerna walking investigation and change

Both published animation files returned HTTP 200 and the published image matches the local
sheet. A Chromium/Pixi load of `boss-lerna-v1.json` successfully returned all eight walk
frames and its animation metadata. A missing asset/upload was not reproduced.

The existing distance-driven walk cadence couples stride to the boss's 96-world-pixel
display size: at speed 20, one cycle takes 4.32 seconds (and longer under slows), compared
with the sheet's authored eight frames at 12 fps. This is a confirmed source of sluggish
visual motion; static screenshots alone cannot prove which frame was playing on the phone.

Large bosses now use a shorter 32-world-pixel stride reference, giving Lerna a 1.44-second
unimpeded walk cycle. Normal enemy stride, actual movement speed, combat values, pause
behavior and teleport protection are unchanged. The regression test exercises visible
frame progression over one second of Lerna's travel. UI and skin checks pass.

### Follow-up: missing leg articulation

The owner clarified that the legs do not visibly step, rather than the whole sprite freezing.
Inspection of both the published walk row and the original PixelLab frames
(`hero-database-assets/td/enemy-sprites-src/pixellab-lerna/walk/01.png` through `08.png`)
confirms that this is an asset-quality issue: the body/heads move, but the feet retain virtually
the same stance. In the bottom source-image band (y >= 210), the opaque foot footprint varies
by only about one pixel horizontally across all eight frames. No clear alternating lift,
forward swing and plant is present. Faster playback cannot create the missing poses.

Lerna needs a replacement walk clip with visible four-legged stepping, three heads preserved,
the body moving in place, and stable size/ground line. Review the source frames before packing
a new version; do not overwrite the immutable `boss-lerna-v1` files. Follow
[TD Asset Pipeline](../td-asset-pipeline.md). No new art was generated or uploaded in this pass.

## Implemented UI follow-up

- The first landscape overlay row reserves left space for stage identity, centre space for
  boss health, and right space for compact notices. The second row separates preview/quest
  chips from buffs. Both chip lists scroll horizontally inside their own halves instead of
  wrapping into one another. Long stage titles truncate without losing the stage number.
- Reaction-discovery notices name only the reaction. Requirements and descriptions remain
  in the existing glossary.
- Damage numbers follow the target while it lives, including non-DoT hits. Nearby numbers
  use up to four bounded vertical lanes; extreme saturation can still overlap rather than
  displacing labels far from their owner.
- Browser collision checks passed at 797x360, 844x390 and 915x412 with long title/notice,
  twelve buffs, a boss, and no/left/right hero-panel states. This uses the actual shared CSS
  with controlled DOM fixtures, not a complete live-game/device acceptance test.
- Targeted UI, skin and result-sequence checks pass; renderer syntax and diff checks pass.

## To do

- [ ] Replace Lerna's walk asset with visibly articulated leg poses; then verify on phone.
- [x] Separate stage identification from wave/quest information in the landscape HUD.
- [x] Reserve non-overlapping space for boss health and long buff rows.
- [x] Shorten reaction-discovery gameplay notices.
- [x] Improve damage-number attribution in dense combat.
- [ ] Owner: approve the updated HUD and damage numbers during dense combat on the phone.
- [ ] Owner: finish physical edge-tap acceptance.

No production build, asset upload or balance tuning was performed in this review.
