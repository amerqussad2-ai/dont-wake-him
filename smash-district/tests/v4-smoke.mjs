import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const base='http://127.0.0.1:4173/';
const items='district truffle habibi chicken fries trufflefries rings loaded cola berry choco citrus brownie icecream sundae duo night'.split(' ');
const layers='brioche-top brioche-bottom potato-top potato-bottom beef crispy-chicken cheddar swiss house-sauce truffle-sauce fire-sauce pickles jalapenos lettuce onions-and-pickles'.split(' ');
for(const item of items) assert(existsSync('public/assets/menu-v4/'+item+'.webp'),'Missing product image: '+item);
for(const item of layers) assert(existsSync('public/assets/builder-v4/'+item+'.webp'),'Missing independent ingredient layer: '+item);
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
const errors=[],failures=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 page.on('pageerror',err=>errors.push(err.message));
 page.on('response',response=>{if(response.url().includes('/assets/')&&!response.ok())failures.push(response.url()+':'+response.status());});
 await page.goto(base,{waitUntil:'networkidle',timeout:45000});
 await page.waitForFunction(()=>!document.getElementById('burgerStage')?.hidden,undefined,{timeout:12000});
 assert.equal(await page.locator('#builderImage').isVisible(),false,'Real ingredient stack must replace static preview');
 assert((await page.locator('#burgerStage .burger-ingredient').count())>=7);
 const srcs=await page.locator('#burgerStage .burger-ingredient').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src')));
 assert(srcs.every(x=>x.includes('builder-v4/')));
 console.log('PASS photo builder has separately rendered, fully loaded transparent ingredient images');
 for(const [group,value,key] of [['protein','chicken','crispy-chicken'],['cheese','swiss','swiss'],['sauce','fire','fire-sauce'],['bun','potato','potato-top'],['extra','jalapeno','jalapenos']]){
   await page.locator('[data-group="'+group+'"][data-value="'+value+'"]').click();
   await page.waitForFunction(x=>Array.from(document.querySelectorAll('#burgerStage img')).some(img=>img.src.endsWith('/'+x+'.webp')),key,{timeout:7000});
 }
 await page.locator('[data-group="extra"][data-value="double"]').click();
 assert.equal(await page.locator('#burgerStage img[data-asset="crispy-chicken"]').count(),2);
 await page.waitForTimeout(1300);
 const centers=await page.locator('#burgerStage .burger-ingredient').evaluateAll(imgs=>imgs.map(img=>{
  const r=img.getBoundingClientRect(),style=getComputedStyle(img);
  return {key:img.dataset.key,centerX:r.x+r.width/2,width:r.width,translate:style.translate,transform:style.transform,cssTop:style.top};
 }));
 console.log('BUILDER_LAYER_ALIGNMENT '+JSON.stringify(centers));
 const bunCenter=centers.find(x=>x.key==='top-bun')?.centerX;
 assert(centers.every(x=>Math.abs(x.centerX-bunCenter)<20),'Ingredient layers must stay centered, got '+JSON.stringify(centers));
 console.log('PASS live ingredient switches: bread, protein, cheese, sauces, toppings and extra patty');
 await page.waitForFunction(()=>document.querySelector('#heroV4Stage img')?.naturalWidth>0,undefined,{timeout:12000});
 assert.equal(await page.locator('#heroV4Stage .burger-ingredient').count()>=8,true);
 await page.locator('#replay').click();
 await page.waitForFunction(()=>document.querySelector('#heroPhoto')?.dataset.state==='playing',undefined,{timeout:2000});
 const initial=await page.locator('#heroV4Stage .burger-ingredient').first().evaluate(img=>getComputedStyle(img).transform);
 await page.waitForTimeout(400);
 const moved=await page.locator('#heroV4Stage .burger-ingredient').first().evaluate(img=>getComputedStyle(img).transform);
 assert.notEqual(initial,moved,'Hero component must move between frames');
 await page.waitForFunction(()=>document.querySelector('#heroPhoto')?.dataset.state==='complete',undefined,{timeout:9000});
 console.log('PASS new photo-ingredient hero assembly and replay motion');
 const categoryCounts={burgers:4,sides:4,drinks:4,desserts:3,combos:2};
 const gallery=new Set();
 for(const [cat,expected] of Object.entries(categoryCounts)){
  await page.locator('[data-cat="'+cat+'"]').click();
  const cardImages=page.locator('#menuPanel .product-photo img');
  assert.equal(await cardImages.count(),expected,'Wrong category contents '+cat);
  for(const img of await cardImages.all()){
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(x=>x.decode());
    const src=await img.getAttribute('src');
    assert(src.startsWith('/assets/menu-v4/'),'Old stock image in '+cat+': '+src);
    gallery.add(src);
  }
 }
 assert.equal(gallery.size,17,'Every item needs its own image');
 console.log('PASS exactly 17 independent menu images, 5 categories, no duplicates');
 await page.screenshot({path:'v4-desktop.png',fullPage:true,timeout:30000});
 await page.locator('[data-cat="burgers"]').click();
 await page.locator('[data-add="district"]').first().click();
 assert.equal(await page.locator('#bagCount').textContent(),'1');
 await page.locator('#upsellDecline').click();
 await page.locator('#navCart').click();
 assert.equal(await page.locator('#cartDrawer').getAttribute('aria-hidden'),'false');
 await page.locator('#cartClose').click();
 console.log('PASS demo bag with V4 photos');
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 mobile.on('pageerror',err=>errors.push('mobile '+err.message));
 await mobile.goto(base,{waitUntil:'networkidle',timeout:45000});
 await mobile.waitForFunction(()=>!document.getElementById('burgerStage')?.hidden,undefined,{timeout:12000});
 await mobile.screenshot({path:'v4-mobile.png',fullPage:true,timeout:30000});
 assert.equal(errors.length,0,'JS errors: '+errors.join('; '));
 assert.equal(failures.length,0,'Missing HTTP image assets: '+failures.join('; '));
 console.log('PASS mobile, image HTTP responses and zero JS errors');
 await mobile.close();
 await page.close();
}finally{await browser.close();}
