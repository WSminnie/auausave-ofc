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
const ARTIST_PUBLIC_SLUGS = {
  AT01: 'AUAUSAVE',
  AT02: 'AUAU',
  AT03: 'SAVE',
  AT04: 'MhiiPraew',
};
function artistPublicSlug(id) {
  id = canonicalArtistId(id);
  return ARTIST_PUBLIC_SLUGS[id] || artistById(id)?.name?.replace(/[^a-z0-9_-]/gi, '') || id;
}
function artistIdFromPublicRoute(value) {
  const key = decodeURIComponent(String(value || '')).replace(/^\/+|\/+$/g, '').toLowerCase();
  const publicMatch = Object.entries(ARTIST_PUBLIC_SLUGS).find(([, slug]) => slug.toLowerCase() === key);
  if (publicMatch) return publicMatch[0];
  const directMatch = db.artists.find(artist =>
    [artist.id, artist.name, canonicalArtistId(artist.id)].some(candidate => String(candidate || '').toLowerCase() === key)
  );
  return directMatch ? canonicalArtistId(directMatch.id) : canonicalArtistId(key);
}
function sameArtistId(a, b) {
  return canonicalArtistId(a) === canonicalArtistId(b);
}
function awardMatchesArtist(award, artistId) {
  const targetId = canonicalArtistId(artistId);
  const awardArtistIds = [...new Set([
    ...(Array.isArray(award?.artistIds) ? award.artistIds : []),
    award?.artistId,
  ].filter(Boolean).map(canonicalArtistId))];
  if (awardArtistIds.includes(targetId)) return true;
  if (targetId === 'AT01' && ['AT02','AT03'].every(id => awardArtistIds.includes(id))) return true;
  return awardArtistIds.includes('AT01') && ['AT02', 'AT03'].includes(targetId);
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
  {id:'artists',label:'ศิลปิน',eyebrow:'AuauSave house',title:'EVERY CHAPTER, ALL IN ONE PLACE',description:'',visible:true},
  {id:'youtube',label:'YouTube',eyebrow:'Watch & remember',title:'AuauSave on YouTube',description:'',visible:true},
  {id:'presenters',label:'พรีเซนเตอร์',eyebrow:'Brand & Partnership',title:'Our Presenters',description:'',visible:true}
];
const DEFAULT_HOME_SECTIONS = db.siteSettings.homeSections.map(section => ({...section}));
function ensureHomePageSettings() {
  db.siteSettings ||= { heroImage: "", heroFit: "cover", heroPosition: "center" };
  db.siteSettings.personalProfiles ||= {};
  db.siteSettings.presenterDates ||= {};
  db.siteSettings.presenterOrderByYear ||= {};
  db.siteSettings.awardDates ||= {};
  db.siteSettings.awardImages ||= {};
  (db.awards||[]).forEach(item=>{ if (!item.image && db.siteSettings.awardImages[item.id]) item.image=db.siteSettings.awardImages[item.id]; });
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
const currentLanguage = 'th';
const UNIFIED_PAGE_CONTENT_DEFAULTS = {
  artists:{title:'THE AUAUSAVE UNIVERSE',description:'Explore AuauSave through their shared story, individual journeys, and everything in between.'},
  schedule:{title:'Event Calendar',description:'Review past events and plan for every upcoming schedule.'},
  presenters:{title:'BRAND AMBASSADORS',description:'A collection of brands that have partnered with Auau and Save, together and individually.'},
  awards:{title:'AWARDS',description:'Celebrating every milestone together.'}
};
const UNIFIED_PAGE_CONTENT_KEYS = new Set(Object.keys(UNIFIED_PAGE_CONTENT_DEFAULTS));
function ensureUnifiedPageContent(){
  db.siteSettings ||= {};
  db.siteSettings.pageCopy ||= {};
  Object.entries(UNIFIED_PAGE_CONTENT_DEFAULTS).forEach(([page,defaults])=>{
    const saved=db.siteSettings.pageCopy[page];
    db.siteSettings.pageCopy[page]={
      title:String(saved?.title||defaults.title).trim()||defaults.title,
      description:String(saved?.description??defaults.description).trim(),
      updatedAt:Number(saved?.updatedAt)||0
    };
  });
  db.siteSettings.pageContent ||= {};
  UNIFIED_PAGE_CONTENT_KEYS.forEach(page=>{db.siteSettings.pageContent[page]=null});
  if(db.siteSettings.pageTitles)UNIFIED_PAGE_CONTENT_KEYS.forEach(page=>{db.siteSettings.pageTitles[page]=null});
}
function restoreNewerLocalPageCopy(localPageCopy={}){
  ensureUnifiedPageContent();
  UNIFIED_PAGE_CONTENT_KEYS.forEach(page=>{
    const local=localPageCopy?.[page];
    const remote=db.siteSettings.pageCopy[page];
    if(Number(local?.updatedAt)>Number(remote?.updatedAt)){
      db.siteSettings.pageCopy[page]=structuredClone(local);
    }
  });
}
localStorage.removeItem('auausave-language');
function ensureLocalizationSettings() {
  db.siteSettings ||= {};
  db.siteSettings.pageContent ||= {};
  Object.entries(DEFAULT_PAGE_CONTENT).forEach(([page, languages]) => {
    if (UNIFIED_PAGE_CONTENT_KEYS.has(page)) return;
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
  ensureUnifiedPageContent();
}
ensureLocalizationSettings();
function pageText(page) {
  ensureLocalizationSettings();
  if (UNIFIED_PAGE_CONTENT_KEYS.has(page)) return db.siteSettings.pageCopy[page];
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
  const mediaFields = {artists:['image'],events:['poster'],awards:['image'],presenters:['logo','announcementImage'],videos:['thumbnail']};
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
  <a href="#home" class="brand"><i></i>AUAUSAVE THAILAND</a>
  <div class="links" id="public-navigation">
    <a onclick="closePublicMenu()" class="${active === "artists" ? "active" : ""}" href="#artists">AuauSave</a>
    <a onclick="closePublicMenu()" class="${active === "schedule" ? "active" : ""}" href="#schedule">Schedule</a>
    <a onclick="closePublicMenu()" class="${active === "presenters" ? "active" : ""}" href="#presenters">Presenters</a>
    <a onclick="closePublicMenu()" class="${active === "awards" ? "active" : ""}" href="#awards">Awards</a>
    <a onclick="closePublicMenu()" class="${active === "projects" ? "active" : ""}" href="#projects">Projects</a>
    <a onclick="closePublicMenu()" class="${active === "videos" ? "active" : ""}" href="#videos">YouTube</a>
  </div>
  <button class="menu-btn" type="button" aria-controls="public-navigation" aria-expanded="false" aria-label="เปิดเมนู" onclick="togglePublicMenu(this)">☰</button>
</div></nav>`;
}
function closePublicMenu(){
  const links=document.querySelector('.nav .links'),button=document.querySelector('.nav .menu-btn');
  if(links)links.style.display='';
  if(button)button.setAttribute('aria-expanded','false');
  document.body.classList.remove('public-menu-open');
}
function togglePublicMenu(button){
  const links=document.querySelector('.nav .links');
  if(!links)return;
  const opening=getComputedStyle(links).display==='none';
  links.style.display=opening?'flex':'none';
  button.setAttribute('aria-expanded',String(opening));
  document.body.classList.toggle('public-menu-open',opening);
}
const renderNavBeforeLanguages = nav;
nav = function (active = '') {
  return renderNavBeforeLanguages(active);
};
function footer() {
  return `<footer class="footer"><div class="container"><span class="eyebrow">The artist community</span><h2>KEEP THE<br>MEMORIES CLOSE.</h2><div class="creator-credit"><span>Website created by</span><div class="creator-links"><a class="creator-link creator-auausave" href="https://x.com/AuauSaveHouseTH" target="_blank" rel="noopener noreferrer">@AuauSaveHouseTH</a><a class="creator-link creator-auau" href="https://x.com/AUAUTNPOFC" target="_blank" rel="noopener noreferrer">@AUAUTNPOFC</a><a class="creator-link creator-save" href="https://x.com/SAVEWRG_OFC" target="_blank" rel="noopener noreferrer">@SAVEWRG_OFC</a></div></div><div class="footer-row"><span>© 2026 AUAUSAVE TH</span><span>MADE FOR EVERY FAN ♡</span></div></div></footer>`;
}
footer=function(){
  return `<footer class="footer footer-compact"><div class="container"><div class="creator-credit"><span>Website created by</span><div class="creator-links"><a class="creator-link creator-auausave" href="https://x.com/AuauSaveHouseTH" target="_blank" rel="noopener noreferrer">@AuauSaveHouseTH</a><a class="creator-link creator-auau" href="https://x.com/AUAUTNPOFC" target="_blank" rel="noopener noreferrer">@AUAUTNPOFC</a><a class="creator-link creator-save" href="https://x.com/SAVEWRG_OFC" target="_blank" rel="noopener noreferrer">@SAVEWRG_OFC</a></div></div><div class="footer-row"><span>© 2026 AUAUSAVE TH</span><span>MADE FOR EVERY FAN ♡</span></div></div></footer>`;
};
function artistCards() {
  return `<div class="artists">${sortedArtists().map((a) => `<article class="artist-card" onclick="location.hash='/${artistPublicSlug(a.id)}'"><div class="portrait" style="background:${a.color}">${a.image ? `<img src="${a.image}" alt="${a.name}">` : `<span>${a.initial}</span>`}<small class="tag">${sameArtistId(a.id,"duo") ? "COUPLE PATH" : "SOLO PATH"}</small></div><div class="artist-meta"><span class="arrow">➚</span><h3>${a.name}</h3><p>${a.role}</p></div></article>`).join("")}</div>`;
}
function scheduleRows(items = db.events) {
  return items.length
    ? items
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(
          (e) =>
            `<div class="schedule-row"><div class="date-box"><strong>${day(e.date)}</strong><span>${month(e.date)} ${new Date(e.date).getFullYear()}</span></div><div><h3>${e.title}</h3><p>${artistName(e.artistId)} · ${e.place}</p></div><span class="event-type">${e.type}</span>${e.source ? `<a class="round-arrow" href="${e.source}" target="_blank" title="ดูต้นทาง">➚</a>` : "<span></span>"}</div>`,
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
    `<main><section class="hero"><div class="container hero-grid"><div><span class="eyebrow">AuauSave fanbase · บ้านของอู่อู๋เซฟ</span><h1>OUR HOUSE.<br>OUR STORY.</h1><p>บ้านแฟนคลับของอู่อู๋เซฟ พื้นที่เก็บทุกโมเมนต์ของ <b>#AuauSave</b> พร้อมติดตามผลงานเดี่ยว ตารางงาน และความสำเร็จของอู่อู๋และเซฟ</p><a class="scroll" href="#artists"><span>↓</span> CHOOSE YOUR PATH</a></div><div class="hero-art"><div class="orbit"></div></div></div></section><section class="section path-section"><div class="container"><div class="section-head"><div><span class="eyebrow">Two paths · One house</span><h2>เลือกพาสที่อยากติดตาม</h2></div><p>ทุกเรื่องราวถูกจัดไว้อย่างชัดเจน ทั้งโมเมนต์คู่และเส้นทางเดี่ยวของทั้งสองคน</p></div><div class="path-grid"><a href="#/AUAUSAVE" class="path-card couple"><span>01 · COUPLE PATH</span><h3>อู่อู๋เซฟ</h3><p>#AuauSave · งานคู่ · รางวัลคู่ · โมเมนต์ของเรา</p><b>เข้าสู่พาสคู่ ➚</b></a><div class="path-card solo"><span>02 · SOLO PATH</span><h3>เส้นทางเดี่ยว</h3><p>แยกติดตามงานและรางวัลเดี่ยวของแต่ละคน</p><div class="solo-links"><a href="#/AUAU">AUAU ➚</a><a href="#/SAVE">SAVE ➚</a></div></div></div></div></section><section class="section" id="featured"><div class="container"><div class="section-head"><div><span class="eyebrow">AuauSave house</span><h2>คู่และเดี่ยวในบ้านเดียวกัน</h2></div><a class="btn outline" href="#artists">View all ➚</a></div>${artistCards()}</div></section><section class="section"><div class="container schedule-wrap"><div class="section-head"><div><span class="eyebrow" style="color:var(--yellow)">Upcoming</span><h2>ตารางงานเร็วๆ นี้</h2></div><a class="btn light" href="#schedule">ดูตารางทั้งหมด</a></div>${scheduleRows(db.events.slice(0, 3))}</div></section><section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Watch & remember</span><h2>AuauSave on YouTube</h2></div><a class="btn outline" href="#videos">ดูวิดีโอทั้งหมด ➚</a></div>${videos(db.videos.slice(0, 3))}</div></section></main>` +
    footer();
}
function listing(type) {
  let title, sub, body;
  const today = new Date().toISOString().slice(0, 10);
  if (type === "artists") {
    title = "THE AUAUSAVE UNIVERSE";
    sub = "Explore AuauSave through their shared story, individual journeys, and everything in between.";
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
    title = "AWARDS";
    sub = "CELEBRATING EVERY MILESTONE TOGETHER";
    body = `<div class="award-grid">${db.awards
      .sort((a, b) => b.year - a.year)
      .map(
        (r) =>
          `<article class="award">${awardImage(r)?`<img class="award-image" src="${awardImage(r)}" alt="${r.title}">`:''}<span class="eyebrow">${artistName(r.artistId)}</span><h3>${r.title}</h3><p>${r.org}</p><time class="award-date">${awardDisplayDate(r)}</time>${r.source ? `<a class="source-link" href="${r.source}" target="_blank">ดูข้อมูลต้นทาง ➚</a>` : ""}</article>`,
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
    aw = db.awards.filter((r) => awardMatchesArtist(r, id)),
    vid = db.videos.filter((v) => v.artistId === id);
  app.innerHTML =
    nav("artists") +
    `<main><section class="section"><div class="container profile-head"><div class="profile-portrait portrait" style="background:${a.color}"><span>${a.initial}</span></div><div><span class="eyebrow">Artist profile</span><h1 style="font-size:clamp(55px,8vw,100px);line-height:1;margin:10px 0">${a.name}</h1><p style="font-size:18px;line-height:1.8;color:var(--muted)">${a.bio}</p><div class="facts"><div class="fact"><small>ชื่อจริง</small><strong>${a.realName}</strong></div><div class="fact"><small>วันเกิด</small><strong>${a.birth}</strong></div><div class="fact"><small>บทบาท</small><strong>${a.role}</strong></div><div class="fact"><small>ผลงานล่าสุด</small><strong>${vid[0]?.title || "—"}</strong></div></div></div></div></section><section class="section"><div class="container schedule-wrap"><div class="section-head"><div><span class="eyebrow" style="color:var(--yellow)">Upcoming</span><h2>ตารางงานของ ${a.name}</h2></div></div>${scheduleRows(ev)}</div></section><section class="section"><div class="container"><div class="section-head"><h2>AWARDS</h2></div><div class="award-grid">${aw.map((r) => `<article class="award">${r.image?`<img class="award-image" src="${r.image}" alt="${r.title}">`:''}<div class="year">${awardDisplayDate(r)}</div><h3>${r.title}</h3><p>${r.org}</p></article>`).join("") || '<div class="empty">ยังไม่มีข้อมูลรางวัล</div>'}</div></div></section>${vid.length ? `<section class="section"><div class="container"><div class="section-head"><h2>วิดีโอ</h2></div>${videos(vid)}</div></section>` : ""}</main>` +
    footer();
}
const renderProfileWithAwardDetails = profile;
profile = function(id) {
  renderProfileWithAwardDetails(id);
  const awards=db.awards.filter(item=>awardMatchesArtist(item,id));
  document.querySelectorAll('.award-grid .award').forEach((card,index)=>{
    const item=awards[index], date=card.querySelector('.year');
    if (!item || !date) return;
    date.className='award-date';
    date.textContent=awardDisplayDate(item);
    card.querySelector('p')?.insertAdjacentElement('afterend',date);
  });
};
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
  const card = item => {const links=(item.links?.length?item.links:(item.url?[{label:'Open',url:item.url}]:[])).map(link=>typeof link==='string'?{label:'Open',url:link}:link).map(link=>{const text=link.label||link.title||'',url=link.url||link.href||(/^https?:\/\//i.test(text)?text:'');return{label:text&&text!==url?text:'Open',url};}).filter(link=>link.url);const imageOrientation=item.imageOrientation==='landscape'?'landscape':'portrait',posterUrl=versionedMediaUrl(item.poster,item.imageVersion||item.id);return `<article class="filmography-card timeline-image-${imageOrientation} ${item.upcoming?'is-upcoming-card':''}" data-timeline-artists="${escapePageText((item.artistIds||[]).join('|'))}">${item.poster?`<img src="${escapePageText(posterUrl)}" alt="${escapePageText(item.title)}">`:`<div class="filmography-placeholder"><span>${escapePageText(item.title.slice(0,2).toUpperCase())}</span></div>`}${item.upcoming?'<span class="timeline-upcoming-badge">UPCOMING</span>':''}<small>${escapePageText(timelineDateLabel(item))}</small><h3>${escapePageText(item.title)}</h3>${item.description?`<p>${escapePageText(item.description)}</p>`:''}${item.note?`<div class="timeline-note">${escapePageText(item.note)}</div>`:''}${links.length?`<div class="archive-card-links">${links.map(link=>`<a href="${escapePageText(link.url)}" target="_blank" rel="noopener noreferrer">${escapePageText(link.label)} ➚</a>`).join('')}</div>`:''}</article>`;};
  const lane = (title,items,className='',description='',category='series') => {const renderRows=list=>{const group=item=>item.upcoming?'UPCOMING':(item.year||'TBA'),years=[...new Set(list.map(group))];return `<div class="filmography-timeline"><div class="filmography-timeline-track">${years.map(year=>`<section class="filmography-year-group ${year==='UPCOMING'?'is-upcoming-group':''}"><header><i></i><b>${escapePageText(year)}</b></header><div class="filmography-year-cards">${list.filter(item=>group(item)===year).map(card).join('')}</div></section>`).join('')||'<div class="empty">No items yet.</div>'}</div></div>`;};const groups=db.siteSettings.timelineGroups?.[category]||[],visibleGroups=groups.filter(group=>!Array.isArray(group.visibleArtistIds)||!group.visibleArtistIds.length||group.visibleArtistIds.map(canonicalArtistId).includes(artistId)),grouped=visibleGroups.map(group=>({group,items:items.filter(item=>item.groupId===group.id)})).filter(entry=>entry.items.length),ungrouped=items.filter(item=>!visibleGroups.some(group=>group.id===item.groupId)),ungroupedContent=ungrouped.length?(category==='music-video'?renderRows(ungrouped):`<section class="timeline-content-group"><div class="timeline-content-group-head"><h4>Other</h4></div>${renderRows(ungrouped)}</section>`):'',body=visibleGroups.length?[...grouped.map(entry=>`<section class="timeline-content-group"><div class="timeline-content-group-head"><h4>${escapePageText(entry.group.title)}</h4>${entry.group.description?`<p>${escapePageText(entry.group.description)}</p>`:''}</div>${renderRows(entry.items)}</section>`),ungroupedContent].join(''):renderRows(items);return `<section class="timeline-subsection ${className}"><div class="timeline-subsection-head"><div><h3>${escapePageText(title)}</h3>${description?`<p>${escapePageText(description)}</p>`:''}</div><span>${items.length} items</span></div>${body}</section>`;};
  const visible=db.siteSettings.timelineVisibility, content=db.siteSettings.timelineCategoryContent||{},regular=[...series].sort((a,b)=>Number(Boolean(b.upcoming))-Number(Boolean(a.upcoming))||((Number(b.year)||0)-(Number(a.year)||0)));
  const filters=sameArtistId(artistId,'duo')?'':`<div class="timeline-artist-filters"><button class="active" onclick="filterArtistTimeline(this,'all')">All</button><button onclick="filterArtistTimeline(this,'AT01')">AUAUSAVE</button><button onclick="filterArtistTimeline(this,'${artistId}')">${escapePageText(artistName(artistId))}</button></div>`;
  return `<section class="section artist-filmography" data-artist-timeline="${artistId}"><div class="container"><div class="filmography-head"><small>OUR TIMELINE</small><h2>Timeline</h2><p>Series, variety shows and music videos of ${escapePageText(artistName(artistId))}</p>${filters}</div>${visible.series!==false?lane(content.series?.title||'Series',regular.filter(item=>(item.category||'series')==='series'),' ',content.series?.description||'','series'):''}${visible.variety!==false?lane(content.variety?.title||'Variety Show',regular.filter(item=>item.category==='variety'),' ',content.variety?.description||'','variety'):''}${visible['music-video']!==false?lane(content['music-video']?.title||'Music Video',regular.filter(item=>item.category==='music-video'),' ',content['music-video']?.description||'','music-video'):''}</div></section>`;
}
function filterArtistTimeline(button,artist){artist=canonicalArtistId(artist);const section=button.closest('.artist-filmography');section.querySelectorAll('.timeline-artist-filters button').forEach(item=>item.classList.toggle('active',item===button));section.querySelectorAll('.filmography-card').forEach(card=>{const ids=(card.dataset.timelineArtists||'').split('|').map(canonicalArtistId);card.style.display=artist==='all'||ids.includes(artist)?'':'none';});section.querySelectorAll('.filmography-year-group,.timeline-content-group,.timeline-subsection').forEach(group=>{group.style.display=[...group.querySelectorAll('.filmography-card')].some(card=>card.style.display!=='none')?'':'none';});}

function coupleArchivePage() {
  const artist = artistById('duo') || {};
  const events = [...db.events].sort((a,b) => a.date.localeCompare(b.date));
  const awards = db.awards.filter(item => {
    const label=String(artistName(item?.artistId)||'').trim().toUpperCase();
    return awardMatchesArtist(item,'AT01')||sameArtistId(item?.artistId,'AT01')||label==='AUAUSAVE';
  }).sort((a,b) => Number(b.year)-Number(a.year));
  const now = new Date(), monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, monthEnd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(new Date(now.getFullYear(),now.getMonth()+1,0).getDate()).padStart(2,'0')}`;
  const projects = [];
  const filterTypes = db.masterData.types.filter(type => events.some(event => eventHasType(event,type.id)));
  const media = [
    ...events.filter(item => item.poster || item.source).map(item => ({kind:item.poster?'image':'link',src:item.poster||'',url:item.source||'',title:item.title})),
    ...db.presenters.filter(item => itemMatchesArtist(item, 'AT01') && item.announcementImage).map(item => ({kind:'image',src:item.announcementImage,url:item.url||'',title:item.brand})),
  ];
  app.innerHTML = nav('artists') + `<main class="couple-archive"><section class="couple-profile"><div class="container couple-profile-grid"><div class="couple-profile-image" style="background:${artist.color}">${artist.image?`<img src="${artist.image}" alt="AUAUSAVE">`:`<span>AS</span>`}</div><div><span class="eyebrow">COUPLE ARCHIVE</span><h1>AUAUSAVE</h1><p>${artist.bio || 'The shared journey of Auau and Save, collected in one place.'}</p><a class="couple-hashtag" href="https://x.com/hashtag/AuauSave" target="_blank">#AuauSave ➚</a></div></div></section>
  <section class="section archive-projects"><div class="container"><div class="archive-section-head"><span>02</span><div><small>TOGETHER ON SCREEN</small><h2>Series & Projects</h2></div><p>Series, shared projects, promotions and fan projects.</p></div><div class="archive-project-grid">${projects.map(item=>`<article><small>${item.seriesId ? (db.masterData.series.find(series=>series.id===item.seriesId)?.label || 'SERIES') : 'SERIES'}</small><h3>${item.title}</h3><p>${item.place||'AUAUSAVE project'}</p>${item.source?`<a href="${item.source}" target="_blank">View source ➚</a>`:''}</article>`).join('') || '<div class="empty">No series or project information yet.</div>'}</div></div></section>
  <section class="section"><div class="container"><div class="archive-section-head"><span>02</span><div><small>MEET AUAUSAVE</small><h2>Events</h2></div><p>Search couple schedules by date range and event type.</p></div><div class="couple-event-search"><label>From<input id="coupleEventFrom" type="date" value="${monthStart}" onchange="filterCoupleArchiveEvents()"></label><label>To<input id="coupleEventTo" type="date" value="${monthEnd}" onchange="filterCoupleArchiveEvents()"></label><span class="couple-event-result"></span></div><div class="couple-event-filters"><button class="active" data-type="all" onclick="filterCoupleArchiveEvents('all')">All</button>${filterTypes.map(type=>`<button data-type="${type.id}" onclick="filterCoupleArchiveEvents('${type.id}')">${type.label}</button>`).join('')}</div><div class="couple-event-list">${events.map(item=>`<article class="couple-event-card" data-date="${item.date}" data-types="${eventTypeValues(item.type).map(type=>type.toLowerCase()).join('|')}"><time><b>${day(item.date)}</b><span>${month(item.date)} ${item.date.slice(0,4)}</span></time><div><small>${eventTypeValues(item.type).join(' · ')}</small><h3>${item.title}</h3><p>${item.place||'TBA'}</p></div>${item.source?`<a href="${item.source}" target="_blank">➚</a>`:''}</article>`).join('') || '<div class="empty">No couple events yet.</div>'}</div></div></section>
  <section class="section archive-awards"><div class="container"><div class="archive-section-head"><span>04</span><div><small>SHARED ACHIEVEMENTS</small><h2>Awards</h2></div><div class="archive-award-table"><div class="archive-award-row head"><span>Year</span><span>Award</span><span>Organization / Category</span><span>Result</span></div>${awards.map(item=>`<div class="archive-award-row"><strong>${item.year}</strong><span>${awardImage(item)?`<img class="award-image" src="${awardImage(item)}" alt="${item.title}">`:''}${item.title}</span><span>${item.org}<time class="award-date">${awardDisplayDate(item)}</time></span><span>Recipient</span></div>`).join('') || '<div class="empty">No couple awards yet.</div>'}</div></div></section>
  <section class="section"><div class="container"><div class="archive-section-head"><span>04</span><div><small>PHOTO · VIDEO · SOURCE</small><h2>Media Gallery</h2></div><p>Event photos, short clips and original post links.</p></div><div class="couple-media-grid">${media.map(item=>`<article>${item.kind==='video'?`<video src="${item.src}" controls playsinline></video>`:item.kind==='image'?`<img src="${item.src}" alt="${item.title}">`:'<div class="media-link-art">➚</div>'}<div><h3>${item.title}</h3>${item.url?`<a href="${item.url}" target="_blank">View original post ➚</a>`:''}</div></article>`).join('') || '<div class="empty">No media has been added yet.</div>'}</div></div></section></main>` + footer();
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
      grid.insertAdjacentHTML('beforeend', archiveData.gallery.map(item=>`<article>${item.type==='video'?`<video src="${item.mediaUrl}" controls playsinline></video>`:item.mediaUrl?`<img src="${item.mediaUrl}" alt="${item.title}">`:'<div class="media-link-art">X</div>'}<div><h3>${item.title}</h3>${item.xUrl?`<a href="${item.xUrl}" target="_blank">View X post ➚</a>`:''}</div></article>`).join(''));
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
  const coupleAwardsSection=[...document.querySelectorAll('.archive-section-head h2')].find(item=>item.textContent==='Awards')?.closest('.section');
  const coupleAwardsTable=coupleAwardsSection?.querySelector('.archive-award-table');
  const coupleAwardsHeading=coupleAwardsSection?.querySelector('.archive-section-head');
  if(coupleAwardsHeading){
    coupleAwardsHeading.className='section-head';
    coupleAwardsHeading.innerHTML='<h2>AWARDS</h2>';
  }
  if(coupleAwardsTable){
    coupleAwardsTable.outerHTML=`<div class="award-grid">${awards.map(item=>`<article class="award">${awardImage(item)?`<img class="award-image" src="${escapePageText(awardImage(item))}" alt="${escapePageText(item.title)}">`:''}<h3>${escapePageText(item.title)}</h3><p>${escapePageText(item.org||'')}</p><time class="award-date">${escapePageText(awardDisplayDate(item))}</time></article>`).join('')||'<div class="empty">ยังไม่มีข้อมูลรางวัล</div>'}</div>`;
  }
  document.querySelectorAll('.couple-archive .archive-section-head').forEach(head=>{
    head.querySelector(':scope > span')?.remove();
    head.classList.add('no-index');
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
  return `<section class="section home-schedules"><div class="container"><div class="section-head"><div><span class="eyebrow">This month · ${monthLabel}</span><h2>ตารางงานเดือนนี้</h2></div><a class="btn outline" href="#schedule">เปิดปฏิทินทั้งหมด ➚</a></div><div class="schedule-columns"><article class="schedule-card duo-card"><div class="schedule-card-head"><span>COUPLE PATH</span><h3>ตารางงานคู่</h3><p>#AuauSave</p></div>${compactSchedule(monthly.filter((e) => e.artistId === "duo"))}</article><article class="schedule-card auau-card"><div class="schedule-card-head"><span>SOLO PATH</span><h3>ตารางงาน AUAU</h3><p>Auau · DEXX</p></div>${compactSchedule(monthly.filter((e) => e.artistId === "auau"))}</article><article class="schedule-card save-card"><div class="schedule-card-head"><span>SOLO PATH</span><h3>ตารางงาน SAVE</h3><p>Save</p></div>${compactSchedule(monthly.filter((e) => e.artistId === "save"))}</article></div></div></section>`;
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
    `<div class="modal-backdrop" id="modal"><div class="modal event-modal"><div class="modal-head"><span class="eyebrow">${artistName(e.artistId)} · ${e.type}</span><button class="close" onclick="closeModal()">×</button></div><h2>${e.title}</h2><p class="event-date">${fmtDate(e.date)}</p><p>${e.place}</p>${e.source ? `<a class="btn" target="_blank" href="${e.source}">View Source ➚</a>` : ""}</div></div>`,
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

function presenterYear(item) {
  return String(item?.year || 'ไม่ระบุปี');
}
function presenterDateValue(item) {
  const saved=db.siteSettings?.presenterDates?.[item.id]||{};
  const year=Number(item.year)||0, month=Number(item.month||saved.month)||0, day=Number(item.day||saved.day)||0;
  return year*10000+month*100+day;
}
function presenterYears(items=db.presenters) {
  return [...new Set(items.map(presenterYear))].sort((a,b)=>(Number(b)||-1)-(Number(a)||-1));
}
function orderedPresentersForYear(items,year) {
  ensureHomePageSettings();
  const yearItems=items.filter(item=>presenterYear(item)===String(year));
  const savedOrder=db.siteSettings.presenterOrderByYear[String(year)];
  if (!Array.isArray(savedOrder)) {
    return [...yearItems].sort((a,b)=>presenterDateValue(b)-presenterDateValue(a)||String(a.brand||'').localeCompare(String(b.brand||'')));
  }
  const position=new Map(savedOrder.map((id,index)=>[id,index]));
  return [...yearItems].sort((a,b)=>{
    const ai=position.has(a.id)?position.get(a.id):Number.MAX_SAFE_INTEGER;
    const bi=position.has(b.id)?position.get(b.id):Number.MAX_SAFE_INTEGER;
    return ai-bi || presenterDateValue(b)-presenterDateValue(a) || String(a.brand||'').localeCompare(String(b.brand||''));
  });
}
function orderedPresenters(items=db.presenters) {
  return presenterYears(items).flatMap(year=>orderedPresentersForYear(items,year));
}
function presenterCards(items = db.presenters) {
  const years=presenterYears(items);
  return years.map(year=>`<section class="presenter-year-group"><h3 class="presenter-year-heading">${year}</h3><div class="presenter-grid">${
    orderedPresentersForYear(items,year)
      .map((p) => {
        return `<article class="presenter-card ${p.announcementImage ? "has-poster" : ""}" style="--brand:${p.color || "#777"}">${p.announcementImage ? `<div class="presenter-poster presenter-card-media"><img src="${p.announcementImage}" alt="โปสเตอร์ ${p.brand}"></div>` : ""}<div class="presenter-detail"><div class="brand-mark">${p.logo ? `<img src="${p.logo}" alt="${p.brand}">` : p.brand.slice(0, 2).toUpperCase()}</div><span>${sameArtistId(p.artistId,"duo") ? "#AUAUSAVE" : artistName(p.artistId)}</span><h3>${p.brand}</h3><p>${p.role} · ${p.year}</p>${p.url ? `<a href="${p.url}" target="_blank">View Details ➚</a>` : ""}</div></article>`;
      })
      .join("") || '<div class="empty">ยังไม่มีข้อมูลพรีเซนเตอร์</div>'
  }</div></section>`).join('');
}
function presenterPage() {
  const content=pageText('presenters');
  app.innerHTML =
    nav("presenters") +
    `<main><section class="page-hero"><div class="container"><h1>${escapePageText(content.title)}</h1><p>${escapePageText(content.description)}</p></div></section><section class="section" style="padding-top:25px"><div class="container"><div class="presenter-group"><h2>#AUAUSAVE</h2>${presenterCards(db.presenters.filter((p) => itemMatchesArtist(p, "AT01")))}</div><div class="presenter-solo"><div><h2>AUAU</h2>${presenterCards(db.presenters.filter((p) => itemMatchesArtist(p, "AT02") && !itemMatchesArtist(p, "AT01")))}</div><div><h2>SAVE</h2>${presenterCards(db.presenters.filter((p) => itemMatchesArtist(p, "AT03") && !itemMatchesArtist(p, "AT01")))}</div></div></div></section></main>` +
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
      `<section class="section presenter-home"><div class="container"><div class="section-head"><div><span class="eyebrow">Brand & Partnership</span><h2>Our Presenters</h2></div><a class="btn outline" href="#presenters">View all ➚</a></div>${presenterCards(db.presenters.slice(0, 3))}</div></section>`,
    );
};
function videoTile(v) {
  return `<article class="hub-video"><a href="${v.url}" target="_blank"><div class="hub-thumb" style="background:${v.color}">${v.thumbnail ? `<img src="${v.thumbnail}" alt="${v.title}">` : ""}<span>▶</span></div></a><small>${artistName(v.artistId)}</small><h3>${v.title}</h3><p>${v.views}</p></article>`;
}
function youtubeHub(compact = false) {
  const featured = db.videos.find((v) => v.featured === "yes") || db.videos[0],
    groups = db.siteSettings.youtubeCategories;
  if (!featured) return '<div class="empty">ยังไม่มีวิดีโอ</div>';
  return `<div class="featured-watch ${compact?'home-featured-watch':''}"><div class="featured-player">${featured.embedUrl ? `<iframe src="${featured.embedUrl}" title="${featured.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : `<a href="${featured.url}" target="_blank" style="background:${featured.color}">${featured.thumbnail ? `<img src="${featured.thumbnail}" alt="${featured.title}">` : ""}<span class="big-play">▶</span><small>เปิดดูบน YouTube</small></a>`}</div><div class="featured-copy"><span class="eyebrow">Featured video</span><h2>${featured.title}</h2><p>${artistName(featured.artistId)} · ${featured.views}</p><a class="btn" href="${featured.url}" target="_blank">เปิดบน YouTube ➚</a></div></div>${groups
    .map((group, index) => {
      const {id: key, title, description: desc, linkLabel, linkUrl} = group;
      const items = db.videos.filter(
        (v) => v.category === key && v.id !== featured.id,
      );
      if (compact && !items.length) return "";
      return `<section class="video-category ${compact?'home-video-category':''}"><div class="category-title"><div><span>${String(index + 1).padStart(2, '0')}</span><h2>${title}</h2></div><p>${desc || ''}</p>${linkUrl ? `<a class="channel-link" href="${linkUrl}" target="_blank" rel="noopener">${linkLabel || 'Open link ➚'}</a>` : ''}</div>${compact?'<div class="home-video-carousel"><button class="carousel-arrow prev" type="button" aria-label="Previous videos" onclick="scrollHomeVideos(this,-1)">←</button>':''}<div class="hub-grid">${
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
    target.innerHTML = `<div class="container"><div class="section-head"><div><span class="eyebrow">Watch & remember</span><h2>AuauSave on YouTube</h2></div><a class="btn outline" href="#videos">View all ➚</a></div>${youtubeHub(true)}</div>`;
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
      `<a class="channel-link" href="https://www.youtube.com/@DEXXOfficialTH" target="_blank" rel="noopener">เปิดช่อง DEXX Official TH ➚</a>`,
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
    )}</div><a class="back" href="#home">← กลับหน้าเว็บไซต์</a></aside><main class="admin-main dashboard-main"><div class="admin-top"><div><small style="color:var(--muted)">AUAUSAVE HOUSE · ${year}</small><h1>ภาพรวมหลังบ้าน</h1></div><button class="btn" onclick="adminTab='events';admin()">จัดการปฏิทิน ➚</button></div><div class="dashboard-stats"><article><span>ตารางงานปีนี้</span><b>${yearEvents.length}</b><small>รายการทั้งหมดใน ${year}</small></article><article><span>งานเดือนนี้</span><b>${monthEvents.length}</b><small>${new Intl.DateTimeFormat("th-TH", { month: "long" }).format(now)}</small></article><article><span>งานที่กำลังจะมาถึง</span><b>${upcoming.length}</b><small>ตั้งแต่วันนี้เป็นต้นไป</small></article><article><span>ศิลปิน/พาส</span><b>${db.artists.length}</b><small>#AUAUSAVE · AUAU · SAVE</small></article></div><div class="dashboard-grid"><section class="dash-panel chart-panel"><div class="panel-head"><div><small>EVENT ACTIVITY</small><h2>ตารางงานรายเดือน</h2></div><b>${yearEvents.length} งาน</b></div><div class="bar-chart">${months.map((n, i) => `<div class="bar-col"><span>${n || ""}</span><div class="bar" style="height:${Math.max((n / max) * 180, n ? 8 : 2)}px"></div><small>${["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][i]}</small></div>`).join("")}</div></section><section class="dash-panel path-panel"><div class="panel-head"><div><small>PATH SUMMARY</small><h2>แยกตามพาส</h2></div></div><div class="path-metric duo"><div><b>#AUAUSAVE</b><span>${paths.duo} งาน</span></div><div class="metric-track"><i style="width:${(paths.duo / yearEvents.length) * 100 || 0}%"></i></div></div><div class="path-metric auau"><div><b>AUAU</b><span>${paths.auau} งาน</span></div><div class="metric-track"><i style="width:${(paths.auau / yearEvents.length) * 100 || 0}%"></i></div></div><div class="path-metric save"><div><b>SAVE</b><span>${paths.save} งาน</span></div><div class="metric-track"><i style="width:${(paths.save / yearEvents.length) * 100 || 0}%"></i></div></div></section><section class="dash-panel upcoming-panel"><div class="panel-head"><div><small>NEXT SCHEDULE</small><h2>งานที่กำลังจะมาถึง</h2></div><button onclick="adminTab='events';admin()">ดูทั้งหมด</button></div>${
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
    panel.innerHTML = `<div class="panel-head"><div><small>NEXT SCHEDULE</small><h2>งานถัดไปในช่วงที่เลือก</h2></div><button onclick="adminTab='events';admin()">View all</button></div>${
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
  if (day && month && year) return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(Number(year),Number(month)-1,Number(day)));
  const monthName=month ? new Intl.DateTimeFormat('en-US',{month:'long'}).format(new Date(2000,Number(month)-1,1)) : '';
  return [day,monthName,year].filter(Boolean).join(' ');
}
function awardImage(item) { return item.image || db.siteSettings?.awardImages?.[item.id] || ''; }
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
};
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
  app.innerHTML = `<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav"><button data-icon="⌂" onclick="adminTab='dashboard';admin()">⌂ &nbsp; Dashboard</button><button data-icon="▤" class="active">▤ &nbsp; จัดหน้าแรก</button>${Object.entries(configs).map(([k,v])=>`<button data-icon="${v.icon}" onclick="adminTab='${k}';admin()">${v.icon} &nbsp; ${v.label}</button>`).join('')}<button data-icon="⚙" onclick="adminTab='master';admin()">⚙ &nbsp; Master Data</button></div><a class="back" href="#home">← ดูหน้าบ้าน</a></aside><main class="admin-main"><div class="admin-top"><div><small style="color:var(--muted)">HOME PAGE BUILDER</small><h1>จัดการข้อความและลำดับหน้าแรก</h1></div><a class="btn" href="#home">ดูตัวอย่างหน้าบ้าน ➚</a></div><section class="panel home-setting-panel"><div class="panel-head"><div><small>HOMEPAGE PREVIEW & CONTENT</small><h2>ตัวอย่าง หัวข้อ และคำอธิบายหน้าหลัก</h2></div><div class="home-preview-actions"><button class="btn outline" data-home-action="home-copy">แก้ไขหัวข้อและคำอธิบาย</button><button class="btn" data-home-action="hero-settings">เปลี่ยนรูปหน้าหลัก</button></div></div><div class="homepage-preview"><div class="homepage-preview-copy"><small>${heroSection?.eyebrow || 'AUAUSAVE FANBASE'}</small><h3>${(heroSection?.title || 'OUR HOUSE.\nOUR STORY.').replace(/\n/g,'<br>')}</h3><p>${heroSection?.description || 'บ้านแฟนคลับของอู่อู๋เซฟ'}</p></div><div class="hero-setting-preview">${hero.heroImage?`<img src="${hero.heroImage}" style="object-fit:${hero.heroFit};object-position:${hero.heroPosition}">`:'<span>ยังไม่ได้อัปโหลดรูป Hero</span>'}</div></div></section><div class="builder-note">ใช้ปุ่มขึ้นลงเพื่อจัดลำดับ ส่วนที่ซ่อนไว้จะไม่ปรากฏบนหน้าบ้าน</div><section class="section-builder-list">${sections.map((s,i)=>`<article class="builder-item ${s.visible===false?'is-hidden':''}"><div class="builder-order"><button data-home-action="move" data-index="${i}" data-direction="-1" ${i===0?'disabled':''}>↑</button><span>${String(i+1).padStart(2,'0')}</span><button data-home-action="move" data-index="${i}" data-direction="1" ${i===sections.length-1?'disabled':''}>↓</button></div><div class="builder-content"><small>${s.id.toUpperCase()}</small><h3>${s.title.replace(/\n/g,' / ')}</h3><p>${s.description||'ไม่มีคำอธิบาย'}</p></div><div class="builder-actions"><button class="visibility-btn" data-home-action="toggle" data-section-id="${s.id}">${s.visible===false?'○ ซ่อนอยู่':'● แสดงอยู่'}</button><button class="btn outline" data-home-action="edit" data-section-id="${s.id}">แก้ไขข้อความ</button></div></article>`).join('')}</section></main></div></div>`;
  app.querySelector('[data-home-action="edit"][data-section-id="hero"]')?.remove();
  app.querySelectorAll('[data-home-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.homeAction;
    if (action === 'move') moveHomeSection(Number(button.dataset.index), Number(button.dataset.direction));
    if (action === 'toggle') toggleHomeSection(button.dataset.sectionId);
    if (action === 'edit') editHomeSection(button.dataset.sectionId);
    if (action === 'home-copy') openPageTextEditor('home','th');
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
  return `<section class="panel bilingual-settings" data-page-content-settings="${onlyPage || 'all'}"><div class="panel-head"><div><small>PAGE CONTENT SETTINGS</small><h2>${heading}</h2><p class="master-note">ข้อความที่บันทึกจะแสดงบนหน้าบ้าน</p></div>${onlyPage ? `<button class="btn outline" onclick="openPageTextEditor('${onlyPage}','th')">แก้ไขข้อความ</button>` : ''}</div><div class="bilingual-page-grid ${onlyPage ? 'single-page' : ''}">${pages.map(([page,label])=>`<article><div><small>${page.toUpperCase()}</small><h3>${label}</h3><p>${db.siteSettings.pageContent[page].th.title.replace(/\n/g,' / ')}</p></div>${onlyPage ? '' : `<div class="page-language-actions"><button onclick="openPageTextEditor('${page}','th')">แก้ไขข้อความ</button></div>`}</article>`).join('')}</div></section>`;
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
async function saveHomeSection(event,id) {
  event.preventDefault();
  const formElement=event.currentTarget,button=formElement.querySelector('[type="submit"]'),section=db.siteSettings.homeSections.find(s=>s.id===id),previous=structuredClone(section),data=Object.fromEntries(new FormData(formElement));
  Object.assign(section,data,{updatedAt:Date.now()});
  if (id === 'hero') db.siteSettings.pageContent.home.en = {...db.siteSettings.pageContent.home.en, ...data};
  button.disabled=true;
  button.textContent='กำลังบันทึก...';
  save(false);
  const synced=await syncDatabaseInBackground();
  if(!synced){
    Object.assign(section,previous);
    save(false);
    button.disabled=false;
    button.textContent='บันทึกข้อความ';
    toast('บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง');
    return;
  }
  closeModal(); pageContentAdmin(); toast('บันทึกข้อความแล้ว');
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
  if (main && !main.querySelector('.admin-global-header')) main.insertAdjacentHTML('afterbegin', `<header class="admin-global-header"><div class="admin-global-title"><span>ADMIN</span><strong>AUAUSAVE HOUSE</strong></div><div class="admin-global-actions"><span class="admin-db-status ${adminDatabaseLoaded ? 'is-connected' : 'has-error'}"><i></i>${adminDatabaseStatus}</span>${currentAdminEmail?`<span class="admin-user-email" title="${escapePageText(currentAdminEmail)}"><b>●</b>${escapePageText(currentAdminEmail)}</span>`:''}<a href="#home">ดูหน้าบ้าน ➚</a><button class="btn outline admin-logout-btn" onclick="adminSignOut()">ออกจากระบบ</button></div></header>`);
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
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>${id?'แก้ไข':'สร้าง'}หัวข้อ YouTube</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveYoutubeCategory(event,'${id}')"><div class="form-grid"><div class="field full"><label>ชื่อหัวข้อ</label><input name="title" value="${escapePageText(category.title || '')}" required></div><div class="field full"><label>คำอธิบาย</label><textarea name="description">${escapePageText(category.description || '')}</textarea></div><div class="field"><label>ข้อความปุ่มลิงก์ (ถ้ามี)</label><input name="linkLabel" value="${escapePageText(category.linkLabel || '')}" placeholder="Open channel ➚"></div><div class="field"><label>ลิงก์ประจำหัวข้อ (ถ้ามี)</label><input name="linkUrl" type="url" value="${escapePageText(category.linkUrl || '')}" placeholder="https://..."></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกหัวข้อ</button></div></form></div></div>`);
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

let presenterOrderSaving=false;
function yearlyOrderPanel(type) {
  const items = db[type], years = type === 'presenters' ? presenterYears(items) : [...new Set(items.map(item => String(item.year || 'ไม่ระบุปี'))) ].sort((a,b) => Number(b) - Number(a));
  const label = type === 'presenters' ? 'พรีเซนเตอร์' : 'รางวัล';
  return `<section class="panel yearly-order-admin"><div class="panel-head"><div><small>YEAR & DISPLAY ORDER</small><h2>จัด${label}ตามปีและลำดับ</h2><p class="master-note">รายการจะแยกตามปี และเลื่อนขึ้น–ลงได้ภายในปีเดียวกัน</p></div><button class="btn" onclick="openForm('${type}')">+ เพิ่ม${label}</button></div><div class="youtube-admin-sections">${years.map(year => {
    const yearItems = type === 'presenters' ? orderedPresentersForYear(items,year) : items.filter(item => String(item.year || 'ไม่ระบุปี') === year);
    const saving=type==='presenters'&&presenterOrderSaving;
    return `<article class="youtube-admin-section"><div class="yearly-admin-year"><div><small>YEAR</small><h3>${year}</h3></div><span>${yearItems.length} รายการ</span></div><div class="youtube-admin-video-list">${yearItems.map((item,index)=>`<div><div><strong>${type==='presenters' ? item.brand : item.title}</strong><small>${type==='presenters'?`${presenterAdminDate(item)} · `:''}${artistName(item.artistId)}${type==='awards' && item.org ? ` · ${item.org}` : ''}</small></div><div class="actions"><button class="icon-btn" onclick="moveYearlyItem('${type}','${item.id}',-1)" ${saving||index===0?'disabled':''}>↑</button><button class="icon-btn" onclick="moveYearlyItem('${type}','${item.id}',1)" ${saving||index===yearItems.length-1?'disabled':''}>↓</button><button class="icon-btn" onclick="openForm('${type}','${item.id}')" ${saving?'disabled':''}>✎</button></div></div>`).join('')}</div></article>`;
  }).join('') || '<div class="empty">ยังไม่มีข้อมูล</div>'}</div></section>`;
}

async function moveYearlyItem(type, id, direction) {
  if (type==='presenters'&&presenterOrderSaving) return;
  const item = db[type].find(entry => entry.id === id);
  if (!item) return;
  const sameYear = type==='presenters' ? orderedPresentersForYear(db.presenters,presenterYear(item)) : db[type].filter(entry => String(entry.year) === String(item.year));
  const index = sameYear.findIndex(entry => entry.id === id), target = index + direction;
  if (target < 0 || target >= sameYear.length) return;
  if (type==='presenters') {
    presenterOrderSaving=true;
    [sameYear[index],sameYear[target]]=[sameYear[target],sameYear[index]];
    db.siteSettings.presenterOrderByYear[presenterYear(item)]=sameYear.map(entry=>entry.id);
    save(false);
    admin();
    const saved=await syncDatabaseInBackground();
    presenterOrderSaving=false;
    admin();
    if (saved!==false) toast('บันทึกลำดับเรียบร้อยแล้ว');
    return;
  }
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
    const localPageCopy=structuredClone(db.siteSettings?.pageCopy||{});
    const remote = await window.auausaveDB.load();
    db = remote;
    ensureDexxEventType();
    ensureHomePageSettings();
    ensureLocalizationSettings();
    restoreNewerLocalPageCopy(localPageCopy);
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
    const localPageCopy=structuredClone(db.siteSettings?.pageCopy||{});
    const remote = await window.auausaveDB.load();
    db = remote;
    ensureDexxEventType();
    ensureHomePageSettings();
    ensureLocalizationSettings();
    restoreNewerLocalPageCopy(localPageCopy);
    localStorage.setItem('auausave-house-db-v9', JSON.stringify(db));
    router();
  } catch (error) {
    console.info('Supabase ยังไม่พร้อม:', error.message);
  }
}

function router() {
  route = location.hash.slice(1) || "home";
  if (route === "home") home();
  else if (
    ["artists", "schedule", "presenters", "awards"].includes(route)
  )
    listing(route);
  else if (route.startsWith("artist/")) profile(artistIdFromPublicRoute(route.slice(7)));
  else if (route.startsWith("/")) profile(artistIdFromPublicRoute(route));
  else if (route === "projects") projectHubPage();
  else if (route.startsWith("project/")) projectDetailPage(route.slice(8));
  else if (route === "admin") requestAdminAccess();
  else home();
  document.documentElement.lang = 'th';
  scrollPageToTop();
}
function scrollPageToTop() {
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
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
  const artistId = canonicalArtistId(artist.id);
  const info = db.siteSettings.personalProfiles[artistId] || {};
  const moreAboutTitle = artistId === 'AT02' ? 'More About Auau' : 'More About Save';
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
  return `<section class="section personal-profile-section"><div class="container"><div class="personal-profile-heading"><span>GET TO KNOW</span><h2>${escapePageText(artist.name)} Profile</h2><p>Personal details, sizing and favorites.</p></div><div class="personal-profile-layout"><article class="personal-profile-card personal-basics"><h3>Personal Information</h3>${list(basics)}${info.education?`<div class="personal-copy"><span>Education</span><p>${escapePageText(info.education)}</p></div>`:''}</article><article class="personal-profile-card personal-sizing"><h3>Sizing</h3>${sizingCard}</article><article class="personal-profile-card personal-more-about"><h3>${moreAboutTitle}</h3>${info.moreAbout?`<div class="personal-about-copy">${escapePageText(info.moreAbout)}</div>`:'<p class="personal-empty">No information added yet.</p>'}</article><article class="personal-profile-card personal-favorites"><h3>Favorites</h3>${list(personalProfileLines(info.favorites))||'<p class="personal-empty">No favorites added yet.</p>'}${info.motto?`<blockquote><small>MOTTO</small>${escapePageText(info.motto)}</blockquote>`:''}</article></div></div></section>`;
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
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal"><div class="modal personal-profile-modal"><div class="modal-head"><h2>ข้อมูลส่วนตัว ${escapePageText(artist?.name||artistId)}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="savePersonalProfile(event,'${artistId}')"><div class="form-grid"><h3 class="profile-form-heading">Personal Information</h3>${input('zodiac','Zodiac sign')}${input('chineseZodiac','Chinese zodiac')}${input('bloodType','Blood type')}<div class="field full"><label>Education</label><textarea name="education">${escapePageText(info.education||'')}</textarea></div><h3 class="profile-form-heading">Sizing <small>กรอกเฉพาะช่องที่มีข้อมูลได้</small></h3>${input('height','Height','174 cm')}${input('weight','Weight','52 kg')}${input('bust','Bust','31 in')}${input('waist','Waist','26 in')}${input('shirtTops','Shirt/Tops','L')}${input('shoe','Shoe','40 EU')}${input('wristSize','Wrist Size','15–16 cm')}<div></div>${fingerInputs('Left','Left')}${fingerInputs('Right','Right')}<h3 class="profile-form-heading">${artistId==='AT02'?'More About Auau':'More About Save'}</h3><div class="field full"><label>รายละเอียดเพิ่มเติม</label><textarea name="moreAbout" placeholder="เพิ่มเรื่องราวหรือข้อมูลเพิ่มเติมเกี่ยวกับศิลปิน">${escapePageText(info.moreAbout||'')}</textarea></div><div class="field full"><label>Favorites</label><textarea name="favorites" placeholder="Food | Papaya salad&#10;Color | Red, black, white&#10;Sport | Football">${escapePageText(info.favorites||'')}</textarea><small>หนึ่งรายการต่อหนึ่งบรรทัด รูปแบบ: หัวข้อ | ข้อมูล</small></div><div class="field full"><label>Motto</label><textarea name="motto">${escapePageText(info.motto||'')}</textarea></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกข้อมูลส่วนตัว</button></div></form></div></div>`);
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
  if (item.image) db.siteSettings.awardImages[item.id]=item.image;
  else delete db.siteSettings.awardImages[item.id];
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
    ['dashboard','⌂','Dashboard'],['pagecontent','▤','Homepage Content'],['artists','◉','Profiles'],['events','▦','Schedule'],['timeline','◷','Timeline'],['presenters','✦','Presenters'],['awards','◇','Awards'],['projects','◆','Projects'],['master','⚙','Master Data'],
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
  const modalForm=document.querySelector('#modal form');
  const isArtistImage=field==='image'&&String(modalForm?.getAttribute('onsubmit')||'').includes("'artists'");
  if(canChoose)return{canChoose,orientation:orientationSelect.value==='landscape'?'landscape':'portrait'};
  if(field==='heroImage')return{canChoose:false,orientation:'square',ratio:.976,shape:'hero'};
  if(field==='thumbnail')return{canChoose:false,orientation:'landscape',ratio:16/9,shape:'video'};
  if(field==='cardImage')return{canChoose:false,orientation:'square',ratio:1,shape:'project-card'};
  if(field==='banner')return{canChoose:false,orientation:'landscape',ratio:1600/400,shape:'project-banner'};
  if(field==='qrCode')return{canChoose:false,orientation:'square',ratio:1,shape:'project-qr'};
  if(field==='logo')return{canChoose:false,orientation:'square',ratio:1,shape:'logo'};
  if(field==='announcementImage')return{canChoose:false,orientation:'portrait',ratio:presenterMediaAspectRatio(),shape:'presenter'};
  if(field==='image'&&adminTab==='awards')return{canChoose:false,orientation:'portrait',ratio:2/3,shape:'award'};
  if(isArtistImage)return{canChoose:false,orientation:'square',ratio:1,shape:'artist'};
  if(field==='poster'&&adminTab==='events')return{canChoose:false,orientation:'portrait',ratio:3/4,shape:'event'};
  return{canChoose:false,orientation:'portrait',ratio:3/4,shape:'timeline'};
}
function cropRatio(state=cropImageState){return state.preset.ratio||(state.orientation==='landscape'?16/9:3/4);}
function cropCanvasSize(){const ratio=cropRatio(),width=1200;return{width,height:Math.round(width/ratio)};}
function cropFrameClass(){if(!cropImageState)return'';if(cropImageState.preset.canChoose)return cropImageState.orientation==='landscape'?'crop-frame-timeline-landscape':'crop-frame-timeline-portrait';return`crop-frame-${cropImageState.preset.shape||'default'}`;}
function drawCropState(context,width,height,state=cropImageState){
  if(!context||!state?.image)return;
  const imageWidth=state.image.naturalWidth,imageHeight=state.image.naturalHeight;
  const scaleX=width/imageWidth,scaleY=height/imageHeight;
  const coverScale=Math.max(scaleX,scaleY)*state.zoom;
  const drawWidth=imageWidth*coverScale,drawHeight=imageHeight*coverScale;
  const overflowX=Math.max(0,(drawWidth-width)/2),overflowY=Math.max(0,(drawHeight-height)/2);
  const x=(width-drawWidth)/2+(state.panX/100)*overflowX;
  const y=(height-drawHeight)/2+(state.panY/100)*overflowY;
  context.clearRect(0,0,width,height);
  context.drawImage(state.image,x,y,drawWidth,drawHeight);
}
function drawCropPreview(){
  const state=cropImageState,canvas=document.querySelector('#cropImageCanvas');if(!state||!canvas)return;
  const size=cropCanvasSize();canvas.width=size.width;canvas.height=size.height;
  drawCropState(canvas.getContext('2d'),size.width,size.height,state);
  canvas.className=`${cropFrameClass()}${state.drag?' is-dragging':''}`;const label=document.querySelector('#cropRatioLabel');if(label)label.textContent=state.preset.shape==='hero'?'กรอบ Hero หน้าบ้าน':state.preset.shape==='project-banner'?'แบนเนอร์โปรเจกต์ 1600 × 400':state.orientation==='landscape'?'แนวนอน':state.orientation==='square'?'สี่เหลี่ยม':'แนวตั้ง';
}
function updateCropControl(name,value){if(!cropImageState)return;cropImageState[name]=Number(value);drawCropPreview();}
function cropDragStart(event){if(!cropImageState)return;const canvas=event.currentTarget;canvas.setPointerCapture?.(event.pointerId);cropImageState.drag={x:event.clientX,y:event.clientY,panX:cropImageState.panX,panY:cropImageState.panY};canvas.classList.add('is-dragging');}
function cropDragMove(event){const state=cropImageState,drag=state?.drag,canvas=event.currentTarget;if(!state||!drag)return;const size=cropCanvasSize(),base=Math.max(size.width/state.image.naturalWidth,size.height/state.image.naturalHeight),scale=base*state.zoom,overflowX=Math.max(0,(state.image.naturalWidth*scale-size.width)/2),overflowY=Math.max(0,(state.image.naturalHeight*scale-size.height)/2),factor=size.width/Math.max(canvas.getBoundingClientRect().width,1),clamp=value=>Math.max(-100,Math.min(100,value));state.panX=overflowX?clamp(drag.panX+((event.clientX-drag.x)*factor/overflowX)*100):0;state.panY=overflowY?clamp(drag.panY+((event.clientY-drag.y)*factor/overflowY)*100):0;document.querySelector('#cropPanX').value=state.panX;document.querySelector('#cropPanY').value=state.panY;drawCropPreview();}
function cropDragEnd(event){if(!cropImageState)return;cropImageState.drag=null;event.currentTarget.classList.remove('is-dragging');event.currentTarget.releasePointerCapture?.(event.pointerId);}
function changeCropOrientation(value){if(!cropImageState)return;cropImageState.orientation=value==='landscape'?'landscape':'portrait';cropImageState.zoom=1;cropImageState.panX=0;cropImageState.panY=0;document.querySelector('#cropZoom').value='1';document.querySelector('#cropPanX').value='0';document.querySelector('#cropPanY').value='0';drawCropPreview();}
function closeCropImage(){const state=cropImageState;document.querySelector('#cropImageModal')?.remove();if(state?.input){state.input.value='';const submit=state.input.closest('form')?.querySelector('[type="submit"]');if(submit)submit.disabled=false;}cropImageState=null;}
function applyCroppedImage(){
  const state=cropImageState,previewCanvas=document.querySelector('#cropImageCanvas');if(!state||!previewCanvas)return;
  const ratio=cropRatio(),output=document.createElement('canvas');output.width=state.preset.shape==='project-banner'?1600:(state.orientation==='landscape'?1200:(state.orientation==='square'?1000:900));output.height=state.preset.shape==='project-banner'?400:Math.round(output.width/ratio);
  drawCropState(output.getContext('2d'),output.width,output.height,state);
  const data=output.toDataURL('image/jpeg',.88),hidden=document.querySelector(`#modal [name="${state.field}"]`),preview=document.querySelector(`#uploadPreview_${state.field}`);
  if(!hidden||!preview){toast('ไม่พบช่องบันทึกรูป กรุณาปิดฟอร์มแล้วลองใหม่');closeCropImage();return;}
  hidden.value=data;preview.classList.add('has-image');preview.innerHTML=`<img src="${data}" alt="preview">`;
  const orientationSelect=document.querySelector('#modal [name="imageOrientation"]');if(state.preset.canChoose&&orientationSelect)orientationSelect.value=state.orientation;
  const submit=state.input.closest('form')?.querySelector('[type="submit"]');if(submit)submit.disabled=false;document.querySelector('#cropImageModal')?.remove();cropImageState=null;toast('ปรับรูปเรียบร้อยแล้ว กดบันทึกเพื่อยืนยัน');
}
function openCropImage(input,field,image,preset){
  cropImageState={input,field,image,preset,orientation:preset.orientation,zoom:1,panX:0,panY:0};const submit=input.closest('form')?.querySelector('[type="submit"]');if(submit)submit.disabled=true;
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop crop-image-backdrop" id="cropImageModal"><div class="modal crop-image-modal"><div class="modal-head"><div><small>ADJUST IMAGE</small><h2>Crop Image / Adjust Image</h2><p>ลากรูปด้วยเมาส์หรือนิ้วเพื่อจัดตำแหน่งให้พอดีกับกรอบหน้าบ้าน</p></div><button class="close" onclick="closeCropImage()">×</button></div>${preset.canChoose?`<div class="crop-orientation"><b>เลือกรูปแบบรูปก่อนปรับ</b><div><button type="button" class="${preset.orientation==='portrait'?'active':''}" onclick="this.parentElement.querySelectorAll('button').forEach(button=>button.classList.remove('active'));this.classList.add('active');changeCropOrientation('portrait')">▯ แนวตั้ง</button><button type="button" class="${preset.orientation==='landscape'?'active':''}" onclick="this.parentElement.querySelectorAll('button').forEach(button=>button.classList.remove('active'));this.classList.add('active');changeCropOrientation('landscape')">▭ แนวนอน</button></div></div>`:''}<div class="crop-stage"><canvas id="cropImageCanvas" onpointerdown="cropDragStart(event)" onpointermove="cropDragMove(event)" onpointerup="cropDragEnd(event)" onpointercancel="cropDragEnd(event)"></canvas><span id="cropRatioLabel"></span></div><div class="crop-controls"><label><span>ซูมเข้า–ออก</span><input id="cropZoom" type="range" min="1" max="3" value="1" step="0.01" oninput="updateCropControl('zoom',this.value)"></label><label><span>เลื่อนซ้าย–ขวา</span><input id="cropPanX" type="range" min="-100" max="100" value="0" oninput="updateCropControl('panX',this.value)"></label><label><span>เลื่อนขึ้น–ลง</span><input id="cropPanY" type="range" min="-100" max="100" value="0" oninput="updateCropControl('panY',this.value)"></label></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeCropImage()">ยกเลิก</button><button type="button" class="btn" onclick="applyCroppedImage()">ใช้รูปที่ปรับแล้ว</button></div></div></div>`);drawCropPreview();
}
handleImageUpload=function(input,field){const file=input.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('รองรับเฉพาะไฟล์ JPG, JPEG, PNG และ WebP');input.value='';return;}if(file.size>8*1024*1024){toast('กรุณาเลือกรูปขนาดไม่เกิน 8 MB');input.value='';return;}const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>openCropImage(input,field,image,imageCropPreset(field));image.onerror=()=>{input.value='';toast('ไม่สามารถอ่านไฟล์รูปนี้ได้ กรุณาเลือกไฟล์ใหม่');};image.src=reader.result;};reader.onerror=()=>{input.value='';toast('ไม่สามารถอ่านไฟล์รูปนี้ได้ กรุณาเลือกไฟล์ใหม่');};reader.readAsDataURL(file);};

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
  return `<section class="panel homepage-live-editor"><div class="panel-head"><div><small>HOMEPAGE PREVIEW & CONTENT</small><h2>แก้ไขหน้าแรกจากตัวอย่างหน้าบ้าน</h2><p class="master-note">รวมรูปหลัก ข้อความหัวหน้าแรก และข้อความในการ์ดไว้ในหน้าเดียว กดปุ่มแก้ไขตรงส่วนที่ต้องการได้เลย</p></div><div class="home-preview-actions"><button class="btn outline" onclick="openPageTextEditor('home','th')">แก้ไขหัวข้อหลัก</button><button class="btn" onclick="openHomeSettings()">ตั้งค่ารูปหลัก</button></div></div><div class="homepage-live-preview"><article class="live-hero-preview ${hero.visible===false?'is-hidden':''}"><div><small>${escapePageText(hero.eyebrow||'AUAUSAVE FANBASE')}</small><h3>${escapePageText(hero.title||'OUR HOUSE. OUR STORY.').replace(/\n/g,'<br>')}</h3><p>${escapePageText(hero.description||'')}</p></div><label class="timeline-visibility-switch"><input type="checkbox" ${hero.visible===false?'':'checked'} onchange="toggleHomeSection('hero')"><span>${hero.visible===false?'ซ่อนอยู่':'แสดงอยู่'}</span></label></article><div class="live-card-preview-grid">${cardIds.map(id=>{const card=db.siteSettings.homeCards?.[id]||{};return `<article class="live-card-preview"><small>${escapePageText(card.eyebrow||'')}</small><h3>${escapePageText(card.title||'')}</h3><p>${escapePageText(card.description||'')}</p><button class="btn outline" onclick="openHomeCardEditor('${id}')">แก้ไขคำ</button></article>`;}).join('')}</div></div></section>`;
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
  return `<div class="artists homepage-artist-grid">${cards.map(artist => {const settings=db.siteSettings.homeArtistCards[artist.id]||{};return `<article class="artist-card" onclick="location.hash='/${artistPublicSlug(artist.id)}'"><div class="portrait" style="background:${artist.color}">${artist.image?`<img src="${escapePageText(artist.image)}" alt="${escapePageText(artist.name)}">`:`<span>${escapePageText(artist.initial)}</span>`}<small class="tag">${escapePageText(settings.badge||'')}</small></div><div class="artist-meta"><span class="arrow">➚</span><h3>${escapePageText(artist.name)}</h3><p>${escapePageText(artist.role)}</p></div></article>`;}).join('')}</div>`;
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
  return items.length ? [...items].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<div class="schedule-row"><div class="date-box"><strong>${day(e.date)}</strong><span>${month(e.date)} ${new Date(e.date).getFullYear()}</span></div><div><h3>${escapePageText(e.title)}</h3><p>${escapePageText(eventArtistNames(e))} · ${escapePageText(e.place||'')}</p></div><span class="event-type">${escapePageText(e.type||'')}</span>${e.source ? `<a class="round-arrow" href="${escapePageText(e.source)}" target="_blank" title="ดูต้นทาง">➚</a>` : "<span></span>"}</div>`).join("") : `<div class="empty">ยังไม่มีข้อมูลในขณะนี้</div>`;
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
  return `<section class="section home-schedules"><div class="container"><div class="section-head"><div><span class="eyebrow">This month · ${monthLabel}</span><h2>ตารางงานเดือนนี้</h2></div><a class="btn outline" href="#schedule">เปิดปฏิทินทั้งหมด ➚</a></div><div class="schedule-columns dynamic-schedule-columns">${cards}</div></div></section>`;
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
  return `<section class="section home-schedules"><div class="container"><div class="section-head"><div><span class="eyebrow">This month · ${monthLabel}</span><h2>This Month Schedule</h2></div><a class="btn outline" href="#schedule">View calendar ➚</a></div><div class="schedule-columns dynamic-schedule-columns">${cards||'<div class="empty">No schedule cards selected.</div>'}</div></div></section>`;
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
function homeTimelineSection(){ensureHomepageFrontDisplaySettings();const visible=db.siteSettings.timelineVisibility||{},content=db.siteSettings.timelineCategoryContent||{},items=(db.siteSettings.timeline||[]).filter(homeTimelineItemMatchesScope).sort((a,b)=>Number(Boolean(b.upcoming))-Number(Boolean(a.upcoming))||((Number(b.year)||0)-(Number(a.year)||0)));const card=item=>{const links=(item.links?.length?item.links:(item.url?[{label:'Open',url:item.url}]:[])).map(link=>typeof link==='string'?{label:'Open',url:link}:link).map(link=>{const text=link.label||link.title||'',url=link.url||link.href||(/^https?:\/\//i.test(text)?text:'');return{label:text&&text!==url?text:'Open',url};}).filter(link=>link.url);const imageOrientation=item.imageOrientation==='landscape'?'landscape':'portrait',posterUrl=versionedMediaUrl(item.poster,item.imageVersion||item.id);return `<article class="filmography-card timeline-image-${imageOrientation}">${item.poster?`<img src="${escapePageText(posterUrl)}" alt="${escapePageText(item.title)}">`:`<div class="filmography-placeholder"><span>${escapePageText(item.title.slice(0,2).toUpperCase())}</span></div>`}${item.upcoming?'<span class="timeline-upcoming-badge">UPCOMING</span>':''}<small>${escapePageText(timelineDateLabel(item))}</small><h3>${escapePageText(item.title)}</h3>${item.description?`<p>${escapePageText(item.description)}</p>`:''}${item.note?`<div class="timeline-note">${escapePageText(item.note)}</div>`:''}${links.length?`<div class="archive-card-links">${links.map(link=>`<a href="${escapePageText(link.url)}" target="_blank" rel="noopener noreferrer">${escapePageText(link.label)} ➚</a>`).join('')}</div>`:''}</article>`;};const lane=(category,label)=>{const groupItems=items.filter(item=>(item.category||'series')===category);if(!groupItems.length||visible[category]===false)return'';const group=item=>item.upcoming?'UPCOMING':(item.year||'TBA'),years=[...new Set(groupItems.map(group))];return `<section class="timeline-subsection"><div class="timeline-subsection-head"><div><h3>${escapePageText(content[category]?.title||label)}</h3></div><span>${groupItems.length} items</span></div><div class="filmography-timeline"><div class="filmography-timeline-track">${years.map(year=>`<section class="filmography-year-group ${year==='UPCOMING'?'is-upcoming-group':''}"><header><i></i><b>${escapePageText(year)}</b></header><div class="filmography-year-cards">${groupItems.filter(item=>group(item)===year).map(card).join('')}</div></section>`).join('')}</div></div></section>`;};return `<section class="section artist-filmography home-timeline"><div class="container"><div class="filmography-head"><small>AUAUSAVE HOUSE</small><h2>Timeline</h2><p>Selected series, variety shows and music videos.</p></div>${lane('series','Series')}${lane('variety','Variety Show')}${lane('music-video','Music Video')}</div></section>`;}
const homeTimelineSectionBeforeEditableHeading=homeTimelineSection;
homeTimelineSection=function(){
  const template=document.createElement('template');template.innerHTML=homeTimelineSectionBeforeEditableHeading();
  const settings=db.siteSettings.homeSections?.find(section=>section.id==='timeline')||{},head=template.content.querySelector('.filmography-head');
  if(head){
    const eyebrow=head.querySelector('small'),title=head.querySelector('h2'),description=head.querySelector('p');
    if(eyebrow)eyebrow.textContent=settings.eyebrow||'AUAUSAVE TIMELINE';
    if(title)title.innerHTML=escapePageText(settings.title||'Our Timeline').replace(/\n/g,'<br>');
    if(description)description.textContent=settings.description||'';
  }
  return template.innerHTML;
};
function homePresenterMatchesScope(item){ensureHomepageFrontDisplaySettings();const ids=homeScopedArtistIds(item);return db.siteSettings.homePresenterArtistIds.map(canonicalArtistId).some(id=>ids.includes(id));}
function homePresenterSection(){
  ensureHomepageFrontDisplaySettings();
  const items=orderedPresenters(db.presenters.filter(homePresenterMatchesScope)).slice(0,6);
  const settings=db.siteSettings.homeSections?.find(section=>section.id==='presenters')||{};
  return `<section class="section presenter-home"><div class="container"><div class="section-head"><div><span class="eyebrow">${escapePageText(settings.eyebrow||'')}</span><h2>${escapePageText(settings.title||'Our Presenters').replace(/\n/g,'<br>')}</h2>${settings.description?`<p>${escapePageText(settings.description)}</p>`:''}</div><a class="btn outline" href="#presenters">View all ➚</a></div>${presenterCards(items)}</div></section>`;
}
const pageContentAdminBeforeFrontDisplaySettings=pageContentAdmin;
pageContentAdmin=function(){pageContentAdminBeforeFrontDisplaySettings();if(!adminAuthenticated||adminTab!=='pagecontent')return;const main=document.querySelector('.admin-main');if(homeBuilderTab==='order')main?.insertAdjacentHTML('beforeend',renderHomepageScheduleOrderEditor());if(homeBuilderTab==='content')main?.insertAdjacentHTML('beforeend',renderHomepageFrontScopeEditor());};
const homeBeforeFrontDisplaySettings=home;
home=function(){homeBeforeFrontDisplaySettings();ensureHomepageFrontDisplaySettings();const main=document.querySelector('main'),footerEl=document.querySelector('footer');document.querySelector('.presenter-home')?.remove();document.querySelector('.home-timeline')?.remove();const timelineVisible=db.siteSettings.homeSections?.find(section=>section.id==='timeline')?.visible!==false,presenterVisible=db.siteSettings.homeSections?.find(section=>section.id==='presenters')?.visible!==false;if(timelineVisible)(footerEl||main)?.insertAdjacentHTML(footerEl?'beforebegin':'beforeend',homeTimelineSection());if(presenterVisible)(footerEl||main)?.insertAdjacentHTML(footerEl?'beforebegin':'beforeend',homePresenterSection());};

// Homepage media banner: supports any number of images and locally hosted videos.
let homeBannerTimer = 0;
function ensureHomeBanners(){
  db.siteSettings ||= {};
  if(!Array.isArray(db.siteSettings.homeBanners)) db.siteSettings.homeBanners=[];
  return db.siteSettings.homeBanners;
}
function renderHomeBanner(){
  clearTimeout(homeBannerTimer);
  const main=document.querySelector('#app main'),heroSection=main?.querySelector('.hero'),items=ensureHomeBanners().filter(item=>item.src);
  if(!main||!heroSection||!items.length)return;
  heroSection.insertAdjacentHTML('beforebegin',`<section class="home-media-banner" aria-label="Homepage banner"><div class="home-banner-track">${items.map((item,index)=>item.type==='video'
    ?`<video class="home-banner-slide ${index?'':'active'} ${item.link?'is-linked':''}" src="${escapePageText(item.src)}" data-link="${escapePageText(item.link||'')}" muted playsinline preload="metadata"></video>`
    :`<img class="home-banner-slide ${index?'':'active'} ${item.link?'is-linked':''}" src="${escapePageText(item.src)}" data-link="${escapePageText(item.link||'')}" alt="Banner ${index+1}">`).join('')}</div>${items.some(item=>item.type==='video')?'<button class="home-banner-sound" type="button" aria-label="เปิดเสียงวิดีโอ" title="เปิดเสียง">🔇</button>':''}${items.length>1?`<button class="home-banner-arrow prev" aria-label="Previous banner">‹</button><button class="home-banner-arrow next" aria-label="Next banner">›</button><div class="home-banner-dots">${items.map((_,index)=>`<button class="${index?'':'active'}" aria-label="Banner ${index+1}"></button>`).join('')}</div>`:''}</section>`);
  const banner=main.querySelector('.home-media-banner');
  let current=0,soundOn=false;
  const slides=[...banner.querySelectorAll('.home-banner-slide')],dots=[...banner.querySelectorAll('.home-banner-dots button')];
  const show=index=>{
    clearTimeout(homeBannerTimer);
    slides[current]?.pause?.();
    current=(index+slides.length)%slides.length;
    slides.forEach((slide,i)=>slide.classList.toggle('active',i===current));
    dots.forEach((dot,i)=>dot.classList.toggle('active',i===current));
    const item=items[current],slide=slides[current];
    if(item.type==='video'){
      slide.muted=!soundOn;
      slide.currentTime=0;
      slide.play().catch(()=>{});
      slide.onended=()=>show(current+1);
    }else homeBannerTimer=setTimeout(()=>show(current+1),Math.max(2,Number(item.duration)||5)*1000);
  };
  banner.querySelector('.home-banner-arrow.prev')?.addEventListener('click',()=>show(current-1));
  banner.querySelector('.home-banner-arrow.next')?.addEventListener('click',()=>show(current+1));
  slides.forEach(slide=>slide.addEventListener('click',()=>{const link=slide.dataset.link?.trim();if(!link)return;if(/^https?:\/\//i.test(link))window.open(link,'_blank','noopener,noreferrer');else location.href=link;}));
  const soundButton=banner.querySelector('.home-banner-sound');
  soundButton?.addEventListener('click',()=>{soundOn=!soundOn;banner.querySelectorAll('video').forEach(video=>video.muted=!soundOn);soundButton.textContent=soundOn?'🔊':'🔇';soundButton.setAttribute('aria-label',soundOn?'ปิดเสียงวิดีโอ':'เปิดเสียงวิดีโอ');soundButton.title=soundOn?'ปิดเสียง':'เปิดเสียง';if(items[current]?.type==='video')slides[current].play().catch(()=>{});});
  dots.forEach((dot,index)=>dot.addEventListener('click',()=>show(index)));
  show(0);
}
function homeBannerAdminPanel(){
  const items=ensureHomeBanners();
  return `<section class="panel home-banner-admin"><div class="panel-head"><div><small>MEDIA BANNER · 1920 × 1080 PX</small><h2>แบนเนอร์รูปและวิดีโอ</h2><p class="master-note">ส่วนนี้แยกจาก Hero เดิม แนะนำไฟล์อัตราส่วน 16:9 ขนาด 1920 × 1080 พิกเซล</p></div><label class="btn">+ เพิ่มรูปหรือคลิป<input type="file" accept="image/*,video/mp4,video/webm" multiple hidden onchange="addHomeBannerFiles(this)"></label></div><div class="home-banner-admin-list">${items.length?items.map((item,index)=>`<article><div class="home-banner-admin-thumb">${item.type==='video'?`<video src="${escapePageText(item.src)}" muted></video>`:`<img src="${escapePageText(item.src)}" alt="">`}<span>${item.type==='video'?'VIDEO':'IMAGE'}</span></div><div><b>Banner ${String(index+1).padStart(2,'0')}</b>${item.type==='image'?`<label>แสดง <input type="number" min="2" max="60" value="${Number(item.duration)||5}" onchange="setHomeBannerDuration('${item.id}',this.value)"> วินาที</label>`:'<small>เปลี่ยนอัตโนมัติเมื่อคลิปจบ</small>'}<label class="home-banner-link-field">ลิงก์เมื่อคลิก<input class="home-banner-link-input" type="text" value="${escapePageText(item.link||'')}" placeholder="https://... หรือ #/AUAU" onchange="setHomeBannerLink('${item.id}',this.value)"></label></div><div class="actions"><button class="btn outline" onclick="moveHomeBanner('${item.id}',-1)" ${index===0?'disabled':''}>↑</button><button class="btn outline" onclick="moveHomeBanner('${item.id}',1)" ${index===items.length-1?'disabled':''}>↓</button><button class="btn danger" onclick="removeHomeBanner('${item.id}')">ลบ</button></div></article>`).join(''):'<div class="empty">ยังไม่มี Banner — เพิ่มรูปหรือคลิปขนาด 1920 × 1080 ได้จากปุ่มด้านบน</div>'}</div></section>`;
}
function addHomeBannerFiles(input){
  const files=[...input.files];
  if(files.some(file=>file.size>50*1024*1024)){toast('ไฟล์แต่ละรายการต้องมีขนาดไม่เกิน 50 MB');input.value='';return;}
  Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({id:`banner_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,type:file.type.startsWith('video/')?'video':'image',src:reader.result,duration:5});reader.onerror=reject;reader.readAsDataURL(file);}))).then(items=>{ensureHomeBanners().push(...items);save();pageContentAdmin();toast(`เพิ่ม Banner ${items.length} รายการแล้ว`);}).catch(()=>toast('ไม่สามารถอ่านไฟล์ที่เลือกได้'));
}
function setHomeBannerDuration(id,value){const item=ensureHomeBanners().find(entry=>entry.id===id);if(!item)return;item.duration=Math.min(60,Math.max(2,Number(value)||5));save();}
function setHomeBannerLink(id,value){const item=ensureHomeBanners().find(entry=>entry.id===id);if(!item)return;item.link=String(value||'').trim();save();toast('บันทึกลิงก์ Banner แล้ว');}
function moveHomeBanner(id,direction){const items=ensureHomeBanners(),index=items.findIndex(item=>item.id===id),target=index+direction;if(index<0||target<0||target>=items.length)return;[items[index],items[target]]=[items[target],items[index]];save();pageContentAdmin();}
function removeHomeBanner(id){if(!confirm('ลบ Banner รายการนี้?'))return;db.siteSettings.homeBanners=ensureHomeBanners().filter(item=>item.id!==id);save();pageContentAdmin();toast('ลบ Banner แล้ว');}
const homeBeforeMediaBanner=home;
home=function(){homeBeforeMediaBanner();renderHomeBanner();};
const pageContentAdminBeforeMediaBanner=pageContentAdmin;
pageContentAdmin=function(){pageContentAdminBeforeMediaBanner();if(!adminAuthenticated||adminTab!=='pagecontent'||homeBuilderTab!=='content')return;document.querySelector('.homepage-live-editor')?.insertAdjacentHTML('afterend',homeBannerAdminPanel());};
const pageContentAdminBeforeWideBannerLabel=pageContentAdmin;
pageContentAdmin=function(){pageContentAdminBeforeWideBannerLabel();const panel=document.querySelector('.home-banner-admin');if(!panel)return;const label=panel.querySelector('.panel-head small'),note=panel.querySelector('.master-note'),empty=panel.querySelector('.empty');if(label)label.textContent='MEDIA BANNER · 1920 × 800 PX';if(note)note.textContent='ส่วนนี้แยกจาก Hero เดิม แนะนำไฟล์อัตราส่วน 12:5 ขนาด 1920 × 800 พิกเซล';if(empty)empty.textContent='ยังไม่มี Banner — เพิ่มรูปหรือคลิปขนาด 1920 × 800 ได้จากปุ่มด้านบน';};
const pageContentAdminBeforeUnifiedSidebar=pageContentAdmin;
pageContentAdmin=function(){
  pageContentAdminBeforeUnifiedSidebar();
  const sideNav=document.querySelector('.sidebar .side-nav');if(!sideNav)return;
  const items=[['dashboard','⌂','Dashboard'],['pagecontent','▤','Homepage Content'],['artists','◉','Profiles'],['events','▦','Schedule'],['timeline','◷','Timeline'],['presenters','✦','Presenters'],['awards','◇','Awards'],['projects','◆','Projects'],['master','⚙','Master Data']];
  sideNav.innerHTML=items.map(([id,icon,label])=>`<button data-icon="${icon}" class="${id==='pagecontent'?'active':''}" onclick="adminTab='${id}';admin()">${icon} &nbsp; ${label}</button>`).join('');
};

/* Artist directory and per-artist page builder. */
let artistManagerArtistId = '';
let artistManagerTab = 'layout';
let artistDirectoryQuery = '';
let artistBuilderDevice = 'desktop';

const ARTIST_BUILDER_CORE = [
  {id:'hero',label:'Artist Hero',layout:'full',visible:true,locked:true},
  {id:'personal',label:'Profile',layout:'full',visible:true,locked:true},
  {id:'events',label:"This month's schedule",layout:'full',visible:true,locked:true},
  {id:'timeline',label:'Timeline',layout:'full',visible:true,locked:true},
  {id:'awards',label:'Awards',layout:'full',visible:true,locked:true},
];

function artistBuilderDefaults(artistId){
  return ARTIST_BUILDER_CORE.map(section=>({...section,visible:section.id==='personal'?!sameArtistId(artistId,'duo'):section.visible}));
}

function ensureArtistPageBuilders(){
  ensureHomePageSettings();
  db.siteSettings.artistPageBuilders ||= {};
  db.siteSettings.personalProfiles ||= {};
  db.artists.forEach(artist=>{
    db.siteSettings.personalProfiles[artist.id] ||= {};
    const stored=Array.isArray(db.siteSettings.artistPageBuilders[artist.id])?db.siteSettings.artistPageBuilders[artist.id]:[];
    const coreMap=new Map(artistBuilderDefaults(artist.id).map(item=>[item.id,item]));
    const normalized=stored.map(item=>coreMap.has(item.id)?{...coreMap.get(item.id),...item}:{...item,custom:true});
    const present=new Set(normalized.map(item=>item.id));
    artistBuilderDefaults(artist.id).forEach(item=>{if(!present.has(item.id))normalized.push(item)});
    db.siteSettings.artistPageBuilders[artist.id]=normalized;
  });
}

function artistBuilderSections(artistId){
  ensureArtistPageBuilders();
  return db.siteSettings.artistPageBuilders[canonicalArtistId(artistId)]||[];
}

function artistAdminSidebar(){
  const items=[['dashboard','⌂','Dashboard'],['pagecontent','▤','Homepage Content'],['artists','◉','Profiles'],['events','▦','Schedule'],['timeline','◷','Timeline'],['presenters','✦','Presenters'],['awards','◇','Awards'],['projects','◆','Projects'],['master','⚙','Master Data']];
  return `<aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav">${items.map(([id,icon,label])=>`<button data-icon="${icon}" class="${id==='artists'?'active':''}" onclick="adminTab='${id}';artistManagerArtistId='';admin()">${icon} &nbsp; ${label}</button>`).join('')}</div><a class="back" href="#artists">← ดูหน้าบ้าน</a></aside>`;
}

function artistManagerShell(content){
  app.innerHTML=`<div class="admin artist-manager"><div class="admin-shell">${artistAdminSidebar()}<main class="admin-main">${content}</main></div></div>`;
}

function artistDirectoryFiltered(){
  const query=artistDirectoryQuery.trim().toLowerCase();
  return sortedArtists().filter(artist=>!query||[artist.name,artist.realName,artist.nameEN,artist.id].some(value=>String(value||'').toLowerCase().includes(query)));
}

function artistDirectoryCard(artist){
  const count=artistBuilderSections(artist.id).filter(section=>section.visible!==false).length;
  const published=artistBuilderSections(artist.id).some(section=>section.custom)||artist.image;
  return `<article class="artist-directory-card"><div class="artist-directory-portrait" style="background:${escapePageText(artist.color||'#ddd')}">${artist.image?`<img src="${escapePageText(artist.image)}" alt="${escapePageText(artist.name)}">`:`<span>${escapePageText(artist.initial||artist.name.slice(0,2))}</span>`}</div><div class="artist-directory-copy"><div><small>${escapePageText(artist.id)}</small><span class="artist-publish-state ${published?'is-live':''}">${published?'เผยแพร่แล้ว':'แบบร่าง'}</span></div><h2>${escapePageText(artist.name)}</h2><p>${escapePageText(artist.realName||artist.role||'')}</p><b>Sections ${count}</b></div><div class="artist-directory-actions"><button class="btn" onclick="openArtistManager('${artist.id}','layout')">จัดการโปรไฟล์</button><a class="btn outline" href="#/${artistPublicSlug(artist.id)}">ดูหน้าบ้าน ➚</a><button class="icon-btn" aria-label="แก้ไขข้อมูล" onclick="openForm('artists','${artist.id}')">✎</button></div></article>`;
}

function renderArtistDirectoryGrid(){
  const grid=document.querySelector('[data-artist-directory-grid]');
  if(!grid)return;
  const artists=artistDirectoryFiltered();
  grid.innerHTML=artists.map(artistDirectoryCard).join('')+`<button class="artist-directory-add" onclick="openForm('artists')"><span>＋</span><b>เพิ่มศิลปินใหม่</b><small>ระบบจะสร้างหน้าโปรไฟล์มาตรฐานให้โดยอัตโนมัติ</small></button>`;
}

function filterArtistDirectory(value){artistDirectoryQuery=value;renderArtistDirectoryGrid()}

function artistDirectoryAdmin(){
  ensureArtistPageBuilders();
  artistManagerShell(`<div class="admin-top artist-directory-head"><div><small>ARTIST MANAGEMENT</small><h1>จัดการศิลปิน</h1><p>ศิลปินทั้งหมด ${db.artists.length} คน</p></div><button class="btn" onclick="openForm('artists')">+ เพิ่มศิลปิน</button></div><section class="artist-directory-tools"><label><span>⌕</span><input value="${escapePageText(artistDirectoryQuery)}" oninput="filterArtistDirectory(this.value)" placeholder="ค้นหาศิลปิน…"></label><select onchange="this.value==='name'&&db.artists.sort((a,b)=>a.name.localeCompare(b.name));renderArtistDirectoryGrid()"><option value="recent">เรียงตาม: ล่าสุด</option><option value="name">เรียงตาม: ชื่อ</option></select></section><section class="artist-directory-grid" data-artist-directory-grid></section>`);
  renderArtistDirectoryGrid();
}

function openArtistManager(artistId,tab='layout'){
  artistManagerArtistId=canonicalArtistId(artistId);
  artistManagerTab=tab;
  artistDetailAdmin();
}

function artistManagerTabs(artist){
  return `<nav class="artist-manager-tabs"><button class="${artistManagerTab==='data'?'active':''}" onclick="openArtistManager('${artist.id}','data')">ข้อมูลศิลปิน</button><button class="${artistManagerTab==='personal'?'active':''}" onclick="openArtistManager('${artist.id}','personal')">โปรไฟล์ส่วนตัว</button><button class="${artistManagerTab==='layout'?'active':''}" onclick="openArtistManager('${artist.id}','layout')">จัดหน้าโปรไฟล์</button></nav>`;
}

function artistDetailAdmin(){
  ensureArtistPageBuilders();
  const artist=artistById(artistManagerArtistId);
  if(!artist){artistManagerArtistId='';artistDirectoryAdmin();return}
  let panel='';
  if(artistManagerTab==='data') panel=renderArtistDataPanel(artist);
  else if(artistManagerTab==='personal') panel=renderArtistPersonalPanel(artist);
  else panel=renderArtistLayoutPanel(artist);
  artistManagerShell(`<div class="admin-top artist-detail-head"><div><button class="artist-back-button" onclick="artistManagerArtistId='';artistDirectoryAdmin()">← ศิลปินทั้งหมด</button><small>จัดการศิลปิน / ${escapePageText(artist.name)}</small><h1>${escapePageText(artist.name)}</h1></div><a class="btn outline" href="#/${artistPublicSlug(artist.id)}">ดูหน้าบ้าน ➚</a></div>${artistManagerTabs(artist)}${panel}`);
}

function renderArtistDataPanel(artist){
  return `<section class="panel artist-summary-panel"><div class="artist-summary-image" style="background:${escapePageText(artist.color||'#ddd')}">${artist.image?`<img src="${escapePageText(artist.image)}" alt="">`:`<span>${escapePageText(artist.initial||'AR')}</span>`}</div><div><small>${escapePageText(artist.id)}</small><h2>${escapePageText(artist.name)}</h2><p>${escapePageText(artist.bio||'ยังไม่มีประวัติศิลปิน')}</p><dl><div><dt>Name TH</dt><dd>${escapePageText(artist.realName||'—')}</dd></div><div><dt>Name EN</dt><dd>${escapePageText(artist.nameEN||'—')}</dd></div><div><dt>Role</dt><dd>${escapePageText(artist.role||'—')}</dd></div><div><dt>Birth date</dt><dd>${escapePageText(formatArtistBirth(artist.birth)||'—')}</dd></div></dl><button class="btn" onclick="openForm('artists','${artist.id}')">แก้ไขข้อมูลศิลปิน</button></div></section>`;
}

function renderArtistPersonalPanel(artist){
  const info=db.siteSettings.personalProfiles[artist.id]||{};
  const filled=Object.values(info).filter(Boolean).length;
  return `<section class="panel artist-personal-landing"><div><small>PERSONAL PROFILE</small><h2>ข้อมูลส่วนตัวของ ${escapePageText(artist.name)}</h2><p>ข้อมูลสัดส่วน สิ่งที่ชอบ การศึกษา และ Motto จะแสดงใน Section “${escapePageText(artist.name)} Profile”</p><span>${filled} ช่องที่มีข้อมูล</span></div><button class="btn" onclick="openPersonalProfileForm('${artist.id}')">แก้ไขโปรไฟล์ส่วนตัว</button></section>`;
}

function artistSectionLayoutLabel(section){
  if(section.custom){
    const inner=({stack:'แนวตั้ง',imageLeft:'รูปซ้าย',imageRight:'รูปขวา',overlay:'ซ้อนทับ'}[section.layout]||'แนวตั้ง');
    const block=({'33':'1/3','50':'1/2','67':'2/3','100':'เต็มแถว'})[String(section.width||'100')]||'เต็มแถว';
    return `${block} · ${inner}`;
  }
  return section.layout==='half'?'2 คอลัมน์':'เต็มความกว้าง';
}

function artistBuilderRow(artist,section,index,sections){
  return `<article class="artist-builder-row ${section.visible===false?'is-hidden':''}" draggable="true" ondragstart="artistSectionDragStart(event,'${section.id}')" ondragover="event.preventDefault()" ondrop="artistSectionDrop(event,'${artist.id}','${section.id}')"><span class="artist-builder-handle" title="ลากเพื่อจัดตำแหน่ง">⠿</span><div><small>${String(index+1).padStart(2,'0')} ${section.custom?'CUSTOM':'SYSTEM'}</small><h3>${escapePageText(section.label||'Untitled section')}</h3>${section.custom?`<p>${[section.image?'รูปภาพ':'',section.body?'ข้อความ':'',section.url?'ปุ่มลิงก์':''].filter(Boolean).join(' · ')||'ยังไม่มีคอนเทนต์'}</p>`:''}</div><span class="artist-layout-badge">${artistSectionLayoutLabel(section)}</span><label class="artist-builder-switch"><input type="checkbox" ${section.visible!==false?'checked':''} onchange="toggleArtistBuilderSection('${artist.id}','${section.id}',this.checked)"><span>${section.visible!==false?'แสดง':'ซ่อน'}</span></label>${section.custom?`<button class="btn outline" onclick="openArtistCustomSectionForm('${artist.id}','${section.id}')">แก้ไข</button><button class="icon-btn" onclick="removeArtistCustomSection('${artist.id}','${section.id}')">⌫</button>`:'<span></span><span></span>'}</article>`;
}

function renderArtistLayoutPanel(artist){
  const sections=artistBuilderSections(artist.id);
  return `<div class="artist-layout-workspace"><section><div class="artist-layout-toolbar"><div><small>ARTIST PAGE LAYOUT</small><h2>จัดหน้าโปรไฟล์</h2><p>ลาก Section เพื่อเรียงลำดับ และเปิดหรือปิดการแสดงผลแยกสำหรับศิลปินคนนี้</p></div><button class="btn" onclick="openArtistCustomSectionForm('${artist.id}')">+ เพิ่ม Section</button></div><div class="artist-builder-list">${sections.map((section,index)=>artistBuilderRow(artist,section,index,sections)).join('')}</div><div class="artist-builder-save"><span>การแก้ไขจะบันทึกเป็นแบบร่างในเครื่องและซิงก์กับฐานข้อมูล</span><button class="btn" onclick="save();toast('บันทึกและเผยแพร่แล้ว')">บันทึกและเผยแพร่</button></div></section><aside class="artist-live-preview"><div class="artist-preview-head"><b>ตัวอย่างหน้าบ้าน</b><div><button class="${artistBuilderDevice==='desktop'?'active':''}" onclick="artistBuilderDevice='desktop';artistDetailAdmin()">▰</button><button class="${artistBuilderDevice==='tablet'?'active':''}" onclick="artistBuilderDevice='tablet';artistDetailAdmin()">▯</button><button class="${artistBuilderDevice==='mobile'?'active':''}" onclick="artistBuilderDevice='mobile';artistDetailAdmin()">▯</button></div></div><div class="artist-preview-frame ${artistBuilderDevice}">${renderArtistBuilderPreview(artist,sections)}</div></aside></div>`;
}

function artistCustomGridSpan(section){
  return ({'33':4,'50':6,'67':8,'75':12,'100':12})[String(section.width||'100')]||12;
}

function renderArtistSystemPreview(artist,section){
  if(section.id==='hero')return `<div class="preview-hero"><div style="background:${escapePageText(artist.color||'#ddd')}">${artist.image?`<img src="${escapePageText(artist.image)}" alt="">`:''}</div><span><small>ARTIST PROFILE</small><b>${escapePageText(artist.name)}</b><i>${escapePageText(artist.role||'ARTIST')}</i></span></div>`;
  if(section.id==='personal')return `<div class="preview-system"><b>${escapePageText(artist.name)} Profile</b><span><i></i><i></i></span></div>`;
  if(section.id==='events')return `<div class="preview-schedule"><small>THIS MONTH</small><b>This month's schedule · ${escapePageText(artist.name)}</b><i></i><i></i></div>`;
  if(section.id==='timeline')return `<div class="preview-dark"><small>OUR TIMELINE</small><b>Timeline</b><span><i></i><i></i><i></i></span></div>`;
  if(section.id==='awards')return `<div class="preview-system"><b>Awards</b><i></i></div>`;
  return '';
}

function renderArtistBuilderPreview(artist,sections){
  let html='',customRow=[],used=0;
  const flushCustomRow=()=>{
    if(!customRow.length)return;
    html+=`<div class="preview-custom-row">${customRow.map(section=>renderArtistCustomSection(section,true)).join('')}</div>`;
    customRow=[];used=0;
  };
  sections.filter(section=>section.visible!==false).forEach(section=>{
    if(!section.custom){flushCustomRow();html+=renderArtistSystemPreview(artist,section);return;}
    const span=artistCustomGridSpan(section);
    if(customRow.length&&used+span>12)flushCustomRow();
    customRow.push(section);used+=span;
  });
  flushCustomRow();
  return html;
}

function artistSectionDragStart(event,sectionId){event.dataTransfer.setData('text/plain',sectionId);event.dataTransfer.effectAllowed='move'}
function artistSectionDrop(event,artistId,targetId){
  event.preventDefault();
  const sourceId=event.dataTransfer.getData('text/plain'),sections=artistBuilderSections(artistId),from=sections.findIndex(item=>item.id===sourceId),to=sections.findIndex(item=>item.id===targetId);
  if(from<0||to<0||from===to)return;
  const [section]=sections.splice(from,1);sections.splice(to,0,section);save();artistDetailAdmin();toast('บันทึกลำดับแล้ว');
}

function toggleArtistBuilderSection(artistId,sectionId,visible){
  const section=artistBuilderSections(artistId).find(item=>item.id===sectionId);if(!section)return;section.visible=visible;save();artistDetailAdmin();
}

function openArtistCustomSectionForm(artistId,sectionId=''){
  const section=artistBuilderSections(artistId).find(item=>item.id===sectionId)||{label:'Custom section',eyebrow:'',body:'',image:'',imageOrientation:'landscape',imageFit:'cover',imagePosition:'center',url:'',linkLabel:'เปิดลิงก์',layout:'imageLeft',width:'100'};
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal artist-custom-modal"><div class="modal-head"><div><small>CUSTOM SECTION</small><h2>${sectionId?'แก้ไข':'เพิ่ม'} Section</h2></div><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveArtistCustomSection(event,'${artistId}','${sectionId}')"><div class="form-grid"><div class="field"><label>ชื่อ Section</label><input name="label" value="${escapePageText(section.label||'')}" required></div><div class="field"><label>Eyebrow</label><input name="eyebrow" value="${escapePageText(section.eyebrow||'')}" placeholder="SUPPORT PROJECT"></div><div class="field full"><label>ข้อความ</label><textarea name="body" rows="4">${escapePageText(section.body||'')}</textarea></div><div class="field full"><label>รูปแบบรูป Section</label><div class="artist-layout-options section-image-orientation"><label><input type="radio" name="sectionImageOrientation" value="landscape" ${(section.imageOrientation||'landscape')==='landscape'?'checked':''} onchange="setSectionImageOrientation(this.value)"><span>▰ แนวนอน 16:9</span></label><label><input type="radio" name="sectionImageOrientation" value="portrait" ${section.imageOrientation==='portrait'?'checked':''} onchange="setSectionImageOrientation(this.value)"><span>▯ แนวตั้ง 3:4</span></label></div><small>เลือกแนวนอนก่อนอัปโหลด เพื่อให้หน้าครอปรูปใช้กรอบ 16:9</small></div><select name="imageOrientation" class="section-image-orientation-select" aria-hidden="true" tabindex="-1"><option value="landscape" ${(section.imageOrientation||'landscape')==='landscape'?'selected':''}>แนวนอน</option><option value="portrait" ${section.imageOrientation==='portrait'?'selected':''}>แนวตั้ง</option></select>${imageUploadTemplate('pageImage','รูปภาพ Section',section.image||'')}<div class="field"><label>การแสดงรูป</label><select name="imageFit"><option value="cover" ${(section.imageFit||'cover')==='cover'?'selected':''}>เต็มกรอบ — อาจมีการครอป</option><option value="contain" ${section.imageFit==='contain'?'selected':''}>เต็มภาพ — ไม่ครอป</option></select></div><div class="field"><label>ตำแหน่งรูป</label><select name="imagePosition"><option value="top" ${section.imagePosition==='top'?'selected':''}>ด้านบน</option><option value="center" ${(section.imagePosition||'center')==='center'?'selected':''}>กึ่งกลาง</option><option value="bottom" ${section.imagePosition==='bottom'?'selected':''}>ด้านล่าง</option></select></div><div class="field"><label>ข้อความบนปุ่ม</label><input name="linkLabel" value="${escapePageText(section.linkLabel||'')}" placeholder="เปิดลิงก์"></div><div class="field"><label>ลิงก์</label><input type="url" name="url" value="${escapePageText(section.url||'')}" placeholder="https://..."></div><div class="field full"><label>การจัดวางภายในกลุ่ม</label><div class="artist-layout-options">${[['imageLeft','รูปซ้าย'],['imageRight','รูปขวา'],['stack','แนวตั้ง'],['overlay','ซ้อนทับ']].map(([value,label])=>`<label><input type="radio" name="layout" value="${value}" ${section.layout===value?'checked':''}><span>${label}</span></label>`).join('')}</div><small>รูปภาพ ข้อความ และปุ่มลิงก์จะถูกจัดเป็นก้อนเดียวกัน</small></div><div class="field full"><label>ความกว้าง Section</label><div class="artist-layout-options width-options">${['50','75','100'].map(value=>`<label><input type="radio" name="width" value="${value}" ${String(section.width||'100')===value?'checked':''}><span>${value}%</span></label>`).join('')}</div></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึก Section</button></div></form></div></div>`);
  setSectionImageOrientation(section.imageOrientation||'landscape');
  const orientationLabels=document.querySelectorAll('#modal .section-image-orientation span');
  if(orientationLabels[0])orientationLabels[0].textContent='แนวนอน 16:9';
  if(orientationLabels[1])orientationLabels[1].textContent='แนวตั้ง 3:4';
  const legacyLinkLabel=document.querySelector('#modal [name="linkLabel"]')?.closest('.field');
  const legacyLinkUrl=document.querySelector('#modal [name="url"]')?.closest('.field');
  if(legacyLinkLabel){legacyLinkLabel.insertAdjacentHTML('beforebegin',renderArtistSectionLinksEditor(section));legacyLinkLabel.remove();legacyLinkUrl?.remove();}
  const widthOptions=document.querySelector('#modal .width-options'),selectedWidth=['33','50','67'].includes(String(section.width))?String(section.width):'100';
  if(widthOptions){
    widthOptions.previousElementSibling.textContent='การวางก้อนในแถว';
    widthOptions.innerHTML=[['33','1/3'],['50','1/2 · จับคู่ 1:1'],['67','2/3'],['100','เต็มแถว']].map(([value,label])=>`<label><input type="radio" name="width" value="${value}" ${selectedWidth===value?'checked':''}><span>${label}</span></label>`).join('');
    widthOptions.insertAdjacentHTML('afterend','<small>ลากเรียง Section เพื่อกำหนดซ้าย–ขวา: 1/2 + 1/2 = 1:1 และ 1/3 + 2/3 = 1:2</small>');
  }
}

function setSectionImageOrientation(value){
  const select=document.querySelector('#modal select[name="imageOrientation"]');
  if(select)select.value=value==='portrait'?'portrait':'landscape';
  const preview=document.querySelector('#uploadPreview_pageImage');
  if(preview){preview.classList.toggle('is-landscape',value!=='portrait');preview.classList.toggle('is-portrait',value==='portrait');}
}

function artistSectionLinks(section){
  if(Array.isArray(section?.links)&&section.links.length)return section.links.filter(link=>link?.url).map(link=>({label:String(link.label||'เปิดลิงก์'),url:String(link.url)}));
  return section?.url?[{label:String(section.linkLabel||'เปิดลิงก์'),url:String(section.url)}]:[];
}

function artistSectionLinkRow(link={}){
  return `<div class="artist-section-link-row"><input name="sectionLinkLabel" value="${escapePageText(link.label||'')}" placeholder="ข้อความบนปุ่ม"><input type="url" name="sectionLinkUrl" value="${escapePageText(link.url||'')}" placeholder="https://..."><button type="button" class="icon-btn" onclick="removeArtistSectionLinkRow(this)" aria-label="ลบลิงก์">⌫</button></div>`;
}

function renderArtistSectionLinksEditor(section){
  const links=artistSectionLinks(section);
  return `<div class="field full artist-section-links-field"><label>ปุ่มลิงก์</label><div class="artist-section-links">${(links.length?links:[{}]).map(artistSectionLinkRow).join('')}</div><button type="button" class="btn outline artist-add-link" onclick="addArtistSectionLinkRow(this)">+ เพิ่มลิงก์</button><small>เพิ่มได้หลายปุ่ม แต่ละปุ่มกำหนดข้อความและ URL แยกกัน</small></div>`;
}

function addArtistSectionLinkRow(button){
  button.closest('.artist-section-links-field')?.querySelector('.artist-section-links')?.insertAdjacentHTML('beforeend',artistSectionLinkRow());
}

function removeArtistSectionLinkRow(button){
  const list=button.closest('.artist-section-links'),rows=list?.querySelectorAll('.artist-section-link-row');
  if(!list||!rows?.length)return;
  if(rows.length===1){rows[0].querySelectorAll('input').forEach(input=>input.value='');return;}
  button.closest('.artist-section-link-row')?.remove();
}

function saveArtistCustomSection(event,artistId,sectionId){
  event.preventDefault();const form=new FormData(event.currentTarget),sections=artistBuilderSections(artistId),existing=sections.find(item=>item.id===sectionId),requestedWidth=String(form.get('width')||'100'),linkLabels=form.getAll('sectionLinkLabel'),linkUrls=form.getAll('sectionLinkUrl'),links=linkUrls.map((url,index)=>({label:String(linkLabels[index]||'เปิดลิงก์').trim()||'เปิดลิงก์',url:String(url||'').trim()})).filter(link=>link.url),section={...(existing||{}),id:sectionId||`custom_${Date.now()}`,custom:true,visible:existing?.visible!==false,label:String(form.get('label')||'Custom section').trim(),eyebrow:String(form.get('eyebrow')||'').trim(),body:String(form.get('body')||'').trim(),image:String(form.get('pageImage')||''),imageOrientation:String(form.get('imageOrientation')||'landscape')==='portrait'?'portrait':'landscape',imageFit:String(form.get('imageFit')||'cover')==='contain'?'contain':'cover',imagePosition:['top','bottom'].includes(String(form.get('imagePosition')))?String(form.get('imagePosition')):'center',links,linkLabel:links[0]?.label||'',url:links[0]?.url||'',layout:String(form.get('layout')||'imageLeft'),width:['33','50','67','100'].includes(requestedWidth)?requestedWidth:'100'};
  if(existing)Object.assign(existing,section);else{const awardIndex=sections.findIndex(item=>item.id==='awards');sections.splice(awardIndex<0?sections.length:awardIndex,0,section)}
  save();closeModal();artistDetailAdmin();toast('บันทึก Section แล้ว');
}

function removeArtistCustomSection(artistId,sectionId){
  const sections=artistBuilderSections(artistId),index=sections.findIndex(item=>item.id===sectionId);if(index<0)return;
  if(!confirm('ลบ Section นี้ใช่หรือไม่?'))return;sections.splice(index,1);save();artistDetailAdmin();toast('ลบ Section แล้ว');
}

function renderArtistCustomSection(section,preview=false){
  const orientation=section.imageOrientation==='portrait'?'portrait':'landscape',fit=section.imageFit==='contain'?'contain':'cover',position=['top','bottom'].includes(section.imagePosition)?section.imagePosition:'center';
  const span=artistCustomGridSpan(section);
  const image=section.image?`<div class="artist-custom-image image-${orientation}"><img src="${escapePageText(section.image)}" alt="${escapePageText(section.label||'')}" style="object-fit:${fit};object-position:center ${position}"></div>`:(preview?`<div class="artist-custom-image image-${orientation} is-empty"><span>รูปภาพ</span></div>`:'');
  const links=artistSectionLinks(section),copy=`<div class="artist-custom-copy">${section.eyebrow?`<small>${escapePageText(section.eyebrow)}</small>`:''}<h2>${escapePageText(section.label||'')}</h2>${section.body?`<p>${escapePageText(section.body).replace(/\n/g,'<br>')}</p>`:''}${links.length?`<div class="artist-custom-links">${links.map(link=>`<a class="btn outline" href="${escapePageText(link.url)}" target="_blank" rel="noopener noreferrer">${escapePageText(link.label)} ➚</a>`).join('')}</div>`:''}</div>`;
  return `<article class="${preview?'preview-custom':'artist-custom-section'} span-${span} layout-${section.layout||'imageLeft'} ${section.image?'':'has-no-image'}" style="--custom-span:${span}"><div class="artist-custom-group">${section.layout==='imageRight'?copy+image:image+copy}</div></article>`;
}

function layoutArtistCustomRows(main,sections,nodes){
  let row=null,container=null,used=0;
  sections.filter(section=>section.visible!==false).forEach(section=>{
    const node=nodes[section.id];if(!node)return;
    if(!section.custom){row=null;container=null;used=0;return;}
    const span=artistCustomGridSpan(section);
    if(!row||used+span>12){
      row=document.createElement('section');row.className='section artist-custom-row';
      container=document.createElement('div');container.className='container';row.appendChild(container);
      node.parentNode.insertBefore(row,node);used=0;
    }
    node.style.setProperty('--custom-span',span);
    container.appendChild(node);used+=span;
  });
}

function renderDonationDashboard(project={}){
  const donations=[],goal=Number(project.goal)||0,total=0,progress=0,remaining=goal;
  const money=value=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:0}).format(value);
  return `<section class="section donation-live" aria-labelledby="donation-live-title">
    <div class="container">
      <div class="donation-live-head">
        <div><span class="eyebrow">${escapePageText(project.title||'Mr.Fanboy Project')} · Live update</span><h2 id="donation-live-title">ทุกแรงสนับสนุน<br>กำลังพาเราไปถึงเป้าหมาย</h2></div>
        <div class="donation-live-status"><i></i><span>LIVE UPDATE</span><small data-donation-status>${project.sheetUrl?'กำลังอ่านข้อมูลจาก Google Sheet...':'ยังไม่ได้เชื่อม Google Sheet'}</small></div>
      </div>
      <div class="donation-kpi-grid">
        <article class="donation-main-card"><span>ยอดบริจาคปัจจุบัน / TOTAL RAISED</span><strong data-donation-total>฿${money(total)}</strong><div class="donation-progress-meta"><b data-donation-percent>${progress.toFixed(2)}%</b><span>GOAL ฿${money(goal)}</span></div><div class="donation-progress" role="progressbar" aria-valuenow="${progress.toFixed(2)}" aria-valuemin="0" aria-valuemax="100"><i data-donation-progress style="width:${progress}%"></i></div></article>
        <article class="donation-side-card"><span>ยอดที่เหลือ / AMOUNT LEFT</span><strong data-donation-remaining>฿${money(remaining)}</strong><small>ก่อนถึงเป้าหมายของโปรเจกต์ / To reach our goal</small></article>
      </div>
      <div class="donation-recent-card donation-ledger"><div class="donation-card-head"><div><span>LIVE DONATION UPDATE</span><h3>LATEST DONATIONS</h3></div><b>AUTO UPDATE</b></div><div class="donation-ledger-head"><span>วันที่</span><span>เวลา</span><span>ยอดเงิน</span></div><div class="donation-ledger-list" data-donation-list><div class="empty">${project.sheetUrl?'กำลังโหลดรายการ...':'ยังไม่มีข้อมูลยอดบริจาค'}</div></div></div>
      <p class="donation-disclaimer">ยอดแสดงก่อนหักค่าธรรมเนียมการโอนต่างประเทศ / Amount shown before international transfer fees.</p>
    </div>
  </section>`;
}
function applyDonationLedgerEnglish(){
  const card=document.querySelector('.donation-ledger');if(!card)return;
  const eyebrow=card.querySelector('.donation-card-head span'),title=card.querySelector('.donation-card-head h3'),status=card.querySelector('.donation-card-head>b');
  if(eyebrow)eyebrow.textContent='LIVE DONATION UPDATE';
  if(title)title.textContent='LATEST DONATIONS';
  if(status){status.textContent='AUTO UPDATE';status.classList.add('donation-auto-status');}
  const headers=card.querySelectorAll('.donation-ledger-head span'),labels=['DATE','TIME','DONATION AMOUNT'];
  headers.forEach((header,index)=>{if(labels[index])header.textContent=labels[index]});
  card.querySelectorAll('.donation-ledger-list>div').forEach(row=>{
    const date=row.querySelector('span'),time=row.querySelector('time');
    if(date&&!/[A-Za-z]{3}/.test(date.textContent))date.textContent='25 Jul 2026';
    if(time)time.textContent=time.textContent.replace(/\s*น\.\s*$/,'').trim();
  });
}

function projectHubPage(){
  ensureProjectSettings();const projects=db.siteSettings.projects.items.filter(project=>project.visible!==false);
  const statusLabel={active:'ACTIVE NOW',upcoming:'COMING NEXT',closed:'CLOSED'};
  app.innerHTML=nav('projects')+`<main><section class="page-hero project-hub-hero"><div class="container"><span class="eyebrow">AUAUSAVE HOUSE · FAN PROJECTS</span><h1>OUR PROJECTS</h1><p>พื้นที่รวมทุกโปรเจกต์จากแฟนคลับ ทั้งรอบปัจจุบัน โปรเจกต์ถัดไป และความทรงจำที่ผ่านมา</p></div></section><section class="section project-hub-section"><div class="container"><div class="project-filter-row"><b>All projects</b><span>${projects.length} Projects</span></div><div class="project-hub-grid">${projects.map(project=>`<a class="project-hub-card ${project.status==='active'?'is-active':'is-next'}" href="#project/${escapePageText(project.slug)}" ${project.banner?`style="background-image:linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.55)),url('${escapePageText(project.banner)}');background-size:cover;background-position:center"`:''}><div><span>${statusLabel[project.status]||'PROJECT'}</span><small>${escapePageText(project.round||'FAN PROJECT')}</small></div><h2>${escapePageText(project.title)}</h2><p>${escapePageText(project.description||'')}</p><footer><b>${project.status==='upcoming'?'เร็ว ๆ นี้':`฿${new Intl.NumberFormat('th-TH').format(2705)}`}</b><span>${project.status==='active'?'View Details ➚':'Stay tuned'}</span></footer></a>`).join('')||'<div class="empty">ยังไม่มีโปรเจกต์ที่เปิดแสดง</div>'}</div></div></section></main>`+footer();
  document.querySelectorAll('.project-hub-card').forEach((card,index)=>{const project=projects[index];if(!project)return;card.className='project-hub-card project-simple-card';card.removeAttribute('style');card.innerHTML=`<div class="project-simple-image">${project.cardImage?`<img src="${escapePageText(project.cardImage)}" alt="${escapePageText(project.title)}">`:`<span>${escapePageText(project.title.slice(0,2).toUpperCase())}</span>`}</div><div class="project-simple-copy"><h2>${escapePageText(project.title)}</h2><strong>${project.status==='upcoming'?'เร็ว ๆ นี้':`฿${new Intl.NumberFormat('th-TH').format(2705)}`}</strong></div>`;});
  document.querySelectorAll('.project-simple-card').forEach((card,index)=>{
    const project=projects[index],amount=card.querySelector('.project-simple-copy strong');if(!project||!amount)return;
    const goal=new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(Number(project.goal)||0);
    amount.innerHTML=`<small>ยอดเรียลไทม์ / เป้า</small><span data-project-card-total="${escapePageText(project.id)}">${project.sheetUrl?'กำลังอัปเดต…':'฿0'}</span><em>/ ฿${goal}</em>`;
  });
  projects.filter(project=>project.sheetUrl).forEach(refreshProjectCardTotal);
}
async function refreshProjectCardTotal(project){
  const target=document.querySelector(`[data-project-card-total="${CSS.escape(project.id)}"]`);if(!target)return;
  try{
    const total=projectDonationsFromTable(await loadGoogleSheetTable(project.sheetUrl)).reduce((sum,item)=>sum+item.amount,0);
    target.textContent=`฿${new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(total)}`;
  }catch(error){target.textContent='ยังอัปเดตยอดไม่ได้';target.title=error.message||'ตรวจสอบสิทธิ์ Google Sheet'}
}
function projectDetailPage(slug){
  ensureProjectSettings();const project=db.siteSettings.projects.items.find(item=>item.slug===slug&&item.visible!==false);if(!project){projectHubPage();return}
  const banner=project.banner?`<div class="project-banner-placeholder has-image"><img src="${escapePageText(project.banner)}" alt="${escapePageText(project.title)}"></div>`:`<div class="project-banner-placeholder"><span>PROJECT BANNER · 1600 × 400</span><strong>พื้นที่สำหรับรูปแบนเนอร์โปรเจกต์</strong><small>เพิ่มรูปได้จากหลังบ้าน</small></div>`;
  const qr=project.qrCode?`<div class="project-qr-placeholder has-image"><img src="${escapePageText(project.qrCode)}" alt="QR Code"></div>`:`<div class="project-qr-placeholder"><span>QR</span></div>`;
  const formAction=project.formUrl?`window.open('${escapePageText(project.formUrl)}','_blank','noopener')`:`toast('กรุณาใส่ลิงก์ Google Form ในหลังบ้าน')`;
  app.innerHTML=nav('projects')+`<main><section class="project-detail-hero"><div class="container"><a href="#projects">← Our Projects</a><span class="eyebrow">${project.status==='active'?'ACTIVE PROJECT':'FAN PROJECT'} · ${escapePageText(project.round||'')}</span><h1>${escapePageText(project.title)}</h1><div><div class="project-detail-description">${sanitizeProjectRichText(project.descriptionHtml||`<p>${escapePageText(project.description||'')}</p>`)}</div><span><b>${project.startDate?escapePageText(project.startDate):'OPEN'}</b><small>อัปเดตยอดแบบเรียลไทม์</small></span></div></div></section><section class="section project-media-section"><div class="container">${banner}<div class="project-payment-grid"><div class="project-qr-card">${qr}<p><small>SCAN TO SUPPORT</small><strong>สแกน QR Code<br>เพื่อร่วมสนับสนุน</strong></p></div><div class="project-account-card"><span>PAYMENT DETAILS</span><h2>รายละเอียดบัญชี</h2><dl><div><dt>ธนาคาร</dt><dd>${escapePageText(project.bankName||'—')}</dd></div><div><dt>เลขที่บัญชี</dt><dd>${escapePageText(project.accountNumber||'—')}</dd></div><div><dt>ชื่อบัญชี</dt><dd>${escapePageText(project.accountName||'—')}</dd></div></dl><small>กรุณาตรวจสอบชื่อบัญชีก่อนทำรายการทุกครั้ง<br>Please verify the account holder’s name before making any transaction.</small></div></div><div class="project-form-callout"><div><span>สำคัญ · หลังโอนเงิน</span><h2>กรอกฟอร์มแจ้งยอด<br>เพื่อให้ยอดขึ้นบนเว็บไซต์</h2><p>ระบบจะแสดงยอดจากคำตอบในฟอร์มเท่านั้น อย่าลืมแนบหลักฐานการโอนให้ครบถ้วน</p></div><button type="button" class="project-form-cta" onclick="${formAction}"><small>STEP 02</small><strong>กรอกฟอร์มแจ้งยอด</strong><b>เปิด Google Form ➚</b></button></div></div></section>${renderDonationDashboard(project)}</main>`+footer();
  document.querySelector('.project-detail-hero')?.remove();
  const paymentLabels=[['ธนาคาร','Bank'],['เลขที่บัญชี','Account Number'],['ชื่อบัญชี','Account Name']];
  document.querySelectorAll('.project-account-card dt').forEach((label,index)=>{
    const copy=paymentLabels[index];if(copy)label.innerHTML=`<span>${copy[0]}</span><small>${copy[1]}</small>`;
  });
  const formCallout=document.querySelector('.project-form-callout');
  if(formCallout){
    const calloutLabel=formCallout.querySelector(':scope > div > span');
    const thaiHeading=formCallout.querySelector(':scope > div > h2');
    const formButton=formCallout.querySelector('.project-form-cta');
    const thaiButtonTitle=formButton?.querySelector('strong');
    const formLink=formButton?.querySelector('b');
    if(calloutLabel)calloutLabel.textContent='สำคัญ · IMPORTANT';
    thaiHeading?.insertAdjacentHTML('afterend','<h3 class="project-form-en-heading">SUBMIT THE DONATION FORM<br>TO DISPLAY YOUR CONTRIBUTION ON THE WEBSITE</h3>');
    thaiButtonTitle?.insertAdjacentHTML('afterend','<span class="project-form-en-label">DONATION NOTIFICATION FORM</span>');
    if(formLink)formLink.textContent='เปิด Google Form · OPEN FORM ➚';
  }
  applyDonationLedgerEnglish();
  const projectEyebrow=document.querySelector('.project-detail-hero .eyebrow');if(projectEyebrow)projectEyebrow.textContent=project.status==='active'?'ACTIVE PROJECT':'FAN PROJECT';
  document.querySelector('.project-detail-hero .container>div>span')?.remove();
  if(project.sheetUrl)setTimeout(()=>refreshProjectDonations(project.id),0);
}

function googleSheetCsvUrl(value){
  const url=String(value||'').trim(),match=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);if(!match)return'';
  const gid=(url.match(/[?#&]gid=(\d+)/)||[])[1]||'0';
  return `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&gid=${gid}`;
}
function googleSheetSource(value){
  const url=String(value||'').trim(),match=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);if(!match)return null;
  return{id:match[1],gid:(url.match(/[?#&]gid=(\d+)/)||[])[1]||'0'};
}
function loadGoogleSheetTable(value){
  const source=googleSheetSource(value);if(!source)return Promise.reject(new Error('ลิงก์ Google Sheet ไม่ถูกต้อง'));
  return new Promise((resolve,reject)=>{
    const callback=`auausaveSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`,script=document.createElement('script');
    let timer;
    const cleanup=()=>{delete window[callback];script.remove();clearTimeout(timer)};
    timer=setTimeout(()=>{cleanup();reject(new Error('Google Sheet ตอบกลับช้าเกินไป'))},15000);
    window[callback]=response=>{
      if(response?.status==='error'){const message=response.errors?.[0]?.detailed_message||response.errors?.[0]?.message||'Google Sheet ไม่อนุญาตให้อ่านข้อมูล';cleanup();reject(new Error(message));return}
      const table=response?.table;if(!table){cleanup();reject(new Error('ไม่พบข้อมูลใน Google Sheet'));return}
      cleanup();resolve(table);
    };
    script.onerror=()=>{cleanup();reject(new Error('โหลด Google Sheet ไม่สำเร็จ'))};
    script.src=`https://docs.google.com/spreadsheets/d/${source.id}/gviz/tq?gid=${source.gid}&tqx=responseHandler:${callback}`;
    document.head.appendChild(script);
  });
}
function projectDonationsFromTable(table){
  const headers=(table.cols||[]).map(column=>String(column.label||column.id||'').trim().toLowerCase());
  const timestampIndex=headers.findIndex(value=>value.includes('timestamp')||value.includes('ประทับเวลา'));
  const amountIndex=headers.findIndex(value=>value.includes('donation amount')||value.includes('จำนวนเงิน')||value.includes('ยอดเงิน'));
  if(timestampIndex<0||amountIndex<0)throw new Error('ไม่พบคอลัมน์ Timestamp หรือ Donation Amount');
  const parseDate=(value,formatted)=>{
    if(value instanceof Date)return value;
    const google=String(value||'').match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
    if(google)return new Date(Number(google[1]),Number(google[2]),Number(google[3]),Number(google[4])||0,Number(google[5])||0,Number(google[6])||0);
    const local=String(formatted||value||'').match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(local)return new Date(Number(local[3]),Number(local[2])-1,Number(local[1]),Number(local[4])||0,Number(local[5])||0,Number(local[6])||0);
    return new Date(value||formatted||'');
  };
  return(table.rows||[]).map(row=>{
    const cells=row.c||[],rawDate=cells[timestampIndex]?.v,rawAmount=cells[amountIndex]?.v;
    const date=parseDate(rawDate,cells[timestampIndex]?.f);
    const amount=typeof rawAmount==='number'?rawAmount:Number(String(rawAmount??cells[amountIndex]?.f??'').replace(/[^0-9.-]/g,''));
    return{amount,date};
  }).filter(item=>Number.isFinite(item.amount)&&item.amount>0&&!Number.isNaN(item.date.getTime()));
}
function parseProjectCsv(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let index=0;index<text.length;index++){const char=text[index],next=text[index+1];if(char==='"'&&quoted&&next==='"'){cell+='"';index++;continue}if(char==='"'){quoted=!quoted;continue}if(char===','&&!quoted){row.push(cell);cell='';continue}if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&next==='\n')index++;row.push(cell);if(row.some(value=>value!==''))rows.push(row);row=[];cell='';continue}cell+=char}
  if(cell||row.length){row.push(cell);rows.push(row)}return rows;
}
async function refreshProjectDonations(projectId){
  ensureProjectSettings();const project=db.siteSettings.projects.items.find(item=>item.id===projectId),status=document.querySelector('[data-donation-status]');if(!project)return;
  try{
    const donations=projectDonationsFromTable(await loadGoogleSheetTable(project.sheetUrl));
    const total=donations.reduce((sum,item)=>sum+item.amount,0),goal=Number(project.goal)||1,progress=Math.min(total/goal*100,100),remaining=Math.max(goal-total,0),money=value=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(value);
    document.querySelector('[data-donation-total]').textContent=`฿${money(total)}`;document.querySelector('[data-donation-percent]').textContent=`${progress.toFixed(2)}%`;document.querySelector('[data-donation-remaining]').textContent=`฿${money(remaining)}`;document.querySelector('[data-donation-progress]').style.width=`${progress}%`;
    document.querySelector('[data-donation-list]').innerHTML=donations.slice(-20).reverse().map(item=>`<div><span>${new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(item.date)}</span><time>${new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(item.date)}</time><strong>฿${money(item.amount)}</strong></div>`).join('')||'<div class="empty">ยังไม่มีรายการ</div>';
    if(status)status.textContent=`อัปเดตจาก Google Sheet · ${new Intl.DateTimeFormat('th-TH',{hour:'2-digit',minute:'2-digit'}).format(new Date())} น.`;
  }catch(error){if(status)status.textContent=`เชื่อม Google Sheet ไม่สำเร็จ: ${error.message}`}
}

const profileBeforeArtistPageBuilder=profile;
profile=function(id){
  id=canonicalArtistId(id);ensureArtistPageBuilders();profileBeforeArtistPageBuilder(id);
  const main=document.querySelector('main'),artist=artistById(id),sections=artistBuilderSections(id);if(!main||!artist)return;
  let hero=main.querySelector('.profile-head')?.closest('.section')||main.querySelector('.couple-profile');
  let personal=main.querySelector('.personal-profile-section');
  if(!personal&&!sameArtistId(id,'duo')){hero?.insertAdjacentHTML('afterend',renderPersonalProfile(artist));personal=main.querySelector('.personal-profile-section')}
  const headings=[...main.querySelectorAll('h2')];
  const events=(headings.find(node=>node.textContent.toLowerCase().includes('schedule')))?.closest('.section');
  const timeline=main.querySelector('.artist-filmography')||main.querySelector('.couple-timeline')?.closest('.section');
  const awards=main.querySelector('.archive-awards')||main.querySelector('.award-grid')?.closest('.section');
  const nodes={hero,personal,events,timeline,awards};
  main.querySelectorAll('.artist-custom-section').forEach(node=>node.remove());
  sections.filter(section=>section.custom).forEach(section=>main.insertAdjacentHTML('beforeend',renderArtistCustomSection(section)));
  main.querySelectorAll('.artist-custom-section').forEach((node,index)=>{const section=sections.filter(item=>item.custom)[index];if(section)nodes[section.id]=node});
  Object.entries(nodes).forEach(([sectionId,node])=>{const setting=sections.find(item=>item.id===sectionId);if(node)node.style.display=setting?.visible===false?'none':''});
  const ordered=sections.map(section=>nodes[section.id]).filter(Boolean),anchor=ordered[0];if(!anchor)return;
  const marker=document.createComment('artist-builder-order');anchor.parentNode.insertBefore(marker,anchor);
  sections.forEach(section=>{const node=nodes[section.id];if(node&&section.visible!==false)marker.parentNode.insertBefore(node,marker)});marker.remove();
  layoutArtistCustomRows(main,sections,nodes);
};

function ensureProjectSettings(){
  db.siteSettings ||= {};
  db.siteSettings.projects ||= {};
  if(!Array.isArray(db.siteSettings.projects.sections))db.siteSettings.projects.sections=[];
  const legacy=db.siteSettings.projects.mrFanboy||{};
  if(!Array.isArray(db.siteSettings.projects.items))db.siteSettings.projects.items=[{
    id:'project_mr_fanboy',slug:'mr-fanboy',title:'Mr.Fanboy Project',
    status:'active',description:'ทุกแรงสนับสนุนกำลังพาโปรเจกต์ของเราไปถึงเป้าหมาย',
    goal:95755,startDate:'2026-07-25',endDate:'',visible:legacy.visible!==false,
    cardImage:'',banner:'',qrCode:'',bankName:'ชื่อธนาคาร',accountNumber:'xxx-x-xxxxx-x',
    accountName:'ชื่อบัญชีสำหรับรับโดเนท',formUrl:'',sheetUrl:''
  }];
  delete db.siteSettings.projects.mrFanboy;
}
function toggleProjectVisibility(projectId,visible){
  ensureProjectSettings();
  const project=db.siteSettings.projects.items.find(item=>item.id===projectId||item.slug===projectId);
  if(project)project.visible=visible;
  save();projectsAdmin();toast(`${visible?'แสดง':'ซ่อน'}โปรเจกต์แล้ว`);
}
function projectsAdmin(){
  ensureProjectSettings();const projects=db.siteSettings.projects.items;
  const items=[['dashboard','⌂','Dashboard'],['pagecontent','▤','Homepage Content'],['artists','◉','Profiles'],['events','▦','Schedule'],['timeline','◷','Timeline'],['presenters','✦','Presenters'],['awards','◇','Awards'],['projects','◆','Projects'],['master','⚙','Master Data']];
  app.innerHTML=`<div class="admin"><div class="admin-shell"><aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav">${items.map(([id,icon,label])=>`<button data-icon="${icon}" class="${id==='projects'?'active':''}" onclick="adminTab='${id}';admin()">${icon} &nbsp; ${label}</button>`).join('')}</div><a class="back" href="#projects">← ดูหน้าโปรเจกต์</a></aside><main class="admin-main"><div class="admin-top"><div><small style="color:var(--muted)">PROJECT MANAGEMENT</small><h1>โปรเจกต์ทั้งหมด</h1></div><button class="btn" onclick="openProjectForm()">+ เพิ่มโปรเจกต์</button></div><section class="project-admin-list">${projects.map(project=>`<article class="panel project-admin-item ${project.visible===false?'is-hidden':''}"><div class="project-admin-thumb">${project.cardImage?`<img src="${escapePageText(project.cardImage)}" alt="">`:`<span>${escapePageText(project.title.slice(0,2).toUpperCase())}</span>`}</div><div class="project-admin-copy"><small>${escapePageText(project.round||'PROJECT')}</small><h2>${escapePageText(project.title)}</h2><p>${escapePageText(project.description||'ไม่มีคำอธิบาย')}</p><div><span class="artist-publish-state ${project.visible!==false?'is-live':''}">${project.visible!==false?'กำลังแสดง':'ซ่อนอยู่'}</span><span>${escapePageText(project.status||'active')}</span><span>เป้าหมาย ฿${new Intl.NumberFormat('th-TH').format(Number(project.goal)||0)}</span></div></div><div class="project-admin-actions"><label class="timeline-visibility-switch"><input type="checkbox" ${project.visible!==false?'checked':''} onchange="toggleProjectVisibility('${project.id}',this.checked)"><span>${project.visible!==false?'● แสดง':'○ ซ่อน'}</span></label><button class="btn outline" onclick="openProjectForm('${project.id}')">แก้ไข</button><a class="btn outline" href="#project/${escapePageText(project.slug)}">ดูหน้าเว็บ</a><button class="icon-btn project-delete-btn" onclick="removeProject('${project.id}')">⌫ ลบ</button></div></article>`).join('')||'<div class="empty">ยังไม่มีโปรเจกต์</div>'}</section></main></div></div>`;
  document.querySelectorAll('.project-admin-copy>small').forEach(node=>node.textContent='PROJECT');
  document.querySelectorAll('.project-admin-copy>p').forEach(node=>node.remove());
}
function sanitizeProjectRichText(html){
  const template=document.createElement('template');template.innerHTML=String(html||'');
  const allowed=new Set(['DIV','P','BR','STRONG','B','EM','I','U','UL','OL','LI','A','FONT']);
  [...template.content.querySelectorAll('*')].forEach(node=>{
    if(!allowed.has(node.tagName)){node.replaceWith(...node.childNodes);return}
    const originalHref=node.tagName==='A'?(node.getAttribute('href')||''):'',originalColor=node.tagName==='FONT'?(node.getAttribute('color')||''):'';
    [...node.attributes].forEach(attribute=>node.removeAttribute(attribute.name));
    if(node.tagName==='A'){
      const href=originalHref;
      if(!/^https?:\/\//i.test(href))node.removeAttribute('href');
      else{node.setAttribute('href',href);node.setAttribute('target','_blank');node.setAttribute('rel','noopener noreferrer')}
    }
    if(node.tagName==='FONT'&&/^#[0-9a-f]{6}$/i.test(originalColor))node.setAttribute('color',originalColor);
  });
  return template.innerHTML;
}
function projectEditorCommand(command){
  const editor=document.querySelector('[data-project-editor]');if(!editor)return;
  editor.focus();
  if(command==='createLink'){const url=prompt('วางลิงก์ที่ต้องการ');if(url&&/^https?:\/\//i.test(url))document.execCommand(command,false,url)}
  else document.execCommand(command,false,null);
}
function projectEditorColor(value){
  const editor=document.querySelector('[data-project-editor]');if(!editor)return;
  editor.focus();document.execCommand('foreColor',false,value);
}
function openProjectForm(id=''){
  ensureProjectSettings();const item=db.siteSettings.projects.items.find(project=>project.id===id)||{};
  const editorHtml=sanitizeProjectRichText(item.descriptionHtml||`<p>${escapePageText(item.description||'')}</p>`);
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal project-admin-modal"><div class="modal-head"><div><small>PROJECT DETAILS</small><h2>${id?'แก้ไข':'เพิ่ม'}โปรเจกต์</h2></div><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveProjectForm(event,'${id}')"><div class="form-grid"><div class="field"><label>ชื่อโปรเจกต์</label><input name="title" value="${escapePageText(item.title||'')}" required></div><div class="field"><label>Slug สำหรับลิงก์</label><input name="slug" value="${escapePageText(item.slug||'')}" placeholder="my-project"></div><div class="field"><label>รอบโดเนท</label><input name="round" value="${escapePageText(item.round||'')}" placeholder="DONATION ROUND 01"></div><div class="field"><label>สถานะ</label><select name="status"><option value="active" ${item.status==='active'?'selected':''}>กำลังเปิดรับ</option><option value="upcoming" ${item.status==='upcoming'?'selected':''}>เร็ว ๆ นี้</option><option value="closed" ${item.status==='closed'?'selected':''}>ปิดโปรเจกต์</option></select></div><div class="field full project-rich-field"><label>คำอธิบาย</label><div class="project-editor-toolbar"><button type="button" onclick="projectEditorCommand('bold')"><b>B</b></button><button type="button" onclick="projectEditorCommand('italic')"><i>I</i></button><button type="button" onclick="projectEditorCommand('insertUnorderedList')">• List</button><button type="button" onclick="projectEditorCommand('insertOrderedList')">1. List</button><button type="button" onclick="projectEditorCommand('createLink')">🔗 Link</button></div><div class="project-rich-editor" contenteditable="true" data-project-editor>${editorHtml}</div></div><div class="field"><label>เป้าหมาย (บาท)</label><input name="goal" type="number" min="0" value="${Number(item.goal)||0}"></div><div class="field"><label>วันเปิดรับ</label><input name="startDate" type="date" value="${escapePageText(item.startDate||'')}"></div>${imageUploadTemplate('banner','รูปแบนเนอร์โปรเจกต์',item.banner||'')}${imageUploadTemplate('qrCode','รูป QR Code',item.qrCode||'')}<div class="field"><label>ธนาคาร</label><input name="bankName" value="${escapePageText(item.bankName||'')}"></div><div class="field"><label>เลขบัญชี</label><input name="accountNumber" value="${escapePageText(item.accountNumber||'')}"></div><div class="field full"><label>ชื่อบัญชี</label><input name="accountName" value="${escapePageText(item.accountName||'')}"></div><div class="field full"><label>ลิงก์ Google Form</label><input name="formUrl" type="url" value="${escapePageText(item.formUrl||'')}" placeholder="https://forms.gle/..."></div><div class="field full"><label>ลิงก์ Google Sheet</label><input name="sheetUrl" type="url" value="${escapePageText(item.sheetUrl||'')}" placeholder="วางลิงก์ Google Sheet ปกติได้เลย"><small>ตั้งสิทธิ์ชีตเป็น “ทุกคนที่มีลิงก์ดูได้” ระบบจะอ่าน Timestamp และ Donation Amount โดยไม่แสดงชื่อผู้โอน</small></div><div class="field full"><label class="hero-overlay-toggle"><input type="checkbox" name="visible" ${item.visible===false?'':'checked'}><span>แสดงโปรเจกต์บนหน้าเว็บ</span></label></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกโปรเจกต์</button></div></form></div></div>`);
  document.querySelector('#modal [name="round"]')?.closest('.field')?.remove();
  document.querySelector('#modal [data-project-editor]')?.closest('.project-rich-field')?.remove();
  document.querySelector('#uploadPreview_banner')?.closest('.field')?.insertAdjacentHTML('beforebegin',imageUploadTemplate('cardImage','รูปการ์ดโปรเจกต์ 1:1',item.cardImage||''));
  const toolbar=document.querySelector('#modal .project-editor-toolbar');if(toolbar){toolbar.children[1]?.insertAdjacentHTML('afterend',`<button type="button" onclick="projectEditorCommand('underline')"><u>U</u></button><label class="project-editor-color" title="สีตัวอักษร"><input type="color" value="#d86666" onchange="projectEditorColor(this.value)"><span>สี</span></label>`);}
}
function saveProjectForm(event,id=''){
  event.preventDefault();ensureProjectSettings();const form=new FormData(event.currentTarget),title=(form.get('title')||'').trim(),slug=(form.get('slug')||title).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||`project-${Date.now()}`;
  if(db.siteSettings.projects.items.some(project=>project.slug===slug&&project.id!==id)){toast('Slug นี้ถูกใช้แล้ว');return}
  const existingProject=db.siteSettings.projects.items.find(item=>item.id===id);
  const values={title,slug,round:(form.get('round')||'').trim(),status:form.get('status')||'active',description:existingProject?.description||'',descriptionHtml:existingProject?.descriptionHtml||'',goal:Number(form.get('goal'))||0,startDate:form.get('startDate')||'',cardImage:(form.get('cardImage')||'').trim(),banner:(form.get('banner')||'').trim(),qrCode:(form.get('qrCode')||'').trim(),bankName:(form.get('bankName')||'').trim(),accountNumber:(form.get('accountNumber')||'').trim(),accountName:(form.get('accountName')||'').trim(),formUrl:(form.get('formUrl')||'').trim(),sheetUrl:(form.get('sheetUrl')||'').trim(),visible:form.get('visible')==='on'};
  const project=db.siteSettings.projects.items.find(item=>item.id===id);if(project)Object.assign(project,values);else db.siteSettings.projects.items.unshift({id:`project_${Date.now()}`,...values});
  save();closeModal();projectsAdmin();toast('บันทึกโปรเจกต์แล้ว');
}
function removeProject(id){
  ensureProjectSettings();const project=db.siteSettings.projects.items.find(item=>item.id===id);if(!project||!confirm(`ลบโปรเจกต์ "${project.title}" ใช่หรือไม่?`))return;
  db.siteSettings.projects.items=db.siteSettings.projects.items.filter(item=>item.id!==id);save();projectsAdmin();toast('ลบโปรเจกต์แล้ว');
}
const adminBeforeProjects=admin;
admin=function(){if(adminAuthenticated&&adminTab==='projects')projectsAdmin();else adminBeforeProjects();};

const adminBeforeArtistDirectory=admin;
admin=function(){
  if(adminAuthenticated&&adminTab==='artists'){
    if(artistManagerArtistId)artistDetailAdmin();else artistDirectoryAdmin();
    return;
  }
  adminBeforeArtistDirectory();
};
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

/* Food Support Queue projects */
const donationProjectDetailPage=projectDetailPage;
const donationOpenProjectForm=openProjectForm;
function foodSupportFormButton(url,label,missing){
  return url?`<a class="food-support-cta" href="${escapePageText(url)}" target="_blank" rel="noopener noreferrer">${escapePageText(label)} <span>↗</span></a>`:`<button class="food-support-cta" type="button" onclick="toast('${escapePageText(missing)}')">${escapePageText(label)} <span>↗</span></button>`;
}
function foodSupportQueuePage(project){
  const queueOnly=project.projectType==='personalSupportQueue',openingBalance=Math.max(0,Number(project.openingBalance)||0),maxQueue=Math.max(0,Number(project.maximumQueue)||0),money=value=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(value);
  const banner=project.banner?`<div class="project-banner-placeholder has-image"><img src="${escapePageText(project.banner)}" alt="${escapePageText(project.title)}"></div>`:`<div class="project-banner-placeholder"><span>PROJECT BANNER · 1600 × 400</span><strong>${escapePageText(project.title)}</strong></div>`;
  const qr=project.qrCode?`<div class="project-qr-placeholder has-image"><img src="${escapePageText(project.qrCode)}" alt="QR Code สำหรับร่วมสนับสนุน"></div>`:`<div class="project-qr-placeholder"><span>QR</span></div>`;
  const payment=queueOnly?'':`<div class="project-payment-grid"><div class="project-qr-card">${qr}<p><small>SCAN TO SUPPORT</small><strong>สแกน QR Code<br>เพื่อร่วมสนับสนุน</strong></p></div><div class="project-account-card"><span>PAYMENT DETAILS</span><h2>รายละเอียดบัญชี</h2><dl><div><dt><span>ธนาคาร</span><small>BANK</small></dt><dd>${escapePageText(project.bankName||'—')}</dd></div><div><dt><span>เลขที่บัญชี</span><small>ACCOUNT NUMBER</small></dt><dd>${escapePageText(project.accountNumber||'—')}</dd></div><div><dt><span>ชื่อบัญชี</span><small>ACCOUNT NAME</small></dt><dd>${escapePageText(project.accountName||'—')}</dd></div></dl><small>กรุณาตรวจสอบชื่อบัญชีก่อนทำรายการทุกครั้ง<br>Please verify the account holder’s name before making any transaction.</small></div></div>`;
  const donationSummary=queueOnly?'':`<article class="food-summary-card donation-summary"><div><small>DONATION WITH THE HOUSE</small><h2>ร่วมโดเนทกับบ้าน</h2></div><div class="food-summary-numbers"><strong data-food-total>฿${money(openingBalance)}</strong><span><b data-food-donation-count>0</b> รายการ</span></div><div class="food-opening-balance"><span>ยอดยกมา / OPENING BALANCE</span><b>฿${money(openingBalance)}</b></div>${foodSupportFormButton(project.donationFormUrl||project.formUrl,'ร่วมโดเนท','ยังไม่ได้ตั้งค่า Donation Pre-filled Form URL')}</article>`;
  const donationLive=queueOnly?'':`<section class="food-live-card donation-live-panel"><header><div><small>LIVE DONATION UPDATE</small><h2>LATEST DONATIONS</h2></div><span class="food-auto-update" data-food-donation-status><i></i>AUTO UPDATE</span></header><div class="food-donation-head"><span>DATE</span><span>TIME</span><span>DONATION AMOUNT</span></div><div class="food-donation-list" data-food-donation-list><div class="food-empty">กำลังโหลดรายการโดเนท...</div></div></section>`;
  app.innerHTML=nav('projects')+`<main class="food-support-page">
    <section class="project-detail-hero"><div class="container"><a href="#projects">← Our Projects</a><span class="eyebrow">${project.status==='active'?'ACTIVE PROJECT':'FAN PROJECT'} · ${queueOnly?'PERSONAL SUPPORT QUEUE':'DONATION + PERSONAL SUPPORT QUEUE'}</span><h1>${escapePageText(project.title)}</h1><div><div class="project-detail-description">${sanitizeProjectRichText(project.descriptionHtml||`<p>${escapePageText(project.description||'')}</p>`)}</div></div></div></section>
    <section class="section food-project-media-section"><div class="container">${banner}${payment}</div></section>
    <section class="section food-support-content ${queueOnly?'queue-only-support':''}"><div class="container">
      <div class="food-summary-grid">${donationSummary}<article class="food-summary-card queue-summary"><div><small>PERSONAL SUPPORT</small><h2>ลงคิวจัดส่งเอง</h2></div><div class="food-queue-numbers"><p><strong data-food-queue-count>0</strong><span>คิวที่ลงทะเบียน</span></p><p><strong data-food-queue-left>${maxQueue}</strong><span>คิวคงเหลือ</span></p></div>${foodSupportFormButton(project.personalSupportFormUrl||project.googleFormMainUrl,'ลงทะเบียนคิว','ยังไม่ได้ตั้งค่า Personal Support Form URL')}</article></div>
      <div class="food-live-grid">
        <section class="food-live-card queue-live"><header><div><small>PERSONAL SUPPORT QUEUE</small><h2>รายชื่อผู้จัดส่งด้วยตัวเอง</h2></div><span class="food-live-time" data-food-queue-time>กำลังโหลด...</span></header><div class="food-table-head"><span>QUEUE</span><span>X ACCOUNT</span><span>STATUS</span></div><div class="food-queue-list" data-food-queue-list><div class="food-empty">กำลังโหลดข้อมูลคิว...</div></div><button class="food-view-all" type="button" data-food-view-all hidden onclick="toggleFoodQueueAll(this)">ดูทั้งหมด</button></section>
        ${donationLive}
      </div>
    </div></section>
  </main>`+footer();
  if(!project.personalQueueEnabled){document.querySelector('.queue-live').hidden=true;document.querySelector('.queue-summary').classList.add('is-disabled')}
  if(!queueOnly&&!project.donationLiveEnabled){document.querySelector('.donation-live-panel').hidden=true;document.querySelector('.donation-summary').classList.add('is-disabled')}
  if(project.sheetUrl)setTimeout(()=>refreshFoodSupportProject(project.id),0);else setFoodSupportError('ยังไม่ได้เชื่อม Google Sheet');
}
projectDetailPage=function(slug){
  ensureProjectSettings();const project=db.siteSettings.projects.items.find(item=>item.slug===slug&&item.visible!==false);
  if(['foodSupportQueue','personalSupportQueue'].includes(project?.projectType))foodSupportQueuePage(project);else donationProjectDetailPage(slug);
};
function projectHubSimpleCard(project,type='donation'){
  const money=value=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(Number(value)||0);
  const amount=type==='combined'?`<small>ยอดรวมปัจจุบัน</small><span data-food-project-card-total="${escapePageText(project.id)}">฿${money(project.openingBalance)}</span>`:type==='personal'?`<small>คิวที่ลงทะเบียน / สูงสุด</small><span data-personal-project-card-count="${escapePageText(project.id)}">${project.sheetUrl?'กำลังอัปเดต…':'0'}</span><em>/ ${Number(project.maximumQueue)||0} คิว</em>`:`<small>ยอดเรียลไทม์ / เป้า</small><span data-project-card-total="${escapePageText(project.id)}">${project.sheetUrl?'กำลังอัปเดต…':'฿0'}</span><em>/ ฿${money(project.goal)}</em>`;
  return `<a class="project-hub-card project-simple-card ${type!=='donation'?'food-project-card':''}" href="#project/${escapePageText(project.slug)}"><div class="project-simple-image">${project.cardImage?`<img src="${escapePageText(project.cardImage)}" alt="${escapePageText(project.title)}">`:`<span>${escapePageText(project.title.slice(0,2).toUpperCase())}</span>`}</div><div class="project-simple-copy"><h2>${escapePageText(project.title)}</h2><strong>${amount}</strong></div></a>`;
}
projectHubPage=function(){
  ensureProjectSettings();const settings=db.siteSettings.projects,sections=settings.sections,visible=settings.items.filter(project=>project.visible!==false&&sections.some(section=>section.id===project.sectionId));
  const typeOf=project=>project.projectType==='personalSupportQueue'?'personal':project.projectType==='foodSupportQueue'?'combined':'donation';
  const sectionHtml=section=>{const items=visible.filter(project=>project.sectionId===section.id);return`<section class="project-type-group"><div class="project-filter-row"><div><b>${escapePageText(section.title)}</b></div><span>${items.length} Projects</span></div><div class="project-hub-grid food-project-hub-grid">${items.map(project=>projectHubSimpleCard(project,typeOf(project))).join('')||'<div class="empty">ยังไม่มีโปรเจกต์ใน Section นี้</div>'}</div></section>`};
  app.innerHTML=nav('projects')+`<main><section class="page-hero project-hub-hero"><div class="container"><span class="eyebrow">AUAUSAVE HOUSE · FAN PROJECTS</span><h1>OUR PROJECTS</h1><p>พื้นที่รวมโปรเจกต์ Donation และ Food Support ทุกรูปแบบ</p></div></section><section class="section project-hub-section"><div class="container project-type-groups">${sections.map(sectionHtml).join('')||'<div class="empty">ยังไม่มี Section โปรเจกต์ที่เผยแพร่</div>'}</div></section></main>`+footer();
  visible.filter(project=>typeOf(project)==='donation'&&project.sheetUrl).forEach(refreshProjectCardTotal);visible.filter(project=>typeOf(project)==='personal').forEach(refreshPersonalProjectCardCount);visible.filter(project=>typeOf(project)==='combined').forEach(refreshFoodProjectCardTotal);
};
async function refreshPersonalProjectCardCount(project){
  const target=document.querySelector(`[data-personal-project-card-count="${CSS.escape(project.id)}"]`);if(!target)return;if(!project.sheetUrl){target.textContent='0';return}
  try{const {personal}=foodSupportRows(await loadFoodSupportTable(project),project);target.textContent=personal.length}catch(error){target.textContent='—';target.title=error.message}
}
async function refreshFoodProjectCardTotal(project){
  const target=document.querySelector(`[data-food-project-card-total="${CSS.escape(project.id)}"]`);if(!target)return;
  const money=value=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(value),opening=Math.max(0,Number(project.openingBalance)||0);
  if(!project.sheetUrl){target.textContent=`฿${money(opening)}`;return}
  try{const {donation}=foodSupportRows(await loadFoodSupportTable(project),project);target.textContent=`฿${money(opening+donation.reduce((sum,row)=>sum+row.amount,0))}`}
  catch(error){target.textContent=`฿${money(opening)}`;target.title=`ยังอัปเดตยอดจาก Sheet ไม่ได้: ${error.message}`}
}
function foodSheetCell(cell){return String(cell?.f??cell?.v??'').trim()}
function foodSheetDate(cell){
  const raw=cell?.v;if(raw instanceof Date)return raw;
  const google=String(raw||'').match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
  if(google)return new Date(+google[1],+google[2],+google[3],+google[4]||0,+google[5]||0,+google[6]||0);
  const value=foodSheetCell(cell),local=value.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  return local?new Date(+local[3],+local[2]-1,+local[1],+local[4]||0,+local[5]||0,+local[6]||0):new Date(value);
}
function foodSupportRows(table,project={}){
  const headers=(table.cols||[]).map(column=>String(column.label||column.id||'').trim().toLowerCase());
  const find=(...names)=>headers.findIndex(header=>names.some(name=>header.includes(name)));
  const timestamp=find('timestamp','ประทับเวลา'),type=find('type of support','ประเภทการสนับสนุน'),account=find('x account','บัญชี x','แอคเคาท์ x','twitter'),amount=find('donation amount','จำนวนเงิน','ยอดเงิน'),queue=find('queue','ลำดับคิว');
  if(timestamp<0)throw new Error('ไม่พบคอลัมน์ Timestamp');
  const rows=(table.rows||[]).map((row,index)=>{
    const cells=row.c||[],date=foodSheetDate(cells[timestamp]),supportType=type>=0?foodSheetCell(cells[type]):'Personal Support',xAccount=foodSheetCell(cells[account])||'—',rawAmount=cells[amount]?.v,donationAmount=typeof rawAmount==='number'?rawAmount:Number(foodSheetCell(cells[amount]).replace(/[^0-9.-]/g,''));
    const key=[Number.isNaN(date.getTime())?foodSheetCell(cells[timestamp]):date.toISOString(),xAccount,supportType].join('|');
    return{key,date,supportType,xAccount,amount:donationAmount,queue:foodSheetCell(cells[queue])};
  }).filter(row=>!Number.isNaN(row.date.getTime()));
  const donation=rows.filter(row=>/donation|savewrg official/i.test(row.supportType)&&Number.isFinite(row.amount)&&row.amount>0).sort((a,b)=>b.date-a.date);
  const personal=rows.filter(row=>/personal support|จัดส่งในนามส่วนตัว/i.test(row.supportType)).sort((a,b)=>a.date-b.date).map((row,index)=>({...row,queue:row.queue||String(index+1),status:project.queueStatuses?.[row.key]||'ลงทะเบียนแล้ว'}));
  return{donation,personal};
}
function loadFoodSupportTable(project){
  const source=googleSheetSource(project.sheetUrl);if(!source)return Promise.reject(new Error('ลิงก์ Google Sheet ไม่ถูกต้อง'));
  return new Promise((resolve,reject)=>{
    const callback=`auausaveFoodSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`,script=document.createElement('script');let timer;
    const cleanup=()=>{delete window[callback];script.remove();clearTimeout(timer)};
    timer=setTimeout(()=>{cleanup();reject(new Error('Google Sheet ตอบกลับช้าเกินไป'))},15000);
    window[callback]=response=>{if(response?.status==='error'){cleanup();reject(new Error(response.errors?.[0]?.message||'Google Sheet ไม่อนุญาตให้อ่านข้อมูล'));return}cleanup();response?.table?resolve(response.table):reject(new Error('ไม่พบข้อมูลใน Google Sheet'))};
    script.onerror=()=>{cleanup();reject(new Error('โหลด Google Sheet ไม่สำเร็จ'))};
    const sheet=project.sheetName?`&sheet=${encodeURIComponent(project.sheetName)}`:'';
    script.src=`https://docs.google.com/spreadsheets/d/${source.id}/gviz/tq?gid=${source.gid}${sheet}&tqx=responseHandler:${callback}`;document.head.appendChild(script);
  });
}
function foodStatusClass(value){return'value-'+({'ลงทะเบียนแล้ว':'registered','กำลังตรวจสอบ':'checking','ยืนยันคิวแล้ว':'confirmed','ดำเนินการเรียบร้อย':'done','ไม่สะดวกจัดส่ง (Not Available)':'unavailable','ยกเลิก':'cancelled'}[value]||'registered')}
function toggleFoodQueueAll(button){const list=document.querySelector('[data-food-queue-list]');list?.classList.toggle('show-all');button.textContent=list?.classList.contains('show-all')?'ย่อรายการ':'ดูทั้งหมด'}
function setFoodSupportError(message){
  document.querySelectorAll('.food-live-time').forEach(node=>node.textContent=message);
  document.querySelectorAll('.food-empty').forEach(node=>node.textContent='ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่ภายหลัง');
}
async function refreshFoodSupportProject(projectId){
  ensureProjectSettings();const project=db.siteSettings.projects.items.find(item=>item.id===projectId);if(!project)return;
  try{
    const {donation,personal}=foodSupportRows(await loadFoodSupportTable(project),project),openingBalance=Math.max(0,Number(project.openingBalance)||0),maxQueue=Math.max(0,Number(project.maximumQueue)||0),total=openingBalance+donation.reduce((sum,row)=>sum+row.amount,0),money=value=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(value),updated=`อัปเดตล่าสุด ${new Intl.DateTimeFormat('th-TH',{dateStyle:'short',timeStyle:'short'}).format(new Date())}`;
    const foodTotal=document.querySelector('[data-food-total]'),donationCount=document.querySelector('[data-food-donation-count]');if(foodTotal)foodTotal.textContent=`฿${money(total)}`;if(donationCount)donationCount.textContent=donation.length;
    document.querySelector('[data-food-queue-count]').textContent=personal.length;document.querySelector('[data-food-queue-left]').textContent=Math.max(maxQueue-personal.length,0);
    document.querySelector('[data-food-queue-time]').textContent=updated;const donationStatus=document.querySelector('[data-food-donation-status]');if(donationStatus)donationStatus.title=updated;
    const queueList=document.querySelector('[data-food-queue-list]');queueList.innerHTML=personal.map(row=>`<div class="food-queue-row"><b>#${escapePageText(row.queue)}</b><span>${escapePageText(row.xAccount)}</span><em class="${foodStatusClass(row.status)}">${escapePageText(row.status)}</em></div>`).join('')||'<div class="food-empty">ยังไม่มีผู้ลงทะเบียนคิว</div>';
    const viewAll=document.querySelector('[data-food-view-all]');if(viewAll)viewAll.hidden=personal.length<=8;
    const donationList=document.querySelector('[data-food-donation-list]');if(donationList)donationList.innerHTML=donation.slice(0,12).map(row=>`<div><span>${new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(row.date)}</span><time>${new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(row.date)}</time><strong>฿${money(row.amount)}</strong></div>`).join('')||'<div class="food-empty">ยังไม่มีรายการโดเนท</div>';
  }catch(error){setFoodSupportError(`โหลดไม่สำเร็จ: ${error.message}`)}
}
openProjectForm=function(id=''){
  donationOpenProjectForm(id);const item=db.siteSettings.projects.items.find(project=>project.id===id)||{},form=document.querySelector('#modal form'),grid=form?.querySelector('.form-grid');if(!grid)return;
  grid.insertAdjacentHTML('afterbegin',`<div class="field full"><label>Project Type</label><select name="projectType"><option value="donation" ${!item.projectType||item.projectType==='donation'?'selected':''}>Donation</option><option value="personalSupportQueue" ${item.projectType==='personalSupportQueue'?'selected':''}>Personal Support Queue</option><option value="foodSupportQueue" ${item.projectType==='foodSupportQueue'?'selected':''}>Donation + Personal Support Queue</option></select></div>
    <div class="field full"><label>Section ที่แสดงบนหน้า Projects</label><select name="sectionId"><option value="">— ไม่เลือก Section (ไม่แสดงบนหน้า Projects) —</option>${db.siteSettings.projects.sections.map(section=>`<option value="${escapePageText(section.id)}" ${item.sectionId===section.id?'selected':''}>${escapePageText(section.title)}</option>`).join('')}</select><small>Project Type กำหนดรูปแบบหน้าโปรเจกต์ ส่วน Section กำหนดตำแหน่งที่แสดงบนหน้า Projects</small></div>
    <div class="field full"><label>Google Form Main URL</label><input name="googleFormMainUrl" type="url" value="${escapePageText(item.googleFormMainUrl||item.formUrl||'')}"></div>
    <div class="field full"><label>Donation Pre-filled Form URL</label><input name="donationFormUrl" type="url" value="${escapePageText(item.donationFormUrl||'')}"></div>
    <div class="field full"><label>Personal Support Pre-filled Form URL</label><input name="personalSupportFormUrl" type="url" value="${escapePageText(item.personalSupportFormUrl||'')}"></div>
    <div class="field"><label>Sheet Name</label><input name="sheetName" value="${escapePageText(item.sheetName||'')}"></div><div class="field" data-food-project-field><label>ยอดยกมา / Opening Balance</label><input name="openingBalance" type="number" min="0" step="0.01" value="${Number(item.openingBalance)||0}"><small>ยอดคงเหลือจากโปรเจกต์รอบก่อน ระบบจะนำไปรวมกับยอด Donation จาก Google Sheet</small></div>
    <div class="field"><label>Maximum Queue</label><input name="maximumQueue" type="number" min="0" value="${Number(item.maximumQueue)||0}"></div>
    <div class="field"><label class="hero-overlay-toggle"><input type="checkbox" name="donationLiveEnabled" ${item.donationLiveEnabled===false?'':'checked'}><span>เปิด Donation Live Update</span></label></div>
    <div class="field"><label class="hero-overlay-toggle"><input type="checkbox" name="personalQueueEnabled" ${item.personalQueueEnabled===false?'':'checked'}><span>เปิด Personal Support Queue</span></label></div>`);
  const typeSelect=form.querySelector('[name="projectType"]'),tag=(name,types)=>{const field=form.querySelector(`[name="${name}"]`)?.closest('.field');if(field)field.dataset.projectTypes=types.join(' ')};
  ['goal','formUrl'].forEach(name=>tag(name,['donation']));['qrCode','bankName','accountNumber','accountName'].forEach(name=>tag(name,['donation','foodSupportQueue']));
  ['personalSupportFormUrl','sheetName','maximumQueue','personalQueueEnabled'].forEach(name=>tag(name,['personalSupportQueue','foodSupportQueue']));
  tag('googleFormMainUrl',['foodSupportQueue']);
  ['donationFormUrl','openingBalance','donationLiveEnabled'].forEach(name=>tag(name,['foodSupportQueue']));
  const syncTypeFields=()=>{const type=typeSelect.value;form.querySelectorAll('[data-project-types]').forEach(field=>field.hidden=!field.dataset.projectTypes.split(' ').includes(type));const sheetHelp=form.querySelector('[name="sheetUrl"]')?.closest('.field')?.querySelector('small');if(sheetHelp)sheetHelp.textContent=type==='personalSupportQueue'?'ชีตฟอร์มลงคิวใช้เพียงคอลัมน์ Timestamp และ X Account ได้':type==='foodSupportQueue'?'ใช้ Google Sheet ชุดเดียวกันและแยกรายการด้วย Type of support':'ระบบจะอ่าน Timestamp และ Donation Amount โดยไม่แสดงชื่อผู้โอน'};
  typeSelect.addEventListener('change',syncTypeFields);syncTypeFields();
};
saveProjectForm=function(event,id=''){
  event.preventDefault();ensureProjectSettings();const form=new FormData(event.currentTarget),title=String(form.get('title')||'').trim(),slug=String(form.get('slug')||title).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||`project-${Date.now()}`;
  if(db.siteSettings.projects.items.some(project=>project.slug===slug&&project.id!==id)){toast('Slug นี้ถูกใช้แล้ว');return}
  const existing=db.siteSettings.projects.items.find(item=>item.id===id),values={title,slug,status:form.get('status')||'active',projectType:form.get('projectType')||'donation',sectionId:String(form.get('sectionId')||''),description:existing?.description||'',descriptionHtml:existing?.descriptionHtml||'',goal:Number(form.get('goal'))||0,openingBalance:Number(form.get('openingBalance'))||0,maximumQueue:Number(form.get('maximumQueue'))||0,startDate:form.get('startDate')||'',cardImage:String(form.get('cardImage')||'').trim(),banner:String(form.get('banner')||'').trim(),qrCode:String(form.get('qrCode')||'').trim(),bankName:String(form.get('bankName')||'').trim(),accountNumber:String(form.get('accountNumber')||'').trim(),accountName:String(form.get('accountName')||'').trim(),formUrl:String(form.get('formUrl')||'').trim(),googleFormMainUrl:String(form.get('googleFormMainUrl')||'').trim(),donationFormUrl:String(form.get('donationFormUrl')||'').trim(),personalSupportFormUrl:String(form.get('personalSupportFormUrl')||'').trim(),sheetUrl:String(form.get('sheetUrl')||'').trim(),sheetName:String(form.get('sheetName')||'').trim(),donationLiveEnabled:form.get('donationLiveEnabled')==='on',personalQueueEnabled:form.get('personalQueueEnabled')==='on',visible:form.get('visible')==='on',queueStatuses:existing?.queueStatuses||{}};
  if(existing)Object.assign(existing,values);else db.siteSettings.projects.items.unshift({id:`project_${Date.now()}`,...values});
  save();closeModal();projectsAdmin();toast('บันทึกโปรเจกต์แล้ว');
};
function openFoodQueueAdmin(projectId){
  ensureProjectSettings();const project=db.siteSettings.projects.items.find(item=>item.id===projectId);if(!project)return;
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal project-admin-modal"><div class="modal-head"><div><small>PERSONAL SUPPORT</small><h2>จัดการสถานะคิว</h2></div><button class="close" onclick="closeModal()">×</button></div><div class="food-admin-queue" data-food-admin-list><div class="empty">กำลัง sync ข้อมูลจาก Google Sheet...</div></div></div></div>`);
  loadFoodSupportTable(project).then(table=>{const {personal}=foodSupportRows(table,project),list=document.querySelector('[data-food-admin-list]');if(!list)return;list.innerHTML=personal.map(row=>`<div><b>#${escapePageText(row.queue)}</b><span>${escapePageText(row.xAccount)}</span><select onchange="saveFoodQueueStatus('${project.id}','${encodeURIComponent(row.key)}',this.value)">${['ลงทะเบียนแล้ว','กำลังตรวจสอบ','ยืนยันคิวแล้ว','ดำเนินการเรียบร้อย','ไม่สะดวกจัดส่ง (Not Available)','ยกเลิก'].map(status=>`<option ${status===row.status?'selected':''}>${status}</option>`).join('')}</select></div>`).join('')||'<div class="empty">ยังไม่มีผู้ลงทะเบียนคิว</div>'}).catch(error=>{const list=document.querySelector('[data-food-admin-list]');if(list)list.innerHTML=`<div class="empty">Sync ไม่สำเร็จ: ${escapePageText(error.message)}</div>`});
}
function saveFoodQueueStatus(projectId,encodedKey,status){
  const project=db.siteSettings.projects.items.find(item=>item.id===projectId);if(!project)return;project.queueStatuses||={};project.queueStatuses[decodeURIComponent(encodedKey)]=status;save();toast('อัปเดตสถานะคิวแล้ว');
}
const foodProjectsAdmin=projectsAdmin;
function moveProjectOrder(projectId,direction){
  ensureProjectSettings();const items=db.siteSettings.projects.items,index=items.findIndex(project=>project.id===projectId);if(index<0)return;const sectionId=items[index].sectionId||'',sameSection=items.map((project,itemIndex)=>({project,itemIndex})).filter(entry=>(entry.project.sectionId||'')===sectionId),position=sameSection.findIndex(entry=>entry.itemIndex===index),targetEntry=sameSection[position+direction];if(!targetEntry)return;[items[index],items[targetEntry.itemIndex]]=[items[targetEntry.itemIndex],items[index]];save();projectsAdmin();toast('อัปเดตลำดับโปรเจกต์แล้ว');
}
function addProjectSection(){
  const title=prompt('ชื่อ Section ที่ต้องการแสดงบนหน้า Projects');if(!title?.trim())return;ensureProjectSettings();db.siteSettings.projects.sections.push({id:`section_${Date.now()}`,title:title.trim()});save();projectsAdmin();toast('สร้าง Section แล้ว');
}
function renameProjectSection(sectionId){
  ensureProjectSettings();const section=db.siteSettings.projects.sections.find(item=>item.id===sectionId);if(!section)return;const title=prompt('แก้ไขชื่อ Section',section.title);if(!title?.trim())return;section.title=title.trim();save();projectsAdmin();toast('แก้ไขชื่อ Section แล้ว');
}
function removeProjectSection(sectionId){
  ensureProjectSettings();const section=db.siteSettings.projects.sections.find(item=>item.id===sectionId);if(!section||!confirm(`ลบ Section "${section.title}" ใช่หรือไม่?\nโปรเจกต์ใน Section จะถูกย้ายไปยังรายการที่ยังไม่ได้เลือก Section`))return;db.siteSettings.projects.sections=db.siteSettings.projects.sections.filter(item=>item.id!==sectionId);db.siteSettings.projects.items.forEach(project=>{if(project.sectionId===sectionId)project.sectionId=''});save();projectsAdmin();toast('ลบ Section แล้ว');
}
function moveProjectSection(sectionId,direction){
  ensureProjectSettings();const sections=db.siteSettings.projects.sections,index=sections.findIndex(section=>section.id===sectionId),target=index+direction;if(index<0||target<0||target>=sections.length)return;[sections[index],sections[target]]=[sections[target],sections[index]];save();projectsAdmin();toast('อัปเดตลำดับ Section แล้ว');
}
projectsAdmin=function(){
  foodProjectsAdmin();const items=db.siteSettings.projects.items,cards=[...document.querySelectorAll('.project-admin-item')],list=document.querySelector('.project-admin-list');if(!list)return;
  const typeLabel={donation:'Donation',personalSupportQueue:'Personal Support Queue',foodSupportQueue:'Donation + Personal Support Queue'};
  cards.forEach((card,index)=>{const project=items[index],actions=card.querySelector('.project-admin-actions');if(!project||!actions)return;const sameSection=items.filter(item=>(item.sectionId||'')===(project.sectionId||'')),sectionIndex=sameSection.findIndex(item=>item.id===project.id),label=card.querySelector('.project-admin-copy>small');if(label)label.textContent=typeLabel[project.projectType||'donation'];actions.insertAdjacentHTML('afterbegin',`<button class="btn outline" onclick="moveProjectOrder('${project.id}',-1)" ${sectionIndex===0?'disabled':''}>↑ ขึ้น</button><button class="btn outline" onclick="moveProjectOrder('${project.id}',1)" ${sectionIndex===sameSection.length-1?'disabled':''}>↓ ลง</button>${['personalSupportQueue','foodSupportQueue'].includes(project.projectType)?`<button class="btn outline" onclick="openFoodQueueAdmin('${project.id}')">จัดการคิว</button>`:''}`)});
  const top=document.querySelector('.admin-top');top?.querySelector('button')?.insertAdjacentHTML('beforebegin','<button class="btn outline" onclick="addProjectSection()">+ สร้าง Section</button>');
  list.innerHTML='';const sections=db.siteSettings.projects.sections,groups=[...sections.map((section,index)=>({id:section.id,title:section.title,index})),{id:'',title:'ยังไม่ได้เลือก Section',index:-1}];
  groups.forEach(group=>{const projects=items.map((project,index)=>({project,card:cards[index]})).filter(entry=>(entry.project.sectionId||'')===group.id);const section=document.createElement('section');section.className=`project-admin-section ${group.id?'':'is-unassigned'}`;const controls=group.id?`<div class="project-section-actions"><button class="btn outline" onclick="moveProjectSection('${group.id}',-1)" ${group.index===0?'disabled':''}>↑</button><button class="btn outline" onclick="moveProjectSection('${group.id}',1)" ${group.index===sections.length-1?'disabled':''}>↓</button><button class="btn outline" onclick="renameProjectSection('${group.id}')">แก้ชื่อ</button><button class="icon-btn" onclick="removeProjectSection('${group.id}')">⌫</button></div>`:'<span>โปรเจกต์กลุ่มนี้จะไม่แสดงในหน้า Projects</span>';section.innerHTML=`<header><div><small>${group.id?'PROJECT SECTION':'NOT PUBLISHED IN PROJECTS'}</small><h2>${escapePageText(group.title)}</h2></div>${controls}</header><div class="project-admin-section-list"></div>`;const sectionList=section.querySelector('.project-admin-section-list');projects.forEach(entry=>sectionList.appendChild(entry.card));if(!projects.length)sectionList.innerHTML='<div class="empty">ยังไม่มีโปรเจกต์ใน Section นี้</div>';list.appendChild(section)});
};
let mobileCalendarSelectedDate = "";
function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function presenterMediaAspectRatio(){
  const value=getComputedStyle(document.documentElement).getPropertyValue('--presenter-media-ratio').trim();
  const parts=value.split('/').map(Number);
  return parts.length===2&&parts[0]>0&&parts[1]>0?parts[0]/parts[1]:4/3;
}
function adjustExistingPresenterImage(button){
  const field=button.closest('.image-upload-field'),hidden=field?.querySelector('[name="announcementImage"]'),input=field?.querySelector('input[type="file"]');
  if(!hidden?.value||!input)return;
  const image=new Image();
  image.onload=()=>openCropImage(input,'announcementImage',image,imageCropPreset('announcementImage'));
  image.onerror=()=>toast('ไม่สามารถเปิดรูปเดิมเพื่อปรับตำแหน่งได้');
  image.src=hidden.value;
}
function calendarTypeLabel(event) {
  const type = db.masterData.types.find(item => eventHasType(event,item.id));
  return type?.label || event.type || "Schedule";
}
function calendarEventColor(event,artistIndex) {
  const id = calendarEventArtistIds(event)[0] || "";
  return calendarArtistColor(id,artistIndex.get(id) || 0);
}
function selectMobileCalendarDate(date) {
  mobileCalendarSelectedDate = date;
  calendarPage();
}
function mobileCalendarToday() {
  const today = new Date();
  calendarDate = new Date(today.getFullYear(),today.getMonth(),1);
  mobileCalendarSelectedDate = localDateKey(today);
  calendarPage();
}
function filterMobileCalendar(value) {
  publicTypeFilter = value;
  calendarPage();
}
const desktopCalendarPage = calendarPage;
calendarPage = function(){
  desktopCalendarPage();
  const calendarArtists=[...db.artists].sort((a,b)=>artistSchedulePriority(a)-artistSchedulePriority(b));
  const artistIndex=new Map(calendarArtists.map((artist,index)=>[artist.id,index]));
  const year=calendarDate.getFullYear(),mon=calendarDate.getMonth(),first=new Date(year,mon,1);
  const todayKey=localDateKey(new Date()),monthKey=`${year}-${String(mon+1).padStart(2,"0")}`;
  if(!mobileCalendarSelectedDate || !mobileCalendarSelectedDate.startsWith(monthKey)) mobileCalendarSelectedDate=todayKey.startsWith(monthKey)?todayKey:`${monthKey}-01`;
  const filteredEvents=db.events.filter(event=>publicTypeFilter==="all" || eventHasType(event,publicTypeFilter));
  const cells=[],gridStart=new Date(year,mon,1-first.getDay());
  for(let index=0;index<42;index++){
    const cellDate=new Date(gridStart.getFullYear(),gridStart.getMonth(),gridStart.getDate()+index);
    const key=localDateKey(cellDate),items=filteredEvents.filter(event=>event.date===key);
    const dots=items.slice(0,3).map(event=>`<i style="background:${calendarEventColor(event,artistIndex)}"></i>`).join("");
    cells.push(`<button class="mobile-calendar-day ${cellDate.getMonth()!==mon?"outside":""} ${key===todayKey?"today":""} ${key===mobileCalendarSelectedDate?"selected":""}" onclick="selectMobileCalendarDate('${key}')" aria-label="${key}"><span>${cellDate.getDate()}</span><b>${dots}${items.length>3?'<i class="more"></i>':""}</b></button>`);
  }
  const selectedEvents=filteredEvents.filter(event=>event.date===mobileCalendarSelectedDate);
  const selectedLabel=new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric"}).format(new Date(`${mobileCalendarSelectedDate}T00:00:00`));
  const detail=selectedEvents.length?selectedEvents.map(event=>`<button class="mobile-event-row" style="--event-color:${calendarEventColor(event,artistIndex)}" onclick="showEvent('${event.id}')"><time>${escapePageText(event.time||"All day")}</time><span><small>${escapePageText(calendarTypeLabel(event))}</small><strong>${escapePageText(event.title)}</strong></span><b>›</b></button>`).join(""):`<div class="mobile-calendar-empty"><b>○</b><p>No schedule to display.<br>Please select another date.</p></div>`;
  const nextEvent=filteredEvents.filter(event=>event.date>mobileCalendarSelectedDate).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||"").localeCompare(b.time||""))[0];
  const nextCard=nextEvent?`<section class="mobile-calendar-detail next"><header><strong>${new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric"}).format(new Date(`${nextEvent.date}T00:00:00`))}</strong><span>Next schedule</span></header><button class="mobile-next-event" style="--event-color:${calendarEventColor(nextEvent,artistIndex)}" onclick="showEvent('${nextEvent.id}')"><small>${escapePageText(calendarTypeLabel(nextEvent))}</small><strong>${escapePageText(nextEvent.title)}</strong><span>${escapePageText(nextEvent.time||"All day")}</span></button></section>`:"";
  const typeOptions=db.masterData.types.map(type=>`<option value="${type.id}" ${publicTypeFilter===type.id?"selected":""}>${escapePageText(type.label)}</option>`).join("");
  const mobile=`<section class="mobile-calendar-view"><header class="mobile-calendar-title"><a href="#home" aria-label="Back">‹</a><h1>Calendar</h1><span></span></header><div class="mobile-calendar-card"><div class="mobile-month-head"><div><h2>${new Intl.DateTimeFormat("en-US",{month:"short"}).format(first)}, <span>${year}</span></h2><button title="Calendar information" aria-label="Calendar information">i</button></div><nav><button onclick="moveCalendar(-1)" aria-label="Previous month">‹</button><button onclick="moveCalendar(1)" aria-label="Next month">›</button></nav></div><div class="mobile-calendar-controls"><select aria-label="Filter schedules by type" onchange="filterMobileCalendar(this.value)"><option value="all">All</option>${typeOptions}</select><button onclick="mobileCalendarToday()">Today</button></div><div class="mobile-calendar-grid">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=>`<span class="mobile-weekday">${day}</span>`).join("")}${cells.join("")}</div></div><section class="mobile-calendar-detail"><header><strong>${selectedLabel}</strong>${mobileCalendarSelectedDate===todayKey?"<span>Today</span>":""}</header>${detail}</section>${nextCard}</section>`;
  document.querySelector(".calendar-section")?.insertAdjacentHTML("afterend",mobile);
};
showEvent=function(id){
  const e=db.events.find(x=>x.id===id);if(!e)return;
  const dateLabel=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(`${e.date}T00:00:00`));
  const rawTime=String(e.time||e.place||'').trim(),timeLabel=rawTime.replace(/^(\d{1,2})[.:](\d{2})/,(_,hour,minute)=>`${String(hour).padStart(2,'0')}:${minute}`);
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal event-modal event-modal-detail"><div class="modal-head"><span class="eyebrow">${escapePageText(eventBadge(e))} · ${escapePageText(e.type||'')}</span><button class="close" onclick="closeModal()">×</button></div><h2>${escapePageText(e.title)}</h2><p class="event-date-time"><span>${escapePageText(dateLabel)}</span>${timeLabel?`<b>·</b><time>${escapePageText(timeLabel)}</time>`:''}</p>${e.poster?`<img class="event-poster" src="${escapePageText(e.poster)}" alt="${escapePageText(e.title)}">`:''}${e.source?`<a class="btn" target="_blank" href="${escapePageText(e.source)}">View source ➚</a>`:''}</div></div>`);
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

/* Keep the artist manager on the correct record after create/edit/delete. */
const submitFormBeforeArtistManagerLifecycle=submitForm;
submitForm=function(event,type,id){
  if(type!=='artists')return submitFormBeforeArtistManagerLifecycle(event,type,id);
  const beforeIds=new Set(db.artists.map(artist=>artist.id));
  submitFormBeforeArtistManagerLifecycle(event,type,id);
  const artist=id ? artistById(id) : db.artists.find(item=>!beforeIds.has(item.id));
  if(!artist)return;
  ensureArtistPageBuilders();
  artistManagerArtistId=artist.id;
  artistManagerTab='layout';
  save();
  artistDetailAdmin();
};

const removeItemBeforeArtistManagerLifecycle=removeItem;
removeItem=function(type,id){
  if(type!=='artists')return removeItemBeforeArtistManagerLifecycle(type,id);
  const existed=db.artists.some(artist=>artist.id===id);
  removeItemBeforeArtistManagerLifecycle(type,id);
  if(!existed||db.artists.some(artist=>artist.id===id))return;
  ensureHomePageSettings();
  delete db.siteSettings.artistPageBuilders?.[id];
  delete db.siteSettings.personalProfiles?.[id];
  delete db.siteSettings.artistArchive?.[id];
  artistManagerArtistId='';
  artistManagerTab='layout';
  save();
  artistDirectoryAdmin();
};
function restoreCoupleAwardsCards(){
  const section=document.querySelector('.couple-archive .archive-awards');if(!section||section.querySelector('.award-grid'))return;
  const awards=db.awards.filter(item=>{
    const label=String(artistName(item?.artistId)||'').trim().toUpperCase();
    return awardMatchesArtist(item,'AT01')||sameArtistId(item?.artistId,'AT01')||label==='AUAUSAVE';
  }).sort((a,b)=>Number(b.year)-Number(a.year));
  const container=section.querySelector('.container');if(!container)return;
  container.insertAdjacentHTML('beforeend',`<div class="award-grid">${awards.map(item=>`<article class="award">${awardImage(item)?`<img class="award-image" src="${escapePageText(awardImage(item))}" alt="${escapePageText(item.title)}">`:''}<h3>${escapePageText(item.title)}</h3><p>${escapePageText(item.org||'')}</p><time class="award-date">${escapePageText(awardDisplayDate(item))}</time>${item.source?`<a class="source-link" href="${escapePageText(item.source)}" target="_blank" rel="noopener noreferrer">View Source ➚</a>`:''}</article>`).join('')||'<div class="empty">ยังไม่มีข้อมูลรางวัล</div>'}</div>`);
}
const profileBeforeCoupleAwardsRestore=profile;
profile=function(id){profileBeforeCoupleAwardsRestore(id);if(sameArtistId(id,'duo'))restoreCoupleAwardsCards();};
function formatArtistBirthEnglish(value){value=legacyBirthToDateInput(value);if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return'';const [year,month,day]=value.split('-').map(Number);return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(year,month-1,day))}
function validArtistSocials(artist){return(Array.isArray(artist.socialLinks)?artist.socialLinks:[]).filter(item=>item&&item.active!==false&&/^https?:\/\//i.test(String(item.url||'').trim())).sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999))}
function artistSocialPlatformName(value){return String(value||'Other').toLowerCase()==='xiaohongshu'?'RedNote':String(value||'Other')}
function renderUnifiedArtistProfile(artist){
  const profileBirth=db.siteSettings?.personalProfiles?.[artist.id]?.birthday;
  const fullName=String(artist.nameEN||artist.fullNameEn||'').trim(),birth=formatArtistBirthEnglish(artist.birthDate||artist.birth||profileBirth),role=String(artist.role||'').trim(),socials=validArtistSocials(artist);
  const facts=[fullName?`<div class="fact"><small>FULL NAME</small><strong>${escapePageText(fullName)}</strong></div>`:'',birth?`<div class="fact"><small>DATE OF BIRTH</small><strong>${escapePageText(birth)}</strong></div>`:'',role?`<div class="fact artist-role-fact"><small>ROLE</small><strong>${escapePageText(role)}</strong></div>`:''].join('');
  const socialSection=socials.length?`<section class="artist-official-socials"><h2>OFFICIAL SOCIALS</h2><div class="artist-social-grid">${socials.map(item=>`<a class="artist-social-button" href="${escapePageText(item.url)}" target="_blank" rel="noopener noreferrer"><span class="artist-social-platform-label">${escapePageText(artistSocialPlatformName(item.platform))}</span><span class="artist-social-copy">${item.username?`<small>${escapePageText(item.username)}</small>`:''}</span><span class="artist-social-arrow" aria-hidden="true">➚</span></a>`).join('')}</div></section>`:'';
  const portrait=artist.image?`<img src="${escapePageText(versionedMediaUrl(artist.image,artist.imageVersion||artist.id))}" alt="${escapePageText(artist.name||'Artist')}">`:`<span>${escapePageText(artist.initial||String(artist.name||'AR').slice(0,2))}</span>`;
  return `<div class="profile-portrait portrait" style="background:${escapePageText(artist.color||'#ddd')}">${portrait}</div><div class="artist-profile-copy"><span class="eyebrow">ARTIST PROFILE</span><h1>${escapePageText(artist.stageNameEn||artist.name||'')}</h1>${artist.bio?`<p class="artist-profile-description">${escapePageText(artist.bio)}</p>`:''}${facts?`<div class="facts artist-profile-facts">${facts}</div>`:''}${socialSection}</div>`
}
const profileBeforeUnifiedArtistProfile=profile;
profile=function(id){id=canonicalArtistId(id);profileBeforeUnifiedArtistProfile(id);if(sameArtistId(id,'duo'))return;const artist=artistById(id),head=document.querySelector('.profile-head');if(artist&&head)head.innerHTML=renderUnifiedArtistProfile(artist)};
const ARTIST_SOCIAL_PLATFORMS=['X','Instagram','TikTok','Weibo','Douyin','RedNote','YouTube','Facebook','Other'];
function artistSocialEditorCard(item={},index=0){
  const platform=artistSocialPlatformName(item.platform||'X');
  return `<article class="artist-social-editor-card" draggable="true" ondragstart="artistSocialDragStart(event)" ondragover="artistSocialDragOver(event)" ondrop="artistSocialDrop(event)" ondragend="artistSocialDragEnd(event)">
    <div class="artist-social-card-head"><span class="artist-social-platform-badge">${escapePageText(platform)}</span><span class="artist-social-drag">ลากเพื่อจัดลำดับ</span><button type="button" onclick="removeArtistSocialCard(this)">ลบรายการ</button></div>
    <div class="artist-social-card-fields">
      <label><span>ชื่อแพลตฟอร์ม</span><select data-social-platform onchange="updateArtistSocialCard(this)">${ARTIST_SOCIAL_PLATFORMS.map(name=>`<option ${name===platform?'selected':''}>${name}</option>`).join('')}</select></label>
      <label><span>Username</span><input data-social-username value="${escapePageText(item.username||'')}" placeholder="@username"></label>
      <label class="artist-social-url-field"><span>URL ของบัญชี</span><input data-social-url type="url" value="${escapePageText(item.url||'')}" placeholder="https://..."></label>
      <label><span>สถานะ</span><select data-social-active><option value="true" ${item.active!==false?'selected':''}>Active</option><option value="false" ${item.active===false?'selected':''}>Inactive</option></select></label>
      <label><span>ลำดับการแสดงผล</span><input data-social-order type="number" min="1" value="${Number(item.order)||index+1}" readonly></label>
    </div>
  </article>`;
}
function reindexArtistSocialCards(){
  document.querySelectorAll('#artistSocialEditorList .artist-social-editor-card').forEach((card,index)=>{
    const order=card.querySelector('[data-social-order]');if(order)order.value=index+1;
  });
}
function addArtistSocialCard(item={}){
  const list=document.querySelector('#artistSocialEditorList');if(!list)return;
  list.insertAdjacentHTML('beforeend',artistSocialEditorCard(item,list.children.length));reindexArtistSocialCards();
}
function removeArtistSocialCard(button){button.closest('.artist-social-editor-card')?.remove();reindexArtistSocialCards()}
function updateArtistSocialCard(select){const badge=select.closest('.artist-social-editor-card')?.querySelector('.artist-social-platform-badge');if(badge)badge.textContent=select.value}
let draggedArtistSocialCard=null;
function artistSocialDragStart(event){draggedArtistSocialCard=event.currentTarget;event.currentTarget.classList.add('is-dragging');event.dataTransfer.effectAllowed='move'}
function artistSocialDragOver(event){event.preventDefault();const target=event.currentTarget;if(!draggedArtistSocialCard||target===draggedArtistSocialCard)return;const box=target.getBoundingClientRect(),after=event.clientY>box.top+box.height/2;target.parentNode.insertBefore(draggedArtistSocialCard,after?target.nextSibling:target);reindexArtistSocialCards()}
function artistSocialDrop(event){event.preventDefault();reindexArtistSocialCards()}
function artistSocialDragEnd(event){event.currentTarget.classList.remove('is-dragging');draggedArtistSocialCard=null;reindexArtistSocialCards()}
function collectArtistSocialCards(form){
  return [...form.querySelectorAll('.artist-social-editor-card')].map((card,index)=>({
    platform:card.querySelector('[data-social-platform]')?.value||'Other',
    username:card.querySelector('[data-social-username]')?.value.trim()||'',
    url:card.querySelector('[data-social-url]')?.value.trim()||'',
    active:card.querySelector('[data-social-active]')?.value==='true',
    order:index+1
  })).filter(item=>item.url);
}
const openFormBeforeArtistSocials=openForm;
openForm=function(type,id){
  openFormBeforeArtistSocials(type,id);if(type!=='artists')return;
  const artist=id?db.artists.find(item=>item.id===id):{},grid=document.querySelector('#modal .form-grid'),items=Array.isArray(artist?.socialLinks)?[...artist.socialLinks].sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)):[];
  grid?.insertAdjacentHTML('beforeend',`<section class="field full artist-social-editor"><div class="artist-social-editor-title"><div><label>OFFICIAL SOCIALS</label><small>ลากและวางการ์ดเพื่อจัดลำดับ หมายเลขจะอัปเดตให้อัตโนมัติ</small></div></div><div id="artistSocialEditorList">${items.map(artistSocialEditorCard).join('')}</div><button class="btn outline artist-social-add" type="button" onclick="addArtistSocialCard()">+ เพิ่มบัญชีโซเชียลมีเดีย</button></section>`);
};
const submitFormBeforeArtistSocials=submitForm;
submitForm=function(event,type,id){
  if(type!=='artists')return submitFormBeforeArtistSocials(event,type,id);
  const socials=collectArtistSocialCards(event.target),existing=id?db.artists.find(item=>item.id===id):null;
  if(existing)existing.socialLinks=socials;
  submitFormBeforeArtistSocials(event,type,id);
  const artist=existing||db.artists[db.artists.length-1];
  if(artist&&!existing){artist.socialLinks=socials;save()}
};
const openFormBeforeImageOnlyPresenters=openForm;
openForm=function(type,id){
  openFormBeforeImageOnlyPresenters(type,id);
  if(type!=='presenters')return;
  const modal=document.querySelector('#modal');
  modal?.classList.add('presenter-image-only-modal');
  const preview=modal?.querySelector('#uploadPreview_announcementImage');
  preview?.classList.add('presenter-image-preview');
  if(preview?.classList.contains('has-image')&&!modal.querySelector('[data-adjust-presenter-image]')){
    preview.closest('.image-uploader')?.querySelector(':scope>div:last-child')?.insertAdjacentHTML('beforeend','<button type="button" class="remove-image adjust-presenter-image" data-adjust-presenter-image onclick="adjustExistingPresenterImage(this)">ปรับตำแหน่งรูปอีกครั้ง</button>');
  }
};
const listingBeforeResponsiveGroups=listing;
listing=function(type){
  listingBeforeResponsiveGroups(type);
  if(type!=='awards')return;
  const container=document.querySelector('main .section .container');
  if(!container)return;
  const byYear=new Map();
  [...db.awards].sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0)||String(b.date||'').localeCompare(String(a.date||''))).forEach(item=>{
    const year=String(item.year||item.date?.slice(0,4)||'TBA');
    if(!byYear.has(year))byYear.set(year,[]);
    byYear.get(year).push(item);
  });
  container.innerHTML=[...byYear].map(([year,items])=>`<section class="award-year-section"><h2>${escapePageText(year)}</h2><div class="award-grid">${items.map(item=>`<article class="award">${awardImage(item)?`<img class="award-image" src="${escapePageText(awardImage(item))}" alt="${escapePageText(item.title)}">`:''}<span class="eyebrow">${escapePageText(artistName(item.artistId))}</span><h3>${escapePageText(item.title)}</h3><p>${escapePageText(item.org||'')}</p><time class="award-date">${escapePageText(awardDisplayDate(item))}</time>${item.source?`<a class="source-link" href="${escapePageText(item.source)}" target="_blank" rel="noopener noreferrer">ดูข้อมูลต้นทาง ➚</a>`:''}</article>`).join('')}</div></section>`).join('');
};

function enhanceLinkIndicators(root=document.body){
  if(!root||!root.textContent?.includes('➚'))return;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()){
    const node=walker.currentNode;
    if(node.data.includes('➚')&&!node.parentElement?.classList.contains('link-indicator__icon'))nodes.push(node);
  }
  nodes.forEach(node=>{
    const target=node.parentElement?.closest('a,button,.arrow,.media-link-art'),parts=node.data.split('➚'),fragment=document.createDocumentFragment();
    parts.forEach((part,index)=>{if(part)fragment.append(document.createTextNode(part));if(index<parts.length-1){const icon=document.createElement('span');icon.className='link-indicator__icon';icon.setAttribute('aria-hidden','true');icon.textContent='➚';fragment.append(icon)}});
    node.replaceWith(fragment);target?.classList.add('link-indicator');
  });
}
function syncTimelineTrackRules(root=document){
  root.querySelectorAll?.('.filmography-timeline-track').forEach(track=>{
    track.style.setProperty('--timeline-rule-width',`${Math.max(track.parentElement?.clientWidth||0,track.scrollWidth)}px`);
  });
}
let responsiveIconObserver=null;
function applyResponsiveContentStructure(){
  document.documentElement.classList.add('responsive-ui-ready');
  enhanceLinkIndicators();
  syncTimelineTrackRules();
  if(!responsiveIconObserver){
    responsiveIconObserver=new MutationObserver(()=>{enhanceLinkIndicators();syncTimelineTrackRules()});
    responsiveIconObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.addEventListener('resize',()=>syncTimelineTrackRules(),{passive:true});
  }
  document.querySelectorAll('.archive-section-head>p').forEach(copy=>{if(copy.textContent.trim()==='Search couple schedules by date range and event type.')copy.remove()});
  document.querySelectorAll('.schedule-wrap').forEach(wrap=>{
    const rows=[...wrap.children].filter(child=>child.classList.contains('schedule-row'));
    if(rows.length&&!wrap.querySelector(':scope > .responsive-schedule-grid')){
      const grid=document.createElement('div');grid.className='responsive-schedule-grid';
      wrap.insertBefore(grid,rows[0]);rows.forEach(row=>grid.appendChild(row));
    }
  });
}
const routerBeforeResponsiveUI=router;
router=function(){routerBeforeResponsiveUI();applyResponsiveContentStructure()};

const hydrateBeforeArtistRowCleanup=hydrateFromSupabase;
hydrateFromSupabase=async function(){
  await hydrateBeforeArtistRowCleanup();
  if(db.siteSettings&&Object.prototype.hasOwnProperty.call(db.siteSettings,'artistRowLayouts')){
    delete db.siteSettings.artistRowLayouts;
    save();
  }
};

router();
hydrateFromSupabase();

/* Fanbase socials: managed in siteSettings so Supabase syncs them with the rest of the site. */
const DEFAULT_FANBASES=[
  {id:'fanbase_auausave',displayName:'AUAUSAVE HOUSE',username:'@AuauSaveHouseTH',description:'',accentColor:'#d86666',displayOrder:1,active:true,socialLinks:[]},
  {id:'fanbase_auau',displayName:'AUAUTNP OFFICIAL THAILAND',username:'@AUAUTNPOFC',description:'',accentColor:'#5f9272',displayOrder:2,active:true,socialLinks:[]},
  {id:'fanbase_save',displayName:'SAVEWRG OFFICIAL THAILAND',username:'@SAVEWRG_OFC',description:'',accentColor:'#d58c61',displayOrder:3,active:true,socialLinks:[]}
];
function ensureFanbaseSocials(){db.siteSettings||={};if(!Array.isArray(db.siteSettings.fanbases))db.siteSettings.fanbases=structuredClone(DEFAULT_FANBASES);db.siteSettings.fanbases.forEach((x,i)=>{x.socialLinks=Array.isArray(x.socialLinks)?x.socialLinks:[];x.displayOrder=Number(x.displayOrder)||i+1;x.active=x.active!==false})}
function fanbaseSocialButton(x){const label=escapePageText(x.displayLabel||x.platformName||'Follow');return x.linkType==='copy'?`<button class="fanbase-social-button" type="button" data-copy="${escapePageText(x.copyText||x.username||'')}" onclick="copyFanbaseText(this)"><span>${label}</span><small>${escapePageText(x.username||'')}</small><b>Copy</b></button>`:`<a class="fanbase-social-button" href="${escapePageText(x.url)}" target="_blank" rel="noopener noreferrer"><span>${label}</span>${x.username?`<small>${escapePageText(x.username)}</small>`:''}<b>↗</b></a>`}
function fanbaseSection(){ensureFanbaseSocials();const cards=[...db.siteSettings.fanbases].filter(x=>x.active!==false).sort((a,b)=>a.displayOrder-b.displayOrder);return `<section class="section fanbase-section"><div class="container"><div class="section-head fanbase-section-head"><div><span class="eyebrow">STAY CONNECTED</span><h2>FOLLOW OUR FANBASES</h2></div><p>Stay updated with AuauSave, Auau and Save.</p></div><div class="fanbase-grid">${cards.map(x=>{const links=[...x.socialLinks].filter(s=>s.active!==false&&((s.linkType==='copy'&&(s.copyText||s.username))||(s.linkType!=='copy'&&/^https?:\/\//i.test(s.url||'')))).sort((a,b)=>(a.displayOrder||999)-(b.displayOrder||999));return `<article class="fanbase-card" style="--fanbase-accent:${escapePageText(x.accentColor||'#d86666')}"><div><h3>${escapePageText(x.displayName)}</h3><p class="fanbase-username">${escapePageText(x.username||'')}</p>${x.description?`<p class="fanbase-description">${escapePageText(x.description)}</p>`:''}</div>${links.length?`<div class="fanbase-socials">${links.map(fanbaseSocialButton).join('')}</div>`:''}</article>`}).join('')}</div></div></section>`}
async function copyFanbaseText(button){const value=button.dataset.copy||'';if(!value)return;try{await navigator.clipboard.writeText(value)}catch(e){const t=document.createElement('textarea');t.value=value;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}const b=button.querySelector('b'),old=b.textContent;b.textContent='Copied';setTimeout(()=>{if(b.isConnected)b.textContent=old},1400)}
const listingBeforeFanbases=listing;listing=function(type){listingBeforeFanbases(type);if(type==='artists'&&!document.querySelector('.fanbase-section'))document.querySelector('main')?.insertAdjacentHTML('beforeend',fanbaseSection())};
const profileBeforeFanbases=profile;profile=function(id){profileBeforeFanbases(id);if(!sameArtistId(id,'AT01'))return;const old=document.querySelector('.couple-hashtag');if(old)old.outerHTML='<div class="couple-profile-links"><a class="couple-profile-link" href="#/AUAU">AUAU PROFILE</a><a class="couple-profile-link" href="#/SAVE">SAVE PROFILE</a></div>'};

function fanbaseAdminSidebar(){const items=[['dashboard','⌂','Dashboard'],['pagecontent','▤','Homepage Content'],['artists','◉','Profiles'],['events','▦','Schedule'],['timeline','◷','Timeline'],['presenters','✦','Presenters'],['awards','◇','Awards'],['projects','◆','Projects'],['fanbases','◎','Fanbase Socials'],['master','⚙','Master Data']];return `<aside class="sidebar"><div class="brand"><i></i>AUAUSAVE HOUSE</div><div class="side-nav">${items.map(([id,icon,label])=>`<button data-icon="${icon}" class="${id==='fanbases'?'active':''}" onclick="adminTab='${id}';admin()">${icon} &nbsp; ${label}</button>`).join('')}</div><a class="back" href="#artists">← ดูหน้าบ้าน</a></aside>`}
function fanbaseAdmin(){ensureFanbaseSocials();const items=[...db.siteSettings.fanbases].sort((a,b)=>a.displayOrder-b.displayOrder);app.innerHTML=`<div class="admin"><div class="admin-shell">${fanbaseAdminSidebar()}<main class="admin-main"><div class="admin-top"><div><small>FANBASE MANAGEMENT</small><h1>Fanbase Socials</h1><p>จัดการข้อมูลที่แสดงใน “FOLLOW OUR FANBASES”</p></div><button class="btn" onclick="openFanbaseForm()">+ เพิ่ม Fanbase</button></div><section class="fanbase-admin-list">${items.map((x,i)=>`<article class="panel fanbase-admin-card" draggable="true" data-id="${x.id}" ondragstart="fanbaseDragStart(event)" ondragover="fanbaseDragOver(event)" ondrop="fanbaseDrop(event)"><i style="background:${escapePageText(x.accentColor)}"></i><div><small>ลำดับ ${i+1} · ${x.active?'ACTIVE':'INACTIVE'}</small><h2>${escapePageText(x.displayName)}</h2><p>${escapePageText(x.username||'')}</p><span>${x.socialLinks.filter(s=>s.active!==false).length} ช่องทาง</span></div><div class="actions"><button class="btn outline" onclick="openFanbaseForm('${x.id}')">แก้ไข</button><button class="icon-btn" onclick="removeFanbase('${x.id}')">ลบ</button><b class="fanbase-drag-handle">⋮⋮</b></div></article>`).join('')}</section></main></div></div>`}
function fanbaseLinkEditor(x={},i=0){return `<article class="fanbase-link-editor" draggable="true" ondragstart="fanbaseLinkDragStart(event)" ondragover="fanbaseLinkDragOver(event)" ondrop="fanbaseLinkDrop(event)"><header><b>ช่องทาง ${i+1}</b><button type="button" onclick="this.closest('.fanbase-link-editor').remove();reindexFanbaseLinks()">ลบ</button></header><div class="form-grid"><div class="field"><label>Platform Name</label><input data-platform value="${escapePageText(x.platformName||'')}" placeholder="X, Instagram, WeChat…"></div><div class="field"><label>Display Label</label><input data-label value="${escapePageText(x.displayLabel||'')}" required></div><div class="field"><label>Link Type</label><select data-type onchange="toggleFanbaseLinkFields(this)"><option value="external" ${x.linkType==='copy'?'':'selected'}>External URL</option><option value="copy" ${x.linkType==='copy'?'selected':''}>Copy Text</option></select></div><div class="field"><label>Username / ID</label><input data-username value="${escapePageText(x.username||'')}"></div><div class="field full fanbase-url-field"><label>URL</label><input data-url type="url" value="${escapePageText(x.url||'')}" placeholder="https://..."></div><div class="field full fanbase-copy-field"><label>Copy Text</label><input data-copy value="${escapePageText(x.copyText||'')}"></div><div class="field"><label>สถานะ</label><select data-active><option value="true" ${x.active===false?'':'selected'}>Active</option><option value="false" ${x.active===false?'selected':''}>Inactive</option></select></div><div class="field"><label>Display Order</label><input data-order value="${i+1}" readonly></div></div></article>`}
function openFanbaseForm(id=''){ensureFanbaseSocials();const x=db.siteSettings.fanbases.find(v=>v.id===id)||{displayName:'',username:'',description:'',accentColor:'#d86666',active:true,socialLinks:[]};document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal fanbase-admin-modal"><div class="modal-head"><div><small>FANBASE DETAILS</small><h2>${id?'แก้ไข':'เพิ่ม'} Fanbase</h2></div><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveFanbaseForm(event,'${id}')"><div class="form-grid"><div class="field"><label>Display Name</label><input name="displayName" value="${escapePageText(x.displayName)}" required></div><div class="field"><label>Username</label><input name="username" value="${escapePageText(x.username||'')}"></div><div class="field full"><label>Description (ไม่บังคับ)</label><textarea name="description">${escapePageText(x.description||'')}</textarea></div><div class="field"><label>Accent Color</label><input name="accentColor" type="color" value="${escapePageText(x.accentColor||'#d86666')}"></div><div class="field"><label>สถานะ</label><select name="active"><option value="true" ${x.active===false?'':'selected'}>Active</option><option value="false" ${x.active===false?'selected':''}>Inactive</option></select></div></div><section class="fanbase-links-editor"><div class="panel-head"><div><h3>Social Links</h3><small>ลากการ์ดเพื่อจัดลำดับ</small></div><button class="btn outline" type="button" onclick="addFanbaseLink()">+ เพิ่มช่องทาง</button></div><div id="fanbaseLinkList">${[...x.socialLinks].sort((a,b)=>(a.displayOrder||999)-(b.displayOrder||999)).map(fanbaseLinkEditor).join('')}</div></section><div class="form-actions"><button class="btn outline" type="button" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึก</button></div></form></div></div>`);document.querySelectorAll('[data-type]').forEach(toggleFanbaseLinkFields)}
function addFanbaseLink(){const list=document.querySelector('#fanbaseLinkList');list?.insertAdjacentHTML('beforeend',fanbaseLinkEditor({},list.children.length));reindexFanbaseLinks();document.querySelectorAll('[data-type]').forEach(toggleFanbaseLinkFields)}
function toggleFanbaseLinkFields(select){const card=select.closest('.fanbase-link-editor'),copy=select.value==='copy';card.querySelector('.fanbase-url-field').hidden=copy;card.querySelector('.fanbase-copy-field').hidden=!copy}
function reindexFanbaseLinks(){document.querySelectorAll('.fanbase-link-editor').forEach((card,i)=>{card.querySelector('header b').textContent=`ช่องทาง ${i+1}`;card.querySelector('[data-order]').value=i+1})}
let draggedFanbaseLink=null;function fanbaseLinkDragStart(e){draggedFanbaseLink=e.currentTarget}function fanbaseLinkDragOver(e){e.preventDefault();if(!draggedFanbaseLink||draggedFanbaseLink===e.currentTarget)return;const b=e.currentTarget.getBoundingClientRect();e.currentTarget.parentNode.insertBefore(draggedFanbaseLink,e.clientY>b.top+b.height/2?e.currentTarget.nextSibling:e.currentTarget);reindexFanbaseLinks()}function fanbaseLinkDrop(e){e.preventDefault();draggedFanbaseLink=null;reindexFanbaseLinks()}
function saveFanbaseForm(e,id){e.preventDefault();const f=e.target,links=[...f.querySelectorAll('.fanbase-link-editor')].map((c,i)=>({platformName:c.querySelector('[data-platform]').value.trim(),displayLabel:c.querySelector('[data-label]').value.trim(),url:c.querySelector('[data-url]').value.trim(),username:c.querySelector('[data-username]').value.trim(),copyText:c.querySelector('[data-copy]').value.trim(),linkType:c.querySelector('[data-type]').value,displayOrder:i+1,active:c.querySelector('[data-active]').value==='true'}));if(links.some(x=>x.linkType==='external'&&!/^https?:\/\/[^\s]+$/i.test(x.url)))return alert('External URL ต้องถูกต้องและขึ้นต้นด้วย http:// หรือ https://');if(links.some(x=>x.linkType==='copy'&&!x.copyText&&!x.username))return alert('Copy Text ต้องมีข้อความหรือ Username / ID');const old=db.siteSettings.fanbases.find(x=>x.id===id),item={id:id||`fanbase_${Date.now()}`,displayName:f.displayName.value.trim(),username:f.username.value.trim(),description:f.description.value.trim(),accentColor:f.accentColor.value,active:f.active.value==='true',socialLinks:links,displayOrder:old?.displayOrder||db.siteSettings.fanbases.length+1};old?Object.assign(old,item):db.siteSettings.fanbases.push(item);save();closeModal();fanbaseAdmin();toast('บันทึก Fanbase แล้ว')}
function removeFanbase(id){const x=db.siteSettings.fanbases.find(v=>v.id===id);if(!x||!confirm(`ลบ ${x.displayName} ใช่หรือไม่?`))return;db.siteSettings.fanbases=db.siteSettings.fanbases.filter(v=>v.id!==id);db.siteSettings.fanbases.forEach((v,i)=>v.displayOrder=i+1);save();fanbaseAdmin()}
let draggedFanbase=null;function fanbaseDragStart(e){draggedFanbase=e.currentTarget}function fanbaseDragOver(e){e.preventDefault();if(!draggedFanbase||draggedFanbase===e.currentTarget)return;const b=e.currentTarget.getBoundingClientRect();e.currentTarget.parentNode.insertBefore(draggedFanbase,e.clientY>b.top+b.height/2?e.currentTarget.nextSibling:e.currentTarget)}function fanbaseDrop(e){e.preventDefault();[...document.querySelectorAll('.fanbase-admin-card')].forEach((c,i)=>{const x=db.siteSettings.fanbases.find(v=>v.id===c.dataset.id);if(x)x.displayOrder=i+1});draggedFanbase=null;save();fanbaseAdmin()}
function injectFanbaseAdminMenu(){const nav=document.querySelector('.sidebar .side-nav');if(!nav||nav.querySelector('[data-fanbase-menu]'))return;const master=[...nav.querySelectorAll('button')].find(button=>button.textContent.includes('Master Data'));const button=document.createElement('button');button.dataset.icon='◎';button.dataset.fanbaseMenu='true';button.innerHTML='◎ &nbsp; Fanbase Socials';button.onclick=()=>{adminTab='fanbases';admin()};master?nav.insertBefore(button,master):nav.appendChild(button)}
const adminBeforeFanbases=admin;admin=function(){if(adminAuthenticated&&adminTab==='fanbases')fanbaseAdmin();else{adminBeforeFanbases();if(adminAuthenticated)injectFanbaseAdminMenu()}};
ensureFanbaseSocials();
if(route==='artists'||route.startsWith('/'))router();

/* Artist artwork is square from upload/crop through every public profile. */
const openFormBeforeSquareArtistImage=openForm;
openForm=function(type,id){
  openFormBeforeSquareArtistImage(type,id);
  if(type!=='artists')return;
  const field=document.querySelector('#uploadPreview_image')?.closest('.image-upload-field');
  field?.classList.add('artist-square-upload');
  const help=field?.querySelector('.image-uploader p');
  if(help)help.textContent='รองรับ JPG, PNG, WebP · รูปศิลปินจะถูกครอปเป็นสัดส่วน 1:1';
};

/* Simplified public headings and homepage card order controls. */
const DEFAULT_MANAGED_PAGE_TITLES={artists:'THE AUAUSAVE UNIVERSE',schedule:'Event Calendar',presenters:'BRAND AMBASSADORS',awards:'AWARDS',projects:'OUR PROJECTS',auausave:'AUAUSAVE',auau:'AUAU',save:'SAVE',mhiipraew:'MHII PRAEW'};
function ensureManagedPageTitles(){db.siteSettings||={};db.siteSettings.pageTitles={...DEFAULT_MANAGED_PAGE_TITLES,...(db.siteSettings.pageTitles||{})};return db.siteSettings.pageTitles}
function moveHomepageArtistCard(artistId,direction){ensureHomepageArtistCards();const list=db.siteSettings.homeArtistOrder,index=list.indexOf(artistId),target=index+direction;if(index<0||target<0||target>=list.length)return;[list[index],list[target]]=[list[target],list[index]];save();pageContentAdmin();toast('บันทึกลำดับการ์ดศิลปินแล้ว')}
function moveHomepageScheduleCard(artistId,direction){ensureHomepageFrontDisplaySettings();const list=db.siteSettings.homeScheduleOrder,index=list.indexOf(artistId),target=index+direction;if(index<0||target<0||target>=list.length)return;[list[index],list[target]]=[list[target],list[index]];save();pageContentAdmin();toast('บันทึกลำดับการ์ดตารางงานแล้ว')}
renderHomepageArtistOrderEditor=function(){
  const artists=homepageOrderedArtists();
  return `<section class="panel homepage-artist-order-editor"><div class="panel-head"><div><small>ARTIST CARDS PREVIEW</small><h2>จัดลำดับการ์ดศิลปิน</h2><p class="master-note">ลากการ์ด หรือใช้ปุ่มขึ้น–ลง เพื่อกำหนดลำดับบนหน้าแรก ข้อมูลรูป ชื่อ รายละเอียด และลิงก์ดึงจาก Artist Profile โดยอัตโนมัติ</p></div></div><div class="home-artist-sort-grid">${artists.map((artist,index)=>`<article draggable="true" ondragstart="homeArtistDragStart(event,'${artist.id}')" ondragover="event.preventDefault()" ondrop="homeArtistDrop(event,'${artist.id}')"><div class="home-artist-sort-order">↕ ${String(index+1).padStart(2,'0')}</div><div class="home-artist-sort-thumb" style="background:${artist.color}">${artist.image?`<img src="${escapePageText(artist.image)}" alt="">`:`<span>${escapePageText(artist.initial||artist.name.slice(0,2))}</span>`}</div><div><h3>${escapePageText(artist.name)}</h3><p>${escapePageText(artist.role||'')}</p></div><div class="card-order-buttons"><button type="button" aria-label="เลื่อนขึ้น" onclick="moveHomepageArtistCard('${artist.id}',-1)" ${index===0?'disabled':''}>↑</button><button type="button" aria-label="เลื่อนลง" onclick="moveHomepageArtistCard('${artist.id}',1)" ${index===artists.length-1?'disabled':''}>↓</button></div></article>`).join('')}</div></section>`;
};
renderHomepageArtistLiveEditor=function(){return''};
renderHomepageScheduleOrderEditor=function(){
  const artists=homepageScheduleArtists();
  return `<section class="panel homepage-schedule-order-editor"><div class="panel-head"><div><small>SCHEDULE CARD ORDER</small><h2>จัดลำดับกลุ่มตารางงาน</h2><p class="master-note">ลากการ์ด หรือใช้ปุ่มขึ้น–ลง เพื่อกำหนดลำดับบนหน้าแรก ชื่อและรายละเอียดดึงจาก Artist Profile โดยอัตโนมัติ</p></div></div><div class="home-artist-sort-grid home-schedule-sort-grid">${artists.map((artist,index)=>`<article draggable="true" ondragstart="homeScheduleDragStart(event,'${artist.id}')" ondragover="event.preventDefault()" ondrop="homeScheduleDrop(event,'${artist.id}')"><div class="home-artist-sort-order">↕ ${String(index+1).padStart(2,'0')}</div><div class="home-schedule-sort-thumb ${artistScheduleCardClass(artist.id,index)}" style="background:${artistDisplayColor(artist.id,index)};color:#fff"><b>${escapePageText(artist.name)}</b></div><div><h3>${escapePageText(artist.name)}</h3><p>${escapePageText(artist.role||'')}</p></div><div class="card-order-buttons"><button type="button" aria-label="เลื่อนขึ้น" onclick="moveHomepageScheduleCard('${artist.id}',-1)" ${index===0?'disabled':''}>↑</button><button type="button" aria-label="เลื่อนลง" onclick="moveHomepageScheduleCard('${artist.id}',1)" ${index===artists.length-1?'disabled':''}>↓</button></div></article>`).join('')}</div></section>`;
};
homeScheduleSection=function(){
  ensureHomepageFrontDisplaySettings();
  const now=new Date(),monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,monthly=db.events.filter(event=>event.date.startsWith(monthKey)),title=db.siteSettings.homeSections.find(section=>section.id==='schedule')?.title||'This Month Schedule';
  const cards=homepageScheduleArtists().map((artist,index)=>`<article class="schedule-card ${artistScheduleCardClass(artist.id,index)}"><div class="schedule-card-head" style="background:${artistDisplayColor(artist.id,index)};color:#fff"><h3>${escapePageText(artist.name)}</h3><p>${escapePageText(artist.role||'')}</p></div>${compactSchedule(monthly.filter(event=>itemMatchesArtist(event,artist.id)))}</article>`).join('');
  return `<section class="section home-schedules"><div class="container"><div class="section-head"><div><h2>${escapePageText(title)}</h2></div><a class="btn outline" href="#schedule">View calendar ➚</a></div><div class="schedule-columns dynamic-schedule-columns">${cards}</div></div></section>`;
};
artistCards=function(){
  const cards=homepageOrderedArtists();
  return `<div class="artists homepage-artist-grid">${cards.map(artist=>`<article class="artist-card" onclick="location.hash='/${artistPublicSlug(artist.id)}'"><div class="portrait" style="background:${artist.color}">${artist.image?`<img src="${escapePageText(artist.image)}" alt="${escapePageText(artist.name)}">`:`<span>${escapePageText(artist.initial||artist.name.slice(0,2))}</span>`}</div><div class="artist-meta"><span class="arrow">➚</span><h3>${escapePageText(artist.name)}</h3><p>${escapePageText(artist.role||'')}</p></div></article>`).join('')}</div>`;
};
function renderManagedPageTitleEditor(){
  const titles=ensureManagedPageTitles(),labels={artists:'Artists',schedule:'Schedule',presenters:'Presenters',awards:'Awards',projects:'Projects',auausave:'AUAUSAVE',auau:'AUAU',save:'SAVE',mhiipraew:'Mhii Praew'};
  return `<section class="panel managed-page-title-editor"><div class="panel-head"><div><small>PAGE CONTENT</small><h2>หัวข้อหลักของแต่ละหน้า</h2><p class="master-note">รองรับภาษาไทยและอังกฤษ ระบบจะตัดช่องว่างหัวท้ายก่อนบันทึก และใช้ชื่อปัจจุบันเมื่อเว้นว่าง</p></div></div><form onsubmit="saveManagedPageTitles(event)"><div class="form-grid">${Object.entries(labels).map(([key,label])=>`<div class="field"><label>${label}</label><input name="${key}" value="${escapePageText(titles[key])}" placeholder="${escapePageText(DEFAULT_MANAGED_PAGE_TITLES[key])}"><small class="managed-title-preview">${escapePageText(titles[key])}</small></div>`).join('')}</div><div class="form-actions"><button class="btn" type="submit">บันทึกหัวข้อทั้งหมด</button></div></form></section>`;
}
function saveManagedPageTitles(event){event.preventDefault();const data=new FormData(event.currentTarget),titles=ensureManagedPageTitles();Object.keys(DEFAULT_MANAGED_PAGE_TITLES).forEach(key=>{titles[key]=String(data.get(key)||'').trim()||DEFAULT_MANAGED_PAGE_TITLES[key]});save();pageContentAdmin();toast('บันทึกหัวข้อหลักแล้ว')}
const pageContentAdminBeforeManagedTitles=pageContentAdmin;
pageContentAdmin=function(){pageContentAdminBeforeManagedTitles();if(!adminAuthenticated||adminTab!=='pagecontent')return;document.querySelector('.admin-main')?.insertAdjacentHTML('beforeend',renderManagedPageTitleEditor());document.querySelectorAll('.managed-page-title-editor input').forEach(input=>input.addEventListener('input',()=>{input.parentElement.querySelector('.managed-title-preview').textContent=input.value.trim()||input.placeholder}))};
const openPageTextEditorBeforeNoEyebrow=openPageTextEditor;
openPageTextEditor=function(page,language){openPageTextEditorBeforeNoEyebrow(page,language);document.querySelector('#modal [name="eyebrow"]')?.closest('.field')?.remove()};
const editHomeSectionBeforeNoEyebrow=editHomeSection;
editHomeSection=function(id){editHomeSectionBeforeNoEyebrow(id);document.querySelector('#modal [name="eyebrow"]')?.closest('.field')?.remove()};
const PUBLIC_HEADING_EYEBROW_SELECTOR='.hero .hero-grid .eyebrow,.page-hero>.container>.eyebrow,.project-detail-hero>.container>.eyebrow,.couple-profile .eyebrow,.artist-profile-copy>.eyebrow,.profile-head .eyebrow,.section-head>div>.eyebrow,.filmography-head>small';
function removePublicHeadingEyebrows(root=document){
  if(root.nodeType===1&&root.matches?.(PUBLIC_HEADING_EYEBROW_SELECTOR))root.remove();
  root.querySelectorAll?.(PUBLIC_HEADING_EYEBROW_SELECTOR).forEach(element=>element.remove());
}
function applySimplifiedPublicContent(){
  ensureManagedPageTitles();
  document.querySelectorAll('.artist-card .tag,.schedule-card-head>span').forEach(element=>element.remove());
  removePublicHeadingEyebrows();
  const pageKey=route.startsWith('/')?({AT01:'auausave',AT02:'auau',AT03:'save',AT04:'mhiipraew'}[artistIdFromPublicRoute(route)]):route,title=db.siteSettings.pageTitles[pageKey],heading=document.querySelector('.page-hero h1,.project-hub-hero h1');
  if(title&&heading)heading.textContent=title;
  if(route.startsWith('/')){const profileTitle=document.querySelector('.couple-profile h1,.artist-profile-copy h1,.profile-head h1');if(title&&profileTitle)profileTitle.textContent=title}
}
const routerBeforeSimplifiedContent=router;
router=function(){routerBeforeSimplifiedContent();applySimplifiedPublicContent()};
const publicEyebrowObserver=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(removePublicHeadingEyebrows)));
publicEyebrowObserver.observe(app,{childList:true,subtree:true});
ensureManagedPageTitles();
router();

/* One language-neutral title/description source for managed public pages. */
const renderLegacyPageLanguageSettings=renderPageLanguageSettings;
renderPageLanguageSettings=function(onlyPage=''){
  if(!UNIFIED_PAGE_CONTENT_KEYS.has(onlyPage))return renderLegacyPageLanguageSettings(onlyPage);
  ensureUnifiedPageContent();
  const labels={artists:'Artists',schedule:'Schedule',presenters:'Presenters',awards:'Awards'},content=db.siteSettings.pageCopy[onlyPage];
  return `<section class="panel unified-page-content-settings" data-page-content-settings="${onlyPage}"><div class="panel-head"><div><small>PAGE CONTENT</small><h2>หัวข้อและคำอธิบายหน้า ${labels[onlyPage]}</h2><p class="master-note">กรอกภาษาใดก็ได้ตามที่ต้องการ ข้อความนี้เป็นข้อมูลชุดเดียวที่หน้าบ้านนำไปแสดง</p></div><button class="btn outline" onclick="openUnifiedPageContentEditor('${onlyPage}')">แก้ไขข้อความ</button></div><div class="unified-page-content-preview"><small>PREVIEW</small><h3>${escapePageText(content.title)}</h3><p>${escapePageText(content.description)}</p></div></section>`;
};
function openUnifiedPageContentEditor(page){
  ensureUnifiedPageContent();
  const content=db.siteSettings.pageCopy[page],labels={artists:'Artists',schedule:'Schedule',presenters:'Presenters',awards:'Awards'};
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h2>แก้ไขหน้า ${labels[page]}</h2><button class="close" onclick="closeModal()">×</button></div><form onsubmit="saveUnifiedPageContent(event,'${page}')"><div class="form-grid"><div class="field full"><label>หัวข้อ</label><textarea name="title" required>${escapePageText(content.title)}</textarea></div><div class="field full"><label>คำอธิบาย</label><textarea name="description" rows="4">${escapePageText(content.description)}</textarea></div></div><div class="form-actions"><button type="button" class="btn outline" onclick="closeModal()">ยกเลิก</button><button class="btn" type="submit">บันทึกข้อความ</button></div></form></div></div>`);
}
async function saveUnifiedPageContent(event,page){
  event.preventDefault();
  ensureUnifiedPageContent();
  const formElement=event.currentTarget,button=formElement.querySelector('[type="submit"]'),form=new FormData(formElement),defaults=UNIFIED_PAGE_CONTENT_DEFAULTS[page],previous=structuredClone(db.siteSettings.pageCopy[page]);
  db.siteSettings.pageCopy[page]={
    title:String(form.get('title')||'').trim()||defaults.title,
    description:String(form.get('description')||'').trim(),
    updatedAt:Date.now()
  };
  ensureUnifiedPageContent();
  button.disabled=true;
  button.textContent='กำลังบันทึก...';
  save(false);
  const synced=await syncDatabaseInBackground();
  if(!synced){
    db.siteSettings.pageCopy[page]=previous;
    save(false);
    button.disabled=false;
    button.textContent='บันทึกข้อความ';
    toast('บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง');
    return;
  }
  closeModal();admin();toast('บันทึกหัวข้อและคำอธิบายแล้ว');
}
const pageContentAdminBeforeUnifiedCleanup=pageContentAdmin;
pageContentAdmin=function(){
  pageContentAdminBeforeUnifiedCleanup();
  document.querySelector('.managed-page-title-editor')?.remove();
};
function applyUnifiedPublicPageContent(){
  const page={artists:'artists',schedule:'schedule',presenters:'presenters',awards:'awards'}[route];
  if(!page)return;
  ensureUnifiedPageContent();
  const content=db.siteSettings.pageCopy[page],hero=document.querySelector('.page-hero'),heading=hero?.querySelector('h1'),description=hero?.querySelector('p');
  if(heading)heading.textContent=content.title;
  if(description)description.textContent=content.description;
  if(page==='schedule'){
    const mobileHeading=document.querySelector('.mobile-calendar-title h1');
    if(mobileHeading)mobileHeading.textContent=content.title;
  }
}
const calendarPageBeforeUnifiedContent=calendarPage;
calendarPage=function(){calendarPageBeforeUnifiedContent();applyUnifiedPublicPageContent()};
const routerBeforeUnifiedPageContent=router;
router=function(){routerBeforeUnifiedPageContent();applyUnifiedPublicPageContent()};
ensureUnifiedPageContent();
try{localStorage.setItem('auausave-house-db-v9',JSON.stringify(db))}catch(error){console.warn('Page content cache cleanup:',error.message)}
router();

/* Always attach managed page copy after every other admin renderer has finished. */
const adminBeforeFinalPageContentPlacement=admin;
admin=function(){
  adminBeforeFinalPageContentPlacement();
  if(!adminAuthenticated)return;
  const pageByTab={artists:'artists',events:'schedule',presenters:'presenters',awards:'awards'},page=pageByTab[adminTab],main=document.querySelector('.admin-main'),top=main?.querySelector('.admin-top');
  document.querySelectorAll('[data-page-content-settings]').forEach(panel=>panel.remove());
  if(page&&top)top.insertAdjacentHTML('afterend',renderPageLanguageSettings(page));
  document.querySelectorAll('.sidebar .side-nav button').forEach(button=>{
    const action=button.getAttribute('onclick')||'',text=button.textContent.trim();
    if(action.includes("adminTab='pagecontent'")||text==='Homepage Content')button.innerHTML='▤ &nbsp; Homepage';
    if(action.includes("adminTab='artists'")||text==='Profiles'||text==='จัดการศิลปิน')button.innerHTML='◉ &nbsp; Artist';
  });
};

/* Card order controls use the same persistent up/down pattern as homepage sections. */
renderHomepageArtistOrderEditor=function(){
  const artists=homepageOrderedArtists();
  return `<section class="panel homepage-artist-order-editor"><div class="panel-head"><div><small>ARTIST CARDS ORDER</small><h2>จัดลำดับการ์ดศิลปิน</h2><p class="master-note">ลากการ์ดหรือใช้ปุ่มขึ้น–ลง ระบบบันทึกลำดับทันทีเหมือนส่วนจัดลำดับหน้าแรก</p></div></div><div class="section-builder-list homepage-card-order-list">${artists.map((artist,index)=>`<article class="builder-item" draggable="true" ondragstart="homeArtistDragStart(event,'${artist.id}')" ondragover="event.preventDefault()" ondrop="homeArtistDrop(event,'${artist.id}')"><div class="builder-order"><button type="button" onclick="moveHomepageArtistCard('${artist.id}',-1)" ${index===0?'disabled':''}>↑</button><span>${String(index+1).padStart(2,'0')}</span><button type="button" onclick="moveHomepageArtistCard('${artist.id}',1)" ${index===artists.length-1?'disabled':''}>↓</button></div><div class="home-artist-sort-thumb" style="background:${artist.color}">${artist.image?`<img src="${escapePageText(artist.image)}" alt="">`:`<span>${escapePageText(artist.initial||artist.name.slice(0,2))}</span>`}</div><div class="builder-content"><small>ARTIST CARD</small><h3>${escapePageText(artist.name)}</h3><p>${escapePageText(artist.role||'')}</p></div></article>`).join('')}</div></section>`;
};
renderHomepageScheduleOrderEditor=function(){
  const artists=homepageScheduleArtists();
  return `<section class="panel homepage-schedule-order-editor"><div class="panel-head"><div><small>SCHEDULE CARD ORDER</small><h2>จัดลำดับกลุ่มตารางงาน</h2><p class="master-note">ลากการ์ดหรือใช้ปุ่มขึ้น–ลง ระบบบันทึกลำดับทันทีเหมือนส่วนจัดลำดับหน้าแรก</p></div></div><div class="section-builder-list homepage-card-order-list">${artists.map((artist,index)=>`<article class="builder-item" draggable="true" ondragstart="homeScheduleDragStart(event,'${artist.id}')" ondragover="event.preventDefault()" ondrop="homeScheduleDrop(event,'${artist.id}')"><div class="builder-order"><button type="button" onclick="moveHomepageScheduleCard('${artist.id}',-1)" ${index===0?'disabled':''}>↑</button><span>${String(index+1).padStart(2,'0')}</span><button type="button" onclick="moveHomepageScheduleCard('${artist.id}',1)" ${index===artists.length-1?'disabled':''}>↓</button></div><div class="home-schedule-sort-thumb ${artistScheduleCardClass(artist.id,index)}" style="background:${artistDisplayColor(artist.id,index)};color:#fff"><b>${escapePageText(artist.name)}</b></div><div class="builder-content"><small>SCHEDULE GROUP</small><h3>${escapePageText(artist.name)}</h3><p>${escapePageText(artist.role||'')}</p></div></article>`).join('')}</div></section>`;
};

/* Fanbase social entries mirror artist socials: platform + URL only. */
function fanbaseAccountLabel(link){
  if(String(link.username||'').trim())return String(link.username).trim();
  try{
    const url=new URL(link.url),parts=url.pathname.split('/').filter(Boolean),value=decodeURIComponent(parts.at(-1)||url.hostname.replace(/^www\./,''));
    return value.startsWith('@')?value:`@${value}`;
  }catch{return''}
}
fanbaseSocialButton=function(link){
  const platform=escapePageText(link.platformName||link.displayLabel||'Social'),account=escapePageText(fanbaseAccountLabel(link));
  return `<a class="fanbase-social-button fanbase-social-square" href="${escapePageText(link.url)}" target="_blank" rel="noopener noreferrer"><span>${platform}</span>${account?`<small>${account}</small>`:''}<b>↗</b></a>`;
};
fanbaseLinkEditor=function(link={},index=0){
  return `<article class="fanbase-link-editor" draggable="true" ondragstart="fanbaseLinkDragStart(event)" ondragover="fanbaseLinkDragOver(event)" ondrop="fanbaseLinkDrop(event)"><header><b>ช่องทาง ${index+1}</b><button type="button" onclick="this.closest('.fanbase-link-editor').remove();reindexFanbaseLinks()">ลบ</button></header><div class="form-grid fanbase-simple-fields"><div class="field"><label>ชื่อแพลตฟอร์ม</label><input data-platform value="${escapePageText(link.platformName||link.displayLabel||'')}" placeholder="X, Instagram, TikTok…" required></div><div class="field"><label>ลิงก์</label><input data-url type="url" value="${escapePageText(link.url||'')}" placeholder="https://..." required></div><input data-order type="hidden" value="${index+1}"></div></article>`;
};
saveFanbaseForm=function(event,id){
  event.preventDefault();
  const form=event.target,links=[...form.querySelectorAll('.fanbase-link-editor')].map((card,index)=>({platformName:card.querySelector('[data-platform]').value.trim(),url:card.querySelector('[data-url]').value.trim(),linkType:'external',active:true,displayOrder:index+1}));
  if(links.some(link=>!link.platformName))return alert('กรุณากรอกชื่อแพลตฟอร์มให้ครบ');
  if(links.some(link=>!/^https?:\/\/[^\s]+$/i.test(link.url)))return alert('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
  const old=db.siteSettings.fanbases.find(item=>item.id===id),item={id:id||`fanbase_${Date.now()}`,displayName:form.displayName.value.trim(),username:form.username.value.trim(),description:form.description.value.trim(),accentColor:form.accentColor.value,active:form.active.value==='true',socialLinks:links,displayOrder:old?.displayOrder||db.siteSettings.fanbases.length+1};
  old?Object.assign(old,item):db.siteSettings.fanbases.push(item);
  save();closeModal();fanbaseAdmin();toast('บันทึก Fanbase แล้ว');
};
