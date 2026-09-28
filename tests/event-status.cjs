const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
function setup(){const c=vm.createContext({db:{events:[],siteSettings:{dashboardTypeCounting:{series_broadcast:true}},masterData:{types:[{id:'event'},{id:'series_broadcast'}]}},eventHasType:(e,id)=>e.type===id});vm.runInContext(fs.readFileSync('event-participation.js','utf8'),c);vm.runInContext(app.slice(app.indexOf('function dashboardTypeIncluded('),app.indexOf('async function setDashboardTypeCounting(')),c);return c;}
test('postponed and canceled never count, including enabled types and unclassified events',()=>{
 const c=setup();for(const eventStatus of ['postponed','canceled'])for(const type of ['event','series_broadcast','unknown',''])assert.equal(c.dashboardEventIncluded({eventStatus,type}),false);
 assert.equal(c.dashboardEventIncluded({type:'event'}),true);assert.equal(c.dashboardEventIncluded({type:'event',eventStatus:'scheduled'}),true);
});
test('status badges are explicit; inactive events hide invitations but preserve stored conditions',()=>{
 const c=setup();for(const eventStatus of ['postponed','canceled']){
  const e={eventStatus,participation:{access:'open',gifts:true}};
  assert.match(c.eventStatusBadge(e),new RegExp(eventStatus.toUpperCase()));
  assert.equal(c.eventParticipationText(e),'');assert.doesNotMatch(c.eventParticipationInline(e),/รับของขวัญ/);
  assert.match(c.eventParticipationCopy(e),new RegExp(eventStatus.toUpperCase()));assert.equal(e.participation.access,'open');
  e.eventStatus='scheduled';assert.match(c.eventParticipationText(e),/รับของขวัญ/);assert.equal(c.eventStatusBadge(e),'');
 }
});
test('form status saves on first write, reloads through mapper, and can return to scheduled',()=>{
 const c=setup();Object.assign(c,{FormData:function(data){return data},save(){},closeModal(){},admin(){},toast(){}});
 vm.runInContext(app.slice(app.indexOf('function submitForm(e, type, id)'),app.indexOf('const submitFormBase = submitForm;')),c);
 c.submitForm({preventDefault(){},target:new Map([['title','Test'],['statusSource','https://example.com/notice'],['eventStatus','postponed']])},'events','');
 assert.equal(c.db.events[0].eventStatus,'postponed');
 const adapter=fs.readFileSync('supabase-db.js','utf8');vm.runInContext(adapter.slice(adapter.indexOf('  const mapFromDb ='),adapter.indexOf('  async function load()')),c);
 const maps=vm.runInContext('({from:mapFromDb.events,to:mapToDb.events})',c);
 assert.equal(maps.from(maps.to(c.db.events[0])).statusSource,'https://example.com/notice');assert.equal(maps.from(maps.to(c.db.events[0])).eventStatus,'postponed');assert.equal(maps.from({}).eventStatus,'scheduled');
 c.submitForm({preventDefault(){},target:new Map([['eventStatus','scheduled']])},'events',c.db.events[0].id);
 assert.equal(c.dashboardEventIncluded(c.db.events[0]),true);
});

test('Dashboard date range excludes both statuses without removing schedules from the calendar data',()=>{
 const c=setup();Object.assign(c,{dashYearFrom:2026,dashYearTo:2026,dashMonthFrom:9,dashMonthTo:10});
 c.db.events=[{id:'active',date:'2026-09-12',type:'event'},{id:'later',date:'2026-09-30',type:'event',eventStatus:'postponed'},{id:'canceled',date:'2026-10-12',type:'event',eventStatus:'canceled'},{id:'legacy',date:'2026-10-01',type:'event'},{id:'outside',date:'2026-11-01',type:'event'}];
 vm.runInContext(app.slice(app.indexOf('function dashboardCurrentRangeItems(){'),app.indexOf('dashboardAdmin=function(){dashboardAdminBeforeDynamicArtistSummary();')),c);
 assert.deepEqual(Array.from(c.dashboardCurrentRangeItems(),e=>e.id),['active','legacy']);
 assert.equal(c.db.events.length,5);c.db.events[1].eventStatus='scheduled';
 assert.deepEqual(Array.from(c.dashboardCurrentRangeItems(),e=>e.id),['active','later','legacy']);
});

test('Series Broadcast save persists canceled status before synchronization',()=>{
 const c=setup();let saved;
 Object.assign(c,{submitForm(){},scheduleFormIsSeriesBroadcast:()=>true,FormData:function(data){return data},broadcastsFromEditor:()=>[],validateBroadcasts:()=>'',structuredClone,save(){saved=JSON.parse(JSON.stringify(c.db.events))},closeModal(){},admin(){},toast(){}});
 c.db.masterData.series=[{id:'series1',label:'Series One'}];
 vm.runInContext(app.slice(app.indexOf('const submitFormBeforeSeriesBroadcast=submitForm;'),app.indexOf('function seriesBroadcastTitle(')),c);
 c.submitForm({preventDefault(){},currentTarget:new Map([['seriesId','series1'],['episode','3'],['date','2026-09-12'],['eventStatus','canceled'],['statusSource','https://example.com/canceled']])},'events','');
 assert.equal(saved[0].statusSource,'https://example.com/canceled');assert.equal(saved[0].eventStatus,'canceled');assert.equal(c.dashboardEventIncluded(saved[0]),false);
});

test('status announcement is a safe separate link shown only for inactive events',()=>{
 const c=setup();
 assert.equal(typeof c.eventStatusAnnouncement,'function');
 assert.match(c.eventStatusAnnouncement({eventStatus:'postponed',statusSource:'https://example.com/notice?a=1&b=2'}),/href="https:\/\/example.com\/notice\?a=1&amp;b=2"/);
 assert.equal(c.eventStatusAnnouncement({eventStatus:'scheduled',statusSource:'https://example.com'}),'');
 assert.equal(c.eventStatusAnnouncement({eventStatus:'canceled',statusSource:'javascript:alert(1)'}),'');
 assert.match(c.eventStatusBadge({eventStatus:'canceled'}),/<svg/);
});
