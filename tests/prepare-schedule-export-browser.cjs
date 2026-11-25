// Deterministic local fixture; no live database reads or writes.
const fs = require('node:fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<script src="(?:https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^\"]*|supabase-[^\"]*)"><\/script>/g, '');
html = html.replace(/(src|href)="(?!https?:|\/|#)([^\"]+)"/g, '$1="/$2"');
html = html.replace('</body>', `<script>
if (!['localhost','127.0.0.1'].includes(location.hostname)) throw Error('Local fixture only');
if (!db.artists.some(a=>canonicalArtistId(a.id)==='AT04')) db.artists.push({id:'AT04',name:'MHIIPRAEW'});
db.events = [
 {id:'first',date:'2026-11-01',artistId:'AT02',artistIds:['AT02'],title:'AUAU first half',type:'Event',place:'10 AM | Bangkok',participation:{access:'open',gathering:true}},
 {id:'boundary',date:'2026-11-16',artistId:'AT01',artistIds:['AT01'],title:'AUAUSAVE day sixteen',type:'Private',place:'TBC',participation:{access:'private'}},
 {id:'second',date:'2026-11-17',artistId:'AT03',artistIds:['AT03'],title:'SAVE second half',type:'Event',place:'3 PM | Bangkok'},
 {id:'collab',date:'2026-11-20',artistId:'AT02',artistIds:['AT02','AT04'],title:'AUAU collaboration',type:'Event',place:'Bangkok'},
 {id:'last',date:'2026-11-30',artistId:'AT01',artistIds:['AT01'],title:'สนุกสุดฟินกับน้องหมีสุดหอม '.repeat(6),type:'Event',place:'7 PM | Bangkok',participation:{access:'closed'}},
 {id:'leap',date:'2028-02-29',artistId:'AT03',artistIds:['AT03'],title:'Leap day event',type:'Event',place:'Bangkok'}
];
calendarDate=new Date(2026,10,1);homeScheduleBangkokDate=()=> '2026-11-25';publicTypeFilter='all';calendarPage();
</script></body>`);
fs.mkdirSync('tmp', {recursive:true});
fs.writeFileSync('tmp/schedule-export-browser.html',html);
console.log('/tmp/schedule-export-browser.html');
