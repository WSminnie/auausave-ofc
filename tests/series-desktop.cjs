const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const c=vm.createContext({URL,Intl,Date,console,location:new URL('https://example.test/series/example'),document:{addEventListener(){}},escapePageText:v=>String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),validTimelineUrl:v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}}});c.window=c;
 for(const file of ['series/types.js','series/components/shared.js','series/components/related-content.js','series/components/responsive-detail.js','series/components/detail-footer.js','series/components/desktop-detail.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 return c.SeriesFeature;
}
function item(){return {id:'one',slug:'example',title_en:'Example <series>',title_th:'เรื่องราว',status:'COMPLETED',premiere_date:'2025-01-01',description:'Full synopsis',broadcast_info:'TV info',streaming_info:'Uncut info',official_hashtag:'#Example',cast:[{artist_name:'Artist',character_name:'Character'}],links:[{label:'Official on X',url:'https://x.com/example'}],episodes:Array.from({length:12},(_,i)=>({id:'ep'+i,episode_number:i+1,air_date:'2025-01-01',title:'Episode '+(i+1),description:'Episode synopsis',keyword:'CHAPTER '+i,hashtag:'#Episode'+i,links:[{label:'YOUTUBE',type:'WATCH',url:'https://youtube.com/watch?v=ep'+i},{label:'iQIYI',type:'WATCH',url:'https://www.iq.com/play/ep'+i},{label:'Teaser',type:'WATCH',url:'https://youtu.be/teaser'+i}]})),media:Array.from({length:20},(_,i)=>({id:'m'+i,title:'Content '+i,type:i%2?'BTS':'OST',official_url:'https://youtu.be/content'+i,date:'2025-01-01'})),appearances:[],moments:[]};}
test('desktop variant previews four episodes, keeps complete tab data and exposes counted true tabs',()=>{
 const S=setup(),record=item(),html=S.desktopView.render(record,[record]);
 assert.equal((html.match(/data-dd-episode="overview"/g)||[]).length,4);assert.equal((html.match(/data-dd-episode="episodes"/g)||[]).length,12);
 assert.match(html,/role="tablist"/);assert.match(html,/aria-controls="dd-panel-episodes"/);assert.match(html,/All 12 episodes/);assert.match(html,/>Load more<\/button>/);assert.match(html,/Example &lt;series&gt;/);assert.doesNotMatch(html,/CHAPTER|YOUTUBE|View official source/);
});
test('desktop related cards are safe single links, and missing sources stay noninteractive',()=>{
 const S=setup(),card=S.desktopView.relatedCard({title:'A <clip>',category:'OST',url:'https://youtu.be/clip',date:'2025-01-01'});
 assert.equal((card.match(/<a\b/g)||[]).length,1);assert.match(card,/target="_blank" rel="noopener noreferrer"/);assert.match(card,/A &lt;clip&gt;/);assert.doesNotMatch(S.desktopView.relatedCard({title:'No source',category:'BTS',url:'javascript:alert(1)'}),/<a\b|href=/);
});
test('desktop uses the current shared buttons/status and respects broadcast visibility',()=>{
 const S=setup(),record={...item(),primary_button_text:'Watch here',primary_button_url:'https://example.com/watch',secondary_button_text:'Tickets',secondary_button_url:'https://example.com/tickets',show_broadcast_info:false,show_streaming_info:false};
 const html=S.desktopView.render(record,[record]);assert.match(html,/COMPLETED/);assert.match(html,/Watch here/);assert.match(html,/aria-label="Tickets/);assert.doesNotMatch(html,/<dt>TV<\/dt>|<dt>UNCUT<\/dt>/);
});
test('creator footer contains three real creator links and common branding',()=>{
 const S=setup(),html=S.components.detailFooter();assert.match(html,/Website created by/);assert.equal((html.match(/class="series-creator-link /g)||[]).length,3);assert.match(html,/@AuauSaveHouseTH/);assert.match(html,/@AUAUTNPOFC/);assert.match(html,/@SAVEWRG_OFC/);assert.match(html,/MADE FOR EVERY FAN/);
});
