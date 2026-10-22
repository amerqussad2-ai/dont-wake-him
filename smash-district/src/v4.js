
import './v3.js';
import './v4.css';
import gsap from 'gsap';

const root='/assets/builder-v4/';
const asset=name=>root+name+'.webp';
const menuImage=name=>'/assets/menu-v4/'+name+'.webp';
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=query=>document.querySelector(query);
const files={
 'brioche-top':'brioche-top','brioche-bottom':'brioche-bottom',
 'potato-top':'potato-top','potato-bottom':'potato-bottom',
 'beef':'beef','chicken':'crispy-chicken','cheddar':'cheddar','swiss':'swiss',
 'house':'house-sauce','truffle':'truffle-sauce','fire':'fire-sauce',
 'pickles':'pickles','jalapeno':'jalapenos','lettuce':'lettuce'
};
const loaded=new Map();
function imageReady(name){
 if(loaded.has(name))return loaded.get(name);
 const p=new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>resolve(img.naturalWidth>0);
  img.onerror=()=>resolve(false);
  img.src=asset(name);
  if(img.complete&&img.naturalWidth>0)resolve(true);
 });
 loaded.set(name,p);return p;
}
function modelFromButtons(){
 function selected(group){
  return document.querySelector('[data-group="'+group+'"][aria-pressed="true"]')?.dataset.value;
 }
 return {
  bun:selected('bun')||'brioche',
  protein:selected('protein')||'beef',
  cheese:selected('cheese')||'cheddar',
  sauce:selected('sauce')||'house',
  extras:Array.from(document.querySelectorAll('[data-group="extra"][aria-pressed="true"]')).map(el=>el.dataset.value)
 };
}
function layersFor(m){
 const twice=m.extras.includes('double');
 const bun=m.bun==='potato'?'potato':'brioche';
 const layers=[];
 const add=(key,asset,top,height,level,width=84)=>{
  layers.push({key,asset,top,height,level,width});
 };
 // All independent transparent assets use one registered 840:780 canvas.
 // Heights are calibrated per ingredient; no photographic slices from any finished burger.
 if(twice){
  add('bottom-bun',files[bun+'-bottom'],70,16,1,67);
  add('lower-sauce',files[m.sauce],69,7,2,78);
  add('second-patty',files[m.protein],64,14,3,84);
  if(m.cheese!=='none')add('upper-cheese',files[m.cheese],61,9,4,78);
  add('first-patty',files[m.protein],54,14,5,84);
  if(m.cheese!=='none')add('cheese',files[m.cheese],51,11,6,78);
  if(m.extras.includes('pickles'))add('pickles',files.pickles,49,8,7,77);
  if(m.extras.includes('jalapeno'))add('jalapenos',files.jalapeno,48,8,8,77);
  add('lettuce',files.lettuce,46,8,9,81);
  add('upper-sauce',files[m.sauce],45,5,10,78);
  add('top-bun',files[bun+'-top'],20,29,11,85);
 }else{
  add('bottom-bun',files[bun+'-bottom'],63,16,1,67);
  add('lower-sauce',files[m.sauce],61,7,2,78);
  add('first-patty',files[m.protein],55,16,3,84);
  if(m.cheese!=='none')add('cheese',files[m.cheese],52,11,4,78);
  if(m.extras.includes('pickles'))add('pickles',files.pickles,49,8,5,77);
  if(m.extras.includes('jalapeno'))add('jalapenos',files.jalapeno,48,8,6,77);
  add('lettuce',files.lettuce,47,8,7,81);
  add('upper-sauce',files[m.sauce],45,5,8,78);
  add('top-bun',files[bun+'-top'],20,29,9,85);
 }
 return layers;
}
function populateStage(stage,parts,{animate=false}={}){
 stage.replaceChildren();
 const els=[];
 for(const p of parts){
  const img=document.createElement('img');
  img.src=asset(p.asset);
  img.className='burger-ingredient';
  img.alt='';
  img.loading='eager';
  img.decoding='async';
  img.dataset.key=p.key;
  img.dataset.asset=p.asset;
  img.style.setProperty('--layer-top',p.top+'%');
  img.style.setProperty('--layer-width',p.width+'%');
  img.style.setProperty('--layer-height',p.height+'%');
  img.style.zIndex=String(p.level);
  stage.appendChild(img);
  els.push(img);
 }
 stage.setAttribute('aria-label','Photographic '+parts.length+'-layer customized burger');
 if(animate&&!reduced){
  gsap.set(els,{opacity:0,y:-200});
  gsap.to(els,{opacity:1,y:0,duration:.75,ease:'back.out(1.2)',stagger:.095,overwrite:true});
 }
}
let updateSequence=0;
async function updateBuilder(){
 const stage=$('#burgerStage'),oldImage=$('#builderImage');
 if(!stage||!oldImage)return;
 const serial=++updateSequence;
 const model=modelFromButtons(),parts=layersFor(model);
 const ok=await Promise.all([...new Set(parts.map(p=>p.asset))].map(imageReady));
 if(serial!==updateSequence)return;
 if(ok.some(x=>!x)){
  stage.hidden=true;
  oldImage.hidden=false;
  $('#buildSubLabel').textContent='PHOTOGRAPHIC PREVIEW';
  return;
 }
 const fresh=!stage.hasChildNodes();
 const oldNodes=new Map(Array.from(stage.children).map(el=>[el.dataset.key,el]));
 for(const layer of parts){
  let node=oldNodes.get(layer.key);
  const exists=node&&node.dataset.asset===layer.asset;
  if(!exists){
   node=document.createElement('img');
   node.src=asset(layer.asset);
   node.alt='';node.className='burger-ingredient';
   node.dataset.key=layer.key;node.dataset.asset=layer.asset;
   node.decoding='async';
  }
  node.style.zIndex=String(layer.level);
  node.style.setProperty('--layer-top',layer.top+'%');
  node.style.setProperty('--layer-width',layer.width+'%');
  node.style.setProperty('--layer-height',layer.height+'%');
  if(!exists&&!reduced)gsap.fromTo(node,{y:-140,opacity:0,rotation:-3},{y:0,opacity:1,rotation:0,duration:.72,ease:'back.out(1.3)',overwrite:true});
  else if(exists&&!reduced)gsap.to(node,{duration:.44,ease:'power2.out',overwrite:true});
  stage.appendChild(node);
 }
 const keys=new Set(parts.map(p=>p.key));
 oldNodes.forEach((node,key)=>{if(!keys.has(key)||node.dataset.asset!==parts.find(p=>p.key===key)?.asset)node.remove();});
 if(fresh&&!reduced){
  const imgs=Array.from(stage.children);
  gsap.fromTo(imgs,{y:-190,opacity:0},{y:0,opacity:1,stagger:.09,ease:'back.out(1.2)',duration:.7,overwrite:true});
 }
 stage.hidden=false;oldImage.hidden=true;
 $('#buildSubLabel').textContent='REAL INDIVIDUAL INGREDIENTS · LIVE ASSEMBLY';
}
function initBuilder(){
 const photoBox=$('.builder-photo-box');
 if(!photoBox)return;
 const stage=document.createElement('div');
 stage.id='burgerStage';
 stage.className='burger-v4-stage';
 stage.hidden=true;
 stage.setAttribute('role','img');
 photoBox.appendChild(stage);
 $('#builderImage').loading='eager';
 $('#builder').addEventListener('click',event=>{
  if(!event.target.closest('.build-chip'))return;
  queueMicrotask(updateBuilder);
 });
 updateBuilder();
}
async function initHero(){
 const scene=$('#heroPhoto');
 if(!scene)return;
 const model={bun:'brioche',protein:'beef',cheese:'cheddar',sauce:'house',extras:['pickles','double']};
 const parts=layersFor(model);
 const ok=await Promise.all([...new Set(parts.map(p=>p.asset))].map(imageReady));
 if(ok.some(x=>!x))return;
 const stage=document.createElement('div');stage.className='hero-v4-stage';
 stage.id='heroV4Stage';stage.setAttribute('aria-hidden','true');
 populateStage(stage,parts);
 scene.appendChild(stage);
 scene.classList.add('hero-v4-active');
 const replay=$('#replay'),newReplay=replay.cloneNode(true);
 replay.replaceWith(newReplay);
 async function play(){
  const layers=Array.from(stage.children).sort((a,b)=>Number(a.style.zIndex)-Number(b.style.zIndex));
  scene.dataset.state='playing';
  gsap.killTweensOf(layers);
  if(reduced){gsap.set(layers,{opacity:1,y:0});scene.dataset.state='complete';return;}
  gsap.set(layers,{opacity:0,y:-460,rotation:5,scale:.84});
  const tl=gsap.timeline({onComplete:()=>{scene.dataset.state='complete';$('#heroBurst').classList.remove('pulse');void $('#heroBurst').offsetWidth;$('#heroBurst').classList.add('pulse');}});
  layers.forEach((el,i)=>tl.to(el,{opacity:1,y:0,rotation:0,scale:1,duration:.88,ease:'back.out(1.43)'},i*.26));
 }
 newReplay.addEventListener('click',event=>{event.stopPropagation();play();});
 play();
}
function installMenuFallback(){
 const fallbacks={district:'district',truffle:'truffle',habibi:'habibi',chicken:'chicken',fries:'fries',trufflefries:'fries2',rings:'rings',loaded:'loadedfries',cola:'drink',berry:'strawberry',choco:'shake',citrus:'soda',brownie:'brownie',icecream:'icecream',sundae:'sundae',duo:'burger2',night:'burger3'};
 document.addEventListener('error',event=>{
  const img=event.target;
  if(!(img instanceof HTMLImageElement))return;
  const prefix='/assets/menu-v4/';
  const path=img.getAttribute('src')||'';
  if(!path.startsWith(prefix))return;
  const key=path.slice(prefix.length).replace(/\.webp$/,'');
  const fallback=fallbacks[key];
  if(fallback){img.src='/assets/'+fallback+'.jpg';}
 },true);
}
installMenuFallback();
initBuilder();
initHero();
