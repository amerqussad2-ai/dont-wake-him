
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
// These photographs have different transparent margins. In particular, the beef
// asset has ~44% empty pixels above the actual patty. Position the *visible*
// ingredient rather than the top edge of its image box.
const layerGeometry={
 'bottom-bun': {width:70,height:12,rise:0},
 'lower-sauce':{width:75,height:6,rise:3},
 'second-patty':{width:76,height:17,rise:7,alphaTop:182/410},
 'upper-cheese':{width:75,height:9,rise:5.5},
 'first-patty':{width:76,height:17,rise:7,alphaTop:182/410},
 'cheese':{width:75,height:9,rise:5.5},
 'pickles':{width:70,height:7,rise:4},
 'jalapenos':{width:70,height:7,rise:4},
 'lettuce':{width:79,height:7,rise:4},
 'upper-sauce':{width:75,height:6,rise:3},
 'top-bun':{width:82,height:25,rise:21}
};
function layersFor(m){
 const bun=m.bun==='potato'?'potato':'brioche';
 // The composition grows from the bottom upward. Optional cheese/toppings
 // occupy no space when deselected, avoiding holes in the finished burger.
 const ordered=[
  ['bottom-bun',files[bun+'-bottom']],
  ['lower-sauce',files[m.sauce]]
 ];
 if(m.extras.includes('double')){
  ordered.push(['second-patty',files[m.protein]]);
  if(m.cheese!=='none')ordered.push(['upper-cheese',files[m.cheese]]);
 }
 ordered.push(['first-patty',files[m.protein]]);
 if(m.cheese!=='none')ordered.push(['cheese',files[m.cheese]]);
 if(m.extras.includes('pickles'))ordered.push(['pickles',files.pickles]);
 if(m.extras.includes('jalapeno'))ordered.push(['jalapenos',files.jalapeno]);
 ordered.push(['lettuce',files.lettuce],['upper-sauce',files[m.sauce]],['top-bun',files[bun+'-top']]);
 const usedHeight=layerGeometry['bottom-bun'].height+
   ordered.slice(1).reduce((total,[key])=>total+layerGeometry[key].rise,0);
 // Center every valid combination (single/double, with/without toppings).
 let visibleTop=50+usedHeight/2-layerGeometry['bottom-bun'].height;
 return ordered.map(([key,filename],level)=>{
  const g=layerGeometry[key];
  if(level)visibleTop-=g.rise;
  return {
   key,asset:filename,level:level+1,width:g.width,height:g.height,
   top:visibleTop-(g.alphaTop||0)*g.height
  };
 });
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
 for(const [index,layer] of parts.entries()){
  let node=oldNodes.get(layer.key);
  const exists=node&&node.dataset.asset===layer.asset;
  const previousTop=exists?parseFloat(node.style.getPropertyValue('--layer-top')):NaN;
  if(!exists){
   node=document.createElement('img');
   node.src=asset(layer.asset);
   node.alt='';node.className='burger-ingredient';
   node.dataset.key=layer.key;node.dataset.asset=layer.asset;
   node.decoding='async';
  }else{
   gsap.killTweensOf(node);
  }
  node.style.zIndex=String(layer.level);
  node.style.setProperty('--layer-top',layer.top+'%');
  node.style.setProperty('--layer-width',layer.width+'%');
  node.style.setProperty('--layer-height',layer.height+'%');
  stage.appendChild(node);
  if(!reduced){
   if(!exists){
    gsap.fromTo(node,{y:-105,opacity:0,scale:.97},{
     y:0,opacity:1,scale:1,duration:.62,
     delay:fresh?index*.10:0,ease:'back.out(1.15)',overwrite:true
    });
   }else if(Number.isFinite(previousTop)&&Math.abs(previousTop-layer.top)>.03){
    const oldOffset=(previousTop-layer.top)*stage.getBoundingClientRect().height/100;
    gsap.fromTo(node,{y:oldOffset},{y:0,duration:.42,ease:'power2.out',overwrite:true});
   }
  }
 }
 // Retain unchanged DOM elements and animate only new layers into the stack.
 const active=new Map(parts.map(part=>[part.key,part.asset]));
 oldNodes.forEach((node,key)=>{
  if(active.get(key)!==node.dataset.asset)node.remove();
 });
 stage.setAttribute('aria-label','Photographic '+parts.length+'-layer customized burger');
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
  gsap.set(layers,{opacity:0,y:-185,rotation:0,scale:.96});
  const tl=gsap.timeline({onComplete:()=>{scene.dataset.state='complete';$('#heroBurst').classList.remove('pulse');void $('#heroBurst').offsetWidth;$('#heroBurst').classList.add('pulse');}});
  layers.forEach((el,i)=>tl.to(el,{opacity:1,y:0,rotation:0,scale:1,duration:.65,ease:'back.out(1.15)'},i*.15));
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
