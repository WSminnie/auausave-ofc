const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('supabase-db.js','utf8');
function setup(failure){
  const started=[],pending=[];
  const client={from(table){let homepage=false;const q={select(){return q},order(){return q},eq(){homepage=true;return q},like(){return q},maybeSingle(){return q},then(resolve,reject){
    const key=homepage?'homepage':table;
    started.push(key);
    return new Promise(done=>pending.push(()=>done(key===failure?{data:null,error:new Error(key)}:{data:homepage?{settings:{theme:'test'}}:table==='site_settings'?[{id:'event-order:2026-10-22',settings:{eventIds:['e']}}]:[{id:table,award_id:'awards'}],error:null}))).then(resolve,reject);
  }};return q}};
  const c=vm.createContext({window:{SUPABASE_CONFIG:{url:'test',publishableKey:'test'},supabase:{createClient:()=>client}}});
  vm.runInContext(source,c);
  async function finish(p){for(let i=0;i<30;i++){await new Promise(setImmediate);pending.splice(0).forEach(done=>done());}return p;}
  return {load:c.window.auausaveDB.load,started,finish};
}
test('all eleven reads start before any response; mapping and order survive',async()=>{
  const s=setup(),p=s.load();
  await new Promise(setImmediate);
  const count=s.started.length;
  const r=await s.finish(p);
  assert.equal(count,11);
  for(const key of ['artists','events','awards','presenters','videos'])assert.equal(r[key].length,1);
  assert.equal(r.awards[0].sectionAssignments.length,1);
  assert.equal(r.masterData.series.length,1);
  assert.equal(r.siteSettings.theme,'test');
  assert.deepEqual(Array.from(r.eventOrderByDate['2026-10-22']),['e']);
});
for(const key of ['award_sections','award_section_assignments','homepage'])test(`${key} retains fallback`,async()=>{
  const s=setup(key),r=await s.finish(s.load());
  assert.equal(JSON.stringify(key==='homepage'?r.siteSettings:r[key]),key==='homepage'?'{}':'[]');
});
for(const key of ['artists','events','awards','presenters','videos','event_types','series','site_settings'])test(`${key} error rejects load`,async()=>{
  const s=setup(key),p=s.load();
  const check=assert.rejects(p,new RegExp(key));
  await s.finish(check);
});
