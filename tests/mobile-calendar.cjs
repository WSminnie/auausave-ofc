const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('app.js','utf8');
function setup(){
  let html='';
  const events=[{id:'a',date:'2026-10-20',title:'Timed event',time:'18:00',type:'live'},{id:'b',date:'2026-10-23',title:'Other day',place:'20:00 – 21:00 | Bangkok',type:'other'},{id:'c',date:'2026-11-01',title:'Outside month',type:'live'}];
  const ctx=vm.createContext({Date:class extends Date{constructor(...args){super(...(args.length?args:[2026,9,20,12]));}},calendarDate:new Date(2026,9,1),publicTypeFilter:'all',calendarPage(){},db:{artists:[],masterData:{types:[]}},publicOrderedEvents:()=>events,eventHasType:(e,t)=>e.type===t,calendarEventArtistIds:()=>[],calendarArtistColor:()=>'#f80',calendarArtistLabel:()=>'',escapePageText:s=>s,eventParticipationInline:()=>'',document:{querySelector:()=>({insertAdjacentHTML:(_,value)=>html=value})}});
  vm.runInContext(source.slice(source.indexOf('let mobileCalendarSelectedDate'),source.indexOf('showEvent=function(id)',source.indexOf('let mobileCalendarSelectedDate'))),ctx);
  return {ctx,html:()=>html};
}
test('month mode offers two views and marks selected date accessibly',()=>{
  const {ctx,html}=setup();ctx.calendarPage();
  assert.match(html(),/aria-pressed="true"[^>]*>.*ตาราง/s);
  assert.match(html(),/aria-pressed="false"[^>]*>.*รายการ/s);
  assert.match(html(),/aria-pressed="true"[^>]*aria-label="2026-10-/);
});
test('list groups only current month events and respects type filtering',()=>{
  const {ctx,html}=setup();ctx.setMobileCalendarView('list');
  assert.match(html(),/mobile-home-schedule-row/);assert.match(html(),/Timed event/);assert.match(html(),/18:00/);assert.doesNotMatch(html(),/ไม่ระบุเวลา|mobile-agenda-time/);assert.match(html(),/Other day/);assert.match(html(),/20:00/);assert.doesNotMatch(html(),/Outside month/);
  ctx.filterMobileCalendar('live');assert.match(html(),/Timed event/);assert.doesNotMatch(html(),/Other day/);
  ctx.calendarDate=new Date(2026,11,1);ctx.calendarPage();assert.match(html(),/No schedules this month/);
});
test('view switches preserve month and selected date; selecting a day in another month follows it',()=>{
  const {ctx}=setup();ctx.selectMobileCalendarDate('2026-10-23');ctx.setMobileCalendarView('list');ctx.setMobileCalendarView('month');
  assert.equal(vm.runInContext('mobileCalendarSelectedDate',ctx),'2026-10-23');
  ctx.selectMobileCalendarDate('2026-11-01');assert.equal(ctx.calendarDate.getMonth(),10);assert.equal(vm.runInContext('mobileCalendarSelectedDate',ctx),'2026-11-01');
});
test('month detail and next schedule use date rails and include every event of the next date',()=>{
  const {ctx,html}=setup();ctx.selectMobileCalendarDate('2026-10-19');
  assert.match(html(),/mobile-calendar-date-rail/);
  assert.doesNotMatch(html(),/mobile-today-heading/);assert.match(html(),/datetime="2026-10-19"/);
  assert.match(html(),/Next schedule/);
  assert.match(html(),/datetime="2026-10-20"/);
  assert.match(html(),/Timed event/);
  assert.doesNotMatch(html(),/mobile-agenda-time|ไม่ระบุเวลา/);
  const rows=ctx.mobileCalendarDayGroup('2026-10-24',[{id:'one',title:'First',type:'live'},{id:'two',title:'Second',type:'live'}],new Map());
  assert.match(rows,/First/);assert.match(rows,/Second/);
  assert.equal((rows.match(/mobile-calendar-date-rail/g)||[]).length,1);
  ctx.selectMobileCalendarDate('2026-10-20');
  assert.match(html(),/mobile-today-heading">Today/);
  assert.match(html(),/datetime="2026-10-23"/);
});
test('rescheduled date sits under the title outside the right aligned participation row',()=>{
  const {ctx}=setup();
  ctx.eventParticipationInline=()=>'<span class="event-rescheduled-from">เลื่อนมาจากวันที่ <b>Oct 2, 2026</b></span><span class="event-participation-inline">เงื่อนไข</span>';
  const row=ctx.mobileCalendarEventRow({id:'moved',title:'Moved event',type:'live'},new Map());
  assert.match(row,/<strong>Moved event<\/strong><span class="mobile-agenda-origin">/);
  assert.equal((row.match(/เลื่อนมาจากวันที่/g)||[]).length,1);
  assert.doesNotMatch(row,/<span class="mobile-agenda-participation">[^]*?เลื่อนมาจากวันที่/);
});
test('list can omit repeated dates while keeping each event color bar',()=>{
  const {ctx}=setup(),event={id:'same',date:'2026-10-03',title:'Same day',type:'live'};
  const first=ctx.mobileCalendarListRow(event,new Map(),true);
  const repeated=ctx.mobileCalendarListRow(event,new Map(),false);
  assert.match(first,/<time datetime="2026-10-03">/);
  assert.doesNotMatch(repeated,/<time /);
  assert.match(repeated,/mobile-list-date-spacer/);
  assert.match(repeated,/--event-color:/);
  assert.match(repeated,/Same day/);
});
test('list includes home metadata and puts dividers only at the end of a date',()=>{
  const {ctx}=setup(),event={id:'meta',date:'2026-10-07',title:'TOPS OF BEAUTY',place:'4 PM | Central Pinklao',type:'live'};
  const first=ctx.mobileCalendarListRow(event,new Map(),true,false);
  const last=ctx.mobileCalendarListRow(event,new Map(),false,true);
  assert.match(first,/mobile-home-schedule-meta">4 PM \| Central Pinklao/);
  assert.doesNotMatch(first,/is-day-end/);
  assert.match(last,/is-day-end/);
});
test('mobile participation has no leading separator and list day has no zero padding',()=>{
  const {ctx}=setup();ctx.eventParticipationInline=()=>'<span class="event-participation-inline"> · เงื่อนไขเข้าร่วม</span>';
  const event={id:'compact',date:'2026-10-03',title:'Compact',type:'live'};
  const row=ctx.mobileCalendarListRow(event,new Map());
  assert.match(row,/<b>3<\/b>/);
  assert.doesNotMatch(row,/>\s*·\s*เงื่อนไข/);
  assert.doesNotMatch(ctx.mobileCalendarEventRow(event,new Map()),/>\s*·\s*เงื่อนไข/);
});
test('today and next schedule place artist and type above the event title',()=>{
  const {ctx}=setup();ctx.calendarEventArtistIds=()=>['artist'];ctx.calendarArtistLabel=()=>'Artist';
  const row=ctx.mobileCalendarEventRow({id:'top',title:'Title',type:'Live'},new Map());
  assert.match(row,/<span class="mobile-agenda-topline"><span>Artist<\/span><span>Live<\/span><\/span><strong>Title<\/strong>/);
});
test('cards hide Series Broadcast type while retaining title and other event types',()=>{
  const {ctx}=setup();
  const row=ctx.mobileCalendarEventRow({id:'broadcast',title:'Mr.Fanboy EP9',type:'Series Broadcast'},new Map());
  assert.match(row,/Mr.Fanboy EP9/);
  assert.doesNotMatch(row,/Series Broadcast/);
  assert.match(ctx.mobileCalendarEventRow({id:'live',title:'Live event',type:'Live'},new Map()),/>Live<\/span>/);
});
test('list hides Today control and highlights all events dated today',()=>{
  const {ctx,html}=setup();ctx.setMobileCalendarView('list');
  assert.doesNotMatch(html(),/onclick="mobileCalendarToday\(\)"/);
  assert.match(html(),/is-today/);
  assert.match(html(),/aria-current="date"/);
  const other=ctx.mobileCalendarListRow({id:'other',date:'2026-10-23',title:'Other',type:'live'},new Map());
  assert.doesNotMatch(other,/is-today|aria-current="date"/);
  ctx.setMobileCalendarView('month');assert.match(html(),/onclick="mobileCalendarToday\(\)"/);
});
test('opening list scrolls to the first today event and safely handles no matching event',()=>{
  const {ctx}=setup(),scrolled=[];
  ctx.document.querySelector=selector=>selector==='.mobile-calendar-agenda .mobile-home-schedule-row.is-today'?{scrollIntoView:options=>scrolled.push(options)}:{insertAdjacentHTML(){},focus(){}};
  ctx.setMobileCalendarView('list');assert.equal(scrolled.length,1);assert.equal(scrolled[0].block,'start');
  ctx.setMobileCalendarView('month');assert.equal(scrolled.length,1);
  ctx.document.querySelector=selector=>selector==='.mobile-calendar-agenda .mobile-home-schedule-row.is-today'?null:{insertAdjacentHTML(){},focus(){}};
  assert.doesNotThrow(()=>ctx.setMobileCalendarView('list'));
});
