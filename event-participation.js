// Shared schedule status and participation content across event views.
function normalizeEventStatus(value){return ['postponed','canceled'].includes(value)?value:'scheduled'}
function eventStatusLabel(event){
  const status=normalizeEventStatus(event?.eventStatus);
  return status==='postponed'?'POSTPONED':status==='canceled'?'CANCELED':'';
}
function eventStatusBadge(event){
  const status=normalizeEventStatus(event?.eventStatus),label=eventStatusLabel(event);
  return label?`<span class="schedule-status schedule-status-${status}" title="${status==='postponed'?'เลื่อนการจัดกิจกรรม':'ยกเลิกงาน'}">${eventStatusIcon(status)}${label} · ${status==='postponed'?'เลื่อนการจัดกิจกรรม':'ยกเลิก'}</span>`:'';
}
function eventStatusIcon(status){return '<svg class="schedule-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/>'+ (status==='postponed'?'<path d="M12 7v5l3 2"/>':'<path d="m9 9 6 6m0-6-6 6"/>')+'</svg>'}
function statusSourceValue(value){const text=String(value||'').trim();return /^https?:\/\//i.test(text)?text:''}
function statusSourceEscape(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function eventStatusAnnouncement(event){
 const url=statusSourceValue(event?.statusSource);
 return normalizeEventStatus(event?.eventStatus)!=='scheduled'&&url?'<span class="event-status-announcement"><a href="'+statusSourceEscape(url)+'" target="_blank" rel="noopener noreferrer">'+(event.eventStatus==='postponed'?'ดูประกาศเลื่อนการจัดกิจกรรม':'ดูประกาศยกเลิกงาน')+'</a></span>':'';
}
function toggleEventStatusSource(select){select.closest('form').querySelector('.event-status-source-field').hidden=select.value==='scheduled'}
function eventStatusField(event){
  const value=normalizeEventStatus(event?.eventStatus);
  return `<div class="field full event-status-field"><label for="event-status">สถานะงาน</label><select id="event-status" name="eventStatus" onchange="toggleEventStatusSource(this)"><option value="scheduled" ${value==='scheduled'?'selected':''}>ตามกำหนดการ</option><option value="postponed" ${value==='postponed'?'selected':''}>POSTPONED — เลื่อนการจัดกิจกรรม</option><option value="canceled" ${value==='canceled'?'selected':''}>CANCELED — ยกเลิกงาน</option></select></div><div class="field full event-status-source-field" ${value==='scheduled'?'hidden':''}><label for="event-status-source">ลิงก์ประกาศเลื่อน / ยกเลิกงาน</label><input id="event-status-source" name="statusSource" type="url" placeholder="https://..." value="${statusSourceEscape(event?.statusSource)}"></div>`;
}
const EVENT_PARTICIPATION_OPTIONS = [
  {id:'closed',label:'งานปิด งดติดตาม',color:'#d64d49',path:'<circle cx="12" cy="12" r="8"/><path d="m6.4 6.4 11.2 11.2"/>'},
  {id:'open',label:'แฟนคลับสามารถไปร่วมกิจกรรมได้',color:'#3530a2',path:'<circle cx="12" cy="7" r="3"/><path d="M6 21v-3a6 6 0 0 1 12 0v3M3 8v7m18-7v7"/>'},
  {id:'private',label:'เฉพาะผู้มีสิทธิ์เข้าร่วมงาน',color:'#168354',path:'<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Z"/><path d="M15 6v3m0 3v1m0 3v2"/>'},
  {id:'surrounding',label:'สามารถไปให้กำลังใจรอบๆงานได้',color:'#567fbe',path:'<path d="M7 10v11H3V10h4Zm0 0 5-8c2 0 2 2 1 6h6a2 2 0 0 1 2 2l-2 9a2 2 0 0 1-2 2H7"/>'},
  {id:'gathering',label:'มีรวมพลหลังจบงาน',color:'#a35baf',path:'<path d="M21 11a8 8 0 0 1-8 8H8l-5 3v-6a8 8 0 1 1 18-5Z"/><path d="M8 10h8m-8 4h5"/>'},
  {id:'gifts',label:'รับของขวัญ',color:'#a18a00',path:'<path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/>'}
];
function normalizeEventParticipation(value){
  const data=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return {access:['closed','open','private','surrounding'].includes(data.access)?data.access:'',gathering:data.gathering===true,gifts:data.gifts===true};
}
function eventParticipationOptions(event){
  if(normalizeEventStatus(event?.eventStatus)!=='scheduled')return [];
  const data=normalizeEventParticipation(event?.participation);
  return EVENT_PARTICIPATION_OPTIONS.filter(option=>option.id===data.access||(option.id==='gathering'&&data.gathering)||(option.id==='gifts'&&data.gifts));
}
function eventParticipationText(event){return eventParticipationOptions(event).map(option=>option.label).join(' · ')}
function eventParticipationInline(event){
  const text=eventParticipationLabeled(event);
  return eventStatusBadge(event)+(text?`<span class="event-participation-inline"> · ${text}</span>`:'');
}
function eventParticipationCopy(event){
  const text=eventParticipationLabeled(event);
  const status=eventStatusBadge(event);
  return status||text?`<p class="event-participation-copy">${status?status+eventStatusAnnouncement(event):text}</p>`:'';
}
function eventParticipationIcon(option){return `<span class="event-participation-icon" title="${option.label}" style="--participation-color:${option.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${option.path}</svg></span>`}
function eventParticipationLabeled(event){return eventParticipationOptions(event).map(option=>`<span class="event-participation-item">${eventParticipationIcon(option)}<span>${option.label}</span></span>`).join(' ')}
function eventParticipationIcons(event){
  if(eventStatusLabel(event))return eventStatusBadge(event);
  const options=eventParticipationOptions(event);
  return options.length?`<span class="event-participation-icons">${options.map(eventParticipationIcon).join('')}</span>`:'';
}
function participationFromForm(data){
  return normalizeEventParticipation({access:data.get('participationAccess'),gathering:data.get('participationGathering')==='on',gifts:data.get('participationGifts')==='on'});
}
function eventParticipationFields(event){
  const data=normalizeEventParticipation(event?.participation);
  return `<fieldset class="field full event-participation-fields"><legend>การเข้าร่วมงาน</legend><label for="event-participation-access">เงื่อนไขการเข้าร่วม</label><select id="event-participation-access" name="participationAccess"><option value="" ${!data.access?'selected':''}>ยังไม่ระบุ</option>${EVENT_PARTICIPATION_OPTIONS.slice(0,4).map(option=>`<option value="${option.id}" ${data.access===option.id?'selected':''}>${option.label}</option>`).join('')}</select><div class="event-participation-extras"><label><input type="checkbox" name="participationGathering" ${data.gathering?'checked':''}><span>มีรวมพลหลังจบงาน</span></label><label><input type="checkbox" name="participationGifts" ${data.gifts?'checked':''}><span>รับของขวัญ</span></label></div></fieldset>`;
}
