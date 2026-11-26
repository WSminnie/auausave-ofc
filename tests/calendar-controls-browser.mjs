import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.BROWSER_TEST_EXECUTABLE || 'C:/Users/warintorn.sak/AppData/Local/Google/Chrome/Application/chrome.exe',headless:true});
const results=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1639,height:1100},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8765')+'/tmp/schedule-export-browser.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>document.fonts.ready);
 for(const width of [1639,1440,1194,1093,1024,768,390,320]){
  await page.setViewportSize({width,height:1000});
  const exportButton=page.getByRole('button',{name:'Export schedule',exact:true}).filter({visible:true});
  await exportButton.waitFor();
  const measurements=await page.evaluate(()=>{
   const visible=element=>!!(element.offsetWidth||element.offsetHeight||element.getClientRects().length);
   const button=[...document.querySelectorAll('.schedule-export-trigger')].find(visible);
   const group=button.parentElement,select=group.querySelector('select');
   const current=document.querySelector('.dynamic-calendar-legend > button') || group.querySelector('.schedule-current-month') || document.querySelector('.mobile-calendar-controls > button');
   const box=element=>{const b=element.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
   const desktop=visible(document.querySelector('.dynamic-calendar-legend'));
   return {button:box(button),select:box(select),current:current&&box(current),desktop,grouped:!desktop||group.contains(current),appearance:getComputedStyle(select).appearance,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  if([1639,1024,390].includes(width))await page.screenshot({path:`outputs/schedule-export/calendar-controls-${width}.png`});
  assert.ok(measurements.grouped,'Keep Current month, type filter and Export in one action group');
  for(const control of [measurements.button,measurements.select,measurements.current].filter(Boolean)){
   assert.equal(control.height,44,`Same 44px control height at ${width}: ${JSON.stringify(measurements)}`);
   assert.ok(Math.abs(control.y-measurements.button.y)<1,`Same top edge at ${width}`);
  }
  assert.equal(measurements.appearance,'none','Use consistent select styling across native browser appearances');
  assert.equal(measurements.overflow,false,`No page overflow at ${width}`);
  if(measurements.desktop){
   assert.ok(Math.abs(measurements.select.x-measurements.current.x-measurements.current.width-12)<1);
   assert.ok(Math.abs(measurements.button.x-measurements.select.x-measurements.select.width-12)<1);
  }
  results.push({width,...measurements});
 }
 // Keep filtering, month reset and Export functional after regrouping.
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.dynamic-calendar-legend select').selectOption('Private');
 await page.locator('.dynamic-calendar-legend .schedule-export-trigger').click();
 const dialog=page.getByRole('dialog',{name:'Export schedule'});await dialog.getByText(/^1 image · 1 event$/).waitFor();
 await dialog.getByRole('button',{name:'Close export'}).click();await dialog.waitFor({state:'detached'});
 await page.evaluate(()=>{calendarDate=new Date(2026,8,1);calendarPage();});
 await page.getByRole('button',{name:'Current month',exact:true}).click();
 assert.equal(await page.evaluate(()=>calendarDate.getMonth()),new Date().getMonth());
 await page.setViewportSize({width:390,height:1000});
 await page.evaluate(()=>{app.innerHTML=artistProfileScheduleSection(db.events,'AT02');});
 await page.locator('.artist-profile-schedule .schedule-export-trigger').waitFor();
 const profileSizes=await page.locator('.artist-schedule-collaborator .schedule-export-controls').evaluate(group=>[...group.children].map(child=>child.getBoundingClientRect().height));
 assert.deepEqual(profileSizes,[44,44]);
 assert.deepEqual(errors,[]);
 fs.writeFileSync('outputs/schedule-export/calendar-controls-results.json',JSON.stringify({passed:true,results,profileSizes,errors},null,2));
 console.log(JSON.stringify({passed:true,widths:results.map(r=>r.width),profileSizes,errors}));
}finally{await browser.close();}
