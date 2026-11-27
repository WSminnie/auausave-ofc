// Keep the direct /series/ entry identical to the public app shell. No JS redirect.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
fs.writeFileSync(path.join(root,'series/index.html'),fs.readFileSync(path.join(root,'index.html')));
console.log('Synced the direct Series entry.');
