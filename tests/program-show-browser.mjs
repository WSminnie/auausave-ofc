import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Users/warintorn.sak/AppData/Local/Google/Chrome/Application/chrome.exe',headless:true});
const results=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8765/tmp/schedule-export-browser.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  db.masterData.types.push({id:'program_show',label:'Program / Show'});
  db.events=[
   {id:'program-1',date:'2026-11-10',artistId:'AT01',artistIds:['AT01'],title:'PROGRAM FIRST',type:'Program / Show',place:'Bangkok'},
   {id:'program-2',date:'2026-11-11',artistId:'AT02',artistIds:['AT02'],title:'PROGRAM SECOND',type:'Live | Program/Show',place:'Bangkok'},
   {id:'other-live',date:'2026-11-12',artistId:'AT03',artistIds:['AT03'],title:'UNRELATED LIVE',type:'Live',place:'Bangkok'},
   {id:'not-program',date:'2026-11-13',artistId:'AT03',artistIds:['AT03'],title:'UNRELATED SHOWCASE',type:'Program / Showcase',place:'Bangkok'}
  ];
  calendarDate=new Date(2026,10,1);publicTypeFilter='all';mobileCalendarSelectedDate='2026-11-10';calendarPage();
 });
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(()=>{publicTypeFilter='all';calendarPage();});
  const select=page.locator('select.public-type-filter:visible, .mobile-calendar-controls select:visible');
  await select.selectOption('program_show');
  if(width<=1024)await page.getByRole('button',{name:'รายการ',exact:true}).click();
  const scope=width>1024?page.locator('.calendar'):page.locator('.mobile-calendar-agenda');
  assert.ok(await scope.getByRole('button',{name:/PROGRAM FIRST/}).isVisible(),`Program first at ${width}`);
  assert.ok(await scope.getByRole('button',{name:/PROGRAM SECOND/}).isVisible(),`Program second at ${width}`);
  assert.equal(await scope.getByRole('button',{name:/UNRELATED LIVE/}).isVisible(),false);
  assert.equal(await scope.getByRole('button',{name:/UNRELATED SHOWCASE/}).isVisible(),false);
  await page.screenshot({path:`outputs/schedule-export/program-filter-${width}.png`});
  await page.getByRole('button',{name:'Export schedule',exact:true}).filter({visible:true}).click();
  const dialog=page.getByRole('dialog',{name:'Export schedule'});await dialog.getByText(/^1 image · 2 events$/).waitFor();
  assert.equal(await dialog.locator('.schedule-export-scope').textContent(),'All artists · Program / Show');
  await dialog.getByRole('button',{name:'Close export'}).click();await dialog.waitFor({state:'detached'});
  await page.locator('select.public-type-filter:visible, .mobile-calendar-controls select:visible').selectOption('live');
  assert.ok(await scope.getByRole('button',{name:/PROGRAM SECOND/}).isVisible());
  assert.ok(await scope.getByRole('button',{name:/UNRELATED LIVE/}).isVisible());
  assert.equal(await scope.getByRole('button',{name:/PROGRAM FIRST/}).isVisible(),false);
  await page.locator('select.public-type-filter:visible, .mobile-calendar-controls select:visible').selectOption('all');
  assert.ok(await scope.getByRole('button',{name:/PROGRAM FIRST/}).isVisible());
  assert.ok(await scope.getByRole('button',{name:/UNRELATED LIVE/}).isVisible());
  results.push({width,programEvents:2,exportEvents:2,liveEvents:2});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,results,errors}));
}finally{await browser.close();}
