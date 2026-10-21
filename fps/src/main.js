import {
  Engine, Scene, UniversalCamera, Vector3, Color4
} from '@babylonjs/core';
import { LEVELS, ROOM, isReady, objectivesCompleted } from './levels.js';
import { buildWorld } from './world.js';
import './style.css';

const root=document.querySelector('#app');
root.innerHTML=`
  <canvas id="stage" tabindex="0" aria-label="First-person 3D game. Use WASD and mouse to move and look around."></canvas>
  <div class="shade"></div>
  <div class="topstrip">
    <div class="identity"><span class="identity-symbol">◐</span><span>DON'T WAKE <b>HIM</b><small>FIRST PERSON EDITION</small></span></div>
    <div class="stage-pill"><span id="level-num">LEVEL 01</span><span class="sep">/</span><span id="level-title">THE BEDROOM</span></div>
    <button class="text-button" id="menu-btn" aria-label="Pause game">Ⅱ <span>PAUSE</span></button>
  </div>
  <div class="hud" id="hud" hidden>
    <div class="hud-left">
      <div class="objective-panel">
        <div class="panel-heading"><span class="dash">▌</span> TONIGHT'S MISSIONS <span class="completed-number" id="completed">0 / 3</span></div>
        <div id="tasks"></div>
        <div class="objective-footer"><span class="tiny-dot"></span> LEAVE THROUGH THE DOOR WHEN DONE</div>
      </div>
      <div class="meters">
        <div class="meter"><div class="meter-label"><span>◉ NOISE</span><strong id="noise-value">0%</strong></div><div class="meter-track"><div id="noise-fill" class="meter-fill noise-fill"></div></div></div>
        <div class="meter"><div class="meter-label"><span>◐ SLEEPER ALERTNESS</span><strong id="alert-value">0%</strong></div><div class="meter-track"><div id="alert-fill" class="meter-fill alert-fill"></div></div></div>
      </div>
    </div>
    <div class="timer-panel"><span>TIME BEFORE THE ALARM</span><strong id="time-value">02:00</strong><small>BE QUIET. MOVE SMART.</small></div>
    <div class="reticle" id="reticle"><span></span></div>
    <div class="interaction" id="interaction" hidden><kbd>E</kbd><div><strong id="interaction-title">INTERACT</strong><small id="interaction-hint">BE QUIET</small></div></div>
    <div class="controls-tip">W A S D — MOVE <i>·</i> MOUSE — LOOK <i>·</i> SHIFT — SNEAK <i>·</i> E — INTERACT</div>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <div id="flash" class="danger-flash"></div>
  <div class="touch-ui" id="touch-ui" hidden>
    <div class="touch-pad" aria-label="Move">
      <button data-key="w" class="up" aria-label="Move forward">▲</button>
      <button data-key="a" class="left" aria-label="Move left">◀</button>
      <button data-key="s" class="down" aria-label="Move backward">▼</button>
      <button data-key="d" class="right" aria-label="Move right">▶</button>
    </div>
    <div class="touch-actions"><button data-key="shift">SNEAK</button><button data-key="e">USE</button></div>
  </div>
  <div id="overlay" class="overlay" role="dialog" aria-modal="true">
    <div class="menu-card" id="menu-card"></div>
  </div>
`;
const el=id=>document.getElementById(id);
const canvas=el('stage'),overlay=el('overlay'),card=el('menu-card');
const hud=el('hud'),touch=el('touch-ui'),toast=el('toast');
const isTouch=matchMedia('(pointer: coarse)').matches;
let engine=null,scene=null,camera=null,world=null;
let stage=0,playing=false,started=false,finished=false;
let elapsed=0,timeLeft=0,noise=0,alertness=0,steps=0,stepClock=0,peakNoise=0;
let completed=new Set(),focused=null,clockStopped=false,uiClock=0,messageClock=0;
let audio=null,wasLocked=false,dragLast=null,stepNumber=0;
let bestScore=0;
const pressed=new Set();
let mobileHeld=new Set();
let unlocked=1;
try{unlocked=Math.min(3,Math.max(1,Number(localStorage.getItem('dwh-fps-unlocked'))||1));}catch{}
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const pad=n=>String(Math.max(0,Math.floor(n))).padStart(2,'0');
const clockString=s=>`${pad(s/60)}:${pad(s%60)}`;

function tone(kind) {
 try{
  if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')void audio.resume();
  const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
  osc.type=kind==='step'?'triangle':kind==='fail'?'sawtooth':'sine';
  const pitch={step:82,success:580,fail:135,select:390,alarm:840,win:740}[kind]||210;
  osc.frequency.setValueAtTime(pitch,t);
  if(kind==='success'||kind==='win')osc.frequency.exponentialRampToValueAtTime(pitch*1.36,t+.19);
  gain.gain.setValueAtTime(.0001,t);
  gain.gain.exponentialRampToValueAtTime(kind==='step'?.018:.050,t+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,t+(kind==='win'?.43:.22));
  osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+(kind==='win'?.45:.23));
 }catch{}
}
function notify(text,type='') {
 toast.textContent=text;toast.className='toast show '+type;
 messageClock=2.7;
}
const button=(action,label,kind='primary')=>`<button class="action ${kind}" data-action="${action}">${label}</button>`;
function showMenu(kind) {
 playing=false; overlay.hidden=false;document.body.classList.remove('playing');
 // Release the captured mouse before displaying any clickable end/pause menu.
 if(document.pointerLockElement===canvas){try{document.exitPointerLock();}catch{}}
 const level=LEVELS[stage];
 let body='';
 if(kind==='welcome'){
  body=`<div class="menu-eyebrow">A NEW FIRST-PERSON STEALTH EXPERIENCE <span>●</span> 3 COMPLETE LEVELS</div>
  <h1>DON'T<br>WAKE <em>HIM.</em></h1>
  <p class="menu-lead">You're inside the room now. Every floorboard can betray you. Three nights. One light sleeper. Keep quiet.</p>
  <div class="feature-row"><span>◉ IMMERSIVE 3D</span><span>◐ FIRST-PERSON</span><span>✦ THREE MISSIONS</span></div>
  <div class="menu-actions">${button('start','▶ &nbsp; START THE NIGHT')}${button('levels','CHOOSE LEVEL','secondary')}</div>
  <div class="instructions"><b>HOW TO PLAY</b><span>WASD — MOVE</span><span>MOUSE — LOOK</span><span>SHIFT — SNEAK</span><span>E — INTERACT</span></div>`;
 }else if(kind==='levels'){
  body=`<div class="menu-eyebrow">CHOOSE YOUR NIGHT</div><h2>THREE NIGHTS.<br><em>NO SECOND CHANCES.</em></h2>
  <div class="level-select">${LEVELS.map((l,i)=>`<button data-action="choose-${i}" ${i>=unlocked?'disabled':''}><span>${l.number} / ${l.name}</span><small>${i>=unlocked?'LOCKED — COMPLETE THE PREVIOUS LEVEL':l.subtitle}</small></button>`).join('')}</div>
  <div class="menu-actions">${button('welcome','← BACK','secondary')}</div>`;
 }else if(kind==='pause'){
  body=`<div class="menu-eyebrow">TAKE A BREATH. HE'S STILL ASLEEP.</div>
  <h2>PAUSED<span class="period">.</span></h2><p class="menu-lead">${level.name}. Don't lose your nerve now.</p>
  <div class="menu-actions">${button('resume','▶ &nbsp; RESUME')}${button('restart','↻ RESTART NIGHT','secondary')}${button('levels','LEVEL SELECT','secondary')}</div>`;
 }else if(kind==='lose'){
  body=`<div class="menu-eyebrow warning">THE SILENCE BROKE</div><h2>HE WOKE <em>UP.</em></h2>
  <p class="menu-lead">${lostReason||'You made too much noise.'} Stay low and pay attention to every creaky step.</p>
  <div class="menu-actions">${button('restart','↻ TRY AGAIN')}${button('levels','LEVEL SELECT','secondary')}</div>`;
 }else if(kind==='levelWin'){
  const last=stage===2;
  body=`<div class="menu-eyebrow success">${last?'ALL THREE NIGHTS COMPLETE':'THE SLEEPER NEVER NOTICED'}</div>
  <h2>${last?'YOU MADE':'NIGHT'} <em>${last?'IT.':'CLEAR.'}</em></h2>
  <p class="menu-lead">Night ${level.number} complete. Time left: <b>${clockString(timeLeft)}</b>. Peak noise: <b>${Math.round(peakNoise)}%</b>.</p>
  <div class="menu-actions">${last?button('levels','REPLAY THE NIGHTS'):button('next','▶ &nbsp; NEXT NIGHT')}${button('restart','↻ PLAY THIS NIGHT AGAIN','secondary')}</div>`;
 }
 card.innerHTML=body;
}
let lostReason='';
function hideMenu(){overlay.hidden=true;playing=true;document.body.classList.add('playing');if(!isTouch){try{const result=canvas.requestPointerLock?.();result?.catch?.(()=>{});}catch{}}}
function buildLevel(index) {
 stage=index;const level=LEVELS[stage];if(scene){scene.dispose();scene=null;}
 scene=new Scene(engine);scene.useRightHandedSystem=false;
 scene.clearColor=new Color4(.04,.04,.09,1);
 camera=new UniversalCamera('first person eyes',new Vector3(level.start[0],ROOM.eye,level.start[1]),scene);
 camera.fov=1.20;camera.minZ=.04;camera.maxZ=100;
 camera.inertia=0;camera.angularSensibility=0;
 camera.setTarget(new Vector3(-3.8,1.22,-3));
 scene.activeCamera=camera;
 world=buildWorld(scene,level);
 timeLeft=level.timer;elapsed=0;noise=0;alertness=0;steps=0;stepClock=0;peakNoise=0;
 completed=new Set();clockStopped=false;focused=null;lostReason='';finished=false;uiClock=0;
 el('level-num').textContent='LEVEL '+level.number;
 el('level-title').textContent=level.name;
 el('completed').textContent='0 / '+level.objectives.length;
 renderTasks();hud.hidden=false;touch.hidden=!isTouch;
 canvas.focus({preventScroll:true});
}
function renderTasks() {
 const level=LEVELS[stage];
 el('tasks').innerHTML=level.objectives.map(o=>`<div class="task ${completed.has(o.id)?'done':''}"><span class="task-check">${completed.has(o.id)?'✓':'○'}</span><span>${o.name}</span></div>`).join('');
 el('completed').textContent=`${completed.size} / ${level.objectives.length}`;
}
function startLevel(index) {
 if(!engine){
  engine=new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,antialias:true},true);
  engine.setHardwareScalingLevel(window.devicePixelRatio>1.7?1.45:1);
  engine.runRenderLoop(()=>{if(scene){if(playing)update(Math.min(.055,engine.getDeltaTime()/1000));scene.render();}});
  addEventListener('resize',()=>engine?.resize());
 }
 buildLevel(index);started=true;hideMenu();tone('select');
 notify(LEVELS[index].intro);
}
function bump(amount){
 const level=LEVELS[stage];
 noise=clamp(noise+amount*level.wakeFactor,0,100);
 peakNoise=Math.max(peakNoise,noise);
 if(noise>48)alertness=clamp(alertness+(noise-48)*.10,0,100);
 if(noise>=level.maxNoise||alertness>=100){lostReason='The noise woke him. Try sneaking around the furniture.';lose();}
}
function lose(){
 if(finished)return;finished=true;playing=false;world?.wake();tone('fail');
 el('flash').classList.add('active');
 setTimeout(()=>{el('flash').classList.remove('active');showMenu('lose');},700);
}
function win(){
 if(finished)return;finished=true;playing=false;clockStopped=true;tone('win');
 if(stage+2>unlocked){
  unlocked=Math.min(3,stage+2);
  try{localStorage.setItem('dwh-fps-unlocked',String(unlocked));}catch{}
 }
 showMenu('levelWin');
}
function isDown(key){return pressed.has(key)||mobileHeld.has(key);}
function collision(x,z){
 if(x < -7.52||x > 7.52||z < -6.47||z > 6.47)return true;
 return world.blockers.some(b=>Math.abs(x-b.x)<b.wx+.19&&Math.abs(z-b.z)<b.wz+.19);
}
function bestFocus(){
 const p=camera.position;
 const ray=camera.getForwardRay(1).direction.clone();ray.y=0;ray.normalize();
 let best=null,score=Infinity;
 for(const def of LEVELS[stage].objectives){
  if(completed.has(def.id))continue;
  const obj=world.markers.get(def.id);if(!obj)continue;
  const to=obj.pos.subtract(p);to.y=0;
  const d=to.length();if(d>2.25)continue;
  const dot=Vector3.Dot(ray,to.normalize());
  if(dot<.18&&d>1.03)continue;
  if(d<score){best={def,d};score=d;}
 }
 if(objectivesCompleted(LEVELS[stage],completed)){
  const to=world.exitPos.subtract(p);to.y=0;const d=to.length();
  if(d<2.1&&Vector3.Dot(ray,to.normalize())>.05)return {exit:true,d};
 }
 return best;
}
function interact() {
 if(!playing||!scene)return;
 const nearest=bestFocus();if(!nearest){notify('Move closer and look at an object to interact.');return;}
 if(nearest.exit){win();return;}
 const def=nearest.def;
 if(!isReady(def,completed)){notify('Locked. Find the required item first.','warn');tone('alarm');return;}
 completed.add(def.id);bump(def.noise);
 if(!playing)return;
 if(def.timer){clockStopped=true;world.disableSoundSource();}
 renderTasks();tone('success');
 notify('✓ '+def.name.toUpperCase(),'success');
 if(objectivesCompleted(LEVELS[stage],completed))notify('ALL TASKS DONE — REACH THE EXIT DOOR!','success');
}
function update(dt){
 if(finished)return;
 elapsed+=dt;stepClock+=dt;uiClock+=dt;
 const level=LEVELS[stage];
 const fwd=new Vector3(Math.sin(camera.rotation.y),0,Math.cos(camera.rotation.y));
 const right=new Vector3(fwd.z,0,-fwd.x);
 const x=Number(isDown('d')||isDown('arrowright'))-Number(isDown('a')||isDown('arrowleft'));
 const y=Number(isDown('w')||isDown('arrowup'))-Number(isDown('s')||isDown('arrowdown'));
 const sneaking=isDown('shift');
 const speed=sneaking?1.42:2.78;
 const mag=Math.hypot(x,y);
 if(mag){
  const travel=fwd.scale(y/mag).add(right.scale(x/mag)).scale(speed*dt);
  if(!collision(camera.position.x+travel.x,camera.position.z))camera.position.x+=travel.x;
  if(!collision(camera.position.x,camera.position.z+travel.z))camera.position.z+=travel.z;
  const surface=world.stepSurface(camera.position);
  const rate=sneaking?.65:surface==='rug'?2.9:6.2;
  noise=clamp(noise+dt*rate*level.wakeFactor,0,100);
  steps+=speed*dt;
  const stepEvery=sneaking?.88:.71;
  if(steps>stepEvery){
   steps-=stepEvery;stepNumber++;
   if(!sneaking)tone('step');
   if(surface==='wood'&&!sneaking&&stepNumber%5===0){bump(level.id===3?7:4);notify('CREAK... the floorboard made a sound.','warn');}
  }
 }
 const targetEye=sneaking?ROOM.crouch:ROOM.eye;
 camera.position.y+=(targetEye-camera.position.y)*Math.min(1,dt*10);
 if(!clockStopped){timeLeft-=dt;if(timeLeft<=0){lostReason='The alarm went off before you could silence it.';timeLeft=0;tone('alarm');lose();return;}}
 noise=clamp(noise-dt*3.65,0,100);
 if(noise>37)alertness=clamp(alertness+dt*(noise-37)*.17*level.wakeFactor,0,100);
 else alertness=clamp(alertness-dt*6.5,0,100);
 if(noise>=level.maxNoise||alertness>=100){lostReason='The sleeper heard you moving around the room.';lose();return;}
 world.update(elapsed,completed,alertness);
 if(uiClock>.08){
  uiClock=0;
  focused=bestFocus();
  updateHud();
 }
 if(messageClock>0){messageClock-=dt;if(messageClock<=0)toast.className='toast';}
}
function updateHud(){
 el('noise-value').textContent=`${Math.round(noise)}%`;
 el('alert-value').textContent=`${Math.round(alertness)}%`;
 el('noise-fill').style.width=`${noise}%`;
 el('alert-fill').style.width=`${alertness}%`;
 el('time-value').textContent=clockStopped?'SAFE':clockString(timeLeft);
 el('time-value').classList.toggle('urgent',!clockStopped&&timeLeft<20);
 const prompt=el('interaction');
 if(!focused){prompt.hidden=true;el('reticle').classList.remove('hot');return;}
 prompt.hidden=false;el('reticle').classList.add('hot');
 if(focused.exit){el('interaction-title').textContent='OPEN THE EXIT DOOR';el('interaction-hint').textContent='ALL OBJECTIVES COMPLETE';return;}
 const obj=focused.def;
 const ready=isReady(obj,completed);
 el('interaction-title').textContent=ready?obj.action.toUpperCase():'LOCKED — NEED '+obj.requires.toUpperCase();
 el('interaction-hint').textContent=ready?'PRESS E TO INTERACT':'FIND THE KEY ITEM FIRST';
}
function pause(){
 if(!started||!playing)return;
 showMenu('pause');if(document.pointerLockElement===canvas)document.exitPointerLock();
}
el('menu-btn').addEventListener('click',()=>started?pause():showMenu('welcome'));
overlay.addEventListener('click',(e)=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const action=b.dataset.action;
 if(action==='start')startLevel(0);
 else if(action==='restart')startLevel(stage);
 else if(action==='next')startLevel(Math.min(2,stage+1));
 else if(action==='resume')hideMenu();
 else if(action==='levels')showMenu('levels');
 else if(action==='welcome')showMenu('welcome');
 else if(action.startsWith('choose-')){const i=Number(action.split('-')[1]);if(i<unlocked)startLevel(i);}
});
window.addEventListener('keydown',(e)=>{
 const key=e.key.toLowerCase();
 if(['arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(key))e.preventDefault();
 pressed.add(key);
 if(e.repeat)return;
 if(key==='escape')pause();
 if(key==='e'&&playing)interact();
 if(key==='m'&&started&&playing)pause();
});
window.addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{pressed.clear();mobileHeld.clear();if(playing)pause();});
document.addEventListener('pointerlockchange',()=>{
 const locked=document.pointerLockElement===canvas;
 if(locked)wasLocked=true;
 if(!locked&&wasLocked&&playing&&!isTouch)pause();
});
document.addEventListener('mousemove',e=>{
 if(!playing||!camera||document.pointerLockElement!==canvas)return;
 camera.rotation.y+=e.movementX*.0021;
 camera.rotation.x=clamp(camera.rotation.x+e.movementY*.0018,-1.12,1.12);
});
canvas.addEventListener('click',()=>{if(playing&&!isTouch&&document.pointerLockElement!==canvas){try{canvas.requestPointerLock();}catch{}}});
if(isTouch){
 const controlArea=el('touch-ui');
 controlArea.querySelectorAll('[data-key]').forEach(button=>{
  const key=button.dataset.key;
  button.addEventListener('pointerdown',e=>{
   e.preventDefault();button.setPointerCapture(e.pointerId);
   if(key==='e')interact();else mobileHeld.add(key);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>mobileHeld.delete(key));
 });
 canvas.addEventListener('pointerdown',e=>{if(playing)dragLast={x:e.clientX,y:e.clientY,id:e.pointerId};});
 canvas.addEventListener('pointermove',e=>{
  if(!playing||!dragLast||dragLast.id!==e.pointerId||!camera)return;
  const dx=e.clientX-dragLast.x,dy=e.clientY-dragLast.y;
  camera.rotation.y+=dx*.006;
  camera.rotation.x=clamp(camera.rotation.x+dy*.004,-1.12,1.12);
  dragLast={...dragLast,x:e.clientX,y:e.clientY};
 });
 for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>{dragLast=null;});
}
showMenu('welcome');
