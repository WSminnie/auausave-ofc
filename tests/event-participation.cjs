const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(){const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('event-participation.js','utf8'),ctx);return ctx;}
test('legacy, unknown and malformed values show no inferred participation',()=>{
 const c=setup();for(const value of [undefined,null,'open',[],{access:'invented',gathering:'false',gifts:1}]){
  const event={participation:value};assert.equal(c.eventParticipationText(event),'');assert.equal(c.eventParticipationIcons(event),'');assert.equal(c.eventParticipationCopy(event),'');
 }
});
test('full Thai labels preserve primary access and both optional conditions',()=>{
 const c=setup();const event={participation:{access:'open',gathering:true,gifts:true}};
 assert.equal(c.eventParticipationText(event),'แฟนคลับสามารถไปร่วมกิจกรรมได้ · มีรวมพลหลังจบงาน · รับของขวัญ');
 for(const access of ['closed','surrounding','private'])assert.ok(c.eventParticipationText({participation:{access}}).length>10);
 const icons=c.eventParticipationIcons(event);assert.equal((icons.match(/<svg /g)||[]).length,3);assert.ok(icons.includes('title="รับของขวัญ"'));
 assert.ok(c.eventParticipationCopy(event).includes('มีรวมพลหลังจบงาน'));
});
test('form supports clearing all values without retaining old settings',()=>{
 const c=setup();const form=new Map([['participationAccess','private'],['participationGathering','on'],['participationGifts','on']]);
 assert.deepEqual(JSON.parse(JSON.stringify(c.participationFromForm(form))),{access:'private',gathering:true,gifts:true});
 form.clear();assert.deepEqual(JSON.parse(JSON.stringify(c.participationFromForm(form))),{access:'',gathering:false,gifts:false});
});
test('editor restores saved access and options and leaves legacy events unspecified',()=>{
 const c=setup();const html=c.eventParticipationFields({participation:{access:'surrounding',gifts:true}});
 assert.match(html,/value="surrounding" selected/);assert.match(html,/name="participationGifts"[^>]*checked/);
 assert.doesNotMatch(html,/name="participationGathering"[^>]*checked/);
 assert.match(c.eventParticipationFields({}),/value="" selected/);
});

test('event create and edit include participation in the first save and allow clearing it',()=>{
 const c=setup(),source=fs.readFileSync('app.js','utf8');const snapshots=[];
 Object.assign(c,{db:{events:[]},FormData:function(data){return data},save:()=>snapshots.push(JSON.parse(JSON.stringify(c.db.events))),closeModal(){},admin(){},toast(){}});
 vm.runInContext(source.slice(source.indexOf('function submitForm(e, type, id)'),source.indexOf('const submitFormBase = submitForm;')),c);
 const data=new Map([['title','Test'],['date','2026-09-12'],['participationAccess','closed'],['participationGifts','on']]);
 c.submitForm({preventDefault(){},target:data},'events','');
 assert.deepEqual(snapshots[0][0].participation,{access:'closed',gathering:false,gifts:true});
 assert.equal('participationAccess' in snapshots[0][0],false);
 c.submitForm({preventDefault(){},target:new Map([['title','Updated']])},'events',c.db.events[0].id);
 assert.deepEqual(snapshots[1][0].participation,{access:'',gathering:false,gifts:false});
});

test('database mapping roundtrips conditions and legacy rows remain unspecified',()=>{
 const source=fs.readFileSync('supabase-db.js','utf8'),c=setup();
 vm.runInContext(source.slice(source.indexOf('  const mapFromDb ='),source.indexOf('  async function load()')),c);
 const maps=vm.runInContext('({from:mapFromDb.events,to:mapToDb.events})',c);
 const event={id:'e1',date:'2026-09-12',title:'Test',participation:{access:'private',gathering:true,gifts:false}};
 assert.deepEqual(JSON.parse(JSON.stringify(maps.from(maps.to(event)).participation)),event.participation);
 assert.equal(c.eventParticipationText(maps.from({id:'legacy'})),'');
 assert.deepEqual(JSON.parse(JSON.stringify(maps.to({id:'legacy'}).participation)),{});
});

test('participation copy pairs every full label with its icon and places announcement after status',()=>{
 const c=setup();const html=c.eventParticipationCopy({participation:{access:'surrounding',gifts:true}});
 assert.equal((html.match(/<svg /g)||[]).length,2);
 assert.match(html,/<\/svg>[\s\S]*สามารถไปให้กำลังใจ/);
 const status=c.eventParticipationCopy({eventStatus:'postponed',statusSource:'https://example.com/notice'});
 assert.match(status,/POSTPONED[\s\S]*ดูประกาศ/);
 assert.doesNotMatch(status,/↗/);
 assert.equal((status.match(/<p /g)||[]).length,1);
});
