const fs=require('node:fs');
let html=fs.readFileSync('index.html','utf8');
html=html.replace(/(src|href)="((?:series\/|styles\.css|data\.js|event-participation\.js|app\.js)[^"]*)"/g,'$1="/$2"');
html=html.replace(/<script src="(?:https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^\"]*|supabase-[^\"]*)"><\/script>/g,'');
html=html.replace('</body>','<script src="/tests/event-participation-browser-fixture.js"></script></body>');
fs.mkdirSync('tmp',{recursive:true});fs.writeFileSync('tmp/event-participation-browser.html',html);
