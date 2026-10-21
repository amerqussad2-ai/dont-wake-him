/**
 * Poly Haven CC0 art acquisition. Runs in Vercel before vite build.
 * Fetches REAL 1k glTF model + all referenced .bin/textures, checks paths,
 * writes a manifest containing only complete assets. Never hotlinks external
 * assets from the player's browser. No proprietary assets or API keys.
 *
 * Uses Poly Haven's public file-list API with a visible project credit.
 */
import { mkdir, mkdtemp, writeFile, rename, readdir, readFile, stat, rm } from 'node:fs/promises';
import { join, basename, dirname, resolve, sep } from 'node:path';

const out=resolve('public/models');
// The committed models are the source of truth during normal Vercel builds.
// This removes all external network calls from published production builds.
async function vendoredAssetsComplete(){
 try{
  const manifest=JSON.parse(await readFile(join(out,'manifest.json'),'utf8'));
  if(Object.keys(manifest.models||{}).length<11||Object.keys(manifest.materials||{}).length<3)return false;
  for(const asset of Object.values(manifest.models)){
   const main=resolve('public',String(asset.file).replace(/^\\//,''));
   const entry=await stat(main);
   if(entry.size<128)return false;
   if(main.endsWith('.gltf')){
    const gltf=JSON.parse(await readFile(main,'utf8'));
    const required=[
     ...(gltf.buffers||[]).map(x=>x.uri),
     ...(gltf.images||[]).map(x=>x.uri),
    ].filter(x=>x&&!x.startsWith('data:'));
    for(const rel of required){
     if(rel.includes('..')||rel.startsWith('/'))return false;
     const file=await stat(resolve(dirname(main),rel));
     if(file.size<64)return false;
    }
   }
  }
  for(const mat of Object.values(manifest.materials))
   for(const filePath of Object.values(mat)){
    const file=await stat(resolve('public',String(filePath).replace(/^\\//,'')));
    if(file.size<64)return false;
   }
  console.log('[art] verified '+Object.keys(manifest.models).length+' bundled CC0 models and '+Object.keys(manifest.materials).length+' PBR materials; no re-download needed');
  return true;
 }catch(e){console.log('[art] vendored asset check incomplete:',e.message);return false;}
}
if(process.env.DWH_FORCE_RESYNC!=='1'&&await vendoredAssetsComplete())process.exit(0);

const CATALOG=[
  'vintage_day_bed',
  'painted_wooden_nightstand',
  'alarm_clock_01',
  'drawer_cabinet',
  'television_02',
  'ClassicNightstand_01',
  'vintage_wooden_drawer_01',
  'wicker_basket_01',
  'vintage_oil_lamp',
  'desk_lamp_arm_01',
];
// Download actual JPG PBR texture maps. 1k prioritizes web performance.
const MATERIALS=['wood_floor','white_plaster_02','wood_planks'];

const MAX_FILE=16*1024*1024;
const MANIFEST={generated:new Date().toISOString(),source:'Poly Haven',license:'CC0',models:{},materials:{},failures:{}};
const agents=['DWH-3D/1.0 (+https://polyhaven.com; contact via GitHub)'];
const fail=msg=>{throw new Error(msg)};
const api='https://api.polyhaven.com/files/';
async function get(url,timeout=25000){
 const u=new URL(url);
 if(u.protocol!=='https:'||!['api.polyhaven.com','dl.polyhaven.org','raw.githubusercontent.com'].includes(u.hostname))fail('Untrusted host '+u.hostname);
 const resp=await fetch(u,{headers:{'User-Agent':agents[0]},signal:AbortSignal.timeout(timeout)});
 if(!resp.ok)fail('HTTP '+resp.status+' '+u.toString());
 const len=Number(resp.headers.get('content-length')||0);
 if(len>MAX_FILE)fail('File exceeds web budget ('+len+')');
 const buffer=Buffer.from(await resp.arrayBuffer());
 if(buffer.length>MAX_FILE)fail('File exceeds web budget after download');
 return buffer;
}
function safe(p){
 if(!p || p.startsWith('/') || p.startsWith('\\') || p.split('/').some(x=>!x||x==='.'||x==='..'||x.includes('\\')))fail('Untrusted asset path '+p);
 return p;
}
const textJson=async url=>JSON.parse((await get(url)).toString('utf8'));
async function downloadFile(url,root,p){
 safe(p);
 const target=resolve(root,p);
 if(!target.startsWith(root+sep))fail('Path traversal '+p);
 await mkdir(dirname(target),{recursive:true});
 const binary=await get(url);
 await writeFile(target,binary);
 return binary.length;
}
async function downloadModel(slug) {
 const json=await textJson(api+encodeURIComponent(slug));
 const record=json.gltf?.['1k']?.gltf ?? json.gltf?.['2k']?.gltf;
 if(!record?.url)fail('No 1K/2K glTF available for '+slug);
 const main=basename(new URL(record.url).pathname);
 const files=[[main,record.url],...Object.entries(record.include||{}).map(([name,info])=>[safe(name),info.url])];
 if(files.length===1)fail('GLTF missing linked binary and textures '+slug);
 const tmp=await mkdtemp(join(out,'.download-'));
 try{
  let count=0;
  // concurrent downloads, but fail entirely if any companion texture fails.
  for(let i=0;i<files.length;i+=3){
   const group=files.slice(i,i+3);
   const sizes=await Promise.all(group.map(([name,url])=>downloadFile(url,tmp,name)));
   count+=sizes.reduce((s,v)=>s+v,0);
  }
  const target=join(out,slug);
  await rm(target,{recursive:true,force:true});
  await rename(tmp,target);
  MANIFEST.models[slug]={file:'/models/'+encodeURIComponent(slug)+'/'+encodeURIComponent(main),bytes:count,parts:files.length,source:'https://polyhaven.com/a/'+slug};
  console.log('[art] ok model '+slug+' ('+files.length+' files; '+Math.round(count/1024)+' KB)');
 }catch(e){await rm(tmp,{recursive:true,force:true});throw e;}
}
function findTextureRecord(json,aliases){
 // Poly Haven model/texture files list is a collection of package formats
 // (blend, gltf, ...) with exact companion texture URLs under "include".
 // Use those published URLs; don't guess CDN paths.
 for(const fmt of ['gltf','blend']){
  for(const res of ['1k','2k']){
   const variants=Object.values(json?.[fmt]?.[res]||{});
   for(const packageFile of variants){
    const entries=Object.entries(packageFile?.include||{});
    for(const alias of aliases){
     const exact=entries.find(([name,info])=>
       (name.includes('_'+alias+'_'+res+'.') || name.includes('/'+alias+'.'))
       && /\.(jpg|jpeg|png)$/i.test(name) && info?.url);
     if(exact)return exact[1];
    }
   }
  }
 }
 // Some assets are organized by map then resolution instead.
 for(const res of ['1k','2k'])
   for(const name of aliases)
     for(const entry of [
       json?.[name]?.[res]?.jpg,json?.[name]?.[res]?.png,
       json?.jpg?.[res]?.[name],json?.png?.[res]?.[name]
     ])
       if(entry?.url)return entry;
 return null;
}
async function downloadMaterial(slug) {
 const json=await textJson(api+encodeURIComponent(slug));
 const material={};
 const names={diffuse:['diff','diffuse','albedo'],normal:['nor_gl'],rough:['rough'],arm:['arm']};
 const tmp=await mkdtemp(join(out,'.download-'));
 let bytes=0;
 try{
  for(const [name,aliases] of Object.entries(names)){
   const m=findTextureRecord(json,aliases);
   if(!m)continue;
   const ext=new URL(m.url).pathname.split('.').pop();
   const filename=name+'.'+ext;
   bytes+=await downloadFile(m.url,tmp,filename);
   material[name]='/models/'+encodeURIComponent(slug)+'/'+filename;
  }
  if(!material.diffuse)fail('No diffuse material texture for '+slug);
  const target=join(out,slug);
  await rm(target,{recursive:true,force:true});
  await rename(tmp,target);
  MANIFEST.materials[slug]=material;
  console.log('[art] ok material '+slug+' ('+Math.round(bytes/1024)+' KB)');
 }catch(e){await rm(tmp,{recursive:true,force:true});throw e;}
}
async function downloadHuman() {
 // CC0 low-poly human from UMRAM Bilkent / Quaternius, laid flat on the bed.
 // Replaces the placeholder ball-shaped head with an actual human silhouette.
 const url='https://raw.githubusercontent.com/UMRAM-Bilkent/supine-human-model/main/assets/human_posed.glb';
 const bytes=await get(url);
 if(bytes.subarray(0,4).toString('ascii')!=='glTF')fail('Human mesh is not a GLB');
 const folder=join(out,'human');
 await mkdir(folder,{recursive:true});
 await writeFile(join(folder,'human_posed.glb'),bytes);
 MANIFEST.models.human_posed={file:'/models/human/human_posed.glb',bytes:bytes.length,parts:1,source:'https://github.com/UMRAM-Bilkent/supine-human-model'};
 console.log('[art] ok real human figure ('+Math.round(bytes.length/1024)+' KB)');
}
await mkdir(out,{recursive:true});
for(const [list,fn] of [[CATALOG,downloadModel],[MATERIALS,downloadMaterial]]){
 // Budget: 2 downloads at a time, stop missing models individually rather than fail entire build.
 for(let i=0;i<list.length;i+=2){
  await Promise.all(list.slice(i,i+2).map(async slug=>{
   try{await fn(slug)}catch(e){MANIFEST.failures[slug]=String(e.message||e);console.warn('[art] skipped '+slug+': '+MANIFEST.failures[slug]);}
  }));
 }
}
try { await downloadHuman(); }
catch(e){ MANIFEST.failures.human_posed=String(e.message||e);console.warn('[art] human mesh unavailable: '+MANIFEST.failures.human_posed); }
await writeFile(join(out,'manifest.json'),JSON.stringify(MANIFEST,null,2));
console.log('[art] done: '+Object.keys(MANIFEST.models).length+' 3D models, '+Object.keys(MANIFEST.materials).length+' materials, '+Object.keys(MANIFEST.failures).length+' unavailable');
// A published “realistic edition” must ship with real 3D meshes.
// Fail the preview build instead of silently shipping procedural-only art.
const readyModels=Object.keys(MANIFEST.models).length;
const readyMaterials=Object.keys(MANIFEST.materials).length;
if(readyModels<4 || readyMaterials<1) {
  console.error('[art] missing assets:',JSON.stringify(MANIFEST.failures));
  throw new Error('Realistic asset quality gate failed: '+readyModels+' models, '+readyMaterials+' materials (need >=4 models and >=1 PBR material)');
}
