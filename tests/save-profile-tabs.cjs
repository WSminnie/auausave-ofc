const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=fs.existsSync('save-profile-tabs.js')?require('../save-profile-tabs.js'):{};
test('SAVE clean URLs resolve independently of host and query',()=>{
  for(const tab of ['profile','schedule','journey','awards']){
    assert.equal(typeof api.resolve,'function');
    assert.equal(api.resolve({pathname:'/savewrg/'+tab+'/',hash:''}),tab);
  }
  assert.equal(api.resolve({pathname:'/savewrg',hash:''}),'profile');
});
test('legacy SAVE aliases work; unrelated hashes take precedence',()=>{
  assert.equal(typeof api.resolve,'function');
  for(const hash of ['#/SAVE','#artist/save','#/savewrg'])assert.equal(api.resolve({pathname:'/',hash}),'profile');
  assert.equal(api.resolve({pathname:'/',hash:'#/SAVE/awards'}),'awards');
  assert.equal(api.resolve({pathname:'/savewrg/schedule',hash:'#home'}),null);
  assert.equal(api.resolve({pathname:'/',hash:'#/AUAUSAVE'}),null);
  assert.equal(api.resolve({pathname:'/savewrg/unknown',hash:''}),null);
  assert.equal(api.resolve({pathname:'/',hash:'#/%E0%A4%A'}),null);
});
test('other solo profiles get their own aliases and tab URLs; the couple is excluded',()=>{
  for(const [id,slug,hash] of [['AT02','auautnp','#/AUAU'],['AT04','mhiipraew','#/MhiiPraew']]){
    assert.equal(typeof api.resolveArtist,'function');
    assert.equal(api.resolveArtist({pathname:'/',hash}),id);
    for(const tab of ['profile','schedule','journey','awards']){
      assert.equal(api.resolve({pathname:'/'+slug+'/'+tab,hash:''}),tab);
      assert.equal(api.resolveArtist({pathname:'/'+slug+'/'+tab,hash:''}),id);
      assert.equal(api.path(tab,id),'/'+slug+(tab==='profile'?'':'/'+tab));
    }
  }
  assert.equal(api.resolveArtist({pathname:'/auausave/schedule',hash:''}),null);
  assert.equal(api.resolve({pathname:'/auautnp',hash:'#home'}),null);
});
test('tab URLs are canonical and invalid tabs fall back to profile',()=>{
  assert.equal(typeof api.path,'function');
  assert.equal(api.path('profile'),'/savewrg');
  assert.equal(api.path('schedule'),'/savewrg/schedule');
  assert.equal(api.path('unknown'),'/savewrg');
});
test('TikTok and Douyin share artwork but retain distinct names and groups',()=>{
  assert.equal(typeof api.socialMeta,'function');
  const tiktok=api.socialMeta('TikTok'),douyin=api.socialMeta('Douyin');
  assert.equal(tiktok.icon,douyin.icon);
  assert.equal(tiktok.label,'TikTok');assert.equal(douyin.label,'Douyin');
  assert.equal(tiktok.group,'global');assert.equal(douyin.group,'china');
  assert.equal(api.socialMeta('xiaohongshu').label,'RedNote');
  assert.equal(api.socialMeta('Instagram').group,'global');
  assert.equal(api.socialMeta('Weibo').group,'china');
  assert.equal(api.socialMeta('Future platform').icon,null);
});
test('saved hidden sections do not produce tabs',()=>{
  assert.equal(typeof api.availableTabs,'function');
  assert.deepEqual(api.availableTabs([{id:'events',visible:false},{id:'timeline',visible:false},{id:'awards',visible:false}],{series:false,awards:false}),['profile']);
  assert.deepEqual(api.availableTabs([],{events:false}),['profile','journey','awards']);
  assert.deepEqual(api.availableTabs([],{}),['profile','schedule','journey','awards']);
});
