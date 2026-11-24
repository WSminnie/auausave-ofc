const { sourceIndex } = require('./source-section.cjs');
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const source = fs.readFileSync('app.js', 'utf8');
const aliases = {duo:'AT01',auau:'AT02',save:'AT03'};
const canonicalArtistId = id => aliases[id] || id;
const context = vm.createContext({canonicalArtistId, escapePageText:String, eventArtistIds:event=>(event.artistIds?.length ? event.artistIds : [event.artistId]).filter(Boolean).map(canonicalArtistId), artistName:id=>id==='AT01'?'AUAUSAVE':id==='AT04'?'MHIIPREAW':id==='AT02'?'AUAU':'SAVE', db:{siteSettings:{}},isSeriesBroadcast:event=>event.scheduleType==='series_broadcast', itemMatchesArtist: (event, id) =>
  (event.artistIds || [event.artistId]).map(canonicalArtistId).includes(canonicalArtistId(id))});
const start = sourceIndex(source, 'function artistProfileScheduleMatches(');
if (start !== -1) vm.runInContext(source.slice(start, sourceIndex(source, 'function profile(', start)), context);
vm.runInContext(source.slice(sourceIndex(source, 'function homeScheduleBangkokDate'), sourceIndex(source, 'const homeBeforeUnifiedSchedule')), context);
context.homeScheduleBangkokDate=()=> '2026-11-23';
context.normalizeBroadcasts=items=>items||[];
context.artistById=id=>context.db.artists.find(artist=>artist.id===id);
context.artistDisplayColor=()=> '#4c8b94';
context.calendarEventArtistIds=context.eventArtistIds;
context.sameArtistId=(a,b)=>canonicalArtistId(a)===canonicalArtistId(b);
context.unifiedHomeScheduleMeta=event=>event.place||'';
context.eventParticipationCopy=()=> '<p>Participation details</p>';
test('solo profiles include joint schedules, but exclude the other solo artist', () => {
  for (const [artist, other] of [['auau','save'],['save','auau'],['AT02','AT03'],['AT03','AT02']]) {
    assert.equal(context.artistProfileScheduleMatches({artistId:'duo'}, artist), true);
    assert.equal(context.artistProfileScheduleMatches({artistIds:['AT01']}, artist), true);
    assert.equal(context.artistProfileScheduleMatches({artistId:artist}, artist), true);
    assert.equal(context.artistProfileScheduleMatches({artistId:other}, artist), false);
    assert.equal(context.artistProfileScheduleMatches({artistIds:['AT02','AT03']}, artist), true);
  }
});
test('joint and unrelated profiles retain their own schedule scope', () => {
  assert.equal(context.artistProfileScheduleMatches({artistId:'auau'}, 'duo'), false);
  assert.equal(context.artistProfileScheduleMatches({artistId:'duo'}, 'AT04'), false);
  assert.equal(context.artistProfileScheduleMatches({artistIds:[]}, 'save'), false);
  assert.match(source, /ev\s*=\s*publicOrderedEvents\(\)\.filter\(\s*\(e\)\s*=>\s*artistProfileScheduleMatches\(e,\s*id\)\s*&&\s*e.date.startsWith\(currentMonth\),?\s*\)/);
});
test('schedule defaults to all owner events and a collaborator never widens the owner scope', () => {
  const solo={artistId:'save'},duo={artistId:'duo'},other={artistId:'auau'};
  assert.equal(context.artistProfileScheduleFilterMatches(solo,'save'),true);
  assert.equal(context.artistProfileScheduleFilterMatches(duo,'save'),true);
  assert.equal(context.artistProfileScheduleFilterMatches(other,'save'),false);
  assert.equal(context.artistProfileScheduleFilterMatches(other,'save','auau'),false);
  assert.equal(context.artistProfileScheduleFilterMatches(duo,'save','auau'),false);
  assert.equal(context.artistProfileScheduleFilterMatches(solo,'save','auau'),false);
  assert.equal(context.artistProfileScheduleFilterMatches(duo,'save','duo'),true);
  assert.equal(context.artistProfileScheduleFilterMatches({artistIds:['AT03','AT04']},'save','AT04'),true);
  assert.equal(context.artistProfileScheduleFilterMatches({artistId:'AT04'},'save','AT04'),false);
  assert.equal(context.artistProfileScheduleFilterMatches({artistIds:['AT02','AT04']},'AT04','auau'),true);
  assert.equal(context.artistProfileScheduleFilterMatches(duo,'AT04','auau'),false);
});

test('All is first and selected by default, owner remains available without solo work, and couple members are not duplicated', () => {
  context.db={artists:[{id:'AT01',name:'AUAUSAVE'},{id:'AT02',name:'AUAU'},{id:'AT03',name:'SAVE'},{id:'AT04',name:'MHIIPREAW'}],siteSettings:{}};
  context.artistSchedulePriority=()=>0;
  context.mobileCalendarListRow=event=>event.title;
  const items=[{artistIds:['AT01','AT02','AT03','AT04'],date:'2026-11-01',title:'Shared event'}];
  const expected={AT01:['all','solo','AT04'],AT02:['all','solo','AT01','AT04'],AT03:['all','solo','AT01','AT04'],AT04:['all','solo','AT01']};
  for(const owner of context.db.artists){
    const html=context.renderArtistProfileSchedule(items,owner.id);
    const options=Array.from(html.matchAll(/<option value="([^"]+)"[^>]*>([^<]+)<\/option>/g));
    assert.deepEqual(options.map(match=>match[1]),expected[owner.id]);
    assert.equal(options[0][2],'All');
    assert.equal(options[1][2],owner.name);
    assert.match(html,/<option value="all" selected>/);
    assert.doesNotMatch(html,/อย่างเดียว|>ทั้งหมด<|>ตารางงานของ<|<span>ร่วมงานกับ<|artist-schedule-segments/);
    assert.match(html,/<select[^>]*aria-label=/);
    const empty=context.renderArtistProfileSchedule([],owner.id,'solo');
    assert.match(empty,/<option value="solo" selected>/);
    assert.match(empty,/No .*events.*this month\./);
    assert.ok(empty.includes(owner.name));
  }
  const scopedItems=[{artistId:'save',date:'2026-11-01',title:'Solo'},{artistIds:['AT03','AT04'],date:'2026-11-02',title:'With Praew'},{artistId:'auau',date:'2026-11-03',title:'Unrelated'}];
  const available=context.renderArtistProfileSchedule(scopedItems,'save','auau');
  assert.match(available,/<option value="AT04"/);
  assert.doesNotMatch(available,/<option value="AT01"|<option value="AT02"|<option value="AT03"/);
  assert.match(available,/<option value="all" selected>/);
});

test('owner-only filtering excludes collaborators and joint broadcasts for every artist', () => {
  context.db={artists:[{id:'AT01',name:'AUAUSAVE'},{id:'AT02',name:'AUAU'},{id:'AT03',name:'SAVE'},{id:'AT04',name:'MHIIPREAW'}],siteSettings:{timeline:[{seriesId:'single',artistIds:['save'],category:'series'},{seriesId:'joint',artistIds:['duo'],category:'series'}]}};
  for(const owner of ['AT02','AT03','AT04']){
    assert.equal(context.artistProfileScheduleFilterMatches({artistId:owner},owner,'solo'),true);
    assert.equal(context.artistProfileScheduleFilterMatches({artistIds:[owner,owner==='AT04'?'AT02':'AT04']},owner,'solo'),false);
    assert.equal(context.artistProfileScheduleFilterMatches({artistId:'duo'},owner,'solo'),false);
    const html=context.renderArtistProfileSchedule([{artistId:owner,date:'2026-11-01',title:'Solo event'}],owner,'solo');
    assert.match(html,/<option value="solo" selected>/);
    assert.ok(html.includes('>'+context.artistName(owner)+'</option>'));
    assert.doesNotMatch(html,/อย่างเดียว/);
  }
  assert.equal(context.artistProfileScheduleFilterMatches({artistIds:[],scheduleType:'series_broadcast',seriesId:'single'},'save','solo'),true);
  assert.equal(context.artistProfileScheduleFilterMatches({artistIds:[],scheduleType:'series_broadcast',seriesId:'joint'},'save','solo'),false);
  assert.equal(context.artistProfileScheduleFilterMatches({artistId:'duo'},'duo','solo'),true);
  assert.equal(context.artistProfileScheduleFilterMatches({artistIds:['AT01','AT04']},'duo','solo'),false);
  const jointOnly=context.renderArtistProfileSchedule([{artistId:'duo',date:'2026-11-01',title:'Joint event'}],'save','solo');
  assert.match(jointOnly,/<option value="solo" selected>/);
  assert.match(jointOnly,/No solo events for SAVE this month\./);
});

test('rendered schedules keep solo, joint and series events scoped when collaborators change', () => {
  context.db={artists:[{id:'AT01',name:'AUAUSAVE'},{id:'AT02',name:'AUAU'},{id:'AT03',name:'SAVE'},{id:'AT04',name:'MHIIPREAW'}],siteSettings:{timeline:[{seriesId:'joint',artistIds:['duo'],category:'series'}]}};
  context.artistSchedulePriority=()=>0;
  context.mobileCalendarListRow=event=>`<article>${event.title}</article>`;
  const items=[
    {artistId:'save',date:'2026-11-01',title:'SAVE SOLO'},
    {artistId:'duo',date:'2026-11-02',title:'COUPLE WORK'},
    {artistIds:['AT03','AT04'],date:'2026-11-03',title:'SAVE AND PRAEW'},
    {artistId:'auau',date:'2026-11-04',title:'AUAU SOLO'},
    {artistId:'AT04',date:'2026-11-05',title:'PRAEW SOLO'},
    {artistIds:[],scheduleType:'series_broadcast',seriesId:'joint',date:'2026-11-06',title:'JOINT BROADCAST'},
  ];
  const all=context.renderArtistProfileSchedule(items,'save');
  for(const title of ['SAVE SOLO','COUPLE WORK','SAVE AND PRAEW','JOINT BROADCAST'])assert.ok(all.includes(`<article>${title}</article>`));
  assert.doesNotMatch(all,/AUAU SOLO|PRAEW SOLO/);
  const auau=context.renderArtistProfileSchedule(items,'save','duo');
  assert.match(auau,/COUPLE WORK/);assert.match(auau,/JOINT BROADCAST/);
  assert.doesNotMatch(auau,/SAVE SOLO|SAVE AND PRAEW|AUAU SOLO|PRAEW SOLO/);
  const praew=context.renderArtistProfileSchedule(items,'save','AT04');
  assert.match(praew,/SAVE AND PRAEW/);assert.doesNotMatch(praew,/SAVE SOLO|COUPLE WORK|JOINT BROADCAST|PRAEW SOLO/);
  const couple=context.artistProfileScheduleSection(items,'duo');
  assert.match(couple,/data-schedule-owner="AT01"/);
  assert.match(couple,/COUPLE WORK/);assert.match(couple,/JOINT BROADCAST/);
  assert.doesNotMatch(couple,/SAVE SOLO|SAVE AND PRAEW|AUAU SOLO|PRAEW SOLO/);
});

test('Today highlights only the selected artist events in Bangkok today, in start-time order', () => {
  context.db={artists:[{id:'AT01',name:'AUAUSAVE'},{id:'AT02',name:'AUAU'},{id:'AT03',name:'SAVE'},{id:'AT04',name:'MHIIPREAW'}],siteSettings:{}};
  context.artistSchedulePriority=()=>0;
  context.mobileCalendarListRow=event=>`<article>${event.title}</article>`;
  const items=[
    {id:'late',artistId:'auau',date:'2026-11-23',time:'8 PM',title:'LATE TODAY'},
    {id:'early',artistId:'duo',date:'2026-11-23',time:'3 PM',title:'EARLY TODAY'},
    {id:'other',artistId:'save',date:'2026-11-23',title:'OTHER ARTIST'},
    {id:'past',artistId:'auau',date:'2026-11-22',title:'PAST EVENT'},
    {id:'future',artistId:'auau',date:'2026-11-24',title:'FUTURE EVENT'},
  ];
  const html=context.renderArtistProfileSchedule(items,'auau');
  assert.match(html,/>TODAY</);
  const today=html.match(/<section class="artist-schedule-today"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(today);
  assert.ok(today.indexOf('EARLY TODAY')<today.indexOf('LATE TODAY'));
  assert.doesNotMatch(today,/OTHER ARTIST|PAST EVENT|FUTURE EVENT/);
  assert.match(today,/Participation details/);
  const solo=context.renderArtistProfileSchedule(items,'auau','solo').match(/<section class="artist-schedule-today"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.match(solo,/LATE TODAY/);assert.doesNotMatch(solo,/EARLY TODAY/);
  assert.match(context.renderArtistProfileSchedule(items,'AT04'),/No upcoming events\./);
});

test('when Today is empty, UP NEXT shows all events on the nearest future date within the selected filter', () => {
  context.db={artists:[{id:'AT01',name:'AUAUSAVE'},{id:'AT02',name:'AUAU'},{id:'AT03',name:'SAVE'}],siteSettings:{}};
  context.artistSchedulePriority=()=>0;
  context.mobileCalendarListRow=event=>`<article>${event.title}</article>`;
  const items=[
    {id:'past',artistId:'auau',date:'2026-11-22',title:'PAST'},
    {id:'other',artistId:'save',date:'2026-11-23',title:'OTHER ARTIST TODAY'},
    {id:'late',artistId:'duo',date:'2026-11-24',time:'8 PM',title:'NEAREST LATE'},
    {id:'early',artistId:'duo',date:'2026-11-24',time:'3 PM',title:'NEAREST EARLY'},
    {id:'solo',artistId:'auau',date:'2026-11-25',title:'NEXT SOLO'},
  ];
  const html=context.renderArtistProfileSchedule(items,'auau');
  assert.match(html,/>UP NEXT</);assert.doesNotMatch(html,/>TODAY<|No events today\./);
  assert.match(html,/artist-schedule-filters is-next/);
  const highlight=html.match(/<section class="artist-schedule-today"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(highlight.indexOf('NEAREST EARLY')<highlight.indexOf('NEAREST LATE'));
  assert.doesNotMatch(highlight,/PAST|OTHER ARTIST TODAY|NEXT SOLO/);
  const solo=context.renderArtistProfileSchedule(items,'auau','solo');
  const soloHighlight=solo.match(/<section class="artist-schedule-today"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.match(solo,/>UP NEXT</);assert.match(soloHighlight,/NEXT SOLO/);
  assert.doesNotMatch(soloHighlight,/NEAREST EARLY|NEAREST LATE/);
  assert.match(context.renderArtistProfileSchedule([],'save'),/>UP NEXT<[\s\S]*No upcoming events\./);
});

test('SAVE list reuses calendar rows in date order and prints each date once', () => {
  assert.equal(typeof context.artistProfileScheduleList, 'function');
  context.db={artists:[{id:'AT03'}]};context.artistSchedulePriority=()=>0;
  const rows=[];
  context.mobileCalendarListRow=(event,index,showDate,endOfDay)=>{rows.push([event.id,showDate,endOfDay]);return event.title;};
  const items=[{id:'later',date:'2026-11-07',title:'Later'},{id:'first',date:'2026-11-06',title:'First'},{id:'second',date:'2026-11-06',title:'Second'}];
  const html=context.artistProfileScheduleList(items);
  assert.match(html,/mobile-calendar-agenda/);
  assert.deepEqual(rows,[['first',true,false],['second',false,true],['later',true,true]]);
  assert.equal(items[0].id,'later');
});
test('SAVE All includes broadcasts linked by Journey series, without artist IDs', () => {
  context.db={siteSettings:{timeline:[
    {seriesId:'fanboy',artistIds:['save'],category:'series'},
    {seriesId:'joint',artistIds:['duo']},
    {seriesId:'other',artistIds:['auau'],category:'series'},
    {seriesId:'music',artistIds:['save'],category:'music-video'},
  ]}};
  const broadcast=seriesId=>({seriesId,scheduleType:'series_broadcast',artistIds:[]});
  assert.equal(context.artistProfileScheduleMatches(broadcast('fanboy'),'AT03'),true);
  assert.equal(context.artistProfileScheduleFilterMatches(broadcast('fanboy'),'save','all'),true);
  assert.equal(context.artistProfileScheduleFilterMatches(broadcast('fanboy'),'save','auau'),false);
  assert.equal(context.artistProfileScheduleFilterMatches(broadcast('joint'),'save','auau'),false);
  assert.equal(context.artistProfileScheduleFilterMatches(broadcast('joint'),'duo'),true);
  assert.equal(context.artistProfileScheduleMatches(broadcast('joint'),'save'),true);
  for(const id of ['other','music','unknown',''])assert.equal(context.artistProfileScheduleMatches(broadcast(id),'save'),false);
  assert.equal(context.artistProfileScheduleMatches({seriesId:'fanboy',artistIds:[]},'save'),false);
  assert.equal(context.artistProfileScheduleMatches(broadcast('fanboy'),'AT02'),false);
  assert.equal(context.artistProfileScheduleMatches(broadcast('other'),'AT02'),true);
  assert.equal(context.artistProfileScheduleMatches(broadcast('joint'),'AT02'),true);
  assert.equal(context.artistProfileScheduleMatches(broadcast('joint'),'AT04'),false);
  context.db.siteSettings.timeline.push({seriesId:'solo-four',artistIds:['AT04'],category:'series'});
  assert.equal(context.artistProfileScheduleMatches(broadcast('solo-four'),'AT04'),true);
  assert.equal(context.artistProfileScheduleMatches(broadcast('solo-four'),'AT03'),false);
  context.db={siteSettings:{}};
  assert.equal(context.artistProfileScheduleMatches(broadcast('fanboy'),'save'),false);
});
test('other solo Journeys exclude couple work and the couple-only filter',()=>{
  const start=sourceIndex(source, 'function artistSeriesSection(');
  vm.runInContext(source.slice(start,sourceIndex(source, 'function filterArtistTimeline(',start)),context);
  context.sameArtistId=(a,b)=>canonicalArtistId(a)===canonicalArtistId(b);
  context.escapePageText=String;context.timelineSectionMarkup=options=>options;
  context.db={siteSettings:{artistArchive:{AT02:{},AT04:{}},timeline:[{id:'joint',artistIds:['AT01']},{id:'auau',artistIds:['AT02']},{id:'four',artistIds:['AT04']}]}};
  const other=context.artistSeriesSection('AT04');
  assert.deepEqual(Array.from(other.items,item=>item.id),['four']);
  assert.doesNotMatch(other.artistFilters,/AUAUSAVE/);
  assert.deepEqual(Array.from(context.artistSeriesSection('AT02').items,item=>item.id),['joint','auau']);
});
