import { promises as fs } from 'node:fs';
import path from 'node:path';

export const siteNav = (current = '') => `<header class="site-header"><a class="site-brand" href="/" aria-label="Истински гуру — начало"><img class="brand-mark" src="/branding/facebook/mark.jpg" alt="" width="36" height="36" />истински<span>гуру</span><span class="brand-dot">.</span></a><nav aria-label="Основна навигация">${[['/', 'Разследвания'], ['/scams.html', 'Тактики'], ['/contactus.html', 'Подай сигнал']].map(([url,label]) => `<a href="${url}"${current === url ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></header>`;
export const siteFooter = `<footer class="simple-footer"><div><a class="footer-brand" href="/">Истински гуру</a><p>Разследваме обещанията. Обясняваме риска.</p></div><nav aria-label="Допълнителна навигация"><a href="/saveti.html#help">При проблем</a><a href="/gallery.html">Архив</a><a href="/privacy.html">Поверителност</a><a href="/terms.html">Условия</a><a href="https://www.facebook.com/profile.php?id=61594111673410" target="_blank" rel="noopener noreferrer">Facebook ↗</a></nav></footer>`;
export const followPanel = `<section class="follow-panel" aria-label="Следи новите разследвания"><div class="follow-identity"><img src="/branding/facebook/mark.jpg" alt="" width="48" height="48" /><div><strong>Истински гуру</strong><span>Разследвания · Тактики · Защита</span></div></div><h2>Следи новите проверки.</h2><p>Последвай ни за нови проверки и ясни обяснения на тактиките зад големите обещания.</p><a class="follow-button" href="https://www.facebook.com/profile.php?id=61594111673410" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M14 21v-8h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5c-.4-.1-1.7-.2-3-.2-3 0-5 1.8-5 5.2V9H7v4h3v8z"/></svg>Последвай във Facebook <span aria-hidden="true">↗</span></a><span class="follow-note">Публични източници. Конкретни факти.</span></section>`;
const escape = value => String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const reviewOrder = (a, b) => (b.reviewedOn || '').localeCompare(a.reviewedOn || '') || a.name.localeCompare(b.name, 'bg');
const investigations = profiles => profiles.filter(p => p.reviewHtml && p.reviewKind !== 'connections').sort(reviewOrder);
const dateLabel = date => date.split('-').reverse().join('.');

function renderFeatured(profiles) {
  const p = investigations(profiles)[0];
  if (!p) return '';
  return `<article class="featured-investigation"><a href="/profiles/${escape(p.id)}/"><div class="featured-photo"><img src="/${escape(p.thumbnailImage)}" alt="${escape(p.alt)}" width="520" height="340" fetchpriority="high" /><span>Последно обновена проверка</span></div><div class="featured-copy"><p class="featured-name">${escape(p.name)}</p><h2>${escape(p.summary || p.name)}</h2><p class="featured-finding">${escape(p.description)}</p><div class="featured-bottom"><time datetime="${p.reviewedOn}">${dateLabel(p.reviewedOn)}</time><strong>Прочети проверката <span aria-hidden="true">↗</span></strong></div></div></a></article>`;
}

export function renderReadingNext(profiles, currentProfile) {
  const entries = investigations(profiles);
  const position = entries.findIndex(p => p.id === currentProfile.id);
  const next = [...entries.slice(position + 1), ...entries.slice(0, Math.max(0, position))].slice(0, 3);
  if (!next.length) return '';
  return `<section class="reading-next" aria-labelledby="reading-next-title"><div class="section-top"><div><p class="eyebrow">Още от регистъра</p><h2 id="reading-next-title">Продължи с още една проверка.</h2></div><a class="text-link" href="/#directory">Всички профили ↗</a></div><div class="next-grid">${next.map(p => `<a class="next-card" href="/profiles/${escape(p.id)}/"><img src="/${escape(p.thumbnailImage)}" alt="" width="110" height="90" loading="lazy" decoding="async" /><div><h3>${escape(p.name)}</h3><p>${escape(p.description)}</p><span>Прочети проверката ↗</span></div></a>`).join('')}</div><a class="next-guide" href="/scams.html">Разпознай тактиките зад обещанията <span aria-hidden="true">→</span></a></section>`;
}

// Cards are real HTML links: browsing remains available without JavaScript.
export async function writeDirectories(profiles, rootDir) {
  for (const file of ['index.html', 'gallery.html']) {
    const entries = profiles.filter(p => file === 'index.html' || !p.reviewHtml)
      .sort((a,b) => Number(b.reviewKind === 'connections') - Number(a.reviewKind === 'connections') || reviewOrder(a,b));
    const cards = entries.map(p => {
      const reviewed = Boolean(p.reviewHtml);
      return `<article class="investigation-card" data-review="${reviewed && p.reviewKind !== 'connections' ? 'sourced' : 'company'}" data-search="${escape([p.name,p.description,p.summary,p.kicker,...p.channels].join(' '))}"><a href="/profiles/${escape(p.id)}/"><div class="card-photo${p.subjectType === "Organization" ? " card-photo-brand" : ""}"><img src="/${escape(p.thumbnailImage)}" alt="${escape(p.alt)}" loading="lazy" decoding="async" width="520" height="340" /><span class="card-label">${p.reviewKind === "connections" ? 'Фирмен справочник' : reviewed ? 'Подробна проверка' : p.companyCheckHtml ? 'Фирмена проверка' : 'Архивен коментар'}</span></div><div class="card-body"><h3>${escape(p.name)}</h3><p>${escape(reviewed || p.companyCheckHtml ? p.description : p.kicker)}</p><span class="card-bottom">${reviewed ? `<time datetime="${p.reviewedOn}">${dateLabel(p.reviewedOn)}</time>` : p.companyReviewedOn ? `<time datetime="${p.companyReviewedOn}">${dateLabel(p.companyReviewedOn)}</time>` : '<span>Редакционен архив</span>'}<span>${p.reviewKind === 'connections' ? 'Виж връзките' : reviewed ? 'Прочети проверката' : 'Отвори профила'} ↗</span></span></div></a></article>`;
    }).join('\n');
    const target = path.join(rootDir,file);
    const html = await fs.readFile(target,'utf8');
    await fs.writeFile(target, html
      .replace(/<!-- featured:start -->[\s\S]*?<!-- featured:end -->/, `<!-- featured:start -->${renderFeatured(profiles)}<!-- featured:end -->`)
      .replace(/<!-- directory:start -->[\s\S]*?<!-- directory:end -->/, `<!-- directory:start -->\n${cards}\n<!-- directory:end -->`));
  }
}
