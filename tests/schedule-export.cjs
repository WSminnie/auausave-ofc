const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../schedule-export.js');

test('month navigation crosses year boundaries and stays within supported years',()=>{
 assert.equal(E.shiftMonth('2026-12',1),'2027-01');assert.equal(E.shiftMonth('2026-01',-1),'2025-12');
 assert.equal(E.shiftMonth('1000-01',-1),'1000-01');assert.equal(E.shiftMonth('9999-12',1),'9999-12');
});

test('download-both ZIP preserves both original PNG payloads and names',async()=>{
 const zip=await E.buildZip([{name:'first.png',blob:new Blob(['first PNG'])},{name:'second.png',blob:new Blob(['second PNG'])}]);
 const bytes=Buffer.from(await zip.arrayBuffer());let offset=0;const names=[],payloads=[];
 while(bytes.readUInt32LE(offset)===0x04034b50){
  const length=bytes.readUInt32LE(offset+18),nameLength=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28);
  names.push(bytes.subarray(offset+30,offset+30+nameLength).toString());
  const start=offset+30+nameLength+extra;payloads.push(bytes.subarray(start,start+length).toString());offset=start+length;
 }
 assert.deepEqual(names,['first.png','second.png']);assert.deepEqual(payloads,['first PNG','second PNG']);
 assert.equal(bytes.readUInt32LE(offset),0x02014b50);assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);
 assert.equal(bytes.readUInt16LE(bytes.length-12),2);
});
test('fixed halves include day 16 in the first, day 17 and month end in the second',()=>{
 const events=[{id:'next',date:'2026-12-01'},{id:'end',date:'2026-11-30'},{id:'a',date:'2026-11-16'},{id:'b',date:'2026-11-17'},{id:'first',date:'2026-11-01'}];
 const before=JSON.stringify(events),parts=E.partition(events,'2026-11');
 assert.deepEqual(parts.map(p=>p.events.map(e=>e.id)),[['first','a'],['b','end']]);
 assert.deepEqual(parts.map(p=>[p.start,p.end]),[[1,16],[17,30]]);
 assert.equal(JSON.stringify(events),before);
});
test('month validation and leap-year end dates are explicit',()=>{
 assert.equal(E.parseMonth('2028-02').lastDay,29);assert.equal(E.parseMonth('2027-02').lastDay,28);
 for(const month of ['2026-13','2026-00','not-a-month','2026-2'])assert.throws(()=>E.parseMonth(month));
 assert.equal(E.partition([],'2026-11').length,2);
});
test('both halves are available for individual preview downloads',()=>{
 const parts=E.partition([{id:'a',date:'2026-11-16'},{id:'b',date:'2026-11-17'}],'2026-11');
 assert.equal(parts.length,2);assert.equal(parts[0].events[0].id,'a');assert.equal(parts[1].events[0].id,'b');
});
test('columns preserve event order and avoid splitting a date when possible',()=>{
 const events=[{id:'a',date:'2026-11-01'},{id:'b',date:'2026-11-01'},{id:'c',date:'2026-11-02'},{id:'d',date:'2026-11-03'}];
 const columns=E.columns(events);assert.deepEqual(columns.flat().map(e=>e.id),['a','b','c','d']);
 assert.notEqual(columns[0].at(-1).date,columns[1][0].date);assert.deepEqual(E.columns([]),[[],[]]);
});
test('wrapping preserves Thai and long unbroken words without overflow',()=>{
 const measure=s=>Array.from(s).length*10;
 for(const value of ['ELLEMENStyleAwards2026','สนุกสุดฟินกับน้องหมีสุดหอม','AUAU SAVE schedule']){
  const lines=E.wrapText(value,60,measure);
  assert.ok(lines.every(s=>measure(s)<=60));
  assert.equal(lines.join('').replace(/\s/g,''),value.replace(/\s/g,''));
 }
});

test('auto layout fits short months onto one image and splits overflowing months into fixed halves',()=>{
 const rows=Array.from({length:20},(_,i)=>({id:i,date:`2026-11-${String(i+1).padStart(2,'0')}`,height:200}));
 const before=JSON.stringify(rows);
 const short=E.planPages(rows.slice(0,4),'2026-11',300);
 assert.equal(short.pages.length,1);assert.deepEqual([short.pages[0].start,short.pages[0].end],[1,30]);
 assert.equal(short.height,1800);
 const long=E.planPages(rows,'2026-11',300);
 assert.equal(long.pages.length,2);assert.deepEqual(long.pages.map(p=>[p.start,p.end]),[[1,16],[17,30]]);
 assert.equal(long.pages.flatMap(p=>p.columns.flat()).length,20);
 assert.ok(long.height>1800);assert.equal(JSON.stringify(rows),before);
});

test('fit calculation uses row heights, handles empty/leap months, and can split a crowded date between columns',()=>{
 const sameDay=Array.from({length:16},(_,i)=>({id:i,date:'2026-11-16',height:120}));
 assert.equal(E.planPages(sameDay,'2026-11',300).pages.length,1);
 assert.equal(E.planPages(sameDay.map(r=>({...r,height:600})),'2026-11',300).pages.length,2);
 const empty=E.planPages([],'2028-02',300);assert.equal(empty.pages.length,1);assert.equal(empty.pages[0].end,29);
 const exact=[{date:'2026-11-01',height:1338},{date:'2026-11-02',height:1338}];
 assert.equal(E.planPages(exact,'2026-11',300).pages.length,1);
 assert.equal(E.planPages(exact.map(r=>({...r,height:1339})),'2026-11',300).pages.length,2);
});
