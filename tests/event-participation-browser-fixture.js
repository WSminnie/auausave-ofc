// Local preview only: no Supabase scripts are loaded by the fixture page.
db=structuredClone(window.AUAUSAVE_DATA.seed);
db.masterData={types:[{id:'event',label:'Event'},{id:'live',label:'Live'},{id:'private',label:'Private'},{id:'series_broadcast',label:'Series Broadcast'}],series:[{id:'test-series',label:'Mr. Fanboy Series',broadcasts:[]}]};
db.events=JSON.parse(sessionStorage.getItem('participation-preview-events')||'null')||[
 {id:'participation-open',date:'2026-09-12',artistId:'AT02',artistIds:['AT02'],title:'AUAU FAN EVENT',type:'Event',place:'12:30 PM | Union Co-Event Space',participation:{access:'open',gathering:true,gifts:true}},
 {id:'participation-series',date:'2026-09-12',artistId:'',artistIds:[],title:'Mr. Fanboy Series · EP.3',type:'Series Broadcast',scheduleType:'series_broadcast',seriesId:'test-series',episode:3,broadcasts:[{mode:'on_air',channel:'Channel 1',time:'20:00',watchUrl:''}],participation:{access:'closed'}},
 {id:'participation-legacy',date:'2026-09-12',artistId:'AT03',artistIds:['AT03'],title:'SAVE SCHEDULE',type:'Live',place:'18:00 | Bangkok'},
 {id:'participation-next',date:'2026-09-13',artistId:'AT01',artistIds:['AT01'],title:'AUAUSAVE PRIVATE EVENT',type:'Event',place:'14:00 | Bangkok',participation:{access:'private',gifts:true}}
];
ensureHomePageSettings();ensureLocalizationSettings();
window.auausaveDB={session:async()=>({data:{session:{user:{email:'preview@example.test'}}}}),save:async data=>{sessionStorage.setItem('participation-preview-events',JSON.stringify(data.events));return data}};
adminAuthenticated=true;adminDatabaseLoaded=true;adminTab='events';adminMonth='2026-09';adminSelectedDate='2026-09-12';
calendarDate=new Date(2026,8,12);mobileCalendarSelectedDate='2026-09-12';
document.body.insertAdjacentHTML('afterbegin','<nav class="participation-preview-controls" style="position:fixed;bottom:0;left:0;z-index:9999;background:white;padding:8px;border:1px solid #ddd;font-size:11px"><span>ตัวอย่างข้อมูลจำลอง · </span><button onclick="admin()">หลังบ้าน</button> <button onclick="calendarPage()">ปฏิทิน</button> <button onclick="app.innerHTML=unifiedHomeScheduleSection()">Home Schedule</button></nav>');
requestAdminAccess=async()=>admin();
admin();
