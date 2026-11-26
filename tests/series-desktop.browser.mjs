// Run with the existing local static server on port 8765.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:8765',image=origin+'/tests/series-fixture.svg';
const completed={id:'desktop-completed',slug:'desktop-completed',title_en:'Completed Series',title_th:'เรื่องราวของเรา',status:'COMPLETED',visible:true,theme_bg:'#221833',theme_accent:'#E8D49B',premiere_date:'2025-01-01',genre:'Drama',description:'เรื่องราวของมิตรภาพที่เริ่มต้นขึ้นใหม่ '.repeat(30),banner_url:image,broadcast_info:'Official TV channel',streaming_info:'Official streaming platform',official_hashtag:'#DesktopSeries',cast:[{artist_name:'Artist A',character_name:'Character A',image_url:image},{artist_name:'Artist B',character_name:'Character B',image_url:image}],links:[{label:'Official on X',url:'https://x.com/example'}],episodes:Array.from({length:12},(_,i)=>({id:'desktop-ep'+i,episode_number:i+1,title:'Episode '+(i+1),air_date:'2025-01-01',thumbnail_url:image,description:'เรื่องย่อฉบับเต็มและรายละเอียดของตอน '.repeat(10),keyword:'CHAPTER '+(i+1),hashtag:'#Episode'+(i+1),links:[{label:'YOUTUBE',type:'WATCH',url:'https://youtube.com/watch?v=ep'+i},{label:'Teaser',type:'WATCH',url:'https://youtu.be/teaser'+i},{label:'iQIYI',type:'WATCH',url:'https://www.iq.com/play/ep'+i}]})),media:Array.from({length:52},(_,i)=>({id:'desktop-media'+i,type:['OST','BTS','REACTION'][i%3],title:'Official related video '+i,date:'2025-01-01',thumbnail_url:image,official_url:i===51?'':'https://youtu.be/content'+i})),appearances:[],moments:[]};
const ongoing={...completed,id:'desktop-ongoing',slug:'desktop-ongoing',title_en:'Ongoing Series',status:'ON AIR',theme_bg:'#1F4B47',theme_accent:'#FFE14D',show_broadcast_info:false,episodes:completed.episodes.slice(0,2)};
const fallback={...completed,id:'desktop-fallback',slug:'desktop-fallback',title_en:'Fallback Series',theme_bg:null,theme_accent:null,genre:null,episodes:[],media:[],cast:[],description:''};
const data=[completed,ongoing,fallback];
let html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').replace(/<script src="(?:https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^\"]*|supabase-[^\"]*)"><\/script>/g,'');
html=html.replace('<script src="app.js',`<script>window.__desktopData=${JSON.stringify(data)};window.__detailCalls=0;SeriesFeature.api={list:async()=>window.__desktopData,detail:async slug=>{window.__detailCalls++;return window.__desktopData.find(r=>r.slug===slug);}};</script><script src="app.js`);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Users/warintorn.sak/AppData/Local/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/series/*',r=>r.request().resourceType()==='document'?r.fulfill({body:html,contentType:'text/html'}):r.continue());
 const open=async(slug,hash='overview')=>{await page.goto('about:blank');await page.goto(`${origin}/series/${slug}#${hash}`);await page.locator('.dd-detail').waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);};
 for(const width of [1024,1280,1440,1920]){
  await page.setViewportSize({width,height:1000});await open('desktop-completed');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
  assert.equal(await page.locator('.sd-detail').isVisible(),false);assert.equal(await page.locator('.dd-detail').isVisible(),true);
  assert.equal(await page.locator('.nav').evaluate(e=>e.getBoundingClientRect().height),72);assert.equal(await page.locator('.nav .menu-btn').isVisible(),false);
  assert.ok(await page.locator('.dd-container').first().evaluate(e=>e.getBoundingClientRect().width)<=1120);
  assert.equal(await page.locator('.dd-hero-side').evaluate(e=>e.getBoundingClientRect().width),400);
  assert.equal(await page.locator('.dd-banner-image').evaluate(e=>getComputedStyle(e).objectFit),'contain');
  await page.locator('.dd-primary').hover();assert.equal(await page.locator('.dd-primary').evaluate(e=>getComputedStyle(e).color),'rgb(34, 24, 51)','primary action retains its contrasting foreground on hover');
  assert.equal(await page.locator('[data-dd-episode=overview]:visible').count(),4);assert.equal(await page.locator('.dd-episode-image').first().evaluate(e=>e.getBoundingClientRect().width),208);
  const related=page.locator('[data-dd-related-context=overview]');assert.equal(await related.locator('[data-dd-related-category]:visible').count(),8);
  assert.equal(await related.locator('[data-dd-category=OST]').getAttribute('aria-pressed'),'true');assert.equal(await related.locator('[data-dd-related-category]:visible:not([data-dd-related-category=OST])').count(),0);
  assert.equal(await related.locator('.dd-related-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),width>=1280?4:3);
  assert.equal(await related.locator('[data-dd-more]').innerText(),'Load more');await related.locator('[data-dd-more]').click();assert.equal(await related.locator('[data-dd-related-category]:visible').count(),16);
  await related.locator('[data-dd-category=OST]').click();assert.equal(await related.locator('[data-dd-related-category]:visible').count(),8);assert.equal(await related.locator('[data-dd-related-category]:visible:not([data-dd-related-category=OST])').count(),0);assert.equal(await related.locator('[data-dd-category=SPECIAL]').count(),0);
  const calls=await page.evaluate(()=>window.__detailCalls);await page.getByRole('tab',{name:/Related/}).click();assert.equal(new URL(page.url()).hash,'#related');assert.equal(await page.locator('#dd-panel-overview').isVisible(),false);assert.equal(await page.locator('[data-dd-related-context=related] [data-dd-related-category]:visible').count(),8);
  assert.equal(await page.locator('[data-dd-related-context=related] [data-dd-category=OST]').getAttribute('aria-pressed'),'true');
  await page.getByRole('tab',{name:/Related/}).focus();await page.keyboard.press('ArrowLeft');assert.equal(new URL(page.url()).hash,'#episodes');
  assert.equal(await page.locator('[data-dd-episode=episodes]').first().getAttribute('data-episode-number'),'1');await page.locator('[data-dd-sort]').click();assert.equal(await page.locator('[data-dd-sort]').innerText(),'Newest first');assert.equal(await page.locator('[data-dd-episode=episodes]').first().getAttribute('data-episode-number'),'12');
  const synopsis=page.locator('#dd-panel-episodes [data-dd-synopsis]').first();await synopsis.click();assert.equal(await synopsis.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#'+await synopsis.getAttribute('aria-controls')).isVisible(),true);
  await page.goBack();assert.equal(await page.getByRole('tab',{name:/Related/}).getAttribute('aria-selected'),'true');await page.goForward();assert.equal(await page.getByRole('tab',{name:/Episodes/}).getAttribute('aria-selected'),'true');assert.equal(await page.evaluate(()=>window.__detailCalls),calls);
  await page.getByRole('tab',{name:'Overview',exact:true}).click();await page.evaluate(()=>scrollTo(0,1000));assert.equal(await page.locator('.dd-tabs').evaluate(e=>e.getBoundingClientRect().top),72);
  await page.getByRole('button',{name:'All 12 episodes',exact:false}).click();assert.ok(await page.locator('.dd-episode-toolbar').evaluate(e=>Math.abs(e.getBoundingClientRect().top-168)<2));
  assert.equal(await page.locator('.series-creator-link').count(),3);
  await page.locator('.nav-about').evaluate(e=>e.open=true);assert.equal(await page.locator('.nav-about-panel').evaluate(e=>getComputedStyle(e).position),'absolute');await page.locator('.nav-about').evaluate(e=>e.open=false);
 }
 await open('desktop-ongoing','episodes');assert.equal(await page.locator('[data-dd-sort]').innerText(),'Newest first');assert.equal(await page.locator('[data-dd-episode=episodes]').first().getAttribute('data-episode-number'),'2');assert.equal(await page.locator('.dd-broadcast dt').allTextContents().then(x=>x.join(',')),'UNCUT');
 await open('desktop-fallback');assert.equal(await page.locator('main').evaluate(e=>e.style.getPropertyValue('--series-bg')),'#1C1A22');assert.equal(await page.locator('#dd-panel-overview [data-dd-episode]').count(),0);assert.match(await page.locator('#dd-panel-overview').innerText(),/added soon/);
 await open('desktop-completed','related');await page.setViewportSize({width:390,height:1000});assert.equal(await page.getByRole('tab',{name:/Related/}).getAttribute('aria-selected'),'true');await page.getByRole('tab',{name:/Episodes/}).click();await page.setViewportSize({width:1440,height:1000});assert.equal(await page.getByRole('tab',{name:/Episodes/}).getAttribute('aria-selected'),'true');
 await page.locator('.nav .brand').click();assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('series-detail-active')),false);assert.deepEqual(errors,[]);
 console.log('PASS: 1024/1280/1440/1920 desktop; 4-episode preview, true tabs/history/keyboard, 3/4-column paging/filtering, synopsis, sorting, shared buttons/themes, creator footer and cross-breakpoint tab state.');
}finally{await browser.close();}
