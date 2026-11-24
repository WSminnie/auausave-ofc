// Run against the static local server: node tests/event-modal-browser.mjs
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const browser = await chromium.launch({ executablePath: process.env.BROWSER_TEST_EXECUTABLE || "C:/Users/warintorn.sak/AppData/Local/Google/Chrome/Application/chrome.exe", headless: true });
const base = process.env.BROWSER_TEST_URL || "http://127.0.0.1:8765";
const errors = [], productionRequests = [], results = [];
try {
  for (const [width, height] of [[390,844],[768,1024],[1440,900],[844,390],[320,568]]) {
    const context = await browser.newContext({ viewport: {width,height} });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', e=>errors.push(e.message));
    page.on('request', r=>{if(/supabase/i.test(r.url()))productionRequests.push(r.url());});
    await page.goto(`${base}/tmp/event-modal-browser.html`);
    const trigger = page.locator('button:visible').filter({hasText:'ELLEMENStyleAwards2026'}).first();
    await trigger.click();
    const modal = page.locator('.event-modal');
    await modal.waitFor();
    const box = await modal.boundingBox();
    assert.ok(Math.abs(box.y + box.height/2 - height/2) < 2, `Event details must be centered at ${width}x${height}: ${JSON.stringify(box)}`);
    assert.ok(box.x>=12 && box.y>=12 && box.x+box.width<=width-12 && box.y+box.height<=height-12);
    assert.equal(await page.getByRole('dialog').count(),1);
    assert.equal(await modal.locator('.close').evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal').count(),0);
    assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
    await trigger.click();
    await page.mouse.click(4,4);
    assert.equal(await page.locator('#modal').count(),0);
    await trigger.click();
    await modal.locator('.close').click();
    assert.equal(await page.locator('#modal').count(),0);
    await page.evaluate(()=>showEvent('modal-long'));
    const longBox=await modal.boundingBox();
    assert.ok(longBox.y>=12 && longBox.y+longBox.height<=height-12);
    assert.equal(await modal.evaluate(el=>el.scrollHeight>el.clientHeight),true);
    assert.equal(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await modal.locator('a.btn').scrollIntoViewIfNeeded();
    assert.equal(await modal.locator('a.btn').isVisible(),true);
    await page.keyboard.press('Escape');
    await trigger.click();
    await page.evaluate(()=>showEvent('modal-series'));
    assert.equal(await page.locator('.event-dialog').count(),1);
    assert.equal(await page.getByRole('dialog').count(),1);
    assert.equal(await page.locator('.series-broadcast-detail .series-episode').textContent(),'EP.3');
    const seriesBox = await page.locator('.series-broadcast-detail').boundingBox();
    assert.ok(Math.abs(seriesBox.y+seriesBox.height/2-height/2)<2);
    await page.keyboard.press('Escape');
    await trigger.click();
    if(width===390 || width===1440 || width===768) await page.screenshot({path:`outputs/event-modal-${width}.png`});
    await page.keyboard.press('Escape');
    await page.evaluate(()=>{
      db.events=db.events.filter(e=>e.id!=='modal-long' && e.id!=='modal-series');
      app.innerHTML=unifiedHomeScheduleSection();
    });
    // Whole-row taps and keyboard activation both use the shared event dialog.
    const homeToday=page.locator('.unified-schedule-group.is-today .unified-schedule-row');
    await homeToday.locator('time').click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('#event-modal-title').textContent(),'ELLEMENStyleAwards2026');
    await page.keyboard.press('Escape');
    const homeNext=page.locator('.unified-schedule-group.is-next .unified-schedule-row');
    await homeNext.getByRole('button',{name:'SAVE NEXT EVENT'}).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('#event-modal-title').textContent(),'SAVE NEXT EVENT');
    await page.keyboard.press('Escape');
    assert.equal(await homeNext.getByRole('button',{name:'SAVE NEXT EVENT'}).evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Space');
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    for(const [owner,title] of [['AT02','ELLEMENStyleAwards2026'],['AT03','SAVE NEXT EVENT']]){
      await page.evaluate(owner=>{app.innerHTML=artistProfileScheduleSection(db.events,owner);},owner);
      await page.locator('.artist-schedule-today').getByRole('button',{name:title}).click();
      await page.getByRole('dialog').waitFor();
      assert.equal(await page.locator('#event-modal-title').textContent(),title);
      await page.keyboard.press('Escape');
    }
    results.push(`${width}x${height}: centered, bounded, scrollable, close/escape/backdrop/focus, series, Home/Profile Today and Up next, pointer and keyboard`);
    await context.close();
  }
  assert.deepEqual(errors,[]); assert.deepEqual(productionRequests,[]);
  fs.writeFileSync('outputs/event-modal-browser-result.json',JSON.stringify({passed:true,results,errors,productionRequests},null,2));
  console.log(JSON.stringify({passed:true,results,errors,productionRequests}));
} finally { await browser.close(); }
