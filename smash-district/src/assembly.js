
import gsap from 'gsap';
const $=s=>document.querySelector(s);
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const layers=[
 ['bottom',73],['patty2',66],['cheese2',62],['patty1',54],['cheese1',49],
 ['sauce',46],['lettuce',43],['tomato',40],['onion',35],['top',18]
];
function svg(kind){
 const defs='<defs>'+
 '<linearGradient id="bun" x2=".25" y2="1"><stop stop-color="#ffd99b"/><stop offset=".35" stop-color="#d88b41"/><stop offset=".78" stop-color="#91451e"/><stop offset="1" stop-color="#562511"/></linearGradient>'+
 '<linearGradient id="meat" x2=".2" y2="1"><stop stop-color="#a15c36"/><stop offset=".32" stop-color="#572914"/><stop offset=".75" stop-color="#302016"/><stop offset="1" stop-color="#1a0d08"/></linearGradient>'+
 '<linearGradient id="cheese" x2=".1" y2="1"><stop stop-color="#fff2a4"/><stop offset=".3" stop-color="#ffcd35"/><stop offset="1" stop-color="#e98605"/></linearGradient>'+
 '<linearGradient id="leaf" x2=".2" y2="1"><stop stop-color="#cef777"/><stop offset=".4" stop-color="#6ca92c"/><stop offset="1" stop-color="#315e19"/></linearGradient>'+
 '<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".08 .24" numOctaves="3" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6"/></filter></defs>';
 const seeds=Array.from({length:39},(_,i)=>{const x=170+i*79%365,y=40+i*27%68;return '<ellipse cx="'+x+'" cy="'+y+'" rx="6" ry="2.8" fill="#ffedbd" transform="rotate('+(i*13%100-50)+' '+x+' '+y+')" opacity=".85"/>';}).join('');
 const patty='<path d="M89 70 Q108 46 150 59 Q203 42 254 54 Q309 39 361 56 Q415 37 463 55 Q512 38 561 53 Q594 49 612 72 L602 117 Q583 139 536 120 Q498 141 443 124 Q394 145 343 124 Q293 142 245 121 Q184 144 150 124 Q98 140 90 112Z" fill="url(#meat)" stroke="#241109" stroke-width="6" filter="url(#rough)"/><path d="M131 77 Q265 55 350 75 T571 74" fill="none" stroke="#c8874b" stroke-width="9" opacity=".65" stroke-dasharray="26 12 5 19"/>';
 const cheese='<path d="M91 54 Q280 47 361 50 L613 52 584 87 560 101 537 83 522 132 Q504 148 493 119 L470 85 438 85 424 110 Q412 120 399 95 L372 83 332 106 Q312 127 293 88 L251 86 224 117 Q199 123 183 91 L147 79 117 100Z" fill="url(#cheese)" stroke="#e69519" stroke-width="4"/><path d="M135 65 Q319 54 574 63" fill="none" stroke="#fff2b3" stroke-width="9" opacity=".65"/>';
 const parts={
  top:'<path d="M95 148 Q96 48 202 21 Q352 -21 501 20 Q603 51 607 144 Q344 170 95 148Z" fill="url(#bun)" stroke="#6c3214" stroke-width="6"/><path d="M128 132 Q344 149 576 128" stroke="#f6c181" stroke-width="13" opacity=".65" fill="none"/>'+seeds,
  bottom:'<path d="M113 27 Q345 9 583 27 L590 84 Q558 145 350 147 Q151 145 113 89Z" fill="url(#bun)" stroke="#6c3214" stroke-width="6"/><path d="M139 49 Q350 24 561 46" stroke="#ffdfa0" stroke-width="14" opacity=".6" fill="none"/>',
  patty1:patty,patty2:patty,
  cheese1:cheese,cheese2:cheese,
  lettuce:'<path d="M95 98 Q110 47 149 77 Q176 18 217 78 Q254 21 284 72 Q316 14 354 69 Q391 12 421 70 Q454 23 492 76 Q537 27 567 75 Q593 48 607 101 Q564 131 538 109 Q499 142 461 110 Q427 138 384 117 Q337 153 297 115 Q255 147 218 112 Q168 142 143 111 Q114 131 95 98Z" fill="url(#leaf)" stroke="#386f20" stroke-width="4"/><path d="M120 98 Q351 60 583 98" stroke="#e2f7a9" stroke-width="8" opacity=".5" fill="none"/>',
  tomato:'<ellipse cx="264" cy="88" rx="152" ry="52" fill="#a51e10"/><ellipse cx="264" cy="75" rx="146" ry="42" fill="#e03c21" stroke="#ff8c55" stroke-width="9"/><ellipse cx="445" cy="90" rx="145" ry="51" fill="#931509"/><ellipse cx="445" cy="78" rx="133" ry="41" fill="#de341a" stroke="#fc8b53" stroke-width="8"/>',
  onion:'<ellipse cx="258" cy="85" rx="137" ry="40" fill="none" stroke="#f8dce8" stroke-width="17"/><ellipse cx="258" cy="85" rx="137" ry="40" fill="none" stroke="#995887" stroke-width="6"/><ellipse cx="446" cy="79" rx="124" ry="33" fill="none" stroke="#f4d4e3" stroke-width="17"/><ellipse cx="446" cy="79" rx="124" ry="33" fill="none" stroke="#a0578c" stroke-width="6"/>',
  sauce:'<path d="M102 88 Q139 54 171 75 Q214 92 250 72 Q303 42 352 76 Q390 92 423 66 Q469 46 521 76 Q551 84 595 67" fill="none" stroke="#ff9923" stroke-width="28" stroke-linecap="round"/><path d="M171 82 Q188 112 177 128 M345 83 Q363 105 347 133 M516 83 Q535 100 514 120" fill="none" stroke="#ffb42d" stroke-width="15" stroke-linecap="round"/>'
 };
 return '<svg viewBox="0 0 700 170" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">'+defs+'<ellipse cx="350" cy="157" rx="250" ry="7" fill="#000" opacity=".45"/>'+parts[kind]+'</svg>';
}
export function setupAssembly(){
 const host=$('.hero-media');if(!host)return;
 const stage=document.createElement('div');stage.className='burger-assembly';
 stage.setAttribute('role','img');stage.setAttribute('aria-label','Burger ingredients fly down and stack into a finished burger');
 stage.innerHTML='<div class="assembly-shadow"></div>'+layers.map(l=>'<div class="ingredient ingredient-'+l[0]+'" data-layer="'+l[0]+'" style="top:'+l[1]+'%">'+svg(l[0])+'</div>').join('')+'<div class="assembly-lightburst"></div>';
 host.appendChild(stage);
 const img=$('.hero-image-wrap'),btn=document.createElement('button');
 btn.type='button';btn.className='assembly-replay';btn.id='assemblyReplay';
 btn.innerHTML='<span class="replay-icon">↻</span> <span data-i18n="replay">REPLAY THE SMASH</span>';
 host.appendChild(btn);
 if(reduced){stage.style.display='none';return;}
 let running=false;
 function play(){
  if(running)return;running=true;stage.style.display='block';
  const pieces=Array.from(stage.querySelectorAll('.ingredient'));
  const flash=stage.querySelector('.assembly-lightburst');
  gsap.set(img,{opacity:0,scale:.94});gsap.set(stage,{opacity:1});gsap.set(flash,{opacity:0,scale:.45});
  gsap.set(pieces,{opacity:0});
  const tl=gsap.timeline({onComplete:()=>{running=false;}});
  pieces.forEach((el,i)=>{
   tl.fromTo(el,{y:-440-i*28,opacity:0,rotation:-9+i*2,rotationX:25,scale:.8},
    {y:0,opacity:1,rotation:0,rotationX:0,scale:1,duration:.65,ease:'bounce.out',onStart:()=>window.SmashSound?.assemble?.(i)},
    i*.18);
  });
  tl.to(flash,{opacity:.92,scale:1.2,duration:.16},'>-.12')
    .to(flash,{opacity:0,scale:1.6,duration:.7},'>')
    .to(img,{opacity:1,scale:1,duration:1,ease:'power3.out'},'<-.45')
    .to(stage,{opacity:0,duration:.8},'<');
 }
 btn.addEventListener('click',()=>{window.SmashSound?.click?.();play();});
 gsap.set(img,{opacity:0});
 window.setTimeout(play,1230);
}
setupAssembly();
