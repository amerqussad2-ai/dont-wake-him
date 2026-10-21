import {
  Vector3, Color3, Color4, MeshBuilder, PBRMaterial, StandardMaterial,
  HemisphericLight, PointLight, DirectionalLight, ShadowGenerator, DynamicTexture,
  GlowLayer, TransformNode, Texture, Scene
} from '@babylonjs/core';

// Every asset is built locally with Babylon primitives and hand-generated
// surface textures, so a failed external model CDN can never block gameplay.
const C = (hex) => Color3.FromHexString(hex);
const vec = (x,y,z) => new Vector3(x,y,z);
const rand = (seed) => () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);

function paintTexture(scene, name, paint) {
  const t = new DynamicTexture(name, { width:512, height:512 }, scene, false);
  const ctx = t.getContext();
  paint(ctx);
  t.update(false);
  t.wrapU = Texture.WRAP_ADDRESSMODE;
  t.wrapV = Texture.WRAP_ADDRESSMODE;
  return t;
}
function woodTexture(scene, name, dark=false) {
  return paintTexture(scene,name,(ctx)=>{
    const r=rand(dark?9288:12839);
    ctx.fillStyle=dark?'#78604d':'#9e7960';ctx.fillRect(0,0,512,512);
    for(let i=0;i<175;i++){
      const y=r()*512,w=1+r()*3;
      ctx.strokeStyle=dark?'rgba(38,24,20,.10)':'rgba(50,27,17,.12)';
      ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(130,y-6+r()*12,310,y+9-r()*20,512,y-4+r()*8);ctx.stroke();
    }
    for(let i=0;i<60;i++){const x=r()*512,y=r()*512;ctx.fillStyle='rgba(251,239,215,.045)';ctx.fillRect(x,y,r()*90,1);}
  });
}
function fabricTexture(scene,name,base='#637585'){
 return paintTexture(scene,name,(ctx)=>{
  const r=rand(778);ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
  for(let i=0;i<6000;i++){const x=r()*512,y=r()*512;ctx.fillStyle=r()>.5?'rgba(255,255,255,.085)':'rgba(0,0,0,.07)';ctx.fillRect(x,y,2,1);}
 });
}
function mat(scene,name,color,roughness=.8,metallic=.03,tex=null) {
 const m=new PBRMaterial(name,scene); m.albedoColor=C(color);m.roughness=roughness;m.metallic=metallic;
 if(tex)m.albedoTexture=tex;return m;
}
function emissive(scene,name,color,power=1) {
 const m=new StandardMaterial(name,scene);m.diffuseColor=C(color);m.emissiveColor=C(color).scale(power);return m;
}

export function buildWorld(scene,level) {
 const p=level.palette;
 scene.clearColor = new Color4(.025,.03,.048,1);
 scene.fogMode=Scene.FOGMODE_EXP2; scene.fogDensity=.007;
 scene.fogColor=C(level.atmosphere==='storm'?'#394754':'#34354b');
 scene.imageProcessingConfiguration.exposure=1.15;
 scene.imageProcessingConfiguration.contrast=1.23;
 scene.imageProcessingConfiguration.toneMappingEnabled=true;
 const glow=new GlowLayer('soft light blooms',scene,{blurKernelSize:24});glow.intensity=.35;
 const hemi=new HemisphericLight('sky ambient',vec(-.5,1,.35),scene);
 hemi.intensity=level.atmosphere==='storm'?.36:.54;
 hemi.diffuse=C('#c0cee8');hemi.groundColor=C('#5a494a');
 const moon=new DirectionalLight('moon shadows',vec(-.38,-1,.44),scene);
 moon.position=vec(5,9,-8);moon.diffuse=C(p.sky);moon.intensity=level.atmosphere==='storm'?.62:.9;
 const shadows=new ShadowGenerator(1024,moon);
 shadows.usePercentageCloserFiltering=true;
 shadows.filteringQuality=ShadowGenerator.QUALITY_LOW;
 const lamp=new PointLight('bedside warm lamp',vec(-2.85,2.25,-3.8),scene);
 lamp.diffuse=C(p.light);lamp.intensity=level.atmosphere==='storm'?23:28;lamp.range=8;
 const windowLight=new PointLight('window fill',vec(1,2.6,-6.45),scene);
 windowLight.diffuse=C('#a7c2ff');windowLight.intensity=16;windowLight.range=11;
 const brass=mat(scene,'brushed bronze','#a99165',.32,.72);
 const gold=mat(scene,'gold fittings','#c5ad77',.25,.75);
 const dark=mat(scene,'dark frame','#292b36',.72,.19);
 const painted=mat(scene,'painted trim',p.wallAccent,.78,.02);
 const wood=mat(scene,'timber furniture','#ffffff',.72,.02,woodTexture(scene,'fine wood',true));
 const floorM=mat(scene,'solid plank texture',p.floor,.78,.05,woodTexture(scene,'oak grain'));
 const cloth=mat(scene,'woven textiles','#ffffff',.95,.0,fabricTexture(scene,'fabric',p.fabric));
 const pillow=mat(scene,'pillow cotton','#e0dacc',.95);
 const wallM=mat(scene,'plaster',p.wall,.94);
 const carpet=mat(scene,'pile wool','#ffffff',.99,0,fabricTexture(scene,'carpet',p.carpet));
 const ceilingM=mat(scene,'ceiling paint',p.ceiling,.9);
 const leather=mat(scene,'deep leather','#483a35',.77);
 const chrome=mat(scene,'metal handles','#b0a598',.28,.83);
 const skin=mat(scene,'skin','#c69a79',.89,.02);
 const hair=mat(scene,'short dark hair','#292529',.99,.0);
 const linen=mat(scene,'blue-grey linen','#7b8f9d',.95,.0,fabricTexture(scene,'linen','#8696a3'));
 const led=emissive(scene,'amber indicator','#ffad57',1.5);
 const green=emissive(scene,'interactive mint','#8affc0',1.0);
 const red=emissive(scene,'alarm active','#ff433f',1.0);
 const glass=mat(scene,'glass pane','#b5d2e4',.06,.08);
 glass.alpha=.26;
 const blockers=[];
 const shadowed=[];
 const meshes=[];
 const box=(name,pos,dim,material,solid=false)=>{
  const mesh=MeshBuilder.CreateBox(name,{width:dim[0],height:dim[1],depth:dim[2]},scene);
  mesh.position=vec(...pos);mesh.material=material;mesh.receiveShadows=true;
  if(solid)blockers.push({x:pos[0],z:pos[2],wx:dim[0]/2+.23,wz:dim[2]/2+.23});
  meshes.push(mesh);return mesh;
 };
 const sph=(name,pos,scale,material)=>{
  const o=MeshBuilder.CreateSphere(name,{diameter:1,segments:20},scene);
  o.position=vec(...pos);o.scaling=vec(...scale);o.material=material;meshes.push(o);return o;
 };
 const cyl=(name,pos,height,diameter,material,rotX=0)=>{
  const o=MeshBuilder.CreateCylinder(name,{height,diameter,tessellation:24},scene);
  o.position=vec(...pos);o.rotation.x=rotX;o.material=material;meshes.push(o);return o;
 };
 const cast=(mesh)=>{shadows.addShadowCaster(mesh);shadowed.push(mesh);return mesh;};
 const trim=(x,z,w,d)=>box('baseboard',[x,.14,z],[w,.28,d],painted);
 // Floor planks are discrete meshes to catch the directional shadows.
 box('subfloor',[0,-.19,0],[16.25,.35,14.25],dark);
 for(let i=0;i<26;i++) {
  const z=-6.77+i*.53;
  for(let j=0;j<8;j++){
   const x=-7.02+j*2.01+(i%2?-.35:0);
   box('real wood plank',[x,-.021,z],[2,.044,.52],floorM);
  }
 }
 const rug=box('central runner',[.55,.037,1.9],[5.4,.055,4.15],carpet);
 box('rug border',[.55,.02,1.9],[5.65,.038,4.4],painted);
 rug.position.y=.06;
 // Full solid perimeter. Decorative doors don't change the blocking volumes.
 box('north wall',[0,1.72,-7.08],[16.25,3.55,.22],wallM);
 box('south wall',[0,1.72,7.08],[16.25,3.55,.22],wallM);
 box('east wall',[8.08,1.72,0],[.22,3.55,14.25],wallM);
 box('west wall',[-8.08,1.72,0],[.22,3.55,14.25],wallM);
 box('ceiling',[0,3.49,0],[16.2,.2,14.2],ceilingM);
 trim(0,-6.95,16,.09);trim(0,6.95,16,.09);trim(-7.94,0,.1,14);trim(7.94,0,.1,14);
 box('crown trim',[0,3.33,-6.92],[16,.09,.1],painted);
 box('crown trim side',[-7.93,3.32,0],[.1,.1,14],painted);
 box('crown trim side',[7.93,3.32,0],[.1,.1,14],painted);
 // Real architectural window, skyline and mullions (inside the solid far wall).
 box('window recess',[.4,2.03,-6.84],[4.2,1.65,.12],dark);
 box('night sky pane',[.4,2.03,-6.73],[3.95,1.45,.025],emissive(scene,'city sky',p.sky,.5));
 for(let i=0;i<6;i++){
  const x=-1.46+i*.62;
  box('distant buildings',[x,1.53,-6.68],[.48,.3+(i%3)*.16,.035],dark);
 }
 box('window glass',[.4,2.02,-6.58],[3.95,1.45,.012],glass);
 box('window mullion',[.4,2.03,-6.55],[.09,1.65,.12],painted);
 box('window mullion horizontal',[.4,2.03,-6.53],[4.0,.08,.1],painted);
 box('window frame',[.4,2.86,-6.52],[4.3,.13,.21],painted);
 box('window frame',[.4,1.21,-6.52],[4.3,.13,.21],painted);
 box('window frame',[-1.73,2.03,-6.52],[.13,1.75,.21],painted);
 box('window frame',[2.53,2.03,-6.52],[.13,1.75,.21],painted);
 box('curtain left',[-1.95,2.03,-6.40],[.52,1.95,.17],cloth);
 box('curtain right',[2.7,2.03,-6.40],[.52,1.95,.17],cloth);
 cyl('curtain rod',[.4,3.11,-6.38],5.3,.055,brass,Math.PI/2);
 // Door with metal handle / decorative panel.
 box('door frame',[6.55,1.5,6.85],[2.0,3.0,.2],painted);
 box('main exit door',[6.55,1.47,6.72],[1.74,2.82,.13],wood);
 for(const y of [.74,1.84])box('door panel',[6.55,y,6.61],[1.32,.83,.04],painted);
 cyl('door handle',[7.1,1.02,6.56],.21,.06,chrome,Math.PI/2);
 // Bed with believable dimensions, layered mattress, upholstery, sleeping figure.
 const [bedX,bedZ]=level.bed;
 cast(box('bed frame',[bedX,.44,bedZ],[2.3,.75,3.9],wood,true));
 box('bed platform',[bedX,.83,bedZ],[2.13,.24,3.62],pillow);
 cast(box('headboard',[bedX,1.27,bedZ-1.88],[2.47,1.55,.26],leather));
 for(let i=0;i<5;i++)sph('upholstered tuft',[bedX-.86+i*.43,1.4,bedZ-1.7],[.055,.055,.03],gold);
 box('fitted sheet',[bedX,.98,bedZ],[2.10,.12,3.40],linen);
 box('duvet',[bedX,1.09,bedZ+.61],[2.08,.2,2.18],cloth);
 for(const side of [-1,1])box('linen seam',[bedX+side*1.04,1.11,bedZ+.6],[.035,.13,2.18],pillow);
 box('pillow left',[bedX-.49,1.04,bedZ-1.18],[.91,.20,.61],pillow);
 box('pillow right',[bedX+.49,1.04,bedZ-1.18],[.91,.20,.61],pillow);
 // Human sleeper is an articulated low-poly/rounded silhouette with natural anatomy
 // rather than a flat 2D sprite. Optional hi-res GLB can replace it later.
 const sleeperRoot=new TransformNode('sleeping guest',scene);
 const head=sph('head',[bedX,1.29,bedZ-1.15],[.46,.45,.44],skin);
 cast(head);
 const hairCap=sph('hair shape',[bedX,1.46,bedZ-1.24],[.47,.29,.44],hair);
 const nose=sph('nose',[bedX,1.26,bedZ-.755],[.065,.08,.07],skin);
 for(const s of [-1,1]){
  sph('closed eyelid',[bedX+s*.18,1.37,bedZ-.765],[.1,.015,.02],hair);
  sph('ear',[bedX+s*.44,1.28,bedZ-1.16],[.072,.11,.08],skin);
  const arm=cast(cyl('resting arm',[bedX+s*.85,1.12,bedZ-.30],1.05,.24,skin,Math.PI/2));
  arm.rotation.z=s*.14;
 }
 const chest=cast(sph('breathing chest',[bedX,1.16,bedZ-.32],[.73,.23,.70],pillow));
 const torso=box('shirt under covers',[bedX,1.09,bedZ-.20],[1.27,.16,1.16],linen);
 // Nightstands left / right.
 for(const s of [-1,1]){
  const x=bedX+s*1.7;
  cast(box('bedside table',[x,.64,bedZ-.7],[.92,1.12,.84],wood,true));
  box('nightstand drawer',[x,.77,bedZ-.25],[.65,.28,.055],painted);
  cyl('drawer knob',[x,.76,bedZ-.20],.06,.065,brass,Math.PI/2);
 }
 const shade=cast(cyl('linen lamp shade',[-2.72,1.41,-3.7],.53,.44,pillow));
 shade.rotation.x=.08;
 cyl('lamp stem',[-2.72,1.15,-3.7],.39,.06,brass);
 sph('bulb glow',[-2.72,1.70,-3.7],[.21,.15,.21],emissive(scene,'lamp glow','#ffe2a6',1.1));
 // Dresser / desk and visible task objects.
 cast(box('antique bureau',[3.8,.63,-4.95],[2.0,1.24,1.15],wood,true));
 for(let i=0;i<3;i++){
  box('drawer facade',[3.8,.29+i*.31,-4.33],[1.58,.23,.075],painted);
  for(let s of [-1,1])cyl('drawer pull',[3.8+s*.36,.29+i*.31,-4.27],.05,.065,gold,Math.PI/2);
 }
 cast(box('writing desk',[4.1,.72,.35],[2.25,.16,1.26],wood,true));
 for(const s of [-1,1])box('desk leg',[4.1+s*.95,.36,.35+s*.10],[.13,.68,.92],wood);
 const tray=box('desktop leather tray',[4.1,.83,.35],[.64,.07,.46],leather);
 const chair=cast(box('padded chair',[2.62,.59,2.3],[.85,.65,.85],leather,true));
 box('chair back',[2.62,1.01,2.66],[.93,.88,.22],wood);
 for(let s of [-1,1])box('chair leg',[2.62+s*.33,.26,2.32],[.08,.47,.65],wood);
 // Level-specific features: dramatic scene differentiation
 if(level.id===1){
  cast(box('laundry basket',[.2,.4,4.1],[1.05,.8,.79],cloth,true));
  for(let i=0;i<3;i++)sph('soft clothes',[.05+i*.18,.86,4.03],[.28,.17,.26],[cloth,linen,pillow][i]);
  for(let i=0;i<3;i++){
   box('framed paintings',[-6.8+i*1.0,2.3, -6.86],[.75,.6,.06],gold);
   box('art inside frame',[-6.8+i*1.0,2.3,-6.80],[.60,.45,.06],mat(scene,'canvas painting'+i,['#817868','#94758a','#596e85'][i]));
  }
 } else if(level.id===2){
  box('hotel headboard light',[bedX,2.6,-6.77],[2.4,.10,.18],emissive(scene,'warm wall wash','#dab384',.65));
  cast(box('minibar',[.8,.65,4.95],[1.35,1.16,.62],dark,true));
  for(let i=0;i<6;i++)cyl('glassware',[.38+i*.16,1.29,4.81],.27,.13,glass);
  cast(box('luggage',[.4,.37,-4.6],[1.15,.78,.55],leather,true));
  box('city neon strip',[6.8,2.6,-6.82],[.10,1.1,.1],emissive(scene,'city neon','#6ac6d0',.68));
 } else {
  // Timber cabin: crossbeams, rustic trunks, storm-lashed window.
  for(let z of [-5.5,0,5.3])cast(box('heavy timber ceiling beam',[0,3.20,z],[15.9,.34,.28],wood));
  for(const x of [-6.9,6.9])box('cabin post',[x,1.75,-.2],[.28,3.35,.32],wood);
  box('stone hearth',[-6.5,.84,3.2],[1.08,1.6,1.95],mat(scene,'stone','#74716d',.98),true);
  box('faint firebed',[-5.92,.30,3.2],[.11,.18,.86],emissive(scene,'faint ember','#b7633f',.45));
  cast(box('old trunk',[.15,.49,4.7],[1.52,.9,.80],wood,true));
  for(const z of [4.38,4.99])box('iron band',[.15,.96,z],[1.55,.04,.10],dark);
 }
 // Interactive items are tangible 3D meshes, plus small pulsing ground lights.
 const markers=new Map();
 const interactMaterials=new Map();
 for(const obj of level.objectives) {
  const [x,z]=obj.position,baseY=obj.kind==='clock'||obj.kind==='television'||obj.kind==='radio'?1.33:.88;
  const node=new TransformNode('interactive:'+obj.id,scene);
  let visual;
  if(['clock','television','radio'].includes(obj.kind)){
   const activeMat=obj.kind==='clock'?red:obj.kind==='television'?emissive(scene,'tv glow','#8ce1ee',.7):mat(scene,'vintage radio','#826752',.5);
   visual=box(obj.kind,[x,baseY,z],[obj.kind==='clock'?.35:.65,obj.kind==='clock'?.30:.43,.25],activeMat);
   if(obj.kind!=='clock')box('speaker screen',[x,baseY+.03,z-.135],[.48,.25,.02],dark);
  } else if(['key','oldkey','keycard'].includes(obj.kind)){
   visual=box(obj.kind,[x,baseY,z],[.28,.05,.18],obj.kind==='keycard'?green:gold);
   const ring=cyl('key ring',[x,baseY+.045,z],.03,.13,chrome);ring.rotation.x=Math.PI/2;
  } else {
   visual=box(obj.kind,[x,1.52,z],[.60,.25,.36],obj.kind==='case'?leather:dark);
   cyl('lock',[x,1.55,z-.2],.08,.085,brass,Math.PI/2);
  }
  const beacon=sph('task glimmer '+obj.id,[x,baseY+.48,z],[.055,.055,.055],green);
  const local=new PointLight('interactive warm hint',vec(x,baseY+.5,z),scene);
  local.diffuse=C('#8effbd');local.intensity=3;local.range=1.5;
  markers.set(obj.id,{pos:vec(x,baseY,z),visual,beacon,light:local,done:false});
 }
 // Exit marker stays dim until all objectives are complete.
 const exitPos=vec(6.53,1.62,6.34);
 box('exit plaque',[6.52,2.44,6.45],[.96,.32,.06],emissive(scene,'exit sign','#7bcf9b',.5));
 const exitLamp=new PointLight('exit guide',vec(6.53,2.55,6.42),scene);
 exitLamp.diffuse=C('#9bf3c2');exitLamp.intensity=5;exitLamp.range=2.6;
 const lampOriginal=lamp.intensity;
 return {
  blockers,markers,exitPos,scene,
  update(seconds,done,alertness){
   chest.scaling.y=1+.10*Math.sin(seconds*1.8);
   head.position.y=1.29+.01*Math.sin(seconds*1.8);
   hairCap.position.y=1.46+.01*Math.sin(seconds*1.8);
   lamp.intensity=lampOriginal*(1+.025*Math.sin(seconds*2.8));
   for(const [id,m] of markers){
    if(done.has(id)){m.visual.setEnabled(false);m.beacon.setEnabled(false);m.light.intensity=0;continue;}
    m.beacon.position.y=m.pos.y+.5+Math.sin(seconds*3+id.length)*.10;
    m.light.intensity=2.4+Math.sin(seconds*3+id.length)*.6;
   }
   if(level.atmosphere==='storm'){
    const flash=Math.sin(seconds*1.14)*Math.sin(seconds*2.33);
    windowLight.intensity=flash>.82?45:10;
   }
   hemi.intensity=(level.atmosphere==='storm'?.36:.54)+alertness*.0008;
  },
  disableSoundSource(){
   const active=markers.get(level.objectives[0].id);
   if(active)active.visual.material=dark;
  },
  wake(){
    head.position.y+=.22;
    lamp.intensity=37;
  },
  stepSurface(pos) {
    // Rugs dampen footsteps; hard timber gives occasional creaks.
    return Math.abs(pos.x-.55)<2.6 && Math.abs(pos.z-1.9)<2.1 ? 'rug' : 'wood';
  }
 };
}
