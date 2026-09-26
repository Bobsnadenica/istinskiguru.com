const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const groups = { profiles: 'Профили', registered: 'Фирмени вписвания', history: 'Исторически участия', archive: 'Архивни отправни точки', operator: 'Чуждестранни оператори' };
const statuses = { documented: 'Фирмена връзка с източник', identity: 'Частична идентификация', access: 'Ограничен публичен достъп' };
const profileLink = id => {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid company profile link');
  return `/profiles/${id}/`;
};
const sourceLink = ({url, label}) => {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Invalid company source');
  return `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`;
};

function validateCheck(check, review) {
  if (!check.name || !check.title || !check.finding || !statuses[check.status] || !/^\d{4}-\d{2}-\d{2}$/.test(check.reviewedOn) || !check.sources?.length || !Array.isArray(check.companies)) throw new Error('Incomplete profile company check');
  profileLink(check.profile);
  if (!/^\/site-assets\/[a-z0-9/_-]+\.(jpe?g|png|webp)$/.test(check.image)) throw new Error('Invalid profile check image');
  for (const id of check.companies) if (!review.companies.some(c => (c.eik || 'envest') === id)) throw new Error('Unknown company reference');
}
export function renderProfileCompanyCheck(check, review) {
  validateCheck(check, review);
  const companies = check.companies.map(id => {
    const c = review.companies.find(c => (c.eik || 'envest') === id);
    return `<li><a href="/profiles/firmeni-vrazki/#company-${escape(id)}">${escape(c.name)}</a>${c.eik ? ` · ЕИК ${escape(c.eik)}` : ''}${c.kind === 'historical' ? ' · историческо участие' : ''}</li>`;
  }).join('');
  return `<article class="evidence-review profile-company-check" id="company-check" aria-label="Фирмена проверка"><header class="evidence-verdict"><p class="eyebrow">Фирми и публични връзки · <time datetime="${escape(check.reviewedOn)}">${escape(check.reviewedOn.split('-').reverse().join('.'))}</time></p><h2>${escape(check.title)}</h2><p>${escape(check.finding)}</p></header><section class="evidence-section"><h3>Фирми и източници</h3>${companies ? `<ul class="profile-company-links">${companies}</ul>` : ''}<p class="source-note">${check.sources.map(sourceLink).join(' · ')}</p><a href="/profiles/firmeni-vrazki/#profile-${escape(check.profile)}">Виж записа сред всички профили →</a></section></article>`;
}

export function renderCompanyDirectory(review) {
  if (review.subjectType !== 'CollectionPage' || !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedOn)) throw new Error('Invalid company directory metadata');
  const seen = new Set();
  const people = review.people;
  const cards = review.companies.map(company => {
    if (!company.name || !groups[company.group] || !['current','historical','archive','operator'].includes(company.kind) || !company.sources?.length || !company.note || !Array.isArray(company.roles)) throw new Error('Incomplete company entry');
    if (company.kind !== 'operator' && !/^\d{9}(\d{4})?$/.test(company.eik)) throw new Error(`Invalid EIK: ${company.name}`);
    const id = company.eik || company.name;
    if (seen.has(id)) throw new Error(`Duplicate company: ${id}`);
    seen.add(id);
    const roles = company.roles.map(({person,role}) => {
      const p = people[person];
      if (!p?.name || !role) throw new Error('Unknown person or missing company role');
      if (p.image && (!p.profile || !/^\/site-assets\/[a-z0-9/_-]+\.(jpe?g|png|webp)$/.test(p.image))) throw new Error('Invalid company portrait');
      const name = p.profile ? `<a href="${profileLink(p.profile)}">${escape(p.name)}</a>` : escape(p.name);
      return `<li>${p.image ? `<a class="company-avatar" href="${profileLink(p.profile)}" tabindex="-1" aria-hidden="true"><img src="${escape(p.image)}" alt="" width="56" height="56" loading="lazy" decoding="async" /></a>` : `<span class="company-initial" aria-hidden="true">${escape(p.name.split(' ').map(s=>s[0]).slice(0,2).join(''))}</span>`}<div><strong>${name}</strong><span>${escape(role)}</span></div></li>`;
    }).join('');
    const search = [company.name,company.eik,company.note,...company.roles.map(r=>`${people[r.person].name} ${r.role}`)].join(' ');
    return `<article class="company-card" id="company-${escape(company.eik || 'envest')}" data-company-group="${escape(company.group)}" data-company-search="${escape(search)}"><header><span class="company-category">${escape(groups[company.group])}${company.kind === 'historical' ? ' · историческа връзка' : ''}</span><h3>${escape(company.name)}</h3><p class="company-eik">${company.eik ? `ЕИК <strong>${escape(company.eik)}</strong>` : 'САЩ · оператор, назован в общите условия'}</p></header><ul class="company-people">${roles}</ul><p>${escape(company.note)}</p><div class="company-sources">${company.sources.map(sourceLink).join('')}${company.profile ? `<a href="${profileLink(company.profile)}">Свързан профил →</a>` : ''}</div></article>`;
  }).join('\n');
  const checked = new Set();
  const profileCards = review.profileChecks.map(check => {
    validateCheck(check, review);
    if (checked.has(check.profile)) throw new Error('Duplicate profile check');
    checked.add(check.profile);
    const companyNames = check.companies.map(id => review.companies.find(c => (c.eik || 'envest') === id).name).join(' ');
    return `<article class="company-profile" id="profile-${escape(check.profile)}" data-company-group="profiles" data-company-search="${escape([check.name,check.title,check.finding,companyNames,...check.companies].join(' '))}"><a class="company-profile-heading" href="${profileLink(check.profile)}"><img src="${escape(check.image)}" alt="" width="56" height="56" loading="lazy" decoding="async" /><span><strong>${escape(check.name)}</strong><small>${escape(statuses[check.status])}</small></span><span aria-hidden="true">↗</span></a><details><summary>${escape(check.title)}</summary><p>${escape(check.finding)}</p><div class="company-sources">${check.sources.map(sourceLink).join('')}${check.companies.map(id => `<a href="#company-${escape(id)}">${id === 'envest' ? 'Договорен оператор' : 'ЕИК '+escape(id)} ↓</a>`).join('')}</div></details></article>`;
  }).join('\n');
  return `<article class="evidence-review company-directory" aria-label="Фирмени връзки по публични източници">
  <header class="evidence-verdict"><p class="eyebrow">Преглед към <time datetime="${escape(review.reviewedOn)}">${escape(review.reviewedOn.split('-').reverse().join('.'))}</time></p><h2>${escape(review.verdict)}</h2><p>${escape(review.conclusion)}</p><div class="company-stats"><span><strong>${review.profileChecks.length}</strong> прегледани профила</span><span><strong>${review.companies.filter(c=>c.eik).length}</strong> субекта с ЕИК</span><span><strong>${Object.keys(people).length}</strong> назовани лица</span><span><strong>${review.companies.filter(c=>!c.eik).length}</strong> оператор извън България</span></div><nav class="company-jumps" aria-label="В справочника"><a href="#profile-checks">Всички профили ↓</a><a href="#companies">Всички фирми ↓</a><a href="#connections">Какви връзки открихме ↓</a></nav></header>
  <div class="company-controls" hidden><div><label for="company-search">Име, фирма или ЕИК</label><input id="company-search" type="search" placeholder="Търси във всички профили и фирми…" autocomplete="off" /></div><div><label for="company-group">Покажи</label><select id="company-group"><option value="">Всички записи</option>${Object.entries(groups).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></div><button type="button" id="company-clear">Изчисти</button></div><p id="company-status" class="source-note" role="status" aria-live="polite">Всички записи: ${review.companies.length+review.profileChecks.length}</p><p id="company-empty" hidden>Няма съвпадение. Опитай с фамилия, ЕИК или друга група.</p>
  <section id="profile-checks" class="company-list" aria-labelledby="profile-checks-title"><h2 id="profile-checks-title">Всички профили</h2><p>Всеки запис показва резултата от фирмения преглед. Отвори реда за обяснение и източници или името за целия профил.</p><div class="company-profile-grid">${profileCards}</div></section>
  <section id="companies" class="company-list" aria-labelledby="companies-title"><h2 id="companies-title">Фирмите и хората</h2><p>Азбучен списък с ЕИК, точна роля и източник. Портретите са от свързаните профили; инициалите означават, че няма добавена снимка.</p><div class="company-grid">${cards}</div></section>
  <section class="evidence-section" id="connections"><h2>Какви връзки открихме</h2><div class="connection-examples">
  <div><h3>Обща собственост</h3><p>Боян Москов и Мария Боева участват заедно в <a href="#company-205885945">Маркетинг Академи</a>, <a href="#company-204417057">Интерактив Орб</a> и <a href="#company-205189140">Фешън Зон</a>. Георги Захариев и СофтУни АД са съдружници във <a href="#company-202950494">Финакадеми</a>. В <a href="#company-207930773">Фънел Мастърс</a> съдружници са Нези Карахасан и Семир Павлов.</p></div>
  <div><h3>Един оператор, различни брандове</h3><p>Funnel Masters и RevTrack посочват <a href="#company-207930773">една фирма</a>. etienyanev.com и Sofia Marketing Meetups също водят към <a href="#company-207572568">общ оператор</a>. MentorMax, MHC и предложенията на funnels.bg са назовани в условията на <a href="#company-205885945">Маркетинг Академи</a>.</p></div>
  <div><h3>Отделни дружества и промени</h3><p>Юли Тонкин и менторската му академия са <a href="#profile-yuli-tonkin">различни юридически лица</a>. <a href="#profile-maya-yatanska">Ятаниум и Маверик Еволюшън</a> също имат различни ЕИК, смесени в една правна страница. При <a href="#company-207683045">Стеф Фит → БАП БГ</a> е променено името, а ЕИК е запазен.</p></div>
  <div><h3>Обучение и публична поява</h3><p>MentorMax представя Николай Вълев с именуван видеоотзив. Неговият сайт посочва <a href="#company-207508522">Бизнес Лаборатория</a>. Това документира участие в рекламното представяне на академията. Курсист, лектор и съдружник са различни роли.</p><p class="source-note">${sourceLink({label:'MentorMax — именуван отзив',url:'https://masterclass.bg/mentormax'})}</p></div></div></section>
  <section class="evidence-section" id="scope"><h2>Обхват и следващи документи</h2><p>Прегледът обхваща публичните канали и фирмените връзки във всички ${review.profileChecks.length} профила в регистъра. Използвани са правни страници на продавачите, публични фирмени справочници и именувани професионални представяния. Източниците и конкретните ограничения са до съответния запис. Всяка връзка е описана чрез конкретна роля, период и източник.</p><p>Връзките от видеа се описват чрез именуване и контекст. За нова връзка са полезни оригиналният запис, датата, точният момент и назованата роля. <a href="/contactus.html">Изпрати документ, нов източник или корекция →</a></p></section></article>`;
}
