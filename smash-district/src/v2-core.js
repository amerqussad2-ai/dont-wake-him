
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setupAssembly } from './assembly.js';
import './v2.css';
gsap.registerPlugin(ScrollTrigger);
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>Array.from(p.querySelectorAll(s));
const app=window.SmashApp;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const options={
 bun:[{id:'brioche',en:'BRIOCHE',ar:'بريوش',cost:0},{id:'potato',en:'POTATO BUN',ar:'خبز بطاطا',cost:3},{id:'black',en:'CHARCOAL BUN',ar:'خبز أسود',cost:5}],
 patty:[{id:'beef',en:'SMASHED BEEF',ar:'لحم سماش',cost:0},{id:'chicken',en:'CRISPY CHICKEN',ar:'دجاج مقرمش',cost:4},{id:'plant',en:'PLANT PATTY',ar:'برجر نباتي',cost:6}],
 cheese:[{id:'american',en:'AMERICAN',ar:'جبنة أمريكية',cost:4},{id:'swiss',en:'SWISS',ar:'جبنة سويسرية',cost:5},{id:'none',en:'NO CHEESE',ar:'بدون جبنة',cost:0}],
 sauce:[{id:'district',en:'HOUSE SECRET',ar:'صوص المطعم',cost:0},{id:'truffle',en:'TRUFFLE',ar:'صوص ترافل',cost:5},{id:'fire',en:'FIRE SAUCE',ar:'صوص حار',cost:2}]
};
const extras=[
 {id:'onion',en:'CRISPY ONIONS',ar:'بصل مقرمش',cost:3},
 {id:'jalapeno',en:'JALAPEÑOS',ar:'هالبينو',cost:3},
 {id:'double',en:'EXTRA PATTY',ar:'قطعة لحم إضافية',cost:13}
];
const selection={bun:'brioche',patty:'beef',cheese:'american',sauce:'district',extra:[]};
let language='en',soundEnabled=false,ctx=null,soundChannel=null;
try{language=localStorage.getItem('sd-language')==='ar'?'ar':'en';}catch{}
function soundTone(frequency=490,duration=.08,volume=.034){
 if(!soundEnabled)return;
 try{
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return;
  if(!ctx)ctx=new AudioCtx();
  if(ctx.state==='suspended')ctx.resume();
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(140,frequency*.68),ctx.currentTime+duration);
  gain.gain.setValueAtTime(.0001,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume,ctx.currentTime+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);
  oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+duration+.01);
 }catch{}
}
window.SmashSound={assemble:i=>soundTone(170+i*54,.15,.024),click:()=>soundTone(590,.09),add:()=>{soundTone(660,.11);setTimeout(()=>soundTone(880,.13),90)}};
function createContent(){
 const cssSection=document.createElement('div');
 cssSection.id='v2Sections';
 // Builder: ingredient choices really change the visual cross-section and price.
 const optionMarkup=(key,label)=>'<div class="build-group" data-group="'+key+'"><div class="build-group-title"><span>'+label+'</span><span class="build-group-index">0'+(Object.keys(options).indexOf(key)+1)+'</span></div><div class="build-options">'+options[key].map((o,i)=>'<button type="button" class="build-choice'+(i===0?' selected':'')+'" data-choice="'+key+'" data-value="'+o.id+'" aria-pressed="'+(i===0)+'"><span data-option-name="'+o.id+'">'+o.en+'</span><small>'+(o.cost?'+'+o.cost+' AED':'INCLUDED')+'</small></button>').join('')+'</div></div>';
 const builder='<section class="builder-section" id="builder"><div class="builder-visual" aria-label="Interactive burger preview">'+
 '<div class="builder-pattern"></div><p class="eyebrow orange builder-kicker" data-i18n="builderKicker">YOUR RULES. YOUR BURGER.</p>'+
 '<h2 class="builder-big-type"><span>BUILD</span><br/><em>YOUR</em><br/>OWN<span class="orange-dot">.</span></h2>'+
 '<div class="builder-burger" id="builderBurger"><div class="burger-part top-bun"></div><div class="burger-part burger-onion"></div><div class="burger-part burger-lettuce"></div><div class="burger-part burger-tomato"></div><div class="burger-part burger-sauce"></div><div class="burger-part burger-cheese"></div><div class="burger-part burger-extra-patty"></div><div class="burger-part burger-patty"></div><div class="burger-part bottom-bun"></div></div>'+
 '<div class="builder-visual-bottom"><span>THE DISTRICT LAB ©</span><span>01 / UNLIMITED ATTITUDE</span></div></div>'+
 '<div class="builder-editor"><p class="eyebrow orange" data-i18n="builderEyebrow"><span class="eyebrow-line"></span> MAKE IT YOURS</p><h2 class="editor-head" data-i18n="builderTitle">NO RULES.<br/><em>JUST CRAVINGS.</em></h2>'+
 '<p class="builder-intro" data-i18n="builderIntro">Pick your favorites. Watch it stack. Your creation, your way.</p>'+
 optionMarkup('bun','01 / YOUR BUN')+optionMarkup('patty','02 / THE MAIN EVENT')+optionMarkup('cheese','03 / MELTY GOODNESS')+optionMarkup('sauce','04 / SAUCE IT UP')+
 '<div class="build-group"><div class="build-group-title"><span data-i18n="extrasLabel">05 / EXTRA ATTITUDE</span></div><div class="extra-choices">'+extras.map(o=>'<button type="button" class="extra-choice" data-extra="'+o.id+'" aria-pressed="false"><span data-extra-name="'+o.id+'">+ '+o.en+'</span><small>+'+o.cost+' AED</small></button>').join('')+'</div></div>'+
 '<div class="builder-checkout"><div><small data-i18n="yourCreation">YOUR CREATION</small><strong id="buildPrice">AED 28</strong></div><button class="btn btn-fire" id="addBuild" type="button"><span data-i18n="addBuild">ADD MY BURGER</span><span>↗</span></button></div>'+
 '<p class="builder-disclaimer" data-i18n="demoDisclaimer">Interactive concept only · No actual orders or payments</p></div></section>';
 const limited='<section class="drop-section" id="drops"><div class="drop-copy"><p class="eyebrow orange" data-i18n="dropEyebrow">THE DISTRICT EXPERIMENTS</p><p class="drop-stamp" data-i18n="conceptDrop">CONCEPT DROP / 001</p><h2 data-i18n="dropTitle">MEET THE<br/><em>MIDNIGHT</em><br/>MELT.</h2><p data-i18n="dropDescription">Double smash. Dark pepper glaze. Melted cheese. A fictional limited-edition burger with after-dark Dubai energy.</p><div class="drop-bottom"><strong>AED 47</strong><button type="button" class="btn btn-fire" data-add="midnight"><span data-i18n="tryDrop">ADD THE DROP</span> <span>↗</span></button></div><small data-i18n="dropNotice">Fictional special — no real product availability.</small></div><div class="drop-photo"><img src="/assets/burger2.jpg" alt="Premium double beef burger concept" loading="lazy"/><div class="drop-orbit"><span>✳</span> AFTER DARK EDITION</div><span class="drop-number">NO. 001</span></div></section>';
 const social='<section class="social-section section" id="social"><div class="social-top"><div><p class="eyebrow orange" data-i18n="socialEyebrow">DISTRICT CULTURE</p><h2 class="section-title" data-i18n="socialTitle">EAT LOUD.<br/><em>LIVE LOUDER.</em></h2></div><p data-i18n="socialDescription">A fictional feed. Real appetite. The moments, the mess, the mood.</p></div><div class="social-gallery">'+
 [['/assets/burger3.jpg','01 / THE MELT'],['/assets/fries.jpg','02 / THE SIDE QUEST'],['/assets/shake.jpg','03 / AFTER HOURS'],['/assets/burger5.jpg','04 / HOT & LOUD']].map((x,i)=>'<div class="social-frame"><img src="'+x[0]+'" alt="Smash District food concept '+(i+1)+'" loading="lazy"/><span>'+x[1]+'</span><b>↗</b></div>').join('')+
 '</div><div class="social-footer"><span>#SMASHDISTRICTDXB</span><small data-i18n="socialNotice">Concept social gallery — not an active restaurant account.</small><span>✳ DUBAI BUILT</span></div></section>';
 const final='<section class="last-cta" id="lastCta"><p class="eyebrow" data-i18n="lastEyebrow">THE LAST WORD ON CRAVINGS</p><h2 data-i18n="lastTitle">TAKE THE<br/><em>FIRST BITE.</em></h2><a href="#menu" class="btn btn-fire" data-i18n="lastButton">FIND YOUR BURGER ↗</a><div class="last-asterisk">✳</div><p class="last-fine" data-i18n="lastFine">SMASH DISTRICT — A FICTIONAL DUBAI BURGER BRAND.</p></section>';
 cssSection.innerHTML=builder+limited+social+final;
 $('#statement').before($('#builder')||cssSection);
 // Detached sections are inserted separately to respect the existing story flow.
 const builderEl=$('#builder'),dropEl=$('#drops'),socialEl=$('#social'),finalEl=$('#lastCta');
 if(builderEl&&dropEl&&socialEl&&finalEl){
  $('#statement').before(builderEl);
  $('#location').before(dropEl);
  $('footer').before(socialEl);
  $('footer').before(finalEl);
 }
 // Extra navigation, filters, optional sound and upsell.
 const filterBar=$('.menu-filters');
 for(const [k,label] of [['combos','COMBOS'],['desserts','DESSERTS'],['limited','LIMITED DROPS']]){
  const b=document.createElement('button');b.className='filter';b.type='button';b.dataset.filter=k;b.dataset.i18n='filter'+k;b.textContent=label;b.setAttribute('aria-pressed','false');
  filterBar.appendChild(b);b.addEventListener('click',()=>{window.SmashSound?.click?.();app.setFilter(k);applyLanguage();});
 }
 const nav=$('.desktop-nav');
 const link=document.createElement('a');link.href='#builder';link.className='nav-link';link.dataset.i18n='buildNav';link.textContent='BUILD YOURS';nav.insertBefore(link,nav.querySelector('a[href="#menu"]'));
 const mobile=$('#mobileMenu');const mobileLink=document.createElement('a');mobileLink.href='#builder';mobileLink.dataset.i18n='buildNav';mobileLink.textContent='BUILD YOURS';mobile.insertBefore(mobileLink,mobile.querySelector('a[href="#menu"]'));mobileLink.addEventListener('click',()=>{$('#menuToggle').click();});
 const toggle=document.createElement('div');toggle.className='v2-controls';
 toggle.innerHTML='<button id="languageToggle" type="button" class="language-toggle" aria-label="Switch language">العربية</button><button type="button" id="soundToggle" class="sound-toggle" aria-label="Enable sound effects" aria-pressed="false" title="Optional sound effects">♫ <span>OFF</span></button>';
 $('.header-actions').insertBefore(toggle,$('#cartTrigger'));
 const popup=document.createElement('aside');popup.id='upgradePopup';popup.className='upgrade-popup';popup.setAttribute('role','region');popup.setAttribute('aria-label','Optional combo upgrade');popup.hidden=true;
 popup.innerHTML='<button type="button" class="upgrade-close" id="upgradeClose" aria-label="Dismiss upgrade">✕</button><p class="eyebrow orange" data-i18n="upgradeEyebrow">LEVEL UP YOUR BITE</p><h3 data-i18n="upgradeTitle">MAKE IT A COMBO?</h3><p data-i18n="upgradeText">Add crispy fries + an ice-cold cola for AED 28.</p><div class="upgrade-actions"><button type="button" id="upgradeYes" class="btn btn-fire" data-i18n="upgradeYes">ADD + AED 28 ↗</button><button type="button" id="upgradeNo" class="upgrade-no" data-i18n="upgradeNo">NOT NOW</button></div>';
 document.body.appendChild(popup);
}
function selected(key){return options[key].find(o=>o.id===selection[key]);}
function builderPrice(){
 return 24+Object.keys(options).reduce((n,k)=>n+selected(k).cost,0)+selection.extra.reduce((n,id)=>n+(extras.find(e=>e.id===id)?.cost||0),0);
}
function updateBurger(){
 const visual=$('#builderBurger');if(!visual)return;
 visual.dataset.bun=selection.bun;visual.dataset.patty=selection.patty;visual.dataset.cheese=selection.cheese;visual.dataset.sauce=selection.sauce;
 visual.classList.toggle('has-double',selection.extra.includes('double'));
 visual.classList.toggle('has-jalapeno',selection.extra.includes('jalapeno'));
 visual.classList.toggle('has-onion',selection.extra.includes('onion'));
 $('#buildPrice').textContent='AED '+builderPrice();
 $$('.build-choice').forEach(b=>{const on=selection[b.dataset.choice]===b.dataset.value;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
 $$('.extra-choice').forEach(b=>{const on=selection.extra.includes(b.dataset.extra);b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
 if(!reduced)gsap.fromTo(visual,{scale:.93,rotate:-1.4},{scale:1,rotate:0,duration:.55,ease:'back.out(1.4)',overwrite:true});
}
function builderEvents(){
 $$('.build-choice').forEach(b=>b.addEventListener('click',()=>{
  selection[b.dataset.choice]=b.dataset.value;window.SmashSound?.click?.();updateBurger();
 }));
 $$('.extra-choice').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.extra;
  selection.extra=selection.extra.includes(id)?selection.extra.filter(x=>x!==id):[...selection.extra,id];
  window.SmashSound?.click?.();updateBurger();
 }));
 $('#addBuild').addEventListener('click',()=>{
  const detail=Object.keys(options).map(k=>(language==='ar'?selected(k).ar:selected(k).en));
  const addition=selection.extra.map(id=>{const x=extras.find(e=>e.id===id);return language==='ar'?x.ar:x.en;});
  const description=detail.concat(addition).join(' · ');
  app.addCustomBurger({...selection,extra:[...selection.extra]},builderPrice(),description);
  window.SmashSound?.add?.();
  app.notice(language==='ar'?'تمت إضافة برجر بتصميمك إلى السلة ✳':'YOUR CUSTOM BURGER IS IN THE BAG ✳');
 });
}
function overlayEvents(){
 const popup=$('#upgradePopup');
 const hide=()=>{popup.hidden=true;popup.classList.remove('visible');};
 $('#upgradeClose').addEventListener('click',hide);
 $('#upgradeNo').addEventListener('click',hide);
 $('#upgradeYes').addEventListener('click',()=>{hide();app.add('upsize');window.SmashSound?.add?.();});
 let timer;
 window.addEventListener('smash:add',e=>{
  const p=e.detail||{};
  if(p.category!=='burgers'&&p.category!=='limited')return;
  popup.hidden=false;popup.classList.add('visible');
  clearTimeout(timer);timer=setTimeout(hide,17000);
  window.SmashSound?.add?.();
 });
 $('#languageToggle').addEventListener('click',()=>{
  language=language==='en'?'ar':'en';
  try{localStorage.setItem('sd-language',language);}catch{}
  window.SmashSound?.click?.();applyLanguage();
 });
 $('#soundToggle').addEventListener('click',()=>{
  soundEnabled=!soundEnabled;
  $('#soundToggle').setAttribute('aria-pressed',String(soundEnabled));
  $('#soundToggle span').textContent=soundEnabled?'ON':'OFF';
  $('#soundToggle').setAttribute('aria-label',soundEnabled?'Disable sound effects':'Enable sound effects');
  if(soundEnabled)soundTone(700,.12);
 });
 // Reflect demo basket labels when it changes.
 const observer=new MutationObserver(()=>{if(language==='ar')localizeCart();});
 observer.observe($('#cartItems'),{childList:true,subtree:false});
 const menuObserver=new MutationObserver(()=>{if(language==='ar')localizeMenu();});
 menuObserver.observe($('#menuGrid'),{childList:true,subtree:false});
}
