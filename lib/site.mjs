import { promises as fs } from 'node:fs';
import path from 'node:path';

export const siteNav = (current = '') => `<header class="site-header"><a class="site-brand" href="/" aria-label="Истински гуру — начало"><span class="brand-mark" aria-hidden="true">ИГ</span>истински<span>гуру</span><span class="brand-dot">.</span></a><nav aria-label="Основна навигация">${[['/', 'Разследвания'], ['/scams.html', 'Тактики'], ['/contactus.html', 'Подай сигнал']].map(([url,label]) => `<a href="${url}"${current === url ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></header>`;
export const siteFooter = `<footer class="simple-footer"><div><a class="footer-brand" href="/">Истински гуру</a><p>Разследваме обещанията. Обясняваме риска.</p></div><nav aria-label="Допълнителна навигация"><a href="/saveti.html#help">При проблем</a><a href="/gallery.html">Архив</a><a href="/privacy.html">Поверителност</a><a href="/terms.html">Условия</a><a href="https://www.facebook.com/profile.php?id=61594111673410" target="_blank" rel="noopener noreferrer">Facebook ↗</a></nav></footer>`;
const escape = value => String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

// Cards are real HTML links: browsing remains available without JavaScript.
export async function writeDirectories(profiles, rootDir) {
  for (const [file, reviewed] of [['index.html', true], ['gallery.html', false]]) {
    const entries = profiles.filter(p => Boolean(p.reviewHtml) === reviewed)
      .sort((a,b) => (b.reviewedOn || '').localeCompare(a.reviewedOn || '') || a.name.localeCompare(b.name, 'bg'));
    const cards = entries.map(p => `<article class="investigation-card" data-search="${escape([p.name,p.description,p.kicker,...p.channels].join(' '))}"><a href="/profiles/${escape(p.id)}/"><div class="card-photo"><img src="/${escape(p.thumbnailImage)}" alt="${escape(p.alt)}" loading="lazy" decoding="async" width="520" height="340" /><span class="card-label">${reviewed ? 'По публични източници' : 'Архивен коментар'}</span></div><div class="card-body"><h3>${escape(p.name)}</h3><p>${escape(reviewed ? p.description : p.kicker)}</p><span class="card-bottom">${reviewed ? `<time datetime="${p.reviewedOn}">${p.reviewedOn.split('-').reverse().join('.')}</time>` : '<span>Редакционен архив</span>'}<span>${reviewed ? 'Прочети проверката' : 'Отвори профила'} ↗</span></span></div></a></article>`).join('\n');
    const target = path.join(rootDir,file);
    const html = await fs.readFile(target,'utf8');
    await fs.writeFile(target, html.replace(/<!-- directory:start -->[\s\S]*?<!-- directory:end -->/, `<!-- directory:start -->\n${cards}\n<!-- directory:end -->`));
  }
}
