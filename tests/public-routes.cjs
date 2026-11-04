const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=fs.existsSync('public-routes.js')?require('../public-routes.js'):{};
test('Schedule clean and legacy URLs resolve without overriding other hashes',()=>{
  assert.equal(typeof api.resolve,'function');
  assert.equal(api.resolve({pathname:'/schedule',hash:''}),'schedule');
  assert.equal(api.resolve({pathname:'/schedule/',hash:''}),'schedule');
  assert.equal(api.resolve({pathname:'/',hash:'#schedule'}),'schedule');
  assert.equal(api.resolve({pathname:'/schedule',hash:'#home'}),null);
  assert.equal(api.resolve({pathname:'/savewrg/schedule',hash:''}),null);
});
test('Schedule entry and legacy links become clean URLs while retaining query parameters',()=>{
  assert.equal(typeof api.canonicalHref,'function');
  assert.equal(api.canonicalHref('https://auausaveth.com/?utm_source=test#schedule'),'https://auausaveth.com/schedule?utm_source=test');
  assert.equal(api.canonicalHref('https://auausaveth.com/?__page=schedule&utm_source=test'),'https://auausaveth.com/schedule?utm_source=test');
  assert.equal(api.canonicalHref('https://auausaveth.com/savewrg/journey'),'https://auausaveth.com/savewrg/journey');
});
