
import './v3.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const $=(selector,base=document)=>base.querySelector(selector);
const $$=(selector,base=document)=>Array.from(base.querySelectorAll(selector));
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const photo=(name)=>'/assets/'+name+'.jpg';
const menuPhoto=name=>'/assets/menu-v4/'+name+'.webp';
const products=[
 {id:'district',category:'burgers',name:'THE DISTRICT',price:38,tag:'BEST SELLER',image:menuPhoto('district'),desc:'Double smashed beef, melted cheddar, pickles & signature house sauce.'},
 {id:'truffle',category:'burgers',name:'TRUFFLE BOSS',price:44,tag:'SIGNATURE',image:menuPhoto('truffle'),desc:'Smashed beef, truffle mayo, Swiss cheese & buttery mushrooms.'},
 {id:'habibi',category:'burgers',name:'SPICY HABIBI',price:37,tag:'BRING THE HEAT',image:menuPhoto('habibi'),desc:'Juicy beef, jalapeños, crunchy onions & fiery pepper sauce.'},
 {id:'chicken',category:'burgers',name:'CRISPY REBEL',price:36,tag:'CRISPY',image:menuPhoto('chicken'),desc:'Golden crispy chicken, creamy slaw & smoky ranch.'},
 {id:'fries',category:'sides',name:'GOLDEN FRIES',price:21,tag:'CLASSIC',image:menuPhoto('fries'),desc:'Golden thin-cut fries, house seasoning and a rich dipping sauce.'},
 {id:'trufflefries',category:'sides',name:'TRUFFLE FRIES',price:24,tag:'PREMIUM',image:menuPhoto('trufflefries'),desc:'Crisp fries finished with parmesan, sea salt & truffle sauce.'},
 {id:'rings',category:'sides',name:'CRUNCHY RINGS',price:19,tag:'CRUNCH TIME',image:menuPhoto('rings'),desc:'Thick-cut onion rings fried golden with smoky house dip.'},
 {id:'loaded',category:'sides',name:'SKINNY FRIES',price:22,tag:'SO GOOD',image:menuPhoto('loaded'),desc:'Extra-crispy shoestring fries with punchy house spice.'},
 {id:'cola',category:'drinks',name:'ICE COLD COLA',price:12,tag:'REFRESH',image:menuPhoto('cola'),desc:'The perfect ice-cold, fizzy sidekick to a smashed burger.'},
 {id:'berry',category:'drinks',name:'PINK DISTRICT',price:24,tag:'PINK SPECIAL',image:menuPhoto('berry'),desc:'Bright pink strawberry lemonade served over ice with fresh lemon and mint.'},
 {id:'choco',category:'drinks',name:'CHOCOLATE RIOT',price:26,tag:'SHAKES',image:menuPhoto('choco'),desc:'Rich chocolate milkshake, thick and indulgent.'},
 {id:'citrus',category:'drinks',name:'CITRUS COOLER',price:16,tag:'COOL DOWN',image:menuPhoto('citrus'),desc:'A bright lemon-and-herb cooler served over ice.'},
 {id:'brownie',category:'desserts',name:'BROWNIE BLAST',price:27,tag:'DARK & FUDGY',image:menuPhoto('brownie'),desc:'Thick chocolate brownies with a glossy fudge drizzle.'},
 {id:'icecream',category:'desserts',name:'CLOUD NINE',price:19,tag:'SWEET ENDING',image:menuPhoto('icecream'),desc:'Creamy, smooth ice cream served the classic way.'},
 {id:'sundae',category:'desserts',name:'SUNDAE CLUB',price:25,tag:'THE GRAND FINALE',image:menuPhoto('sundae'),desc:'Layered ice cream sundae topped with chocolate crunch.'},
 {id:'duo',category:'combos',name:'DISTRICT COMBO',price:59,tag:'BURGERS + FRIES',image:menuPhoto('duo'),desc:'The District burger, golden fries and ice-cold cola together.'},
 {id:'night',category:'combos',name:'LATE NIGHT DUO',price:75,tag:'BIGGER IS BETTER',image:menuPhoto('night'),desc:'Two signature smash burgers with a side of hot fries.'}
];
const categories={
 burgers:{number:'01',title:'BURGERS',desc:'Pressed hot. Stacked high. Served loud.'},
 sides:{number:'02',title:'SIDES',desc:'The perfect partners in crime.'},
 drinks:{number:'03',title:'DRINKS',desc:'Cool down. Double down.'},
 desserts:{number:'04',title:'DESSERTS',desc:'Save a little room for the good stuff.'},
 combos:{number:'05',title:'COMBOS',desc:'More to love. All in one.'}
};
const addon={id:'addon-meal',category:'addon',name:'FRIES + COLA ADD-ON',price:29,image:photo('fries'),desc:'Golden fries and ice-cold cola meal upgrade.'};
const allProducts=[...products,addon];
const cart=new Map();
const money=n=>'AED '+n;
let currentCategory='burgers';
let toastTimer,upsellTimer,audioCtx,cartFocus,assemblyTimer;
function safe(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
function tone(kind='click'){
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audioCtx??=new Audio();
  if(audioCtx.state==='suspended')audioCtx.resume();
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
  const base=kind==='add'?720:kind==='drop'?190:kind==='done'?850:480;
  o.type=kind==='drop'?'triangle':'sine';
  o.frequency.setValueAtTime(base,t);
  o.frequency.exponentialRampToValueAtTime(base*(kind==='drop'?.62:1.14),t+.105);
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(kind==='drop'?.012:.021,t+.009);
  g.gain.exponentialRampToValueAtTime(.0001,t+.14);
  o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+.15);
 }catch{}
}
// No sound control: unobtrusive effects become available after the browser permits playback on interaction.
document.addEventListener('click',event=>{
 if(event.target.closest('button,a'))tone('click');
},true);
function toast(message){
 const el=$('#toast');el.textContent=message;el.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2700);
}
function setupHero(){
 const shell=$('#heroPhoto'),full=$('#heroPhotoFull'),layers=$$('.food-layer'),burst=$('#heroBurst'),replay=$('#replay');
 let current=null,flight=0;
 shell.dataset.state='loading';
 function finish(){
  shell.classList.remove('is-building');
  shell.classList.add('is-assembled');
  shell.dataset.state='complete';
  gsap.to(full,{opacity:1,duration:.46,ease:'power2.out'});
  gsap.to(layers,{opacity:0,duration:.55,delay:.17,onComplete:()=>{layers.forEach(l=>l.style.visibility='hidden');}});
  burst.classList.remove('pulse');void burst.offsetWidth;burst.classList.add('pulse');
  tone('drop');
 }
 function play(){
  if(current)current.kill();
  flight++;
  const run=flight;
  shell.classList.remove('is-assembled');shell.classList.add('is-building');
  shell.dataset.state='playing';
  gsap.killTweensOf([...layers,full]);
  gsap.set(full,{opacity:0});
  gsap.set(layers,{visibility:'visible',opacity:0,x:0,y:0,rotation:0,scale:1});
  const tl=gsap.timeline({onComplete:()=>{if(run===flight)finish();}});
  // Start with bottom bun, then smashed patties, cheese, pickles and top bun.
  // Every image is a real transparent photographed layer, not a strip of empty backdrop.
  [...layers].reverse().forEach((layer,i)=>{
   tl.fromTo(layer,
    {y:-380-i*53,x:(i%2===0?-115:120),opacity:0,rotation:(i%2?11:-12),scale:.80},
    {y:0,x:0,opacity:1,rotation:0,scale:1,duration:.88,ease:'back.out(1.45)',
     onStart:()=>{if(run===flight)tone('drop');}},
    i*.31);
  });
  tl.to('.hero-orange-glow',{scale:1.24,opacity:.96,duration:.7,ease:'power1.out'},.9);
  tl.to('.hero-orange-glow',{scale:1,opacity:.75,duration:1.3,ease:'sine.inOut'},'>');
  current=tl;
 }
 replay.addEventListener('click',()=>{tone('click');play();});
 if(reduced){
  shell.classList.add('is-assembled');shell.dataset.state='complete';
  gsap.set(full,{opacity:1});return;
 }
 // Static photo fallback is visible until the layer images are decoded; no blank hero.
 const ready=Promise.all(layers.map(img=>img.decode().catch(()=>null)));
 Promise.race([ready,new Promise(resolve=>setTimeout(resolve,3800))]).then(()=>{
  const good=layers.every(img=>img.naturalWidth>0);
  if(!good){shell.classList.add('is-assembled');shell.dataset.state='complete';return;}
  play();
 });
}

function createCard(p,index){
 return '<article class="product-card" style="animation-delay:'+Math.min(index*80,300)+'ms" data-product="'+p.id+'">'+
 '<div class="product-photo product-frame"><img src="'+p.image+'" loading="lazy" alt="'+safe(p.name)+' food photography"><span class="food-chip">'+safe(p.tag)+'</span></div>'+
 '<div class="product-card-body"><h4>'+safe(p.name)+'</h4><p class="product-description">'+safe(p.desc)+'</p>'+
 '<div class="product-card-foot"><strong>'+money(p.price)+'</strong><button class="product-add" type="button" data-add="'+p.id+'" aria-label="Add '+safe(p.name)+' to demo bag">+</button></div></div></article>';
}
function showCategory(category,focus=false){
 if(!categories[category])return;
 currentCategory=category;
 $$('.category-tab').forEach(b=>{
  const active=b.dataset.cat===category;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;
 });
 $('#categoryNumber').textContent=categories[category].number+' / CATEGORY';
 $('#categoryTitle').textContent=categories[category].title;
 $('#categoryDescription').textContent=categories[category].desc;
 const p=$('#menuPanel');
 p.setAttribute('aria-labelledby','tab-'+category);
 p.innerHTML=products.filter(x=>x.category===category).map(createCard).join('');
 if(focus)$('.product-add',p)?.focus({preventScroll:true});
}
function initMenu(){
 const tabs=$$('.category-tab');
 tabs.forEach((b,index)=>{
  b.addEventListener('click',()=>showCategory(b.dataset.cat));
  b.addEventListener('keydown',e=>{
   if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
   e.preventDefault();
   const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   showCategory(tabs[next].dataset.cat);tabs[next].focus();
  });
 });
 showCategory('burgers');
}
function openUpsell(){
 const el=$('#upsell');el.hidden=false;clearTimeout(upsellTimer);
 upsellTimer=setTimeout(()=>el.hidden=true,13000);
}
function closeUpsell(){clearTimeout(upsellTimer);$('#upsell').hidden=true;}
function addProduct(id,{offer=true}={}){
 const p=allProducts.find(x=>x.id===id)||customProducts.find(x=>x.id===id);
 if(!p)return;
 cart.set(id,Math.min(50,(cart.get(id)||0)+1));renderCart();persistCart();tone('add');toast(p.name+' ADDED TO YOUR BAG ✳');
 if(offer&&p.category==='burgers')openUpsell();
}
const customProducts=[];
function restoreCart(){
 try{
  const saved=JSON.parse(localStorage.getItem('smash-v3-cart')||'{}');
  const custom=Array.isArray(saved.custom)?saved.custom:[];
  custom.forEach(p=>{
   if(typeof p?.id==='string'&&p.id.startsWith('custom-')&&typeof p.name==='string'&&Number.isInteger(p.price)&&p.price>0&&p.price<200&&typeof p.image==='string'&&p.image.startsWith('/assets/')){
    customProducts.push({id:p.id,name:p.name.slice(0,80),price:p.price,image:p.image,desc:String(p.desc||'').slice(0,160),category:'custom'});
   }
  });
  if(saved.items&&typeof saved.items==='object'){
   Object.entries(saved.items).forEach(([id,qty])=>{
    if(Number.isInteger(qty)&&qty>0&&qty<=50&&(allProducts.some(p=>p.id===id)||customProducts.some(p=>p.id===id)))cart.set(id,qty);
   });
  }
 }catch{}
}
function persistCart(){
 try{localStorage.setItem('smash-v3-cart',JSON.stringify({items:Object.fromEntries(cart),custom:customProducts.slice(-20)}));}catch{}
}
function renderCart(){
 let qty=0,total=0;
 const chunks=[];
 for(const [id,num] of cart.entries()){
  const p=allProducts.find(x=>x.id===id)||customProducts.find(x=>x.id===id);
  if(!p)continue;qty+=num;total+=num*p.price;
  chunks.push('<div class="cart-line" data-id="'+p.id+'"><img alt="" src="'+p.image+'"><div><h4>'+safe(p.name)+'</h4><p>'+safe(p.desc)+'</p><strong>'+money(num*p.price)+'</strong><div class="qty"><button type="button" data-qty="-1" data-id="'+p.id+'" aria-label="Remove one '+safe(p.name)+'">−</button><span>'+num+'</span><button type="button" data-qty="1" data-id="'+p.id+'" aria-label="Add one '+safe(p.name)+'">+</button></div></div></div>');
 }
 $('#bagCount').textContent=qty;
 $('#subtotal').textContent=money(total);
 $('#cartItems').innerHTML=chunks.join('')||'<div class="empty-cart"><span style="color:var(--orange);font-size:48px">✳</span><b>HUNGRY?</b>Nothing in your bag yet. Head to the menu and pick a favorite.</div>';
 $('#checkout').disabled=!qty;
}
function openCart(){
 closeUpsell();cartFocus=document.activeElement;
 $('#overlay').hidden=false;$('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false');
 document.body.classList.add('locked');$('#cartClose').focus();
}
function closeCart(){
 $('#cartDrawer').classList.remove('open');$('#cartDrawer').setAttribute('aria-hidden','true');
 $('#overlay').hidden=true;document.body.classList.remove('locked');
 if(cartFocus?.isConnected)cartFocus.focus({preventScroll:true});
}
function initCart(){
 restoreCart();renderCart();
 $('#navCart').addEventListener('click',openCart);
 $('#cartClose').addEventListener('click',closeCart);
 $('#overlay').addEventListener('click',closeCart);
 $('#cartItems').addEventListener('click',e=>{
  const b=e.target.closest('[data-qty]');if(!b)return;
  const quantity=(cart.get(b.dataset.id)||0)+Number(b.dataset.qty);
  if(quantity<=0)cart.delete(b.dataset.id);else cart.set(b.dataset.id,Math.min(50,quantity));
  renderCart();persistCart();
 });
 document.addEventListener('click',e=>{
  const b=e.target.closest('button[data-add]');if(b)addProduct(b.dataset.add);
 });
 $('#checkout').addEventListener('click',()=>{
  if(!cart.size)return;
  const count=[...cart.values()].reduce((a,b)=>a+b,0);
  cart.clear();persistCart();renderCart();closeCart();tone('done');
  toast('DEMO ORDER COMPLETE! '+count+' ITEM'+(count===1?'':'S')+' — NO PAYMENT TAKEN.');
 });
 $('#upsellClose').addEventListener('click',closeUpsell);
 $('#upsellDecline').addEventListener('click',closeUpsell);
 $('#upsellAccept').addEventListener('click',()=>{
  closeUpsell();addProduct('addon-meal',{offer:false});
 });
}
const builderOptions={
 bun:[{value:'brioche',label:'BRIOCHE',cost:0},{value:'potato',label:'POTATO',cost:3}],
 protein:[{value:'beef',label:'SMASHED BEEF',cost:0},{value:'chicken',label:'CRISPY CHICKEN',cost:4}],
 cheese:[{value:'cheddar',label:'CHEDDAR',cost:4},{value:'swiss',label:'SWISS',cost:5},{value:'none',label:'NO CHEESE',cost:0}],
 sauce:[{value:'house',label:'HOUSE',cost:0},{value:'truffle',label:'TRUFFLE',cost:5},{value:'fire',label:'FIRE',cost:2}],
 extra:[{value:'pickles',label:'PICKLES',cost:2},{value:'jalapeno',label:'JALAPEÑOS',cost:3},{value:'double',label:'EXTRA PATTY',cost:12}]
};
const builder={bun:'brioche',protein:'beef',cheese:'cheddar',sauce:'house',extra:[]};
function builderPick(group){return builderOptions[group].find(x=>x.value===builder[group]);}
function buildPrice(){return 30+['bun','protein','cheese','sauce'].reduce((sum,k)=>sum+builderPick(k).cost,0)+builder.extra.reduce((sum,id)=>sum+builderOptions.extra.find(x=>x.value===id).cost,0);}
function buildPhoto(){
 if(builder.protein==='chicken')return photo('chicken');
 if(builder.sauce==='fire')return photo('habibi');
 if(builder.sauce==='truffle')return photo('truffle');
 if(builder.bun==='potato')return photo('burger4');
 return photo('district');
}
function builderLabel(){
 return builderPick('protein').label+' · '+builderPick('cheese').label+' · '+builderPick('sauce').label+' SAUCE';
}
function updateBuilder(){
 ['bun','protein','cheese','sauce','extra'].forEach(group=>{
  $$('[data-group="'+group+'"]').forEach(button=>{
   const active=group==='extra'?builder.extra.includes(button.dataset.value):builder[group]===button.dataset.value;
   button.setAttribute('aria-pressed',String(active));
  });
 });
 $('#buildTotal').textContent=money(buildPrice());
 $('#buildLabel').textContent=builderLabel();
 const img=$('#builderImage');
 const next=buildPhoto();
 if(img.getAttribute('src')!==next){
  img.classList.add('updating');
  const preload=new Image();
  preload.onload=()=>{img.src=next;requestAnimationFrame(()=>img.classList.remove('updating'));};
  preload.onerror=()=>img.classList.remove('updating');
  preload.src=next;
 }
}
function builderSetup(){
 for(const [group,opts] of Object.entries(builderOptions)){
  const holder=$('#'+group+'Options');
  holder.innerHTML=opts.map(o=>'<button class="build-chip" type="button" data-group="'+group+'" data-value="'+o.value+'" aria-pressed="false">'+safe(o.label)+' <small>'+(o.cost?'+'+o.cost+' AED':'INCLUDED')+'</small></button>').join('');
 }
 $$('.build-chip').forEach(b=>b.addEventListener('click',()=>{
  const group=b.dataset.group,val=b.dataset.value;
  if(group==='extra')builder.extra=builder.extra.includes(val)?builder.extra.filter(x=>x!==val):[...builder.extra,val];
  else builder[group]=val;
  updateBuilder();
 }));
 updateBuilder();
 $('#addCustom').addEventListener('click',()=>{
  const details=[builderPick('bun').label,builderPick('protein').label,builderPick('cheese').label,builderPick('sauce').label,...builder.extra.map(x=>builderOptions.extra.find(o=>o.value===x).label)].join(' · ');
  const key=JSON.stringify(builder);let hash=2166136261;
  for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),16777619);
  const id='custom-'+(hash>>>0).toString(36);
  if(!customProducts.some(p=>p.id===id)){
   customProducts.push({id,category:'custom',name:'YOUR CUSTOM SMASH',price:buildPrice(),image:buildPhoto(),desc:details});
  }
  addProduct(id,{offer:false});persistCart();
 });
}
function initNav(){
 const toggle=$('#navToggle'),nav=$('#mobileNav');
 function close(){nav.hidden=true;toggle.classList.remove('open');toggle.setAttribute('aria-expanded','false');document.body.classList.remove('locked');}
 toggle.addEventListener('click',()=>{
  const toOpen=nav.hidden;
  if(toOpen){nav.hidden=false;toggle.classList.add('open');toggle.setAttribute('aria-expanded','true');document.body.classList.add('locked');}
  else close();
 });
 $$('#mobileNav a').forEach(link=>link.addEventListener('click',close));
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
   if($('#cartDrawer').classList.contains('open'))closeCart();
   else if(!nav.hidden)close();else closeUpsell();
  }
  if(e.key==='Tab'&&$('#cartDrawer').classList.contains('open')){
   const focusables=$$('button:not(:disabled),a[href]',$('#cartDrawer'));
   const first=focusables[0],last=focusables[focusables.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 });
}
function initScroll(){
 const els=$$('.reveal');
 if(!reduced&&'IntersectionObserver' in window){
  document.body.classList.add('motion-ready');
  const observer=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}});
  },{threshold:.09,rootMargin:'0px 0px -5% 0px'});
  els.forEach(el=>observer.observe(el));
 }
 let ticking=false;
 function onScroll(){
  if(ticking)return;ticking=true;
  requestAnimationFrame(()=>{
   const denominator=Math.max(1,document.documentElement.scrollHeight-innerHeight);
   $('#scrollLine').style.width=(scrollY/denominator*100)+'%';
   $('#header').classList.toggle('shrunk',scrollY>35);
   ticking=false;
  });
 }
 addEventListener('scroll',onScroll,{passive:true});onScroll();
 if(!reduced&&matchMedia('(pointer:fine)').matches){
  const art=$('#heroArt');
  art.addEventListener('mousemove',event=>{
   const rect=art.getBoundingClientRect();
   const x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;
   $('#heroPhoto').style.transform='translate3d('+(x*18)+'px,'+(y*15+15)+'px,0)';
  },{passive:true});
  art.addEventListener('mouseleave',()=>{$('#heroPhoto').style.transform='translate3d(0,15px,0)';});
 }
}
function initCinematicMotion(){
 if(reduced)return;
 // Moving on-scroll elements instead of only a subtle fade: measurable and visible.
 gsap.utils.toArray('.featured-card').forEach((card,i)=>{
  gsap.fromTo(card,{y:110,scale:.87,opacity:.35,rotate:-2},{y:0,scale:1,opacity:1,rotate:0,duration:1.05,ease:'power3.out',
   scrollTrigger:{trigger:card,start:'top 90%',end:'top 45%',scrub:.8}});
 });
 gsap.fromTo('.menu-heading h2',{x:-160,opacity:.35,scale:.88},{x:0,opacity:1,scale:1,ease:'none',
  scrollTrigger:{trigger:'.menu-heading',start:'top 95%',end:'top 48%',scrub:true}});
 gsap.fromTo('.category-bar',{y:100,opacity:.2},{y:0,opacity:1,ease:'none',scrollTrigger:{trigger:'.category-bar',start:'top 98%',end:'top 55%',scrub:true}});
 gsap.fromTo('.builder-photo-box',{y:22,scale:.96,rotate:0},{y:-12,scale:1.04,rotate:0,ease:'none',
  scrollTrigger:{trigger:'.builder-section',start:'top bottom',end:'bottom top',scrub:true}});
 gsap.fromTo('.builder-editor h2',{y:130,opacity:.2},{y:0,opacity:1,ease:'none',scrollTrigger:{trigger:'.builder-section',start:'top 85%',end:'top 27%',scrub:true}});
 gsap.fromTo('.closing h2',{scale:.5,rotate:-7,opacity:.12},{scale:1,rotate:0,opacity:1,ease:'none',
  scrollTrigger:{trigger:'.closing',start:'top bottom',end:'center center',scrub:true}});
 gsap.to('.hero-art-ring',{rotation:40,scale:1.18,duration:16,ease:'none',repeat:-1,yoyo:true});
 gsap.to('.hero-star',{y:-28,rotation:40,duration:3.2,repeat:-1,yoyo:true,ease:'sine.inOut',stagger:.4});
 window.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});
}
function init(){
 if(!window.__SMASH_V4__)setupHero();initMenu();initCart();builderSetup();initNav();initScroll();initCinematicMotion();
}
init();
