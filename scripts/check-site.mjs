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
for(const file of ['index.html','gallery.html']){
 const source=await html(file);
 const ids=[...source.matchAll(/<article class="investigation-card"[\s\S]*?<a href="\/profiles\/([^/]+)\//g)].map(m=>m[1]);
 assert.deepEqual(ids.toSorted(),data.filter(p=>file==='index.html'||!p.reviewHtml).map(p=>p.id).toSorted());
 assert.ok(!source.includes('site-data.js')&&!source.includes('gallery-detail'),`${file}: direct links without modal payload`);
}
for(const p of data.filter(p=>p.reviewHtml)){
 const source=await html(`profiles/${p.id}/index.html`);
 assert.ok(source.includes(p.reviewHtml.replace(/[ \t]+$/gm, "")),`${p.id}: complete sourced review retained`);
 assert.ok(source.includes(p.shareImage),`${p.id}: share image preserved`);
 assert.ok(!source.includes('/site-intro.js')&&!source.includes('/page-effects.js'),`${p.id}: no distractions`);
}
console.log(`Passed: ${roots.length+profiles.length} pages, ${links} local links/assets, ${data.filter(p=>p.reviewHtml).length} complete sourced reviews, static directory coverage.`);
// The collection must remain complete, source-backed and distinct from a person profile.
const directoryReview=JSON.parse(await readFile('assets/Фирмени връзки/review.json','utf8'));
const {renderCompanyDirectory}=await import('../lib/company-directory.mjs');
const directoryHtml=await html('profiles/firmeni-vrazki/index.html');
assert.ok(directoryHtml.includes(renderCompanyDirectory(directoryReview).replace(/[ \t]+$/gm,'')),'Company directory matches reviewed source data');
const schema=JSON.parse(directoryHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(schema['@graph'][0]['@type'],'CollectionPage');
assert.ok(!schema['@graph'].some(item=>item['@type']==='Person'),'Directory is not a person');
const duplicate=structuredClone(directoryReview);
duplicate.companies.push(duplicate.companies[0]);
assert.throws(()=>renderCompanyDirectory(duplicate),/Duplicate company/);
const invalidSource=structuredClone(directoryReview);
invalidSource.companies[0].sources[0].url='javascript:alert(1)';
assert.throws(()=>renderCompanyDirectory(invalidSource),/Invalid company source/);
console.log(`Company directory: ${directoryReview.companies.length} sourced entries; unique identities and safe source links validated.`);
// Every subject gets a dated result; unresolved identity stays explicit rather than guessing an owner.
const checks=directoryReview.profileChecks;
assert.deepEqual(checks.map(c=>c.profile).toSorted(),data.filter(p=>p.id!=='firmeni-vrazki').map(p=>p.id).toSorted(),'All subjects included in company research');
for(const p of data.filter(p=>p.id!=='firmeni-vrazki')){
 const source=await html(`profiles/${p.id}/index.html`);
 assert.ok(p.companyCheckHtml && source.includes(p.companyCheckHtml.replace(/[ \t]+$/gm,'')),`${p.id}: sourced company check rendered`);
 assert.ok(directoryHtml.includes(`id="profile-${p.id}"`),`${p.id}: searchable directory entry`);
}
assert.ok(!directoryHtml.includes('Къде е Чилингиров'),'No person-focused comparison heading');
const badReference=structuredClone(directoryReview);
badReference.profileChecks[0].companies.push('000000000');
assert.throws(()=>renderCompanyDirectory(badReference),/Unknown company reference/);
const duplicateCheck=structuredClone(directoryReview);
duplicateCheck.profileChecks.push(duplicateCheck.profileChecks[0]);
assert.throws(()=>renderCompanyDirectory(duplicateCheck),/Duplicate profile check/);
console.log(`All ${checks.length} subject profiles have dated company research; source links and company references verified.`);
