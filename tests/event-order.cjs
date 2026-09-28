const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('app.js','utf8');
function setup(){
  const messages=[],writes=[];
  const ctx=vm.createContext({db:{events:[{id:'a',date:'2026-09-12'},{id:'hidden',date:'2026-09-12',hidden:true},{id:'b',date:'2026-09-12'},{id:'next',date:'2026-09-13'}]},adminAuthenticated:true,adminSelectedDate:'2026-09-12',adminEventFilter:'all',adminTab:'events',location:{hash:'#admin'},window:{auausaveDB:{saveEventOrder:async(date,ids)=>writes.push({date,ids:[...ids]})}},itemMatchesArtist:e=>!e.hidden,matchesAdminType:()=>true,save:()=>true,admin(){},toast:m=>messages.push(m),document:{querySelector:()=>null,querySelectorAll:()=>[]},console});
  ctx.CSS={escape:value=>value};
  vm.runInContext(source.slice(source.indexOf('// Shared schedule order'),source.indexOf('// End shared schedule order')),ctx);
  return {ctx,messages,writes};
}
const ids=items=>Array.from(items,x=>x.id);
test('saved daily order wins; dates stay chronological and new events follow saved ones',()=>{
 const {ctx:c}=setup();c.db.eventOrderByDate={'2026-09-12':['b','a','deleted']};
 assert.deepEqual(ids(c.orderedEvents()),['b','a','hidden','next']);
 assert.deepEqual(ids(c.db.events),['a','hidden','b','next']);
});
test('filtered reorder preserves hidden slots and survives reload',async()=>{
 const {ctx:c,writes}=setup();await c.moveAdminEvent('b',-1);
 assert.deepEqual(ids(c.orderedEvents()),['b','hidden','a','next']);
 assert.deepEqual(writes,[{date:'2026-09-12',ids:['b','hidden','a']}]);
 const {ctx:other}=setup();other.db.eventOrderByDate=JSON.parse(JSON.stringify(c.db.eventOrderByDate));
 assert.deepEqual(ids(other.orderedEvents()),['b','hidden','a','next']);
});
test('failed writes restore original order and release save lock',async()=>{
 const {ctx:c,messages}=setup();c.window.auausaveDB.saveEventOrder=async()=>{throw Error('offline')};
 await c.moveAdminEvent('b',-1);assert.deepEqual(ids(c.orderedEvents()),['a','hidden','b','next']);
 assert.match(messages.at(-1),/ไม่สำเร็จ/);
 c.window.auausaveDB.saveEventOrder=async()=>{};await c.moveAdminEvent('b',-1);
 assert.deepEqual(ids(c.orderedEvents()),['b','hidden','a','next']);
});
test('ignores cross-day, duplicate, unauthenticated and boundary moves',async()=>{
 const {ctx:c,writes}=setup();await c.reorderAdminEvent('a','next');await c.reorderAdminEvent('a','a');await c.moveAdminEvent('a',-1);
 c.adminAuthenticated=false;await c.moveAdminEvent('b',-1);assert.equal(writes.length,0);
});
test('blocks a second reorder until the first write completes',async()=>{
 const {ctx:c,writes}=setup();let done;c.window.auausaveDB.saveEventOrder=()=>new Promise(resolve=>{done=resolve});
 const pending=c.moveAdminEvent('b',-1);await c.moveAdminEvent('a',-1);done();await pending;
 assert.deepEqual(ids(c.orderedEvents()),['b','hidden','a','next']);
});

test('database adapter persists one day and reloads order without changing homepage settings',async()=>{
 const rows=new Map([['homepage',{theme:'original'}],['event-order:2026-09-13',{eventIds:['next']}]]);
 const client={from(table){let id,payload,pattern;const query={
  select(){return query},eq(field,value){id=value;return query},like(field,value){pattern=value;return query},order(){return query},
  upsert(value){payload=value;return query},
  async single(){rows.set(payload.id,structuredClone(payload.settings));return {data:{id:payload.id}}},
  async maybeSingle(){return {data:rows.has(id)?{settings:rows.get(id)}:null}},
  then(resolve,reject){return Promise.resolve({data:table==='site_settings'&&pattern?[...rows].filter(([key])=>key.startsWith('event-order:')).map(([id,settings])=>({id,settings})):[]}).then(resolve,reject)}
 };return query}};
 const c=vm.createContext({window:{SUPABASE_CONFIG:{url:'test',publishableKey:'test'},supabase:{createClient:()=>client}},console});
 vm.runInContext(fs.readFileSync('supabase-db.js','utf8'),c);
 await c.window.auausaveDB.saveEventOrder('2026-09-12',['b','a']);
 const loaded=await c.window.auausaveDB.load();
 assert.deepEqual(Array.from(loaded.eventOrderByDate['2026-09-12']),['b','a']);
 assert.deepEqual(Array.from(loaded.eventOrderByDate['2026-09-13']),['next']);
 assert.equal(loaded.siteSettings.theme,'original');
 await assert.rejects(c.window.auausaveDB.saveEventOrder('2026-09-12',['a','a']));
});

test('drag handlers reorder only a drag initiated in this calendar',async()=>{
 const {ctx:c,writes}=setup();let prevented=false;
 const event={target:{closest:()=>null},currentTarget:{classList:{add(){}}},dataTransfer:{setData(){}},preventDefault(){prevented=true}};
 await c.scheduleEventDrop(event,'a');assert.equal(writes.length,0);
 c.scheduleEventDragStart(event,'b');c.scheduleEventDragOver(event);assert.equal(event.dataTransfer.dropEffect,'move');
 await c.scheduleEventDrop(event,'a');assert.deepEqual(ids(c.orderedEvents()),['b','hidden','a','next']);
 assert.equal(writes.length,1);assert.equal(prevented,true);
});
