const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const source=fs.readFileSync('app.js','utf8');
function context(){
 const c=vm.createContext({URL,db:{siteSettings:{fanbases:[]}},ensureFanbaseSocials(){},escapePageText:s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))});
 vm.runInContext(source.slice(source.indexOf('function validFanbaseUrl('),source.indexOf('const listingBeforeFanbases')),c);
 vm.runInContext(source.slice(source.indexOf('function fanbaseAccountLabel('),source.indexOf('fanbaseLinkEditor = function (link')),c);
 return c;
}
test('fanbase platform icons distinguish social brands and keep QR/chat labels useful',()=>{
 const c=context();
 for(const [name,icon] of [['X','brand-x'],['Instagram','brand-instagram'],['TikTok','brand-tiktok'],['Weibo','brand-weibo'],['WeChat ID','brand-wechat'],['LINE - open chat','brand-line']]){
  assert.equal(c.fanbasePlatform({platformName:name,url:'https://example.com/'}).icon,icon);
  assert.ok(fs.existsSync(`series/assets/icons/${icon}.svg`));
 }
 assert.match(c.fanbaseSocialButton({platformName:'WeChat',url:'https://drive.google.com/file/d/id/view'},'House'),/View QR code/);
 assert.match(c.fanbaseSocialButton({platformName:'LINE',url:'https://line.me/ti/g2/id'},'House'),/Join open chat/);
 assert.equal(c.fanbaseSocialButton({url:'javascript:alert(1)'}),'');
});
test('fanbase cards preserve active links/order and only show Follow for an active X destination',()=>{
 const c=context();
 c.db.siteSettings.fanbases=[{id:'fanbase_auau',displayName:'AUAU',username:'@AUAU',socialLinks:[{platformName:'X',url:'https://x.com/AUAU',displayOrder:2},{platformName:'Instagram',url:'https://instagram.com/AUAU',displayOrder:1},{platformName:'X',url:'https://x.com/hidden',active:false},{url:'javascript:alert(1)'}]}];
 const html=c.renderFanbaseSocials();
 assert.ok(html.indexOf('instagram.com')<html.indexOf('x.com/AUAU'));
 assert.match(html,/class="fanbase-follow" href="https:\/\/x.com\/AUAU"/);
 assert.doesNotMatch(html,/x.com\/hidden|javascript:/);
 c.db.siteSettings.fanbases[0].socialLinks[0].active=false;
 assert.doesNotMatch(c.renderFanbaseSocials(),/class="fanbase-follow"/);
});
