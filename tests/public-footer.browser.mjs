// Run against the local static server on port 8765.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const source=fs.readFileSync('app.js','utf8');
const context=vm.createContext({SeriesFeature:{components:{}},Intl,Date});
vm.runInContext(fs.readFileSync('series/components/detail-footer.js','utf8'),context);
vm.runInContext(source.slice(source.indexOf('function footer()'),source.indexOf('function artistCards()')),context);
assert.equal(context.footer(),context.SeriesFeature.components.detailFooter(),'Public pages share the Series footer');
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:8765';
const links=fs.readFileSync('index.html','utf8').match(/<link[^>]+rel="stylesheet"[^>]*>/g).join('\n');
const browser=await chromium.launch({executablePath:'C:/Users/warintorn.sak/AppData/Local/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();
 await page.setContent(`<base href="${origin}/">${links}<main style="min-height:120px"></main>${context.footer()}`);
 await page.evaluate(()=>document.fonts.ready);
 fs.mkdirSync('outputs/public-footer',{recursive:true});
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:700});
  const footer=page.locator('.series-detail-footer'),creators=footer.locator('a');
  assert.equal(await creators.count(),3);
  const rects=await creators.evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,height:r.height,width:r.width,scroll:e.scrollWidth,client:e.clientWidth};}));
  assert.ok(rects.every(r=>r.top===rects[0].top&&r.height>=44&&r.scroll<=r.client+1&&r.left>=0&&r.right<=width),`usable single-row links at ${width}`);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow at ${width}`);
  assert.equal(await footer.locator('h2').evaluate(e=>getComputedStyle(e).fontSize),'14px');
  await creators.first().focus();
  assert.equal(await creators.first().evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
  await footer.screenshot({path:`outputs/public-footer/footer-${width}.png`});
 }
 console.log('PASS: public and Series footers share markup; 320/390/768/1024/1440px links fit, stay on one row, have usable touch targets and visible keyboard focus.');
} finally {await browser.close();}
