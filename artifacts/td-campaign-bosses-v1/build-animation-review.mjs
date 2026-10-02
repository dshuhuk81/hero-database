// Lossless review sheets and a local, frame-steppable viewer of PixelLab output.
// Leaves generated frames untouched. Safe to rerun while the jobs finish.
import sharp from 'sharp';
import {readFile, readdir, mkdir, writeFile, access} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const root=resolve(dir,'../..');
const out=join(dir,'animation-review');
const bosses=JSON.parse(await readFile(join(dir,'prompts.json'),'utf8')).bosses;
const clipNames=['idle','walk','attack','hurt','death'];
await mkdir(out,{recursive:true});
const exists=async p=>{try{await access(p);return true;}catch{return false;}};
async function pixels(path){return sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
function stats({data,info}){
 const hues=Array(12).fill(0);let n=0,light=0,edge=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const i=(y*info.width+x)*4;if(data[i+3]<128)continue;
  const [r,g,b]=[data[i],data[i+1],data[i+2]].map(v=>v/255);
  const hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;
  n++;light+=hi;if(x===0||y===0||x===info.width-1||y===info.height-1)edge++;
  if(hi<.25||d/hi<.25)continue;
  let h=hi===r?(g-b)/d:hi===g?(b-r)/d+2:(r-g)/d+4;
  h=(h*60+360)%360;hues[Math.floor(h/30)]++;
 }
 return {hues,opaquePixels:n,meanBrightness:n?light/n:0,edgePixels:edge};
}
const review=[];
for(const boss of bosses){
 const sourceStats=stats(await pixels(join(dir,`boss_${boss.id}.png`)));
 const sheets=[],clips={},metrics=[];
 for(const [row,clip] of clipNames.entries()){
  const framesDir=join(root,'.td-work/pixellab',`boss-${boss.id}-v1`,clip);
  if(!await exists(framesDir))continue;
  const files=(await readdir(framesDir)).filter(f=>/^\d+\.png$/.test(f)).sort();
  const expected=JSON.parse(await readFile(join(dir,'animation-prompts',`${boss.id}.json`),'utf8')).frames[clip]+1;
  if(files.length!==expected)continue; // A download in progress is not a finished clip.
  clips[clip]={row,count:files.length-1,files};
  for(const [column,file] of files.entries()){
   const path=join(framesDir,file),p=await pixels(path);
   if(p.info.width!==256||p.info.height!==256)throw Error(`${path}: expected 256x256`);
   sheets.push({input:path,left:column*256,top:row*256});
   const s=stats(p);
   const unusual=s.hues.reduce((sum,n,i)=>sum+(sourceStats.hues[i]/Math.max(1,sourceStats.opaquePixels)<.001?n:0),0)/Math.max(1,s.opaquePixels);
   metrics.push({clip,file,...s,newHueShare:unusual,brightnessDelta:s.meanBrightness-sourceStats.meanBrightness,
    reviewFlags:[...(s.edgePixels?['touches canvas edge']:[]),...(unusual>.02?['new saturated hue coverage']:[]),...(Math.abs(s.meanBrightness-sourceStats.meanBrightness)>.15?['large brightness shift']:[])]});
  }
 }
 if(!sheets.length){console.log(`${boss.id}: waiting for frames`);continue;}
 const cols=Math.max(...Object.values(clips).map(c=>c.count+1));
 await sharp({create:{width:cols*256,height:clipNames.length*256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(sheets).png().toFile(join(out,`${boss.id}-review.png`));
 review.push({id:boss.id,name:boss.name,source:`../boss_${boss.id}.png`,sheet:`${boss.id}-review.png`,clips,sourceStats,metrics});
 console.log(`${boss.id}: ${Object.keys(clips).length}/5 clips saved for review`);
}
await writeFile(join(out,'frame-audit.json'),JSON.stringify(review,null,2)+'\n');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Campaign bosses — animation review</title>
<style>body{font:16px system-ui;background:#171a22;color:#eee;margin:24px}h1{font-size:25px}p{max-width:850px;line-height:1.5}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(570px,1fr));gap:24px}.card{padding:16px;border:1px solid #515766;border-radius:12px}h2{font-size:20px}.images{display:flex;gap:12px;flex-wrap:wrap}canvas,.source{width:256px;height:256px;background-color:#454954;background-image:linear-gradient(45deg,#363a44 25%,transparent 25%),linear-gradient(-45deg,#363a44 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#363a44 75%),linear-gradient(-45deg,transparent 75%,#363a44 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}figure{margin:0}figcaption{margin:5px 0;color:#c8ccd5}button,select,input{font:inherit;margin:8px 8px 8px 0}button,select{padding:6px}a{color:#9ac9ff}.flags{color:#ffca87}@media(max-width:650px){.cards{display:block}.card{margin-bottom:20px}}</style>
<h1>Eight campaign bosses: PixelLab review</h1><p>Original still on the left, generated animation on the right. Select a clip, pause and step through every frame. Only generated frames play: frame 00 is the unmodified source and is excluded following the existing pipeline to avoid a source/redraw pop. All review pixels are lossless and unmodified. Rows in the full sheet: idle, walk, attack, hurt, death; column 0 is the source.</p><p>Inspect palette/brightness, attached parts, anatomy, clipping and the final death pose. Numerical flags are review hints, not automatic proof of an error. Empty options mean the job is still processing.</p><div class="cards"></div>
<script>const data=${JSON.stringify(review)};const cards=document.querySelector('.cards');for(const b of data){const card=document.createElement('section');card.className='card';card.innerHTML='<h2>'+b.name+'</h2><div class="images"><figure><img class="source" src="'+b.source+'"><figcaption>Approved source</figcaption></figure><figure><canvas width="256" height="256"></canvas><figcaption class="frame-label"></figcaption></figure></div><select>'+Object.keys(b.clips).map(c=>'<option>'+c+'</option>').join('')+'</select><button class="pause">Pause</button><button class="step">Next frame</button><select class="speed"><option value="12">12 fps</option><option value="6">6 fps</option><option value="3">3 fps</option></select><p><a href="'+b.sheet+'">Full-size lossless frame sheet</a></p><p class="flags"></p>';cards.append(card);const img=new Image();img.src=b.sheet;const ctx=card.querySelector('canvas').getContext('2d'),sel=card.querySelector('select'),speed=card.querySelector('.speed'),label=card.querySelector('.frame-label');let frame=1,paused=false,last=0;const draw=()=>{const c=b.clips[sel.value];if(!c)return;ctx.clearRect(0,0,256,256);ctx.drawImage(img,frame*256,c.row*256,256,256,0,0,256,256);label.textContent=sel.value+' · frame '+frame+'/'+c.count;const m=b.metrics.find(x=>x.clip===sel.value&&Number(x.file.split('.')[0])===frame);card.querySelector('.flags').textContent=m?.reviewFlags.join(' · ')||'';};img.onload=draw;sel.onchange=()=>{frame=1;draw();};card.querySelector('.pause').onclick=()=>{paused=!paused;card.querySelector('.pause').textContent=paused?'Play':'Pause';};card.querySelector('.step').onclick=()=>{paused=true;card.querySelector('.pause').textContent='Play';frame=frame%b.clips[sel.value].count+1;draw();};const tick=t=>{if(!paused&&img.complete&&t-last>1000/Number(speed.value)){frame=frame%b.clips[sel.value].count+1;draw();last=t;}requestAnimationFrame(tick);};requestAnimationFrame(tick);}</script></html>`;
await writeFile(join(out,'index.html'),html);
console.log(`${review.reduce((n,b)=>n+Object.keys(b.clips).length,0)}/40 clips available; ${join(out,'index.html')}`);
