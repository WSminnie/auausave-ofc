// Local-only fixture. This page omits the Supabase client and never writes live data.
db=structuredClone(window.AUAUSAVE_DATA.seed);
db.events=[
 {id:'order-a',artistId:'AT02',artistIds:['AT02'],date:'2026-09-12',title:'Live with AUAU',type:'Live',place:'13:00 | Studio'},
 {id:'order-b',artistId:'AT01',artistIds:['AT01'],date:'2026-09-12',title:'Mr. Fanboy Series EP.3',type:'Series',place:'20:00 | Online'},
 {id:'order-c',artistId:'AT03',artistIds:['AT03'],date:'2026-09-12',title:'SAVE fan meeting',type:'Event',place:'18:00 | Bangkok'}
];
db.eventOrderByDate=JSON.parse(sessionStorage.getItem('schedule-order-test')||'{}');
ensureHomePageSettings();ensureLocalizationSettings();
window.auausaveDB={saveEventOrder:async(date,ids)=>{
 if(document.querySelector('#fixture-failure').checked)throw Error('Test save failure');
 await new Promise(resolve=>setTimeout(resolve,150));
 const saved=JSON.parse(sessionStorage.getItem('schedule-order-test')||'{}');saved[date]=ids;
 sessionStorage.setItem('schedule-order-test',JSON.stringify(saved));
}};
adminAuthenticated=true;adminDatabaseLoaded=true;adminTab='events';adminMonth='2026-09';adminSelectedDate='2026-09-12';
calendarDate=new Date(2026,8,12);mobileCalendarSelectedDate='2026-09-12';
document.body.insertAdjacentHTML('afterbegin','<div style="position:fixed;bottom:0;left:0;z-index:9999;background:white;padding:8px;border:1px solid #222"><button onclick="admin()">Test admin</button> <button onclick="calendarPage()">Test public calendar</button> <label><input id="fixture-failure" type="checkbox">Simulate save failure</label></div>');
requestAdminAccess=async()=>admin();
admin();
