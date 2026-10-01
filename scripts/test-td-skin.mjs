// Hero skin (M24): every roster hero has TD-owned art and sounds, never a database
// image or name, and only display fields change (ids, stats and rules stay).
import assert from "node:assert/strict";
import fs from "node:fs";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import mythic from "../src/data/tdSkinMythic.json" with { type: "json" };
import { skinHeroes, skinTuning } from "../src/game/td/skin.js";

const base = "https://r2.example";
const skinned = skinHeroes(heroes, base);
skinned.forEach((hero, i) => {
  const { name, title, image, portrait, token, anim, sounds, ...rest } = hero;
  const { name: _n, image: _i, ...original } = heroes[i];
  assert.deepEqual(rest, original, `${hero.id}: only display fields change`);
  assert.ok(name && title && name === mythic.heroes[hero.id].name, `${hero.id}: mythic name ${name}`);
  assert.ok(!heroes[i].image, `${hero.id}: no database image in gameBalance.json`);
  assert.equal(anim.frames, 24, `${hero.id}: idle loop`);
  for (const url of [image, portrait, token, anim.url]) {
    assert.ok(url.startsWith(`${base}/td/heroes-alt/`) && url.includes(`/${hero.id}-`), `${hero.id}: TD-owned art ${url}`);
    assert.ok(fs.existsSync(`public${url.slice(base.length)}`), `${hero.id}: file exists ${url}`);
  }
  for (const key of Object.values(sounds)) assert.ok(fs.existsSync(`public/td/sfx/${key}.ogg`), `${hero.id}: sound ${key}`);
});
assert.equal(new Set(skinned.map((hero) => hero.name)).size, heroes.length, "names are unique");

const skinnedTuning = skinTuning(tuning);
const oldSkills = new Set(Object.values(tuning.heroSkills).map((skill) => skill.skillName));
for (const [id, skill] of Object.entries(skinnedTuning.heroSkills)) {
  assert.ok(!oldSkills.has(skill.skillName), `${id}: new ultimate name`);
  assert.equal(skill.variant, tuning.heroSkills[id].variant, `${id}: same ultimate`);
}

// Nothing in the game's source loads database hero art or sounds.
const sources = ["src/game/td", "src/game/td/page", "src/components/td"].flatMap((dir) => fs.readdirSync(dir).filter((f) => /\.(js|ts|astro)$/.test(f)).map((f) => `${dir}/${f}`));
for (const file of sources) {
  const text = fs.readFileSync(file, "utf8");
  assert.ok(!/r2Asset\(`heroes\/|["'`]heroes\/|(?<!heroes-alt\/)(tokens|anims)\/\$\{|bosses\//.test(text), `${file}: no database hero, token, animation or boss art`);
}
console.log("Tower defense skin checks passed.");
