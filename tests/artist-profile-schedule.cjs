const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const source = fs.readFileSync('app.js', 'utf8');
const aliases = {duo:'AT01',auau:'AT02',save:'AT03'};
const canonicalArtistId = id => aliases[id] || id;
const context = vm.createContext({canonicalArtistId, artistName:id=>id==='AT04'?'MHIIPREAW':id==='AT02'?'AUAU':'SAVE', db:{siteSettings:{}},isSeriesBroadcast:event=>event.scheduleType==='series_broadcast', itemMatchesArtist: (event, id) =>
  (event.artistIds || [event.artistId]).map(canonicalArtistId).includes(canonicalArtistId(id))});
const start = source.indexOf('function artistProfileScheduleMatches(');
if (start !== -1) vm.runInContext(source.slice(start, source.indexOf('function profile(', start)), context);
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
  assert.match(source, /ev = publicOrderedEvents\(\)\.filter\(\(e\) => artistProfileScheduleMatches\(e, id\) && e.date.startsWith\(currentMonth\)\)/);
});
test('schedule choices default to solo and keep All scoped to the profile', () => {
  const solo={artistId:'save'},duo={artistId:'duo'},other={artistId:'auau'};
  assert.equal(context.artistProfileScheduleFilterMatches(solo,'save'),true);
  assert.equal(context.artistProfileScheduleFilterMatches(duo,'save'),false);
  assert.equal(context.artistProfileScheduleFilterMatches(duo,'save','duo'),true);
  assert.equal(context.artistProfileScheduleFilterMatches(solo,'save','duo'),false);
  assert.equal(context.artistProfileScheduleFilterMatches(duo,'save','all'),true);
  assert.equal(context.artistProfileScheduleFilterMatches(other,'save','all'),false);
  assert.equal(context.artistProfileScheduleFilterMatches({artistId:'auau'},'auau'),true);
  assert.equal(context.artistProfileScheduleFilterMatches(duo,'auau'),false);
});
test('solo schedules default to All and omit the couple-only choice', () => {
  context.scheduleRows = items => JSON.stringify(items);
  const save = context.renderArtistProfileSchedule([], 'AT03');
  assert.doesNotMatch(save, /data-schedule-filter="duo"/);
  assert.match(save, /data-schedule-filter="all" aria-pressed="true"/);
  assert.match(context.renderArtistProfileSchedule([], 'AT03', 'solo'), /data-schedule-filter="solo" aria-pressed="true"/);
  assert.match(context.renderArtistProfileSchedule([], 'AT02'), /data-schedule-filter="all" aria-pressed="true"/);
  assert.match(save, /data-schedule-filter="all"/);
  assert.doesNotMatch(context.renderArtistProfileSchedule([], 'save'), /data-schedule-filter="duo"/);
  assert.doesNotMatch(context.renderArtistProfileSchedule([], 'AT02'), /data-schedule-filter="duo"/);
  context.artistName=id=>id==='AT04'?'MHIIPREAW':id==='AT02'?'AUAU':'SAVE';
  assert.match(context.renderArtistProfileSchedule([], 'AT04'), />MHIIPREAW<\/button>/);
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
  assert.equal(context.artistProfileScheduleFilterMatches(broadcast('fanboy'),'save','solo'),false);
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
  const start=source.indexOf('function artistSeriesSection(');
  vm.runInContext(source.slice(start,source.indexOf('function filterArtistTimeline(',start)),context);
  context.sameArtistId=(a,b)=>canonicalArtistId(a)===canonicalArtistId(b);
  context.escapePageText=String;context.timelineSectionMarkup=options=>options;
  context.db={siteSettings:{artistArchive:{AT02:{},AT04:{}},timeline:[{id:'joint',artistIds:['AT01']},{id:'auau',artistIds:['AT02']},{id:'four',artistIds:['AT04']}]}};
  const other=context.artistSeriesSection('AT04');
  assert.deepEqual(Array.from(other.items,item=>item.id),['four']);
  assert.doesNotMatch(other.artistFilters,/AUAUSAVE/);
  assert.deepEqual(Array.from(context.artistSeriesSection('AT02').items,item=>item.id),['joint','auau']);
});
