import sharp from 'sharp';
import {copyFile,writeFile,access} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const source=join(dir,'odin-v2-source.png');
try{await access(source);}catch{await copyFile('/Users/daschultheiss/.codex/generated_images/01a0ddd8-ab64-7171-8932-1775a08b6d12/exec-c53ba946-c424-4380-847a-6a4fa7e6aabd.png',source);}
const m=await sharp(source).metadata();
const stats=await sharp(source).extractChannel('alpha').stats();
if(!m.hasAlpha||stats.channels[0].min!==0)throw Error('Transparency missing');
await sharp(source).resize(2514,6144,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:90,alphaQuality:100,effort:4}).toFile(join(dir,'odin-v2.webp'));
for(const [w,q] of [[240,74],[360,76],[480,78]])await sharp(source).resize(w,Math.round(w*6144/2514),{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:q,effort:4}).toFile(join(dir,`odin-v2-card-${w}.webp`));
// Face-centered crop: leave the raised wings in the full portrait rather than shrinking the face.
const side=Math.round(m.width*.72),left=Math.round(m.width*.13),top=Math.round(m.height*.09);
const bust=await sharp(source).extract({left,top,width:side,height:side}).png().toBuffer();
await sharp(bust).resize(192,192).webp({quality:82,alphaQuality:90}).toFile(join(dir,'odin-v2-token-192.webp'));
await sharp(bust).resize(96,96).webp({quality:72}).toFile(join(dir,'odin-v2-thumb-96.webp'));
const files=['odin-v2-source.png','odin-v2.webp',...[240,360,480].map(w=>`odin-v2-card-${w}.webp`),'odin-v2-token-192.webp','odin-v2-thumb-96.webp'];
const outputs=[];for(const file of files){const meta=await sharp(join(dir,file)).metadata();if(!meta.hasAlpha)throw Error(file);outputs.push({file,width:meta.width,height:meta.height,alpha:meta.hasAlpha});}
await writeFile(join(dir,'odin-v2-manifest.json'),JSON.stringify({hero:'Odin',intendedInternalId:'zeus',variant:'v2 — fur mantle and red cloak',generator:'built-in image_gen',sourceReference:'user-provided Odin illustration',masterUpscaled:true,tokenCrop:{left,top,side},outputs},null,2)+'\n');
console.log(JSON.stringify(outputs,null,2));
