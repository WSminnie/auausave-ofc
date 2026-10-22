const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
function setup(mobile=true){
  const gestures={},opened=[],slides=[0,1,2].map(index=>({dataset:{link:`https://example.com/${index}`},active:false,classList:{toggle(name,value){slides[index].active=value}},addEventListener(name,handler){this[name]=handler}}));
  const track={addEventListener(name,handler){gestures[name]=handler}};
  const banner={querySelectorAll(selector){return selector==='.home-banner-slide'?slides:[]},querySelector(selector){return selector==='.home-banner-track'?track:null}};
  const hero={insertAdjacentHTML(){}},main={querySelector(selector){return selector==='.hero'?hero:banner}};
  const ctx=vm.createContext({db:{siteSettings:{homeBanners:slides.map(()=>({type:'image',src:'test.jpg'}))}},document:{querySelector:()=>main},window:{matchMedia:()=>({matches:mobile}),open:url=>opened.push(url)},escapePageText:x=>x,clearTimeout(){},setTimeout(){return 1}});
  vm.runInContext(source.slice(source.indexOf('// Homepage media banner:'),source.indexOf('function homeBannerAdminPanel()')),ctx);
  ctx.renderHomeBanner();
  function swipe(x,y=0){gestures.touchstart({touches:[{clientX:100,clientY:100}]});gestures.touchend({touches:[],changedTouches:[{clientX:100+x,clientY:100+y}]});}
  return {slides,opened,gestures,swipe,active:()=>slides.findIndex(s=>s.active)};
}
test('mobile swipe goes forward and backward, wraps, and suppresses link clicks',()=>{
  const s=setup();s.swipe(-60);assert.equal(s.active(),1);s.slides[1].click();assert.equal(s.opened.length,0);
  s.swipe(60);assert.equal(s.active(),0);s.swipe(60);assert.equal(s.active(),2);
});
test('vertical scrolling, short movements and cancelled gestures do not change slides',()=>{
  const s=setup();s.swipe(15);s.swipe(-60,100);assert.equal(s.active(),0);
  s.gestures.touchstart({touches:[{clientX:100,clientY:100}]});s.gestures.touchcancel();s.gestures.touchend({touches:[],changedTouches:[{clientX:0,clientY:100}]});assert.equal(s.active(),0);
  s.slides[0].click();assert.equal(s.opened.length,1);
});
test('desktop touch gestures do not activate mobile swipe',()=>{
  const s=setup(false);s.swipe(-80);assert.equal(s.active(),0);
});
