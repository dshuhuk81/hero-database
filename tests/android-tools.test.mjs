import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const dir = new URL("../tools/android/scripts/", import.meta.url).pathname;
const scripts = readdirSync(dir).filter((name) => name.endsWith(".py"));

test("the game-data scripts are present", () => {
  for (const name of ["export_events.py", "export_hero_releases.py", "build_site_assets.py", "extract_hero_art.py"]) {
    assert.ok(scripts.includes(name), `missing ${name}`);
  }
});

for (const name of scripts) {
  test(`${name} compiles`, () => {
    const result = spawnSync("python3", ["-I", "-c", `import sys; compile(open(sys.argv[1]).read(), sys.argv[1], "exec")`, dir + name], { encoding: "utf-8" });
    assert.equal(result.status, 0, result.stderr);
  });
}
