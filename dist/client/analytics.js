(function (root) {
  'use strict';
  const PAGES = {home:'Home',schedule:'Schedule',series:'Series',projects:'Projects',presenters:'Presenters',awards:'Awards',artists:'Artists'};
  const validId = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
  function pageKey(hash) {
    const route = String(hash || '').replace(/^#/, '') || 'home';
    if (Object.hasOwn(PAGES, route)) return route;
    if (route.startsWith('series/')) return 'series';
    if (route.startsWith('project/')) return 'projects';
    if (route.startsWith('artist/') || /^\/(AUAU|SAVE|AUAUSAVE|MHIIPREAW)$/i.test(route)) return 'artists';
    return null;
  }
  function monthInfo(month, now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const value = type => parts.find(p => p.type === type).value;
    const currentMonth = `${value('year')}-${value('month')}`;
    month = month || currentMonth;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < '2020-01' || month > currentMonth) throw new Error('กรุณาเลือกเดือนตั้งแต่ปี 2020 ถึงเดือนปัจจุบัน');
    const [year, m] = month.split('-').map(Number);
    return {month,currentMonth,days:month === currentMonth ? Number(value('day')) : new Date(Date.UTC(year,m,0)).getUTCDate(),label:new Intl.DateTimeFormat('th-TH-u-ca-gregory',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,m-1,1)))};
  }
  function createTracker({hostname,storage,uuid,send}) {
    let lastRoute, visitor;
    return {async visit(hash, isAdmin = false) {
      const route = String(hash || '#home');
      if (route === lastRoute) return;
      lastRoute = route;
      const page = pageKey(route);
      if (!page || isAdmin || !['auausaveth.com','www.auausaveth.com'].includes(hostname)) return;
      try {
        if (!visitor) {
          try {visitor = storage?.getItem('auausave-analytics-visitor-v1');} catch (_) {}
          if (!validId(visitor)) {visitor = uuid();try {storage?.setItem('auausave-analytics-visitor-v1',visitor);} catch (_) {}}
        }
        await send({page,visitorId:visitor,eventId:uuid()});
      } catch (_) { /* Analytics must never interrupt navigation. */ }
    }};
  }
  const api = {pageKey,monthInfo,createTracker,PAGES};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document) return;
  root.Analytics = api;
  const number = value => Number(value || 0).toLocaleString('en-US');
  let selectedMonth = monthInfo().month;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  api.render = function (sidebar) {
    root.document.getElementById('app').innerHTML = `<div class="admin"><div class="admin-shell">${sidebar}<main class="admin-main analytics-main"><div class="admin-top analytics-heading"><div><small>WEBSITE INSIGHTS</small><h1>Analytics</h1><p>ดูภาพรวมคนเข้าเว็บ และเมนูที่แฟน ๆ เปิดดู</p></div><label class="analytics-month">เลือกเดือน<input type="month" min="2020-01" max="${monthInfo().month}" value="${selectedMonth}" onchange="Analytics.selectMonth(this.value)"></label></div><div class="analytics-results" aria-live="polite" aria-busy="true"></div><p class="analytics-footnote">ผู้เข้าชมเป็นจำนวนโดยประมาณตามเบราว์เซอร์และอุปกรณ์ · ไม่นับหน้าหลังบ้านและการเข้าจาก localhost<br>คนเดิมอาจดูหลายเมนู ยอดผู้เข้าชมแต่ละเมนูจึงนำมาบวกเป็นยอดรวมไม่ได้ · เวลาไทย (UTC+7)</p></main></div></div>`;
    api.refresh();
  };
  api.selectMonth = function (value) {
    try {monthInfo(value);selectedMonth=value;} catch (_) {
      const input=root.document.querySelector('.analytics-month input');if(input)input.value=selectedMonth;return;
    }
    api.refresh();
  };
  let request = 0;
  api.refresh = async function () {
    const id = ++request, month = selectedMonth;
    const target = root.document.querySelector('.analytics-results');
    if (!target) return;
    target.setAttribute('aria-busy','true');
    target.innerHTML = '<section class="analytics-state" role="status"><h2>กำลังโหลดสถิติ...</h2><p>กำลังสรุปยอดผู้เข้าชมของเดือนที่เลือก</p></section>';
    try {
      const client = root.auausaveDB?.client;
      if (!client) throw Error('ยังเชื่อมต่อฐานข้อมูลไม่ได้');
      const {data,error} = await client.rpc('analytics_monthly_report',{p_month:month+'-01'});
      if (id !== request || !target.isConnected) return;
      if (error) throw error;
      if (!data || !Array.isArray(data.pages) || !Array.isArray(data.daily)) throw Error('รูปแบบข้อมูลสถิติไม่ถูกต้อง');
      target.innerHTML = reportMarkup(data,month);
    } catch (error) {
      if (id !== request || !target.isConnected) return;
      const denied=error.code==='42501';
      const missing=['PGRST202','42883'].includes(error.code);
      target.innerHTML = `<section class="analytics-state" role="alert"><h2>${denied?'บัญชีนี้ยังไม่มีสิทธิ์ดูสถิติ':missing?'ระบบสถิติยังไม่พร้อม':'โหลดสถิติไม่สำเร็จ'}</h2><p>${denied?'กรุณาติดต่อผู้ดูแลเพื่อเพิ่มสิทธิ์ Analytics':missing?'กรุณาติดตั้งฐานข้อมูล Analytics ก่อนเริ่มใช้งาน':'ตรวจสอบการเชื่อมต่อ แล้วลองโหลดอีกครั้ง'}</p><button class="btn outline" onclick="Analytics.refresh()">ลองอีกครั้ง</button></section>`;
    } finally {if(id === request && target.isConnected)target.setAttribute('aria-busy','false');}
  };
  function reportMarkup(data, month) {
    const info = monthInfo(month);
    const pages = Object.entries(PAGES).map(([page,label]) => ({page,label,...(data.pages.find(p=>p.page===page)||{visitors:0,views:0})})).sort((a,b)=>b.visitors-a.visitors || b.views-a.views);
    const best = pages.find(p=>p.page!=='home' && Number(p.visitors)>0);
    const daily = Array.from({length:info.days},(_,i)=>({day:i+1,visitors:Number(data.daily.find(d=>Number(d.day)===i+1)?.visitors)||0}));
    const max = Math.max(1,...daily.map(d=>d.visitors));
    const ceiling = Math.ceil(max/4)*4;
    const started = data.startedAt ? new Intl.DateTimeFormat('th-TH-u-ca-gregory',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric'}).format(new Date(data.startedAt)) : '';
    const empty = Number(data.views) === 0;
    return `${started?`<p class="analytics-period">เริ่มเก็บข้อมูล ${escape(started)} · แสดงวันที่ 1–${info.days} ${escape(info.label)}</p>`:''}<div class="analytics-stats"><article><span>ผู้เข้าชม</span><strong>${number(data.visitors)}</strong><small>คนไม่ซ้ำโดยประมาณ</small></article><article><span>จำนวนครั้งที่เปิดดู</span><strong>${number(data.views)}</strong><small>นับรวมการเปิดซ้ำ</small></article><article><span>เมนูที่มีคนดูมากที่สุด</span><strong>${best?escape(best.label):'—'}</strong><small>${best?`${number(best.visitors)} คน · ${number(best.views)} ครั้ง`:'ยังไม่มีข้อมูล'} · ไม่รวม Home</small></article></div>${empty?'<div class="analytics-empty" role="status"><strong>ยังไม่มีผู้เข้าชมในเดือนนี้</strong><span>สถิติจะแสดงเมื่อมีผู้เข้าชมเว็บจริงหลังเริ่มเก็บข้อมูล</span></div>':''}<section class="analytics-panel"><div class="analytics-panel-head"><div><h2>ผู้เข้าชมรายวัน</h2><p>1–${info.days} ${escape(info.label)}</p></div><span class="analytics-legend">ผู้เข้าชม (คน)</span></div><div class="analytics-chart"><div class="analytics-yaxis"><span>${number(ceiling)}</span><span>${number(ceiling/2)}</span><span>0</span></div><div class="analytics-bars" style="--days:${info.days}" aria-label="ผู้เข้าชมรายวัน ${escape(info.label)}">${daily.map(d=>`<div class="analytics-day"><div class="analytics-bar-space"><div class="analytics-bar" tabindex="0" role="img" aria-label="วันที่ ${d.day}: ${number(d.visitors)} คน" style="height:${d.visitors/ceiling*100}%" data-tooltip="${d.day} ${escape(info.label)}: ${number(d.visitors)} คน"></div></div><span>${d.day===1||d.day===info.days||d.day%5===0?d.day:''}</span></div>`).join('')}</div></div></section><section class="analytics-panel"><div class="analytics-panel-head"><h2>แยกตามเมนู</h2><p>เรียงตามจำนวนผู้เข้าชม</p></div><div class="analytics-table-scroll"><table class="analytics-table"><caption class="analytics-sr-only">ยอดผู้เข้าชมและครั้งที่เปิดดูแยกตามเมนู ${escape(info.label)}</caption><thead><tr><th scope="col">เมนู / หน้า</th><th scope="col">ผู้เข้าชม (คน)</th><th scope="col">เปิดดู (ครั้ง)</th></tr></thead><tbody>${pages.map(p=>`<tr><th scope="row">${escape(p.label)}</th><td>${number(p.visitors)}</td><td>${number(p.views)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  api.reportMarkup=reportMarkup;
  root.addEventListener('DOMContentLoaded', () => {
    let storage;try {storage=root.localStorage;} catch (_) {}
    const tracker=createTracker({hostname:root.location.hostname,storage,uuid:()=>root.crypto.randomUUID(),send:async e=>{
      const client=root.auausaveDB?.client;if(!client)return;
      const {data}=await client.auth.getSession();if(data?.session)return;
      const result=await client.rpc('analytics_record_view',{p_event_id:e.eventId,p_visitor_id:e.visitorId,p_page:e.page});
      if(result.error)throw result.error;
    }});
    // Called after the public router, not during data hydration or rerendering.
    const visit=()=>tracker.visit(root.location.hash);
    root.addEventListener('hashchange',visit);
    visit();
  });
})(typeof window !== 'undefined' ? window : globalThis);
