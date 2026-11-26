const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {sourceIndex}=require('./source-section.cjs');
const source=fs.readFileSync('app.js','utf8');
function setup(){
 const context=vm.createContext({db:{masterData:{types:[
  {id:'event',label:'Event'},{id:'live',label:'Live'},{id:'private',label:'Private'},
  {id:'program_show',label:'Program / Show'},{id:'program',label:'Program'},{id:'show',label:'Show'}
 ]}}});
 vm.runInContext(source.slice(sourceIndex(source,'function eventTypeValues('),sourceIndex(source,'function ensureDexxEventType(')),context);
 return context;
}
test('Program / Show remains a complete master type and matches its filter ID',()=>{
 const c=setup();assert.deepEqual(Array.from(c.eventTypeValues('Program / Show')),['Program / Show']);
 for(const type of ['Program / Show','Program/Show',' program  /  show ','program_show',['Program / Show','Live']]){
  assert.equal(c.eventHasType({type},'program_show'),true,JSON.stringify(type));
 }
 assert.equal(c.eventHasType({type:'program_show'},'Program / Show'),true);
 assert.equal(c.eventHasType({type:'Program / Show'},'show'),false);
 assert.equal(c.eventHasType({type:'Program / Show'},'program'),false);
});
test('compound labels coexist with existing multi-type separators',()=>{
 const c=setup();
 for(const type of ['Program / Show | Private','Live / Program / Show / Private','Live, Program / Show · Private','Live • Program / Show']){
  assert.equal(c.eventHasType({type},'program_show'),true,type);
 }
 assert.deepEqual(Array.from(c.eventTypeValues('Live / Program / Show / Private')),['Live','Program / Show','Private']);
 assert.deepEqual(Array.from(c.eventTypeValues('Event/Live | Private')),['Event','Live','Private']);
 assert.equal(c.eventHasType({type:'Event / Live'},'program_show'),false);
 assert.equal(c.eventHasType({type:'Program / Showcase'},'program_show'),false);
 assert.equal(c.eventHasType({type:''},'program_show'),false);
 assert.equal(c.eventHasType({type:''},'all'),true);
});
test('new slash labels are read from master data rather than a hardcoded Program / Show special case',()=>{
 const c=setup();c.db.masterData.types.push({id:'radio_podcast',label:'Radio / Podcast'});
 assert.deepEqual(Array.from(c.eventTypeValues('Live / Radio / Podcast')),['Live','Radio / Podcast']);
 assert.equal(c.eventHasType({type:'Radio/Podcast'},'radio_podcast'),true);
});
