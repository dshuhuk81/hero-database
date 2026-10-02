import sharp from 'sharp';
import {readFile,writeFile,copyFile,access} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const sources=JSON.parse(await readFile(join(dir,'generation-sources.json'),'utf8'));
const manifest=[];
for(const {id,source} of sources){
 const local=join(dir,`${id}-source.png`);
 try{await access(local);}catch{await copyFile(source,local);}
 const m=await sharp(local).metadata();
 if(!m.hasAlpha)throw Error(`${id}: no alpha`);
 const {data,info}=await sharp(local).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=info.width,y0=info.height,x1=-1,y1=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>1){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<0)throw Error('Empty subject');
 const crop={left:x0,top:y0,width:x1-x0+1,height:y1-y0+1};
 const fitted=await sharp(local).extract(crop).resize(205,205,{fit:'inside'}).png().toBuffer();
 const fm=await sharp(fitted).metadata();const left=Math.round((256-fm.width)/2),top=230-fm.height;
 const canvas=await sharp({create:{width:256,height:256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:fitted,left,top}]).png().toBuffer();
 const png=`boss_${id}.png`,webp=`boss-${id}-v1.webp`;
 await writeFile(join(dir,png),canvas);
 await sharp(canvas).webp({lossless:true,alphaQuality:100}).toFile(join(dir,webp));
 for(const file of [png,webp]){const p=join(dir,file),meta=await sharp(p).metadata();const a=await sharp(p).extractChannel('alpha').raw().toBuffer();if(meta.width!==256||meta.height!==256||!meta.hasAlpha||a[0]!==0||a[255]!==0||a[255*256]!==0||a[65535]!==0)throw Error(`Invalid export ${file}`);}
 manifest.push({id,source:`${id}-source.png`,sourceSize:[m.width,m.height],png,webp,canvas:[256,256],sourceCrop:crop,subjectBox:{left,top,width:fm.width,height:fm.height},baselineY:230,animationTested:false});
 console.log(`${id}: transparent 256x256 PNG and lossless WebP verified`);
}
await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
