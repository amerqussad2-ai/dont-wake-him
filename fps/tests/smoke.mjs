import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({
  headless:true,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox'],
});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push('PAGE '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text());});
try{
 await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle',timeout:25000});
 assert.match(await page.title(),/DON'T WAKE HIM 3D/);
 const button=page.getByRole('button',{name:/START THE NIGHT/i});
 assert.equal(await button.isVisible(),true,'start button must be visible');
 await button.click();
 await page.locator('#hud').waitFor({state:'visible',timeout:14000});
 await page.waitForFunction(()=>{
   const el=document.getElementById('assets-status');
   return el&&/HIGH-DETAIL ASSETS · .*FALLBACKS/.test(el.textContent);
 },undefined,{timeout:65000});
 const status=await page.locator('#assets-status').textContent();
 console.log('REALISTIC_ASSETS_STATUS:',status);
 assert.match(status,/HIGH-DETAIL ASSETS/,'genuine assets must have loaded');
 const count=Number(status.match(/^(\d+)/)?.[1]||0);
 assert.ok(count>=3,'Level 1 must load >=3 real 3D assets; got '+count);
 await page.keyboard.press('KeyE');
 await page.waitForTimeout(700);
 const toast=await page.locator('#toast').textContent();
 console.log('E_KEY_FEEDBACK:',toast);
 assert.match(toast,/Nothing in range|INTERACT|PRESS E|closer|glowing/i);
 await page.screenshot({path:'fps-smoke.png',animations:'disabled'});
 assert.equal(errors.filter(e=>!e.includes('ResizeObserver')).length,0,errors.join('\n'));
 console.log('PASS: 3D render, scene imports, E button and no JS errors');
}finally{await browser.close();}
