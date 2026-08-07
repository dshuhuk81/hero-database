import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ colorScheme:"dark", viewport:{width:1280,height:1400} });
const p = await c.newPage();
p.on("pageerror", e=>console.log("PAGEERROR:", e.message));
await p.goto("file://"+process.cwd()+"/preview.html");
await p.waitForTimeout(500);

// drive the simulator: slot 1, Tier 4, T3 stones; add 2 stones to ATK%, CRIT DMG, P-DMG
await p.locator("#simSlot button", {hasText:"1 · Wind"}).click();
await p.locator("#simTier button", {hasText:"Tier 4"}).click();
await p.locator("#simStone button", {hasText:"T3"}).click();
for (const stat of ["ATK %","CRIT DMG Bonus","P-DMG Bonus"]) {
  const row = p.locator("#stoneTable tr").filter({hasText:stat}).first();
  await row.locator("button", {hasText:"+"}).click();
  await row.locator("button", {hasText:"+"}).click();
}
await p.waitForTimeout(400);
const rows = await p.locator("#simPan .pan-row").evaluateAll(els=>els.map(e=>{
  const t=e.querySelectorAll("span");
  return e.querySelector(".nm").textContent+" | "+e.querySelector(".wt").textContent+" | "+e.querySelector(".pct").textContent+" | "+e.className;
}));
console.log("--- simulator result (Tier 4, 2x T3 on three targets) ---");
rows.forEach(r=>console.log("  ",r));
console.log("--- readout ---");
console.log(await p.locator("#simReadout").innerText());

// goal planner: pick all four
for (const stat of ["ATK %","CRIT Rate","CRIT DMG Bonus","P-DMG Bonus"])
  await p.locator("#goalPicker button", {hasText:new RegExp("^"+stat.replace(/[%]/g,"%")+"$")}).first().click();
await p.waitForTimeout(300);
console.log("--- goal planner ---");
console.log(await p.locator("#goalOut").innerText());

await p.locator("#sim").scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await p.screenshot({path:"shot-sim.png", clip:{x:0,y:0,width:1280,height:1400}});
await b.close();
