const seed = window.AUAUSAVE_DATA.seed;

seed.events = [
  ...new Map(
    seed.events.map((e) => [
      `${e.date}|${e.title.toLowerCase().replace(/\s+/g, " ")}`,
      e,
    ]),
  ).values(),
];
let db =
  JSON.parse(localStorage.getItem("auausave-house-db-v9") || "null") ||
  structuredClone(seed);
const ARTIST_ID_ALIASES = window.AUAUSAVE_DATA.ARTIST_ID_ALIASES;
function canonicalArtistId(id) {
  return ARTIST_ID_ALIASES[String(id || '')] || String(id || '');
}
function sameArtistId(a, b) {
  return canonicalArtistId(a) === canonicalArtistId(b);
}
function artistById(id) {
  const target = canonicalArtistId(id);
  return db.artists.find(artist => canonicalArtistId(artist.id) === target);
}
function sortedArtists() {
  return [...db.artists].sort((a, b) =>
    canonicalArtistId(a.id).localeCompare(canonicalArtistId(b.id), undefined, { numeric: true, sensitivity: 'base' })
  );
}
db.masterData ||= {
  types: [
    { id: "event", label: "Event" },
    { id: "live", label: "Live" },
    { id: "series", label: "Series" },
    { id: "private", label: "Private" },
    { id: "other", label: "Other" },
  ],
  series: [
    { id: "yoursky", label: "YourSkySeries" },
    { id: "fanboy", label: "Mr.Fanboy Series" },
  ],
};
if (!db.masterData.types.some(type => type.id === 'dexx')) db.masterData.types.push({ id: 'dexx', label: 'DEXX' });
function eventTypeValues(value) {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  return String(value || '').split(/\s*(?:\||,|·|•|\/)\s*/).map(item => item.trim()).filter(Boolean);
}
function eventHasType(event, typeId) {
  if (typeId === 'all') return true;
  const master = db.masterData.types.find(type => type.id.toLowerCase() === String(typeId).toLowerCase());
  const accepted = [typeId, master?.label].filter(Boolean).map(value => String(value).toLowerCase());
  return eventTypeValues(event?.type).some(value => accepted.includes(value.toLowerCase()));
}
function ensureDexxEventType() {
  db.masterData ||= { types: [], series: [] };
  if (!db.masterData.types.some(type => type.id === 'dexx')) db.masterData.types.push({ id: 'dexx', label: 'DEXX' });
}
function sortedEventTypesForSummary() {
  const order = ["event", "live", "series", "private", "concert", "dexx"];
  return [...(db.masterData?.types || [])].sort((a, b) => {
    const aid = String(a.id || "").toLowerCase();
    const bid = String(b.id || "").toLowerCase();
    if (aid === "other" && bid !== "other") return 1;
    if (bid === "other" && aid !== "other") return -1;
    const ai = order.indexOf(aid);
    const bi = order.indexOf(bid);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return String(a.label || a.id).localeCompare(String(b.label || b.id), undefined, { sensitivity: "base" });
  });
}
function migrateArtistId(oldId,newId){
  if(!oldId||!newId||oldId===newId)return;
  const replaceDeep=value=>{
    if(value===oldId)return newId;
    if(Array.isArray(value))return value.map(replaceDeep);
    if(value&&typeof value==='object'){
      return Object.entries(value).reduce((result,[key,item])=>{
        const nextKey=key===oldId?newId:key,nextValue=replaceDeep(item);
        if(nextKey in result&&result[nextKey]&&typeof result[nextKey]==='object'&&nextValue&&typeof nextValue==='object'&&!Array.isArray(result[nextKey])&&!Array.isArray(nextValue)) result[nextKey]={...result[nextKey],...nextValue};
        else result[nextKey]=nextValue;
        return result;
      },{});
    }
    return value;
  };
  const oldArtist=db.artists.find(artist=>artist.id===oldId),newArtist=db.artists.find(artist=>artist.id===newId);
  if(oldArtist&&newArtist)Object.assign(newArtist,{...oldArtist,id:newId,...newArtist});
  else if(oldArtist)oldArtist.id=newId;
  db.artists=db.artists.filter((artist,index,self)=>self.findIndex(item=>item.id===artist.id)===index);
  ['events','awards','presenters','videos'].forEach(table=>{
    (db[table]||[]).forEach(item=>{
      if(item.artistId===oldId)item.artistId=newId;
      if(Array.isArray(item.artistIds))item.artistIds=[...new Set(item.artistIds.map(id=>id===oldId?newId:id))];
      else if(typeof item.artistIds==='string'&&item.artistIds.includes(oldId))item.artistIds=item.artistIds.replaceAll(oldId,newId);
    });
  });
  db.siteSettings=replaceDeep(db.siteSettings||{});
}
migrateArtistId('a1783509325576','AT04');
migrateArtistId('mp','AT04');
migrateArtistId('duo','AT01');
migrateArtistId('auau','AT02');
migrateArtistId('save','AT03');
db.siteSettings ||= { heroImage: "", heroFit: "cover", heroPosition: "center" };
db.siteSettings.homeSections ||= [
  {id:'hero',label:'Hero หน้าหลัก',eyebrow:'AuauSave fanbase · บ้านของอู่อู๋เซฟ',title:'OUR HOUSE.\nOUR STORY.',description:'บ้านแฟนคลับของอู่อู๋เซฟ พื้นที่เก็บทุกโมเมนต์ของ #AuauSave',visible:true},
  {id:'paths',label:'เลือกพาส',eyebrow:'Two paths · One house',title:'เลือกพาสที่อยากติดตาม',description:'ทุกเรื่องราวถูกจัดไว้อย่างชัดเจน ทั้งโมเมนต์คู่และเส้นทางเดี่ยวของทั้งสองคน',visible:true},
  {id:'schedule',label:'ตารางงานเดือนนี้',eyebrow:'This month',title:'ตารางงานเดือนนี้',description:'ติดตามตารางงานคู่และงานเดี่ยว',visible:true},
  {id:'artists',label:'ศิลปิน',eyebrow:'AuauSave house',title:'คู่และเดี่ยวในบ้านเดียวกัน',description:'',visible:true},
  {id:'youtube',label:'YouTube',eyebrow:'Watch & remember',title:'AuauSave on YouTube',description:'',visible:true},
  {id:'presenters',label:'พรีเซนเตอร์',eyebrow:'Brand & Partnership',title:'Our Presenters',description:'',visible:true}
];
const DEFAULT_HOME_SECTIONS = db.siteSettings.homeSections.map(section => ({...section}));
function ensureHomePageSettings() {
  db.siteSettings ||= { heroImage: "", heroFit: "cover", heroPosition: "center" };
  db.siteSettings.personalProfiles ||= {};
  db.siteSettings.presenterDates ||= {};
  db.siteSettings.awardDates ||= {};
  ['AT02','AT03'].forEach(id => {
    db.siteSettings.personalProfiles[id] = {
      zodiac: '', chineseZodiac: '', bloodType: '', education: '', height: '', weight: '',
      sizing: '', bust: '', waist: '', shirtTops: '', shoe: '', wristSize: '',
      fingerLeftT: '', fingerLeftI: '', fingerLeftM: '', fingerLeftR: '', fingerLeftL: '',
      fingerRightT: '', fingerRightI: '', fingerRightM: '', fingerRightR: '', fingerRightL: '',
      favorites: '', motto: '',
      ...(db.siteSettings.personalProfiles[id] || {}),
    };
  });
  const current = Array.isArray(db.siteSettings.homeSections) ? db.siteSettings.homeSections : [];
  const known = new Set(current.map(section => section.id));
  db.siteSettings.homeSections = [
    ...current.map(section => ({
      ...DEFAULT_HOME_SECTIONS.find(item => item.id === section.id),
      ...section,
    })),
    ...DEFAULT_HOME_SECTIONS.filter(section => !known.has(section.id)).map(section => ({...section})),
  ].filter(section => !['paths','youtube'].includes(section.id));
  if (!db.siteSettings.homeSections.some(section=>section.id==='timeline')) db.siteSettings.homeSections.push({id:'timeline',label:'Timeline AUAUSAVE',eyebrow:'AUAUSAVE TIMELINE',title:'Our Timeline',description:'Series, variety shows and music videos featuring AUAUSAVE.',visible:true});
  db.siteSettings.timelineCategoryContent ||= {
    series:{title:'Series',description:''},
    variety:{title:'Variety Show',description:''},
    'music-video':{title:'Music Video',description:''},
  };
  db.siteSettings.timelineGroups ||= {variety:[],'music-video':[]};
  db.siteSettings.timelineGroups.variety ||= [];
  db.siteSettings.timelineGroups['music-video'] ||= [];
  [...db.siteSettings.timelineGroups.variety,...db.siteSettings.timelineGroups['music-video']].forEach(group=>{
    if(Array.isArray(group.visibleArtistIds)&&group.visibleArtistIds.length){group.visibleArtistIds=[...new Set(group.visibleArtistIds.map(canonicalArtistId))];return;}
    const title=String(group.title||'').toUpperCase();
    group.visibleArtistIds=title.includes('AUAUSAVE')?['AT01','AT02','AT03']:title.includes('AUAU')?['AT02']:title.includes('SAVE')?['AT03']:sortedArtists().map(artist=>artist.id);
  });
}
const DEFAULT_PAGE_CONTENT = window.AUAUSAVE_DATA.DEFAULT_PAGE_CONTENT;
const DEFAULT_HOME_CARDS = window.AUAUSAVE_DATA.DEFAULT_HOME_CARDS;
const DEFAULT_YOUTUBE_CATEGORIES = window.AUAUSAVE_DATA.DEFAULT_YOUTUBE_CATEGORIES;
let currentLanguage = 'en';
localStorage.setItem('auausave-language', 'en');
function ensureLocalizationSettings() {
  db.siteSettings ||= {};
  db.siteSettings.pageContent ||= {};
  Object.entries(DEFAULT_PAGE_CONTENT).forEach(([page, languages]) => {
    db.siteSettings.pageContent[page] ||= {};
    ['th','en'].forEach(language => {
      db.siteSettings.pageContent[page][language] = {...languages[language], ...(db.siteSettings.pageContent[page][language] || {})};
    });
  });
  db.siteSettings.homeCards ||= {};
  Object.entries(DEFAULT_HOME_CARDS).forEach(([id, card]) => {
    db.siteSettings.homeCards[id] = {...card, ...(db.siteSettings.homeCards[id] || {})};
  });
  if (!Array.isArray(db.siteSettings.youtubeCategories) || !db.siteSettings.youtubeCategories.length) {
    db.siteSettings.youtubeCategories = DEFAULT_YOUTUBE_CATEGORIES.map(category => ({...category}));
  }
  db.siteSettings.artistArchive ||= {};
  db.artists.forEach(artist => {
    db.siteSettings.artistArchive[artist.id] ||= {};
    const archive = db.siteSettings.artistArchive[artist.id];
    archive.series ||= [];
    archive.projects ||= [];
    archive.gallery ||= [];
    archive.visibility = {series:true,projects:true,events:true,awards:true,gallery:true,...(archive.visibility||{})};
    archive.sectionOrder = Array.isArray(archive.sectionOrder) ? archive.sectionOrder.filter(item=>['timeline','events','awards'].includes(item)) : ['timeline','events','awards'];
    ['timeline','events','awards'].forEach(item=>{if(!archive.sectionOrder.includes(item))archive.sectionOrder.push(item);});
  });
  if (!Array.isArray(db.siteSettings.timeline)) {
    const merged = new Map();
    db.artists.forEach(artist => db.siteSettings.artistArchive[artist.id].series.forEach(item => {
      const key = `${item.seriesId||item.title}|${item.year||''}|${item.poster||''}`;
      if (!merged.has(key)) merged.set(key,{...item,id:`timeline_${Date.now()}_${merged.size}`,artistIds:[]});
      const entry = merged.get(key); if (!entry.artistIds.includes(artist.id)) entry.artistIds.push(artist.id);
    }));
    db.siteSettings.timeline = [...merged.values()];
  }
  db.siteSettings.timelineVisibility = {series:true,variety:true,'music-video':true,...(db.siteSettings.timelineVisibility||{})};
}
ensureLocalizationSettings();
function setLanguage(language) {
  currentLanguage = 'en';
  localStorage.setItem('auausave-language', 'en');
  if (location.hash === '#admin' && adminAuthenticated) admin();
  else router();
}
function pageText(page) {
  ensureLocalizationSettings();
  return db.siteSettings.pageContent[page]?.[currentLanguage] || DEFAULT_PAGE_CONTENT[page]?.[currentLanguage];
}
db.events.forEach((e) => {
  if (!e.seriesId) {
    const t = e.title.toLowerCase();
    e.seriesId =
      t.includes("your sky") || t.includes("yoursky")
        ? "yoursky"
        : t.includes("fanboy")
          ? "fanboy"
          : "";
  }
});
let route = location.hash.slice(1) || "home";
const app = document.querySelector("#app");
let databaseSyncQueue = Promise.resolve();
function updateDatabaseStatusUi(message, connected) {
  adminDatabaseStatus = message;
  const status = document.querySelector('.admin-db-status');
  if (!status) return;
  status.classList.toggle('is-connected', Boolean(connected));
  status.classList.toggle('has-error', !connected);
  const text = [...status.childNodes].find(node => node.nodeType === 3);
  if (text) text.nodeValue = message;
}
const save = (sync = true) => {
  try {
    localStorage.setItem("auausave-house-db-v9", JSON.stringify(db));
    if (sync) syncDatabaseInBackground();
    return true;
  } catch (error) {
    // Base64 media can exceed the browser's small localStorage quota. Keep it
    // in memory and upload directly to Supabase; only the resulting URLs are
    // written back to localStorage after synchronization.
    if (error?.name === 'QuotaExceededError' || error?.code === 22) {
      updateDatabaseStatusUi('พื้นที่บนเบราว์เซอร์เต็ม กำลังอัปโหลดไฟล์ขึ้น Supabase...', false);
      if (sync) syncDatabaseInBackground();
      return true;
    }
    alert(`บันทึกบนเบราว์เซอร์ไม่สำเร็จ: ${error.message}`);
    return false;
  }
};
function applySyncedMediaUrls(synced, snapshot) {
  if (!synced) return;
  const mediaFields = {artists:['image'],events:['poster'],awards:['image'],presenters:['logo','announcementImage','announcementVideo'],videos:['thumbnail']};
  Object.entries(mediaFields).forEach(([table,fields]) => {
    (synced[table] || []).forEach(remoteItem => {
      const localItem = (db[table] || []).find(item => item.id === remoteItem.id);
      const snapshotItem = (snapshot?.[table] || []).find(item => item.id === remoteItem.id);
      if (!localItem) return;
      fields.forEach(field => {
        const original = snapshotItem?.[field];
        if (original && String(original).startsWith('data:') && localItem[field] === original && remoteItem[field] && !String(remoteItem[field]).startsWith('data:')) localItem[field] = remoteItem[field];
      });
    });
  });
  const applyUploadedSettingsMedia = (current, remote, original) => {
    if (typeof original === 'string' && original.startsWith('data:')) return current === original && typeof remote === 'string' && !remote.startsWith('data:') ? remote : current;
    if (typeof original === 'string' && original.includes('/storage/v1/object/public/media/') && current === original && typeof remote === 'string' && remote.includes('/storage/v1/object/public/media/')) return remote;
    if (Array.isArray(current) && Array.isArray(original)) return current.map((value,index)=>{
      const originalIndex = value && typeof value === 'object' && value.id
        ? original.findIndex(item => item && typeof item === 'object' && item.id === value.id)
        : index;
      if (originalIndex < 0) return value;
      return applyUploadedSettingsMedia(value,remote?.[originalIndex],original[originalIndex]);
    });
    if (current && typeof current === 'object' && original && typeof original === 'object') {
      const result = {...current};
      Object.keys(original).forEach(key => { if (key in result) result[key] = applyUploadedSettingsMedia(result[key],remote?.[key],original[key]); });
      return result;
    }
    return current;
  };
  db.siteSettings = applyUploadedSettingsMedia(db.siteSettings, synced.siteSettings, snapshot?.siteSettings);
  try { localStorage.setItem("auausave-house-db-v9", JSON.stringify(db)); } catch (error) { console.warn('Local cache:', error.message); }
}
async function syncDatabaseInBackground() {
  if (!window.auausaveDB) return;
  try {
    const { data } = await window.auausaveDB.session();
    if (data.session) {
      updateDatabaseStatusUi('กำลังบันทึกลง Supabase...', false);
      const snapshot = structuredClone(db);
      databaseSyncQueue = databaseSyncQueue.catch(() => {}).then(() => window.auausaveDB.save(snapshot));
      const synced = await databaseSyncQueue;
      applySyncedMediaUrls(synced, snapshot);
      adminDatabaseLoaded = true;
      updateDatabaseStatusUi('บันทึกลง Supabase แล้ว', true);
      return true;
    }
    return true;
  } catch (error) {
    console.warn("Supabase sync:", error.message);
    adminDatabaseLoaded = false;
    updateDatabaseStatusUi(`บันทึกไม่สำเร็จ: ${error.message}`, false);
    toast(`บันทึกบนเครื่องแล้ว แต่ส่งขึ้น Supabase ไม่สำเร็จ: ${error.message}`);
    return false;
  }
}
const artistName = (id) =>
  artistById(id)?.name || artistById(id)?.nickname || "ไม่ระบุ";
const versionedMediaUrl = (url, version = '') => {
  if (!url || String(url).startsWith('data:')) return url || '';
  const token = encodeURIComponent(version || 'current');
  return `${url}${String(url).includes('?') ? '&' : '?'}displayVersion=${token}`;
};
const timelineDateLabel = item => {
  const day = Number(item?.day), monthNumber = Number(item?.month), year = item?.year ? String(item.year) : '';
  const monthLabel = monthNumber >= 1 && monthNumber <= 12 ? new Intl.DateTimeFormat('en-US',{month:'short'}).format(new Date(2000,monthNumber-1,1)) : '';
  return [day >= 1 && day <= 31 ? String(day) : '',monthLabel,year].filter(Boolean).join(' ') || (item?.upcoming ? 'UPCOMING' : 'TBA');
};
let itemMatchesArtist = (item, artistId) => {
  artistId = canonicalArtistId(artistId);
  const itemId = canonicalArtistId(item?.artistId);
  return itemId === artistId;
};
const fmtDate = (d) =>
  new Intl.DateTimeFormat(route === "admin" ? "th-TH" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
const month = (d) =>
  new Intl.DateTimeFormat("en-US", { month: "short" })
    .format(new Date(d))
    .toUpperCase();
const day = (d) => new Date(d).getDate().toString().padStart(2, "0");
function toast(msg) {
  const t = document.querySelector("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}
function nav(active = "") {
return `<nav class="nav"><div class="container nav-inner">
  <a href="#home" class="brand"><i></i>AUAUSAVE HOUSE</a>
  <div class="links">
    <a class="${active === "artists" ? "active" : ""}" href="#artists">AuauSave</a>
    <a class="${active === "schedule" ? "active" : ""}" href="#schedule">Schedule</a>
    <a class="${active === "presenters" ? "active" : ""}" href="#presenters">Presenters</a>
    <a class="${active === "awards" ? "active" : ""}" href="#awards">Awards</a>
    <a class="${active === "videos" ? "active" : ""}" href="#videos">YouTube</a>
  </div>
  <button class="menu-btn" onclick="document.querySelector('.links').style.display=document.querySelector('.links').style.display==='flex'?'none':'flex'">☰</button>
</div></nav>`;
}
const renderNavBeforeLanguages = nav;
nav = function (active = '') {
  return renderNavBeforeLanguages(active);
};
function footer() {
  return `<footer class="footer"><div class="container"><span class="eyebrow">The artist community</span><h2>KEEP THE<br>MEMORIES CLOSE.</h2><div class="creator-credit"><span>เว็บไซต์นี้สร้างโดย</span><div class="creator-links"><a href="https://x.com/AuauSaveHouseTH" target="_blank" rel="noopener noreferrer">@AuauSaveHouseTH <b>↗</b></a><a href="https://x.com/AUAUTNPOFC" target="_blank" rel="noopener noreferrer">@AUAUTNPOFC <b>↗</b></a><a href="https://x.com/SAVEWRG_OFC" target="_blank" rel="noopener noreferrer">@SAVEWRG_OFC <b>↗</b></a></div></div><div class="footer-row"><span>© 2026 AUAUSAVE HOUSE</span><span>MADE FOR EVERY FAN ♡</span></div></div></footer>`;
}
function artistCards() {
  return `<div class="artists">${sortedArtists().map((a) => `<article class="artist-card" onclick="location.hash='artist/${a.id}'"><div class="portrait" style="background:${a.color}">${a.image ? `<img src="${a.image}" alt="${a.name}">` : `<span>${a.initial}</span>`}<small class="tag">${sameArtistId(a.id,"duo") ? "COUPLE PATH" : "SOLO PATH"}</small></div><div class="artist-meta"><span class="arrow">↗</span><h3>${a.name}</h3><p>${a.role}</p></div></article>`).join("")}</div>`;
}
function scheduleRows(items = db.events) {
  return items.length
    ? items
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(
          (e) =>
            `<div class="schedule-row"><div class="date-box"><strong>${day(e.date)}</strong><span>${month(e.date)} ${new Date(e.date).getFullYear()}</span></div><div><h3>${e.title}</h3><p>${artistName(e.artistId)} · ${e.place}</p></div><span class="event-type">${e.type}</span>${e.source ? `<a class="round-arrow" href="${e.source}" target="_blank" title="ดูต้นทาง">↗</a>` : "<span></span>"}</div>`,
        )
        .join("")
    : `<div class="empty">ยังไม่มีข้อมูลในขณะนี้</div>`;
}
function videos(items = db.videos) {
  if (!items.length) return '<div class="empty">ยังไม่มีวิดีโอ</div>';
  const thumb = (v) =>
    `<div class="thumb" style="background:${v.color}">${v.thumbnail ? `<img src="${v.thumbnail}" alt="${v.title}">` : ""}<span class="play">▶</span></div>`;
  return `<div class="youtube-grid"><article class="video"><a href="${items[0].url}" target="_blank">${thumb(items[0])}</a><div class="video-info"><h3>${items[0].title}</h3><p>${artistName(items[0].artistId)} · ${items[0].views}</p></div></article><div class="video-stack">${items
    .slice(1)
    .map(
      (v) =>
        `<article class="video"><a href="${v.url}" target="_blank">${thumb(v)}</a><div class="video-info"><h3>${v.title}</h3><p>${artistName(v.artistId)}<br>${v.views}</p></div></article>`,
    )
    .join("")}</div></div>`;
}
function home() {
  app.innerHTML =
    nav() +
    `<main><section class="hero"><div class="container hero-grid"><div><span class="eyebrow">AuauSave fanbase · บ้านของอู่อู๋เซฟ</span><h1>OUR HOUSE.<br>OUR STORY.</h1><p>บ้านแฟนคลับของอู่อู๋เซฟ พื้นที่เก็บทุกโมเมนต์ของ <b>#AuauSave</b> พร้อมติดตามผลงานเดี่ยว ตารางงาน และความสำเร็จของอู่อู๋และเซฟ</p><a class="scroll" href="#artists"><span>↓</span> CHOOSE YOUR PATH</a></div><div class="hero-art"><div class="orbit"></div></div></div></section><section class="section path-section"><div class="container"><div class="section-head"><div><span class="eyebrow">Two paths · One house</span><h2>เลือกพาสที่อยากติดตาม</h2></div><p>ทุกเรื่องราวถูกจัดไว้อย่างชัดเจน ทั้งโมเมนต์คู่และเส้นทางเดี่ยวของทั้งสองคน</p></div><div class="path-grid"><a href="#artist/duo" class="path-card couple"><span>01 · COUPLE PATH</span><h3>อู่อู๋เซฟ</h3><p>#AuauSave · งานคู่ · รางวัลคู่ · โมเมนต์ของเรา</p><b>เข้าสู่พาสคู่ ↗</b></a><div class="path-card solo"><span>02 · SOLO PATH</span><h3>เส้นทางเดี่ยว</h3><p>แยกติดตามงานและรางวัลเดี่ยวของแต่ละคน</p><div class="solo-links"><a href="#artist/auau">AUAU ↗</a><a href="#artist/save">SAVE ↗</a></div></div></div></div></section><section class="section" id="featured"><div class="container"><div class="section-head"><div><span class="eyebrow">AuauSave house</span><h2>คู่และเดี่ยวในบ้านเดียวกัน</h2></div><a class="btn outline" href="#artists">ดูทั้งหมด ↗</a></div>${artistCards()}</div></section><section class="section"><div class="container schedule-wrap"><div class="section-head"><div><span class="eyebrow" style="color:var(--yellow)">Upcoming</span><h2>ตารางงานเร็วๆ นี้</h2></div><a class="btn light" href="#schedule">ดูตารางทั้งหมด</a></div>${scheduleRows(db.events.slice(0, 3))}</div></section><section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Watch & remember</span><h2>AuauSave on YouTube</h2></div><a class="btn outline" href="#videos">ดูวิดีโอทั้งหมด ↗</a></div>${videos(db.videos.slice(0, 3))}</div></section></main>` +
    footer();
}
function listing(type) {
  let title, sub, body;
  const today = new Date().toISOString().slice(0, 10);
  if (type === "artists") {
    title = "ศิลปินของเรา";
    sub = "ทำความรู้จักอู่อู๋เซฟ ทั้งพาสคู่และพาสเดี่ยว";
    body = artistCards();
  }
  if (type === "schedule") {
    title = "ตารางงาน";
    sub = "ไม่พลาดทุกเวทีและทุกช่วงเวลาสำคัญ";
    const upcoming = db.events.filter((e) => e.date >= today),
      past = db.events.filter((e) => e.date < today);
    body = `<div class="schedule-wrap"><span class="eyebrow" style="color:var(--yellow)">Upcoming schedule</span>${scheduleRows(upcoming)}</div><h2 style="margin-top:55px">งานที่ผ่านมา</h2><div class="schedule-wrap archive-schedule">${scheduleRows(past)}</div>`;
  }
  if (type === "awards") {
    title = "รางวัล";
    sub = "ทุกความสำเร็จที่เราอยากร่วมฉลองไปด้วยกัน";
    body = `<div class="award-grid">${db.awards
      .sort((a, b) => b.year - a.year)
      .map(
        (r) =>
          `<article class="award">${r.image?`<img class="award-image" src="${r.image}" alt="${r.title}">`:''}<div class="year">${awardDisplayDate(r)}</div><span class="eyebrow">${artistName(r.artistId)}</span><h3>${r.title}</h3><p>${r.org}</p>${r.source ? `<a class="source-link" href="${r.source}" target="_blank">ดูข้อมูลต้นทาง ↗</a>` : ""}</article>`,
      )
      .join("")}</div>`;
  }
  if (type === "videos") {
    title = "YouTube";
    sub = "รายการ เบื้องหลัง และช่วงเวลาพิเศษ";
    body = videos(db.videos);
  }
  app.innerHTML =
    nav(type) +
    `<main><section class="page-hero"><div class="container"><span class="eyebrow">AUAUSAVE HOUSE archive</span><h1>${title}</h1><p>${sub}</p></div></section><section class="section" style="padding-top:25px"><div class="container">${body}</div></section></main>` +
    footer();
}
function profile(id) {
  id = canonicalArtistId(id);
  const a = artistById(id);
  if (!a) {
    location.hash = "artists";
    return;
  }
  const now = new Date(),
    currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    ev = db.events.filter((e) => itemMatchesArtist(e, id) && e.date.startsWith(currentMonth)),
    aw = db.awards.filter((r) => itemMatchesArtist(r, id)),
    vid = db.videos.filter((v) => v.artistId === id);
  app.innerHTML =
    nav("artists") +
    `<main><section class="section"><div class="container profile-head"><div class="profile-portrait portrait" style="background:${a.color}"><span>${a.initial}</span></div><div><span class="eyebrow">Artist profile</span><h1 style="font-size:clamp(55px,8vw,100px);line-height:1;margin:10px 0">${a.name}</h1><p style="font-size:18px;line-height:1.8;color:var(--muted)">${a.bio}</p><div class="facts"><div class="fact"><small>ชื่อจริง</small><strong>${a.realName}</strong></div><div class="fact"><small>วันเกิด</small><strong>${a.birth}</strong></div><div class="fact"><small>บทบาท</small><strong>${a.role}</strong></div><div class="fact"><small>ผลงานล่าสุด</small><strong>${vid[0]?.title || "—"}</strong></div></div></div></div></section><section class="section"><div class="container schedule-wrap"><div class="section-head"><div><span class="eyebrow" style="color:var(--yellow)">Upcoming</span><h2>ตารางงานของ ${a.name}</h2></div></div>${scheduleRows(ev)}</div></section><section class="section"><div class="container"><div class="section-head"><h2>รางวัล</h2></div><div class="award-grid">${aw.map((r) => `<article class="award">${r.image?`<img class="award-image" src="${r.image}" alt="${r.title}">`:''}<div class="year">${awardDisplayDate(r)}</div><h3>${r.title}</h3><p>${r.org}</p></article>`).join("") || '<div class="empty">ยังไม่มีข้อมูลรางวัล</div>'}</div></div></section>${vid.length ? `<section class="section"><div class="container"><div class="section-head"><h2>วิดีโอ</h2></div>${videos(vid)}</div></section>` : ""}</main>` +
    footer();
}
let coupleArchiveEventType = 'all';
let coupleArchiveArtist = 'all';
function filterCoupleArchiveEvents(type = coupleArchiveEventType) {
  coupleArchiveEventType = type;
  const from = document.querySelector('#coupleEventFrom')?.value || '';
  const to = document.querySelector('#coupleEventTo')?.value || '';
  document.querySelectorAll('.couple-event-card').forEach(card => {
    const types = (card.dataset.types || '').split('|');
    const date = card.dataset.date || '';
    const artistMatch = coupleArchiveArtist === 'all' || canonicalArtistId(card.dataset.artist) === canonicalArtistId(coupleArchiveArtist);
    card.style.display = artistMatch && (type === 'all' || types.includes(type.toLowerCase())) && (!from || date >= from) && (!to || date <= to) ? '' : 'none';
  });
  document.querySelectorAll('.couple-event-filters:not(.couple-artist-filters) button').forEach(button => button.classList.toggle('active', button.dataset.type === type));
  const count = [...document.querySelectorAll('.couple-event-card')].filter(card => card.style.display !== 'none').length;
  const result = document.querySelector('.couple-event-result');
  if (result) result.textContent = `${count} events found`;
}
function filterCoupleArchiveArtist(artist) {
  coupleArchiveArtist = artist === 'all' ? 'all' : canonicalArtistId(artist);
  document.querySelectorAll('.couple-artist-filters button').forEach(button => button.classList.toggle('active',button.dataset.artist===artist));
  filterCoupleArchiveEvents();
}

function artistSeriesSection(artistId) {
  artistId = canonicalArtistId(artistId);
  const archive = db.siteSettings.artistArchive[artistId];
  if (!archive || archive.visibility?.series === false) return '';
  const allowedArtists=sameArtistId(artistId,'duo')?['AT01']:['AT01',artistId],series = db.siteSettings.timeline.filter(item=>(item.artistIds||[]).some(id=>allowedArtists.includes(canonicalArtistId(id)))).sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0));
  const card = item => {const links=(item.links?.length?item.links:(item.url?[{label:'Open',url:item.url}]:[])).map(link=>typeof link==='string'?{label:'Open',url:link}:link).map(link=>{const text=link.label||link.title||'',url=link.url||link.href||(/^https?:\/\//i.test(text)?text:'');return{label:text&&text!==url?text:'Open',url};}).filter(link=>link.url);const imageOrientation=item.imageOrientation==='landscape'?'landscape':'portrait',posterUrl=versionedMediaUrl(item.poster,item.imageVersion||item.id);return `<article class="filmography-card timeline-image-${imageOrientation} ${item.upcoming?'is-upcoming-card':''}" data-timeline-artists="${escapePageText((item.artistIds||[]).join('|'))}">${item.poster?`<img src="${escapePageText(posterUrl)}" alt="${escapePageText(item.title)}">`:`<div class="filmography-placeholder"><span>${escapePageText(item.title.slice(0,2).toUpperCase())}</span></div>`}${item.upcoming?'<span class="timeline-upcoming-badge">UPCOMING</span>':''}<small>${escapePageText(timelineDateLabel(item))}</small><h3>${escapePageText(item.title)}</h3>${item.description?`<p>${escapePageText(item.description)}</p>`:''}${item.note?`<div class="timeline-note">${escapePageText(item.note)}</div>`:''}${links.length?`<div class="archive-card-links">${links.map(link=>`<a href="${escapePageText(link.url)}" target="_blank" rel="noopener noreferrer">${escapePageText(link.label)} ↗</a>`).join('')}</div>`:''}</article>`;};
  const lane = (title,items,className='',description='',category='series') => {const renderRows=list=>{const group=item=>item.upcoming?'UPCOMING':(item.year||'TBA'),years=[...new Set(list.map(group))];return `<div class="filmography-timeline">${years.map(year=>`<section class="filmography-year-group ${year==='UPCOMING'?'is-upcoming-group':''}"><header><i></i><b>${escapePageText(year)}</b></header><div class="filmography-year-cards">${list.filter(item=>group(item)===year).map(card).join('')}</div></section>`).join('')||'<div class="empty">No items yet.</div>'}</div>`;};const groups=db.siteSettings.timelineGroups?.[category]||[],visibleGroups=groups.filter(group=>!Array.isArray(group.visibleArtistIds)||!group.visibleArtistIds.length||group.visibleArtistIds.map(canonicalArtistId).includes(artistId)),grouped=visibleGroups.map(group=>({group,items:items.filter(item=>item.groupId===group.id)})).filter(entry=>entry.items.length),ungrouped=items.filter(item=>!visibleGroups.some(group=>group.id===item.groupId)),ungroupedContent=ungrouped.length?(category==='music-video'?renderRows(ungrouped):`<section class="timeline-content-group"><div class="timeline-content-group-head"><h4>Other</h4></div>${renderRows(ungrouped)}</section>`):'',body=visibleGroups.length?[...grouped.map(entry=>`<section class="timeline-content-group"><div class="timeline-content-group-head"><h4>${escapePageText(entry.group.title)}</h4>${entry.group.description?`<p>${escapePageText(entry.group.description)}</p>`:''}</div>${renderRows(entry.items)}</section>`),ungroupedContent].join(''):renderRows(items);return `<section class="timeline-subsection ${className}"><div class="timeline-subsection-head"><div><h3>${escapePageText(title)}</h3>${description?`<p>${escapePageText(description)}</p>`:''}</div><span>${items.length} items</span></div>${body}</section>`;};
  const visible=db.siteSettings.timelineVisibility, content=db.siteSettings.timelineCategoryContent||{},regular=[...series].sort((a,b)=>Number(Boolean(b.upcoming))-Number(Boolean(a.upcoming))||((Number(b.year)||0)-(Number(a.year)||0)));
  const filters=sameArtistId(artistId,'duo')?'':`<div class="timeline-artist-filters"><button class="active" onclick="filterArtistTimeline(this,'all')">All</button><button onclick="filterArtistTimeline(this,'AT01')">AUAUSAVE</button><button onclick="filterArtistTimeline(this,'${artistId}')">${escapePageText(artistName(artistId))}</button></div>`;
  return `<section class="section artist-filmography" data-artist-timeline="${artistId}"><div class="container"><div class="filmography-head"><small>OUR TIMELINE</small><h2>Timeline</h2><p>Series, variety shows and music videos of ${escapePageText(artistName(artistId))}</p>${filters}</div>${visible.series!==false?lane(content.series?.title||'Series',regular.filter(item=>(item.category||'series')==='series'),' ',content.series?.description||'','series'):''}${visible.variety!==false?lane(content.variety?.title||'Variety Show',regular.filter(item=>item.category==='variety'),' ',content.variety?.description||'','variety'):''}${visible['music-video']!==false?lane(content['music-video']?.title||'Music Video',regular.filter(item=>item.category==='music-video'),' ',content['music-video']?.description||'','music-video'):''}</div></section>`;
}
function filterArtistTimeline(button,artist){artist=canonicalArtistId(artist);const section=button.closest('.artist-filmography');section.querySelectorAll('.timeline-artist-filters button').forEach(item=>item.classList.toggle('active',item===button));section.querySelectorAll('.filmography-card').forEach(card=>{const ids=(card.dataset.timelineArtists||'').split('|').map(canonicalArtistId);card.style.display=artist==='all'||ids.includes(artist)?'':'none';});section.querySelectorAll('.filmography-year-group,.timeline-content-group,.timeline-subsection').forEach(group=>{group.style.display=[...group.querySelectorAll('.filmography-card')].some(card=>card.style.display!=='none')?'':'none';});}

function coupleArchivePage() {
  const artist = artistById('duo') || {};
  const events = [...db.events].sort((a,b) => a.date.localeCompare(b.date));
  const awards = db.awards.filter(item => itemMatchesArtist(item, 'AT01')).sort((a,b) => Number(b.year)-Number(a.year));
  const now = new Date(), monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, monthEnd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(new Date(now.getFullYear(),now.getMonth()+1,0).getDate()).padStart(2,'0')}`;
  const projects = [];
  const filterTypes = db.masterData.types.filter(type => events.some(event => eventHasType(event,type.id)));
  const media = [
    ...events.filter(item => item.poster || item.source).map(item => ({kind:item.poster?'image':'link',src:item.poster||'',url:item.source||'',title:item.title})),
    ...db.presenters.filter(item => itemMatchesArtist(item, 'AT01') && (item.announcementImage || item.announcementVideo)).map(item => ({kind:item.announcementVideo?'video':'image',src:item.announcementVideo||item.announcementImage,url:item.url||'',title:item.brand})),
  ];
  app.innerHTML = nav('artists') + `<main class="couple-archive"><section class="couple-profile"><div class="container couple-profile-grid"><div class="couple-profile-image" style="background:${artist.color}">${artist.image?`<img src="${artist.image}" alt="AUAUSAVE">`:`<span>AS</span>`}</div><div><span class="eyebrow">COUPLE ARCHIVE</span><h1>AUAUSAVE</h1><p>${artist.bio || 'The shared journey of Auau and Save, collected in one place.'}</p><a class="couple-hashtag" href="https://x.com/hashtag/AuauSave" target="_blank">#AuauSave ↗</a></div></div></section>
  <section class="section archive-projects"><div class="container"><div class="archive-section-head"><span>02</span><div><small>TOGETHER ON SCREEN</small><h2>Series & Projects</h2></div><p>Series, shared projects, promotions and fan projects.</p></div><div class="archive-project-grid">${projects.map(item=>`<article><small>${item.seriesId ? (db.masterData.series.find(series=>series.id===item.seriesId)?.label || 'SERIES') : 'SERIES'}</small><h3>${item.title}</h3><p>${item.place||'AUAUSAVE project'}</p>${item.source?`<a href="${item.source}" target="_blank">View source ↗</a>`:''}</article>`).join('') || '<div class="empty">No series or project information yet.</div>'}</div></div></section>
  <section class="section"><div class="container"><div class="archive-section-head"><span>02</span><div><small>MEET AUAUSAVE</small><h2>Events</h2></div><p>Search couple schedules by date range and event type.</p></div><div class="couple-event-search"><label>From<input id="coupleEventFrom" type="date" value="${monthStart}" onchange="filterCoupleArchiveEvents()"></label><label>To<input id="coupleEventTo" type="date" value="${monthEnd}" onchange="filterCoupleArchiveEvents()"></label><span class="couple-event-result"></span></div><div class="couple-event-filters"><button class="active" data-type="all" onclick="filterCoupleArchiveEvents('all')">All</button>${filterTypes.map(type=>`<button data-type="${type.id}" onclick="filterCoupleArchiveEvents('${type.id}')">${type.label}</button>`).join('')}</div><div class="couple-event-list">${events.map(item=>`<article class="couple-event-card" data-date="${item.date}" data-types="${eventTypeValues(item.type).map(type=>type.toLowerCase()).join('|')}"><time><b>${day(item.date)}</b><span>${month(item.date)} ${item.date.slice(0,4)}</span></time><div><small>${eventTypeValues(item.type).join(' · ')}</small><h3>${item.title}</h3><p>${item.place||'TBA'}</p></div>${item.source?`<a href="${item.source}" target="_blank">↗</a>`:''}</article>`).join('') || '<div class="empty">No couple events yet.</div>'}</div></div></section>
  <section class="section archive-awards"><div class="container"><div class="archive-section-head"><span>04</span><div><small>SHARED ACHIEVEMENTS</small><h2>Awards</h2></div><p>Awards and recognitions received together.</p></div><div class="archive-award-table"><div class="archive-award-row head"><span>Year</span><span>Award</span><span>Organization / Category</span><span>Result</span></div>${awards.map(item=>`<div class="archive-award-row"><strong>${item.year}</strong><span>${item.title}</span><span>${item.org}</span><span>Recipient</span></div>`).join('') || '<div class="empty">No couple awards yet.</div>'}</div></div></section>
  <section class="section"><div class="container"><div class="archive-section-head"><span>04</span><div><small>PHOTO · VIDEO · SOURCE</small><h2>Media Gallery</h2></div><p>Event photos, short clips and original post links.</p></div><div class="couple-media-grid">${media.map(item=>`<article>${item.kind==='video'?`<video src="${item.src}" controls playsinline></video>`:item.kind==='image'?`<img src="${item.src}" alt="${item.title}">`:'<div class="media-link-art">↗</div>'}<div><h3>${item.title}</h3>${item.url?`<a href="${item.url}" target="_blank">View original post ↗</a>`:''}</div></article>`).join('') || '<div class="empty">No media has been added yet.</div>'}</div></div></section></main>` + footer();
  document.querySelectorAll('.couple-event-card').forEach((card,index) => card.dataset.artist = canonicalArtistId(events[index]?.artistId || 'AT01'));
  document.querySelector('.couple-event-filters:not(.couple-artist-filters)')?.remove();
  document.querySelector('.couple-event-search')?.insertAdjacentHTML('afterend', `<div class="couple-event-filters couple-artist-filters"><button class="active" data-artist="all" onclick="filterCoupleArchiveArtist('all')">All</button><button data-artist="AT01" onclick="filterCoupleArchiveArtist('AT01')">AUAUSAVE</button><button data-artist="AT02" onclick="filterCoupleArchiveArtist('AT02')">AUAU</button><button data-artist="AT03" onclick="filterCoupleArchiveArtist('AT03')">SAVE</button></div>`);
  const archiveData = db.siteSettings.artistArchive.AT01;
  const seriesHeading = [...document.querySelectorAll('.archive-section-head h2')].find(item => item.textContent === 'Series & Projects');
  if (seriesHeading) {
    seriesHeading.closest('.section').outerHTML = artistSeriesSection('AT01');
  }
  const galleryHeading = [...document.querySelectorAll('.archive-section-head h2')].find(item => item.textContent === 'Media Gallery');
  if (galleryHeading) {
    galleryHeading.textContent = 'Gallery';
    const grid = galleryHeading.closest('.section').querySelector('.couple-media-grid');
    if (archiveData.gallery.length) {
      grid.querySelector('.empty')?.remove();
      grid.insertAdjacentHTML('beforeend', archiveData.gallery.map(item=>`<article>${item.type==='video'?`<video src="${item.mediaUrl}" controls playsinline></video>`:item.mediaUrl?`<img src="${item.mediaUrl}" alt="${item.title}">`:'<div class="media-link-art">X</div>'}<div><h3>${item.title}</h3>${item.xUrl?`<a href="${item.xUrl}" target="_blank">View X post ↗</a>`:''}</div></article>`).join(''));
    }
  }
  [...document.querySelectorAll('.archive-section-head h2')].forEach(heading => {
    if (['Projects','Gallery'].includes(heading.textContent)) heading.closest('.section')?.remove();
  });
  Object.entries(archiveData.visibility).forEach(([kind,visible]) => {
    if (visible) return;
    const title = ({series:'Series',projects:'Projects',events:'Events',awards:'Awards',gallery:'Gallery'})[kind];
    const heading = [...document.querySelectorAll('.archive-section-head h2')].find(item => item.textContent === title);
    heading?.closest('.section')?.remove();
  });
  filterCoupleArchiveArtist('all');
  ['Series','Events','Awards'].forEach((title,index) => {
    const heading = [...document.querySelectorAll('.archive-section-head h2')].find(item => item.textContent === title);
    if (heading) heading.closest('.archive-section-head').querySelector(':scope > span').textContent = String(index + 1).padStart(2,'0');
  });
}

const renderProfileWithoutImage = profile;
profile = function (id) {
  id = canonicalArtistId(id);
  if (sameArtistId(id,'duo')) { coupleArchivePage(); return; }
  renderProfileWithoutImage(id);
  const artist = artistById(id),
    portrait = document.querySelector(".profile-portrait");
  if (artist?.image && portrait)
    portrait.innerHTML = `<img src="${artist.image}" alt="${artist.name}">`;
  const scheduleSection = document.querySelector('.profile-head')?.closest('.section')?.nextElementSibling;
  const scheduleTitle = scheduleSection?.querySelector('.section-head h2');
  const scheduleEyebrow = scheduleSection?.querySelector('.section-head .eyebrow');
  const monthLabel = new Intl.DateTimeFormat('en-US', {month:'long', year:'numeric'}).format(new Date());
  if (scheduleTitle) scheduleTitle.textContent = `This month’s schedule · ${artist.name}`;
  if (scheduleEyebrow) scheduleEyebrow.textContent = monthLabel;
  const visibility = db.siteSettings.artistArchive[id]?.visibility || {};
  document.querySelector('.profile-head')?.closest('.section')?.insertAdjacentHTML('afterend',artistSeriesSection(id));
  if (visibility.events === false) scheduleSection?.remove();
  const awardsSection = [...document.querySelectorAll('main .section')].find(section => section.querySelector('.award-grid'));
  if (visibility.awards === false) awardsSection?.remove();
  if (sameArtistId(artist?.id,'duo')) {
    const facts = [...document.querySelectorAll('.profile-head .facts .fact')];
    facts[0]?.remove();
    const anniversaryLabel = facts[1]?.querySelector('small');
    if (anniversaryLabel) anniversaryLabel.textContent = 'Anniversary';
  }
};
function compactSchedule(items) {
  return items.length
    ? items
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(
          (e) =>
            `<div class="mini-event"><div class="mini-date"><b>${day(e.date)}</b><span>${month(e.date)}</span></div><div><span class="mini-type">${e.type}</span><h4>${e.title}</h4><p>${e.place}</p></div></div>`,
        )
        .join("")
    : '<div class="empty">ยังไม่มีตารางงาน</div>';
}
function homeScheduleSection() {
  const ym = new Date().toISOString().slice(0, 7),
    monthly = db.events.filter((e) => e.date.startsWith(ym));
  const monthLabel = new Intl.DateTimeFormat(route === "admin" ? "th-TH" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${ym}-01`));
  return `<section class="section home-schedules"><div class="container"><div class="section-head"><div><span class="eyebrow">This month · ${monthLabel}</span><h2>ตารางงานเดือนนี้</h2></div><a class="btn outline" href="#schedule">เปิดปฏิทินทั้งหมด ↗</a></div><div class="schedule-columns"><article class="schedule-card duo-card"><div class="schedule-card-head"><span>COUPLE PATH</span><h3>ตารางงานคู่</h3><p>#AuauSave</p></div>${compactSchedule(monthly.filter((e) => e.artistId === "duo"))}</article><article class="schedule-card auau-card"><div class="schedule-card-head"><span>SOLO PATH</span><h3>ตารางงาน AUAU</h3><p>Auau · DEXX</p></div>${compactSchedule(monthly.filter((e) => e.artistId === "auau"))}</article><article class="schedule-card save-card"><div class="schedule-card-head"><span>SOLO PATH</span><h3>ตารางงาน SAVE</h3><p>Save</p></div>${compactSchedule(monthly.filter((e) => e.artistId === "save"))}</article></div></div></section>`;
}
const renderBaseHome = home;
home = function () {
  renderBaseHome();
  const oldSchedule = [
    ...document.querySelectorAll(".schedule-wrap"),
  ][0]?.closest(".section");
  if (oldSchedule) oldSchedule.remove();
  document
    .querySelector("#featured")
    ?.insertAdjacentHTML("beforebegin", homeScheduleSection());
};

let calendarDate = new Date();
function calendarPage() {
  const year = calendarDate.getFullYear(),
    mon = calendarDate.getMonth(),
    first = new Date(year, mon, 1),
    days = new Date(year, mon + 1, 0).getDate(),
    offset = (first.getDay() + 6) % 7,
    label = new Intl.DateTimeFormat(route === "admin" ? "th-TH" : "en-US", {
      month: "long",
      year: "numeric",
    }).format(first);
  const key = `${year}-${String(mon + 1).padStart(2, "0")}`;
  const cells = [];
  for (let i = 0; i < offset; i++)
    cells.push('<div class="calendar-day muted"></div>');
  for (let d = 1; d <= days; d++) {
    const date = `${key}-${String(d).padStart(2, "0")}`,
      items = db.events.filter((e) => e.date === date);
    cells.push(
      `<div class="calendar-day ${date === new Date().toISOString().slice(0, 10) ? "today" : ""}"><b>${d}</b><div class="day-events">${items.map((e) => `<button class="cal-event ${e.artistId}" onclick="showEvent('${e.id}')"><span>${e.artistId === "duo" ? "คู่" : e.artistId.toUpperCase()}</span>${e.title}</button>`).join("")}</div></div>`,
    );
  }
  const total = offset + days;
  for (let i = total; i < Math.ceil(total / 7) * 7; i++)
    cells.push('<div class="calendar-day muted"></div>');
  app.innerHTML =
    nav("schedule") +
    `<main><section class="page-hero calendar-hero"><div class="container"><span class="eyebrow">Past · Present · Future</span><h1>ปฏิทินงาน</h1><p>ย้อนดูงานที่ผ่านมา และวางแผนติดตามงานในอนาคต</p></div></section><section class="section calendar-section"><div class="container"><div class="calendar-toolbar"><button onclick="moveCalendar(-1)">←</button><h2>${label}</h2><button onclick="moveCalendar(1)">→</button></div><div class="calendar-legend"><span><i class="duo"></i>งานคู่</span><span><i class="auau"></i>AUAU</span><span><i class="save"></i>SAVE</span><button onclick="calendarDate=new Date();calendarPage()">กลับเดือนนี้</button></div><div class="calendar"><div class="weekday">จันทร์</div><div class="weekday">อังคาร</div><div class="weekday">พุธ</div><div class="weekday">พฤหัส</div><div class="weekday">ศุกร์</div><div class="weekday">เสาร์</div><div class="weekday">อาทิตย์</div>${cells.join("")}</div></div></section></main>` +
    footer();
}
function moveCalendar(step) {
  calendarDate = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + step,
    1,
  );
  calendarPage();
}
function showEvent(id) {
  const e = db.events.find((x) => x.id === id);
  if (!e) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modal"><div class="modal event-modal"><div class="modal-head"><span class="eyebrow">${artistName(e.artistId)} · ${e.type}</span><button class="close" onclick="closeModal()">×</button></div><h2>${e.title}</h2><p class="event-date">${fmtDate(e.date)}</p><p>${e.place}</p>${e.source ? `<a class="btn" target="_blank" href="${e.source}">ดูข้อมูลต้นทาง ↗</a>` : ""}</div></div>`,
  );
}
const renderEventWithoutPoster = showEvent;
showEvent = function (id) {
  renderEventWithoutPoster(id);
  const e = db.events.find((x) => x.id === id),
    head = document.querySelector(".event-modal .modal-head");
  if (e?.poster && head)
    head.insertAdjacentHTML(
      "afterend",
      `<img class="event-poster" src="${e.poster}" alt="${e.title}">`,
    );
};
const renderBaseListing = listing;
listing = function (type) {
  if (type === "schedule") calendarPage();
  else renderBaseListing(type);
};

function presenterCards(items = db.presenters) {
  const currentYear=String(new Date().getFullYear());
  items=[...items].sort((a,b)=>{const aCurrent=String(a.year)===currentYear,bCurrent=String(b.year)===currentYear;if(aCurrent!==bCurrent)return aCurrent?-1:1;return (Number(b.year)||0)-(Number(a.year)||0);});
  return `<div class="presenter-grid">${
    items
      .map((p) => {
        const fit = p.mediaFit || "contain",
          position = p.mediaPosition || "center";
        return `<article class="presenter-card ${p.announcementImage || p.announcementVideo ? "has-poster" : ""}" style="--brand:${p.color || "#777"}">${p.announcementVideo ? `<div class="presenter-poster video-poster"><video src="${p.announcementVideo}" controls playsinline preload="metadata" style="object-fit:${fit};object-position:${position}"></video></div>` : p.announcementImage ? `<div class="presenter-poster"><img src="${p.announcementImage}" alt="โปสเตอร์ ${p.brand}" style="object-fit:${fit};object-position:${position}"></div>` : ""}<div class="presenter-detail"><div class="brand-mark">${p.logo ? `<img src="${p.logo}" alt="${p.brand}">` : p.brand.slice(0, 2).toUpperCase()}</div><span>${sameArtistId(p.artistId,"duo") ? "#AUAUSAVE" : artistName(p.artistId)}</span><h3>${p.brand}</h3><p>${p.role} · ${p.year}</p>${p.url ? `<a href="${p.url}" target="_blank">ดูรายละเอียด ↗</a>` : ""}</div></article>`;
      })
      .join("") || '<div class="empty">ยังไม่มีข้อมูลพรีเซนเตอร์</div>'
  }</div>`;
}
function presenterPage() {
  app.innerHTML =
    nav("presenters") +
    `<main><section class="page-hero"><div class="container"><span class="eyebrow">Brand & Partnership</span><h1>พรีเซนเตอร์</h1><p>รวมแบรนด์ที่ร่วมเดินทางกับอู่อู๋เซฟ ทั้งงานคู่และงานเดี่ยว</p></div></section><section class="section" style="padding-top:25px"><div class="container"><div class="presenter-group"><h2>#AUAUSAVE</h2>${presenterCards(db.presenters.filter((p) => itemMatchesArtist(p, "AT01")))}</div><div class="presenter-solo"><div><h2>AUAU</h2>${presenterCards(db.presenters.filter((p) => itemMatchesArtist(p, "AT02") && !itemMatchesArtist(p, "AT01")))}</div><div><h2>SAVE</h2>${presenterCards(db.presenters.filter((p) => itemMatchesArtist(p, "AT03") && !itemMatchesArtist(p, "AT01")))}</div></div></div></section></main>` +
    footer();
}
const renderListingBeforePresenters = listing;
listing = function (type) {
  if (type === "presenters") presenterPage();
  else renderListingBeforePresenters(type);
};
const renderHomeBeforePresenters = home;
home = function () {
  renderHomeBeforePresenters();
  document
    .querySelector("footer")
    ?.insertAdjacentHTML(
      "beforebegin",
      `<section class="section presenter-home"><div class="container"><div class="section-head"><div><span class="eyebrow">Brand & Partnership</span><h2>Our Presenters</h2></div><a class="btn outline" href="#presenters">ดูทั้งหมด ↗</a></div>${presenterCards(db.presenters.slice(0, 3))}</div></section>`,
    );
};
function videoTile(v) {
  return `<article class="hub-video"><a href="${v.url}" target="_blank"><div class="hub-thumb" style="background:${v.color}">${v.thumbnail ? `<img src="${v.thumbnail}" alt="${v.title}">` : ""}<span>▶</span></div></a><small>${artistName(v.artistId)}</small><h3>${v.title}</h3><p>${v.views}</p></article>`;
}
function youtubeHub(compact = false) {
  const featured = db.videos.find((v) => v.featured === "yes") || db.videos[0],
    groups = db.siteSettings.youtubeCategories;
  if (!featured) return '<div class="empty">ยังไม่มีวิดีโอ</div>';
  return `<div class="featured-watch ${compact?'home-featured-watch':''}"><div class="featured-player">${featured.embedUrl ? `<iframe src="${featured.embedUrl}" title="${featured.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : `<a href="${featured.url}" target="_blank" style="background:${featured.color}">${featured.thumbnail ? `<img src="${featured.thumbnail}" alt="${featured.title}">` : ""}<span class="big-play">▶</span><small>เปิดดูบน YouTube</small></a>`}</div><div class="featured-copy"><span class="eyebrow">Featured video</span><h2>${featured.title}</h2><p>${artistName(featured.artistId)} · ${featured.views}</p><a class="btn" href="${featured.url}" target="_blank">เปิดบน YouTube ↗</a></div></div>${groups
    .map((group, index) => {
      const {id: key, title, description: desc, linkLabel, linkUrl} = group;
      const items = db.videos.filter(
        (v) => v.category === key && v.id !== featured.id,
      );
      if (compact && !items.length) return "";
      return `<section class="video-category ${compact?'home-video-category':''}"><div class="category-title"><div><span>${String(index + 1).padStart(2, '0')}</span><h2>${title}</h2></div><p>${desc || ''}</p>${linkUrl ? `<a class="channel-link" href="${linkUrl}" target="_blank" rel="noopener">${linkLabel || 'Open link ↗'}</a>` : ''}</div>${compact?'<div class="home-video-carousel"><button class="carousel-arrow prev" type="button" aria-label="Previous videos" onclick="scrollHomeVideos(this,-1)">←</button>':''}<div class="hub-grid">${
        items
          .slice(0, compact ? 99 : 99)
          .map(videoTile)
          .join("") || '<div class="empty">เพิ่มวิดีโอได้จากหลังบ้าน</div>'
      }</div>${compact?'<button class="carousel-arrow next" type="button" aria-label="Next videos" onclick="scrollHomeVideos(this,1)">→</button></div>':''}</section>`;
    })
    .join("")}`;
}
function scrollHomeVideos(button,direction){const carousel=button.closest('.home-video-carousel'),grid=carousel?.querySelector('.hub-grid');if(!grid)return;grid.scrollBy({left:direction*Math.max(260,grid.clientWidth*.82),behavior:'smooth'});}
function youtubePage() {
  app.innerHTML =
    nav("videos") +
    `<main><section class="page-hero"><div class="container"><span class="eyebrow">Watch · Listen · Remember</span><h1>YouTube</h1><p>วิดีโอหลักและคลังรายการของ AUAUSAVE HOUSE</p></div></section><section class="section" style="padding-top:20px"><div class="container">${youtubeHub()}</div></section></main>` +
    footer();
}
const renderListingBeforeYoutubeHub = listing;
listing = function (type) {
  if (type === "videos") youtubePage();
  else renderListingBeforeYoutubeHub(type);
};
const renderHomeBeforeYoutubeHub = home;
home = function () {
  renderHomeBeforeYoutubeHub();
  const heads = [...document.querySelectorAll(".section-head h2")],
    target = heads
      .find((h) => h.textContent.includes("AuauSave on YouTube"))
      ?.closest(".section");
  if (target)
    target.innerHTML = `<div class="container"><div class="section-head"><div><span class="eyebrow">Watch & remember</span><h2>AuauSave on YouTube</h2></div><a class="btn outline" href="#videos">ดูทั้งหมด ↗</a></div>${youtubeHub(true)}</div>`;
};

function addDexxChannelLink() {
  const heading = [...document.querySelectorAll(".category-title h2")].find(
    (h) => h.textContent.includes("DEXX"),
  );
  if (!heading) return;
  const title = heading.closest(".category-title");
  if (title && !title.querySelector(".channel-link")) {
    title.insertAdjacentHTML(
      "beforeend",
      `<a class="channel-link" href="https://www.youtube.com/@DEXXOfficialTH" target="_blank" rel="noopener">เปิดช่อง DEXX Official TH ↗</a>`,
    );
  }
}

const renderYoutubePageWithDexxChannel = youtubePage;
youtubePage = function () {
  renderYoutubePageWithDexxChannel();
  addDexxChannelLink();
};

const renderHomeWithDexxChannel = home;
home = function () {
  renderHomeWithDexxChannel();
  addDexxChannelLink();
};

const configs = {
  artists: {
    label: "ศิลปิน",
    icon: "◉",
    cols: ["Nickname", "Name TH", "Name EN", "บทบาท"],
    fields: [
      ["name", "Nickname"],
      ["realName", "Name TH"],
      ["nameEN", "Name EN"],
      ["role", "บทบาท"],
      ["birth", "วันเกิด", "date", false],
      ["initial", "อักษรย่อ"],
      ["color", "พื้นหลัง (CSS)"],
      ["bio", "ประวัติ", "textarea"],
    ],
  },
  events: {
    label: "ตารางงาน",
    icon: "▦",
    cols: ["ชื่องาน", "ศิลปิน", "วันที่"],
    fields: [
      ["title", "ชื่องาน"],
      ["artistId", "ศิลปิน", "artist"],
      ["date", "วันที่", "date"],
      ["place", "สถานที่"],
      ["type", "ประเภทงาน"],
      ["source", "ลิงก์ข้อมูลต้นทาง", "url", false],
    ],
  },
  presenters: {
    label: "พรีเซนเตอร์",
    icon: "✦",
    cols: ["แบรนด์", "พรีเซนเตอร์", "วัน / เดือน / ปี"],
    fields: [
      ["brand", "ชื่อแบรนด์"],
      ["artistId", "พรีเซนเตอร์", "artist"],
      ["role", "บทบาท/ตำแหน่ง"],
      ["adminDate", "วันที่", "date"],
      ["color", "สีประจำแบรนด์", "text", false],
      ["url", "เว็บไซต์/แหล่งข้อมูล", "url", false],
    ],
  },
  awards: {
    label: "รางวัล",
    icon: "◇",
    cols: ["ชื่อรางวัล", "ศิลปิน", "วัน / เดือน / ปี"],
    fields: [
      ["title", "ชื่อรางวัล"],
      ["artistId", "ศิลปิน", "artist"],
      ["adminDate", "วันที่", "date"],
      ["org", "องค์กร/เวที"],
      ["source", "ลิงก์ข้อมูลต้นทาง", "url", false],
    ],
  },
  videos: {
    label: "YouTube",
    icon: "▶",
    cols: ["ชื่อวิดีโอ", "ศิลปิน", "ยอดชม"],
    fields: [
      ["title", "ชื่อวิดีโอ"],
      ["artistId", "ศิลปิน", "artist"],
      ["views", "ยอดชม"],
      ["url", "YouTube URL"],
      ["color", "พื้นหลัง (CSS)", "text", false],
    ],
  },
};
let adminTab = "dashboard";
let homeBuilderTab = "preview";
let youtubeAdminTab = "content";
let previousAdminTab = "dashboard";
const yearlyAdminTabs = {presenters:'content', awards:'content'};
let previousYearlyAdminTab = "dashboard";
function admin() {
  const c = configs[adminTab],
    items = db[adminTab];
  app.innerHTML = `<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav">${Object.entries(
    configs,
  )
    .map(
      ([k, v]) =>
        `<button data-icon="${v.icon}" class="${k === adminTab ? "active" : ""}" onclick="adminTab='${k}';admin()">${v.icon} &nbsp; ${v.label}</button>`,
    )
    .join(
      "",
    )}</div><a class="back" href="#home">← กลับหน้าเว็บไซต์</a></aside><main class="admin-main"><div class="admin-top"><div><small style="color:var(--muted)">CONTENT MANAGEMENT</small><h1>จัดการ${c.label}</h1></div><button class="btn" onclick="openForm('${adminTab}')">+ เพิ่มข้อมูล</button></div><div class="stats">${Object.entries(
    configs,
  )
    .map(
      ([k, v]) =>
        `<div class="stat"><b>${db[k].length}</b><span>${v.label}</span></div>`,
    )
    .join(
      "",
    )}</div><section class="panel"><div class="panel-head"><h2>ข้อมูลทั้งหมด</h2><span style="color:var(--muted)">${items.length} รายการ</span></div><table class="data-table"><thead><tr>${c.cols.map((x) => `<th>${x}</th>`).join("")}<th>จัดการ</th></tr></thead><tbody>${items.map((x) => `<tr>${rowCells(adminTab, x)}<td><div class="actions"><button class="icon-btn" onclick="openForm('${adminTab}','${x.id}')">✎</button><button class="icon-btn" onclick="removeItem('${adminTab}','${x.id}')">⌫</button></div></td></tr>`).join("")}</tbody></table>${!items.length ? '<div class="empty">ยังไม่มีข้อมูล</div>' : ""}</section></main></div></div>`;
}
let adminMonth = new Date().toISOString().slice(0, 7),
  adminEventFilter = "all";
function adminEventCalendar() {
  const monthEvents = db.events
    .filter(
      (e) =>
        e.date.startsWith(adminMonth) &&
        ("all" === adminEventFilter || itemMatchesArtist(e, adminEventFilter)),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const monthLabel = new Intl.DateTimeFormat(route === "admin" ? "th-TH" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${adminMonth}-01`));
  app.innerHTML = `<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav">${Object.entries(
    configs,
  )
    .map(
      ([k, v]) =>
        `<button data-icon="${v.icon}" class="${k === adminTab ? "active" : ""}" onclick="adminTab='${k}';admin()">${v.icon} &nbsp; ${v.label}</button>`,
    )
    .join(
      "",
    )}</div><a class="back" href="#schedule">← ดูปฏิทินหน้าบ้าน</a></aside><main class="admin-main"><div class="admin-top"><div><small style="color:var(--muted)">CALENDAR MANAGEMENT</small><h1>จัดการปฏิทินงาน</h1></div><button class="btn" onclick="openForm('events')">+ เพิ่มงานใหม่</button></div><section class="admin-cal-tools"><div><label>เลือกเดือน</label><input type="month" value="${adminMonth}" onchange="adminMonth=this.value;admin()"></div><div class="admin-filters"><button class="${adminEventFilter === "all" ? "active" : ""}" onclick="adminEventFilter='all';admin()">ทั้งหมด</button><button class="duo ${adminEventFilter === "duo" ? "active" : ""}" onclick="adminEventFilter='duo';admin()">#AUAUSAVE</button><button class="auau ${adminEventFilter === "auau" ? "active" : ""}" onclick="adminEventFilter='auau';admin()">AUAU</button><button class="save ${adminEventFilter === "save" ? "active" : ""}" onclick="adminEventFilter='save';admin()">SAVE</button></div></section><div class="admin-month-title"><h2>${monthLabel}</h2><span>${monthEvents.length} งาน</span></div><section class="admin-event-list">${monthEvents.map((e) => `<article class="admin-event-item ${e.artistId}"><div class="admin-event-date"><b>${day(e.date)}</b><span>${month(e.date)}</span></div><div class="admin-event-info"><small>${e.artistId === "duo" ? "#AUAUSAVE" : e.artistId.toUpperCase()} · ${e.type}</small><h3>${e.title}</h3><p>${e.place}</p></div><div class="actions"><button class="icon-btn" onclick="openForm('events','${e.id}')">✎ แก้ไข</button><button class="icon-btn" onclick="removeItem('events','${e.id}')">⌫</button></div></article>`).join("") || '<div class="empty">เดือนนี้ยังไม่มีตารางงาน<br><button class="btn" style="margin-top:15px" onclick="openForm(\'events\')">เพิ่มงานแรกของเดือน</button></div>'}</section></main></div></div>`;
}
const renderBaseAdmin = admin;
admin = function () {
  if (adminTab === "events") adminEventCalendar();
  else renderBaseAdmin();
};
const renderBaseCalendar = calendarPage;
calendarPage = function () {
  renderBaseCalendar();
  document
    .querySelectorAll(".cal-event.duo span")
    .forEach((el) => (el.textContent = "#AUAUSAVE"));
  const legend = document.querySelector(".calendar-legend span");
  if (legend) legend.lastChild.textContent = "#AUAUSAVE";
};
function dashboardAdmin() {
  const now = new Date(),
    year = now.getFullYear(),
    ym = now.toISOString().slice(0, 7),
    yearEvents = db.events.filter((e) => e.date.startsWith(String(year))),
    monthEvents = yearEvents.filter((e) => e.date.startsWith(ym)),
    upcoming = yearEvents
      .filter((e) => e.date >= now.toISOString().slice(0, 10))
      .sort((a, b) => a.date.localeCompare(b.date)),
    months = Array.from(
      { length: 12 },
      (_, i) =>
        yearEvents.filter((e) =>
          e.date.startsWith(`${year}-${String(i + 1).padStart(2, "0")}`),
        ).length,
    ),
    max = Math.max(...months, 1),
    paths = {
      duo: yearEvents.filter((e) => e.artistId === "duo").length,
      auau: yearEvents.filter((e) => e.artistId === "auau").length,
      save: yearEvents.filter((e) => e.artistId === "save").length,
    };
  app.innerHTML = `<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav"><button data-icon="⌂" class="active" onclick="adminTab='dashboard';admin()">⌂ &nbsp; Dashboard</button>${Object.entries(
    configs,
  )
    .map(
      ([k, v]) =>
        `<button data-icon="${v.icon}" onclick="adminTab='${k}';admin()">${v.icon} &nbsp; ${v.label}</button>`,
    )
    .join(
      "",
    )}</div><a class="back" href="#home">← กลับหน้าเว็บไซต์</a></aside><main class="admin-main dashboard-main"><div class="admin-top"><div><small style="color:var(--muted)">AUAUSAVE HOUSE · ${year}</small><h1>ภาพรวมหลังบ้าน</h1></div><button class="btn" onclick="adminTab='events';admin()">จัดการปฏิทิน ↗</button></div><div class="dashboard-stats"><article><span>ตารางงานปีนี้</span><b>${yearEvents.length}</b><small>รายการทั้งหมดใน ${year}</small></article><article><span>งานเดือนนี้</span><b>${monthEvents.length}</b><small>${new Intl.DateTimeFormat("th-TH", { month: "long" }).format(now)}</small></article><article><span>งานที่กำลังจะมาถึง</span><b>${upcoming.length}</b><small>ตั้งแต่วันนี้เป็นต้นไป</small></article><article><span>ศิลปิน/พาส</span><b>${db.artists.length}</b><small>#AUAUSAVE · AUAU · SAVE</small></article></div><div class="dashboard-grid"><section class="dash-panel chart-panel"><div class="panel-head"><div><small>EVENT ACTIVITY</small><h2>ตารางงานรายเดือน</h2></div><b>${yearEvents.length} งาน</b></div><div class="bar-chart">${months.map((n, i) => `<div class="bar-col"><span>${n || ""}</span><div class="bar" style="height:${Math.max((n / max) * 180, n ? 8 : 2)}px"></div><small>${["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][i]}</small></div>`).join("")}</div></section><section class="dash-panel path-panel"><div class="panel-head"><div><small>PATH SUMMARY</small><h2>แยกตามพาส</h2></div></div><div class="path-metric duo"><div><b>#AUAUSAVE</b><span>${paths.duo} งาน</span></div><div class="metric-track"><i style="width:${(paths.duo / yearEvents.length) * 100 || 0}%"></i></div></div><div class="path-metric auau"><div><b>AUAU</b><span>${paths.auau} งาน</span></div><div class="metric-track"><i style="width:${(paths.auau / yearEvents.length) * 100 || 0}%"></i></div></div><div class="path-metric save"><div><b>SAVE</b><span>${paths.save} งาน</span></div><div class="metric-track"><i style="width:${(paths.save / yearEvents.length) * 100 || 0}%"></i></div></div></section><section class="dash-panel upcoming-panel"><div class="panel-head"><div><small>NEXT SCHEDULE</small><h2>งานที่กำลังจะมาถึง</h2></div><button onclick="adminTab='events';admin()">ดูทั้งหมด</button></div>${
    upcoming
      .slice(0, 5)
      .map(
        (e) =>
          `<div class="dash-upcoming"><div><b>${day(e.date)}</b><span>${month(e.date)}</span></div><p><strong>${e.title}</strong><small>${e.artistId === "duo" ? "#AUAUSAVE" : e.artistId.toUpperCase()} · ${e.place}</small></p><button onclick="openForm('events','${e.id}')">✎</button></div>`,
      )
      .join("") || '<div class="empty">ยังไม่มีงานที่กำลังจะมาถึง</div>'
  }</section></div></main></div></div>`;
}
function dashboardDefaultRange() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
const initialDashboardRange = dashboardDefaultRange();
let dashYearFrom = initialDashboardRange.year,
  dashYearTo = initialDashboardRange.year,
  dashMonthFrom = 1,
  dashMonthTo = initialDashboardRange.month;
let lastValidDashboardRange = {
  yearFrom: dashYearFrom,
  yearTo: dashYearTo,
  monthFrom: dashMonthFrom,
  monthTo: dashMonthTo,
};
function dashboardRangeStartValue() {
  return dashYearFrom * 100 + dashMonthFrom;
}
function dashboardRangeEndValue() {
  return dashYearTo * 100 + dashMonthTo;
}
function rememberDashboardRange() {
  lastValidDashboardRange = {
    yearFrom: dashYearFrom,
    yearTo: dashYearTo,
    monthFrom: dashMonthFrom,
    monthTo: dashMonthTo,
  };
}
function restoreDashboardRange() {
  dashYearFrom = lastValidDashboardRange.yearFrom;
  dashYearTo = lastValidDashboardRange.yearTo;
  dashMonthFrom = lastValidDashboardRange.monthFrom;
  dashMonthTo = lastValidDashboardRange.monthTo;
  document.querySelectorAll(".dash-filter select").forEach(select => {
    if (select.dataset.range === "yearFrom") select.value = dashYearFrom;
    if (select.dataset.range === "yearTo") select.value = dashYearTo;
    if (select.dataset.range === "monthFrom") select.value = dashMonthFrom;
    if (select.dataset.range === "monthTo") select.value = dashMonthTo;
  });
}
function setDashboardRange(part, value) {
  if (part === "yearFrom") dashYearFrom = Number(value);
  if (part === "yearTo") dashYearTo = Number(value);
  if (part === "monthFrom") dashMonthFrom = Number(value);
  if (part === "monthTo") dashMonthTo = Number(value);
  if (dashboardRangeStartValue() > dashboardRangeEndValue()) {
    alert("ช่วงเวลาค้นหาไม่ถูกต้อง: วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด");
    restoreDashboardRange();
    return;
  }
  rememberDashboardRange();
  applyDashboardRange();
}
function resetDashboardRange() {
  const range = dashboardDefaultRange();
  dashYearFrom = range.year;
  dashYearTo = range.year;
  dashMonthFrom = 1;
  dashMonthTo = range.month;
  rememberDashboardRange();
  dashboardAdmin();
}
function dashboardFilterControls() {
  const years = [
      ...new Set([dashboardDefaultRange().year, ...db.events.map((e) => Number(e.date.slice(0, 4)))]),
    ].sort((a, b) => a - b),
    monthNames = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
  return `<section class="dash-filter"><div class="dash-filter-title"><span>⌕</span><div><b>ค้นหาตามช่วงเวลา</b><small>ข้อมูลบน Dashboard จะเปลี่ยนตามช่วงที่เลือก</small></div></div><div class="dash-filter-fields"><label>จากปี<select data-range="yearFrom" onchange="setDashboardRange('yearFrom',this.value)">${years.map((y) => `<option ${y === dashYearFrom ? "selected" : ""}>${y}</option>`).join("")}</select></label><label>ถึงปี<select data-range="yearTo" onchange="setDashboardRange('yearTo',this.value)">${years.map((y) => `<option ${y === dashYearTo ? "selected" : ""}>${y}</option>`).join("")}</select></label><label>จากเดือน<select data-range="monthFrom" onchange="setDashboardRange('monthFrom',this.value)">${monthNames.map((m, i) => `<option value="${i + 1}" ${i + 1 === dashMonthFrom ? "selected" : ""}>${m}</option>`).join("")}</select></label><label>ถึงเดือน<select data-range="monthTo" onchange="setDashboardRange('monthTo',this.value)">${monthNames.map((m, i) => `<option value="${i + 1}" ${i + 1 === dashMonthTo ? "selected" : ""}>${m}</option>`).join("")}</select></label><button onclick="resetDashboardRange()">รีเซ็ต</button></div><p class="dash-range-text" id="dashRangeText"></p></section>`;
}
function applyDashboardRange() {
  const start = `${dashYearFrom}-${String(dashMonthFrom).padStart(2, "0")}-01`,
    endDate = new Date(dashYearTo, dashMonthTo, 0),
    end = `${dashYearTo}-${String(dashMonthTo).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`,
    items = db.events.filter((e) => e.date >= start && e.date <= end),
    now = new Date().toISOString().slice(0, 10),
    future = items
      .filter((e) => e.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date)),
    paths = {
      duo: items.filter((e) => e.artistId === "duo").length,
      auau: items.filter((e) => e.artistId === "auau").length,
      save: items.filter((e) => e.artistId === "save").length,
    },
    stats = document.querySelectorAll(".dashboard-stats article b");
  const statTitles = document.querySelectorAll(".dashboard-stats article span");
  if (statTitles.length) {
    statTitles[0].textContent = "ตารางงานในช่วงที่เลือก";
    statTitles[1].textContent = "เดือนที่มีกิจกรรม";
    statTitles[2].textContent = "งานที่กำลังจะมาถึง";
    statTitles[3].textContent = "ศิลปิน/พาส";
  }
  if (stats.length) {
    stats[0].textContent = items.length;
    stats[1].textContent = new Set(items.map((e) => e.date.slice(0, 7))).size;
    stats[2].textContent = future.length;
    stats[3].textContent = new Set(items.flatMap(eventArtistIds)).size;
  }
  const statLabels = document.querySelectorAll(
    ".dashboard-stats article small",
  );
  if (statLabels.length) {
    statLabels[0].textContent = `${dashMonthFrom}/${dashYearFrom} – ${dashMonthTo}/${dashYearTo}`;
    statLabels[1].textContent = "เดือนที่มีกิจกรรม";
    statLabels[2].textContent = "ในช่วงที่เลือก";
    statLabels[3].textContent = "#AUAUSAVE · AUAU · SAVE";
  }
  const rangeText = document.querySelector("#dashRangeText");
  if (rangeText)
    rangeText.textContent = `พบ ${items.length} รายการ ระหว่าง ${dashMonthFrom}/${dashYearFrom} ถึง ${dashMonthTo}/${dashYearTo}`;
  const buckets = [];
  for (let y = dashYearFrom; y <= dashYearTo; y++)
    for (let m = 1; m <= 12; m++) {
      if (
        (y === dashYearFrom && m < dashMonthFrom) ||
        (y === dashYearTo && m > dashMonthTo)
      )
        continue;
      const key = `${y}-${String(m).padStart(2, "0")}`;
      buckets.push({
        key,
        count: items.filter((e) => e.date.startsWith(key)).length,
      });
    }
  const chart = document.querySelector(".bar-chart"),
    max = Math.max(...buckets.map((x) => x.count), 1);
  if (chart) {
    chart.innerHTML = buckets
      .map(
        (x) =>
          `<div class="bar-col"><span>${x.count || ""}</span><div class="bar" style="height:${Math.max((x.count / max) * 180, x.count ? 8 : 2)}px"></div><small>${x.key.slice(5)}/${x.key.slice(2, 4)}</small></div>`,
      )
      .join("");
    chart.classList.toggle("many-bars", buckets.length > 12);
  }
  const chartTotal = document.querySelector(".chart-panel .panel-head b");
  if (chartTotal) chartTotal.textContent = `${items.length} งาน`;
  const metrics = document.querySelectorAll(".path-metric");
  [
    ["duo", paths.duo],
    ["auau", paths.auau],
    ["save", paths.save],
  ].forEach(([k, n], i) => {
    if (metrics[i]) {
      metrics[i].querySelector("span").textContent = `${n} งาน`;
      metrics[i].querySelector("i").style.width =
        `${items.length ? (n / items.length) * 100 : 0}%`;
    }
  });
  const panel = document.querySelector(".upcoming-panel");
  if (panel)
    panel.innerHTML = `<div class="panel-head"><div><small>NEXT SCHEDULE</small><h2>งานถัดไปในช่วงที่เลือก</h2></div><button onclick="adminTab='events';admin()">ดูทั้งหมด</button></div>${
      future
        .slice(0, 5)
        .map(
          (e) =>
            `<div class="dash-upcoming"><div><b>${day(e.date)}</b><span>${month(e.date)}</span></div><p><strong>${e.title}</strong><small>${e.artistId === "duo" ? "#AUAUSAVE" : e.artistId.toUpperCase()} · ${e.place}</small></p><button onclick="openForm('events','${e.id}')">✎</button></div>`,
        )
        .join("") || '<div class="empty">ไม่พบงานในช่วงที่เลือก</div>'
    }`;
}
const renderDashboardOverview = dashboardAdmin;
dashboardAdmin = function () {
  renderDashboardOverview();
  document
    .querySelector(".admin-top")
    ?.insertAdjacentHTML("afterend", dashboardFilterControls());
  applyDashboardRange();
};
function addDashboardNav() {
  const navEl = document.querySelector(".side-nav");
  if (navEl && !navEl.querySelector("[data-dashboard]"))
    navEl.insertAdjacentHTML(
      "afterbegin",
      `<button data-dashboard="true" data-icon="⌂" onclick="adminTab='dashboard';admin()">⌂ &nbsp; Dashboard</button>`,
    );
}
const renderAdminWithEvents = admin;
admin = function () {
  if (adminTab === "dashboard") dashboardAdmin();
  else {
    renderAdminWithEvents();
    addDashboardNav();
  }
};
let adminCalendarView = "list";
function adminCalendarGrid() {
  const [year, monthNum] = adminMonth.split("-").map(Number),
    first = new Date(year, monthNum - 1, 1),
    days = new Date(year, monthNum, 0).getDate(),
    offset = (first.getDay() + 6) % 7,
    cells = [];
  for (let i = 0; i < offset; i++)
    cells.push('<div class="admin-cal-day blank"></div>');
  for (let d = 1; d <= days; d++) {
    const date = `${adminMonth}-${String(d).padStart(2, "0")}`,
      items = db.events.filter(
        (e) =>
          e.date === date &&
          ("all" === adminEventFilter || itemMatchesArtist(e, adminEventFilter)),
      );
    cells.push(
      `<div class="admin-cal-day"><div class="admin-day-head"><b>${d}</b><button onclick="openForm('events')" title="เพิ่มงาน">+</button></div>${items.map((e) => `<button class="admin-cal-chip ${e.artistId}" onclick="openForm('events','${e.id}')"><small>${e.artistId === "duo" ? "#AUAUSAVE" : e.artistId.toUpperCase()}</small>${e.title}</button>`).join("")}</div>`,
    );
  }
  const total = offset + days;
  for (let i = total; i < Math.ceil(total / 7) * 7; i++)
    cells.push('<div class="admin-cal-day blank"></div>');
  return `<div class="admin-calendar-grid"><div class="admin-weekday">จ.</div><div class="admin-weekday">อ.</div><div class="admin-weekday">พ.</div><div class="admin-weekday">พฤ.</div><div class="admin-weekday">ศ.</div><div class="admin-weekday">ส.</div><div class="admin-weekday">อา.</div>${cells.join("")}</div>`;
}
function changeAdminMonth(step) {
  const [y, m] = adminMonth.split("-").map(Number),
    next = new Date(y, m - 1 + step, 1);
  adminMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  admin();
}
const renderAdminEventList = adminEventCalendar;
adminEventCalendar = function () {
  renderAdminEventList();
  const title = document.querySelector(".admin-month-title");
  if (title) {
    title.insertAdjacentHTML(
      "beforeend",
      `<div class="admin-view-tools"><button onclick="changeAdminMonth(-1)">←</button><div class="view-switch"><button class="${adminCalendarView === "list" ? "active" : ""}" onclick="adminCalendarView='list';admin()">☷ รายการ</button><button class="${adminCalendarView === "calendar" ? "active" : ""}" onclick="adminCalendarView='calendar';admin()">▦ ปฏิทิน</button></div><button onclick="changeAdminMonth(1)">→</button></div>`,
    );
  }
  if (adminCalendarView === "calendar") {
    const list = document.querySelector(".admin-event-list");
    if (list)
      list.outerHTML = `<section class="admin-event-list calendar-mode">${adminCalendarGrid()}</section>`;
  }
};
let adminTypeFilter = "all";
function matchesAdminType(event) {
  return eventHasType(event, adminTypeFilter);
}
const renderAdminGridAllTypes = adminCalendarGrid;
adminCalendarGrid = function () {
  if (adminTypeFilter === "all") return renderAdminGridAllTypes();
  const original = db.events;
  db.events = original.filter(matchesAdminType);
  const html = renderAdminGridAllTypes();
  db.events = original;
  return html;
};
const renderAdminCalendarWithView = adminEventCalendar;
adminEventCalendar = function () {
  const originalEvents = db.events;
  if (adminTypeFilter !== "all") db.events = originalEvents.filter(matchesAdminType);
  try {
    renderAdminCalendarWithView();
  } finally {
    db.events = originalEvents;
  }
  document
    .querySelector(".admin-filters")
    ?.insertAdjacentHTML(
      "beforeend",
      `<select class="type-filter-select" onchange="adminTypeFilter=this.value;admin()"><option value="all">ทุก Type</option>${db.masterData.types.map((t) => `<option value="${t.id}" ${adminTypeFilter === t.id ? "selected" : ""}>${t.label}</option>`).join("")}</select>`,
    );
};
function masterAdmin() {
  app.innerHTML = `<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav"><button data-icon="⌂" onclick="adminTab='dashboard';admin()">⌂ &nbsp; Dashboard</button>${Object.entries(
    configs,
  )
    .map(
      ([k, v]) =>
        `<button data-icon="${v.icon}" onclick="adminTab='${k}';admin()">${v.icon} &nbsp; ${v.label}</button>`,
    )
    .join(
      "",
    )}<button data-icon="⚙" class="active">⚙ &nbsp; Master Data</button></div><a class="back" href="#home">← กลับหน้าเว็บไซต์</a></aside><main class="admin-main"><div class="admin-top"><div><small style="color:var(--muted)">SYSTEM SETTINGS</small><h1>ตั้งค่า Master Data</h1></div></div><div class="master-grid"><section class="panel"><div class="panel-head"><div><small>EVENT CLASSIFICATION</small><h2>ประเภทงาน</h2></div><button class="btn" onclick="addMaster('types')">+ เพิ่ม Type</button></div><p class="master-note">ใช้เป็นตัวเลือกมาตรฐานในปฏิทินและ Dashboard</p>${db.masterData.types.map((x) => `<div class="master-row"><span class="master-dot ${x.id}"></span><div><b>${x.label}</b><small>${x.id}</small></div><div class="actions"><button onclick="editMaster('types','${x.id}')">✎</button><button onclick="removeMaster('types','${x.id}')">⌫</button></div></div>`).join("")}</section><section class="panel"><div class="panel-head"><div><small>SERIES LIBRARY</small><h2>รายชื่อซีรีส์</h2></div><button class="btn" onclick="addMaster('series')">+ เพิ่มซีรีส์</button></div><p class="master-note">ใช้เมื่อเลือก Type เป็น Series</p>${db.masterData.series.map((x) => `<div class="master-row"><span class="master-dot series"></span><div><b>${x.label}</b><small>${x.id}</small></div><div class="actions"><button onclick="editMaster('series','${x.id}')">✎</button><button onclick="removeMaster('series','${x.id}')">⌫</button></div></div>`).join("")}</section></div></main></div></div>`;
}
function addMaster(group) {
  const label = prompt(group === "types" ? "ชื่อประเภทงาน" : "ชื่อซีรีส์");
  if (!label) return;
  const id =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || `item_${Date.now()}`;
  if (db.masterData[group].some((x) => x.id === id)) {
    toast("มีข้อมูลนี้อยู่แล้ว");
    return;
  }
  db.masterData[group].push({ id, label });
  save();
  admin();
}
function editMaster(group, id) {
  const item = db.masterData[group].find((x) => x.id === id),
    label = prompt("แก้ไขชื่อ", item.label);
  if (!label) return;
  item.label = label;
  save();
  admin();
}
function removeMaster(group, id) {
  if (!confirm("ยืนยันการลบ Master Data นี้?")) return;
  db.masterData[group] = db.masterData[group].filter((x) => x.id !== id);
  save();
  admin();
}
function addMasterNav() {
  const navEl = document.querySelector(".side-nav");
  if (navEl && !navEl.querySelector("[data-master]"))
    navEl.insertAdjacentHTML(
      "beforeend",
      `<button data-master="true" data-icon="⚙" onclick="adminTab='master';admin()">⚙ &nbsp; Master Data</button>`,
    );
}
const renderAdminBeforeMaster = admin;
admin = function () {
  if (adminTab === "master") masterAdmin();
  else {
    renderAdminBeforeMaster();
    addMasterNav();
  }
};
const renderDashboardWithFilters = dashboardAdmin;
dashboardAdmin = function () {
  renderDashboardWithFilters();
  const counts = sortedEventTypesForSummary().map((t) => ({
    t,
    n: dashboardCurrentRangeItems().filter((e) => eventHasType(e, t.id)).length,
  }));
  document
    .querySelector(".dashboard-stats")
    ?.insertAdjacentHTML(
      "afterend",
      `<section class="dash-type-summary"><div class="dash-type-summary-head"><small>EVENT TYPES</small><h2>สรุปตาม Type</h2></div><div class="dash-type-table dash-type-table-horizontal" style="--type-count:${Math.max(counts.length, 1)}"><div class="dash-type-row head">${counts.map(({ t }) => `<span><i class="master-dot ${t.id}"></i>${escapePageText(t.label)}</span>`).join("")}</div><div class="dash-type-row values">${counts.map(({ t, n }) => `<div class="type-card ${t.id}"><b>${n}</b></div>`).join("")}</div></div></section>`,
    );
};
let publicTypeFilter = "all";
function filterPublicCalendar(value) {
  publicTypeFilter = value;
  document.querySelectorAll(".cal-event").forEach((btn) => {
    const id = (btn.getAttribute("onclick") || "").match(/'([^']+)'/)?.[1],
      event = db.events.find((e) => e.id === id);
    btn.style.display =
      eventHasType(event, value)
        ? "block"
        : "none";
  });
}
const renderCalendarWithType = calendarPage;
calendarPage = function () {
  renderCalendarWithType();
  document
    .querySelector(".calendar-legend")
    ?.insertAdjacentHTML(
      "beforeend",
      `<select class="public-type-filter" onchange="filterPublicCalendar(this.value)"><option value="all">ทุก Type</option>${db.masterData.types.map((t) => `<option value="${t.id}" ${publicTypeFilter === t.id ? "selected" : ""}>${t.label}</option>`).join("")}</select>`,
    );
  filterPublicCalendar(publicTypeFilter);
};
function presenterAdminDate(item) {
  const saved=db.siteSettings?.presenterDates?.[item.id]||{}, day=item.day||saved.day||'', month=item.month||saved.month||'', year=item.year||'';
  return [day,month,year].filter(Boolean).join('/') || '—';
}
function awardDisplayDate(item) {
  const saved=db.siteSettings?.awardDates?.[item.id]||{}, day=item.day||saved.day||'', month=item.month||saved.month||'', year=item.year||'';
  if (!day && !month) return year || '—';
  const monthName=month ? ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][Number(month)-1] : '';
  return [day,monthName,year].filter(Boolean).join(' ');
}
function rowCells(type, x) {
  if (type === "artists")
    return `<td><b>${x.name}</b></td><td>${x.realName || ''}</td><td>${x.nameEN || ''}</td><td>${x.role}</td>`;
  if (type === "events")
    return `<td><b>${x.title}</b></td><td>${artistName(x.artistId)}</td><td>${fmtDate(x.date)}</td>`;
  if (type === "presenters")
    return `<td><b>${x.brand}</b></td><td>${artistName(x.artistId)}</td><td>${presenterAdminDate(x)}</td>`;
  if (type === "awards")
    return `<td><b>${x.title}</b></td><td>${artistName(x.artistId)}</td><td>${awardDisplayDate(x)}</td>`;
  return `<td><b>${x.title}</b></td><td>${artistName(x.artistId)}</td><td>${x.views}</td>`;
}
function legacyBirthToDateInput(value) {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '';
  const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const match=String(value).trim().match(/^(\d{1,2})\s+([^\s]+)\s+(\d{4})$/);
  if (!match) return '';
  const month=months.indexOf(match[2])+1;
  let year=Number(match[3]);
  if (!month) return '';
  if (year > 2400) year-=543;
  return datePartsToInput(match[1],month,year);
}
function formatArtistBirth(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value||'')) return value || '—';
  const [year,month,day]=value.split('-').map(Number);
  return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'long',year:'numeric'}).format(new Date(year,month-1,day));
}
function openForm(type, id) {
  const c = configs[type],
    item = id ? db[type].find((x) => x.id === id) : {};
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>${id ? "แก้ไข" : "เพิ่ม"}${c.label}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="submitForm(event,'${type}','${id || ""}')"><div class="form-grid">${c.fields
      .map(([key, label, kind, isRequired = true]) => {
        let val = item[key] || "";
        if (type === 'artists' && key === 'birth') val=legacyBirthToDateInput(val);
        const required = isRequired === false ? "" : " required";
        if (kind === "artist")
          return `<div class="field"><label>${label}</label><select name="${key}"${required}><option value="">เลือกศิลปิน</option>${sortedArtists().map((a) => `<option value="${a.id}" ${sameArtistId(val,a.id) ? "selected" : ""}>${a.name}</option>`).join("")}</select></div>`;
        if (kind === "textarea")
          return `<div class="field full"><label>${label}</label><textarea name="${key}"${required}>${val}</textarea></div>`;
        if (kind === "awardDay")
          return `<div class="field"><label>${label}</label><select name="${key}"${required}><option value="">เลือกวัน</option>${Array.from({length:31},(_,i)=>i+1).map(day=>`<option value="${day}" ${String(val)===String(day)?"selected":""}>${day}</option>`).join("")}</select></div>`;
        if (kind === "awardMonth")
          return `<div class="field"><label>${label}</label><select name="${key}"${required}><option value="">เลือกเดือน</option>${["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"].map((month,index)=>`<option value="${index+1}" ${String(val)===String(index+1)?"selected":""}>${month}</option>`).join("")}</select></div>`;
        if (kind === "awardYear") {
          const currentYear = new Date().getFullYear();
          return `<div class="field"><label>${label}</label><select name="${key}"${required}><option value="">เลือกปี</option>${Array.from({length:80},(_,i)=>currentYear+2-i).map(year=>`<option value="${year}" ${String(val)===String(year)?"selected":""}>${year}</option>`).join("")}</select></div>`;
        }
        return `<div class="field"><label>${label}</label><input type="${kind || "text"}" name="${key}" value="${val}"${required}></div>`;
      })
      .join(
        "",
      )}</div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกข้อมูล</button></div></form></div></div>`,
  );
}
const renderBaseForm = openForm;
openForm = function (type, id) {
  renderBaseForm(type, id);
  if (type !== "events") return;
  const item = id ? db.events.find((e) => e.id === id) : {},
    typeInput = document.querySelector('#modal [name="type"]');
  if (typeInput) {
    const selectedTypes = eventTypeValues(item.type).map(value => value.toLowerCase());
    typeInput.outerHTML = `<div class="event-type-picker" data-event-type-picker><p>เลือกได้มากกว่า 1 ประเภท</p>${db.masterData.types.map((t) => `<label><input type="checkbox" name="eventType" value="${t.label}" ${selectedTypes.includes(t.id.toLowerCase()) || selectedTypes.includes(t.label.toLowerCase()) ? 'checked' : ''} onchange="updateEventSeriesVisibility()"><span>${t.label}</span></label>`).join('')}</div>`;
  }
  const grid = document.querySelector("#modal .form-grid");
  if (grid)
    grid.insertAdjacentHTML(
      "beforeend",
      `<div class="field series-field" style="display:${eventHasType(item, "series") ? "grid" : "none"}"><label>ซีรีส์</label><select name="seriesId"><option value="">เลือกซีรีส์</option>${db.masterData.series.map((s) => `<option value="${s.id}" ${item.seriesId === s.id ? "selected" : ""}>${s.label}</option>`).join("")}</select></div>`,
    );
};
function updateEventSeriesVisibility() {
  const selected = [...document.querySelectorAll('#modal [name="eventType"]:checked')].map(input => input.value.toLowerCase());
  const field = document.querySelector('#modal .series-field');
  if (field) field.style.display = selected.includes('series') ? 'grid' : 'none';
}
const renderFormWithMaster = openForm;
openForm = function (type, id) {
  renderFormWithMaster(type, id);
  const settings = {
      artists: ["image", "รูปศิลปิน"],
      presenters: ["logo", "โลโก้ / รูปแบรนด์"],
      videos: ["thumbnail", "ภาพปกวิดีโอ"],
      events: ["poster", "โปสเตอร์งาน"],
      awards: ["image", "รูปรางวัล"],
    },
    setting = settings[type];
  if (!setting) return;
  const [field, label] = setting,
    item = id ? db[type].find((x) => x.id === id) : {},
    grid = document.querySelector("#modal .form-grid");
  if (grid)
    grid.insertAdjacentHTML(
      "beforeend",
      imageUploadTemplate(field, label, item[field] || ""),
    );
};
function imageUploadTemplate(field, label, value = "") {
  return `<div class="field full image-upload-field"><label>${label}</label><div class="image-uploader"><div class="upload-preview ${value ? "has-image" : ""}" id="uploadPreview_${field}">${value ? `<img src="${value}" alt="preview">` : "<span>＋<small>เลือกรูปภาพ</small></span>"}</div><div><input type="file" accept="image/jpeg,image/png,image/webp" onchange="handleImageUpload(this,'${field}')"><input type="hidden" name="${field}" value="${value}"><p>รองรับ JPG, PNG, WebP · ระบบจะย่อรูปให้อัตโนมัติ</p>${value ? `<button type="button" class="remove-image" onclick="removeUploadedImage('${field}')">ลบรูปนี้</button>` : ""}</div></div></div>`;
}
const renderFormWithPrimaryImage = openForm;
openForm = function (type, id) {
  renderFormWithPrimaryImage(type, id);
  if (type !== "presenters") return;
  const item = id ? db.presenters.find((x) => x.id === id) : {},
    grid = document.querySelector("#modal .form-grid");
  if (grid)
    grid.insertAdjacentHTML(
      "beforeend",
      imageUploadTemplate(
        "announcementImage",
        "โปสเตอร์ประกาศพรีเซนเตอร์จากแบรนด์",
        item.announcementImage || "",
      ),
    );
};
const renderPresenterImageForm = openForm;
openForm = function (type, id) {
  renderPresenterImageForm(type, id);
  if (type !== "presenters") return;
  const item = id ? db.presenters.find((x) => x.id === id) : {},
    grid = document.querySelector("#modal .form-grid");
  if (grid) {
    grid.insertAdjacentHTML(
      "beforeend",
      videoUploadTemplate(item.announcementVideo || ""),
    );
    grid.insertAdjacentHTML(
      "beforeend",
      `<div class="field media-display-setting"><label>การแสดงรูป/วิดีโอหน้าบ้าน</label><select name="mediaFit"><option value="contain" ${(item.mediaFit || "contain") === "contain" ? "selected" : ""}>แสดงเต็มภาพ — ไม่ครอป</option><option value="cover" ${item.mediaFit === "cover" ? "selected" : ""}>เต็มกรอบ — อาจมีการครอป</option></select></div><div class="field media-display-setting"><label>ตำแหน่งรูป/วิดีโอ</label><select name="mediaPosition"><option value="top" ${item.mediaPosition === "top" ? "selected" : ""}>ด้านบน</option><option value="center" ${(item.mediaPosition || "center") === "center" ? "selected" : ""}>กึ่งกลาง</option><option value="bottom" ${item.mediaPosition === "bottom" ? "selected" : ""}>ด้านล่าง</option></select></div><div class="display-hint full">ค่า “แสดงเต็มภาพ” เหมาะกับโปสเตอร์แนวตั้งและวิดีโอ เพราะจะแสดงภาพครบโดยไม่ตัดขอบ</div>`,
    );
  }
};
function videoUploadTemplate(value = "") {
  return `<div class="field full video-upload-field"><label>วิดีโอประกาศพรีเซนเตอร์จากแบรนด์</label><div class="image-uploader"><div class="upload-preview video-preview ${value ? "has-image" : ""}" id="uploadPreview_announcementVideo">${value ? `<video src="${value}" controls></video>` : "<span>▶<small>เลือกวิดีโอ</small></span>"}</div><div><input type="file" accept="video/mp4,video/webm" onchange="handleVideoUpload(this)"><input type="hidden" name="announcementVideo" value="${value}"><p>รองรับ MP4, WebM · สูงสุด 3 MB สำหรับเว็บต้นแบบ</p>${value ? '<button type="button" class="remove-image" onclick="removeUploadedVideo()">ลบวิดีโอนี้</button>' : ""}</div></div></div>`;
}
const renderFormBeforeYoutubeSettings = openForm;
openForm = function (type, id) {
  renderFormBeforeYoutubeSettings(type, id);
  if (type !== "videos") return;
  const item = id ? db.videos.find((x) => x.id === id) : {},
    grid = document.querySelector("#modal .form-grid");
  if (grid)
    grid.insertAdjacentHTML(
      "beforeend",
      `<div class="field"><label>หมวดวิดีโอ</label><select name="category" required><option value="auau" ${(item.category || "auau") === "auau" ? "selected" : ""}>AUAU</option><option value="dexx" ${item.category === "dexx" ? "selected" : ""}>AUAU · DEXX</option><option value="variety" ${item.category === "variety" ? "selected" : ""}>AUAUSAVE & VARIETY</option></select></div><div class="field"><label>ตั้งเป็นวิดีโอหลัก</label><select name="featured"><option value="no" ${item.featured !== "yes" ? "selected" : ""}>ไม่ใช่</option><option value="yes" ${item.featured === "yes" ? "selected" : ""}>ใช่ — แสดงเป็นวิดีโอหลัก</option></select></div><div class="field full"><label>YouTube Embed URL</label><input name="embedUrl" value="${item.embedUrl || ""}" placeholder="https://www.youtube.com/embed/VIDEO_ID"><small class="form-help">ใช้ลิงก์ /embed/ เพื่อให้เปิดดูได้ทันทีบนเว็บไซต์</small></div>`,
    );
};
function handleVideoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    toast("วิดีโอต้องมีขนาดไม่เกิน 3 MB");
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const hidden = document.querySelector('#modal [name="announcementVideo"]'),
      preview = document.querySelector("#uploadPreview_announcementVideo");
    hidden.value = reader.result;
    preview.classList.add("has-image");
    preview.innerHTML = `<video src="${reader.result}" controls></video>`;
    toast("เตรียมวิดีโอเรียบร้อย กดบันทึกเพื่อยืนยัน");
  };
  reader.readAsDataURL(file);
}
function removeUploadedVideo() {
  document.querySelector('#modal [name="announcementVideo"]').value = "";
  const preview = document.querySelector("#uploadPreview_announcementVideo");
  preview.classList.remove("has-image");
  preview.innerHTML = "<span>▶<small>เลือกวิดีโอ</small></span>";
}
function handleImageUpload(input, field) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    toast("กรุณาเลือกรูปขนาดไม่เกิน 8 MB");
    input.value = "";
    return;
  }
  const submitButton = input.closest('form')?.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.dataset.originalText = submitButton.textContent;
    submitButton.textContent = 'กำลังเตรียมรูป...';
  }
  const finishImageProcessing = () => {
    if (!submitButton) return;
    submitButton.disabled = false;
    submitButton.textContent = submitButton.dataset.originalText || 'บันทึก';
    delete submitButton.dataset.originalText;
  };
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 1200,
        scale = Math.min(1, max / Math.max(img.width, img.height)),
        canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.82),
        hidden = document.querySelector(`#modal [name="${field}"]`),
        preview = document.querySelector(`#uploadPreview_${field}`);
      hidden.value = data;
      preview.classList.add("has-image");
      preview.innerHTML = `<img src="${data}" alt="preview">`;
      finishImageProcessing();
      toast("เตรียมรูปเรียบร้อย กดบันทึกเพื่อยืนยัน");
    };
    img.onerror = () => {
      finishImageProcessing();
      input.value = '';
      toast('ไม่สามารถอ่านไฟล์รูปนี้ได้ กรุณาเลือกรูปใหม่');
    };
    img.src = reader.result;
  };
  reader.onerror = () => {
    finishImageProcessing();
    input.value = '';
    toast('ไม่สามารถอ่านไฟล์รูปนี้ได้ กรุณาเลือกรูปใหม่');
  };
  reader.readAsDataURL(file);
}
function removeUploadedImage(field) {
  document.querySelector(`#modal [name="${field}"]`).value = "";
  const preview = document.querySelector(`#uploadPreview_${field}`);
  preview.classList.remove("has-image");
  preview.innerHTML = "<span>＋<small>เลือกรูปภาพ</small></span>";
}
function closeModal() {
  document.querySelector("#modal")?.remove();
}
function submitForm(e, type, id) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  if (id) {
    Object.assign(
      db[type].find((x) => x.id === id),
      data,
    );
  } else {
    data.id = type[0] + Date.now();
    if (type === "artists") {
      data.color = data.color || "linear-gradient(145deg,#aaa,#555)";
      data.initial = data.initial || data.name[0];
    }
    if (type === "videos")
      data.color = data.color || "linear-gradient(135deg,#777,#222)";
    db[type].push(data);
  }
  save();
  closeModal();
  admin();
  toast("บันทึกข้อมูลเรียบร้อยแล้ว");
}
const submitFormBase = submitForm;
submitForm = function (e, type, id) {
  if (type === "events") {
    const selectedTypes = [...e.target.querySelectorAll('[name="eventType"]:checked')].map(input => input.value);
    if (!selectedTypes.length) {
      e.preventDefault();
      alert('กรุณาเลือกประเภทงานอย่างน้อย 1 ประเภท');
      return;
    }
    e.target.querySelectorAll('[name="eventType"]').forEach(input => input.disabled = true);
    const hiddenType = document.createElement('input');
    hiddenType.type = 'hidden';
    hiddenType.name = 'type';
    hiddenType.value = selectedTypes.join(' | ');
    e.target.appendChild(hiddenType);
  }
  if (type === "videos") {
    const data = new FormData(e.target);
    if (data.get("featured") === "yes")
      db.videos.forEach((v) => (v.featured = "no"));
  }
  submitFormBase(e, type, id);
};
function removeItem(type, id) {
  if (!confirm("ยืนยันการลบข้อมูลนี้?")) return;
  db[type] = db[type].filter((x) => x.id !== id);
  if (type === "artists") {
    db.events = db.events.filter((x) => x.artistId !== id);
    db.awards = db.awards.filter((x) => x.artistId !== id);
    db.presenters = db.presenters.filter((x) => x.artistId !== id);
    db.videos = db.videos.filter((x) => x.artistId !== id);
  }
  save();
  admin();
  toast("ลบข้อมูลแล้ว");
}
function openHomeSettings() {
  const s = db.siteSettings;
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>ตั้งค่ารูปหน้าหลัก</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveHomeSettings(event)"><div class="form-grid">${imageUploadTemplate('heroImage','รูป Hero หน้าหลัก',s.heroImage||'')}<div class="field"><label>การแสดงรูป</label><select name="heroFit"><option value="cover" ${s.heroFit==='cover'?'selected':''}>เต็มกรอบ</option><option value="contain" ${s.heroFit==='contain'?'selected':''}>เต็มภาพ ไม่ครอป</option></select></div><div class="field"><label>ตำแหน่งรูป</label><select name="heroPosition"><option value="top" ${s.heroPosition==='top'?'selected':''}>ด้านบน</option><option value="center" ${s.heroPosition==='center'?'selected':''}>กึ่งกลาง</option><option value="bottom" ${s.heroPosition==='bottom'?'selected':''}>ด้านล่าง</option></select></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกหน้าหลัก</button></div></form></div></div>`);
}
function saveHomeSettings(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  db.siteSettings = {...db.siteSettings,...data};
  save(); closeModal(); toast('บันทึกรูปหน้าหลักแล้ว');
}
const renderHomeWithHeroSettings = home;
home = function () {
  renderHomeWithHeroSettings();
  const hero = document.querySelector('.hero-art'), s = db.siteSettings;
  if (hero && s.heroImage) {
    hero.style.backgroundImage = `url("${s.heroImage}")`;
    hero.style.backgroundSize = s.heroFit || 'cover';
    hero.style.backgroundPosition = s.heroPosition || 'center';
    hero.style.backgroundRepeat = 'no-repeat';
    hero.classList.add('has-custom-image');
  }
};
const renderAdminWithHomeSettings = admin;
admin = function () {
  renderAdminWithHomeSettings();
};

function getHomeSectionElement(id) {
  if (id === 'hero') return document.querySelector('.hero');
  if (id === 'paths') return document.querySelector('.path-section');
  if (id === 'schedule') return document.querySelector('.home-schedules');
  if (id === 'artists') return document.querySelector('#featured');
  if (id === 'presenters') return document.querySelector('.presenter-home');
  if (id === 'youtube') return [...document.querySelectorAll('.section')].find(s => s.querySelector('h2')?.textContent.includes('YouTube'));
  if (id === 'timeline') return document.querySelector('.home-timeline');
}
function applyHomePageBuilder() {
  ensureHomePageSettings();
  const main = document.querySelector('#app main');
  if (!main) return;
  db.siteSettings.homeSections.forEach(section => {
    const element = getHomeSectionElement(section.id);
    if (!element) return;
    element.dataset.homeSection = section.id;
    element.style.display = section.visible === false ? 'none' : '';
    const eyebrow = element.querySelector('.eyebrow');
    const title = element.querySelector(section.id === 'hero' ? 'h1' : '.section-head h2');
    const description = section.id === 'hero' ? element.querySelector('.hero-grid>div>p') : element.querySelector('.section-head p');
    if (eyebrow) eyebrow.textContent = section.eyebrow || '';
    if (title) title.innerHTML = (section.title || '').replace(/\n/g,'<br>');
    if (description && section.description !== undefined) description.textContent = section.description;
    main.appendChild(element);
  });
}
const renderHomeBeforePageBuilder = home;
home = function () { renderHomeBeforePageBuilder(); applyHomePageBuilder(); };

function pageContentAdmin() {
  ensureHomePageSettings();
  const sections = db.siteSettings.homeSections;
  const hero = db.siteSettings;
  const heroSection = sections.find(section => section.id === 'hero');
  app.innerHTML = `<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav"><button data-icon="⌂" onclick="adminTab='dashboard';admin()">⌂ &nbsp; Dashboard</button><button data-icon="▤" class="active">▤ &nbsp; จัดหน้าแรก</button>${Object.entries(configs).map(([k,v])=>`<button data-icon="${v.icon}" onclick="adminTab='${k}';admin()">${v.icon} &nbsp; ${v.label}</button>`).join('')}<button data-icon="⚙" onclick="adminTab='master';admin()">⚙ &nbsp; Master Data</button></div><a class="back" href="#home">← ดูหน้าบ้าน</a></aside><main class="admin-main"><div class="admin-top"><div><small style="color:var(--muted)">HOME PAGE BUILDER</small><h1>จัดการข้อความและลำดับหน้าแรก</h1></div><a class="btn" href="#home">ดูตัวอย่างหน้าบ้าน ↗</a></div><section class="panel home-setting-panel"><div class="panel-head"><div><small>HOMEPAGE PREVIEW & CONTENT</small><h2>ตัวอย่าง หัวข้อ และคำอธิบายหน้าหลัก</h2></div><div class="home-preview-actions"><button class="btn outline" data-home-action="home-copy">แก้ไขหัวข้อและคำอธิบาย</button><button class="btn" data-home-action="hero-settings">เปลี่ยนรูปหน้าหลัก</button></div></div><div class="homepage-preview"><div class="homepage-preview-copy"><small>${heroSection?.eyebrow || 'AUAUSAVE FANBASE'}</small><h3>${(heroSection?.title || 'OUR HOUSE.\nOUR STORY.').replace(/\n/g,'<br>')}</h3><p>${heroSection?.description || 'บ้านแฟนคลับของอู่อู๋เซฟ'}</p></div><div class="hero-setting-preview">${hero.heroImage?`<img src="${hero.heroImage}" style="object-fit:${hero.heroFit};object-position:${hero.heroPosition}">`:'<span>ยังไม่ได้อัปโหลดรูป Hero</span>'}</div></div></section><div class="builder-note">ใช้ปุ่มขึ้นลงเพื่อจัดลำดับ ส่วนที่ซ่อนไว้จะไม่ปรากฏบนหน้าบ้าน</div><section class="section-builder-list">${sections.map((s,i)=>`<article class="builder-item ${s.visible===false?'is-hidden':''}"><div class="builder-order"><button data-home-action="move" data-index="${i}" data-direction="-1" ${i===0?'disabled':''}>↑</button><span>${String(i+1).padStart(2,'0')}</span><button data-home-action="move" data-index="${i}" data-direction="1" ${i===sections.length-1?'disabled':''}>↓</button></div><div class="builder-content"><small>${s.id.toUpperCase()}</small><h3>${s.title.replace(/\n/g,' / ')}</h3><p>${s.description||'ไม่มีคำอธิบาย'}</p></div><div class="builder-actions"><button class="visibility-btn" data-home-action="toggle" data-section-id="${s.id}">${s.visible===false?'○ ซ่อนอยู่':'● แสดงอยู่'}</button><button class="btn outline" data-home-action="edit" data-section-id="${s.id}">แก้ไขข้อความ</button></div></article>`).join('')}</section></main></div></div>`;
  app.querySelector('[data-home-action="edit"][data-section-id="hero"]')?.remove();
  app.querySelectorAll('[data-home-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.homeAction;
    if (action === 'move') moveHomeSection(Number(button.dataset.index), Number(button.dataset.direction));
    if (action === 'toggle') toggleHomeSection(button.dataset.sectionId);
    if (action === 'edit') editHomeSection(button.dataset.sectionId);
    if (action === 'home-copy') openPageTextEditor('home','en');
    if (action === 'hero-settings') openHomeSettings();
  }));
  document.querySelector('.builder-note')?.insertAdjacentHTML('beforebegin', renderHomeCardSettings());
  if (!['preview', 'cards', 'order'].includes(homeBuilderTab)) homeBuilderTab = 'preview';
  document.querySelector('.admin-top')?.insertAdjacentHTML('afterend', `<nav class="home-builder-tabs" aria-label="เมนูจัดหน้าแรก"><button class="${homeBuilderTab==='preview'?'active':''}" onclick="homeBuilderTab='preview';pageContentAdmin()">ตัวอย่างและข้อความหลัก</button><button class="${homeBuilderTab==='cards'?'active':''}" onclick="homeBuilderTab='cards';pageContentAdmin()">ข้อความในการ์ด</button><button class="${homeBuilderTab==='order'?'active':''}" onclick="homeBuilderTab='order';pageContentAdmin()">จัดลำดับ</button></nav>`);
  const homeBuilderPanels = {
    preview: [document.querySelector('.home-setting-panel')],
    cards: [document.querySelector('.home-card-settings')],
    order: [document.querySelector('.builder-note'), document.querySelector('.section-builder-list')],
  };
  Object.entries(homeBuilderPanels).forEach(([tab, panels]) => panels.forEach(panel => {
    if (panel) panel.style.display = tab === homeBuilderTab ? '' : 'none';
  }));
  applyInterfaceLanguage();
}
function renderHomeCardSettings() {
  ensureLocalizationSettings();
  return `<section class="panel home-card-settings"><div class="panel-head"><div><small>HOMEPAGE CARD CONTENT</small><h2>ข้อความในการ์ดหน้าแรก</h2><p class="master-note">แก้ไขข้อความบนการ์ดพาสและการ์ดตารางงาน</p></div></div><div class="home-card-setting-grid">${Object.entries(db.siteSettings.homeCards).map(([id,card])=>`<article><div><small>${card.eyebrow}</small><h3>${card.label}</h3><p>${card.title}</p></div><button class="btn outline" onclick="openHomeCardEditor('${id}')">แก้ไขคำ</button></article>`).join('')}</div></section>`;
}
function openHomeCardEditor(id) {
  const card = db.siteSettings.homeCards[id];
  if (!card) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>แก้ไข${card.label}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveHomeCard(event,'${id}')"><div class="form-grid"><div class="field full"><label>ข้อความด้านบน</label><input name="eyebrow" value="${escapePageText(card.eyebrow)}"></div><div class="field full"><label>หัวข้อการ์ด</label><input name="title" value="${escapePageText(card.title)}" required></div><div class="field full"><label>คำอธิบาย</label><textarea name="description">${escapePageText(card.description)}</textarea></div>${id==='couplePath'?`<div class="field full"><label>ข้อความปุ่ม</label><input name="cta" value="${escapePageText(card.cta)}"></div>`:''}</div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกข้อความ</button></div></form></div></div>`);
}
function saveHomeCard(event,id) {
  event.preventDefault();
  Object.assign(db.siteSettings.homeCards[id], Object.fromEntries(new FormData(event.currentTarget)));
  save(); closeModal(); pageContentAdmin(); toast('บันทึกข้อความในการ์ดแล้ว');
}
function applyHomeCardContent() {
  ensureLocalizationSettings();
  const setText = (root, selectors, card) => {
    if (!root || !card) return;
    Object.entries(selectors).forEach(([field,selector]) => {
      const element = root.querySelector(selector);
      if (element && card[field] !== undefined) element.textContent = card[field];
    });
  };
  setText(document.querySelector('.path-card.couple'),{eyebrow:':scope > span',title:'h3',description:'p',cta:':scope > b'},db.siteSettings.homeCards.couplePath);
  setText(document.querySelector('.path-card.solo'),{eyebrow:':scope > span',title:'h3',description:'p'},db.siteSettings.homeCards.soloPath);
  setText(document.querySelector('.schedule-card.duo-card .schedule-card-head'),{eyebrow:'span',title:'h3',description:'p'},db.siteSettings.homeCards.scheduleDuo);
  setText(document.querySelector('.schedule-card.auau-card .schedule-card-head'),{eyebrow:'span',title:'h3',description:'p'},db.siteSettings.homeCards.scheduleAuau);
  setText(document.querySelector('.schedule-card.save-card .schedule-card-head'),{eyebrow:'span',title:'h3',description:'p'},db.siteSettings.homeCards.scheduleSave);
}
function escapePageText(value = '') {
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function renderPageLanguageSettings(onlyPage = '') {
  ensureLocalizationSettings();
  const labels = {home:'หน้าแรก',artists:'ศิลปิน',schedule:'ปฏิทินงาน',presenters:'พรีเซนเตอร์',awards:'รางวัล',videos:'YouTube'};
  const pages = Object.entries(labels).filter(([page]) => !onlyPage || page === onlyPage);
  const heading = onlyPage ? `หัวข้อและคำอธิบายหน้า${labels[onlyPage]}` : 'จัดการหัวข้อและคำอธิบายรายหน้า';
  return `<section class="panel bilingual-settings" data-page-content-settings="${onlyPage || 'all'}"><div class="panel-head"><div><small>PAGE CONTENT SETTINGS</small><h2>${heading}</h2><p class="master-note">ข้อความที่บันทึกจะแสดงเป็นภาษาอังกฤษบนหน้าบ้าน</p></div>${onlyPage ? `<button class="btn outline" onclick="openPageTextEditor('${onlyPage}','en')">แก้ไขข้อความ</button>` : ''}</div><div class="bilingual-page-grid ${onlyPage ? 'single-page' : ''}">${pages.map(([page,label])=>`<article><div><small>${page.toUpperCase()}</small><h3>${label}</h3><p>${db.siteSettings.pageContent[page].en.title.replace(/\n/g,' / ')}</p></div>${onlyPage ? '' : `<div class="page-language-actions"><button onclick="openPageTextEditor('${page}','en')">แก้ไขข้อความ</button></div>`}</article>`).join('')}</div></section>`;
}
function insertPageContentSettingsForAdminTab() {
  const pageByTab = {artists:'artists',events:'schedule',presenters:'presenters',awards:'awards',videos:'videos'};
  const page = pageByTab[adminTab];
  const top = document.querySelector('.admin-main .admin-top');
  if (!page || !top || document.querySelector('[data-page-content-settings]')) return;
  top.insertAdjacentHTML('afterend', renderPageLanguageSettings(page));
}
function openPageTextEditor(page, language) {
  const content = db.siteSettings.pageContent[page][language];
  const label = language === 'th' ? 'ภาษาไทย' : 'English';
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>แก้ไข ${page.toUpperCase()} · ${label}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="savePageText(event,'${page}','${language}')"><div class="form-grid"><div class="field full"><label>คำโปรยด้านบน / Eyebrow</label><input name="eyebrow" value="${escapePageText(content.eyebrow)}"></div><div class="field full"><label>หัวข้อ / Title</label><textarea name="title" required>${escapePageText(content.title)}</textarea></div><div class="field full"><label>คำอธิบาย / Description</label><textarea name="description" required>${escapePageText(content.description)}</textarea></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกข้อความ</button></div></form></div></div>`);
}
function savePageText(event, page, language) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  db.siteSettings.pageContent[page][language] = data;
  if (page === 'home' && language === 'en') {
    const hero = db.siteSettings.homeSections.find(section => section.id === 'hero');
    if (hero) Object.assign(hero, data);
  }
  save(); closeModal();
  if (page === 'home') pageContentAdmin(); else admin();
  toast('บันทึกข้อความแล้ว');
}
function moveHomeSection(index,direction) {
  const list=db.siteSettings.homeSections,target=index+direction;
  if(target<0||target>=list.length)return;
  [list[index],list[target]]=[list[target],list[index]]; save(); pageContentAdmin();
}
function toggleHomeSection(id) {
  const section=db.siteSettings.homeSections.find(s=>s.id===id);
  section.visible=section.visible===false; save(); pageContentAdmin();
}
function editHomeSection(id) {
  const s=db.siteSettings.homeSections.find(x=>x.id===id);
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>แก้ไข ${s.label}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveHomeSection(event,'${id}')"><div class="form-grid"><div class="field full"><label>คำโปรยด้านบน</label><input name="eyebrow" value="${s.eyebrow||''}"></div><div class="field full"><label>หัวข้อหลัก</label><textarea name="title" required>${s.title||''}</textarea><small class="form-help">กดขึ้นบรรทัดใหม่เพื่อแบ่งหัวข้อเป็นหลายบรรทัด</small></div><div class="field full"><label>คำอธิบาย</label><textarea name="description">${s.description||''}</textarea></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกข้อความ</button></div></form></div></div>`);
}
function saveHomeSection(event,id) {
  event.preventDefault(); const data=Object.fromEntries(new FormData(event.target));
  Object.assign(db.siteSettings.homeSections.find(s=>s.id===id),data);
  if (id === 'hero') db.siteSettings.pageContent.home.en = {...db.siteSettings.pageContent.home.en, ...data};
  save(); closeModal(); pageContentAdmin(); toast('บันทึกข้อความแล้ว');
}
function addPageBuilderNav() {
  const nav=document.querySelector('.side-nav');
  if(nav&&!nav.querySelector('[data-page-builder]')) nav.querySelector('button')?.insertAdjacentHTML('afterend',`<button data-page-builder="true" data-icon="▤" onclick="adminTab='pagecontent';admin()">▤ &nbsp; จัดหน้าแรก</button>`);
}
const renderAdminBeforePageBuilder = admin;
admin = function () {
  if (adminTab === 'pagecontent') pageContentAdmin();
  else { renderAdminBeforePageBuilder(); addPageBuilderNav(); }
};

function openDatabaseLogin() {
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>เชื่อมต่อฐานข้อมูล</h2><button class="close" onclick="closeModal()">×</button></div><p style="color:var(--muted)">เข้าสู่ระบบด้วยบัญชี Admin ที่สร้างไว้ใน Supabase Authentication</p><form onsubmit="databaseLogin(event)"><div class="form-grid"><div class="field full"><label>อีเมล</label><input name="email" type="email" required></div><div class="field full"><label>รหัสผ่าน</label><input name="password" type="password" required></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">เข้าสู่ระบบและซิงก์</button></div></form></div></div>`);
}
async function databaseLogin(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const button = event.target.querySelector('[type="submit"]');
  button.disabled = true; button.textContent = 'กำลังเชื่อมต่อ...';
  try {
    const { error } = await window.auausaveDB.signIn(form.get('email'), form.get('password'));
    if (error) throw error;
    await window.auausaveDB.save(db);
    closeModal(); toast('เชื่อมต่อและย้ายข้อมูลขึ้น Supabase แล้ว');
  } catch (error) {
    alert(`เชื่อมต่อไม่สำเร็จ: ${error.message}`);
    button.disabled = false; button.textContent = 'เข้าสู่ระบบและซิงก์';
  }
}
const renderAdminWithDbStatus = admin;
admin = function () {
  renderAdminWithDbStatus();
  if (adminTab === 'dashboard') {
    document.querySelector('.admin-top')?.insertAdjacentHTML('beforeend', `<button class="btn db-connect-btn" onclick="openDatabaseLogin()">◉ เชื่อม Supabase</button>`);
  }
};

let adminAuthenticated = false;
let currentAdminEmail = '';
let adminAuthRequest = 0;
let adminDatabaseLoaded = false;
let adminDatabaseStatus = 'กำลังเชื่อมต่อ Supabase...';

const renderAdminWithAuthControls = admin;
admin = function () {
  renderAdminWithAuthControls();
  if (!adminAuthenticated) return;
  insertPageContentSettingsForAdminTab();
  document.querySelector('.db-connect-btn')?.remove();
  const main = document.querySelector('.admin-main');
  if (main && !main.querySelector('.admin-global-header')) main.insertAdjacentHTML('afterbegin', `<header class="admin-global-header"><div class="admin-global-title"><span>ADMIN</span><strong>AUAUSAVE HOUSE</strong></div><div class="admin-global-actions"><span class="admin-db-status ${adminDatabaseLoaded ? 'is-connected' : 'has-error'}"><i></i>${adminDatabaseStatus}</span>${currentAdminEmail?`<span class="admin-user-email" title="${escapePageText(currentAdminEmail)}"><b>●</b>${escapePageText(currentAdminEmail)}</span>`:''}<a href="#home">ดูหน้าบ้าน ↗</a><button class="btn outline admin-logout-btn" onclick="adminSignOut()">ออกจากระบบ</button></div></header>`);
  applyInterfaceLanguage();
};

function youtubeCategoryAdminPanel() {
  const categories = db.siteSettings.youtubeCategories;
  return `<section class="panel youtube-category-admin"><div class="panel-head"><div><small>YOUTUBE SECTIONS & ORDER</small><h2>จัดหัวข้อและลำดับ YouTube</h2><p class="master-note">สร้างหัวข้อเอง แล้วเพิ่มวิดีโอหรือลิงก์ไว้ภายใต้หัวข้อที่ต้องการ</p></div><button class="btn" onclick="openYoutubeCategoryForm()">+ สร้างหัวข้อ</button></div><div class="youtube-admin-sections">${categories.map((category, categoryIndex) => {
    const videos = db.videos.filter(video => video.category === category.id);
    return `<article class="youtube-admin-section"><div class="youtube-admin-section-head"><div class="builder-order"><button onclick="moveYoutubeCategory('${category.id}',-1)" ${categoryIndex===0?'disabled':''}>↑</button><span>${String(categoryIndex+1).padStart(2,'0')}</span><button onclick="moveYoutubeCategory('${category.id}',1)" ${categoryIndex===categories.length-1?'disabled':''}>↓</button></div><div><h3>${category.title}</h3><p>${category.description || 'ไม่มีคำอธิบาย'} · ${videos.length} วิดีโอ</p></div><div class="actions"><button class="btn outline" onclick="openForm('videos')">+ เพิ่มวิดีโอ</button><button class="icon-btn" onclick="openYoutubeCategoryForm('${category.id}')">✎ แก้ไข</button><button class="icon-btn" onclick="removeYoutubeCategory('${category.id}')">⌫</button></div></div><div class="youtube-admin-video-list">${videos.map((video, videoIndex)=>`<div><span>${video.title}</span><div class="actions"><button class="icon-btn" onclick="moveYoutubeVideo('${video.id}',-1)" ${videoIndex===0?'disabled':''}>↑</button><button class="icon-btn" onclick="moveYoutubeVideo('${video.id}',1)" ${videoIndex===videos.length-1?'disabled':''}>↓</button><button class="icon-btn" onclick="openForm('videos','${video.id}')">✎</button></div></div>`).join('') || '<p class="empty">ยังไม่มีวิดีโอในหัวข้อนี้</p>'}</div></article>`;
  }).join('')}</div></section>`;
}

function openYoutubeCategoryForm(id = '') {
  const category = db.siteSettings.youtubeCategories.find(item => item.id === id) || {};
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>${id?'แก้ไข':'สร้าง'}หัวข้อ YouTube</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveYoutubeCategory(event,'${id}')"><div class="form-grid"><div class="field full"><label>ชื่อหัวข้อ</label><input name="title" value="${escapePageText(category.title || '')}" required></div><div class="field full"><label>คำอธิบาย</label><textarea name="description">${escapePageText(category.description || '')}</textarea></div><div class="field"><label>ข้อความปุ่มลิงก์ (ถ้ามี)</label><input name="linkLabel" value="${escapePageText(category.linkLabel || '')}" placeholder="Open channel ↗"></div><div class="field"><label>ลิงก์ประจำหัวข้อ (ถ้ามี)</label><input name="linkUrl" type="url" value="${escapePageText(category.linkUrl || '')}" placeholder="https://..."></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกหัวข้อ</button></div></form></div></div>`);
}

function saveYoutubeCategory(event, id = '') {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (id) Object.assign(db.siteSettings.youtubeCategories.find(item => item.id === id), values);
  else {
    const base = values.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'section';
    let newId = base, suffix = 2;
    while (db.siteSettings.youtubeCategories.some(item => item.id === newId)) newId = `${base}-${suffix++}`;
    db.siteSettings.youtubeCategories.push({id:newId, ...values});
  }
  save(); closeModal(); admin(); toast('บันทึกหัวข้อ YouTube แล้ว');
}

function moveYoutubeCategory(id, direction) {
  const list = db.siteSettings.youtubeCategories, index = list.findIndex(item => item.id === id), target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  save(); admin();
}

function moveYoutubeVideo(id, direction) {
  const video = db.videos.find(item => item.id === id);
  if (!video) return;
  const categoryVideos = db.videos.filter(item => item.category === video.category), index = categoryVideos.findIndex(item => item.id === id), target = index + direction;
  if (target < 0 || target >= categoryVideos.length) return;
  const firstIndex = db.videos.indexOf(categoryVideos[index]), secondIndex = db.videos.indexOf(categoryVideos[target]);
  [db.videos[firstIndex], db.videos[secondIndex]] = [db.videos[secondIndex], db.videos[firstIndex]];
  save(); admin();
}

function removeYoutubeCategory(id) {
  const count = db.videos.filter(video => video.category === id).length;
  if (count) { toast('กรุณาย้ายหรือลบวิดีโอในหัวข้อนี้ก่อน'); return; }
  if (!confirm('ยืนยันการลบหัวข้อนี้?')) return;
  db.siteSettings.youtubeCategories = db.siteSettings.youtubeCategories.filter(item => item.id !== id);
  save(); admin();
}

const renderFormWithDynamicYoutubeCategories = openForm;
openForm = function (type, id) {
  renderFormWithDynamicYoutubeCategories(type, id);
  if (type !== 'videos') return;
  const item = id ? db.videos.find(video => video.id === id) : {};
  const select = document.querySelector('#modal select[name="category"]');
  if (select) select.innerHTML = db.siteSettings.youtubeCategories.map(category => `<option value="${category.id}" ${(item.category || db.siteSettings.youtubeCategories[0]?.id) === category.id ? 'selected' : ''}>${category.title}</option>`).join('');
};

const renderFormWithMultiArtists = openForm;
openForm = function (type, id) {
  renderFormWithMultiArtists(type, id);
  if (!['events','presenters','awards'].includes(type)) return;
  const item = id ? db[type].find(entry => entry.id === id) : {};
  const select = document.querySelector('#modal select[name="artistId"]');
  if (!select) return;
  const selected = (item.artistId ? [item.artistId] : []).map(canonicalArtistId);
  select.outerHTML = `<div class="multi-artist-picker" data-multi-artist-picker><p>เลือกได้มากกว่า 1 ศิลปิน</p><input type="hidden" name="artistId" value="${canonicalArtistId(item.artistId || '')}">${sortedArtists().map(artist=>`<label><input type="checkbox" name="artistChoice" value="${artist.id}" ${selected.includes(canonicalArtistId(artist.id))?'checked':''} onchange="syncMultiArtistSelection(this)"><span>${escapePageText(sameArtistId(artist.id,'duo')?'#AUAUSAVE':artist.name)}${sameArtistId(artist.id,'duo')?'<small>เพิ่มให้ AUAU และ SAVE อัตโนมัติ</small>':''}</span></label>`).join('')}</div>`;
  syncMultiArtistSelection();
};

function syncMultiArtistSelection(changed) {
  const picker = document.querySelector('#modal [data-multi-artist-picker]');
  if (!picker) return;
  const checks = [...picker.querySelectorAll('[name="artistChoice"]')];
  if (changed?.checked && sameArtistId(changed.value,'duo')) checks.forEach(check => { if (check !== changed) check.checked = false; });
  if (changed?.checked && !sameArtistId(changed.value,'duo')) {
    const duo = checks.find(check => sameArtistId(check.value,'duo'));
    if (duo) duo.checked = false;
  }
  const selected = checks.filter(check => check.checked).map(check => canonicalArtistId(check.value));
  const artistId = selected.includes('AT01') || (selected.includes('AT02') && selected.includes('AT03')) ? 'AT01' : selected[0] || '';
  picker.querySelector('[name="artistId"]').value = artistId;
  checks[0]?.setCustomValidity(artistId ? '' : 'กรุณาเลือกศิลปินอย่างน้อย 1 คน');
}

const renderPresenterPageWithMultiArtists = presenterPage;
presenterPage = function () {
  renderPresenterPageWithMultiArtists();
  const duoGroup = document.querySelector('.presenter-group'), soloGroups = document.querySelectorAll('.presenter-solo > div');
  if (duoGroup) duoGroup.innerHTML = `<h2>#AUAUSAVE</h2>${presenterCards(db.presenters.filter(item => itemMatchesArtist(item, 'AT01')))}`;
  if (soloGroups[0]) soloGroups[0].innerHTML = `<h2>AUAU</h2>${presenterCards(db.presenters.filter(item => itemMatchesArtist(item, 'AT02') && !itemMatchesArtist(item, 'AT01')))}`;
  if (soloGroups[1]) soloGroups[1].innerHTML = `<h2>SAVE</h2>${presenterCards(db.presenters.filter(item => itemMatchesArtist(item, 'AT03') && !itemMatchesArtist(item, 'AT01')))}`;
};

const renderAdminWithYoutubeManager = admin;
admin = function () {
  if (adminTab === 'videos' && previousAdminTab !== 'videos') youtubeAdminTab = 'content';
  renderAdminWithYoutubeManager();
  previousAdminTab = adminTab;
  if (!adminAuthenticated || adminTab !== 'videos') return;
  document.querySelector('.admin-main .admin-top')?.insertAdjacentHTML('afterend', youtubeCategoryAdminPanel());
  if (!['content','sections','records'].includes(youtubeAdminTab)) youtubeAdminTab = 'content';
  const top = document.querySelector('.admin-main .admin-top');
  top?.insertAdjacentHTML('afterend', `<nav class="home-builder-tabs youtube-admin-tabs" aria-label="เมนูจัดการ YouTube"><button class="${youtubeAdminTab==='content'?'active':''}" onclick="youtubeAdminTab='content';admin()">หัวข้อและคำอธิบาย</button><button class="${youtubeAdminTab==='sections'?'active':''}" onclick="youtubeAdminTab='sections';admin()">จัดหัวข้อและลำดับ YouTube</button><button class="${youtubeAdminTab==='records'?'active':''}" onclick="youtubeAdminTab='records';admin()">ข้อมูลทั้งหมด</button></nav>`);
  const panels = {
    content: document.querySelector('[data-page-content-settings="videos"]'),
    sections: document.querySelector('.youtube-category-admin'),
    records: document.querySelector('.data-table')?.closest('.panel'),
  };
  Object.entries(panels).forEach(([tab, panel]) => {
    if (panel) panel.style.display = tab === youtubeAdminTab ? '' : 'none';
  });
};

function yearlyOrderPanel(type) {
  const items = db[type], years = [...new Set(items.map(item => String(item.year || 'ไม่ระบุปี'))) ].sort((a,b) => Number(b) - Number(a));
  const label = type === 'presenters' ? 'พรีเซนเตอร์' : 'รางวัล';
  return `<section class="panel yearly-order-admin"><div class="panel-head"><div><small>YEAR & DISPLAY ORDER</small><h2>จัด${label}ตามปีและลำดับ</h2><p class="master-note">รายการจะแยกตามปี และเลื่อนขึ้น–ลงได้ภายในปีเดียวกัน</p></div><button class="btn" onclick="openForm('${type}')">+ เพิ่ม${label}</button></div><div class="youtube-admin-sections">${years.map(year => {
    const yearItems = items.filter(item => String(item.year || 'ไม่ระบุปี') === year);
    return `<article class="youtube-admin-section"><div class="yearly-admin-year"><div><small>YEAR</small><h3>${year}</h3></div><span>${yearItems.length} รายการ</span></div><div class="youtube-admin-video-list">${yearItems.map((item,index)=>`<div><div><strong>${type==='presenters' ? item.brand : item.title}</strong><small>${type==='presenters'?`${presenterAdminDate(item)} · `:''}${artistName(item.artistId)}${type==='awards' && item.org ? ` · ${item.org}` : ''}</small></div><div class="actions"><button class="icon-btn" onclick="moveYearlyItem('${type}','${item.id}',-1)" ${index===0?'disabled':''}>↑</button><button class="icon-btn" onclick="moveYearlyItem('${type}','${item.id}',1)" ${index===yearItems.length-1?'disabled':''}>↓</button><button class="icon-btn" onclick="openForm('${type}','${item.id}')">✎</button></div></div>`).join('')}</div></article>`;
  }).join('') || '<div class="empty">ยังไม่มีข้อมูล</div>'}</div></section>`;
}

function moveYearlyItem(type, id, direction) {
  const item = db[type].find(entry => entry.id === id);
  if (!item) return;
  const sameYear = db[type].filter(entry => String(entry.year) === String(item.year));
  const index = sameYear.findIndex(entry => entry.id === id), target = index + direction;
  if (target < 0 || target >= sameYear.length) return;
  const firstIndex = db[type].indexOf(sameYear[index]), secondIndex = db[type].indexOf(sameYear[target]);
  [db[type][firstIndex], db[type][secondIndex]] = [db[type][secondIndex], db[type][firstIndex]];
  save(); admin();
}

const renderAdminWithYearlyManagers = admin;
admin = function () {
  const isYearlyPage = adminTab === 'presenters' || adminTab === 'awards';
  if (isYearlyPage && previousYearlyAdminTab !== adminTab) yearlyAdminTabs[adminTab] = 'content';
  renderAdminWithYearlyManagers();
  previousYearlyAdminTab = adminTab;
  if (!adminAuthenticated || !isYearlyPage) return;
  const type = adminTab, page = type === 'presenters' ? 'presenters' : 'awards';
  document.querySelector('.admin-main .admin-top')?.insertAdjacentHTML('afterend', yearlyOrderPanel(type));
  const selected = yearlyAdminTabs[type];
  document.querySelector('.admin-main .admin-top')?.insertAdjacentHTML('afterend', `<nav class="home-builder-tabs yearly-admin-tabs" aria-label="เมนูจัดการ${type==='presenters'?'พรีเซนเตอร์':'รางวัล'}"><button class="${selected==='content'?'active':''}" onclick="yearlyAdminTabs.${type}='content';admin()">หัวข้อและคำอธิบาย</button><button class="${selected==='order'?'active':''}" onclick="yearlyAdminTabs.${type}='order';admin()">จัดตามปีและลำดับ</button><button class="${selected==='records'?'active':''}" onclick="yearlyAdminTabs.${type}='records';admin()">ข้อมูลทั้งหมด</button></nav>`);
  const panels = {
    content: document.querySelector(`[data-page-content-settings="${page}"]`),
    order: document.querySelector('.yearly-order-admin'),
    records: document.querySelector('.data-table')?.closest('.panel'),
  };
  Object.entries(panels).forEach(([tab,panel]) => { if (panel) panel.style.display = tab === selected ? '' : 'none'; });
};

let artistAdminTab = 'content';
function artistArchiveAdminPanel() {
  return `<section class="panel artist-archive-admin"><div class="panel-head"><div><small>ARTIST PAGE CONTENT</small><h2>จัดการ Series</h2><p class="master-note">เพิ่มปี รายละเอียด และลิงก์ได้หลายรายการในแต่ละซีรีส์</p></div></div>${sortedArtists().map(artist=>{const data=db.siteSettings.artistArchive[artist.id];return `<article class="archive-admin-artist"><h3>${artist.name}</h3><div class="archive-visibility"><b>การแสดงผลหน้าบ้าน</b><div>${['series','events','awards'].map(kind=>`<label><input type="checkbox" ${data.visibility[kind]!==false?'checked':''} onchange="toggleArtistArchiveSection('${artist.id}','${kind}',this.checked)"><span>${kind[0].toUpperCase()+kind.slice(1)}</span></label>`).join('')}</div></div><div class="archive-admin-kind"><div><b>SERIES</b><button type="button" data-archive-add="${artist.id}-series" onclick="openArtistArchiveItemForm('${artist.id}','series')">+ เพิ่ม</button></div>${data.series.map((item,index)=>`<p><span>${item.year?`<small>${escapePageText(item.year)}</small> `:''}${escapePageText(item.title)}</span><span><button onclick="moveArtistArchiveItem('${artist.id}','series',${index},-1)" ${index===0?'disabled':''}>↑</button><button onclick="moveArtistArchiveItem('${artist.id}','series',${index},1)" ${index===data.series.length-1?'disabled':''}>↓</button><button title="แก้ไข" onclick="openArtistArchiveItemForm('${artist.id}','series',${index})">✎</button><button title="คัดลอกไปศิลปินอื่น" onclick="copyArtistArchiveItem('${artist.id}','series',${index})">⧉</button><button title="ลบ" onclick="removeArtistArchiveItem('${artist.id}','series',${index})">⌫</button></span></p>`).join('')||'<small>ยังไม่มีข้อมูล</small>'}</div></article>`}).join('')}</section>`;
}
function toggleArtistArchiveSection(artistId,kind,visible){db.siteSettings.artistArchive[artistId].visibility[kind]=visible;save();toast(`${visible?'เปิด':'ปิด'} ${kind[0].toUpperCase()+kind.slice(1)} แล้ว`);}

const artistPageSectionDefs={timeline:{label:'Timeline',visibilityKey:'series'},events:{label:'Events',visibilityKey:'events'},awards:{label:'Awards',visibilityKey:'awards'}};
function artistPageSectionManager(){ensureHomePageSettings();return `<section class="panel"><div class="panel-head"><div><small>ARTIST PAGE LAYOUT</small><h2>ลำดับและการแสดงผล</h2><p class="master-note">จัดลำดับและเปิดหรือปิดส่วนต่าง ๆ แยกตามหน้าศิลปิน</p></div></div><div class="artist-section-manager-grid">${sortedArtists().map(artist=>{const archive=db.siteSettings.artistArchive[artist.id];return `<article class="artist-section-manager-card"><h3>${escapePageText(artist.name)}</h3><div class="artist-section-manager-list">${archive.sectionOrder.map((kind,index)=>{const def=artistPageSectionDefs[kind];const visible=archive.visibility[def.visibilityKey]!==false;return `<div class="artist-section-manager-row"><span class="artist-section-order">${String(index+1).padStart(2,'0')}</span><b>${def.label}</b><span class="artist-section-actions"><button type="button" onclick="moveArtistPageSection('${artist.id}','${kind}',-1)" ${index===0?'disabled':''} aria-label="เลื่อนขึ้น">↑</button><button type="button" onclick="moveArtistPageSection('${artist.id}','${kind}',1)" ${index===archive.sectionOrder.length-1?'disabled':''} aria-label="เลื่อนลง">↓</button><label class="artist-section-switch"><input type="checkbox" ${visible?'checked':''} onchange="toggleArtistPageSection('${artist.id}','${kind}',this.checked)"><span>${visible?'แสดง':'ซ่อน'}</span></label></span></div>`}).join('')}</div></article>`}).join('')}</div></section>`;}
function moveArtistPageSection(artistId,kind,direction){ensureHomePageSettings();const order=db.siteSettings.artistArchive[artistId].sectionOrder;const from=order.indexOf(kind),to=from+direction;if(from<0||to<0||to>=order.length)return;[order[from],order[to]]=[order[to],order[from]];save();admin();toast('บันทึกลำดับแล้ว');}
function toggleArtistPageSection(artistId,kind,visible){ensureHomePageSettings();const def=artistPageSectionDefs[kind];if(!def)return;db.siteSettings.artistArchive[artistId].visibility[def.visibilityKey]=visible;save();admin();toast(`${visible?'เปิด':'ปิด'} ${def.label} แล้ว`);}
function openArtistArchiveItemForm(artistId,kind,index=''){
  const editing=index!=='';const item=editing?(db.siteSettings.artistArchive[artistId][kind][Number(index)]||{}):{};const artist=db.artists.find(a=>a.id===artistId);
  const galleryFields=kind==='series'?`${imageUploadTemplate('poster','โปสเตอร์ซีรีส์',item.poster||'')}<div class="field"><label>ปี</label><input name="year" type="number" min="1900" max="2200" value="${escapePageText(item.year||'')}" placeholder="2026"></div><div class="field full"><label>ลิงก์ (หนึ่งลิงก์ต่อหนึ่งบรรทัด)</label><textarea name="links" placeholder="https://...&#10;https://...">${escapePageText((item.links?.length?item.links:(item.url?[item.url]:[])).join('\n'))}</textarea><small>เพิ่มได้มากกว่า 1 ลิงก์ โดยกด Enter เพื่อขึ้นบรรทัดใหม่</small></div>`:`<div class="field full"><label>ลิงก์ต้นทาง (ถ้ามี)</label><input name="url" type="url" value="${escapePageText(item.url||'')}" placeholder="https://..."></div>`;
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>${editing?'แก้ไข':'เพิ่ม'} ${kind.toUpperCase()} · ${escapePageText(artist?.name||'')}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveArtistArchiveItem(event,'${artistId}','${kind}','${index}')"><div class="form-grid"><div class="field full"><label>ชื่อรายการ</label><input name="title" value="${escapePageText(item.title||'')}" required></div><div class="field full"><label>คำอธิบาย</label><textarea name="description">${escapePageText(item.description||'')}</textarea></div>${galleryFields}</div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกข้อมูล</button></div></form></div></div>`);
}
function saveArtistArchiveItem(event,artistId,kind,index){event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));const item={title:values.title.trim(),description:(values.description||'').trim()};if(kind==='series'){item.poster=values.poster||'';item.year=(values.year||'').trim();item.links=(values.links||'').split(/\r?\n/).map(link=>link.trim()).filter(Boolean);item.url=item.links[0]||'';}else item.url=(values.url||'').trim();const list=db.siteSettings.artistArchive[artistId][kind];if(index==='')list.push(item);else list[Number(index)]=item;save();closeModal();admin();toast(index===''?'เพิ่มข้อมูลแล้ว':'บันทึกการแก้ไขแล้ว');}
function copyArtistArchiveItem(artistId,kind,index){const item=db.siteSettings.artistArchive[artistId][kind][index];const targets=sortedArtists().filter(a=>a.id!==artistId);if(!targets.length){toast('ไม่มีศิลปินอื่นให้คัดลอก');return;}document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>คัดลอก “${escapePageText(item.title)}”</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveArtistArchiveCopy(event,'${artistId}','${kind}',${index})"><div class="form-grid"><div class="field full"><label>เลือกศิลปินปลายทาง (เลือกได้มากกว่า 1)</label>${targets.map(a=>`<label class="checkbox-option"><input type="checkbox" name="targetArtist" value="${a.id}"> ${escapePageText(a.name)}</label>`).join('')}</div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">คัดลอกข้อมูล</button></div></form></div></div>`);}
function saveArtistArchiveCopy(event,artistId,kind,index){event.preventDefault();const targets=new FormData(event.currentTarget).getAll('targetArtist');if(!targets.length){toast('กรุณาเลือกศิลปินปลายทาง');return;}const source=db.siteSettings.artistArchive[artistId][kind][index];targets.forEach(id=>db.siteSettings.artistArchive[id][kind].push({...source}));save();closeModal();admin();toast(`คัดลอกไป ${targets.length} ศิลปินแล้ว`);}
function removeArtistArchiveItem(artistId,kind,index){if(!confirm('ยืนยันการลบ?'))return;db.siteSettings.artistArchive[artistId][kind].splice(index,1);save();admin();}
function moveArtistArchiveItem(artistId,kind,index,direction){const list=db.siteSettings.artistArchive[artistId][kind],target=index+direction;if(target<0||target>=list.length)return;[list[index],list[target]]=[list[target],list[index]];save();admin();}
const renderAdminWithArtistArchive=admin;
admin=function(){renderAdminWithArtistArchive();if(!adminAuthenticated||adminTab!=='artists')return;if(!['content','records','layout'].includes(artistAdminTab))artistAdminTab='content';const top=document.querySelector('.admin-main .admin-top');top?.insertAdjacentHTML('afterend',`<nav class="home-builder-tabs"><button class="${artistAdminTab==='content'?'active':''}" onclick="artistAdminTab='content';admin()">หัวข้อและคำอธิบาย</button><button class="${artistAdminTab==='records'?'active':''}" onclick="artistAdminTab='records';admin()">ข้อมูลศิลปิน</button><button class="${artistAdminTab==='layout'?'active':''}" onclick="artistAdminTab='layout';admin()">ลำดับและการแสดงผล</button></nav>`);const content=document.querySelector('[data-page-content-settings="artists"]');const records=document.querySelector('.data-table')?.closest('.panel');top?.parentElement?.insertAdjacentHTML('beforeend',`<div data-artist-layout-panel>${artistPageSectionManager()}</div>`);const layout=document.querySelector('[data-artist-layout-panel]');({content,records,layout}&&Object.entries({content,records,layout}).forEach(([key,panel])=>{if(panel)panel.style.display=key===artistAdminTab?'':'none'}));};

let timelineAdminTab='series';
function timelineAdmin(){
  ensureHomePageSettings();
  const labels={series:'Series',variety:'Variety Show','music-video':'Music Video'},items=db.siteSettings.timeline.filter(item=>(item.category||'series')===timelineAdminTab),categoryCopy=db.siteSettings.timelineCategoryContent[timelineAdminTab]||{};
  app.innerHTML=`<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav"><button onclick="adminTab='dashboard';admin()">⌂ &nbsp; Dashboard</button>${Object.entries(configs).map(([k,v])=>`<button onclick="adminTab='${k}';admin()">${v.icon} &nbsp; ${v.label}</button>`).join('')}<button class="active">◷ &nbsp; Timeline</button><button onclick="adminTab='master';admin()">⚙ &nbsp; Master Data</button></div><a class="back" href="#home">← ดูหน้าบ้าน</a></aside><main class="admin-main"><div class="admin-top"><div><small>TIMELINE MANAGEMENT</small><h1>จัดการ Timeline</h1></div><button class="btn" onclick="openTimelineForm()">+ เพิ่มรายการ</button></div><nav class="home-builder-tabs timeline-admin-tabs">${Object.entries(labels).map(([id,label])=>`<button class="${timelineAdminTab===id?'active':''}" onclick="timelineAdminTab='${id}';admin()">${label}</button>`).join('')}</nav><section class="panel"><div class="timeline-tab-heading"><div><small>CURRENT CATEGORY</small><h2>${labels[timelineAdminTab]}</h2></div><label class="timeline-visibility-switch"><input type="checkbox" ${db.siteSettings.timelineVisibility[timelineAdminTab]!==false?'checked':''} onchange="toggleTimelineCategory('${timelineAdminTab}',this.checked)"><span>${db.siteSettings.timelineVisibility[timelineAdminTab]!==false?'แสดงหน้าบ้าน':'ซ่อนหน้าบ้าน'}</span></label></div><p class="master-note">ปุ่ม ← → ใช้เรียงลำดับรายการภายในปีเดียวกัน</p><div class="timeline-admin-list">${items.map(item=>{const sameYear=items.filter(entry=>String(entry.year)===String(item.year)),position=sameYear.findIndex(entry=>entry.id===item.id),posterUrl=versionedMediaUrl(item.poster,item.imageVersion||item.id);return `<article>${item.poster?`<img src="${escapePageText(posterUrl)}" alt="">`:'<div class="timeline-admin-noimage">ITEM</div>'}<div><small>${escapePageText(timelineDateLabel(item))} · ${item.upcoming?'UPCOMING · ':''}${(item.artistIds||[]).map(artistName).join(' · ')}</small><h3>${escapePageText(item.title)}</h3><p>${escapePageText(item.description||'')}</p>${item.note?`<div class="timeline-admin-note">Note: ${escapePageText(item.note)}</div>`:''}</div><div class="actions"><button class="icon-btn" onclick="moveTimelineItem('${item.id}',-1)" ${position===0?'disabled':''}>←</button><button class="icon-btn" onclick="moveTimelineItem('${item.id}',1)" ${position===sameYear.length-1?'disabled':''}>→</button><button class="icon-btn" onclick="openTimelineForm('${item.id}')">✎</button><button class="icon-btn" onclick="removeTimelineItem('${item.id}')">⌫</button></div></article>`}).join('')||'<div class="empty">ยังไม่มีข้อมูลในหมวดนี้</div>'}</div></section></main></div></div>`;
  const heading=document.querySelector('.timeline-tab-heading');
  const dataPanel=heading?.closest('.panel');
  if(dataPanel){dataPanel.insertAdjacentHTML('beforebegin',`<section class="panel timeline-heading-settings"><div class="panel-head"><div><small>TIMELINE HEADING</small><h2>${escapePageText(categoryCopy.title||labels[timelineAdminTab])}</h2><p>${escapePageText(categoryCopy.description||'ยังไม่มีคำอธิบาย')}</p></div><div class="actions"><label class="timeline-visibility-switch"><input type="checkbox" ${db.siteSettings.timelineVisibility[timelineAdminTab]!==false?'checked':''} onchange="toggleTimelineCategory('${timelineAdminTab}',this.checked)"><span>${db.siteSettings.timelineVisibility[timelineAdminTab]!==false?'แสดงหน้าบ้าน':'ซ่อนหน้าบ้าน'}</span></label><button class="btn outline" onclick="openTimelineCategorySettings('${timelineAdminTab}')">แก้ไขหัวข้อ</button></div></div></section>${timelineAdminTab!=='series'?timelineGroupAdminPanel(timelineAdminTab):''}`);heading.remove();dataPanel.insertAdjacentHTML('afterbegin',`<div class="panel-head"><div><small>TIMELINE DATA</small><h2>ข้อมูล ${labels[timelineAdminTab]}</h2></div><button class="btn" onclick="openTimelineForm()">+ เพิ่มรายการ</button></div>`);}
  const note=dataPanel?.querySelector('.master-note');if(note)note.textContent='ปุ่ม ← → ใช้เรียงลำดับรายการภายในหัวข้อนี้';
  document.querySelectorAll('.timeline-admin-list article').forEach((card,index)=>{const arrows=card.querySelectorAll('.actions button');if(arrows[0])arrows[0].disabled=index===0;if(arrows[1])arrows[1].disabled=index===items.length-1;});
}
function openTimelineCategorySettings(category){ensureHomePageSettings();const labels={series:'Series',variety:'Variety Show','music-video':'Music Video'},item=db.siteSettings.timelineCategoryContent[category]||{};document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>แก้ไขหัวข้อ ${labels[category]}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveTimelineCategorySettings(event,'${category}')"><div class="form-grid"><div class="field full"><label>ชื่อหัวข้อ</label><input name="title" value="${escapePageText(item.title||labels[category])}" required></div><div class="field full"><label>คำอธิบาย</label><textarea name="description">${escapePageText(item.description||'')}</textarea></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกหัวข้อ</button></div></form></div></div>`);}
function saveTimelineCategorySettings(event,category){event.preventDefault();db.siteSettings.timelineCategoryContent[category]=Object.fromEntries(new FormData(event.currentTarget));save();closeModal();admin();toast('บันทึกหัวข้อ Timeline แล้ว');}
function timelineGroupAdminPanel(category){const groups=db.siteSettings.timelineGroups?.[category]||[];return `<section class="panel timeline-group-admin"><div class="panel-head"><div><small>SUB VIDEO GROUPS</small><h2>กลุ่มย่อย ${category==='variety'?'Variety Show':'Music Video'}</h2><p>สร้างกลุ่มเพื่อจัดวิดีโอย่อยเหมือนหมวดรายการ</p></div><button class="btn" onclick="openTimelineGroupForm('${category}')">+ เพิ่มกลุ่ม</button></div><div class="youtube-admin-sections">${groups.map((group,index)=>{const scope=Array.isArray(group.visibleArtistIds)&&group.visibleArtistIds.length?group.visibleArtistIds:sortedArtists().map(artist=>artist.id);return `<article class="youtube-admin-section"><div class="youtube-admin-section-head"><div class="builder-order"><button onclick="moveTimelineGroup('${category}','${group.id}',-1)" ${index===0?'disabled':''}>↑</button><span>${String(index+1).padStart(2,'0')}</span><button onclick="moveTimelineGroup('${category}','${group.id}',1)" ${index===groups.length-1?'disabled':''}>↓</button></div><div><h3>${escapePageText(group.title)}</h3><p>${escapePageText(group.description||'ไม่มีคำอธิบาย')} · ${db.siteSettings.timeline.filter(item=>item.groupId===group.id).length} รายการ</p><small>แสดงที่: ${scope.map(artistName).join(' · ')}</small></div><div class="actions"><button class="icon-btn" onclick="openTimelineGroupForm('${category}','${group.id}')">✎ แก้ไข</button><button class="icon-btn" onclick="removeTimelineGroup('${category}','${group.id}')">⌫</button></div></div></article>`;}).join('')||'<div class="empty">ยังไม่มีกลุ่มย่อย</div>'}</div></section>`;}
function openTimelineGroupForm(category,id=''){const item=(db.siteSettings.timelineGroups?.[category]||[]).find(group=>group.id===id)||{},scope=(Array.isArray(item.visibleArtistIds)&&item.visibleArtistIds.length?item.visibleArtistIds:sortedArtists().map(artist=>artist.id)).map(canonicalArtistId);document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>${id?'แก้ไข':'เพิ่ม'}กลุ่มย่อย</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveTimelineGroup(event,'${category}','${id}')"><div class="form-grid"><div class="field full"><label>ชื่อกลุ่ม</label><input name="title" value="${escapePageText(item.title||'')}" required></div><div class="field full"><label>คำอธิบาย</label><textarea name="description">${escapePageText(item.description||'')}</textarea></div><div class="multi-artist-picker"><p>แสดงกลุ่มนี้ในหน้าศิลปิน</p>${sortedArtists().map(artist=>`<label><input type="checkbox" name="visibleArtistIds" value="${artist.id}" ${scope.includes(canonicalArtistId(artist.id))?'checked':''}><span>${escapePageText(artist.name)}</span></label>`).join('')}</div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกกลุ่ม</button></div></form></div></div>`);}
function saveTimelineGroup(event,category,id=''){event.preventDefault();const form=new FormData(event.currentTarget),visibleArtistIds=[...new Set(form.getAll('visibleArtistIds').map(canonicalArtistId))],values={title:(form.get('title')||'').trim(),description:(form.get('description')||'').trim(),visibleArtistIds},list=db.siteSettings.timelineGroups[category];if(!visibleArtistIds.length){toast('กรุณาเลือกหน้าศิลปินอย่างน้อย 1 หน้า');return;}if(id)Object.assign(list.find(item=>item.id===id),values);else list.push({id:`${category}_${Date.now()}`,...values});save();closeModal();admin();toast('บันทึกกลุ่มย่อยแล้ว');}
function moveTimelineGroup(category,id,direction){const list=db.siteSettings.timelineGroups[category],index=list.findIndex(item=>item.id===id),target=index+direction;if(target<0||target>=list.length)return;[list[index],list[target]]=[list[target],list[index]];save();admin();}
function removeTimelineGroup(category,id){if(db.siteSettings.timeline.some(item=>item.groupId===id)){toast('กรุณาย้ายรายการออกจากกลุ่มนี้ก่อน');return;}if(!confirm('ยืนยันการลบกลุ่ม?'))return;db.siteSettings.timelineGroups[category]=db.siteSettings.timelineGroups[category].filter(item=>item.id!==id);save();admin();}
function toggleTimelineCategory(category,visible){db.siteSettings.timelineVisibility[category]=visible;save();admin();toast(`${visible?'เปิด':'ปิด'} ${category} แล้ว`);}
function openTimelineForm(id=''){
  const item=id?(db.siteSettings.timeline.find(entry=>entry.id===id)||{}):{};const links=(item.links?.length?item.links:(item.url?[{label:'Open',url:item.url}]:[])).map(link=>typeof link==='string'?{label:'Open',url:link}:link);const selectedSeries=item.seriesId||db.masterData.series.find(series=>series.label===item.title)?.id||'';
  const selectedTimelineArtistIds=(item.artistIds||[]).map(canonicalArtistId);
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>${id?'แก้ไข':'เพิ่ม'} Timeline</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveTimelineItem(event,'${id}')"><div class="form-grid"><div class="multi-artist-picker"><p>เลือกศิลปินได้มากกว่า 1</p>${sortedArtists().map(a=>`<label><input type="checkbox" name="artistIds" value="${a.id}" ${selectedTimelineArtistIds.includes(canonicalArtistId(a.id))||(!id&&sameArtistId(a.id,'duo'))?'checked':''}><span>${escapePageText(a.name)}</span></label>`).join('')}</div><div class="field"><label>หมวด Timeline</label><select name="category"><option value="series" ${(item.category||'series')==='series'?'selected':''}>Series</option><option value="variety" ${item.category==='variety'?'selected':''}>Variety Show</option><option value="music-video" ${item.category==='music-video'?'selected':''}>Music Video</option></select></div><div class="field"><label>ซีรีส์จาก Master Data</label><select name="seriesId" required><option value="">เลือกรายการ</option>${db.masterData.series.map(series=>`<option value="${series.id}" ${series.id===selectedSeries?'selected':''}>${escapePageText(series.label)}</option>`).join('')}</select></div><div class="field"><label>ปี</label><input name="year" type="number" min="1900" max="2200" value="${escapePageText(item.year||String(new Date().getFullYear()))}" required></div><div class="field timeline-upcoming-field"><label><input name="upcoming" type="checkbox" ${item.upcoming?'checked':''}> แสดงใน Upcoming</label></div><div class="field full"><label>ชื่อที่แสดงหน้าบ้าน</label><input name="displayTitle" value="${escapePageText(item.title||'')}" placeholder="ชื่อที่แสดงบนการ์ด" required></div><div class="field full"><label>รายละเอียด</label><textarea name="description">${escapePageText(item.description||'')}</textarea></div><div class="field full"><label>Note บนการ์ด</label><textarea name="note">${escapePageText(item.note||'')}</textarea></div>${imageUploadTemplate('poster','รูปปก',item.poster||'')}<div class="field full"><label>ลิงก์และชื่อที่แสดง</label><textarea name="links" placeholder="ดูรายการ | https://...&#10;https://...">${escapePageText(links.map(link=>`${link.label||'Open'} | ${link.url||''}`).join('\n'))}</textarea><small>หนึ่งลิงก์ต่อบรรทัด ใส่ URL อย่างเดียว หรือ ชื่อปุ่ม | URL ก็ได้</small></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึก Timeline</button></div></form></div></div>`);
  const categorySelect=document.querySelector('#modal [name="category"]');categorySelect?.closest('.field')?.insertAdjacentHTML('afterend',`<div class="field timeline-group-field"><label>กลุ่มย่อย</label><select name="groupId"></select><small>ใช้เฉพาะ Variety Show และ Music Video</small></div>`);if(categorySelect){categorySelect.addEventListener('change',()=>updateTimelineCategoryFields(categorySelect.value,''));updateTimelineCategoryFields(item.category||timelineAdminTab,item.groupId||'');}
  if(!id){const category=document.querySelector('#modal [name="category"]');if(category)category.value=timelineAdminTab;}
  const upcomingInput=document.querySelector('#modal [name="upcoming"]'), yearInput=document.querySelector('#modal [name="year"]');
  yearInput?.closest('.field')?.insertAdjacentHTML('afterend',`<div class="field"><label>วัน <small>(ไม่บังคับ)</small></label><input name="day" type="number" min="1" max="31" value="${escapePageText(item.day||'')}" placeholder="1–31"></div><div class="field"><label>เดือน <small>(ไม่บังคับ)</small></label><input name="month" type="number" min="1" max="12" value="${escapePageText(item.month||'')}" placeholder="1–12"></div>`);
  document.querySelector('#modal [name="poster"]')?.closest('.image-upload-field')?.insertAdjacentHTML('afterend',`<div class="field full"><label>รูปแบบรูปปก</label><select name="imageOrientation"><option value="portrait" ${(item.imageOrientation||'portrait')==='portrait'?'selected':''}>แนวตั้ง</option><option value="landscape" ${item.imageOrientation==='landscape'?'selected':''}>แนวนอน</option></select><small>แนวตั้งใช้สัดส่วน 3:4 · แนวนอนใช้สัดส่วน 16:9</small></div>`);
  const posterPreview=document.querySelector('#uploadPreview_poster img');if(posterPreview&&item.poster)posterPreview.src=versionedMediaUrl(item.poster,item.imageVersion||item.id);
  if(upcomingInput&&yearInput){upcomingInput.addEventListener('change',()=>toggleTimelineYearRequirement(upcomingInput.checked));if(item.upcoming&&!item.year)yearInput.value='';toggleTimelineYearRequirement(Boolean(item.upcoming),false);}
}
function updateTimelineCategoryFields(category,selected=''){const field=document.querySelector('#modal .timeline-group-field'),select=field?.querySelector('select'),seriesSelect=document.querySelector('#modal [name="seriesId"]'),seriesField=seriesSelect?.closest('.field');if(field&&select){const groups=db.siteSettings.timelineGroups?.[category]||[];field.style.display=category==='series'?'none':'grid';select.innerHTML=`<option value="">ไม่ระบุกลุ่ม</option>${groups.map(group=>`<option value="${group.id}" ${group.id===selected?'selected':''}>${escapePageText(group.title)}</option>`).join('')}`;}if(seriesSelect&&seriesField){const isSeries=category==='series';seriesField.style.display=isSeries?'grid':'none';seriesSelect.disabled=!isSeries;seriesSelect.required=isSeries;}}
function toggleTimelineYearRequirement(isUpcoming,adjustValue=true){const year=document.querySelector('#modal [name="year"]');if(!year)return;year.required=!isUpcoming;year.disabled=isUpcoming;if(isUpcoming)year.value='';else if(adjustValue&&!year.value)year.value=String(new Date().getFullYear());}
async function saveTimelineItem(event,id){event.preventDefault();const formElement=event.currentTarget,button=formElement.querySelector('[type="submit"]'),form=new FormData(formElement),artistIds=[...new Set(form.getAll('artistIds').map(canonicalArtistId))],category=form.get('category')||'series';if(!artistIds.length){toast('กรุณาเลือกศิลปินอย่างน้อย 1 คน');return;}const series=db.masterData.series.find(item=>item.id===form.get('seriesId'));if(category==='series'&&!series){toast('กรุณาเลือกรายการจาก Master Data');return;}const links=(form.get('links')||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{if(!line.includes('|'))return{label:'Open',url:line};const split=line.split('|'),label=(split.shift()||'').trim()||'Open',url=split.join('|').trim();return{label,url};}).filter(link=>link.url);const item={id:id||`timeline_${Date.now()}`,artistIds,seriesId:series?.id||'',category,groupId:form.get('groupId')||'',upcoming:form.get('upcoming')==='on',title:(form.get('displayTitle')||'').trim(),year:form.get('year'),day:form.get('day')||'',month:form.get('month')||'',imageOrientation:form.get('imageOrientation')==='landscape'?'landscape':'portrait',imageVersion:String(Date.now()),description:(form.get('description')||'').trim(),note:(form.get('note')||'').trim(),poster:form.get('poster')||'',links};item.url=links[0]?.url||'';const index=db.siteSettings.timeline.findIndex(entry=>entry.id===id),previous=index>=0?structuredClone(db.siteSettings.timeline[index]):null;if(index>=0)db.siteSettings.timeline[index]=item;else db.siteSettings.timeline.unshift(item);button.disabled=true;button.textContent='กำลังบันทึกลง Supabase...';save(false);const synced=await syncDatabaseInBackground();if(!synced){if(previous)db.siteSettings.timeline[index]=previous;else db.siteSettings.timeline=db.siteSettings.timeline.filter(entry=>entry.id!==item.id);save(false);button.disabled=false;button.textContent='บันทึก Timeline';toast('ยังบันทึก Timeline ไม่สำเร็จ กรุณาตรวจสอบข้อความสถานะแล้วลองอีกครั้ง');return;}closeModal();admin();toast('บันทึก Timeline ลง Supabase แล้ว');}
function removeTimelineItem(id){if(!confirm('ยืนยันการลบ Timeline?'))return;db.siteSettings.timeline=db.siteSettings.timeline.filter(item=>item.id!==id);save();admin();}
function moveTimelineItem(id,direction){const item=db.siteSettings.timeline.find(entry=>entry.id===id);if(!item)return;const categoryItems=db.siteSettings.timeline.filter(entry=>(entry.category||'series')===(item.category||'series')),index=categoryItems.findIndex(entry=>entry.id===id),target=index+direction;if(target<0||target>=categoryItems.length)return;const first=db.siteSettings.timeline.indexOf(categoryItems[index]),second=db.siteSettings.timeline.indexOf(categoryItems[target]);[db.siteSettings.timeline[first],db.siteSettings.timeline[second]]=[db.siteSettings.timeline[second],db.siteSettings.timeline[first]];save();admin();}

addMaster=function(group){openMasterForm(group);};
editMaster=function(group,id){openMasterForm(group,id);};
function openMasterForm(group,id=''){const item=id?db.masterData[group].find(x=>x.id===id):{};document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>${id?'แก้ไข':'เพิ่ม'} Master Data</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveMasterForm(event,'${group}','${id}')"><div class="form-grid"><div class="field full"><label>ชื่อ</label><input name="label" value="${escapePageText(item?.label||'')}" required></div><div class="field full"><label>รหัส ID</label><input name="itemId" value="${escapePageText(item?.id||'')}" ${id?'readonly':''} placeholder="ระบบสร้างให้อัตโนมัติได้"></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึก</button></div></form></div></div>`);}
function saveMasterForm(event,group,oldId){event.preventDefault();const v=Object.fromEntries(new FormData(event.currentTarget));const id=(v.itemId||v.label).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||`item_${Date.now()}`;if(!oldId&&db.masterData[group].some(x=>x.id===id)){toast('รหัสนี้มีอยู่แล้ว');return;}if(oldId){const item=db.masterData[group].find(x=>x.id===oldId);item.label=v.label.trim();}else db.masterData[group].push({id,label:v.label.trim()});save();closeModal();admin();toast('บันทึก Master Data แล้ว');}

const renderAdminWithTimeline=admin;
admin=function(){if(adminTab==='timeline')timelineAdmin();else{renderAdminWithTimeline();const nav=document.querySelector('.side-nav');if(nav&&!nav.querySelector('[data-timeline-nav]')){const master=nav.querySelector('[data-master]');const html=`<button data-timeline-nav="true" onclick="adminTab='timeline';admin()">◷ &nbsp; Timeline</button>`;master?master.insertAdjacentHTML('beforebegin',html):nav.insertAdjacentHTML('beforeend',html);}}};

async function connectAdminDatabase() {
  adminDatabaseStatus = 'กำลังเชื่อมต่อ Supabase...';
  try {
    const remote = await window.auausaveDB.load();
    db = remote;
    ensureDexxEventType();
    ensureHomePageSettings();
    ensureLocalizationSettings();
    const hasLegacyTimelineMedia=(db.siteSettings.timeline||[]).some(item=>typeof item.poster==='string'&&/\/settings\/homepage\/timeline\/\d+\/poster\./.test(item.poster));
    if(hasLegacyTimelineMedia){adminDatabaseStatus='กำลังจัดระเบียบรูป Timeline...';db=await window.auausaveDB.save(structuredClone(db));}
    localStorage.setItem('auausave-house-db-v9', JSON.stringify(db));
    adminDatabaseLoaded = true;
    adminDatabaseStatus = 'เชื่อมต่อ Supabase แล้ว';
  } catch (error) {
    adminDatabaseLoaded = false;
    adminDatabaseStatus = `เชื่อมต่อไม่สำเร็จ: ${error.message}`;
  }
}

function renderAdminLogin(message = '') {
  app.innerHTML = `<main class="admin-login-page"><section class="admin-login-card"><a class="admin-login-brand" href="#home"><i></i>AUAUSAVE HOUSE</a><small>ADMIN MANAGEMENT</small><h1>เข้าสู่ระบบหลังบ้าน</h1><p>กรอกอีเมลและรหัสผ่านของผู้ดูแลระบบเพื่อจัดการข้อมูลเว็บไซต์</p>${message ? `<div class="admin-login-error">${message}</div>` : ''}<form onsubmit="adminSignIn(event)"><div class="field"><label>อีเมลผู้ดูแลระบบ</label><input name="email" type="email" autocomplete="username" placeholder="admin@example.com" required></div><div class="field"><label>รหัสผ่าน</label><input name="password" type="password" autocomplete="current-password" required></div><button class="btn admin-login-submit" type="submit">เข้าสู่หน้าจัดการ</button></form><a class="admin-login-back" href="#home">← กลับหน้าเว็บไซต์</a></section></main>`;
  applyInterfaceLanguage();
}

async function requestAdminAccess() {
  const requestId = ++adminAuthRequest;
  app.innerHTML = `<main class="admin-login-page"><section class="admin-login-card is-loading"><div class="admin-login-brand"><i></i>AUAUSAVE HOUSE</div><p>กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...</p></section></main>`;
  if (!window.auausaveDB) {
    renderAdminLogin('ยังเชื่อมต่อระบบเข้าสู่ระบบไม่ได้ กรุณาตรวจสอบการตั้งค่า Supabase');
    return;
  }
  try {
    const { data, error } = await window.auausaveDB.session();
    if (requestId !== adminAuthRequest || location.hash !== '#admin') return;
    if (error) throw error;
    adminAuthenticated = Boolean(data?.session);
    currentAdminEmail = data?.session?.user?.email || '';
    if (adminAuthenticated) {
      await connectAdminDatabase();
      if (requestId !== adminAuthRequest || location.hash !== '#admin') return;
      admin();
    }
    else renderAdminLogin();
  } catch (error) {
    renderAdminLogin(`ตรวจสอบสิทธิ์ไม่สำเร็จ: ${error.message}`);
  }
}

async function adminSignIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const values = new FormData(form);
  button.disabled = true;
  button.textContent = 'กำลังเข้าสู่ระบบ...';
  try {
    const { data, error } = await window.auausaveDB.signIn(values.get('email').trim(), values.get('password'));
    if (error) throw error;
    adminAuthenticated = true;
    currentAdminEmail = data?.user?.email || values.get('email').trim();
    button.textContent = 'กำลังเชื่อมต่อฐานข้อมูล...';
    await connectAdminDatabase();
    admin();
    toast('เข้าสู่ระบบหลังบ้านแล้ว');
  } catch (error) {
    renderAdminLogin(error.message === 'Invalid login credentials' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : `เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
  }
}

async function adminSignOut() {
  try { await window.auausaveDB?.signOut(); } catch (error) { console.info(error.message); }
  adminAuthenticated = false;
  currentAdminEmail = '';
  adminDatabaseLoaded = false;
  adminDatabaseStatus = 'กำลังเชื่อมต่อ Supabase...';
  adminTab = 'dashboard';
  renderAdminLogin();
  toast('ออกจากระบบแล้ว');
}

async function hydrateFromSupabase() {
  if (!window.auausaveDB) return;
  try {
    const remote = await window.auausaveDB.load();
    db = remote;
    ensureDexxEventType();
    ensureHomePageSettings();
    ensureLocalizationSettings();
    localStorage.setItem('auausave-house-db-v9', JSON.stringify(db));
    router();
  } catch (error) {
    console.info('Supabase ยังไม่พร้อม:', error.message);
  }
}

const EN_INTERFACE = {
  'จัดการศิลปิน':'Manage Artists','จัดการตารางงาน':'Manage Schedule','จัดการพรีเซนเตอร์':'Manage Presenters','จัดการรางวัล':'Manage Awards','จัดการ YouTube':'Manage YouTube',
  'เลือกพาสที่อยากติดตาม':'Choose the path you want to follow','คู่และเดี่ยวในบ้านเดียวกัน':'Together and solo, under one roof',
  'ตารางงานเดือนนี้':'This month’s schedule','ติดตามตารางงานคู่และงานเดี่ยว':'Follow couple and solo schedules',
  'งานที่กำลังจะมาถึง':'Upcoming events','งานเดือนนี้':'Events this month','ตารางงานปีนี้':'Events this year','ตารางงานรายเดือน':'Monthly schedule',
  'แยกตามพาส':'By artist path','ดูทั้งหมด':'View all','ดูตารางทั้งหมด':'View full schedule','ดูวิดีโอทั้งหมด':'View all videos',
  'เปิดปฏิทินทั้งหมด':'Open full calendar','เข้าสู่พาสคู่':'Explore couple path','เส้นทางเดี่ยว':'Solo journeys',
  'แยกติดตามงานและรางวัลเดี่ยวของแต่ละคน':'Follow each artist’s solo events and awards separately',
  'เว็บไซต์นี้สร้างโดย':'Created by','ยังไม่มีข้อมูลในขณะนี้':'No information available yet','ยังไม่มีวิดีโอ':'No videos yet',
  'ไม่พลาดทุกเวทีและทุกช่วงเวลาสำคัญ':'Never miss an important stage or moment','ทุกความสำเร็จที่เราอยากร่วมฉลองไปด้วยกัน':'Every achievement we celebrate together',
  'วิดีโอหลักและคลังรายการของ AUAUSAVE HOUSE':'Featured videos and the AUAUSAVE HOUSE archive',
  'ศิลปิน':'Artists','ตารางงาน':'Schedule','พรีเซนเตอร์':'Presenters','รางวัล':'Awards','สำหรับแอดมิน':'Admin',
  'หน้าแรก':'Home','จัดหน้าแรก':'Homepage','ดูหน้าบ้าน':'View site','กลับหน้าเว็บไซต์':'Back to website','ออกจากระบบ':'Log out',
  'ภาพรวมหลังบ้าน':'Admin Dashboard','จัดการปฏิทิน':'Manage calendar','จัดการปฏิทินงาน':'Manage event calendar','เพิ่มงานใหม่':'Add event',
  'เลือกเดือน':'Select month','ทั้งหมด':'All','ทุก Type':'All types','รายการ':'List','ปฏิทิน':'Calendar','กลับเดือนนี้':'Current month',
  'ข้อมูลทั้งหมด':'All records','จัดการ':'Actions','เพิ่มข้อมูล':'Add record','แก้ไข':'Edit','ลบ':'Delete','บันทึกข้อมูล':'Save',
  'ชื่องาน':'Event title','ชื่อศิลปิน':'Nickname','ชื่อจริง':'Name','บทบาท':'Role','วันที่':'Date','สถานที่':'Location',
  'แหล่งข้อมูล':'Source','ลิงก์ข้อมูลต้นทาง':'Source URL','เลือกศิลปิน':'Select artist','ยกเลิก':'Cancel','บันทึกข้อความ':'Save text',
  'คำอธิบาย':'Description','หัวข้อหลัก':'Main title','หัวข้อ':'Title','คำโปรยด้านบน':'Eyebrow','เพิ่มงานใหม่':'Add event',
  'เลือกรูปภาพ':'Choose image','อัปโหลดรูป':'Upload image','การแสดงรูป':'Image fitting','ตำแหน่งรูป':'Image position',
  'เต็มกรอบ':'Cover','เต็มภาพ ไม่ครอป':'Contain without cropping','ด้านบน':'Top','กึ่งกลาง':'Center','ด้านล่าง':'Bottom',
  'เลือกได้มากกว่า 1 ประเภท':'Select more than one type','เลือกซีรีส์':'Select series','ซีรีส์':'Series',
  'ตั้งค่า Master Data':'Master Data Settings','ประเภทงาน':'Event types','รายชื่อซีรีส์':'Series library','เพิ่ม Type':'Add type',
  'เพิ่มซีรีส์':'Add series','จัดการข้อความและลำดับหน้าแรก':'Homepage content and order','ตัวอย่างหน้าหลัก':'Homepage preview',
  'เปลี่ยนรูปหน้าหลัก':'Change hero image','แก้ไขข้อความ':'Edit text','แสดงอยู่':'Visible','ซ่อนอยู่':'Hidden',
  'หัวข้อและคำอธิบายรายหน้า':'Page titles and descriptions','แก้ไขภาษาไทย':'Edit Thai','เชื่อมต่อ Supabase แล้ว':'Supabase connected','กำลังเชื่อมต่อ Supabase':'Connecting to Supabase',
  'เข้าสู่ระบบหลังบ้าน':'Admin sign in','อีเมลผู้ดูแลระบบ':'Admin email','รหัสผ่าน':'Password','เข้าสู่หน้าจัดการ':'Open admin panel',
  'กรอกอีเมลและรหัสผ่านของผู้ดูแลระบบเพื่อจัดการข้อมูลเว็บไซต์':'Enter an admin email and password to manage the website.',
  'งานคู่':'Couple','งานที่ผ่านมา':'Past events','จันทร์':'Monday','อังคาร':'Tuesday','พุธ':'Wednesday','พฤหัส':'Thursday','ศุกร์':'Friday','เสาร์':'Saturday','อาทิตย์':'Sunday'
};
const PUBLIC_EN_REPLACEMENTS = {
  'ทุกเรื่องราวถูกจัดไว้อย่างชัดเจน ทั้งโมเมนต์คู่และSolo journeysของทั้งสองคน':'Every story is clearly organized, from shared moments to each artist’s solo journey.',
  'ทุกเรื่องราวถูกจัดไว้อย่างชัดเจน ทั้งโมเมนต์คู่และเส้นทางเดี่ยวของทั้งสองคน':'Every story is clearly organized, from shared moments to each artist’s solo journey.',
  'เปิดดูบน YouTube':'Watch on YouTube',
  'เปิดบน YouTube ↗':'Watch on YouTube ↗',
  'ผลงานซีรีส์คู่':'Couple series',
  'ผลงานSeriesคู่':'Couple series',
  'Mr. Fanboy รักสุดใจนายแฟนบอย':'Mr. Fanboy',
  'ถิ่นพี่หนูชอบ EP.1 — AuAu & Save':'Thin Phi Nu Chop EP.1 — AuAu & Save',
  'ไม่เล่น? — AUAU':'Not Playing? — AUAU',
  'รักได้แล้ว (NEXT STATUS) — DEXX':'Ready to Love (NEXT STATUS) — DEXX',
  'Ost. ด้วงกับเธอ · 3:45':'OST. Duang With You · 3:45',
  'ยังไม่มีข้อมูลPresenters':'No presenter information yet',
  'ดูข้อมูลต้นทาง ↗':'View source ↗',
  'อู่อู๋ ธนภูมิ และ เซฟ วรพงษ์ คู่พาร์ตเนอร์นักแสดงจาก DOMUNDI ที่เป็นที่รู้จักจากSeries Your Sky และก้าวสู่บทนำร่วมกันใน Mr. Fanboy รักสุดใจนายแฟนบอย':'Auau Thanaphum and Save Worapong are acting partners from DOMUNDI, known for Your Sky and their leading roles together in Mr. Fanboy.',
  'อู่อู๋ ธนภูมิ นักแสดงและArtistsค่าย DOMUNDI / DMD MUSIC สมาชิกวง DEXX และArtistsเดี่ยวเจ้าของซิงเกิล “ไม่เล่น?”':'Auau Thanaphum is a DOMUNDI and DMD MUSIC actor, a member of DEXX, and a solo artist behind the single “Not Playing?”.',
  'อู่อู๋ ธนภูมิ นักแสดงและศิลปินค่าย DOMUNDI / DMD MUSIC สมาชิกวง DEXX และศิลปินเดี่ยวเจ้าของซิงเกิล “ไม่เล่น?”':'Auau Thanaphum is a DOMUNDI and DMD MUSIC actor, a member of DEXX, and a solo artist behind the single “Not Playing?”.',
  'เซฟ วรพงษ์ นักแสดงค่าย DOMUNDI ผู้รับบทสำคัญใน Your Sky และก้าวสู่การเป็นนักแสดงนำใน Mr. Fanboy รักสุดใจนายแฟนบอย':'Save Worapong is a DOMUNDI actor known for his role in Your Sky and his leading role in Mr. Fanboy.',
  'ธนภูมิ เศรษฐสิทธิกุล':'Thanaphum Sestasittikul',
  'วรพงษ์ วาเลาะ':'Worapong Walor',
  'วันเกิด':'Birthday',
  '8 มีนาคม 2545':'8 March 2002',
  '27 มิถุนายน 2546':'27 June 2003',
  'ผลงานล่าสุด':'Latest work',
  'วิดีโอ':'Videos',
  'ยังไม่มีข้อมูลAwards':'No awards yet',
  'รอประกาศเวลา':'TBA',
  ' น.':'',
};
function applyInterfaceLanguage() {
  document.documentElement.lang = route === 'admin' ? 'th' : 'en';
  document.querySelectorAll('.language-switch,.floating-language').forEach(element => element.remove());
  if (route === 'admin') return;
  const root = document.querySelector('#app');
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    let value = node.nodeValue;
    Object.entries(EN_INTERFACE).sort((a,b)=>b[0].length-a[0].length).forEach(([thai,english]) => { value = value.split(thai).join(english); });
    Object.entries(PUBLIC_EN_REPLACEMENTS).sort((a,b)=>b[0].length-a[0].length).forEach(([thai,english]) => { value = value.split(thai).join(english); });
    node.nodeValue = value;
  });
}
function applyPageLocalization() {
  const page = route.startsWith('artist/') ? null : route;
  const content = page && pageText(page);
  if (content) {
    const hero = page === 'home' ? document.querySelector('.hero') : document.querySelector('.page-hero');
    if (hero) {
      const eyebrow = hero.querySelector('.eyebrow');
      const title = hero.querySelector('h1');
      const description = hero.querySelector('p');
      if (eyebrow) eyebrow.textContent = content.eyebrow;
      if (title) title.innerHTML = content.title.replace(/\n/g,'<br>');
      if (description) description.textContent = content.description;
    }
  }
  if (page === 'home') applyHomeCardContent();
  applyInterfaceLanguage();
}
function router() {
  route = location.hash.slice(1) || "home";
  window.scrollTo(0, 0);
  if (route === "home") home();
  else if (
    ["artists", "schedule", "presenters", "awards"].includes(route)
  )
    listing(route);
  else if (route.startsWith("artist/")) profile(route.split("/")[1]);
  else if (route === "admin") requestAdminAccess();
  else home();
  applyPageLocalization();
}
window.addEventListener("hashchange", router);
window.addEventListener("storage", event => {
  if (event.key !== "auausave-house-db-v9" || !event.newValue) return;
  // Never re-render an admin session from another tab's localStorage update.
  // Two signed-in admin tabs would otherwise trigger each other in a refresh loop.
  if (location.hash === '#admin' || route === 'admin') return;
  try {
    db = JSON.parse(event.newValue);
    ensureDexxEventType();
    ensureHomePageSettings();
    ensureLocalizationSettings();
    router();
  } catch (error) {
    console.warn('Local data refresh:', error.message);
  }
});

function personalProfileLines(value) {
  return String(value || '').split(/\r?\n/).map(line => {
    const parts = line.split('|');
    return { label:(parts.shift() || '').trim(), value:parts.join('|').trim() };
  }).filter(item => item.label || item.value);
}

function renderPersonalProfile(artist) {
  if (!artist || !['AT02','AT03'].includes(canonicalArtistId(artist.id))) return '';
  ensureHomePageSettings();
  const info = db.siteSettings.personalProfiles[canonicalArtistId(artist.id)] || {};
  const basics = [
    ['Birthday', artist.birth], ['Zodiac sign', info.zodiac], ['Chinese zodiac', info.chineseZodiac],
    ['Blood type', info.bloodType],
  ].filter(item => item[1]);
  const list = items => items.map(item => {const label=Array.isArray(item)?item[0]:item.label,value=Array.isArray(item)?item[1]:item.value;return `<div class="personal-row"><span>${escapePageText(label||'')}</span><strong>${escapePageText(value||'')}</strong></div>`;}).join('');
  const legacySizing = Object.fromEntries(personalProfileLines(info.sizing).map(item=>[item.label.toLowerCase(),item.value]));
  const sizeValue = (key, legacyLabel='') => info[key] || legacySizing[legacyLabel.toLowerCase()] || '';
  const mainSizes = [['Bust',sizeValue('bust','bust')],['Waist',sizeValue('waist','waist')],['Shirt/Tops',sizeValue('shirtTops','shirt/tops')],['Shoe',sizeValue('shoe','shoe')]].filter(item=>item[1]);
  const fingers = ['T','I','M','R','L'].map(code=>({code,left:info[`fingerLeft${code}`]||'',right:info[`fingerRight${code}`]||''})).filter(item=>item.left||item.right);
  const hasSizing = info.height || info.weight || mainSizes.length || info.wristSize || fingers.length;
  const sizingCard = hasSizing ? `<div class="sizing-metrics">${info.height?`<div><span>Height</span><strong>${escapePageText(info.height)}</strong></div>`:''}${info.weight?`<div><span>Weight</span><strong>${escapePageText(info.weight)}</strong></div>`:''}</div>${mainSizes.length?`<div class="sizing-box-grid">${mainSizes.map(item=>`<div><span>${escapePageText(item[0])}</span><strong>${escapePageText(item[1])}</strong></div>`).join('')}</div>`:''}${info.wristSize?`<div class="wrist-size"><span>Wrist Size</span><strong>${escapePageText(info.wristSize)}</strong></div>`:''}${fingers.length?`<div class="finger-table"><div class="finger-row finger-head"><span></span>${fingers.map(item=>`<b>${item.code}</b>`).join('')}</div>${fingers.some(item=>item.left)?`<div class="finger-row"><span>Left</span>${fingers.map(item=>`<strong>${escapePageText(item.left||'')}</strong>`).join('')}</div>`:''}${fingers.some(item=>item.right)?`<div class="finger-row"><span>Right</span>${fingers.map(item=>`<strong>${escapePageText(item.right||'')}</strong>`).join('')}</div>`:''}</div><small class="sizing-note">Finger diameters</small>`:''}` : '<p class="personal-empty">No sizing information yet.</p>';
  return `<section class="section personal-profile-section"><div class="container"><div class="personal-profile-heading"><span>GET TO KNOW</span><h2>${escapePageText(artist.name)} Profile</h2><p>Personal details, sizing and favorites.</p></div><div class="personal-profile-layout"><article class="personal-profile-card personal-basics"><h3>Personal Information</h3>${list(basics)}${info.education?`<div class="personal-copy"><span>Education</span><p>${escapePageText(info.education)}</p></div>`:''}</article><article class="personal-profile-card personal-sizing"><h3>Sizing</h3>${sizingCard}</article><article class="personal-profile-card personal-favorites"><h3>Favorites</h3>${list(personalProfileLines(info.favorites))||'<p class="personal-empty">No favorites added yet.</p>'}${info.motto?`<blockquote><small>MOTTO</small>${escapePageText(info.motto)}</blockquote>`:''}</article></div></div></section>`;
}

const renderProfileWithPersonalDetails = profile;
profile = function (id) {
  id = canonicalArtistId(id);
  renderProfileWithPersonalDetails(id);
  if (!['AT02','AT03'].includes(id)) return;
  const artist = artistById(id);
  const heroSection = document.querySelector('.profile-head')?.closest('.section');
  heroSection?.insertAdjacentHTML('afterend', renderPersonalProfile(artist));
};

function personalProfileAdminPanel() {
  ensureHomePageSettings();
  return `<section class="panel personal-profile-admin"><div class="panel-head"><div><small>SOLO ARTIST PROFILE</small><h2>จัดการข้อมูลส่วนตัว AUAU / SAVE</h2><p class="master-note">ข้อมูลนี้จะแสดงเฉพาะหน้าเดี่ยวของศิลปิน</p></div></div><div class="personal-admin-grid">${['AT02','AT03'].map(id=>{const artist=artistById(id),info=db.siteSettings.personalProfiles[id]||{};return `<article><div><small>${id}</small><h3>${escapePageText(artist?.name||id)}</h3><p>${info.education||info.favorites||info.sizing?'มีข้อมูลแล้ว':'ยังไม่ได้เพิ่มข้อมูล'}</p></div><button class="btn outline" onclick="openPersonalProfileForm('${id}')">แก้ไขข้อมูลส่วนตัว</button></article>`}).join('')}</div></section>`;
}

function openPersonalProfileForm(artistId) {
  artistId = canonicalArtistId(artistId);
  ensureHomePageSettings();
  const artist=artistById(artistId), info=db.siteSettings.personalProfiles[artistId]||{};
  const input=(name,label,placeholder='')=>`<div class="field"><label>${label}</label><input name="${name}" value="${escapePageText(info[name]||'')}" placeholder="${placeholder}"></div>`;
  const fingerInputs=(side,label)=>`<fieldset class="finger-admin-fieldset"><legend>Finger size (${label})</legend><div class="finger-admin-grid">${['T','I','M','R','L'].map(code=>input(`finger${side}${code}`,code)).join('')}</div></fieldset>`;
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal"><div class="modal personal-profile-modal"><div class="modal-head"><h2>ข้อมูลส่วนตัว ${escapePageText(artist?.name||artistId)}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="savePersonalProfile(event,'${artistId}')"><div class="form-grid"><h3 class="profile-form-heading">Personal Information</h3>${input('zodiac','Zodiac sign')}${input('chineseZodiac','Chinese zodiac')}${input('bloodType','Blood type')}<div class="field full"><label>Education</label><textarea name="education">${escapePageText(info.education||'')}</textarea></div><h3 class="profile-form-heading">Sizing <small>กรอกเฉพาะช่องที่มีข้อมูลได้</small></h3>${input('height','Height','174 cm')}${input('weight','Weight','52 kg')}${input('bust','Bust','31 in')}${input('waist','Waist','26 in')}${input('shirtTops','Shirt/Tops','L')}${input('shoe','Shoe','40 EU')}${input('wristSize','Wrist Size','15–16 cm')}<div></div>${fingerInputs('Left','Left')}${fingerInputs('Right','Right')}<div class="field full"><label>Favorites</label><textarea name="favorites" placeholder="Food | Papaya salad&#10;Color | Red, black, white&#10;Sport | Football">${escapePageText(info.favorites||'')}</textarea><small>หนึ่งรายการต่อหนึ่งบรรทัด รูปแบบ: หัวข้อ | ข้อมูล</small></div><div class="field full"><label>Motto</label><textarea name="motto">${escapePageText(info.motto||'')}</textarea></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกข้อมูลส่วนตัว</button></div></form></div></div>`);
}

function savePersonalProfile(event, artistId) {
  event.preventDefault();
  artistId = canonicalArtistId(artistId);
  db.siteSettings.personalProfiles[artistId] = Object.fromEntries(new FormData(event.currentTarget));
  save(); closeModal(); admin(); toast('บันทึกข้อมูลส่วนตัวแล้ว');
}

const renderAdminWithPersonalProfiles = admin;
admin = function () {
  renderAdminWithPersonalProfiles();
  if (!adminAuthenticated || adminTab !== 'artists') return;
  const target = document.querySelector('.admin-main .panel');
  target?.insertAdjacentHTML('beforebegin', personalProfileAdminPanel());
};

const renderPresenterCardsWithOptionalDate = presenterCards;
presenterCards = function (items = db.presenters) {
  let html = renderPresenterCardsWithOptionalDate(items);
  items.forEach(item => {
    const saved = db.siteSettings?.presenterDates?.[item.id] || {}, dayValue=item.day||saved.day||'', monthValue=item.month||saved.month||'';
    if (!dayValue && !monthValue) return;
    const monthName = monthValue ? new Intl.DateTimeFormat('en-US',{month:'long'}).format(new Date(2000,Math.max(0,Number(monthValue)-1),1)) : '';
    const oldText = `${item.role} · ${item.year}`, newText = `${item.role} · ${[dayValue,monthName,item.year].filter(Boolean).join(' ')}`;
    html = html.replace(oldText,newText);
  });
  return html;
};

const renderFormWithPresenterDate = openForm;
openForm = function (type,id) {
  renderFormWithPresenterDate(type,id);
  if (type !== 'presenters') return;
  ensureHomePageSettings();
  const saved = db.siteSettings.presenterDates[id] || {};
  const item=id ? db.presenters.find(entry=>entry.id===id) : {}, input=document.querySelector('#modal [name="adminDate"]');
  if (input) input.value=datePartsToInput(item.day||saved.day,item.month||saved.month,item.year);
};

const submitFormWithPresenterDate = submitForm;
submitForm = function (event,type,id) {
  const beforeIds = type === 'presenters' ? new Set(db.presenters.map(item=>item.id)) : null;
  submitFormWithPresenterDate(event,type,id);
  if (type !== 'presenters') return;
  ensureHomePageSettings();
  const item = id ? db.presenters.find(entry=>entry.id===id) : db.presenters.find(entry=>!beforeIds.has(entry.id));
  if (!item) return;
  db.siteSettings.presenterDates[item.id] = {day:item.day||'',month:item.month||''};
  save();
};

const renderFormWithAwardDate = openForm;
openForm = function (type,id) {
  renderFormWithAwardDate(type,id);
  if (type !== 'awards') return;
  ensureHomePageSettings();
  const saved=db.siteSettings.awardDates[id]||{}, item=id ? db.awards.find(entry=>entry.id===id) : {}, input=document.querySelector('#modal [name="adminDate"]');
  if (input) input.value=datePartsToInput(item.day||saved.day,item.month||saved.month,item.year);
};

const submitFormWithAwardDate = submitForm;
submitForm = function (event,type,id) {
  const beforeIds=type==='awards' ? new Set(db.awards.map(item=>item.id)) : null;
  submitFormWithAwardDate(event,type,id);
  if (type !== 'awards') return;
  ensureHomePageSettings();
  const item=id ? db.awards.find(entry=>entry.id===id) : db.awards.find(entry=>!beforeIds.has(entry.id));
  if (!item) return;
  db.siteSettings.awardDates[item.id]={day:item.day||'',month:item.month||''};
  save();
};

function datePartsToInput(day,month,year) {
  if (!day || !month || !year) return '';
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

const submitFormWithUnifiedDatePicker = submitForm;
submitForm = function (event,type,id) {
  if (type === 'presenters' || type === 'awards') {
    const dateInput=event.target.querySelector('[name="adminDate"]');
    if (dateInput?.value) {
      const [year,month,day]=dateInput.value.split('-');
      dateInput.removeAttribute('name');
      [['year',year],['month',String(Number(month))],['day',String(Number(day))]].forEach(([name,value])=>{
        const hidden=document.createElement('input'); hidden.type='hidden'; hidden.name=name; hidden.value=value; event.target.appendChild(hidden);
      });
    }
  }
  submitFormWithUnifiedDatePicker(event,type,id);
};

const renderNavWithoutYoutube = nav;
nav = function(active){return renderNavWithoutYoutube(active).replace(/<a[^>]*href="#videos"[^>]*>.*?<\/a>/,'');};

const renderHomeWithAuauSaveTimeline = home;
home = function(){
  renderHomeWithAuauSaveTimeline();
  document.querySelector('.path-section')?.remove();
  const heroScroll=document.querySelector('.hero .scroll');if(heroScroll)heroScroll.innerHTML='<span>↓</span> EXPLORE AUAUSAVE';
  [...document.querySelectorAll('main .section')].forEach(section=>{if(section.querySelector('.featured-watch')||section.querySelector('h2')?.textContent.includes('YouTube'))section.remove();});
  document.querySelector('.home-timeline')?.remove();
  const timelineHtml=artistSeriesSection('duo').replace('section artist-filmography','section artist-filmography home-timeline');
  const presenter=document.querySelector('.presenter-home'),main=document.querySelector('main');
  if(presenter)presenter.insertAdjacentHTML('beforebegin',timelineHtml);else main?.insertAdjacentHTML('beforeend',timelineHtml);
};
const renderProfileWithoutLegacyVideos = profile;
function applyArtistPageSectionLayout(artistId){ensureHomePageSettings();const archive=db.siteSettings.artistArchive[artistId];if(!archive)return;const main=document.querySelector('main');if(!main)return;const headings=[...main.querySelectorAll('h2')];const timeline=main.querySelector('.artist-filmography');const events=(headings.find(h=>h.textContent.trim().toLowerCase()==='events')||headings.find(h=>h.textContent.toLowerCase().includes('schedule')))?.closest('.section');const awards=main.querySelector('.archive-awards')||main.querySelector('.award-grid')?.closest('.section');const sections={timeline,events,awards};Object.entries(sections).forEach(([kind,node])=>{if(!node)return;const def=artistPageSectionDefs[kind];node.style.display=archive.visibility[def.visibilityKey]===false?'none':'';});const nodes=archive.sectionOrder.map(kind=>sections[kind]).filter(Boolean);if(!nodes.length)return;const first=nodes.slice().sort((a,b)=>(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)?-1:1)[0];const marker=document.createComment('artist-page-sections');first.parentNode.insertBefore(marker,first);archive.sectionOrder.forEach(kind=>{const node=sections[kind];if(node&&archive.visibility[artistPageSectionDefs[kind].visibilityKey]!==false)marker.parentNode.insertBefore(node,marker);});marker.remove();}
profile = function(id){id=canonicalArtistId(id);renderProfileWithoutLegacyVideos(id);[...document.querySelectorAll('main .section')].forEach(section=>{if(section.querySelector('.youtube-grid'))section.remove();});applyArtistPageSectionLayout(id);};

function normalizeAdminMenu(){
  const navEl=document.querySelector('.side-nav');if(!navEl)return;
  const entries=[
    ['dashboard','⌂','Dashboard'],['pagecontent','▤','จัดการหน้าแรก'],['artists','◉','ข้อมูลส่วนตัว'],['events','▦','ตารางงาน'],['timeline','◷','Timeline'],['presenters','✦','Presenters'],['awards','◇','Awards'],['master','⚙','Master Data'],
  ];
  navEl.innerHTML=entries.map(([id,icon,label])=>`<button data-icon="${icon}" class="${adminTab===id?'active':''}" onclick="adminTab='${id}';admin()">${icon} &nbsp; ${label}</button>`).join('');
}
const renderAdminWithStableMenu = admin;
admin = function(){renderAdminWithStableMenu();if(adminAuthenticated)normalizeAdminMenu();};

function normalizeBulkEventDate(value){
  const text=String(value||'').trim();
  if(!text)return'';
  if(/^\d{5}(?:\.\d+)?$/.test(text)){const date=new Date(Date.UTC(1899,11,30)+Number(text)*86400000);return date.toISOString().slice(0,10);}
  const parts=text.replace(/[./]/g,'-').split('-').map(part=>part.trim());
  if(parts.length!==3)return'';
  let year,monthValue,dayValue;
  if(parts[0].length===4)[year,monthValue,dayValue]=parts;else [dayValue,monthValue,year]=parts;
  if(year.length===2)year=`20${year}`;
  const monthNumber=Number(monthValue),dayNumber=Number(dayValue),yearNumber=Number(year),date=`${yearNumber}-${String(monthNumber).padStart(2,'0')}-${String(dayNumber).padStart(2,'0')}`;
  const parsed=new Date(Date.UTC(yearNumber,monthNumber-1,dayNumber));
  return parsed.getUTCFullYear()===yearNumber&&parsed.getUTCMonth()===monthNumber-1&&parsed.getUTCDate()===dayNumber?date:'';
}
function bulkEventArtistIds(value){
  const raw = String(value||'').trim();
  const ids = new Set();
  const add = id => { const target=canonicalArtistId(id); if(db.artists.some(artist=>sameArtistId(artist.id,target))) ids.add(target); };
  const normalizeArtistText = text => String(text||'')
    .toLowerCase()
    .replace(/&/g,' and ')
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .trim()
    .replace(/\s+/g,' ');
  const compactArtistText = text => normalizeArtistText(text).replace(/\s+/g,'');
  const input = normalizeArtistText(raw);
  const inputCompact = compactArtistText(raw);
  const isCoupleInput = inputCompact.includes('auausave') || inputCompact.includes('auausaveth') || /#?\s*auau\s*save/i.test(raw);
  const distance = (a,b) => {
    if(!a || !b) return Math.max(a.length,b.length);
    const costs = Array.from({length:b.length+1},(_,index)=>index);
    for(let i=1;i<=a.length;i++){
      let diagonal = i - 1;
      costs[0] = i;
      for(let j=1;j<=b.length;j++){
        const above = costs[j];
        costs[j] = a[i-1]===b[j-1] ? diagonal : Math.min(diagonal+1,costs[j-1]+1,above+1);
        diagonal = above;
      }
    }
    return costs[b.length];
  };
  if(isCoupleInput) {
    add('AT01');
    return [...ids];
  }
  const directArtistAlias = {
    auau: 'AT02',
    aauu: 'AT02',
    save: 'AT03',
    mhiipraew: 'AT04',
    mhipraew: 'AT04',
    miiipraew: 'AT04',
    mp: 'AT04',
  }[inputCompact];
  if (directArtistAlias) {
    add(directArtistAlias);
    return [...ids];
  }
  db.artists.forEach(artist => {
    const keys = [artist.id, artist.name, artist.realName]
      .map(key=>({spaced:normalizeArtistText(key),compact:compactArtistText(key)}))
      .filter(key=>key.compact.length>=3);
    const exactMatch = keys.some(key => inputCompact===key.compact || inputCompact.includes(key.compact) || (inputCompact.length >= 6 && key.compact.includes(inputCompact)));
    const fuzzyMatch = keys.some(key => inputCompact.length>=5 && key.compact.length>=5 && distance(inputCompact,key.compact)<=2);
    const tokenMatch = keys.some(key => {
      const keyTokens = key.spaced.split(' ').filter(token=>token.length>=3);
      return keyTokens.length && keyTokens.every(token=>input.split(' ').some(inputToken=>inputToken===token || distance(inputToken,token)<=1));
    });
    if(exactMatch || fuzzyMatch || tokenMatch) ids.add(canonicalArtistId(artist.id));
  });
  return [...ids];
}
function bulkEventArtistId(value){return bulkEventArtistIds(value)[0]||'';}
function bulkEventTypes(value){const text=String(value||'').toLowerCase(),matches=db.masterData.types.filter(type=>text.includes(String(type.label||type.id).toLowerCase())).map(type=>type.label);return matches.length?[...new Set(matches)].join(' | '):String(value||'').trim().replace(/\s*[,/]\s*/g,' | ');}
function parseBulkEvents(text){
  const rows=String(text||'').split(/\r?\n/).map(line=>line.split('\t').map(cell=>cell.trim())).filter(row=>row.some(Boolean));
  if(!rows.length)return{items:[],errors:['ยังไม่มีข้อมูลที่วาง']};
  const normalized=rows[0].map(cell=>cell.toLowerCase().replace(/[^a-z]/g,'')),hasHeader=normalized.some(cell=>cell==='eventdate'||cell==='nameevent');
  const aliases={type:['type'],artist:['solopartner','artist','path'],date:['eventdate','date'],time:['time'],title:['nameevent','eventname','title']};
  const columns={type:1,artist:2,date:3,time:4,title:5};
  if(hasHeader)Object.entries(aliases).forEach(([key,names])=>{const index=normalized.findIndex(value=>names.includes(value));if(index>=0)columns[key]=index;});
  const items=[],errors=[];
  rows.slice(hasHeader?1:0).forEach((row,index)=>{const rowNumber=index+(hasHeader?2:1),date=normalizeBulkEventDate(row[columns.date]),artistIds=bulkEventArtistIds(row[columns.artist]),artistId=artistIds[0]||'',title=String(row[columns.title]||'').trim(),type=bulkEventTypes(row[columns.type]);if(!date||!artistId||!title||!type){errors.push(`แถว ${rowNumber}: ข้อมูล Date, Solo/Partner, Type หรือ Name Event ไม่ครบ/ไม่ถูกต้อง`);return;}items.push({id:`e${Date.now()}_${index}`,artistId,artistIds,date,title,place:String(row[columns.time]||'').trim(),type,seriesId:'',source:'',poster:''});});
  return{items,errors};
}
function openBulkEventForm(){document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal bulk-event-modal"><div class="modal-head"><div><small>PASTE FROM EXCEL</small><h2>เพิ่มตารางงานหลายรายการ</h2></div><button class="close" onclick="closeModal()">×</button></div><p class="bulk-event-help">คัดลอกตารางจาก Excel แล้ววางด้านล่าง รองรับคอลัมน์ Month, Type, Solo/Partner, Event Date, Time และ Name Event โดยไม่ต้องใส่รูป</p><form onsubmit="saveBulkEvents(event)"><div class="field"><label>ข้อมูลจาก Excel</label><textarea name="excelData" class="bulk-event-textarea" placeholder="Month&#9;Type&#9;Solo/Partner&#9;Event Date&#9;Time&#9;Name Event&#10;JULY&#9;LIVE&#9;#AuauSave&#9;2026.07.08&#9;19.00 น.&#9;8.7 AUAUSAVE X ATIPA LIVE" required></textarea><small>สามารถวางหลายแถวพร้อมกันได้ ระบบจะข้ามหัวตารางให้อัตโนมัติ</small></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">เพิ่มรายการทั้งหมด</button></div></form></div></div>`);}
function saveBulkEvents(event){event.preventDefault();const result=parseBulkEvents(new FormData(event.currentTarget).get('excelData'));if(result.errors.length){const preview=result.errors.slice(0,5).join('\n');alert(`${preview}${result.errors.length>5?`\nและอีก ${result.errors.length-5} แถว`:''}`);return;}const existing=new Set(db.events.map(item=>`${item.date}|${String(item.title).trim().toLowerCase()}`)),unique=result.items.filter(item=>!existing.has(`${item.date}|${item.title.toLowerCase()}`));if(!unique.length){alert('ไม่พบรายการใหม่ ข้อมูลอาจมีอยู่ในระบบแล้ว');return;}db.events.unshift(...unique);save();closeModal();admin();toast(`เพิ่มตารางงาน ${unique.length} รายการแล้ว`);}
function addBulkEventButton(){if(!adminAuthenticated||adminTab!=='events')return;const top=document.querySelector('.admin-main .admin-top'),addButton=top?.querySelector('button.btn');if(!top||!addButton||top.querySelector('[data-bulk-events]'))return;const actions=document.createElement('div');actions.className='admin-top-actions';addButton.before(actions);actions.append(addButton);actions.insertAdjacentHTML('afterbegin','<button class="btn outline" data-bulk-events onclick="openBulkEventForm()">⧉ วางจาก Excel</button>');}
const renderAdminWithBulkEvents=admin;
admin=function(){renderAdminWithBulkEvents();addBulkEventButton();};

let cropImageState=null;
function imageCropPreset(field){
  const orientationSelect=document.querySelector('#modal [name="imageOrientation"]'),canChoose=Boolean(orientationSelect);
  if(canChoose)return{canChoose,orientation:orientationSelect.value==='landscape'?'landscape':'portrait'};
  if(field==='heroImage')return{canChoose:false,orientation:'square',ratio:.976,shape:'hero'};
  if(field==='thumbnail')return{canChoose:false,orientation:'landscape',ratio:16/9,shape:'video'};
  if(field==='logo')return{canChoose:false,orientation:'square',ratio:1,shape:'logo'};
  if(field==='announcementImage')return{canChoose:false,orientation:'landscape',ratio:16/10,shape:'presenter'};
  if(field==='image'&&adminTab==='awards')return{canChoose:false,orientation:'portrait',ratio:2/3,shape:'award'};
  if(field==='image'&&adminTab==='artists')return{canChoose:false,orientation:'portrait',ratio:3/4,shape:'artist'};
  if(field==='poster'&&adminTab==='events')return{canChoose:false,orientation:'portrait',ratio:3/4,shape:'event'};
  return{canChoose:false,orientation:'portrait',ratio:3/4,shape:'timeline'};
}
function cropRatio(state=cropImageState){return state.preset.ratio||(state.orientation==='landscape'?16/9:3/4);}
function cropCanvasSize(){const ratio=cropRatio(),width=1200;return{width,height:Math.round(width/ratio)};}
function cropFrameClass(){if(!cropImageState)return'';if(cropImageState.preset.canChoose)return cropImageState.orientation==='landscape'?'crop-frame-timeline-landscape':'crop-frame-timeline-portrait';return`crop-frame-${cropImageState.preset.shape||'default'}`;}
function drawCropPreview(){
  const state=cropImageState,canvas=document.querySelector('#cropImageCanvas');if(!state||!canvas)return;
  const size=cropCanvasSize();canvas.width=size.width;canvas.height=size.height;
  const context=canvas.getContext('2d'),base=Math.max(size.width/state.image.naturalWidth,size.height/state.image.naturalHeight),scale=base*state.zoom,drawWidth=state.image.naturalWidth*scale,drawHeight=state.image.naturalHeight*scale,maxX=Math.max(0,(drawWidth-size.width)/2),maxY=Math.max(0,(drawHeight-size.height)/2),x=(size.width-drawWidth)/2+(state.panX/100)*maxX,y=(size.height-drawHeight)/2+(state.panY/100)*maxY;
  context.clearRect(0,0,size.width,size.height);context.drawImage(state.image,x,y,drawWidth,drawHeight);
  canvas.className=`${cropFrameClass()}${state.drag?' is-dragging':''}`;const label=document.querySelector('#cropRatioLabel');if(label)label.textContent=state.preset.shape==='hero'?'กรอบ Hero หน้าบ้าน':state.orientation==='landscape'?'แนวนอน':state.orientation==='square'?'สี่เหลี่ยม':'แนวตั้ง';
}
function updateCropControl(name,value){if(!cropImageState)return;cropImageState[name]=Number(value);drawCropPreview();}
function cropDragStart(event){if(!cropImageState)return;const canvas=event.currentTarget;canvas.setPointerCapture?.(event.pointerId);cropImageState.drag={x:event.clientX,y:event.clientY,panX:cropImageState.panX,panY:cropImageState.panY};canvas.classList.add('is-dragging');}
function cropDragMove(event){const state=cropImageState,drag=state?.drag,canvas=event.currentTarget;if(!state||!drag)return;const size=cropCanvasSize(),base=Math.max(size.width/state.image.naturalWidth,size.height/state.image.naturalHeight),scale=base*state.zoom,overflowX=Math.max(0,(state.image.naturalWidth*scale-size.width)/2),overflowY=Math.max(0,(state.image.naturalHeight*scale-size.height)/2),factor=size.width/Math.max(canvas.getBoundingClientRect().width,1),clamp=value=>Math.max(-100,Math.min(100,value));state.panX=overflowX?clamp(drag.panX+((event.clientX-drag.x)*factor/overflowX)*100):0;state.panY=overflowY?clamp(drag.panY+((event.clientY-drag.y)*factor/overflowY)*100):0;document.querySelector('#cropPanX').value=state.panX;document.querySelector('#cropPanY').value=state.panY;drawCropPreview();}
function cropDragEnd(event){if(!cropImageState)return;cropImageState.drag=null;event.currentTarget.classList.remove('is-dragging');event.currentTarget.releasePointerCapture?.(event.pointerId);}
function changeCropOrientation(value){if(!cropImageState)return;cropImageState.orientation=value==='landscape'?'landscape':'portrait';cropImageState.zoom=1;cropImageState.panX=0;cropImageState.panY=0;document.querySelector('#cropZoom').value='1';document.querySelector('#cropPanX').value='0';document.querySelector('#cropPanY').value='0';drawCropPreview();}
function closeCropImage(){const state=cropImageState;document.querySelector('#cropImageModal')?.remove();if(state?.input){state.input.value='';const submit=state.input.closest('form')?.querySelector('[type="submit"]');if(submit)submit.disabled=false;}cropImageState=null;}
function applyCroppedImage(){
  const state=cropImageState,previewCanvas=document.querySelector('#cropImageCanvas');if(!state||!previewCanvas)return;
  const ratio=cropRatio(),output=document.createElement('canvas');output.width=state.orientation==='landscape'?1200:(state.orientation==='square'?1000:900);output.height=Math.round(output.width/ratio);output.getContext('2d').drawImage(previewCanvas,0,0,output.width,output.height);
  const data=output.toDataURL('image/jpeg',.88),hidden=document.querySelector(`#modal [name="${state.field}"]`),preview=document.querySelector(`#uploadPreview_${state.field}`);if(hidden)hidden.value=data;if(preview){preview.classList.add('has-image');preview.innerHTML=`<img src="${data}" alt="preview">`;}
  const orientationSelect=document.querySelector('#modal [name="imageOrientation"]');if(state.preset.canChoose&&orientationSelect)orientationSelect.value=state.orientation;
  const submit=state.input.closest('form')?.querySelector('[type="submit"]');if(submit)submit.disabled=false;document.querySelector('#cropImageModal')?.remove();cropImageState=null;toast('ปรับรูปเรียบร้อยแล้ว กดบันทึกเพื่อยืนยัน');
}
function openCropImage(input,field,image,preset){
  cropImageState={input,field,image,preset,orientation:preset.orientation,zoom:1,panX:0,panY:0};const submit=input.closest('form')?.querySelector('[type="submit"]');if(submit)submit.disabled=true;
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop crop-image-backdrop" id="cropImageModal"><div class="modal crop-image-modal"><div class="modal-head"><div><small>ADJUST IMAGE</small><h2>Crop Image / Adjust Image</h2><p>ลากรูปด้วยเมาส์หรือนิ้วเพื่อจัดตำแหน่งให้พอดีกับกรอบหน้าบ้าน</p></div><button class="close" onclick="closeCropImage()">×</button></div>${preset.canChoose?`<div class="crop-orientation"><b>เลือกรูปแบบรูปก่อนปรับ</b><div><button type="button" class="${preset.orientation==='portrait'?'active':''}" onclick="this.parentElement.querySelectorAll('button').forEach(button=>button.classList.remove('active'));this.classList.add('active');changeCropOrientation('portrait')">▯ แนวตั้ง</button><button type="button" class="${preset.orientation==='landscape'?'active':''}" onclick="this.parentElement.querySelectorAll('button').forEach(button=>button.classList.remove('active'));this.classList.add('active');changeCropOrientation('landscape')">▭ แนวนอน</button></div></div>`:''}<div class="crop-stage"><canvas id="cropImageCanvas" onpointerdown="cropDragStart(event)" onpointermove="cropDragMove(event)" onpointerup="cropDragEnd(event)" onpointercancel="cropDragEnd(event)"></canvas><span id="cropRatioLabel"></span></div><div class="crop-controls"><label><span>ซูมเข้า–ออก</span><input id="cropZoom" type="range" min="1" max="3" value="1" step="0.01" oninput="updateCropControl('zoom',this.value)"></label><label><span>เลื่อนซ้าย–ขวา</span><input id="cropPanX" type="range" min="-100" max="100" value="0" oninput="updateCropControl('panX',this.value)"></label><label><span>เลื่อนขึ้น–ลง</span><input id="cropPanY" type="range" min="-100" max="100" value="0" oninput="updateCropControl('panY',this.value)"></label></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeCropImage()">ยกเลิก</button><button type="button" class="btn" onclick="applyCroppedImage()">ใช้รูปที่ปรับแล้ว</button></div></div></div>`);drawCropPreview();
}
handleImageUpload=function(input,field){const file=input.files?.[0];if(!file)return;if(file.size>8*1024*1024){toast('กรุณาเลือกรูปขนาดไม่เกิน 8 MB');input.value='';return;}const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>openCropImage(input,field,image,imageCropPreset(field));image.onerror=()=>{input.value='';toast('ไม่สามารถอ่านไฟล์รูปนี้ได้ กรุณาเลือกไฟล์ใหม่');};image.src=reader.result;};reader.onerror=()=>{input.value='';toast('ไม่สามารถอ่านไฟล์รูปนี้ได้ กรุณาเลือกไฟล์ใหม่');};reader.readAsDataURL(file);};

const openHomeSettingsWithOverlay=openHomeSettings;
openHomeSettings=function(){openHomeSettingsWithOverlay();const grid=document.querySelector('#modal .form-grid'),settings=db.siteSettings;if(!grid)return;grid.querySelector('[name="heroFit"]')?.closest('.field')?.remove();grid.querySelector('[name="heroPosition"]')?.closest('.field')?.remove();grid.insertAdjacentHTML('beforeend',`<div class="field full hero-overlay-settings"><label>ข้อความบนรูปหน้าหลัก</label><input name="heroOverlayText" value="${escapePageText(settings.heroOverlayText??'STAY CLOSE. STAY INSPIRED.')}" placeholder="STAY CLOSE. STAY INSPIRED."><label class="hero-overlay-toggle"><input type="checkbox" name="heroOverlayVisible" ${settings.heroOverlayVisible!==false?'checked':''}><span>แสดงข้อความบนรูปหน้าบ้าน</span></label></div>`);};
const saveHomeSettingsWithOverlay=saveHomeSettings;
saveHomeSettings=function(event){const visible=event.currentTarget.querySelector('[name="heroOverlayVisible"]')?.checked!==false,text=event.currentTarget.querySelector('[name="heroOverlayText"]')?.value?.trim()||'';saveHomeSettingsWithOverlay(event);db.siteSettings.heroFit='cover';db.siteSettings.heroPosition='center';db.siteSettings.heroOverlayText=text;db.siteSettings.heroOverlayVisible=visible;save();};
function applyHeroOverlaySettings(){const settings=db.siteSettings,hero=document.querySelector('.hero-art');if(hero){hero.dataset.overlayText=settings.heroOverlayText??'STAY CLOSE. STAY INSPIRED.';hero.classList.toggle('hide-overlay-text',settings.heroOverlayVisible===false);if(settings.heroImage){hero.style.backgroundSize='cover';hero.style.backgroundPosition='center';}}const preview=document.querySelector('.hero-setting-preview');if(preview){preview.dataset.overlayText=settings.heroOverlayText??'STAY CLOSE. STAY INSPIRED.';preview.classList.toggle('hide-overlay-text',settings.heroOverlayVisible===false);const image=preview.querySelector('img');if(image){image.style.objectFit='cover';image.style.objectPosition='center';}}const settingsButton=document.querySelector('[data-home-action="hero-settings"]');if(settingsButton)settingsButton.textContent='ตั้งค่ารูปและข้อความบนรูป';}
const renderHomeWithEditableOverlay=home;
home=function(){renderHomeWithEditableOverlay();applyHeroOverlaySettings();};
const renderPageContentWithAccurateHeroPreview=pageContentAdmin;
pageContentAdmin=function(){renderPageContentWithAccurateHeroPreview();applyHeroOverlaySettings();};

function homeSectionDragStart(event,index){
  event.dataTransfer.setData('text/plain',String(index));
  event.dataTransfer.effectAllowed='move';
}
function homeSectionDrop(event,index){
  event.preventDefault();
  const from=Number(event.dataTransfer.getData('text/plain'));
  const list=db.siteSettings.homeSections;
  if(Number.isNaN(from)||from===index||from<0||index<0||from>=list.length||index>=list.length)return;
  const [item]=list.splice(from,1);
  list.splice(index,0,item);
  save(); pageContentAdmin(); toast('บันทึกลำดับหน้าแรกแล้ว');
}
function homeSectionLabel(id){
  return ({hero:'Hero / Main visual',artists:'Artist cards',schedule:'Schedule',timeline:'Timeline',presenters:'Presenters'}[id]||id);
}
function renderHomepageLiveEditor(){
  ensureHomePageSettings(); ensureLocalizationSettings();
  const sections=db.siteSettings.homeSections;
  const hero=sections.find(section=>section.id==='hero')||{};
  const cardIds=['couplePath','soloPath','scheduleDuo','scheduleAuau','scheduleSave'];
  return `<section class="panel homepage-live-editor"><div class="panel-head"><div><small>HOMEPAGE PREVIEW & CONTENT</small><h2>แก้ไขหน้าแรกจากตัวอย่างหน้าบ้าน</h2><p class="master-note">รวมรูปหลัก ข้อความหัวหน้าแรก และข้อความในการ์ดไว้ในหน้าเดียว กดปุ่มแก้ไขตรงส่วนที่ต้องการได้เลย</p></div><div class="home-preview-actions"><button class="btn outline" onclick="openPageTextEditor('home','en')">แก้ไขหัวข้อหลัก</button><button class="btn" onclick="openHomeSettings()">ตั้งค่ารูปหลัก</button></div></div><div class="homepage-live-preview"><article class="live-hero-preview ${hero.visible===false?'is-hidden':''}"><div><small>${escapePageText(hero.eyebrow||'AUAUSAVE FANBASE')}</small><h3>${escapePageText(hero.title||'OUR HOUSE. OUR STORY.').replace(/\n/g,'<br>')}</h3><p>${escapePageText(hero.description||'')}</p></div><label class="timeline-visibility-switch"><input type="checkbox" ${hero.visible===false?'':'checked'} onchange="toggleHomeSection('hero')"><span>${hero.visible===false?'ซ่อนอยู่':'แสดงอยู่'}</span></label></article><div class="live-card-preview-grid">${cardIds.map(id=>{const card=db.siteSettings.homeCards?.[id]||{};return `<article class="live-card-preview"><small>${escapePageText(card.eyebrow||'')}</small><h3>${escapePageText(card.title||'')}</h3><p>${escapePageText(card.description||'')}</p><button class="btn outline" onclick="openHomeCardEditor('${id}')">แก้ไขคำ</button></article>`;}).join('')}</div></div></section>`;
}
function renderHomepageOrderEditor(){
  ensureHomePageSettings();
  const sections=db.siteSettings.homeSections;
  return `<section class="panel homepage-order-editor"><div class="panel-head"><div><small>HOMEPAGE ORDER</small><h2>จัดลำดับหน้าแรก</h2><p class="master-note">ลากกล่องเพื่อเรียงลำดับการแสดงผลบนหน้าบ้าน หรือเปิด/ปิด section ได้จากตรงนี้</p></div></div><div class="section-builder-list draggable-home-sections">${sections.map((s,i)=>`<article draggable="true" ondragstart="homeSectionDragStart(event,${i})" ondragover="event.preventDefault()" ondrop="homeSectionDrop(event,${i})" class="builder-item ${s.visible===false?'is-hidden':''}"><div class="builder-order"><b>↕</b><span>${String(i+1).padStart(2,'0')}</span></div><div class="builder-content"><small>${escapePageText(homeSectionLabel(s.id))}</small><h3>${escapePageText(String(s.title||'').replace(/\n/g,' / '))}</h3><p>${escapePageText(s.description||'ไม่มีคำอธิบาย')}</p></div><div class="builder-actions"><button class="visibility-btn" onclick="toggleHomeSection('${s.id}')">${s.visible===false?'○ ซ่อนอยู่':'● แสดงอยู่'}</button><button class="btn outline" onclick="editHomeSection('${s.id}')">แก้ไขข้อความ</button></div></article>`).join('')}</div></section>`;
}
const pageContentAdminBeforeHomepageRefresh=pageContentAdmin;
pageContentAdmin=function(){
  const requestedHomeBuilderTab=homeBuilderTab;
  if(requestedHomeBuilderTab==='content')homeBuilderTab='preview';
  pageContentAdminBeforeHomepageRefresh();
  if(!adminAuthenticated||adminTab!=='pagecontent')return;
  homeBuilderTab=requestedHomeBuilderTab==='content'?'content':requestedHomeBuilderTab==='order'?'order':'order';
  const oldTabs=document.querySelector('.home-builder-tabs');
  oldTabs?.remove();
  document.querySelector('.admin-top')?.insertAdjacentHTML('afterend',`<nav class="home-builder-tabs" aria-label="เมนูจัดหน้าแรก"><button class="${homeBuilderTab==='order'?'active':''}" onclick="homeBuilderTab='order';pageContentAdmin()">จัดลำดับ</button><button class="${homeBuilderTab==='content'?'active':''}" onclick="homeBuilderTab='content';pageContentAdmin()">แก้ไขหน้าแรก</button></nav>`);
  document.querySelector('.home-setting-panel')?.remove();
  document.querySelector('.home-card-settings')?.remove();
  document.querySelector('.builder-note')?.remove();
  document.querySelector('.section-builder-list')?.remove();
  const main=document.querySelector('.admin-main');
  main?.insertAdjacentHTML('beforeend',homeBuilderTab==='order'?renderHomepageOrderEditor():renderHomepageLiveEditor());
  applyHeroOverlaySettings();
  applyInterfaceLanguage();
};
function ensureHomepageArtistCards(){
  ensureHomePageSettings();
  db.siteSettings.homeArtistCards ||= {};
  db.siteSettings.homeArtistOrder = Array.isArray(db.siteSettings.homeArtistOrder) ? db.siteSettings.homeArtistOrder : [];
  const artistIds = sortedArtists().map(artist => artist.id);
  db.siteSettings.homeArtistOrder = db.siteSettings.homeArtistOrder.filter(id => artistIds.includes(id));
  db.artists.forEach(artist => {
    if (!db.siteSettings.homeArtistOrder.includes(artist.id)) db.siteSettings.homeArtistOrder.push(artist.id);
    db.siteSettings.homeArtistCards[artist.id] = {badge: sameArtistId(artist.id,'duo') ? 'COUPLE PATH' : 'SOLO PATH', visible: true, ...(db.siteSettings.homeArtistCards[artist.id] || {})};
  });
}
function homepageOrderedArtists(){
  ensureHomepageArtistCards();
  const map = new Map(sortedArtists().map(artist => [artist.id, artist]));
  return db.siteSettings.homeArtistOrder.map(id => map.get(id)).filter(Boolean);
}
const artistCardsBeforeHomepageOrder = artistCards;
artistCards = function(){
  const cards = homepageOrderedArtists().filter(artist => db.siteSettings.homeArtistCards[artist.id]?.visible !== false);
  return `<div class="artists homepage-artist-grid">${cards.map(artist => {const settings=db.siteSettings.homeArtistCards[artist.id]||{};return `<article class="artist-card" onclick="location.hash='artist/${artist.id}'"><div class="portrait" style="background:${artist.color}">${artist.image?`<img src="${escapePageText(artist.image)}" alt="${escapePageText(artist.name)}">`:`<span>${escapePageText(artist.initial)}</span>`}<small class="tag">${escapePageText(settings.badge||'')}</small></div><div class="artist-meta"><span class="arrow">↗</span><h3>${escapePageText(artist.name)}</h3><p>${escapePageText(artist.role)}</p></div></article>`;}).join('')}</div>`;
};
function homeArtistDragStart(event,artistId){event.dataTransfer.setData('text/plain',artistId);event.dataTransfer.effectAllowed='move';}
function homeArtistDrop(event,targetId){event.preventDefault();ensureHomepageArtistCards();const sourceId=event.dataTransfer.getData('text/plain'),list=db.siteSettings.homeArtistOrder,from=list.indexOf(sourceId),to=list.indexOf(targetId);if(from<0||to<0||from===to)return;const [item]=list.splice(from,1);list.splice(to,0,item);save();pageContentAdmin();toast('บันทึกลำดับการ์ดศิลปินแล้ว');}
function openHomeArtistBadgeEditor(artistId){
  ensureHomepageArtistCards();
  const artist=db.artists.find(item=>item.id===artistId),settings=db.siteSettings.homeArtistCards[artistId]||{};
  if(!artist)return;
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>แก้ไขการ์ด ${escapePageText(artist.name)}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveHomeArtistBadge(event,'${artistId}')"><div class="form-grid"><div class="field full"><label>ข้อความบนหัวการ์ด</label><input name="badge" value="${escapePageText(settings.badge||'')}" placeholder="COUPLE PATH / SOLO PATH"></div><div class="field full"><label class="hero-overlay-toggle"><input type="checkbox" name="visible" ${settings.visible!==false?'checked':''}><span>แสดงการ์ดนี้บนหน้าแรก</span></label></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกการ์ด</button></div></form></div></div>`);
}
function saveHomeArtistBadge(event,artistId){
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  db.siteSettings.homeArtistCards[artistId]={...(db.siteSettings.homeArtistCards[artistId]||{}),badge:(form.get('badge')||'').trim(),visible:form.get('visible')==='on'};
  save();closeModal();pageContentAdmin();toast('บันทึกการ์ดหน้าแรกแล้ว');
}
function renderHomepageArtistOrderEditor(){
  return `<section class="panel homepage-artist-order-editor"><div class="panel-head"><div><small>ARTIST CARD ORDER</small><h2>จัดวางการ์ดศิลปิน</h2><p class="master-note">ลากการ์ดเพื่อจัดตำแหน่งเหมือนหน้าบ้าน และเปิด/ปิดการ์ดได้</p></div></div><div class="home-artist-sort-grid">${homepageOrderedArtists().map((artist,index)=>{const settings=db.siteSettings.homeArtistCards[artist.id]||{};return `<article draggable="true" ondragstart="homeArtistDragStart(event,'${artist.id}')" ondragover="event.preventDefault()" ondrop="homeArtistDrop(event,'${artist.id}')" class="${settings.visible===false?'is-hidden':''}"><div class="home-artist-sort-order">↕ ${String(index+1).padStart(2,'0')}</div><div class="home-artist-sort-thumb" style="background:${artist.color}">${artist.image?`<img src="${escapePageText(artist.image)}" alt="">`:`<span>${escapePageText(artist.initial)}</span>`}<small>${escapePageText(settings.badge||'')}</small></div><div><h3>${escapePageText(artist.name)}</h3><p>${settings.visible===false?'Hidden':'Visible'}</p></div><button class="btn outline" onclick="openHomeArtistBadgeEditor('${artist.id}')">แก้ไข</button></article>`;}).join('')}</div></section>`;
}
function renderHomepageArtistLiveEditor(){
  return `<section class="panel homepage-artist-live-editor"><div class="panel-head"><div><small>ARTIST CARDS PREVIEW</small><h2>การ์ดศิลปินบนหน้าแรก</h2><p class="master-note">แก้ข้อความหัวการ์ด เช่น COUPLE PATH / SOLO PATH ได้จากแต่ละใบ</p></div></div><div class="live-card-preview-grid artist-live-card-grid">${homepageOrderedArtists().map(artist=>{const settings=db.siteSettings.homeArtistCards[artist.id]||{};return `<article class="live-card-preview ${settings.visible===false?'is-hidden':''}"><small>${escapePageText(settings.badge||'')}</small><h3>${escapePageText(artist.name)}</h3><p>${escapePageText(artist.role||'')}</p><button class="btn outline" onclick="openHomeArtistBadgeEditor('${artist.id}')">แก้ไขการ์ด</button></article>`;}).join('')}</div></section>`;
}
const pageContentAdminBeforeArtistHomepageControls = pageContentAdmin;
pageContentAdmin = function(){
  pageContentAdminBeforeArtistHomepageControls();
  if(!adminAuthenticated||adminTab!=='pagecontent')return;
  const main=document.querySelector('.admin-main');
  if(homeBuilderTab==='order') main?.insertAdjacentHTML('beforeend',renderHomepageArtistOrderEditor());
  if(homeBuilderTab==='content') main?.insertAdjacentHTML('beforeend',renderHomepageArtistLiveEditor());
};
function eventArtistIds(item){
  let ids = Array.isArray(item?.artistIds) ? item.artistIds : [];
  if(!ids.length && typeof item?.artistIds === 'string' && item.artistIds.trim().startsWith('[')){
    try { ids = JSON.parse(item.artistIds); } catch { ids = []; }
  }
  const base = ids.length ? ids : [item?.artistId].filter(Boolean);
  const normalized = [...new Set(base.map(canonicalArtistId))].filter(id => db.artists.some(artist => sameArtistId(artist.id, id)));
  return normalized.includes('AT01') ? ['AT01'] : normalized;
}
function eventArtistNames(item){
  const ids = eventArtistIds(item);
  return ids.length ? ids.map(artistName).join(' · ') : artistName(item?.artistId);
}
function eventPrimaryArtistId(item){
  return eventArtistIds(item)[0] || item?.artistId || '';
}
itemMatchesArtist = (item, artistId) => {
  artistId = canonicalArtistId(artistId);
  if (artistId === 'all') return true;
  const ids = eventArtistIds(item);
  return ids.includes(artistId);
};
const rowCellsBeforeDynamicEventArtists = rowCells;
rowCells = function(type,x){
  if(type === 'events') return `<td><b>${escapePageText(x.title)}</b></td><td>${escapePageText(eventArtistNames(x))}</td><td>${fmtDate(x.date)}</td>`;
  return rowCellsBeforeDynamicEventArtists(type,x);
};
const scheduleRowsBeforeDynamicEventArtists = scheduleRows;
scheduleRows = function(items = db.events){
  return items.length ? [...items].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<div class="schedule-row"><div class="date-box"><strong>${day(e.date)}</strong><span>${month(e.date)} ${new Date(e.date).getFullYear()}</span></div><div><h3>${escapePageText(e.title)}</h3><p>${escapePageText(eventArtistNames(e))} · ${escapePageText(e.place||'')}</p></div><span class="event-type">${escapePageText(e.type||'')}</span>${e.source ? `<a class="round-arrow" href="${escapePageText(e.source)}" target="_blank" title="ดูต้นทาง">↗</a>` : "<span></span>"}</div>`).join("") : `<div class="empty">ยังไม่มีข้อมูลในขณะนี้</div>`;
};
function eventBadge(item){
  return eventArtistIds(item).map(id => sameArtistId(id,'duo') ? '#AUAUSAVE' : artistName(id)).join(' · ') || 'ไม่ระบุ';
}
const adminEventCalendarBeforeDynamicArtists = adminEventCalendar;
adminEventCalendar = function(){
  const currentFilter = db.artists.some(artist => sameArtistId(artist.id, adminEventFilter)) ? canonicalArtistId(adminEventFilter) : 'all';
  adminEventFilter = currentFilter;
  const monthEvents = db.events.filter(e => e.date.startsWith(adminMonth) && itemMatchesArtist(e, adminEventFilter)).sort((a,b)=>a.date.localeCompare(b.date));
  const monthLabel = new Intl.DateTimeFormat(route === "admin" ? "th-TH" : "en-US", {month:"long",year:"numeric"}).format(new Date(`${adminMonth}-01`));
  const filters = [`<button class="${adminEventFilter==='all'?'active':''}" onclick="adminEventFilter='all';admin()">ทั้งหมด</button>`, ...sortedArtists().map(artist=>`<button class="${artist.id} ${sameArtistId(adminEventFilter,artist.id)?'active':''}" onclick="adminEventFilter='${artist.id}';admin()">${escapePageText(sameArtistId(artist.id,'duo')?'#AUAUSAVE':artist.name)}</button>`)].join('');
  const eventRows = monthEvents.map(e=>`<article class="admin-event-item ${escapePageText(eventPrimaryArtistId(e))}"><div class="admin-event-date"><b>${day(e.date)}</b><span>${month(e.date)}</span></div><div class="admin-event-info"><small>${escapePageText(eventBadge(e))} · ${escapePageText(e.type||'')}</small><h3>${escapePageText(e.title)}</h3><p>${escapePageText(e.place||'')}</p></div><div class="actions"><button class="icon-btn" onclick="openForm('events','${e.id}')">✎ แก้ไข</button><button class="icon-btn" onclick="removeItem('events','${e.id}')">⌫</button></div></article>`).join("") || `<div class="empty">เดือนนี้ยังไม่มีตารางงาน<br><button class="btn" style="margin-top:15px" onclick="openForm('events')">เพิ่มงานแรกของเดือน</button></div>`;
  app.innerHTML = `<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav">${Object.entries(configs).map(([k,v])=>`<button data-icon="${v.icon}" class="${k===adminTab?'active':''}" onclick="adminTab='${k}';admin()">${v.icon} &nbsp; ${v.label}</button>`).join("")}</div><a class="back" href="#schedule">← ดูปฏิทินหน้าบ้าน</a></aside><main class="admin-main"><div class="admin-top"><div><small style="color:var(--muted)">CALENDAR MANAGEMENT</small><h1>จัดการปฏิทินงาน</h1></div><button class="btn" onclick="openForm('events')">+ เพิ่มงานใหม่</button></div><section class="admin-cal-tools"><div><label>เลือกเดือน</label><input type="month" value="${adminMonth}" onchange="adminMonth=this.value;admin()"></div><div class="admin-filters dynamic-artist-filters">${filters}</div></section><div class="admin-month-title"><h2>${monthLabel}</h2><span>${monthEvents.length} งาน</span></div><section class="admin-event-list">${eventRows}</section></main></div></div>`;
};
const openFormBeforeDynamicEventArtists = openForm;
openForm = function(type,id){
  openFormBeforeDynamicEventArtists(type,id);
  if(type !== 'events') return;
  const item = id ? db.events.find(event => event.id === id) : {};
  const selected = eventArtistIds(item);
  if(!selected.length && !id && db.artists[0]) selected.push(db.artists[0].id);
  const select = document.querySelector('#modal [name="artistId"]');
  if(select){
  select.closest('.field').outerHTML = `<div class="multi-artist-picker event-artist-picker"><p>เลือกศิลปินได้มากกว่า 1</p>${sortedArtists().map(artist=>`<label><input type="checkbox" name="eventArtistIds" value="${artist.id}" ${selected.map(canonicalArtistId).includes(canonicalArtistId(artist.id))?'checked':''}><span>${escapePageText(artist.name)}</span></label>`).join('')}</div>`;
  }
};
const submitFormBeforeDynamicEventArtists = submitForm;
submitForm = function(event,type,id){
  let selectedArtistIds = [];
  let beforeIds = null;
  if(type === 'events'){
    selectedArtistIds = [...event.target.querySelectorAll('[name="eventArtistIds"]:checked')].map(input=>input.value);
    if(!selectedArtistIds.length){event.preventDefault();alert('กรุณาเลือกศิลปินอย่างน้อย 1 คน');return;}
    beforeIds = new Set(db.events.map(item=>item.id));
    event.target.querySelectorAll('[name="eventArtistIds"]').forEach(input=>input.disabled=true);
    const artistIdInput = document.createElement('input');
    artistIdInput.type='hidden'; artistIdInput.name='artistId'; artistIdInput.value=selectedArtistIds[0];
    const artistIdsInput = document.createElement('input');
    artistIdsInput.type='hidden'; artistIdsInput.name='artistIds'; artistIdsInput.value=JSON.stringify(selectedArtistIds);
    event.target.append(artistIdInput,artistIdsInput);
  }
  submitFormBeforeDynamicEventArtists(event,type,id);
  if(type === 'events'){
    const item = id ? db.events.find(entry=>entry.id===id) : db.events.find(entry=>!beforeIds.has(entry.id));
    if(item){item.artistId=selectedArtistIds[0];item.artistIds=selectedArtistIds;save();admin();}
  }
};
function artistScheduleCardClass(artistId,index){
  if(sameArtistId(artistId,'duo'))return'duo-card';
  if(sameArtistId(artistId,'auau'))return'auau-card';
  if(sameArtistId(artistId,'save'))return'save-card';
  return `dynamic-artist-card dynamic-artist-card-${index%4}`;
}
const homeScheduleSectionBeforeDynamicArtists = homeScheduleSection;
homeScheduleSection = function(){
  const now = new Date(), ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`, monthLabel = new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(now), monthly = db.events.filter(e => e.date.startsWith(ym));
  const cards = sortedArtists().map((artist,index)=>{
    const title = sameArtistId(artist.id,'duo') ? '#AUAUSAVE' : artist.name;
    const description = sameArtistId(artist.id,'duo') ? '#AuauSave' : (artist.role || artist.name);
    return `<article class="schedule-card ${artistScheduleCardClass(artist.id,index)}"><div class="schedule-card-head"><span>${sameArtistId(artist.id,'duo')?'COUPLE PATH':'ARTIST PATH'}</span><h3>${escapePageText(title)}</h3><p>${escapePageText(description)}</p></div>${compactSchedule(monthly.filter(e=>itemMatchesArtist(e,artist.id)))}</article>`;
  }).join('');
  return `<section class="section home-schedules"><div class="container"><div class="section-head"><div><span class="eyebrow">This month · ${monthLabel}</span><h2>ตารางงานเดือนนี้</h2></div><a class="btn outline" href="#schedule">เปิดปฏิทินทั้งหมด ↗</a></div><div class="schedule-columns dynamic-schedule-columns">${cards}</div></div></section>`;
};
function ensureHomepageFrontDisplaySettings(){
  ensureHomePageSettings();
  db.siteSettings.homeScheduleCards ||= {};
  db.siteSettings.homeScheduleOrder = Array.isArray(db.siteSettings.homeScheduleOrder) ? db.siteSettings.homeScheduleOrder : [];
  const artistIds = sortedArtists().map(artist=>artist.id);
  db.siteSettings.homeScheduleOrder = db.siteSettings.homeScheduleOrder.filter(id=>artistIds.includes(id));
  db.artists.forEach(artist=>{
    if(!db.siteSettings.homeScheduleOrder.includes(artist.id)) db.siteSettings.homeScheduleOrder.push(artist.id);
    db.siteSettings.homeScheduleCards[artist.id] = {
      visible:true,
      eyebrow: sameArtistId(artist.id,'duo') ? 'COUPLE PATH' : 'ARTIST PATH',
      title: sameArtistId(artist.id,'duo') ? '#AUAUSAVE' : artist.name,
      description: sameArtistId(artist.id,'duo') ? '#AuauSave' : (artist.role || artist.name),
      ...(db.siteSettings.homeScheduleCards[artist.id]||{})
    };
  });
  const priority = new Map(sortedArtists().map(artist=>[artist.id,artistSchedulePriority(artist)]));
  db.siteSettings.homeScheduleOrder.sort((a,b)=>(priority.get(a)??50)-(priority.get(b)??50));
  const valid = id => artistIds.includes(id);
  db.siteSettings.homeTimelineArtistIds = Array.isArray(db.siteSettings.homeTimelineArtistIds) ? [...new Set(db.siteSettings.homeTimelineArtistIds.map(canonicalArtistId))].filter(valid) : ['AT01'].filter(valid);
  if(!db.siteSettings.homeTimelineArtistIds.length && db.artists[0]) db.siteSettings.homeTimelineArtistIds = [db.artists[0].id];
  db.siteSettings.homePresenterArtistIds = Array.isArray(db.siteSettings.homePresenterArtistIds) ? [...new Set(db.siteSettings.homePresenterArtistIds.map(canonicalArtistId))].filter(valid) : [...artistIds];
  if(!db.siteSettings.homePresenterArtistIds.length) db.siteSettings.homePresenterArtistIds = [...artistIds];
}
function homepageScheduleArtists(){ensureHomepageFrontDisplaySettings();const map=new Map(sortedArtists().map(artist=>[artist.id,artist]));return db.siteSettings.homeScheduleOrder.map(id=>map.get(id)).filter(Boolean);}
const homeScheduleSectionBeforeFrontDisplaySettings=homeScheduleSection;
homeScheduleSection=function(){
  ensureHomepageFrontDisplaySettings();
  const now=new Date(),ym=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,monthLabel=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(now),monthly=db.events.filter(e=>e.date.startsWith(ym));
  const cards=homepageScheduleArtists().filter(artist=>db.siteSettings.homeScheduleCards[artist.id]?.visible!==false).map((artist,index)=>{const card=db.siteSettings.homeScheduleCards[artist.id]||{},color=artistDisplayColor(artist.id,index);return `<article class="schedule-card ${artistScheduleCardClass(artist.id,index)}"><div class="schedule-card-head" style="background:${color};color:#fff"><span>${escapePageText(card.eyebrow||'ARTIST PATH')}</span><h3>${escapePageText(card.title||artist.name)}</h3><p>${escapePageText(card.description||'')}</p></div>${compactSchedule(monthly.filter(e=>itemMatchesArtist(e,artist.id)))}</article>`;}).join('');
  return `<section class="section home-schedules"><div class="container"><div class="section-head"><div><span class="eyebrow">This month · ${monthLabel}</span><h2>This Month Schedule</h2></div><a class="btn outline" href="#schedule">View calendar ↗</a></div><div class="schedule-columns dynamic-schedule-columns">${cards||'<div class="empty">No schedule cards selected.</div>'}</div></div></section>`;
};
function homeScheduleDragStart(event,artistId){event.dataTransfer.setData('text/plain',artistId);event.dataTransfer.effectAllowed='move';}
function homeScheduleDrop(event,targetId){event.preventDefault();ensureHomepageFrontDisplaySettings();const sourceId=event.dataTransfer.getData('text/plain'),list=db.siteSettings.homeScheduleOrder,from=list.indexOf(sourceId),to=list.indexOf(targetId);if(from<0||to<0||from===to)return;const [item]=list.splice(from,1);list.splice(to,0,item);save();pageContentAdmin();toast('บันทึกลำดับการ์ดตารางงานแล้ว');}
function openHomeScheduleCardEditor(artistId){ensureHomepageFrontDisplaySettings();const artist=db.artists.find(item=>item.id===artistId),card=db.siteSettings.homeScheduleCards[artistId]||{};if(!artist)return;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>แก้ไขการ์ดตารางงาน ${escapePageText(artist.name)}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveHomeScheduleCard(event,'${artistId}')"><div class="form-grid"><div class="field"><label>หัวการ์ด</label><input name="eyebrow" value="${escapePageText(card.eyebrow||'')}" placeholder="COUPLE PATH / ARTIST PATH"></div><div class="field"><label>ชื่อบนการ์ด</label><input name="title" value="${escapePageText(card.title||artist.name)}" required></div><div class="field full"><label>คำอธิบาย</label><input name="description" value="${escapePageText(card.description||'')}"></div><div class="field full"><label class="hero-overlay-toggle"><input type="checkbox" name="visible" ${card.visible!==false?'checked':''}><span>แสดงการ์ดนี้บนหน้าบ้าน</span></label></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกการ์ด</button></div></form></div></div>`);}
function saveHomeScheduleCard(event,artistId){event.preventDefault();const form=new FormData(event.currentTarget);db.siteSettings.homeScheduleCards[artistId]={...(db.siteSettings.homeScheduleCards[artistId]||{}),eyebrow:(form.get('eyebrow')||'').trim(),title:(form.get('title')||'').trim(),description:(form.get('description')||'').trim(),visible:form.get('visible')==='on'};save();closeModal();pageContentAdmin();toast('บันทึกการ์ดตารางงานแล้ว');}
function renderHomepageScheduleOrderEditor(){ensureHomepageFrontDisplaySettings();return `<section class="panel homepage-schedule-order-editor"><div class="panel-head"><div><small>SCHEDULE CARD ORDER</small><h2>จัดวางการ์ดตารางงาน</h2><p class="master-note">ลากเพื่อเรียงลำดับ และเปิด/ปิดการ์ดตารางงานบนหน้าแรกได้ เหมือนการ์ดศิลปิน</p></div></div><div class="home-artist-sort-grid home-schedule-sort-grid">${homepageScheduleArtists().map((artist,index)=>{const card=db.siteSettings.homeScheduleCards[artist.id]||{},color=artistDisplayColor(artist.id,index);return `<article draggable="true" ondragstart="homeScheduleDragStart(event,'${artist.id}')" ondragover="event.preventDefault()" ondrop="homeScheduleDrop(event,'${artist.id}')" class="${card.visible===false?'is-hidden':''}"><div class="home-artist-sort-order">↕ ${String(index+1).padStart(2,'0')}</div><div class="home-schedule-sort-thumb ${artistScheduleCardClass(artist.id,index)}" style="background:${color};color:#fff"><span>${escapePageText(card.eyebrow||'')}</span><b>${escapePageText(card.title||artist.name)}</b></div><div><h3>${escapePageText(artist.name)}</h3><p>${card.visible===false?'Hidden':'Visible'}</p></div><button class="btn outline" onclick="openHomeScheduleCardEditor('${artist.id}')">แก้ไข</button></article>`;}).join('')}</div></section>`;}
function renderHomepageFrontScopeEditor(){ensureHomepageFrontDisplaySettings();const selectedIds=value=>(value||[]).map(canonicalArtistId);const checkbox=(name,selected)=>sortedArtists().map(artist=>`<label><input type="checkbox" name="${name}" value="${artist.id}" ${selectedIds(selected).includes(canonicalArtistId(artist.id))?'checked':''}><span>${escapePageText(sameArtistId(artist.id,'duo')?'#AUAUSAVE':artist.name)}</span></label>`).join('');return `<section class="panel homepage-front-scope-editor"><div class="panel-head"><div><small>FRONT PAGE DISPLAY</small><h2>เลือกศิลปินที่จะแสดงบนหน้าบ้าน</h2><p class="master-note">ใช้กำหนดเฉพาะส่วน Timeline และ Presenters บนหน้าแรก โดยไม่ลบข้อมูลจริงในระบบ</p></div></div><form onsubmit="saveHomepageFrontScope(event)"><div class="homepage-scope-grid"><div class="multi-artist-picker"><p>Timeline บนหน้าแรก</p>${checkbox('homeTimelineArtistIds',db.siteSettings.homeTimelineArtistIds)}</div><div class="multi-artist-picker"><p>Presenters บนหน้าแรก</p>${checkbox('homePresenterArtistIds',db.siteSettings.homePresenterArtistIds)}</div></div><div class="form-actions"><button class="btn" type="submit">บันทึกการแสดงผลหน้าบ้าน</button></div></form></section>`;}
function saveHomepageFrontScope(event){event.preventDefault();ensureHomepageFrontDisplaySettings();const form=new FormData(event.currentTarget),timeline=[...new Set(form.getAll('homeTimelineArtistIds').map(canonicalArtistId))],presenters=[...new Set(form.getAll('homePresenterArtistIds').map(canonicalArtistId))];if(!timeline.length||!presenters.length){toast('กรุณาเลือกอย่างน้อย 1 ศิลปินในแต่ละส่วน');return;}db.siteSettings.homeTimelineArtistIds=timeline;db.siteSettings.homePresenterArtistIds=presenters;save();pageContentAdmin();toast('บันทึกการแสดงผลหน้าบ้านแล้ว');}
function homeScopedArtistIds(item){return eventArtistIds(item).length?eventArtistIds(item):(Array.isArray(item.artistIds)?item.artistIds:[item.artistId].filter(Boolean)).map(canonicalArtistId);}
function homeTimelineItemMatchesScope(item){ensureHomepageFrontDisplaySettings();const ids=homeScopedArtistIds(item);return db.siteSettings.homeTimelineArtistIds.map(canonicalArtistId).some(id=>ids.includes(id));}
function homeTimelineSection(){ensureHomepageFrontDisplaySettings();const visible=db.siteSettings.timelineVisibility||{},content=db.siteSettings.timelineCategoryContent||{},items=(db.siteSettings.timeline||[]).filter(homeTimelineItemMatchesScope).sort((a,b)=>Number(Boolean(b.upcoming))-Number(Boolean(a.upcoming))||((Number(b.year)||0)-(Number(a.year)||0)));const card=item=>{const links=(item.links?.length?item.links:(item.url?[{label:'Open',url:item.url}]:[])).map(link=>typeof link==='string'?{label:'Open',url:link}:link).map(link=>{const text=link.label||link.title||'',url=link.url||link.href||(/^https?:\/\//i.test(text)?text:'');return{label:text&&text!==url?text:'Open',url};}).filter(link=>link.url);const imageOrientation=item.imageOrientation==='landscape'?'landscape':'portrait',posterUrl=versionedMediaUrl(item.poster,item.imageVersion||item.id);return `<article class="filmography-card timeline-image-${imageOrientation}">${item.poster?`<img src="${escapePageText(posterUrl)}" alt="${escapePageText(item.title)}">`:`<div class="filmography-placeholder"><span>${escapePageText(item.title.slice(0,2).toUpperCase())}</span></div>`}${item.upcoming?'<span class="timeline-upcoming-badge">UPCOMING</span>':''}<small>${escapePageText(timelineDateLabel(item))}</small><h3>${escapePageText(item.title)}</h3>${item.description?`<p>${escapePageText(item.description)}</p>`:''}${item.note?`<div class="timeline-note">${escapePageText(item.note)}</div>`:''}${links.length?`<div class="archive-card-links">${links.map(link=>`<a href="${escapePageText(link.url)}" target="_blank" rel="noopener noreferrer">${escapePageText(link.label)} ↗</a>`).join('')}</div>`:''}</article>`;};const lane=(category,label)=>{const groupItems=items.filter(item=>(item.category||'series')===category);return groupItems.length&&visible[category]!==false?`<div class="filmography-year-group timeline-subsection"><div class="filmography-year-label"><span></span><b>${escapePageText(content[category]?.title||label)}</b><span></span></div><div class="filmography-grid">${groupItems.map(card).join('')}</div></div>`:'';};return `<section class="section artist-filmography home-timeline"><div class="container"><div class="filmography-head"><small>AUAUSAVE HOUSE</small><h2>Timeline</h2><p>Selected series, variety shows and music videos.</p></div>${lane('series','Series')}${lane('variety','Variety Show')}${lane('music-video','Music Video')}</div></section>`;}
function homePresenterMatchesScope(item){ensureHomepageFrontDisplaySettings();const ids=homeScopedArtistIds(item);return db.siteSettings.homePresenterArtistIds.map(canonicalArtistId).some(id=>ids.includes(id));}
function homePresenterSection(){ensureHomepageFrontDisplaySettings();const items=db.presenters.filter(homePresenterMatchesScope).slice(0,6);return `<section class="section presenter-home"><div class="container"><div class="section-head"><div><span class="eyebrow">Brand & Partnership</span><h2>Our Presenters</h2></div><a class="btn outline" href="#presenters">View all ↗</a></div>${presenterCards(items)}</div></section>`;}
const pageContentAdminBeforeFrontDisplaySettings=pageContentAdmin;
pageContentAdmin=function(){pageContentAdminBeforeFrontDisplaySettings();if(!adminAuthenticated||adminTab!=='pagecontent')return;const main=document.querySelector('.admin-main');if(homeBuilderTab==='order')main?.insertAdjacentHTML('beforeend',renderHomepageScheduleOrderEditor());if(homeBuilderTab==='content')main?.insertAdjacentHTML('beforeend',renderHomepageFrontScopeEditor());};
const homeBeforeFrontDisplaySettings=home;
home=function(){homeBeforeFrontDisplaySettings();ensureHomepageFrontDisplaySettings();const main=document.querySelector('main'),footerEl=document.querySelector('footer');document.querySelector('.presenter-home')?.remove();document.querySelector('.home-timeline')?.remove();const timelineVisible=db.siteSettings.homeSections?.find(section=>section.id==='timeline')?.visible!==false,presenterVisible=db.siteSettings.homeSections?.find(section=>section.id==='presenters')?.visible!==false;if(timelineVisible)(footerEl||main)?.insertAdjacentHTML(footerEl?'beforebegin':'beforeend',homeTimelineSection());if(presenterVisible)(footerEl||main)?.insertAdjacentHTML(footerEl?'beforebegin':'beforeend',homePresenterSection());};
function normalizedArtistKey(idOrArtist){
  const artist=typeof idOrArtist==='string'?artistById(idOrArtist):idOrArtist;
  const source=[artist?.id,artist?.name,artist?.realName,artist?.initial].filter(Boolean).join(' ');
  return source.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
}
function artistSchedulePriority(artist){
  const key=normalizedArtistKey(artist);
  if(sameArtistId(artist?.id,'duo')||key.includes('auausave'))return 1;
  if(sameArtistId(artist?.id,'auau')||key.includes('auau'))return 2;
  if(sameArtistId(artist?.id,'save')||key.includes('save'))return 3;
  if(key.includes('mhiipraew')||key.includes('mhiipreaw')||key.includes('mhipraew')||key.includes('mhipreaw'))return 4;
  return 50;
}
function artistDisplayColor(id,index=0){
  const key=normalizedArtistKey(id);
  if(sameArtistId(id,'duo')||key.includes('auausave'))return '#4e8994';
  if(sameArtistId(id,'auau')||key.includes('auau'))return '#5f9272';
  if(sameArtistId(id,'save')||key.includes('save'))return '#d65e64';
  if(key.includes('mhiipraew')||key.includes('mhiipreaw')||key.includes('mhipraew')||key.includes('mhipreaw'))return '#d59058';
  const palette=['#8f79ab','#9a7350','#66799c','#b35f84','#3f7f7b','#9c6b66','#6f7597'];
  return palette[index%palette.length];
}
function calendarArtistColor(id,index=0){
  return artistDisplayColor(id,index);
}
function calendarArtistLabel(id){return sameArtistId(id,'duo')?'#AUAUSAVE':artistName(id);}
function calendarEventArtistIds(item){const ids=eventArtistIds(item);return ids.length?ids:[item.artistId].filter(Boolean);}
calendarPage=function(){
  const calendarArtists=[...db.artists].sort((a,b)=>artistSchedulePriority(a)-artistSchedulePriority(b));
  const year=calendarDate.getFullYear(),mon=calendarDate.getMonth(),first=new Date(year,mon,1),days=new Date(year,mon+1,0).getDate(),offset=(first.getDay()+6)%7,label=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(first),key=`${year}-${String(mon+1).padStart(2,'0')}`,cells=[],artistIndex=new Map(calendarArtists.map((artist,index)=>[artist.id,index]));
  for(let i=0;i<offset;i++)cells.push('<div class="calendar-day muted"></div>');
  for(let d=1;d<=days;d++){
    const date=`${key}-${String(d).padStart(2,'0')}`,items=db.events.filter(e=>e.date===date);
    cells.push(`<div class="calendar-day ${date===new Date().toISOString().slice(0,10)?'today':''}"><b>${d}</b><div class="day-events">${items.map(e=>{const ids=calendarEventArtistIds(e),primary=ids[0]||'',color=calendarArtistColor(primary,artistIndex.get(primary)||0),label=ids.map(calendarArtistLabel).join(' · ')||'Unknown';return `<button class="cal-event" style="border-left-color:${color}" onclick="showEvent('${e.id}')"><span>${escapePageText(label)}</span>${escapePageText(e.title)}</button>`;}).join('')}</div></div>`);
  }
  const total=offset+days;for(let i=total;i<Math.ceil(total/7)*7;i++)cells.push('<div class="calendar-day muted"></div>');
  const legend=calendarArtists.map((artist,index)=>`<span><i style="background:${calendarArtistColor(artist.id,index)}"></i>${escapePageText(calendarArtistLabel(artist.id))}</span>`).join('');
  app.innerHTML=nav('schedule')+`<main><section class="page-hero calendar-hero"><div class="container"><span class="eyebrow">Past · Present · Future</span><h1>Event Calendar</h1><p>Review past events and plan for every upcoming schedule.</p></div></section><section class="section calendar-section"><div class="container"><div class="calendar-toolbar"><button onclick="moveCalendar(-1)">←</button><h2>${label}</h2><button onclick="moveCalendar(1)">→</button></div><div class="calendar-legend dynamic-calendar-legend">${legend}<button onclick="calendarDate=new Date();calendarPage()">Current month</button><select class="public-type-filter" onchange="filterPublicCalendar(this.value)"><option value="all">All types</option>${db.masterData.types.map(t=>`<option value="${t.id}" ${publicTypeFilter===t.id?'selected':''}>${escapePageText(t.label)}</option>`).join('')}</select></div><div class="calendar"><div class="weekday">Monday</div><div class="weekday">Tuesday</div><div class="weekday">Wednesday</div><div class="weekday">Thursday</div><div class="weekday">Friday</div><div class="weekday">Saturday</div><div class="weekday">Sunday</div>${cells.join('')}</div></div></section></main>`+footer();
  filterPublicCalendar(publicTypeFilter);
};
showEvent=function(id){
  const e=db.events.find(x=>x.id===id);if(!e)return;
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal event-modal"><div class="modal-head"><span class="eyebrow">${escapePageText(eventBadge(e))} · ${escapePageText(e.type||'')}</span><button class="close" onclick="closeModal()">×</button></div>${e.poster?`<img class="event-poster" src="${escapePageText(e.poster)}" alt="${escapePageText(e.title)}">`:''}<h2>${escapePageText(e.title)}</h2><p class="event-date">${fmtDate(e.date)}</p><p>${escapePageText(e.place||'')}</p>${e.source?`<a class="btn" target="_blank" href="${escapePageText(e.source)}">View source ↗</a>`:''}</div></div>`);
};
function updateDashboardArtistSummary(items=db.events){
  const panel=document.querySelector('.path-panel');if(!panel)return;
  const total=Math.max(items.length,1);
  const summaryArtists=[...db.artists].sort((a,b)=>artistSchedulePriority(a)-artistSchedulePriority(b));
  panel.innerHTML=`<div class="panel-head"><div><small>ARTIST SUMMARY</small><h2>แยกตามศิลปิน</h2></div></div>${summaryArtists.map((artist,index)=>{const count=items.filter(event=>itemMatchesArtist(event,artist.id)).length,color=calendarArtistColor(artist.id,index);return `<div class="path-metric dynamic-path-metric"><div><b>${escapePageText(calendarArtistLabel(artist.id))}</b><span>${count} งาน</span></div><div class="metric-track"><i style="width:${(count/total)*100 || 0}%;background:${color}"></i></div></div>`;}).join('')}`;
  const artistStat=document.querySelector('.dashboard-stats article:nth-child(4) small');
  if(artistStat)artistStat.textContent=summaryArtists.map(artist=>calendarArtistLabel(artist.id)).join(' · ');
  document.querySelectorAll('.dash-upcoming small').forEach(small=>{const eventId=small.closest('.dash-upcoming')?.querySelector('button')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1],event=db.events.find(item=>item.id===eventId);if(event)small.textContent=`${eventBadge(event)} · ${event.place||''}`;});
}
function updateDashboardTypeSummary(items=db.events){
  const section=document.querySelector('.dash-type-summary');if(!section)return;
  const cards=section.querySelectorAll('.type-card');
  sortedEventTypesForSummary().forEach((type,index)=>{
    const card=cards[index];if(!card)return;
    const count=items.filter(event=>eventHasType(event,type.id)).length;
    const value=card.querySelector('b');if(value)value.textContent=count;
  });
}
const dashboardAdminBeforeDynamicArtistSummary=dashboardAdmin;
function dashboardCurrentRangeItems(){
  const start=`${dashYearFrom}-${String(dashMonthFrom).padStart(2,'0')}-01`,
    endDate=new Date(dashYearTo,dashMonthTo,0),
    end=`${dashYearTo}-${String(dashMonthTo).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`;
  return db.events.filter(e=>e.date>=start&&e.date<=end);
}
dashboardAdmin=function(){dashboardAdminBeforeDynamicArtistSummary();const items=dashboardCurrentRangeItems();updateDashboardArtistSummary(items);updateDashboardTypeSummary(items);};
const applyDashboardRangeBeforeDynamicArtistSummary=applyDashboardRange;
applyDashboardRange=function(){applyDashboardRangeBeforeDynamicArtistSummary();const items=dashboardCurrentRangeItems();updateDashboardArtistSummary(items);updateDashboardTypeSummary(items);};
router();
hydrateFromSupabase();
