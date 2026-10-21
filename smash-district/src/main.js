
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './style.css';
gsap.registerPlugin(ScrollTrigger);
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=window.matchMedia('(max-width: 650px)').matches;
const photos={
 hero:'/assets/hero.jpg',
 beef:'/assets/district.jpg',
 truffle:'/assets/truffle.jpg',
 habibi:'/assets/habibi.jpg',
 chicken:'/assets/chicken.jpg',
 fries:'/assets/fries.jpg',
 fries2:'/assets/fries2.jpg',
 drink:'/assets/drink.jpg',
 soda:'/assets/soda.jpg'
};
const products=[
 {id:'district',category:'burgers',name:'THE DISTRICT',description:'Double smash patties, American cheddar, pickles & secret district sauce.',price:38,image:photos.beef,tag:'BESTSELLER'},
 {id:'truffle',category:'burgers',name:'TRUFFLE BOSS',description:'Juicy beef, rich truffle mayo, grilled mushrooms & aged cheddar.',price:42,image:photos.truffle,tag:'PREMIUM'},
 {id:'habibi',category:'burgers',name:'SPICY HABIBI',description:'Beef patty, jalapeños, crispy onions & signature hot sauce.',price:36,image:photos.habibi,tag:'SPICY'},
 {id:'chicken',category:'burgers',name:'CRISPY REBEL',description:'Golden crispy chicken, crunchy slaw & smoky pepper mayo.',price:34,image:photos.chicken,tag:'CRUNCH'},
 {id:'fries',category:'sides',name:'DIRTY FRIES',description:'Crispy skin-on fries loaded with melted cheese & house seasoning.',price:22,image:photos.fries,tag:'FAN FAVORITE'},
 {id:'fries2',category:'sides',name:'TRUFFLE FRIES',description:'Hand-cut fries, truffle drizzle, parmesan & sea salt.',price:25,image:photos.fries2,tag:'EXTRA'},
 {id:'cola',category:'drinks',name:'DISTRICT COLA',description:'Ice-cold fizzy cola. The perfect partner in crime.',price:12,image:photos.drink,tag:'ICE COLD'},
 {id:'lemonade',category:'drinks',name:'SUNSET FIZZ',description:'Sparkling lemon and citrus with a bright Dubai sunset twist.',price:17,image:photos.soda,tag:'REFRESHING'}
];
const cart=new Map();
const cartDrawer=$('#cartDrawer'),cartScrim=$('#cartScrim'),cartCount=$('#cartCount'),cartItems=$('#cartItems');
let currentFilter='all';
let toastTimeout;
let focusReturn=null;
const money=n=>'AED '+n;
function notice(message){
 const toast=$('#toast');toast.textContent=message;toast.classList.add('show');
 window.clearTimeout(toastTimeout);toastTimeout=window.setTimeout(()=>toast.classList.remove('show'),3100);
}
function readBag(){
 try{
  const data=JSON.parse(localStorage.getItem('sd-demo-bag')||'{}');
  for(const [key,value] of Object.entries(data)){
   if(products.some(p=>p.id===key)&&Number.isInteger(value)&&value>0&&value<=99)cart.set(key,value);
  }
 }catch{}
}
function persistBag(){
 try{localStorage.setItem('sd-demo-bag',JSON.stringify(Object.fromEntries(cart)));}catch{}
}
function updateCart(){
 const count=[...cart.values()].reduce((a,b)=>a+b,0);
 cartCount.textContent=String(count);
 cartCount.setAttribute('aria-label',count+' items in bag');
 let sum=0;
 if(!cart.size){
  cartItems.innerHTML='<div class="empty-bag"><span style="font-size:50px;color:var(--fire)">✳</span><b>SO EMPTY.</b><p>Looks like your cravings haven\'t arrived yet. Go grab a burger.</p></div>';
 } else {
  cartItems.innerHTML=[...cart.entries()].map(([id,quantity])=>{
   const p=products.find(x=>x.id===id);if(!p)return '';
   sum+=p.price*quantity;
   return '<div class="cart-line"><img src="'+p.image+'" alt="" loading="lazy"/><div class="cart-line-main"><strong>'+p.name+'</strong><small>'+money(p.price*quantity)+'</small><div class="quantity"><button type="button" data-qty="-1" data-id="'+id+'" aria-label="Remove one '+p.name+'">−</button><span>'+quantity+'</span><button type="button" data-qty="1" data-id="'+id+'" aria-label="Add one '+p.name+'">+</button></div></div></div>';
  }).join('');
 }
 $('#cartTotal').textContent=money(sum);
 $('#checkout').disabled=!cart.size;
 $('#checkout').style.opacity=cart.size?'1':'.4';
 persistBag();
}
function openCart(){
 closeMobile();
 focusReturn=document.activeElement;
 cartScrim.hidden=false;cartDrawer.classList.add('open');cartDrawer.setAttribute('aria-hidden','false');document.body.classList.add('locked');
 $('#cartClose').focus();
}
function closeCart(){
 cartDrawer.classList.remove('open');cartDrawer.setAttribute('aria-hidden','true');cartScrim.hidden=true;
 if($('#storyModal').hidden)document.body.classList.remove('locked');
 if(focusReturn&&document.contains(focusReturn))focusReturn.focus();
}
function add(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 cart.set(id,Math.min(99,(cart.get(id)||0)+1));updateCart();
 gsap.fromTo('#cartCount',{scale:1.65},{scale:1,duration:.35,ease:'back.out(2)'});
 notice(p.name+' ADDED TO YOUR BAG ✳');
}
function renderMenu(){
 const visible=currentFilter==='all'?products:products.filter(p=>p.category===currentFilter);
 const grid=$('#menuGrid');
 grid.innerHTML=visible.map((p,i)=>
 '<article class="menu-item" style="animation-delay:'+Math.min(i*.04,.28)+'s">'+
 '<div class="menu-image"><img src="'+p.image+'" alt="'+p.name+'" loading="lazy" /><span class="menu-tag">'+p.tag+'</span></div>'+
 '<div class="menu-item-body"><div class="menu-item-head"><h3>'+p.name+'</h3></div>'+
 '<p class="menu-desc">'+p.description+'</p><div class="menu-item-bottom"><strong class="menu-item-price">'+money(p.price)+'</strong>'+
 '<button type="button" class="menu-add" data-add="'+p.id+'" aria-label="Add '+p.name+' to bag">+</button></div></div></article>'
 ).join('');
}
function setFilter(filter){
 if(filter!=='all'&&!['burgers','sides','drinks'].includes(filter))return;
 currentFilter=filter;
 $$('.filter').forEach(b=>{const active=b.dataset.filter===filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 renderMenu();
}
const mobileMenu=$('#mobileMenu'),menuToggle=$('#menuToggle');
function openMobile(){mobileMenu.inert=false;mobileMenu.hidden=false;menuToggle.classList.add('open');menuToggle.setAttribute('aria-expanded','true');document.body.classList.add('locked');}
function closeMobile(){mobileMenu.inert=true;mobileMenu.hidden=true;menuToggle.classList.remove('open');menuToggle.setAttribute('aria-expanded','false');if(cartDrawer.getAttribute('aria-hidden')==='true'&&$('#storyModal').hidden)document.body.classList.remove('locked');}
function toggleMobile(){if(mobileMenu.hidden)openMobile();else closeMobile();}
function openStory(){
 focusReturn=document.activeElement;
 closeMobile();const modal=$('#storyModal');modal.hidden=false;document.body.classList.add('locked');
 gsap.fromTo($('.modal-inner',modal),{y:65,opacity:0,scale:.95},{y:0,opacity:1,scale:1,duration:.65,ease:'power3.out'});
 $('#storyClose').focus();
}
function closeStory(){const modal=$('#storyModal');modal.hidden=true;if(cartDrawer.getAttribute('aria-hidden')==='true')document.body.classList.remove('locked');if(focusReturn&&document.contains(focusReturn))focusReturn.focus();}
function initEvents(){
 $('#cartTrigger').addEventListener('click',openCart);
 $('#cartClose').addEventListener('click',closeCart);
 cartScrim.addEventListener('click',closeCart);
 $('#checkout').addEventListener('click',()=>{
  if(!cart.size)return;
  const count=[...cart.values()].reduce((a,b)=>a+b,0);
  cart.clear();updateCart();closeCart();
  notice('DEMO ORDER CONFIRMED! '+count+' ITEM'+(count===1?'':'S')+' ✳ NO PAYMENT TAKEN.');
 });
 $('#cartItems').addEventListener('click',e=>{
  const b=e.target.closest('[data-qty]');if(!b)return;
  const id=b.dataset.id;const next=(cart.get(id)||0)+Number(b.dataset.qty);
  if(next<=0)cart.delete(id);else cart.set(id,Math.min(99,next));updateCart();
 });
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-add]');if(b)add(b.dataset.add);
 });
 $$('.filter').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));
 $('#menuToggle').addEventListener('click',toggleMobile);
 mobileMenu.hidden=true;mobileMenu.inert=true;
 $$('#mobileMenu a').forEach(a=>a.addEventListener('click',closeMobile));
 $('#storyTrigger').addEventListener('click',openStory);
 $('#storyTriggerTwo').addEventListener('click',openStory);
 $('#storyClose').addEventListener('click',closeStory);
 $('#modalMenu').addEventListener('click',()=>{closeStory();$('#menu').scrollIntoView({behavior:reducedMotion?'auto':'smooth'});});
 $('#storyModal').addEventListener('click',e=>{if(e.target.id==='storyModal')closeStory();});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(!$('#storyModal').hidden)closeStory();else if(cartDrawer.classList.contains('open'))closeCart();else if(!mobileMenu.hidden)closeMobile();}
  if(e.key!=='Tab')return;
  const active=!$('#storyModal').hidden?$('#storyModal'):cartDrawer.classList.contains('open')?cartDrawer:!mobileMenu.hidden?mobileMenu:null;
  if(!active)return;
  const f=$$('a[href],button:not([disabled])',active).filter(x=>x.offsetParent!==null);if(!f.length)return;
  const first=f[0],last=f[f.length-1];
  if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}
  else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}
 });
 $$('.site-header a').forEach(a=>a.addEventListener('click',()=>{if(!mobileMenu.hidden)closeMobile();}));
}
function initMotion(){
 const loader=$('#loading');
 document.body.classList.add('locked');
 window.setTimeout(()=>{
  loader.classList.add('done');
  document.body.classList.remove('locked');
  if(reducedMotion){$$('.reveal').forEach(e=>e.style.opacity='1');return;}
  const hero=gsap.timeline({defaults:{ease:'power4.out'}});
  hero.from('.hero-eyebrow',{opacity:0,y:20,duration:.5})
   .from('.title-reveal > span',{yPercent:116,rotate:3,duration:1.1,stagger:.13},'-=.15')
   .from('.hero-description',{opacity:0,y:27,duration:.75},'-=.65')
   .from('.hero-buttons',{opacity:0,y:28,duration:.75},'-=.55')
   .from('.hero-image-wrap',{opacity:0,scale:.73,rotate:-7,duration:1.45,ease:'expo.out'},'-=1.30')
   .from('.orbit-badge',{opacity:0,scale:.5,rotate:-25,duration:.65},'-=.85')
   .from('.hero-bottom',{opacity:0,y:13,duration:.55},'-=.45');
  gsap.utils.toArray('.reveal').forEach(el=>gsap.fromTo(el,{y:55,opacity:0},{y:0,opacity:1,duration:.92,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 89%',once:true}}));
  gsap.from('.story-heading',{y:85,opacity:0,duration:1,scrollTrigger:{trigger:'.story-copy',start:'top 70%',once:true}});
  gsap.from('.story-body',{y:35,opacity:0,duration:.8,scrollTrigger:{trigger:'.story-body',start:'top 88%',once:true}});
  gsap.to('.story-image-layer',{yPercent:14,ease:'none',scrollTrigger:{trigger:'.story',start:'top bottom',end:'bottom top',scrub:true}});
  gsap.fromTo('.statement-head',{scale:.66,rotate:-7,opacity:.05},{scale:1,rotate:0,opacity:1,ease:'none',scrollTrigger:{trigger:'.statement',start:'top 85%',end:'center 40%',scrub:true}});
  gsap.to('.hero-burger',{yPercent:18,rotate:2,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
  gsap.from('.location-art',{opacity:0,rotate:3,scale:.86,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:'.location',start:'top 70%',once:true}});
  gsap.from('.location-copy',{opacity:0,x:-45,duration:.8,scrollTrigger:{trigger:'.location',start:'top 73%',once:true}});
  $$('.magnetic').forEach(el=>{
   el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;gsap.to(el,{x:x*.14,y:y*.22,duration:.35,ease:'power2.out'});});
   el.addEventListener('mouseleave',()=>gsap.to(el,{x:0,y:0,duration:.6,ease:'elastic.out(1,.5)'}));
  });
  if(window.matchMedia('(pointer:fine)').matches){
   const dot=$('#cursorDot');dot.style.opacity='1';
   document.addEventListener('pointermove',e=>{
    gsap.to(dot,{x:e.clientX,y:e.clientY,duration:.22,ease:'power2.out'});
    if(e.clientX>window.innerWidth*.45&&window.scrollY<window.innerHeight*1.1){
     const x=(e.clientX/window.innerWidth-.7)*20,y=(e.clientY/window.innerHeight-.5)*12;
     gsap.to('.hero-image-wrap',{x,y,duration:1,ease:'power2.out',overwrite:'auto'});
    }
   },{passive:true});
   $$('a,button,.feature-card').forEach(el=>{
    el.addEventListener('mouseenter',()=>dot.classList.add('big'));
    el.addEventListener('mouseleave',()=>dot.classList.remove('big'));
   });
  }
 }
 ,1150);
}
function scrollFeedback(){
 const update=()=>{
  const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  $('#scrollProgress').style.width=((scrollY/max)*100)+'%';
  $('#siteHeader').classList.toggle('scrolled',scrollY>45);
 };
 window.addEventListener('scroll',update,{passive:true});update();
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   const id=entry.target.id;$$('.nav-link').forEach(x=>x.classList.toggle('active',x.getAttribute('href')==='#'+id));
  }
 },{rootMargin:'-30% 0px -60% 0px',threshold:0});
 $$('#home,#favorites,#story,#menu,#location').forEach(el=>observer.observe(el));
}
readBag();
renderMenu();
updateCart();
initEvents();
scrollFeedback();
initMotion();
window.addEventListener('pageshow',()=>document.body.classList.remove('locked'));
