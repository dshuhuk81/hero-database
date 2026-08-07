import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:430,height:900} });
const p = await c.newPage();
await p.goto("file://"+process.cwd()+"/preview.html");
await p.waitForTimeout(600);
const bad = await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll("*").forEach(el=>{
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1 && r.width > 0){
      out.push({tag:el.tagName, cls:el.className?.toString().slice(0,40)||"", id:el.id||"",
        right:Math.round(r.right), w:Math.round(r.width)});
    }
  });
  return out.slice(0,25);
});
console.log(bad.map(x=>`${x.tag}.${x.cls}${x.id?"#"+x.id:""}  right=${x.right} w=${x.w}`).join("\n"));
await b.close();
