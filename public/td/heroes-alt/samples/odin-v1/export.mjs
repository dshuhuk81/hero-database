import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
const dir=dirname(fileURLToPath(import.meta.url));
const source=join(dir,'source.png');
await mkdir(join(dir,'cards'),{recursive:true});
await mkdir(join(dir,'thumbs'),{recursive:true});
await mkdir(join(dir,'tokens'),{recursive:true});
const master=join(dir,'odin.webp');
await sharp(source).resize(2514,6144,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:90,alphaQuality:100,effort:6}).toFile(master);
for(const [width,quality] of [[240,74],[360,76],[480,78]]) {
 await sharp(master).resize({width,withoutEnlargement:true}).webp({quality,effort:6}).toFile(join(dir,'cards',`odin-${width}.webp`));
}
await sharp(master).resize({width:96,height:96,fit:'cover',position:'top',withoutEnlargement:true}).webp({quality:72,effort:6}).toFile(join(dir,'thumbs','odin-96.webp'));
const crop={left:140,top:40,width:560,height:560};
await sharp(source).extract(crop).resize(192,192).webp({quality:82,alphaQuality:90}).toFile(join(dir,'tokens','odin-v1.webp'));
const files=['source.png','odin.webp','cards/odin-240.webp','cards/odin-360.webp','cards/odin-480.webp','thumbs/odin-96.webp','tokens/odin-v1.webp'];
const assets=[];
for(const file of files){const m=await sharp(join(dir,file)).metadata();const stats=await sharp(join(dir,file)).stats();const alpha=stats.channels[3];if(!m.hasAlpha||!alpha||alpha.min!==0||alpha.max<250)throw Error(`Transparency check failed: ${file}`);assets.push({file,width:m.width,height:m.height,format:m.format,alpha:m.hasAlpha});}
await writeFile(join(dir,'manifest.json'),JSON.stringify({displayName:'Odin',intendedInternalId:'zeus',status:'sample; not wired into game',generator:'built-in image_gen',referenceMaster:{width:2514,height:6144,format:'webp',alpha:true},sourceCrop:crop,masterUpscaled:true,assets},null,2)+'\n');
console.log(JSON.stringify(assets,null,2));
