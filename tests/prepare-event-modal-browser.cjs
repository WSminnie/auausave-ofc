// Local-only fixture: strip database scripts before loading the application.
const fs = require("node:fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/<script src="(?:https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^\"]*|supabase-[^\"]*)"><\/script>/g, "");
html = html.replace(/(src|href)="(?!https?:|\/|#)([^\"]+)"/g, '$1="/$2"');
html = html.replace("</body>", `<script>
(function () {
  if (!['localhost','127.0.0.1'].includes(location.hostname)) throw Error('Local fixture only');
  db.events = [
    {id:'modal-private',date:'2026-11-25',artistId:'AT02',artistIds:['AT02'],title:'ELLEMENStyleAwards2026',type:'Private',time:'TBC',participation:{access:'private'},source:'https://example.com/source'},
    {id:'modal-long',date:'2026-11-25',artistId:'AT01',artistIds:['AT01'],title:'AUAUSAVE '+('A long event title with full details. ').repeat(30),type:'Live',time:('Event information and venue details. ').repeat(50),participation:{access:'open',gathering:true,gifts:true},source:'https://example.com/source'},
    {id:'modal-series',date:'2026-11-25',artistId:'AT01',artistIds:['AT01'],title:'Mr. Fanboy · EP.3',type:'Series Broadcast',scheduleType:'series_broadcast',seriesId:'modal-test-series',episode:3,broadcasts:[{mode:'on_air',channel:'Channel 1',time:'20:00',watchUrl:'https://example.com/watch'}],participation:{access:'closed'}},
    {id:'modal-next',date:'2026-11-27',artistId:'AT03',artistIds:['AT03'],title:'SAVE NEXT EVENT',type:'Event',time:'3 PM',participation:{access:'open'}}
  ];
  db.masterData.series.push({id:'modal-test-series',label:'Mr. Fanboy Series',broadcasts:[]});
  calendarDate = new Date(2026,10,25); mobileCalendarSelectedDate='2026-11-25';
  homeScheduleBangkokDate = () => '2026-11-25';
  calendarPage();
})();
</script></body>`);
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync("tmp/event-modal-browser.html", html);
console.log("/tmp/event-modal-browser.html");
