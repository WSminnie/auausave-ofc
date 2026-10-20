const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('app.js','utf8');
function setup(events=[]){
 const ctx=vm.createContext({Date,Intl,publicOrderedEvents:()=>events,homepageScheduleArtists:()=>[],canonicalArtistId:x=>x,artistById:()=>null,sameArtistId:(a,b)=>a===b,artistName:x=>x,artistDisplayColor:()=>'#abc',calendarEventArtistIds:e=>e.artistId?[e.artistId]:[],escapePageText:s=>String(s),unifiedHomeScheduleMeta:e=>e.place||'',eventParticipationCopy:()=>'<p>เข้าร่วมได้</p>',normalizeBroadcasts:x=>x||[]});
 vm.runInContext(source.slice(source.indexOf('function homeScheduleBangkokDate'),source.indexOf('const homeBeforeUnifiedSchedule')),ctx);
 return ctx;
}
test('Bangkok date changes at Bangkok midnight across year boundaries',()=>{
 const c=setup();assert.equal(c.homeScheduleBangkokDate(new Date('2026-12-31T16:59:59Z')),'2026-12-31');assert.equal(c.homeScheduleBangkokDate(new Date('2026-12-31T17:00:00Z')),'2027-01-01');
});
test('today includes every event and up next is the nearest future date across months',()=>{
 const events=[{id:'past',date:'2026-10-19'},{id:'late',date:'2026-10-20',place:'8.30 PM | Hall'},{id:'early',date:'2026-10-20',place:'4 PM | Mall'},{id:'unknown',date:'2026-10-20'},{id:'next',date:'2026-11-02'},{id:'same',date:'2026-11-02'},{id:'later',date:'2026-11-03'}];
 const c=setup(events),groups=c.homeScheduleGroups(events,'2026-10-20');
 assert.deepEqual(Array.from(groups.today,e=>e.id),['early','late','unknown']);assert.deepEqual(Array.from(groups.next,e=>e.id),['next','same']);assert.equal(events[0].id,'past');
});
test('start time handles AM PM, 24 hour and earliest broadcast, and unknown times sort last',()=>{
 const c=setup();assert.equal(c.homeScheduleStartMinutes({time:'12:00 AM'}),0);assert.equal(c.homeScheduleStartMinutes({place:'12 PM | Hall'}),720);assert.equal(c.homeScheduleStartMinutes({time:'18:30'}),1110);assert.equal(c.homeScheduleStartMinutes({broadcasts:[{time:'22:15'},{time:'10:15'}]}),615);assert.equal(c.homeScheduleStartMinutes({place:'Central Plaza'}),Infinity);
});
test('render uses one shell, hides empty Today, keeps navigation, metadata and empty future state',()=>{
 const c=setup([{id:'a',date:'2099-01-02',title:'Long event',place:'4 PM | Hall',type:'Live',artistId:'AUAU'}]);const html=c.unifiedHomeScheduleSection();
 assert.match(html,/Upcoming Schedule/);assert.match(html,/UP NEXT/);assert.doesNotMatch(html,/>TODAY</);assert.match(html,/href="#schedule"/);assert.match(html,/4 PM \| Hall/);assert.match(html,/เข้าร่วมได้/);assert.match(html,/Live/);assert.equal((html.match(/class="unified-schedule-shell"/g)||[]).length,1);
 const empty=setup([]).unifiedHomeScheduleSection();assert.match(empty,/No upcoming events/);assert.doesNotMatch(empty,/>TODAY</);
});
test('day rollover refreshes only a mounted Home schedule with an outdated Bangkok day',()=>{
 const c=setup();let writes=0;const section={dataset:{scheduleToday:'2026-10-19'},set outerHTML(value){writes++;assert.match(value,/Upcoming Schedule/);}};
 c.document={querySelector:()=>section};c.homeScheduleBangkokDate=()=>'2026-10-20';
 vm.runInContext(source.slice(source.indexOf('function refreshHomeScheduleDay()'),source.indexOf('// Refresh only the Home schedule')),c);
 c.refreshHomeScheduleDay();assert.equal(writes,1);
 section.dataset.scheduleToday='2026-10-20';c.refreshHomeScheduleDay();assert.equal(writes,1);
 c.document.querySelector=()=>null;assert.doesNotThrow(()=>c.refreshHomeScheduleDay());
});
