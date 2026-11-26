const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const c=vm.createContext({URL,Intl,Date,document:{addEventListener(){}},escapePageText:v=>String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),validTimelineUrl:v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}},imageUploadTemplate:()=>''});c.window=c;
 for(const file of ['series/types.js','series/components/shared.js','series/components/related-content.js','series/components/responsive-detail.js','series/components/desktop-detail.js','series/admin/form-fields.js','series/admin/media-form.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 return c.SeriesFeature;
}
test('media editor offers and retains HIGHLIGHT without removing existing types',()=>{
 const S=setup(),expected=['TRAILER','TEASER','PILOT','OST','MV','BTS','REACTION','HIGHLIGHT','SPECIAL','POSTER','OTHER'];
 assert.deepEqual(Array.from(S.types.media.types),expected);
 const html=S.forms.media({series_id:'one',type:'HIGHLIGHT',title:'Highlight EP.6'},[{id:'one',title_en:'Series'}]);
 assert.match(html,/<option value="HIGHLIGHT" selected>HIGHLIGHT<\/option>/);
});
test('highlight media appears under its own Related filter on mobile and desktop',()=>{
 const S=setup(),item={id:'one',slug:'one',title_en:'Series',episodes:[],media:[{id:'highlight',type:'HIGHLIGHT',title:'Highlight EP.6',official_url:'https://youtu.be/highlight'}]};
 assert.equal(S.components.relatedRows(item)[0].category,'HIGHLIGHT');
 assert.match(S.detailView.render(item,[item]),/data-sd-category="HIGHLIGHT"[^>]*>Highlight<\/button>/);
 assert.match(S.desktopView.render(item,[item]),/data-dd-category="HIGHLIGHT"[^>]*>Highlight<\/button>/);
});
