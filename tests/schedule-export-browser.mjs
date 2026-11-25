import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser = await chromium.launch({executablePath:process.env.BROWSER_TEST_EXECUTABLE || 'C:/Users/warintorn.sak/AppData/Local/Google/Chrome/Application/chrome.exe',headless:true});
const base=process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8765';
const errors=[], databaseRequests=[], results=[];
try {
 for(const [width,height] of [[390,844],[1440,900],[320,568]]) {
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true,reducedMotion:'reduce'});
  await context.addInitScript(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/supabase/i.test(r.url()))databaseRequests.push(r.url());});
  await page.goto(base+'/tmp/schedule-export-browser.html');
  const trigger=page.getByRole('button',{name:'Export schedule'}).filter({visible:true});
  async function checkPlacement() {
   const active=page.getByRole('button',{name:'Export schedule'}).filter({visible:true});
   assert.equal(await active.evaluate(button=>button.previousElementSibling?.tagName),'SELECT');
   const buttonBox=await active.boundingBox(),selectBox=await active.locator('..').locator('select').boundingBox();
   assert.ok(buttonBox.x>=selectBox.x+selectBox.width && Math.abs(buttonBox.y+buttonBox.height/2-selectBox.y-selectBox.height/2)<2,'Export is directly after the filter on the same row');
  }
  await checkPlacement();
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:'Export schedule'});
  await dialog.waitFor();assert.equal(await dialog.locator('input[type=month]').inputValue(),'2026-11');
  assert.equal(await dialog.locator('input[name=range]').count(),0);
  assert.equal(await dialog.getByRole('button',{name:'Preview images'}).count(),0);
  const box=await dialog.boundingBox();
  if(width<=600) assert.ok(Math.abs(box.x)<1 && Math.abs(box.y+box.height-height)<1,'Mobile uses a full-width bottom sheet');
  else assert.ok(box.x>=12 && box.y>=12 && box.x+box.width<=width-12 && box.y+box.height<=height-12);
  assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await dialog.getByText(/^1 image ·/).waitFor();
  assert.equal(await dialog.locator('.schedule-export-thumbnail img').count(),1);
  await page.screenshot({path:`outputs/schedule-export/modal-${width}.png`});
  assert.equal(await dialog.locator('.schedule-export-result').count(),1);
  assert.deepEqual(await dialog.locator('.schedule-export-result p').allTextContents(),['5 events']);
  assert.equal(await dialog.locator('.schedule-export-fit').textContent(),'Whole month fits');
  const download=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download image',exact:true}).click();
  const file=await download;assert.equal(file.suggestedFilename(),'auausave-2026-11-01-30.png');
  const pngPath=`outputs/schedule-export/browser-export-${width}.png`;await file.saveAs(pngPath);
  const bytes=fs.readFileSync(pngPath);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),1440);assert.equal(bytes.readUInt32BE(20),1800);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.schedule-export-dialog').count(),0);
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
  await page.screenshot({path:`outputs/schedule-export/page-${width}.png`});
  await page.evaluate(()=>{app.innerHTML=artistProfileScheduleSection(db.events.filter(e=>e.date.startsWith('2026-11')),'AT02');});
  await checkPlacement();
  await page.getByRole('button',{name:'Export schedule'}).click();
  assert.equal(await dialog.locator('.schedule-export-scope').textContent(),'AUAU');
  await dialog.getByText(/^1 image ·/).waitFor();assert.deepEqual(await dialog.locator('.schedule-export-result p').allTextContents(),['4 events']);
  assert.equal(await dialog.locator('.schedule-export-save').getAttribute('download'),'auausave-auautnp-2026-11-01-30.png');
  await page.keyboard.press('Escape');
  if(width===1440) {
   await page.locator('[data-schedule-collaborator]').selectOption('AT04');
   await page.getByRole('button',{name:'Export schedule'}).click();
   await dialog.getByText(/^1 image ·/).waitFor();
   assert.deepEqual(await dialog.locator('.schedule-export-result p').allTextContents(),['1 event']);
   await page.keyboard.press('Escape');
   await page.evaluate(()=>{publicTypeFilter='Private';calendarDate=new Date(2026,10,1);calendarPage();});
   await page.getByRole('button',{name:'Export schedule'}).filter({visible:true}).click();
   await dialog.getByText(/^1 image ·/).waitFor();
   assert.deepEqual(await dialog.locator('.schedule-export-result p').allTextContents(),['1 event']);
   await page.mouse.click(5,5);assert.equal(await page.locator('.schedule-export-dialog').count(),0);
   await page.evaluate(()=>{app.innerHTML=artistProfileScheduleSection(db.events.filter(e=>e.date.startsWith('2026-11')),'AT03');});
   await page.getByRole('button',{name:'Export schedule'}).click();await dialog.getByText(/^1 image ·/).waitFor();
   assert.equal(await dialog.locator('.schedule-export-save').getAttribute('download'),'auausave-savewrg-2026-11-01-30.png');
   await page.keyboard.press('Escape');
   await page.evaluate(()=>{publicTypeFilter='all';app.innerHTML=artistProfileScheduleSection(db.events.filter(e=>e.date.startsWith('2026-11')),'AT02');});
  }
  await page.locator('[data-schedule-collaborator]').selectOption('solo');
  await page.getByRole('button',{name:'Export schedule'}).click();
  assert.equal(await dialog.locator('.schedule-export-scope').textContent(),'AUAU · Solo schedules');
  await dialog.getByText(/^1 image ·/).waitFor();assert.deepEqual(await dialog.locator('.schedule-export-result p').allTextContents(),['1 event']);
  await dialog.locator('input[type=month]').fill('2028-02');
  await dialog.getByText(/^1 image ·/).waitFor();
  assert.deepEqual(await dialog.locator('.schedule-export-result p').allTextContents(),['0 events']);
  assert.equal(await dialog.locator('.schedule-export-caption strong').textContent(),'Feb 1–29');
  await dialog.getByRole('button',{name:'Previous export month',exact:true}).click();
  await dialog.getByText(/^1 image ·/).waitFor();assert.equal(await dialog.locator('input[type=month]').inputValue(),'2028-01');
  await dialog.getByRole('button',{name:'Next export month',exact:true}).click();
  await dialog.getByText(/^1 image ·/).waitFor();
  assert.ok((await dialog.locator('.schedule-export-save').first().getAttribute('download')).includes('2028-02'));
  if(width===1440) {
   await dialog.locator('input[type=month]').fill('2026-11');
   await dialog.locator('input[type=month]').fill('2028-02');
   await dialog.getByText(/^1 image ·/).waitFor();
   assert.ok((await dialog.locator('.schedule-export-save').first().getAttribute('download')).includes('2028-02'),'Latest month wins while generating');
  }
  await page.keyboard.press('Escape');
  if(width===1440 || width===390) {
   await page.evaluate(()=>{
    db.events=Array.from({length:30},(_,i)=>({id:'dense-'+i,date:'2026-11-'+String(i+1).padStart(2,'0'),artistId:'AT02',artistIds:['AT02'],title:'รายละเอียดกิจกรรม ชื่องานที่ยาวและมีข้อมูลสำคัญ '.repeat(8),type:'Event',place:'10 AM | Bangkok',participation:{access:'open',gathering:true}}));
    calendarDate=new Date(2026,10,1);publicTypeFilter='all';calendarPage();
   });
   await page.getByRole('button',{name:'Export schedule'}).filter({visible:true}).click();
   await dialog.getByText(/^2 images ·/).waitFor();
   assert.deepEqual(await dialog.locator('.schedule-export-result p').allTextContents(),['16 events','14 events']);
   assert.equal(await dialog.locator('.schedule-export-thumbnail img').count(),2);
   assert.equal(await dialog.locator('.schedule-export-fit').textContent(),'Split at the 16th');
   await page.screenshot({path:`outputs/schedule-export/modal-two-${width}.png`});
   const dimensions=[];
   for(const [i,label] of ['Download 1–16','Download 17–30'].entries()) {
    const pending=page.waitForEvent('download');await dialog.getByRole('link',{name:label,exact:true}).click();
    const part=await pending,path=`outputs/schedule-export/auto-dense-${i+1}.png`;await part.saveAs(path);
    const data=fs.readFileSync(path);dimensions.push([data.readUInt32BE(16),data.readUInt32BE(20)]);
   }
   assert.deepEqual(dimensions[0],dimensions[1]);assert.equal(dimensions[0][0],1440);
   const archiveDownload=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download both',exact:true}).click();
   const archive=await archiveDownload;assert.equal(archive.suggestedFilename(),'auausave-2026-11.zip');
   await archive.saveAs(`outputs/schedule-export/both-${width}.zip`);
   if(width===1440){
    await page.keyboard.press('Escape');
    await page.evaluate(()=>{app.innerHTML=artistProfileScheduleSection(db.events,'AT02');});
    await page.getByRole('button',{name:'Export schedule'}).click();await dialog.getByText(/^2 images ·/).waitFor();
    const artistArchiveDownload=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download both',exact:true}).click();
    const artistArchive=await artistArchiveDownload;assert.equal(artistArchive.suggestedFilename(),'auausave-auautnp-2026-11.zip');
    await artistArchive.saveAs('outputs/schedule-export/artist-names.zip');
   }
   if(width===390) {
    await page.evaluate(()=>{
     window.sharedExportFiles=[];
     Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
     Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.sharedExportFiles=data.files.map(f=>({name:f.name,type:f.type,size:f.size}));}});
    });
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'Export schedule'}).filter({visible:true}).click();
    await dialog.getByText(/^2 images ·/).waitFor();
    await dialog.getByRole('button',{name:'Save both images'}).click();
    const shared=await page.evaluate(()=>window.sharedExportFiles);assert.equal(shared.length,2);assert.ok(shared.every(f=>f.type==='image/png' && f.size>0));
   }
   await page.keyboard.press('Escape');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Page stays within viewport');
  results.push(`${width}x${height}: responsive dialog/sheet, actual thumbnails, PNG download, month arrows, owner/solo filters, automatic month refresh, leap year, focus`);
  await context.close();
 }
 const failureContext=await browser.newContext();const failurePage=await failureContext.newPage();
 await failurePage.route('**/assets/schedule-export/*.ttf',r=>r.abort());
 await failurePage.goto(base+'/tmp/schedule-export-browser.html');
 await failurePage.getByRole('button',{name:'Export schedule'}).filter({visible:true}).click();
 await failurePage.locator('.schedule-export-status.has-error').waitFor();
 assert.equal(await failurePage.getByRole('button',{name:'Try again'}).isVisible(),true);
 assert.equal(await failurePage.locator('.schedule-export-result').count(),0);
 await failurePage.unroute('**/assets/schedule-export/*.ttf');
 await failurePage.getByRole('button',{name:'Try again'}).click();
 await failurePage.getByText(/^1 image ·/).waitFor();
 await failureContext.close();results.push('Resource failure shows an error and re-enables retry without stale downloads');
 assert.deepEqual(errors,[]);assert.deepEqual(databaseRequests,[]);
 fs.writeFileSync('outputs/schedule-export/browser-results.json',JSON.stringify({passed:true,results,errors,databaseRequests},null,2));
 console.log(JSON.stringify({passed:true,results}));
}finally{await browser.close();}
