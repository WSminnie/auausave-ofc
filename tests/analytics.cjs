const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(){
 const context=vm.createContext({console,Intl,Date,Map,Set,URL,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,module:{exports:{}}});
 if(fs.existsSync('analytics.js'))vm.runInContext(fs.readFileSync('analytics.js','utf8'),context);
 return context.module.exports;
}
test('routes group detail pages and exclude admin and unknown routes',()=>{
 const a=load();assert.equal(typeof a.pageKey,'function');
 for(const [route,page] of [['','home'],['#schedule','schedule'],['#series/abc/episodes/one','series'],['#project/abc','projects'],['#/AUAU','artists'],['#artist/AT01','artists'],['#admin',null],['#garbage',null]])assert.equal(a.pageKey(route),page);
});
test('Bangkok month and current-day chart stop at local today',()=>{
 const a=load();assert.equal(typeof a.monthInfo,'function');
 const x=a.monthInfo('2026-10',new Date('2026-09-30T18:00:00Z'));
 assert.equal(x.currentMonth,'2026-10');assert.equal(x.days,1);
 assert.equal(a.monthInfo('2024-02',new Date('2026-10-15T00:00:00Z')).days,29);
 assert.throws(()=>a.monthInfo('2026-13'));assert.throws(()=>a.monthInfo('x'));
});
test('collector records actual navigations once, preserves repeat views and excludes local/admin',async()=>{
 const a=load();assert.equal(typeof a.createTracker,'function');
 const records=[];const storage=new Map();const t=a.createTracker({hostname:'auausaveth.com',storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},uuid:require('node:crypto').randomUUID,send:async e=>records.push(e)});
 await t.visit('#home');await t.visit('#home');await t.visit('#schedule');await t.visit('#home');await t.visit('#admin');await t.visit('#home');
 assert.equal(records.length,4);assert.equal(new Set(records.map(x=>x.visitorId)).size,1);assert.equal(new Set(records.map(x=>x.eventId)).size,4);
 const local=a.createTracker({hostname:'127.0.0.1',send:async e=>records.push(e)});await local.visit('#home');assert.equal(records.length,4);
 await t.visit('#series',true);assert.equal(records.length,4);
});
test('blocked storage and failed requests never break public navigation',async()=>{
 const a=load();assert.equal(typeof a.createTracker,'function');let calls=0;
 const t=a.createTracker({hostname:'auausaveth.com',storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},uuid:require('node:crypto').randomUUID,send:async()=>{calls++;throw Error('offline')}});
 await assert.doesNotReject(()=>t.visit('#home'));await assert.doesNotReject(()=>t.visit('#schedule'));assert.equal(calls,2);
});
function browserModule(rpc){
 const target={innerHTML:'',isConnected:true,setAttribute(){}};
 const context=vm.createContext({console,Intl,Date,Map,Set,URL,setTimeout,clearTimeout,module:{exports:{}},document:{querySelector:()=>target},addEventListener(){},auausaveDB:{client:{rpc}}});
 vm.runInContext(fs.readFileSync('analytics.js','utf8'),context);
 return {api:context.Analytics,target};
}
test('a late response cannot overwrite a more recently selected report',async()=>{
 const pending=[];const {api,target}=browserModule(()=>new Promise(resolve=>pending.push(resolve)));
 const first=api.refresh();const second=api.refresh();
 pending[1]({data:{visitors:222,views:444,pages:[],daily:[]}});await second;
 pending[0]({data:{visitors:111,views:333,pages:[],daily:[]}});await first;
 assert.match(target.innerHTML,/>222</);assert.doesNotMatch(target.innerHTML,/>111</);
});
test('an empty report displays zero; unavailable and unauthorized reports never pretend to be zero',async()=>{
 const empty=browserModule(async()=>({data:{visitors:0,views:0,pages:[],daily:[]}}));await empty.api.refresh();
 assert.match(empty.target.innerHTML,/ยังไม่มีผู้เข้าชมในเดือนนี้/);
 const failed=browserModule(async()=>({error:{code:'42501'}}));await failed.api.refresh();
 assert.match(failed.target.innerHTML,/ยังไม่มีสิทธิ์ดูสถิติ/);assert.doesNotMatch(failed.target.innerHTML,/analytics-stats/);
 const unavailable=browserModule(async()=>({error:{code:'PGRST202'}}));await unavailable.api.refresh();
 assert.match(unavailable.target.innerHTML,/ระบบสถิติยังไม่พร้อม/);
});
test('leaving Analytics prevents a pending report from painting into the departed page',async()=>{
 let finish;const {api,target}=browserModule(()=>new Promise(resolve=>finish=resolve));
 const work=api.refresh();target.isConnected=false;const before=target.innerHTML;
 finish({data:{visitors:23,views:42,pages:[],daily:[]}});await work;
 assert.equal(target.innerHTML,before);
});
