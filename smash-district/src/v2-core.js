
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

const newEnglish={
 replay:'REPLAY THE SMASH',builderKicker:'YOUR RULES. YOUR BURGER.',builderEyebrow:'MAKE IT YOURS',
 builderTitle:'NO RULES.<br/><em>JUST CRAVINGS.</em>',
 builderIntro:'Pick your favorites. Watch it stack. Your creation, your way.',
 extrasLabel:'05 / EXTRA ATTITUDE',yourCreation:'YOUR CREATION',addBuild:'ADD MY BURGER',
 demoDisclaimer:'Interactive concept only · No actual orders or payments',
 dropEyebrow:'THE DISTRICT EXPERIMENTS',conceptDrop:'CONCEPT DROP / 001',
 dropTitle:'MEET THE<br/><em>MIDNIGHT</em><br/>MELT.',
 dropDescription:'Double smash. Dark pepper glaze. Melted cheese. A fictional limited-edition burger with after-dark Dubai energy.',
 tryDrop:'ADD THE DROP',dropNotice:'Fictional special — no real product availability.',
 socialEyebrow:'DISTRICT CULTURE',socialTitle:'EAT LOUD.<br/><em>LIVE LOUDER.</em>',
 socialDescription:'A fictional feed. Real appetite. The moments, the mess, the mood.',
 socialNotice:'Concept social gallery — not an active restaurant account.',
 lastEyebrow:'THE LAST WORD ON CRAVINGS',lastTitle:'TAKE THE<br/><em>FIRST BITE.</em>',
 lastButton:'FIND YOUR BURGER ↗',lastFine:'SMASH DISTRICT — A FICTIONAL DUBAI BURGER BRAND.',
 filtercombos:'COMBOS',filterdesserts:'DESSERTS',filterlimited:'LIMITED DROPS',buildNav:'BUILD YOURS',
 upgradeEyebrow:'LEVEL UP YOUR BITE',upgradeTitle:'MAKE IT A COMBO?',
 upgradeText:'Add crispy fries + an ice-cold cola for AED 28.',
 upgradeYes:'ADD + AED 28 ↗',upgradeNo:'NOT NOW'
};
const newArabic={
 replay:'أعد تجميع البرجر',builderKicker:'برجرك. على كيفك.',builderEyebrow:'صممه بنفسك',
 builderTitle:'بدون قواعد.<br/><em>بس على مزاجك.</em>',
 builderIntro:'اختار مكوناتك المفضّلة، وشوف البرجر يتكوّن أمامك. أنت صاحب القرار.',
 extrasLabel:'05 / إضافات مميزة',yourCreation:'سعر برجرك',addBuild:'أضف برجري للسلة',
 demoDisclaimer:'تجربة تفاعلية وهمية · بدون طلبات أو مدفوعات حقيقية',
 dropEyebrow:'تجارب سماش ديستريكت',conceptDrop:'إصدار خيالي / 001',
 dropTitle:'تعرّف على<br/><em>ميدنايت</em><br/>ميلت.',
 dropDescription:'لحم سماش مزدوج، صوص فلفل غامق وجبنة سايحة. إصدار موسمي خيالي مستوحى من ليالي دبي.',
 tryDrop:'أضف البرجر',dropNotice:'منتج خيالي للعرض فقط، وغير متاح للطلب الحقيقي.',
 socialEyebrow:'ثقافة الديستريكت',socialTitle:'كُل على كيفك.<br/><em>وعِش بقوة.</em>',
 socialDescription:'صور وعروض من عالم سماش ديستريكت الخيالي، مليانة نكهات وشخصية.',
 socialNotice:'قسم اجتماعي تجريبي، وليس حساب مطعم فعلي.',
 lastEyebrow:'آخر كلمة للجوع',lastTitle:'جاهز<br/><em>لأول لقمة؟</em>',
 lastButton:'اكتشف البرجر ↗',lastFine:'سماش ديستريكت — مفهوم مطعم برجر وهمي في دبي.',
 filtercombos:'كومبوهات',filterdesserts:'حلويات',filterlimited:'إصدارات خاصة',buildNav:'صمّم برجرك',
 upgradeEyebrow:'خلّي الوجبة أكمل',upgradeTitle:'تحوّلها لكومبو؟',
 upgradeText:'أضف بطاطا مقرمشة وكولا باردة مقابل 28 درهم.',
 upgradeYes:'أضف + 28 درهم ↗',upgradeNo:'مش الآن'
};
const originals=[
 ['.nav-link[href="#home"]','HOME','الرئيسية'],
 ['.nav-link[href="#favorites"]','THE HITS','المفضّلة'],
 ['.nav-link[href="#story"]','OUR STORY','قصّتنا'],
 ['.nav-link[href="#menu"]','MENU','المنيو'],
 ['.nav-link[href="#location"]','DUBAI','دبي'],
 ['.mobile-menu a[href="#home"]','HOME','الرئيسية'],
 ['.mobile-menu a[href="#favorites"]','THE HITS','الأكثر طلبًا'],
 ['.mobile-menu a[href="#story"]','OUR STORY','قصّتنا'],
 ['.mobile-menu a[href="#menu"]','FULL MENU','المنيو الكامل'],
 ['.mobile-menu a[href="#location"]','FIND US','موقعنا'],
 ['.header-order','ORDER NOW <span>↗</span>','اطلب الآن <span>↗</span>'],
 ['.hero-eyebrow','<span class="eyebrow-line"></span> DUBAI-BORN ENERGY. NO HALF MEASURES.','<span class="eyebrow-line"></span> من قلب دبي. نكهة بلا حدود.'],
 ['.hero-title .title-reveal:nth-child(1)>span','NOT YOUR','مش أي'],
 ['.hero-title .title-reveal:nth-child(2)>span','AVERAGE','برجر'],
 ['.hero-title .title-reveal:nth-child(3)>span','BURGER<span class="title-period">.</span>','عادي<span class="title-period">.</span>'],
 ['.hero-description','Crispy edges. Melting cheese. Zero apologies. A burger experience made to turn up the heat in Dubai.','أطراف لحم مقرمشة، جبنة سايحة ونكهات قوية. تجربة برجر جريئة من وحي دبي.'],
 ['.hero-buttons .btn-fire>span:first-child','EXPLORE THE MENU','شوف المنيو'],
 ['#storyTrigger>span:last-child','THE DISTRICT STORY','قصّة الديستريكت'],
 ['.hero-side-note>span:last-child','SCROLL TO FEEL THE HEAT','انزل واكتشف النكهة'],
 ['.hero-bottom>span:first-child','01 / 05 — WELCOME TO THE DISTRICT','01 / 05 — أهلاً بالديستريكت'],
 ['.marquee-track','<span>GOOD FOOD. LOUD FLAVOR. <b>✳</b> ZERO REGRETS. <b>✳</b> SMASH DISTRICT DUBAI. <b>✳</b></span><span>GOOD FOOD. LOUD FLAVOR. <b>✳</b> ZERO REGRETS. <b>✳</b> SMASH DISTRICT DUBAI. <b>✳</b></span>','<span>طعم قوي. <b>✳</b> برجر استثنائي. <b>✳</b> سماش ديستريكت دبي. <b>✳</b></span><span>طعم قوي. <b>✳</b> برجر استثنائي. <b>✳</b> سماش ديستريكت دبي. <b>✳</b></span>'],
 ['.section-head .eyebrow','<span class="eyebrow-line"></span> NOT JUST BURGERS. OBSESSIONS.','<span class="eyebrow-line"></span> أكثر من مجرد برجر.'],
 ['.section-head .section-title','THE <em>HEAVY</em><br/>HITTERS<span class="orange-dot">.</span>','نجوم <em>المنيو</em><span class="orange-dot">.</span>'],
 ['.section-side span','HANDPICKED FOR MAXIMUM CRAVING.','مختارة بعناية لعشاق البرجر.'],
 ['.section-side p','Three legends. One impossible choice. Every bite goes hard.','ثلاثة برجرات مميزة، وأصعب قرار هو أي واحد تختار.'],
 ['.text-link','SEE THE ENTIRE MENU <span>↗</span>','شوف المنيو كامل <span>↗</span>'],
 ['.story-copy .eyebrow','<span class="eyebrow-line"></span> THE DISTRICT DNA','<span class="eyebrow-line"></span> روح الديستريكت'],
 ['.story-heading','SMASHED<br/>WITH <i>SOUL.</i><br/>SERVED<br/>WITH <i>HEAT.</i>','برجر<br/><i>من القلب.</i><br/>نكهة<br/><i>ما بتنتسى.</i>'],
 ['.story-body','We believe a burger should be more than something you eat. It should be the thing you remember. Bold ingredients, unapologetic flavor, and a whole lot of Dubai attitude.','البرجر بالنسبة إلنا مش مجرد وجبة. هو تجربة ما بتنتسى. مكونات قوية، نكهة جريئة وروح مستوحاة من دبي.'],
 ['.story-copy .btn-outline','MEET THE DISTRICT <span>↗</span>','تعرّف علينا <span>↗</span>'],
 ['.menu-top .eyebrow','<span class="eyebrow-line"></span> PICK YOUR OBSESSION','<span class="eyebrow-line"></span> اختار اللي بتحبه'],
 ['.menu-top .section-title','THE FULL <em>MENU</em><span class="orange-dot">.</span>','المنيو <em>الكامل</em><span class="orange-dot">.</span>'],
 ['.menu-top>p','Built for every craving. Prices in AED. <b>Demo ordering only.</b>','خيارات لكل الأذواق. الأسعار بالدرهم الإماراتي. <b>طلبات تجريبية فقط.</b>'],
 ['.filter[data-filter="all"]','ALL THE GOOD STUFF <span>↗</span>','كل الأصناف <span>↗</span>'],
 ['.filter[data-filter="burgers"]','BURGERS','برجر'],
 ['.filter[data-filter="sides"]','SIDES','مقبلات'],
 ['.filter[data-filter="drinks"]','DRINKS','مشروبات'],
 ['.statement .eyebrow','WE DON&#39;T DO ORDINARY','مو مثل أي برجر'],
 ['.statement-head','BITE<br/><span>BACK.</span>','لقمة<br/><span>أقوى.</span>'],
 ['.statement-cut','<span>✳</span> BRING YOUR APPETITE. LEAVE YOUR EXPECTATIONS. <span>✳</span>','<span>✳</span> جهّز شهيتك. وانسى كل توقعاتك. <span>✳</span>'],
 ['.statement .btn-black','GET YOUR FIX <span>↗</span>','اختار وجبتك <span>↗</span>'],
 ['.location-copy .eyebrow','<span class="eyebrow-line"></span> MADE FOR THE CITY THAT NEVER SETTLES','<span class="eyebrow-line"></span> لمدينة ما بتعرف الهدوء'],
 ['.location-copy .section-title','DUBAI<br/>AFTER <em>DARK.</em>','دبي<br/>بعد <em>الليل.</em>'],
 ['.location-copy>p:not(.eyebrow)','Late-night cravings, city lights, and burgers worth going out for. Imagined for the heart of Dubai.','سهرات دبي وأضواؤها ونكهات بتستحق الطلعة. تجربة متخيّلة في قلب دبي.'],
 ['.location-copy .btn-fire','EXPLORE THE MENU <span>↗</span>','اكتشف المنيو <span>↗</span>'],
 ['.location-details>div:nth-child(1)>strong','CITY WALK, DUBAI','سيتي ووك، دبي'],
 ['.location-details>div:nth-child(1)>small','Concept location — not an operating restaurant','موقع افتراضي، المطعم غير موجود فعليًا'],
 ['.location-details>div:nth-child(2)>small','Illustrative hours · demonstration only','أوقات توضيحية للعرض فقط'],
 ['.footer-main>div>p','CRAVINGS DON&#39;T WAIT.<br/>NEITHER DO WE.','الجوع ما بينتظر.<br/>ولا إحنا.'],
 ['.footer-back','BACK TO THE TOP ↑','ارجع لفوق ↑'],
 ['.cart-head .eyebrow','YOUR CRAVINGS','طلباتك'],
 ['.cart-head h2','THE BAG<span class="orange-dot">.</span>','السلة<span class="orange-dot">.</span>'],
 ['.total-row>span','SUBTOTAL','الإجمالي'],
 ['.cart-disclaimer','Demo only. No payment, delivery or real restaurant orders.','تجربة فقط. لا يوجد دفع أو توصيل أو طلبات حقيقية.'],
 ['#checkout','PLACE DEMO ORDER <span>↗</span>','تأكيد طلب تجريبي <span>↗</span>'],
 ['.modal-inner .eyebrow','THE DISTRICT / DUBAI','الديستريكت / دبي'],
 ['.modal-inner h2','THIS ISN&#39;T<br/>JUST A <em>BURGER.</em><br/>IT&#39;S A <i>STATEMENT.</i>','هذا مش<br/>مجرد <em>برجر.</em><br/>هذه <i>تجربة.</i>'],
 ['.modal-inner>p:not(.eyebrow)','A fictional Dubai burger brand imagined with unapologetically bold food, cinematic visuals, and a love of everything smashed.','براند برجر وهمي في دبي. نكهات قوية، صور سينمائية وشغف بالبرجر المقرمش.'],
 ['#modalMenu','TASTE THE MENU <span>↗</span>','شوف المنيو <span>↗</span>'],
];
const arabicProducts={
 district:['ذا ديستريكت','لحم سماش مزدوج، جبنة أمريكية، مخلل وصوص الديستريكت.'],
 truffle:['ترافل بوس','لحم طري، مايونيز ترافل، مشروم مشوي وجبنة معتقة.'],
 habibi:['سبايسي حبيبي','لحم سماش، هالبينو، بصل مقرمش وصوص حار.'],
 chicken:['كريسبي ريبل','دجاج مقرمش، كولسلو وصوص فلفل مدخن.'],
 fries:['ديرتي فرايز','بطاطا مقرمشة بجبنة سايحة وبهاراتنا الخاصة.'],
 fries2:['ترافل فرايز','بطاطا يدوية، ترافل، بارميزان وملح بحري.'],
 cola:['ديستريكت كولا','كولا غازية باردة، مثالية جنب البرجر.'],
 lemonade:['سنست فيز','ليمون وحمضيات غازية بلمسة مستوحاة من غروب دبي.'],
 smokehouse:['سموك سيجنال','سماش مزدوج بصوص باربكيو مدخن وبصل مقرمش.'],
 double:['دبل ترابل','ثلاث طبقات لحم وثلاث طبقات جبنة مع المخلل.'],
 classic:['أولد سكول','برجر سماش كلاسيكي، جبنة وبصل ومخلل وخردل.'],
 honey:['هوت هاني كرانش','دجاج مقرمش بعسل حار، كولسلو وصوص رانش.'],
 rings:['جولدن رينجز','حلقات بصل ذهبية مع صوص مدخن للتغميس.'],
 cheesefries:['تشيز أفالانش','بطاطا غارقة بالجبنة وصوص تشيبوتلي.'],
 pickles:['بيكل بوبرز','مخلل مقرمش مع صوص رانش.'],
 shake:['شوكليت رايوت','ميلك شيك شوكولاتة كثيف مع كريمة.'],
 strawberry:['بينك ديستريكت','ميلك شيك فراولة مع دوامة توت.'],
 citrus:['سيتروس سبلاش','مشروب حمضيات منعش وبارد.'],
 sundae:['صنداي كلَب','آيس كريم فانيلا مع شوكولاتة وقطع مقرمشة.'],
 brownie:['براوني بلاست','براوني غني مع كريمة وصوص شوكولاتة.'],
 icecream:['كلاود ناين','آيس كريم بطعم كلاسيكي وصوص كراميل.'],
 combo1:['وجبة الديستريكت','برجر الديستريكت مع بطاطا وكولا.'],
 combo2:['ذا بيج نايت','ترافل بوس مع ترافل فرايز وميلك شيك شوكولاتة.'],
 combo3:['تو أوف أ كايند','برجرين أولد سكول مع ديرتي فرايز.'],
 midnight:['ميدنايت ميلت','سماش مزدوج بصوص الفلفل والجبنة الذائبة.'],
 firestarter:['فاير ستارتر','لحم سماش بهالبينو وعسل حار وصوص ناري.'],
 upsize:['إضافة بطاطا وكولا','بطاطا وكولا بسعر كومبو خاص.']
};
function localizeMenu(){
 const current=$('.filter[aria-pressed="true"]')?.dataset.filter||'all';
 const visible=current==='all'?app.products.filter(p=>!['upgrades','custom'].includes(p.category)):app.products.filter(p=>p.category===current);
 $$('.menu-item').forEach((node,i)=>{
  const p=visible[i];if(!p)return;
  const t=arabicProducts[p.id];if(!t)return;
  $('h3',node).textContent=t[0];
  $('.menu-desc',node).textContent=t[1];
  const b=$('button[data-add]',node);if(b)b.setAttribute('aria-label','أضف '+t[0]+' إلى السلة');
 });
}
function localizeCart(){
 $$('.cart-line').forEach(line=>{
  const id=line.dataset.cart;
  const t=arabicProducts[id];if(t)$('strong',line).textContent=t[0];
 });
 const empty=$('.empty-bag');
 if(empty){$('b',empty).textContent='السلة فاضية';$('p',empty).textContent='لسه ما ضفت أي شي؟ اختار برجرك المفضل!';}
}
function applyLanguage(){
 const arabic=language==='ar';
 document.documentElement.lang=language;document.documentElement.dir=arabic?'rtl':'ltr';
 document.body.classList.toggle('lang-ar',arabic);
 document.title=arabic?'سماش ديستريكت — دبي | برجر بطعم مختلف':'SMASH DISTRICT® — Dubai | Built To Crave';
 $('#languageToggle').textContent=arabic?'EN':'العربية';
 $('#languageToggle').setAttribute('aria-label',arabic?'Switch to English':'التبديل إلى العربية');
 for(const [selector,en,ar] of originals){
  const node=$(selector);if(node)node.innerHTML=arabic?ar:en;
 }
 $$('[data-i18n]').forEach(el=>{
  const key=el.dataset.i18n;
  if(key in newEnglish)el.innerHTML=arabic?newArabic[key]:newEnglish[key];
 });
 $$('.build-group[data-group]').forEach((el,i)=>{
  const titles=arabic?['01 / نوع الخبز','02 / نوع البروتين','03 / الجبنة','04 / الصوص']:['01 / YOUR BUN','02 / THE MAIN EVENT','03 / MELTY GOODNESS','04 / SAUCE IT UP'];
  const title=$('.build-group-title>span',el);if(title)title.textContent=titles[i];
 });
 $$('[data-choice]').forEach(b=>{
  const value=options[b.dataset.choice].find(o=>o.id===b.dataset.value);
  $('[data-option-name]',b).textContent=arabic?value.ar:value.en;
  $('small',b).textContent=value.cost?'+'+value.cost+' AED':(arabic?'مشمول':'INCLUDED');
 });
 $$('[data-extra]').forEach(b=>{
  const value=extras.find(o=>o.id===b.dataset.extra);
  $('[data-extra-name]',b).textContent='+ '+(arabic?value.ar:value.en);
 });
 if(arabic){localizeMenu();localizeCart();}
 else{ // Rebuild cards and cart labels in the original product language when switching back.
  app.renderMenu();app.updateCart();
 }
}
function setupMotion(){
 if(reduced)return;
 for(const selector of ['.builder-section','.drop-copy','.drop-photo','.social-section','.last-cta']){
  const el=$(selector);if(!el)continue;
  gsap.fromTo(el,{opacity:0,y:65},{opacity:1,y:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 86%',once:true}});
 }
 gsap.fromTo('.builder-burger',{y:-30,rotate:-8},{y:10,rotate:3,ease:'none',scrollTrigger:{trigger:'.builder-section',start:'top bottom',end:'bottom top',scrub:true}});
 gsap.fromTo('.drop-photo img',{scale:1.17,y:-30},{scale:1,y:30,ease:'none',scrollTrigger:{trigger:'.drop-section',start:'top bottom',end:'bottom top',scrub:true}});
 gsap.fromTo('.last-cta h2',{scale:.68,opacity:.1},{scale:1,opacity:1,ease:'none',scrollTrigger:{trigger:'.last-cta',start:'top 92%',end:'center 56%',scrub:true}});
 $$('.social-frame').forEach(el=>{
  gsap.fromTo(el,{opacity:0,y:60,rotate:2},{opacity:1,y:0,rotate:0,duration:.9,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}});
 });
 if(matchMedia('(pointer:fine)').matches){
  $$('.feature-card,.menu-item').forEach(el=>{
   el.addEventListener('pointermove',e=>{
    const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    gsap.to(el,{rotateX:-y*3,rotateY:x*4,transformPerspective:900,duration:.35,ease:'power2.out'});
   });
   el.addEventListener('pointerleave',()=>gsap.to(el,{rotateX:0,rotateY:0,duration:.6,ease:'power3.out'}));
  });
 }
 ScrollTrigger.refresh();
}
createContent();
builderEvents();
overlayEvents();
updateBurger();
applyLanguage();
window.setTimeout(setupMotion,1200);
