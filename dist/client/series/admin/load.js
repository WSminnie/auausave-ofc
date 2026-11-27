/* Series editors are downloaded only when an editor is actually requested. */
(() => {
  const S=SeriesFeature,base=new URL('./',document.currentScript?.src||new URL('/series/admin/load.js',location.href));
  const files=['form-fields.js','repeatable-rows.js','master-data.js','series-form.js','episode-form.js','appearance-form.js','media-form.js','moment-form.js','image-integration.js','editor.js','publication.js','reordering.js','management.js'];
  const loaded=new Set();let loading;
  const active=()=> (window.PublicRoutes?.resolve(location)||location.hash.slice(1))==='admin'&&adminTab==='series';
  const load=()=>loading||=(async()=>{
    for(const file of files){if(loaded.has(file))continue;await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL(file+'?v=20261127-progressive',base);script.onload=()=>{loaded.add(file);resolve();};script.onerror=()=>{script.remove();reject(new Error('Could not download the Series editor.'));};document.body.appendChild(script);});}
  })().catch(error=>{loading=null;throw error;});
  const stub={async render(){
    app.innerHTML=`<div class="admin"><div class="admin-shell">${adminSidebarMarkup()}<main class="admin-main series-admin"><h1>SERIES MANAGEMENT</h1><p role="status">Loading Series editor…</p></main></div></div>`;
    try{await load();if(active()&&adminAuthenticated)await S.admin.render();}
    catch(error){if(!active())return;const main=app.querySelector('.series-admin');main.innerHTML='<h1>Series editor could not load</h1><p>Please check your connection and try again.</p><button class="btn" data-editor-retry>Try again</button>';main.querySelector('[data-editor-retry]').addEventListener('click',()=>stub.render());}
  }};
  S.admin=stub;S.loadAdmin=load;
  S.openEditor=async(...args)=>{await load();if(active())return S.openEditor(...args);};
})();
