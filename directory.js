(() => {
  const input = document.querySelector('#directory-search');
  if (!input) return;
  const cards = [...document.querySelectorAll('.investigation-card')];
  const status = document.querySelector('#directory-status');
  const empty = document.querySelector('#directory-empty');
  const more = document.querySelector('#directory-more');
  const clear = document.querySelector('#directory-clear');
  const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('bg').trim();
  let limit = 6;
  function render() {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    const matches = cards.filter(card => words.every(word => normalize(card.dataset.search).includes(word)));
    cards.forEach(card => { card.hidden = true; });
    matches.slice(0,limit).forEach(card => { card.hidden = false; });
    status.textContent = words.length ? `Намерени: ${matches.length}` : `Показани ${Math.min(limit,matches.length)} от ${matches.length}`;
    empty.hidden = matches.length !== 0;
    more.hidden = matches.length <= limit;
    more.textContent = `Покажи още (${Math.max(0,matches.length-limit)})`;
    clear.hidden = !input.value;
  }
  input.addEventListener('input', () => { limit = 6; render(); });
  clear.addEventListener('click', () => { input.value = ''; limit = 6; render(); input.focus(); });
  more.addEventListener('click', () => {
    const firstHidden = cards.find(card => card.hidden && normalize(input.value).split(/\s+/).filter(Boolean).every(word => normalize(card.dataset.search).includes(word)));
    limit += 6;
    render();
    firstHidden?.querySelector('a').focus({preventScroll:true});
  });
  render();
})();
