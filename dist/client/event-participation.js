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
  const access=[...new Set((Array.isArray(data.access)?data.access:[data.access]).filter(id=>['closed','open','private','surrounding'].includes(id)))];
  return {access:access.length>1?access:access[0]||'',gathering:data.gathering===true,gifts:data.gifts===true};
}
function eventParticipationOptions(event){
  if(normalizeEventStatus(event?.eventStatus)!=='scheduled')return [];
  const data=normalizeEventParticipation(event?.participation);
  return EVENT_PARTICIPATION_OPTIONS.filter(option=>(Array.isArray(data.access)?data.access:[data.access]).includes(option.id)||(option.id==='gathering'&&data.gathering)||(option.id==='gifts'&&data.gifts));
}
function eventParticipationText(event){return eventParticipationOptions(event).map(option=>option.label).join(' · ')}
function eventParticipationInline(event){
  const text=eventParticipationLabeled(event);
  const parent=typeof db!=='undefined'?db.events.find(item=>item.id===event?.rescheduledFrom):null;
  const origin=parent?`<span class="event-rescheduled-from">เลื่อนมาจากวันที่ <b>${statusSourceEscape(eventReferenceDate(parent.date))}</b></span>`:'';
  return origin+eventStatusBadge(event)+(text?`<span class="event-participation-inline"> · ${text}</span>`:'');
}
function eventParticipationCopy(event){
  const text=eventParticipationLabeled(event);
  const status=eventStatusBadge(event);
  const reference=eventRescheduleCopy(event);
  return status||text||reference?`<p class="event-participation-copy">${status?status+eventStatusAnnouncement(event):text}${reference}</p>`:'';
}
function eventParticipationIcon(option){return `<span class="event-participation-icon" title="${option.label}" style="--participation-color:${option.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${option.path}</svg></span>`}
function eventParticipationLabeled(event){return eventParticipationOptions(event).map(option=>`<span class="event-participation-item">${eventParticipationIcon(option)}<span>${option.label}</span></span>`).join(' ')}
function eventParticipationIcons(event){
  if(eventStatusLabel(event))return eventStatusBadge(event);
  const options=eventParticipationOptions(event);
  return options.length?`<span class="event-participation-icons">${options.map(eventParticipationIcon).join('')}</span>`:'';
}
function participationFromForm(data){
  return normalizeEventParticipation({access:typeof data.getAll==='function'?data.getAll('participationAccess'):data.get('participationAccess'),gathering:data.get('participationGathering')==='on',gifts:data.get('participationGifts')==='on'});
}
function eventParticipationFields(event){
  const data=normalizeEventParticipation(event?.participation);
  const selected=Array.isArray(data.access)?data.access:[data.access];
  return `<fieldset class="field full event-participation-fields"><legend>การเข้าร่วมงาน</legend><span>เงื่อนไขการเข้าร่วม (เลือกได้มากกว่า 1 ข้อ)</span><div class="event-participation-extras">${EVENT_PARTICIPATION_OPTIONS.slice(0,4).map(option=>`<label><input type="checkbox" name="participationAccess" value="${option.id}" ${selected.includes(option.id)?'checked':''}><span>${option.label}</span></label>`).join('')}</div><div class="event-participation-extras"><label><input type="checkbox" name="participationGathering" ${data.gathering?'checked':''}><span>มีรวมพลหลังจบงาน</span></label><label><input type="checkbox" name="participationGifts" ${data.gifts?'checked':''}><span>รับของขวัญ</span></label></div></fieldset>`;
}
function eventReplacement(event){return event?.id&&typeof db!=='undefined'?db.events.find(item=>item.rescheduledFrom===event?.id&&item.id!==event?.id):null}
function validateEventReference(item){
 if(!item.rescheduledFrom)return '';
 const parent=db.events.find(event=>event.id===item.rescheduledFrom);
 if(!parent||parent.id===item.id||parent.eventStatus!=='postponed')return 'กรุณาเลือกงานเดิมที่มีสถานะเลื่อน';
 if(item.date<=parent.date)return 'วันจัดใหม่ต้องอยู่หลังวันเดิม';
 if(db.events.some(event=>event.id!==item.id&&event.rescheduledFrom===parent.id))return 'งานเดิมนี้มีงานใหม่อ้างอิงแล้ว';
 let cursor=parent,seen=new Set([item.id]);while(cursor){if(seen.has(cursor.id))return 'ไม่สามารถอ้างอิงงานวนกลับได้';seen.add(cursor.id);cursor=db.events.find(event=>event.id===cursor.rescheduledFrom)}
 return '';
}
function eventRescheduleCopy(event){
 if(typeof db==='undefined')return '';
 const parent=db.events.find(item=>item.id===event?.rescheduledFrom),next=eventReplacement(event);
 const link=(item,label,showDate=true)=>`<button type="button" class="event-ref-link" data-event-ref="${statusSourceEscape(item.id)}" onclick="event.stopPropagation();closeModal();showEvent(this.dataset.eventRef)">${label}${showDate?' '+statusSourceEscape(item.date):''}</button>`;
 return (parent?`<span class="event-rescheduled-from">เลื่อนมาจากวันที่ <b>${statusSourceEscape(eventReferenceDate(parent.date))}</b></span>${eventStatusAnnouncement(parent)}`:'')+(next?'<span class="event-reschedule-confirmed">'+link(next,'กำหนดการใหม่ยืนยันแล้ว',false)+'</span>':'');
}
function eventReferenceField(event={}){
 const options=db.events.filter(item=>item.id!==event.id&&item.eventStatus==='postponed'&&(!eventReplacement(item)||eventReplacement(item)?.id===event.id));
 return `<div class="field full"><label for="event-reference">Ref งานเดิมที่เลื่อน</label><select id="event-reference" name="rescheduledFrom"><option value="">ไม่อ้างอิงงานเดิม</option>${options.map(item=>`<option value="${statusSourceEscape(item.id)}" ${event.rescheduledFrom===item.id?'selected':''}>${statusSourceEscape(item.date)} · ${statusSourceEscape(item.title)}</option>`).join('')}</select></div>`;
}

function eventPublicVisible(event){return !eventReplacement(event)}
function eventReferenceDate(value){const [year,month,day]=String(value||'').split('-');const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return months[Number(month)-1]?`${months[Number(month)-1]} ${Number(day)}, ${year}`:String(value||'')}
