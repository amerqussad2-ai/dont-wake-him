/**
 * Real photogrammetry-style furniture integration for all three levels.
 * Assets are downloaded from Poly Haven (CC0) at build time and served from
 * this deployment, not from a third-party host while the player is playing.
 */
import { SceneLoader, TransformNode, Vector3, Texture } from '@babylonjs/core';

let manifestPromise=null;
async function manifest(){
  if(!manifestPromise)manifestPromise=fetch('/models/manifest.json').then(r=>r.ok?r.json():null).catch(()=>null);
  return manifestPromise;
}
const placements={
  1:[
    {id:'vintage_day_bed',pos:[-4.45,.09,-2.9],size:[2.6,1.8,3.9],replace:['bed frame','bed platform','headboard','upholstered tuft','fitted sheet','duvet','linen seam','pillow left','pillow right']},
    {id:'painted_wooden_nightstand',pos:[-2.72,.02,-3.60],size:[.9,1.3,.9]},
    {id:'alarm_clock_01',pos:[-2.70,1.19,-3.40],size:[.43,.36,.43],objective:'clock'},
    {id:'drawer_cabinet',pos:[3.80,.02,-4.95],size:[2.0,1.36,1.15]},
  ],
  2:[
    {id:'vintage_day_bed',pos:[-4.45,.09,-2.9],size:[2.6,1.8,3.9],replace:['bed frame','bed platform','headboard','upholstered tuft','fitted sheet','duvet','linen seam','pillow left','pillow right']},
    {id:'television_02',pos:[-2.72,1.18,-3.42],size:[.63,.48,.4],objective:'television'},
    {id:'drawer_cabinet',pos:[3.80,.02,-4.95],size:[2.0,1.25,1.1]},
    {id:'desk_lamp_arm_01',pos:[4.40,.86,.30],size:[.50,.92,.45]},
  ],
  3:[
    {id:'vintage_day_bed',pos:[-4.45,.09,-2.9],size:[2.6,1.8,3.9],replace:['bed frame','bed platform','headboard','upholstered tuft','fitted sheet','duvet','linen seam','pillow left','pillow right']},
    {id:'ClassicNightstand_01',pos:[-2.72,.02,-3.60],size:[.9,1.22,.9]},
    {id:'vintage_wooden_drawer_01',pos:[3.8,.02,-4.95],size:[2.1,1.4,1.14]},
    {id:'vintage_oil_lamp',pos:[-2.7,1.15,-3.40],size:[.41,.55,.40]},
    {id:'wicker_basket_01',pos:[.10,.04,4.22],size:[.89,.72,.79]},
  ],
};

function dims(meshes){
 let min=new Vector3(Infinity,Infinity,Infinity);
 let max=new Vector3(-Infinity,-Infinity,-Infinity);
 for(const m of meshes){
   if(!m.getBoundingInfo || m.getTotalVertices?.()===0)continue;
   m.computeWorldMatrix(true);
   const b=m.getBoundingInfo().boundingBox;
   min=Vector3.Minimize(min,b.minimumWorld);
   max=Vector3.Maximize(max,b.maximumWorld);
 }
 if(!Number.isFinite(min.x)||!Number.isFinite(max.x))return null;
 return {min,max,ext:max.subtract(min)};
}
function applyModel(scene,meshes,spec,worldCast=null) {
 const top=meshes.filter(x=>x&&!meshes.includes(x.parent));
 const root=new TransformNode('cc0:'+spec.id,scene);
 for(const node of top)node.setParent(root);
 if(spec.rotationX)root.rotation.x=spec.rotationX;
 if(spec.rotationY)root.rotation.y=spec.rotationY;
 const d=dims(meshes);
 if(!d||d.ext.length()<.001){root.dispose();throw Error('empty model '+spec.id);}
 const scale=Math.min(...spec.size.map((target,i)=>target/[d.ext.x,d.ext.y,d.ext.z][i]).filter(Number.isFinite));
 root.scaling.setAll(Math.min(25,Math.max(.03,scale)));
 root.position.x=spec.pos[0]-(d.min.x+d.max.x)/2*root.scaling.x;
 root.position.y=spec.pos[1]-d.min.y*root.scaling.y;
 root.position.z=spec.pos[2]-(d.min.z+d.max.z)/2*root.scaling.z;
 for(const node of meshes){
   if(node.receiveShadows!==undefined)node.receiveShadows=true;
   if(node.getTotalVertices?.()>0)worldCast?.(node);
   // Imported glTF materials retain their authored PBR textures.
 }
 return root;
}
function hideProcedural(scene,names){
 // Only hide after a successful model load, preserving reliable fallbacks.
 for(const mesh of scene.meshes)if(names.includes(mesh.name))mesh.setEnabled(false);
}
async function applyMaterials(scene,world,arts){
 for(const [key,mat] of Object.entries(world.realismMaterials??{})){
   const id=key==='floor'?'wood_floor':key==='wall'?'white_plaster_02':key==='cabin'?'wood_planks':null;
   if(!id)continue;
   const p=arts.materials?.[id];
   if(!p?.diffuse)continue;
   mat.albedoTexture=new Texture(p.diffuse,scene,true,false);
   mat.albedoColor.copyFromFloats(.88,.88,.88);
   mat.albedoTexture.uScale=key==='floor'?4:3;
   mat.albedoTexture.vScale=key==='floor'?4:2;
   if(p.normal) {
     mat.bumpTexture=new Texture(p.normal,scene,true,false);
     mat.bumpTexture.uScale=mat.albedoTexture.uScale;
     mat.bumpTexture.vScale=mat.albedoTexture.vScale;
     mat.bumpTexture.level=.45;
   }
 }
}
export async function addRealAssets(scene,level,world,onProgress=()=>{}){
 const pack=await manifest();
 if(!pack||scene.isDisposed){onProgress('Procedural art fallback');return {loaded:0};}
 try {await import('@babylonjs/loaders/glTF/2.0');}
 catch(e){onProgress('3D loader unavailable');return {loaded:0};}
 let loaded=0,failed=0;
 for(const spec of placements[level.id]||[]) {
   if(scene.isDisposed)break;
   const file=pack.models?.[spec.id]?.file;
   if(!file){failed++;continue;}
   try{
     const slash=file.lastIndexOf('/');
     const base=file.slice(0,slash+1),name=file.slice(slash+1);
     const imported=await SceneLoader.ImportMeshAsync(null,base,name,scene);
     if(scene.isDisposed)break;
     const root=applyModel(scene,imported.meshes,spec,world.addImportedCaster);
     if(spec.replace)hideProcedural(scene,spec.replace);
     if(spec.objective) {
       const marker=world.markers.get(spec.objective);
       marker?.visual.setEnabled(false);
       world.externalMarkers?.set(spec.objective,root);
     }
     loaded++;
     onProgress(loaded+' HIGH-DETAIL ASSETS LOADED');
   }catch(e){
     failed++;
     console.warn('[cc0] '+spec.id+' fallback:',e);
   }
 }
 // An actual reclining CC0 human mesh instead of primitive floating spheres.
 const person=pack.models?.human_posed?.file;
 if(person&&!scene.isDisposed){
   try{
     const slash=person.lastIndexOf('/');
     const human=await SceneLoader.ImportMeshAsync(null,person.slice(0,slash+1),person.slice(slash+1),scene);
     if(!scene.isDisposed){
       const root=applyModel(scene,human.meshes,{
         id:'human_posed',
         rotationX:-Math.PI/2,
         pos:[level.bed[0],1.10,level.bed[1]-.15],
         size:[.74,.48,1.80],
       },world.addImportedCaster);
       hideProcedural(scene,['head','hair shape','nose','closed eyelid','ear','resting arm','breathing chest','shirt under covers']);
       world.externalSleeper=root;
       world.externalSleeperOriginY=root.position.y;
       loaded++;
       onProgress(loaded+' HIGH-DETAIL ASSETS LOADED');
     }
   }catch(e){failed++;console.warn('[cc0] sleeper figure fallback:',e);}
 }
 if(!scene.isDisposed)await applyMaterials(scene,world,pack);
 onProgress(loaded+' HIGH-DETAIL ASSETS · '+failed+' FALLBACKS');
 return {loaded,failed};
}
