(() => {
  const navigation = document.querySelector('.site-header nav');
  if (!navigation) return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'game-toggle';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'card-deck');
  trigger.setAttribute('aria-label', 'Включи играта — разгледай картите');
  trigger.innerHTML = 'Игра <span data-game-state>Изкл</span>';
  navigation.append(trigger);

  let dialog;
  let cards;
  let loading;
  let visibleCards = [];
  let collection = 'all';
  let current = 0;
  let scrollFrame = 0;
  const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('bg').trim();
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function updateTrigger(open) {
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? 'Изключи играта' : 'Включи играта — разгледай картите');
    trigger.querySelector('[data-game-state]').textContent = open ? 'Вкл' : 'Изкл';
    document.body.classList.toggle('card-deck-open', open);
  }

  function buildDialog() {
    dialog = document.createElement('dialog');
    dialog.id = 'card-deck';
    dialog.className = 'card-deck';
    dialog.setAttribute('aria-labelledby', 'card-deck-title');
    dialog.setAttribute('aria-describedby', 'card-deck-note');
    dialog.innerHTML = `
      <header class="deck-header">
        <div><p class="deck-eyebrow">Колекцията на Истински гуру</p><h2 id="card-deck-title">Тестето на гурутата</h2></div>
        <button type="button" class="deck-close" aria-label="Изключи играта" autofocus>×</button>
      </header>
      <p class="deck-note" id="card-deck-note">Неофициални пародийни карти с измислени умения. Разлисти с плъзгане или със стрелките.</p>
      <div class="deck-tools">
        <div class="deck-filters" role="group" aria-label="Колекция">
          <button type="button" data-collection="all" aria-pressed="true">Всички</button>
          <button type="button" data-collection="yugioh" aria-pressed="false">Yu-Gi-Oh!</button>
          <button type="button" data-collection="pokemon" aria-pressed="false">Pokémon</button>
        </div>
        <div class="deck-search-row">
          <label class="deck-search"><span>Търси по име</span><input type="search" placeholder="Име или персонаж…" autocomplete="off" /></label>
          <label class="deck-edition"><span>Издание</span><select><option value="all">Всички издания</option></select></label>
        </div>
      </div>
      <div class="deck-stage">
        <p class="deck-message" role="status">Зареждане на колекцията…</p>
        <button type="button" class="deck-retry" hidden>Опитай отново</button>
        <div class="deck-empty" hidden><p>Няма карти за това търсене.</p><button type="button">Изчисти филтрите</button></div>
        <ol class="deck-rail" aria-label="Карти — плъзни наляво или надясно" tabindex="0" hidden></ol>
      </div>
      <footer class="deck-footer">
        <button type="button" data-step="-1" aria-label="Предишна карта" disabled>←</button>
        <div><p class="deck-position" role="status" aria-live="polite"></p><span>Натисни картата за голям размер ↗</span></div>
        <button type="button" data-step="1" aria-label="Следваща карта" disabled>→</button>
      </footer>`;
    document.body.append(dialog);
    dialog.querySelector('.deck-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { updateTrigger(false); trigger.focus({ preventScroll: true }); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.querySelectorAll('[data-collection]').forEach(button => button.addEventListener('click', () => {
      collection = button.dataset.collection;
      dialog.querySelectorAll('[data-collection]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      updateEditions();
      render();
    }));
    dialog.querySelector('input').addEventListener('input', render);
    dialog.querySelector('select').addEventListener('change', render);
    dialog.querySelector('.deck-empty button').addEventListener('click', () => {
      dialog.querySelector('input').value = '';
      dialog.querySelector('select').value = 'all';
      render();
      dialog.querySelector('input').focus();
    });
    dialog.querySelector('.deck-retry').addEventListener('click', loadCards);
    dialog.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => goTo(current + Number(button.dataset.step))));
    dialog.addEventListener('keydown', event => {
      if (event.target.matches('input, select')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    const rail = dialog.querySelector('.deck-rail');
    rail.addEventListener('scroll', () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const center = rail.getBoundingClientRect().left + rail.clientWidth / 2;
        let closest = Infinity;
        [...rail.children].forEach((item, index) => {
          const bounds = item.getBoundingClientRect();
          const distance = Math.abs(bounds.left + bounds.width / 2 - center);
          if (distance < closest) { closest = distance; current = index; }
        });
        updatePosition();
      });
    }, { passive: true });
  }

  function updateEditions() {
    const select = dialog.querySelector('select');
    select.replaceChildren(new Option('Всички издания', 'all'));
    const editions = new Map((cards || []).filter(card => collection === 'all' || card.collection === collection).map(card => [card.edition, card.editionLabel]));
    editions.forEach((label, value) => select.add(new Option(label, value)));
  }

  function updatePosition() {
    const total = visibleCards.length;
    dialog.querySelector('.deck-position').textContent = total ? `${current + 1} / ${total} карти` : '0 карти';
    dialog.querySelector('[data-step="-1"]').disabled = current <= 0 || !total;
    dialog.querySelector('[data-step="1"]').disabled = current >= total - 1 || !total;
    dialog.querySelectorAll('.deck-card').forEach((item, index) => {
      item.classList.toggle('is-current', current === index);
    });
  }

  function goTo(index) {
    const rail = dialog.querySelector('.deck-rail');
    const item = rail.children[Math.max(0, Math.min(index, visibleCards.length - 1))];
    if (!item) return;
    rail.scrollTo({ left: item.offsetLeft - (rail.clientWidth - item.clientWidth) / 2, behavior: reducedMotion() ? 'instant' : 'smooth' });
  }

  function render() {
    if (!cards) return;
    const query = normalize(dialog.querySelector('input').value).split(/\s+/).filter(Boolean);
    const edition = dialog.querySelector('select').value;
    visibleCards = cards.filter(card => (collection === 'all' || card.collection === collection) && (edition === 'all' || card.edition === edition) && query.every(word => normalize(`${card.name} ${card.title}`).includes(word)));
    const rail = dialog.querySelector('.deck-rail');
    const fragment = document.createDocumentFragment();
    visibleCards.forEach((card, index) => {
      const item = document.createElement('li');
      item.className = 'deck-card';
      const link = document.createElement('a');
      link.href = card.src;
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'deck-image';
      link.setAttribute('aria-label', `${card.name} — ${card.editionLabel}, отвори голямата карта в нов раздел`);
      const image = document.createElement('img');
      image.src = card.thumb;
      image.srcset = `${card.thumb} 480w, ${card.src} ${card.width}w`;
      image.sizes = '(max-width: 520px) 74vw, 360px';
      image.width = card.width;
      image.height = card.height;
      image.loading = index < 2 ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.alt = `${card.name} — ${card.title}, ${card.editionLabel}${card.rarity ? ', ' + card.rarity : ''}`;
      image.addEventListener('error', () => {
        if (image.dataset.failed) return;
        image.dataset.failed = 'true';
        const note = document.createElement('span');
        note.className = 'deck-image-error';
        note.textContent = 'Снимката не се зареди. Натисни за оригинала ↗';
        link.append(note);
      });
      link.append(image);
      const name = document.createElement('strong');
      name.textContent = card.name;
      const detail = document.createElement('span');
      detail.textContent = `${card.editionLabel}${card.rarity ? ' · ' + card.rarity : ''}`;
      item.append(link, name, detail);
      fragment.append(item);
    });
    rail.replaceChildren(fragment);
    rail.hidden = !visibleCards.length;
    dialog.querySelector('.deck-empty').hidden = !!visibleCards.length;
    current = 0;
    rail.scrollTo({ left: 0, behavior: 'instant' });
    updatePosition();
  }

  async function loadCards() {
    if (cards || loading) return;
    const message = dialog.querySelector('.deck-message');
    message.hidden = false;
    message.textContent = 'Зареждане на колекцията…';
    dialog.querySelector('.deck-retry').hidden = true;
    loading = true;
    try {
      const response = await fetch('/cards/collection.json?v=20260926');
      if (!response.ok) throw new Error('Collection unavailable');
      const data = await response.json();
      if (!Array.isArray(data.cards) || !data.cards.length || data.cards.some(card => !card.src?.startsWith('/cards/') || !card.thumb?.startsWith('/cards/') || typeof card.name !== 'string')) throw new Error('Invalid collection');
      cards = data.cards;
      dialog.querySelectorAll('[data-collection]').forEach(button => {
        const value = button.dataset.collection;
        const count = cards.filter(card => value === 'all' || card.collection === value).length;
        button.textContent = `${value === 'all' ? 'Всички' : value === 'yugioh' ? 'Yu-Gi-Oh!' : 'Pokémon'} · ${count}`;
      });
      message.hidden = true;
      updateEditions();
      render();
    } catch {
      message.textContent = 'Колекцията не се зареди. Провери връзката си и опитай отново.';
      dialog.querySelector('.deck-retry').hidden = false;
    } finally {
      loading = false;
    }
  }

  trigger.addEventListener('click', () => {
    if (!dialog) buildDialog();
    if (dialog.open) { dialog.close(); return; }
    dialog.showModal();
    updateTrigger(true);
    loadCards();
  });
})();
