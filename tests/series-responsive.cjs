const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(){
 const c=vm.createContext({URL,Intl,Date,console,document:{addEventListener(){}},escapePageText:value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),validTimelineUrl:value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}}});
 c.window=c;
 for(const path of ['series/types.js','series/components/shared.js','series/components/related-content.js','series/components/responsive-detail.js'])vm.runInContext(fs.readFileSync(path,'utf8'),c);
 return c.SeriesFeature.detailView;
}
test('status derives completion from final metadata/date and does not treat a partial list as finished',()=>{
 const D=setup();
 assert.equal(D.status({status:'ON AIR',episodes:[{episode_number:12,keyword:'LAST CHAPTER',air_date:'2026-11-14'}]},'2026-11-26'),'COMPLETED');
 assert.equal(D.status({status:'ON AIR',episodes:[{episode_number:6,air_date:'2026-10-10'}]},'2026-11-26'),'ON AIR');
 assert.equal(D.status({status:'ON AIR',episodes:[{episode_number:12,keyword:'LAST CHAPTER',air_date:'2026-11-14'}]},'2026-11-14'),'ON AIR');
 assert.equal(D.status({status:'UPCOMING',premiere_date:'2027-01-01',episodes:[]},'2026-11-26'),'UPCOMING');
 assert.equal(D.status({status:'COMPLETED',episodes:[]},'2026-11-26'),'COMPLETED');
});
test('page themes accept safe colors and fall back for missing, injected or low-contrast values',()=>{
 const D=setup();assert.deepEqual({...D.theme({})},{bg:'#1C1A22',accent:'#E8D49B'});
 assert.deepEqual({...D.theme({theme_bg:'#221833',theme_accent:'#E8D49B'})},{bg:'#221833',accent:'#E8D49B'});
 assert.equal(D.theme({theme_bg:'red; background:url(javascript:x)'}).bg,'#1C1A22');
 assert.equal(D.theme({theme_bg:'#ffffff',theme_accent:'#ffffff'}).bg,'#1C1A22');
});
test('watch actions prefer actual iQIYI links and never mistake a teaser for the episode',()=>{
 const D=setup();const links=[{type:'WATCH',label:'Teaser EP.1',url:'https://youtu.be/teaser'},{type:'WATCH',label:'YouTube',url:'https://youtube.com/watch?v=episode'},{type:'WATCH',label:'iQIYI',url:'https://www.iq.com/play/episode'}];
 assert.equal(D.watchLink(links).url,'https://www.iq.com/play/episode');
 assert.equal(D.watchLink([links[0]]),null);assert.equal(D.watchLink([{type:'WATCH',url:'javascript:alert(1)'}]),null);
});
test('swipe intent requires horizontal travel and supports deliberate flicks without intercepting vertical scroll',()=>{
 const D=setup();
 assert.equal(D.swipeDirection({dx:-100,dy:8,duration:500,width:390}),1);
 assert.equal(D.swipeDirection({dx:100,dy:8,duration:500,width:390}),-1);
 assert.equal(D.swipeDirection({dx:28,dy:2,duration:40,width:390}),-1);
 assert.equal(D.swipeDirection({dx:22,dy:100,duration:150,width:390}),0);
 assert.equal(D.swipeDirection({dx:20,dy:1,duration:900,width:390}),0);
});
test('responsive markup keeps real counts, safe links, accessible controls and all source records',()=>{
 const D=setup();const item={id:'one',slug:'one',title_en:'<Series>',description:'A synopsis',status:'COMPLETED',episodes:[{id:'ep1',episode_number:1,title:'Episode',air_date:'2026-01-01',links:[]}],cast:[],links:[],media:Array.from({length:10},(_,n)=>({id:'m'+n,type:n%2?'BTS':'OST',date:'2026-01-01',title:'Media '+n,official_url:'https://example.com/'+n})),appearances:[],moments:[]};
 const before=JSON.stringify(item),html=D.render(item,[item]);assert.ok(html.includes('&lt;Series&gt;'));assert.ok(!html.includes('<Series>'));
 assert.ok(html.includes('role="tablist"'));assert.ok(html.includes('aria-expanded='));assert.ok(html.includes('Load more'));
 assert.ok(html.includes('10'));assert.equal(JSON.stringify(item),before);
});
