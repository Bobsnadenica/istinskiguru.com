(() => {
  const input = document.querySelector('#company-search');
  if (!input) return;
  const group = document.querySelector('#company-group');
  const status = document.querySelector('#company-status');
  const cards = [...document.querySelectorAll('[data-company-search]')];
  const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('bg').trim();
  const searches = cards.map(card => normalize(card.dataset.companySearch));
  function render() {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    let count = 0;
    cards.forEach((card, index) => {
      card.hidden = Boolean(group.value && group.value !== card.dataset.companyGroup) || !words.every(word => searches[index].includes(word));
      if (!card.hidden) count++;
    });
    status.textContent = `Показани записи: ${count} от ${cards.length}`;
    document.querySelector('#company-empty').hidden = count !== 0;
  }
  input.addEventListener('input', render);
  group.addEventListener('change', render);
  document.querySelector('#company-clear').addEventListener('click', () => { input.value = ''; group.value = ''; render(); input.focus(); });
  // Anchored evidence remains reachable even when a previous filter hid its card.
  function revealAnchor() {
    const card = document.getElementById(location.hash.slice(1));
    if (card?.matches('[data-company-search]') && card.hidden) { input.value = ''; group.value = ''; render(); card.scrollIntoView(); }
  }
  window.addEventListener('hashchange', revealAnchor);
  document.querySelector('.company-controls').hidden = false;
  render();
  revealAnchor();
})();
