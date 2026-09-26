import sharp from 'sharp';
import {copyFile,readFile,writeFile,access} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const [name,generated]=process.argv.slice(2);
const specs=JSON.parse(await readFile(join(dir,'BATCH-2-PROMPTS.json'),'utf8'));
const spec=specs.find(h=>h.hero===name); if(!spec)throw Error('Unknown hero');
const source=join(dir,`${name}-source.png`);
if(generated) {try {await access(source);throw Error('Source already exists; will not overwrite');}catch(e){if(e.code!=='ENOENT')throw e;} await copyFile(generated,source);}
const m=await sharp(source).metadata();
const alpha=await sharp(source).extractChannel('alpha').stats();
if(!m.hasAlpha||alpha.channels[0].min!==0)throw Error('Source transparency check failed');
await sharp(source).resize(2514,6144,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:90,alphaQuality:100,effort:4}).toFile(join(dir,`${name}.webp`));
for(const [w,q] of [[240,74],[360,76],[480,78]])await sharp(source).resize(w,Math.round(w*6144/2514),{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:q,effort:4}).toFile(join(dir,`${name}-card-${w}.webp`));
await sharp(source).resize(96,96,{fit:'cover',position:'top'}).webp({quality:72}).toFile(join(dir,`${name}-thumb-96.webp`));
const side=name==='fenrir'?m.width:Math.round(m.width*0.73),left=Math.round((m.width-side)/2),top=0;
await sharp(source).extract({left,top,width:side,height:side}).resize(192,192).webp({quality:82,alphaQuality:90}).toFile(join(dir,`${name}-token-192.webp`));
const files=[`${name}.webp`,...[240,360,480].map(w=>`${name}-card-${w}.webp`),`${name}-thumb-96.webp`,`${name}-token-192.webp`];
const sizes=[[2514,6144],[240,587],[360,880],[480,1173],[96,96],[192,192]];const outputs=[];
for(const [i,file]of files.entries()){const o=await sharp(join(dir,file)).metadata();if(!o.hasAlpha||o.width!==sizes[i][0]||o.height!==sizes[i][1])throw Error(`Invalid export ${file}`);outputs.push({file,width:o.width,height:o.height,alpha:o.hasAlpha});}
const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
const entry={hero:name,intendedInternalId:spec.id,source:{file:`${name}-source.png`,width:m.width,height:m.height},masterUpscaled:true,tokenCrop:{left,top,side},outputs};
const index=manifest.findIndex(h=>h.hero===name);if(index<0)manifest.push(entry);else manifest[index]=entry;
await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
let status=await readFile(join(dir,'STATUS.md'),'utf8');status=status.replace(`- [ ] ${spec.title.split(' — ')[0]} —`, `- [x] ${spec.title.split(' — ')[0]} —`);await writeFile(join(dir,'STATUS.md'),status);
console.log(`Saved and verified ${name}: source and 6 WebPs. ${manifest.length}/21 complete.`);
