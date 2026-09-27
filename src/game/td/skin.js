// Hero skin (M24 white label): everything a player sees about a hero (name, title,
// portrait, board token, idle animation, sounds, ultimate name) comes from the mythic
// roster in TOWER_DEFENSE_MYTHIC_HEROES.md with TD-owned art (R2 td/heroes-alt/) and
// sounds (td/sfx/mythic-{id}-{SOUND_VERSION}_{attack|ultimate}.ogg). The game never shows
// the database's hero art, names or sounds. Ids, stats and rules never change.
import mythic from "../../data/tdSkinMythic.json" with { type: "json" };

// Sound set: v4 = per-hero picks from the owner's packs (Hove Audio sword combat, Mixkit,
// Tactical Interface SFX); archers and a few ultimates keep the generated v3 sounds.
// Sources per file: public/td/sfx/CREDITS-mythic.txt.
export const SOUND_VERSION = "v4";

// heroes: gameBalance.json rows; base: the asset base (R2 URL or the /r2 dev proxy).
export function skinHeroes(heroes, base) {
  return heroes.map((hero) => {
    const entry = mythic.heroes[hero.id];
    if (!entry) throw new Error(`Mythic skin has no entry for ${hero.id}`);
    const art = (variant) => `${base}/td/heroes-alt/${hero.id}-${variant}.webp`;
    return {
      ...hero,
      name: entry.name,
      title: entry.title,
      image: art("thumb-96"),
      portrait: art("card-240"),
      token: art("token-192"),
      // Idle loop for the recruit preview (scripts/td-idle-anim.py): 24 square frames, 2.4 s.
      anim: { url: `${base}/td/heroes-alt/anims/${hero.id}-idle-v1.webp`, frames: 24, duration: 2.4 },
      // One file per hero and sound (td/sfx/mythic-{id}-{SOUND_VERSION}_{kind}.ogg); to replace
      // sounds, add files under a new version and bump SOUND_VERSION (R2 files are cached).
      sounds: { attack: `mythic-${hero.id}-${SOUND_VERSION}_attack`, ultimate: `mythic-${hero.id}-${SOUND_VERSION}_ultimate` },
    };
  });
}

// Ultimate names shown in the recruit sheet, hero panel and Glossary.
export function skinTuning(tuning) {
  const heroSkills = Object.fromEntries(Object.entries(tuning.heroSkills ?? {}).map(([id, skill]) =>
    [id, mythic.heroes[id] ? { ...skill, skillName: mythic.heroes[id].skillName } : skill]));
  return { ...tuning, heroSkills };
}
