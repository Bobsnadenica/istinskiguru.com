(() => {
  const input = document.querySelector('#directory-search');
  if (!input) return;
  const cards = [...document.querySelectorAll('.investigation-card')];
  const status = document.querySelector('#directory-status');
  const empty = document.querySelector('#directory-empty');
  const clear = document.querySelector('#directory-clear');
  const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('bg').trim();
  function render() {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    const matches = cards.filter(card => words.every(word => normalize(card.dataset.search).includes(word)));
    cards.forEach(card => { card.hidden = true; });
    matches.forEach(card => { card.hidden = false; });
    status.textContent = words.length ? `Намерени: ${matches.length}` : `Всички профили: ${matches.length}`;
    empty.hidden = matches.length !== 0;
    clear.hidden = !input.value;
  }
  input.addEventListener('input', render);
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  render();
})();
