import sharp from 'sharp';
import {copyFile,readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const generated='/Users/daschultheiss/.codex/generated_images/01a0ddd8-ab64-7171-8932-1775a08b6d12';
const heroes=[
 {name:'odin',id:'zeus',crop:[140,40,560]},
 {name:'atlas',id:'nuwa',file:'exec-b513d753-b09f-4936-9768-e0a8f1838dbb.png',crop:[145,65,560]},
 {name:'skadi',id:'diana',file:'exec-f91aeac1-aa91-4d86-8006-3175c07d56c0.png',crop:[135,0,550]},
 {name:'hecate',id:'bastet',file:'exec-7e3dbdc6-2c60-4b27-b306-2e82d2ee4202.png',crop:[125,0,550]},
 {name:'hephaestus',id:'phoenix',file:'exec-733a090e-ff94-4676-a340-215df789fcec.png',crop:[140,0,550]}
];
const previous=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8').catch(()=>'[]'));
const manifest=previous.filter(entry=>!heroes.some(hero=>hero.name===entry.hero));
for(const h of heroes){
 const source=join(dir,`${h.name}-source.png`);
 // The copied source stays in this folder; subsequent runs need no generated-images directory.
 const {existsSync}=await import('node:fs');
 if(!existsSync(source)&&h.file)await copyFile(join(generated,h.file),source);
 const meta=await sharp(source).metadata();
 const alpha=await sharp(source).extractChannel('alpha').stats();
 if(!meta.hasAlpha||alpha.channels[0].min!==0)throw Error(`Missing transparency: ${h.name}`);
 const full=join(dir,`${h.name}.webp`);
 if(h.name!=='odin')await sharp(source).resize(2514,6144,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:90,alphaQuality:100,effort:4}).toFile(full);
 // Direct source downsizing avoids unnecessary interpolation through the enlarged master.
 for(const [width,quality] of [[240,74],[360,76],[480,78]]){
  await sharp(source).resize(width,Math.round(width*6144/2514),{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality,effort:4}).toFile(join(dir,`${h.name}-card-${width}.webp`));
 }
 await sharp(source).resize(96,96,{fit:'cover',position:'top'}).webp({quality:72}).toFile(join(dir,`${h.name}-thumb-96.webp`));
 const [left,top,side]=h.crop;
 await sharp(source).extract({left,top,width:side,height:side}).resize(192,192).webp({quality:82,alphaQuality:90}).toFile(join(dir,`${h.name}-token-192.webp`));
 const files=[`${h.name}.webp`,...([240,360,480].map(w=>`${h.name}-card-${w}.webp`)),`${h.name}-thumb-96.webp`,`${h.name}-token-192.webp`];
 const outputs=[];
 for(const file of files){const m=await sharp(join(dir,file)).metadata();if(!m.hasAlpha)throw Error(`Lost alpha: ${file}`);outputs.push({file,width:m.width,height:m.height,alpha:m.hasAlpha});}
 manifest.push({hero:h.name,intendedInternalId:h.id,source:{file:`${h.name}-source.png`,width:meta.width,height:meta.height},masterUpscaled:true,tokenCrop:{left,top,side},outputs});
 console.log(`Exported ${h.name}: source + 6 transparent WebPs`);
}
await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
