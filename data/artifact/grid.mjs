import { chromium } from 'playwright';
const b = await chromium.launch();
for (const scheme of ["dark","light"]) {
  const c = await b.newContext({ colorScheme:scheme, viewport:{width:1180,height:900} });
  const p = await c.newPage();
  await p.goto("file://"+process.cwd()+"/preview.html");
  await p.waitForTimeout(600);
  const el = p.locator("#artGrid").locator("xpath=ancestor::div[contains(@class,'plate')][1]");
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await el.screenshot({path:`shot-grid-${scheme}.png`});
  await c.close();
}
await b.close();
