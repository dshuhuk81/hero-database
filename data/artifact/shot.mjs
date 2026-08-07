import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [name, scheme, w] of [["light","light",1280],["dark","dark",1280],["mobile","light",430]]) {
  const c = await b.newContext({ colorScheme: scheme, viewport:{width:w,height:1000}, deviceScaleFactor:1 });
  const p = await c.newPage();
  const errs=[];
  p.on("pageerror", e=>errs.push("PAGEERROR: "+e.message));
  p.on("console", m=>{ if(m.type()==="error") errs.push("CONSOLE: "+m.text()); });
  await p.goto("file://"+process.cwd()+"/preview.html");
  await p.waitForTimeout(900);
  // horizontal overflow check
  const of = await p.evaluate(()=>({doc:document.documentElement.scrollWidth, win:window.innerWidth}));
  console.log(name, "scrollWidth", of.doc, "viewport", of.win, of.doc>of.win+1 ? "  !! HORIZONTAL OVERFLOW":"  ok");
  if(errs.length) console.log("  ", errs.join("\n   ")); else console.log("   no JS errors");
  await p.screenshot({path:`shot-${name}.png`, fullPage:false});
  await p.screenshot({path:`shot-${name}-full.png`, fullPage:true});
  await c.close();
}
await b.close();
