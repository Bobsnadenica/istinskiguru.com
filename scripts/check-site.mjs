import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const roots=(await readdir(root)).filter(f=>f.endsWith('.html'));
const profiles=(await readdir('profiles')).map(f=>`profiles/${f}/index.html`);
const cache=new Map();
async function html(file){if(!cache.has(file))cache.set(file,await readFile(file,'utf8'));return cache.get(file);}
let links=0;
for(const file of [...roots,...profiles]){
 const source=await html(file);
 assert.equal((source.match(/<h1(?:\s|>)/g)||[]).length,1,`${file}: one main title`);
 assert.ok(source.includes('Основна навигация'),`${file}: shared navigation`);
 for(const match of source.matchAll(/(?:href|src)="([^"]+)"/g)){
  const raw=match[1].replaceAll('&amp;','&');
  const url=new URL(raw,`https://www.istinskiguru.com/${file}`);
  if(url.origin!=='https://www.istinskiguru.com')continue;
  const pathname=decodeURIComponent(url.pathname).replace(/^\//,'');
  const target=!pathname?'index.html':pathname.endsWith('/')?pathname+'index.html':pathname;
  assert.ok((await stat(path.join(root,target))).isFile(),`${file}: missing ${target}`);
  if(url.hash && target.endsWith('.html')){
   const id=decodeURIComponent(url.hash.slice(1));
   assert.ok((await html(target)).includes(`id="${id}"`),`${file}: missing anchor ${target}#${id}`);
  }
  links++;
 }
}
const data=JSON.parse((await readFile('site-data.js','utf8')).replace(/^window.__GURU_PROFILES__=/,'').replace(/;\s*$/,''));
for(const [file,reviewed] of [['index.html',true],['gallery.html',false]]){
 const source=await html(file);
 const ids=[...source.matchAll(/<article class="investigation-card"[\s\S]*?<a href="\/profiles\/([^/]+)\//g)].map(m=>m[1]);
 assert.deepEqual(ids.toSorted(),data.filter(p=>Boolean(p.reviewHtml)===reviewed).map(p=>p.id).toSorted());
 assert.ok(!source.includes('site-data.js')&&!source.includes('gallery-detail'),`${file}: direct links without modal payload`);
}
for(const p of data.filter(p=>p.reviewHtml)){
 const source=await html(`profiles/${p.id}/index.html`);
 assert.ok(source.includes(p.reviewHtml.replace(/[ \t]+$/gm, "")),`${p.id}: complete sourced review retained`);
 assert.ok(source.includes(p.shareImage),`${p.id}: share image preserved`);
 assert.ok(!source.includes('/site-intro.js')&&!source.includes('/page-effects.js'),`${p.id}: no distractions`);
}
console.log(`Passed: ${roots.length+profiles.length} pages, ${links} local links/assets, ${data.filter(p=>p.reviewHtml).length} complete sourced reviews, static directory coverage.`);
