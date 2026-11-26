const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const c=vm.createContext({URL,Intl,Date,console,document:{addEventListener(){}},escapePageText:v=>String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),validTimelineUrl:v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}},imageUploadTemplate:()=>''});
 c.window=c;
 for(const file of ['series/types.js','series/components/shared.js','series/components/series-overview.js','series/components/related-content.js','series/components/responsive-detail.js','series/admin/form-fields.js','series/admin/series-form.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 c.SeriesFeature.master={field:()=>''};c.SeriesFeature.repeat={group:kind=>`<section data-repeat="${kind}"></section>`};return c.SeriesFeature;
}
test('Series editor groups all three configurable buttons without repeatable Official Links',()=>{
 const S=setup(),html=S.forms.series({title_en:'Example',theme_bg:'#221833',theme_accent:'#E8D49B'},[],{links:[{label:'Official on X',url:'https://x.com/example'}],cast:[]});
 assert.match(html,/name="theme_bg"/);assert.match(html,/name="theme_accent"/);assert.equal((html.match(/type="color"/g)||[]).length,2);
 assert.match(html,/<legend>Series buttons<\/legend>/);assert.match(html,/name="tertiary_button_url"[^>]*value=""[^>]*placeholder="https:\/\/x.com\/example"/);assert.doesNotMatch(html,/name="official_x_url"|Official Links|data-repeat="links"/);assert.match(html,/data-repeat="cast"/);
});
test('secondary buttons accept arbitrary safe labels/links and each of the three buttons can be hidden',()=>{
 const S=setup(),item={id:'one',slug:'one',title_en:'Example',status:'ON AIR',cast:[],episodes:[],links:[{label:'Official on X',url:'https://x.com/example'}],media:[{type:'PILOT',official_url:'https://youtu.be/pilot',visible:true}],primary_button_text:'Watch now',primary_button_url:'https://example.com/watch',secondary_button_text:'Buy <tickets>',secondary_button_url:'https://example.com/tickets',tertiary_button_text:'Instagram',tertiary_button_url:'https://instagram.com/example'};
 const html=S.detailView.render(item,[item]);assert.match(html,/Buy &lt;tickets&gt;/);assert.match(html,/href="https:\/\/example.com\/tickets"/);assert.match(html,/Instagram/);assert.doesNotMatch(html,/Official Pilot|Official on X/);
 const hidden=S.detailView.render({...item,show_primary_button:false,show_secondary_button:false,show_tertiary_button:false},[item]);assert.doesNotMatch(hidden,/class="sd-button sd-button-primary"|class="sd-button sd-button-secondary"/);
 const values=S.forms.prepareSeries(item,item.links);assert.equal(values.record.tertiary_button_url,'https://instagram.com/example');assert.equal(values.links[0].url,'https://x.com/example','button configuration does not delete legacy official metadata');
 for(const key of ['secondary_button_url','tertiary_button_url'])assert.throws(()=>S.forms.prepareSeries({...item,[key]:'javascript:alert(1)'}),/https?/i);
 const automatic={...item,secondary_button_text:null,secondary_button_url:null,tertiary_button_text:null,tertiary_button_url:null};
 const form=S.forms.series(automatic,[],{links:item.links,media:item.media,cast:[]});assert.match(form,/name="secondary_button_url"[^>]*value=""[^>]*placeholder="https:\/\/youtu.be\/pilot"/);
 assert.equal(S.detailView.buttons({...automatic,media:[{...item.media[0],visible:false}]})[1].url,'','unpublishing an automatic Pilot removes its button');
});
test('legacy fixed-X payloads remain compatible and preserve non-X metadata',()=>{
 const S=setup(),input={id:'one',theme_bg:'#1F4B47',theme_accent:'#FFE14D',official_x_url:'https://x.com/example'};
 const result=S.forms.prepareSeries(input);assert.equal(result.record.theme_bg,'#1F4B47');assert.equal(result.record.official_x_url,undefined);assert.equal(result.links.length,1);assert.equal(result.links[0].label,'Official on X');assert.equal(input.official_x_url,'https://x.com/example');
 assert.equal(S.forms.prepareSeries({...input,official_x_url:''}).links.length,0);
 assert.throws(()=>S.forms.prepareSeries({...input,official_x_url:'https://example.com'}),/X or Twitter/);
 assert.throws(()=>S.forms.prepareSeries({...input,theme_bg:'#ffffff'}),/contrast|darker/i);
 assert.throws(()=>S.forms.prepareSeries({...input,theme_accent:'red;display:none'}),/hex/i);
 const existing=[{label:'Watch',type:'WATCH',url:'https://www.iq.com/play/example',display_order:1},{label:'Old account',url:'https://x.com/previous',display_order:0}];
 const preserved=S.forms.prepareSeries(input,existing);assert.equal(preserved.links.length,2);assert.ok(preserved.links.some(row=>row.url==='https://www.iq.com/play/example'));assert.equal(preserved.links.filter(row=>/x.com/.test(row.url)).length,1);assert.equal(existing[1].url,'https://x.com/previous');
});
test('mobile synopsis keeps hashtags without a duplicate X action',()=>{
 const S=setup(),item={id:'one',slug:'one',title_en:'Example',description:'Story',status:'ON AIR',official_hashtag:'#Example',cast:[],links:[{label:'Official on X',url:'https://x.com/example'}],episodes:[]};
 const html=S.detailView.render(item,[item]);assert.equal((html.match(/href="https:\/\/x.com\/example"/g)||[]).length,1);assert.match(html,/search\?q=%23Example/);assert.doesNotMatch(html,/sd-compact-title/);
});
test('TV and UNCUT visibility are independent on mobile and desktop without deleting their text',()=>{
 const S=setup(),base={id:'one',slug:'one',title_en:'Example',status:'COMPLETED',broadcast_info:'TV details',streaming_info:'Uncut details',cast:[],links:[],episodes:[]};
 for(const [tv,uncut] of [[true,true],[true,false],[false,true],[false,false]]){
  const item={...base,show_broadcast_info:tv,show_streaming_info:uncut};
  const mobile=S.detailView.render(item,[item]),desktop=S.components.hero(item);
  assert.equal(mobile.includes('<dt>TV</dt>'),tv);assert.equal(mobile.includes('<dt>UNCUT</dt>'),uncut);
  assert.equal(desktop.includes('TV details'),tv);assert.equal(desktop.includes('Uncut details'),uncut);
  assert.equal(mobile.includes('sd-broadcast'),tv||uncut);assert.equal(desktop.includes('<dl class="series-header-facts">'),tv||uncut);
  const prepared=S.forms.prepareSeries(item);assert.equal(prepared.record.show_broadcast_info,tv);assert.equal(prepared.record.show_streaming_info,uncut);assert.equal(prepared.record.broadcast_info,'TV details');assert.equal(prepared.record.streaming_info,'Uncut details');
 }
 const form=S.forms.series({...base,show_broadcast_info:false},[],{links:[],cast:[]});
 assert.match(form,/<input[^>]*type="checkbox"[^>]*name="show_broadcast_info"[^>]*>/);assert.match(form,/<input[^>]*name="show_streaming_info"[^>]*checked/);
 assert.doesNotMatch(form,/<input[^>]*name="show_broadcast_info"[^>]*checked/);
 assert.ok(S.detailView.render(base,[base]).includes('TV details'),'older records default to showing saved information');
});
test('main button settings override only its label and destination, with automatic fallback and URL validation',()=>{
 const S=setup(),item={id:'one',slug:'one',title_en:'Example',status:'COMPLETED',cast:[],links:[],episodes:[{episode_number:1,title:'First episode',air_date:'2025-01-01',links:[{label:'iQIYI',type:'WATCH',url:'https://www.iq.com/play/first'}]}]};
 assert.match(S.detailView.render(item,[item]),/Watch from EP\.1 on iQIYI/);
 const custom={...item,primary_button_text:'Watch <my series>',primary_button_url:'https://example.com/watch'};
 const html=S.detailView.render(custom,[custom]);assert.match(html,/class="sd-button sd-button-primary" href="https:\/\/example.com\/watch"/);assert.match(html,/Watch &lt;my series&gt;/);assert.match(html,/href="https:\/\/www.iq.com\/play\/first"/,'episode links retain their original destination');
 const form=S.forms.series(custom,[],{links:[],cast:[]});assert.match(form,/name="primary_button_text"/);assert.match(form,/name="primary_button_url"/);
 assert.throws(()=>S.forms.prepareSeries({...custom,primary_button_url:'javascript:alert(1)'}),/https?/i);
 const blank={...item,primary_button_text:null,primary_button_url:null};assert.match(S.detailView.render(blank,[blank]),/Watch from EP\.1 on iQIYI/);
});
