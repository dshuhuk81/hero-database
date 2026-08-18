const fs = require('fs');
const lua = fs.readFileSync('/Users/daschultheiss/hero-database/leak/game_extracted/region_754c000000/NewConfig/hero_skin.lua', 'utf8');

const names = [
  'anubisi','aruisi','yadianna','basite','keluonuosi','demoteer','gaibui',
  'shuangzizuo','helakelesi','Hladgunnr','kaibuli','mengpo','maierte',
  'momosi','nvba','feinikesi','puluomixiusi','sheshouzuo','jinniuzuo',
  'taifunute','wuleer'
];

// Split into blocks by t[N] = {
const blocks = lua.split(/(?=^t\[\d+\] = \{)/m);

const results = {};
for (const block of blocks) {
  const spineMatch = block.match(/spine\s*=\s*'([^']+)_SkeletonData'/);
  const heroMatch = block.match(/\bhero\s*=\s*(\d+)/);
  if (spineMatch && heroMatch) {
    const spineName = spineMatch[1].toLowerCase();
    const heroId = parseInt(heroMatch[1]);
    // Keep the smallest (base) hero ID for duplicates
    if (typeof results[spineName] === 'undefined' || heroId < results[spineName]) {
      results[spineName] = heroId;
    }
  }
}

console.log('Results:');
for (const name of names) {
  const found = results[name];
  console.log(`  ${name} -> ${found !== undefined ? found : 'NOT FOUND'}`);
}

console.log('\nAll spine->hero mappings for context:');
for (const [spine, heroId] of Object.entries(results).sort((a,b)=>a[1]-b[1])) {
  console.log(`  ${spine} -> ${heroId}`);
}
