import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ colorScheme:"dark", viewport:{width:1280,height:1200} });
const p = await c.newPage();
p.on("pageerror", e=>console.log("PAGEERROR:", e.message));
await p.goto("file://"+process.cwd()+"/preview.html");
await p.waitForTimeout(700);
const broken = await p.evaluate(()=>[...document.images].filter(i=>!i.complete||i.naturalWidth===0)
  .map(i=>i.alt||i.src.slice(0,40)));
console.log("broken images:", broken.length ? broken : "none");
console.log("total images:", await p.evaluate(()=>document.images.length));
await p.locator("#materials").scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await p.screenshot({path:"shot-mat.png", clip:{x:0,y:0,width:1280,height:1200}});
await b.close();
