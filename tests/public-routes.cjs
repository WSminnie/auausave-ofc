const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=fs.existsSync('public-routes.js')?require('../public-routes.js'):{};
test('Schedule clean and legacy URLs resolve without overriding other hashes',()=>{
  assert.equal(typeof api.resolve,'function');
  assert.equal(api.resolve({pathname:'/schedule',hash:''}),'schedule');
  assert.equal(api.resolve({pathname:'/schedule/',hash:''}),'schedule');
  assert.equal(api.resolve({pathname:'/',hash:'#schedule'}),'schedule');
  assert.equal(api.resolve({pathname:'/schedule',hash:'#home'}),'home');
  assert.equal(api.resolve({pathname:'/savewrg/schedule',hash:''}),'/SAVE');
});
test('all existing navigation and detail routes resolve from clean paths',()=>{
  for(const [pathname,want] of [
    ['/','home'],['/index.html','home'],['/projects/','projects'],['/presenters','presenters'],['/awards','awards'],['/artists','artists'],['/series','series'],['/series/index.html','series'],['/series/mr-fanboy','series/mr-fanboy'],['/project/example','project/example'],['/admin','admin'],
    ['/auausave','/AUAUSAVE'],['/auautnp','/AUAU'],['/savewrg/journey','/SAVE'],['/mhiipraew/awards','/MhiiPraew'],['/artist/custom-id','artist/custom-id'],
  ])assert.equal(api.resolve({pathname,hash:''}),want,pathname);
  for(const pathname of ['/not-a-page','/project','/project/a/b','/series/components/shared.js'])assert.equal(api.resolve({pathname,hash:''}),null,pathname);
});
test('legacy hashes become clean paths while retaining query parameters',()=>{
  for(const [hash,path] of [
    ['#home','/'],['#projects','/projects'],['#presenters','/presenters'],['#awards','/awards'],['#artists','/artists'],['#series/fanboy','/series/fanboy'],['#project/final-episode','/project/final-episode'],['#admin','/admin'],
    ['#/AUAUSAVE','/auausave'],['#/AUAU','/auautnp'],['#artist/AT03','/savewrg'],['#/SAVE/awards','/savewrg/awards'],['#/MhiiPraew','/mhiipraew'],
  ])assert.equal(api.canonicalHref('https://auausaveth.com/?utm_source=test'+hash),'https://auausaveth.com'+path+'?utm_source=test',hash);
});
test('static entries and dynamic-route recovery restore only known same-origin routes',()=>{
  assert.equal(api.canonicalHref('https://auausaveth.com/?__page=projects&utm_source=test'),'https://auausaveth.com/projects?utm_source=test');
  assert.equal(api.canonicalHref('https://auausaveth.com/?__route=%2Fproject%2Ffinal-episode&utm_source=test'),'https://auausaveth.com/project/final-episode?utm_source=test');
  assert.equal(api.canonicalHref('https://auausaveth.com/?__route=%2Fseries%2Ffanboy'),'https://auausaveth.com/series/fanboy');
  for(const value of ['https://example.com/projects','//example.com/projects','/unknown','/project/../admin']){
    const href='https://auausaveth.com/?__route='+encodeURIComponent(value);
    assert.equal(api.canonicalHref(href),href);
  }
});
test('malformed or ordinary fragment anchors are not interpreted as page routes',()=>{
  assert.equal(api.canonicalHref('https://auausaveth.com/projects#section-details'),'https://auausaveth.com/projects#section-details');
  assert.equal(api.canonicalHref('https://auausaveth.com/#/%E0%A4%A'),'https://auausaveth.com/#/%E0%A4%A');
  assert.equal(api.resolve({pathname:'/projects',hash:'#section-details'}),'projects');
});
test('Schedule entry and legacy links become clean URLs while retaining query parameters',()=>{
  assert.equal(typeof api.canonicalHref,'function');
  assert.equal(api.canonicalHref('https://auausaveth.com/?utm_source=test#schedule'),'https://auausaveth.com/schedule?utm_source=test');
  assert.equal(api.canonicalHref('https://auausaveth.com/?__page=schedule&utm_source=test'),'https://auausaveth.com/schedule?utm_source=test');
  assert.equal(api.canonicalHref('https://auausaveth.com/savewrg/journey'),'https://auausaveth.com/savewrg/journey');
});
