const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const source = fs.readFileSync('app.js', 'utf8');
const aliases = {duo:'AT01',auau:'AT02',save:'AT03'};
const canonicalArtistId = id => aliases[id] || id;
const context = vm.createContext({canonicalArtistId, itemMatchesArtist: (event, id) =>
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
