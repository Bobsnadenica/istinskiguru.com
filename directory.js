(() => {
  const input = document.querySelector('#directory-search');
  if (!input) return;
  const cards = [...document.querySelectorAll('.investigation-card')];
  const status = document.querySelector('#directory-status');
  const empty = document.querySelector('#directory-empty');
  const clear = document.querySelector('#directory-clear');
  const filters = [...document.querySelectorAll('[data-filter]')];
  let selected = 'all';
  const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('bg').trim();
  function render(save = false) {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    const textMatches = cards.filter(card => words.every(word => normalize(card.dataset.search).includes(word)));
    const matches = textMatches.filter(card => selected === 'all' || card.dataset.review === selected);
    cards.forEach(card => { card.hidden = !matches.includes(card); });
    filters.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === selected));
      button.querySelector('[data-filter-count]').textContent = textMatches.filter(card => button.dataset.filter === 'all' || card.dataset.review === button.dataset.filter).length;
    });
    status.textContent = words.length || selected !== 'all' ? `Показани: ${matches.length} от ${cards.length} профила` : `Всички профили: ${cards.length}`;
    empty.hidden = matches.length !== 0;
    clear.hidden = !input.value && selected === 'all';
    if (save) {
      const url = new URL(location.href);
      for (const [key, value] of [['q', input.value.trim()], ['view', selected === 'all' ? '' : selected]]) {
        if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
      }
      history.replaceState(null, '', url);
    }
  }
  function restore() {
    const params = new URL(location.href).searchParams;
    input.value = (params.get('q') || '').slice(0, 120);
    selected = filters.some(button => button.dataset.filter === params.get('view')) ? params.get('view') : 'all';
    render();
  }
  input.addEventListener('input', () => render());
  input.addEventListener('change', () => render(true));
  input.addEventListener('blur', () => render(true));
  filters.forEach(button => button.addEventListener('click', () => { selected = button.dataset.filter; render(true); }));
  clear.addEventListener('click', () => { input.value = ''; selected = 'all'; render(true); input.focus(); });
  document.querySelector('[data-directory-filters]')?.removeAttribute('hidden');
  window.addEventListener('popstate', restore);
  window.addEventListener('pageshow', restore);
  restore();
})();
