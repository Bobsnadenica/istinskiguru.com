let revealObserver = null;
const observedRevealNodes = new WeakSet();
let scrollEffectsBound = false;
let moneyRainBound = false;
let moneyRainRoot = null;
let moneyGamePanel = null;
let moneyGameToggle = null;
let moneyGameMessageTimeoutId = 0;
let moneyGameResetTimeoutId = 0;
let moneyGameHideTimeoutId = 0;
let moneyRainStartTimeoutId = 0;
let moneyGameEnabled = true;
const moneyGameState = {
  collected: 0,
  target: 1400,
  clicks: 0,
  expenseSpawns: new Map(),
  expenseHits: new Map(),
  expenseTotal: 0,
  rounds: 0,
};
const moneyGameHideDelay = 2600;
const moneyGamePreferenceKey = "istinski-guru-money-game";
const moneyPromiseStages = [
  { title: "Пасивен доход" },
  { title: "Работа от телефона" },
  { title: "Финансова свобода" },
  { title: "Доход докато спиш" },
  { title: "10 000 € без шеф" },
  { title: "Лукс от лаптопа" },
  { title: "Империя без офис" },
  { title: "Пари от бранда" },
];
const expenseEvents = [
  { id: "bebe", label: "бебе", amountEuro: 260, critical: true, multiplier: 2.1, maxSpawns: 2 },
  { id: "svatba", label: "сватба", amountEuro: 480, critical: true, multiplier: 2.2, maxSpawns: 2 },
  { id: "kola", label: "ремонт на кола", amountEuro: 340 },
  { id: "naem", label: "наем", amountEuro: 420 },
  { id: "zabolekar", label: "зъболекар", amountEuro: 180 },
  { id: "veterinar", label: "ветеринар", amountEuro: 160 },
  { id: "rojden-den", label: "рожден ден", amountEuro: 140 },
  { id: "danatsi", label: "данъци", amountEuro: 390 },
  { id: "telefon", label: "нов телефон", amountEuro: 220 },
];

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function matchesMedia(query) {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

function shouldUseLiteEffects() {
  const likelyMobileDevice =
    matchesMedia("(pointer: coarse)") ||
    matchesMedia("(hover: none)") ||
    (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) ||
    (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4);

  return prefersReducedMotion() || matchesMedia("(max-width: 820px)") || likelyMobileDevice;
}

function applyPerformanceMode() {
  const liteEffects = shouldUseLiteEffects();
  document.body.classList.toggle("performance-lite", liteEffects);
  return liteEffects;
}

function isSiteIntroOpen() {
  return document.body.classList.contains("site-intro-open") || Boolean(document.querySelector("[data-site-intro]"));
}

function startMoneyRainWhenReady() {
  if (!moneyGameEnabled || moneyRainBound || prefersReducedMotion() || !document.body) {
    return;
  }

  const bootMoneyRain = () => {
    if (!moneyGameEnabled || moneyRainBound || prefersReducedMotion() || !document.body) {
      return;
    }

    if (shouldUseLiteEffects() && isSiteIntroOpen()) {
      return;
    }

    initMoneyRain();
  };

  window.clearTimeout(moneyRainStartTimeoutId);
  moneyRainStartTimeoutId = window.setTimeout(bootMoneyRain, shouldUseLiteEffects() ? 360 : 120);
}

function getRainItemCount() {
  if (shouldUseLiteEffects()) {
    return Math.max(5, Math.min(8, Math.round(window.innerWidth / 135)));
  }

  return Math.max(10, Math.min(18, Math.round(window.innerWidth / 95)));
}

function readMoneyGamePreference() {
  try {
    const storedPreference = window.localStorage.getItem(moneyGamePreferenceKey);

    if (storedPreference === null) {
      return !shouldUseLiteEffects();
    }

    return storedPreference !== "off";
  } catch {
    return !shouldUseLiteEffects();
  }
}

function writeMoneyGamePreference(enabled) {
  try {
    window.localStorage.setItem(moneyGamePreferenceKey, enabled ? "on" : "off");
  } catch {
    // Ignore storage failures and keep the in-memory state.
  }
}

function seedRevealTargets() {
  if (document.querySelector(".reveal")) {
    return;
  }

  document
    .querySelectorAll("main > section, .hero, .profile-share-main .profile-card, .site-footer")
    .forEach((node) => node.classList.add("reveal"));
}

function decorateRevealNodes(nodes) {
  nodes.forEach((node, index) => {
    if (node.dataset.revealDecorated === "true") {
      return;
    }

    const delay = Math.min((index % 7) * 80, 480);
    const distance = 34 + (index % 4) * 8;
    const tilt = `${(index % 2 === 0 ? -1 : 1) * (0.35 + (index % 3) * 0.18)}deg`;

    node.style.setProperty("--reveal-delay", `${delay}ms`);
    node.style.setProperty("--reveal-distance", `${distance}px`);
    node.style.setProperty("--reveal-tilt", tilt);
    node.dataset.revealDecorated = "true";
  });
}

function getRevealObserver() {
  if (revealObserver || !("IntersectionObserver" in window)) {
    return revealObserver;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver?.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -10% 0px",
    },
  );

  return revealObserver;
}

function refreshPageEffects() {
  seedRevealTargets();

  const revealNodes = Array.from(document.querySelectorAll(".reveal"));
  decorateRevealNodes(revealNodes);

  if (prefersReducedMotion() || shouldUseLiteEffects() || !("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  const observer = getRevealObserver();

  revealNodes.forEach((node) => {
    if (observedRevealNodes.has(node)) {
      return;
    }

    observedRevealNodes.add(node);
    observer?.observe(node);
  });
}

function formatMoneyGameAmount(value) {
  return new Intl.NumberFormat("bg-BG").format(Math.round(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normaliseMoneyToEuro(amount, currency) {
  if (currency === "лв") {
    return amount * 0.5;
  }

  if (currency === "$") {
    return amount;
  }

  return amount;
}

function getNextMoneyTarget(currentTarget, rounds) {
  return Math.round(currentTarget * 1.72 + 950 + rounds * 420);
}

function getCurrentMoneyLevel() {
  return moneyGameState.rounds + 1;
}

function getMoneyPromise(offset = 0) {
  const promiseIndex = (moneyGameState.rounds + offset) % moneyPromiseStages.length;
  return moneyPromiseStages[promiseIndex] || moneyPromiseStages[0];
}

function getMoneyMockMessage(nextTarget, completedPromise, nextPromise) {
  const messages = [
    `Чудесно. "${completedPromise.title}" почти стана, но сега идва "${nextPromise.title}" за само ${formatMoneyGameAmount(nextTarget)} €.`,
    `Браво. Мина през "${completedPromise.title}", а сега вече си на една крачка от "${nextPromise.title}".`,
    `Супер напредък. След "${completedPromise.title}" логично идва "${nextPromise.title}". Само още малко.`,
    `Ето така започва свободата: първо "${completedPromise.title}", после "${nextPromise.title}" и пак си почти там.`,
  ];

  return messages[moneyGameState.rounds % messages.length];
}

function getMoneyIdleMessage() {
  const remaining = Math.max(0, moneyGameState.target - moneyGameState.collected);
  const currentPromise = getMoneyPromise();
  return remaining
    ? `Почти си там. Остават само още ${formatMoneyGameAmount(remaining)} € до "${currentPromise.title}".`
    : `Почти си готов. "${currentPromise.title}" е съвсем близо.`;
}

function createMoneyGameToggle() {
  const button = document.createElement("button");
  button.className = "money-game-toggle";
  button.type = "button";
  button.innerHTML = `
    <span class="money-game-toggle-label">Игра</span>
    <span class="money-game-toggle-state" data-money-game-toggle-state></span>
  `;
  button.addEventListener("click", () => {
    setMoneyGameEnabled(!moneyGameEnabled);
  });
  document.body.append(button);
  return button;
}

function getMoneyGameToggle() {
  return moneyGameToggle || (moneyGameToggle = createMoneyGameToggle());
}

function updateMoneyGameToggle() {
  const toggle = getMoneyGameToggle();
  const stateNode = toggle.querySelector("[data-money-game-toggle-state]");

  toggle.dataset.state = moneyGameEnabled ? "on" : "off";
  toggle.setAttribute("aria-pressed", String(moneyGameEnabled));
  toggle.setAttribute("aria-label", moneyGameEnabled ? "Изключи играта" : "Включи играта");

  if (stateNode) {
    stateNode.textContent = moneyGameEnabled ? "Вкл" : "Изкл";
  }
}

function getExpenseHitMessage(label, options = {}) {
  const prefix = options.critical ? `Критично: ${label}.` : `${label}.`;
  const messages = options.autoCharged
    ? [
        `${prefix} Стигна дъното и директно удари фонда.`,
        `${prefix} Така или иначе трябваше да се плати.`,
        `${prefix} Изчака те най-отдолу и си взе своето.`,
        `${prefix} Не можа да го избегнеш. Пак си почти там.`,
      ]
    : [
        `${prefix} Няма страшно. Пак си почти там.`,
        `${prefix} Малък разход. Но вече си доста близо.`,
        `${prefix} Леко те дръпна назад, но си почти готов.`,
        `${prefix} Не е идеално, но следващото ниво пак е съвсем наблизо.`,
      ];

  return messages[Math.floor(Math.random() * messages.length)];
}

function getTaxCharge(balance) {
  if (!balance) {
    return 0;
  }

  return Math.max(1, Math.round(Math.abs(balance) * 0.3));
}

function getTaxHitMessage(taxAmount) {
  return `Десети клик. Данък 30%: -${formatMoneyGameAmount(taxAmount)} €. Но спокойно, пак си почти там.`;
}

function recordMoneyGameExpense(label, amountEuro) {
  const normalizedLabel = String(label || "разход").trim() || "разход";
  const expenseAmount = Math.abs(amountEuro);

  moneyGameState.expenseHits.set(normalizedLabel, (moneyGameState.expenseHits.get(normalizedLabel) || 0) + 1);
  moneyGameState.expenseTotal += expenseAmount;
}

function getMoneyGameExpenseSummary() {
  return Array.from(moneyGameState.expenseHits.entries()).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0], "bg");
  });
}

function canSpawnExpense(expense) {
  if (!expense.maxSpawns) {
    return true;
  }

  return (moneyGameState.expenseSpawns.get(expense.id) || 0) < expense.maxSpawns;
}

function pickExpenseEvent() {
  const availableExpenses = expenseEvents.filter(canSpawnExpense);
  const pool = availableExpenses.length ? availableExpenses : expenseEvents.filter((expense) => !expense.maxSpawns);

  return pool[Math.floor(Math.random() * pool.length)] || expenseEvents[0];
}

function createMoneyGamePanel() {
  const panel = document.createElement("aside");
  panel.className = "money-game-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <p class="money-game-eyebrow">Гуру обещание</p>
    <h2 data-money-game-promise>${getMoneyPromise().title}</h2>
    <p class="money-game-level">Ниво <span data-money-game-level>${getCurrentMoneyLevel()}</span></p>
    <div class="money-game-stack">
      <div class="money-game-meter" aria-hidden="true">
        <div class="money-game-meter-fill" data-money-game-fill></div>
      </div>
      <div class="money-game-stats">
        <p class="money-game-amount"><strong data-money-game-current>0</strong> €</p>
        <p class="money-game-target">още <span data-money-game-target>${formatMoneyGameAmount(moneyGameState.target)}</span> €</p>
      </div>
    </div>
    <div class="money-game-expenses" data-money-game-expenses hidden>
      <p class="money-game-expenses-label">Животът досега</p>
      <p class="money-game-expenses-total"><strong data-money-game-expense-total>0</strong> € разходи</p>
      <div class="money-game-expenses-list" data-money-game-expense-list></div>
    </div>
    <p class="money-game-message" data-money-game-message>${getMoneyIdleMessage()}</p>
  `;
  document.body.append(panel);
  return panel;
}

function getMoneyGamePanel() {
  return moneyGamePanel || (moneyGamePanel = createMoneyGamePanel());
}

function hideMoneyGamePanel() {
  if (!moneyGamePanel) {
    return;
  }

  const panel = getMoneyGamePanel();

  window.clearTimeout(moneyGameHideTimeoutId);
  moneyGameHideTimeoutId = 0;
  panel.classList.remove("is-visible");

  window.setTimeout(() => {
    if (!panel.classList.contains("is-visible")) {
      panel.hidden = true;
    }
  }, 220);
}

function scheduleMoneyGameHide(delay = moneyGameHideDelay) {
  window.clearTimeout(moneyGameHideTimeoutId);
  moneyGameHideTimeoutId = window.setTimeout(() => {
    if (moneyGameResetTimeoutId) {
      scheduleMoneyGameHide(delay);
      return;
    }

    hideMoneyGamePanel();
  }, delay);
}

function showMoneyGamePanel() {
  if (!moneyGameEnabled) {
    return;
  }

  const panel = getMoneyGamePanel();

  window.clearTimeout(moneyGameHideTimeoutId);
  moneyGameHideTimeoutId = 0;

  if (panel.hidden) {
    panel.hidden = false;
    window.requestAnimationFrame(() => {
      panel.classList.add("is-visible");
    });
    return;
  }

  panel.classList.add("is-visible");
}

function setMoneyGameMessage(message, options = {}) {
  if (!moneyGameEnabled && !moneyGamePanel) {
    return;
  }

  const panel = getMoneyGamePanel();
  const messageNode = panel.querySelector("[data-money-game-message]");

  if (!messageNode) {
    return;
  }

  panel.dataset.state = options.state || "idle";
  messageNode.textContent = message;

  window.clearTimeout(moneyGameMessageTimeoutId);

  if (options.temporary) {
    moneyGameMessageTimeoutId = window.setTimeout(() => {
      panel.dataset.state = "idle";
      messageNode.textContent = getMoneyIdleMessage();
      scheduleMoneyGameHide();
    }, options.duration || 2600);
  }
}

function updateMoneyGamePanel() {
  if (!moneyGameEnabled && !moneyGamePanel) {
    return;
  }

  const panel = getMoneyGamePanel();
  const fill = panel.querySelector("[data-money-game-fill]");
  const current = panel.querySelector("[data-money-game-current]");
  const target = panel.querySelector("[data-money-game-target]");
  const level = panel.querySelector("[data-money-game-level]");
  const promise = panel.querySelector("[data-money-game-promise]");
  const expenses = panel.querySelector("[data-money-game-expenses]");
  const expenseTotal = panel.querySelector("[data-money-game-expense-total]");
  const expenseList = panel.querySelector("[data-money-game-expense-list]");
  const progress = moneyGameState.target ? Math.max(0, Math.min(1, moneyGameState.collected / moneyGameState.target)) : 0;
  const expenseSummary = getMoneyGameExpenseSummary();
  const currentPromise = getMoneyPromise();

  panel.dataset.balance = moneyGameState.collected < 0 ? "negative" : "positive";

  if (fill) {
    fill.style.setProperty("--money-progress", progress.toFixed(4));
  }

  if (current) {
    current.textContent = formatMoneyGameAmount(moneyGameState.collected);
  }

  if (target) {
    target.textContent = formatMoneyGameAmount(moneyGameState.target);
  }

  if (level) {
    level.textContent = String(getCurrentMoneyLevel());
  }

  if (promise) {
    promise.textContent = currentPromise.title;
  }

  if (expenses) {
    expenses.hidden = expenseSummary.length === 0;
  }

  if (expenseTotal) {
    expenseTotal.textContent = formatMoneyGameAmount(moneyGameState.expenseTotal);
  }

  if (expenseList) {
    if (!expenseSummary.length) {
      expenseList.innerHTML = "";
    } else {
      const visibleItems = expenseSummary.slice(0, 4);
      const remainingItems = expenseSummary.length - visibleItems.length;

      expenseList.innerHTML = visibleItems
        .map(
          ([label, count]) =>
            `<span class="money-game-expense-chip">${escapeHtml(label)} <strong>x${count}</strong></span>`,
        )
        .join("");

      if (remainingItems > 0) {
        expenseList.innerHTML += `<span class="money-game-expense-chip money-game-expense-chip-more">+${remainingItems} още</span>`;
      }
    }
  }
}

function spawnMoneyPop(note, amountEuro) {
  const rect = note.getBoundingClientRect();
  const anchorX = Math.min(window.innerWidth - 28, Math.max(28, rect.left + rect.width / 2));
  const anchorY = Math.min(window.innerHeight - 36, Math.max(36, rect.top + rect.height / 2));
  const pop = document.createElement("span");
  pop.className = "money-pop";

  if (amountEuro < 0) {
    pop.classList.add("is-negative");
  }

  pop.textContent = `${amountEuro < 0 ? "-" : "+"}${formatMoneyGameAmount(Math.abs(amountEuro))} €`;
  pop.style.left = `${anchorX}px`;
  pop.style.top = `${anchorY}px`;
  document.body.append(pop);
  window.setTimeout(() => pop.remove(), 950);
}

function resolveRainItem(note) {
  if (!(note instanceof HTMLButtonElement) || note.dataset.resolved === "true") {
    return false;
  }

  note.dataset.resolved = "true";
  note.disabled = true;
  return true;
}

function replaceMoneyNote(note) {
  if (!moneyRainRoot) {
    return;
  }

  const replacement = buildRainItem();
  moneyRainRoot.append(replacement);

  note.classList.add("is-collected");
  note.disabled = true;

  window.setTimeout(() => {
    note.remove();
  }, 220);
}

function buildMoneyNote() {
  const liteEffects = shouldUseLiteEffects();
  const values = [
    { amount: 100, mark: "100", currency: "лв" },
    { amount: 500, mark: "500", currency: "лв" },
    { amount: 100, mark: "100", currency: "$" },
    { amount: 250, mark: "250", currency: "$" },
    { amount: 100, mark: "100", currency: "€" },
    { amount: 200, mark: "200", currency: "€" },
  ];
  const { amount, mark, currency } = values[Math.floor(Math.random() * values.length)];
  const amountEuro = normaliseMoneyToEuro(amount, currency);
  const note = document.createElement("button");
  note.className = "money-note";
  note.type = "button";
  note.tabIndex = -1;
  note.dataset.rainItem = "money";
  note.setAttribute(
    "aria-label",
    `Събери ${mark} ${currency} за следващия курс. Към фонда се броят ${formatMoneyGameAmount(amountEuro)} евро.`,
  );
  note.dataset.amount = String(amount);
  note.dataset.amountEuro = String(amountEuro);
  note.dataset.currency = currency;
  note.style.setProperty("--left", `${Math.random() * 100}%`);
  note.style.setProperty("--duration", `${(liteEffects ? 22 : 14) + Math.random() * (liteEffects ? 14 : 12)}s`);
  note.style.setProperty("--delay", `${-Math.random() * (liteEffects ? 12 : 18)}s`);
  note.style.setProperty("--drift", `${(liteEffects ? -42 : -80) + Math.random() * (liteEffects ? 84 : 160)}px`);
  note.style.setProperty("--rotation", `${(liteEffects ? -10 : -18) + Math.random() * (liteEffects ? 20 : 36)}deg`);
  note.style.setProperty("--scale", `${(liteEffects ? 0.72 : 0.76) + Math.random() * (liteEffects ? 0.28 : 0.48)}`);
  note.style.setProperty("--swing-duration", `${(liteEffects ? 5.4 : 3.4) + Math.random() * (liteEffects ? 3.4 : 3.2)}s`);
  note.innerHTML = `
    <span class="money-note-core">
      <span class="money-note-mark">${mark}</span>
      <span class="money-note-currency">${currency}</span>
    </span>
  `;
  return note;
}

function buildExpenseNote() {
  const liteEffects = shouldUseLiteEffects();
  const expense = pickExpenseEvent();
  const isCritical = Boolean(expense.critical);
  const amountEuro = Math.round(expense.amountEuro * (expense.multiplier || 1));
  const note = document.createElement("button");
  note.className = "expense-note";
  note.type = "button";
  note.tabIndex = -1;
  note.dataset.rainItem = "expense";
  note.dataset.expenseId = expense.id;
  note.dataset.amountEuro = String(-amountEuro);
  note.dataset.label = expense.label;
  note.dataset.critical = isCritical ? "true" : "false";

  moneyGameState.expenseSpawns.set(expense.id, (moneyGameState.expenseSpawns.get(expense.id) || 0) + 1);

  if (isCritical) {
    note.classList.add("is-critical");
  }

  note.setAttribute(
    "aria-label",
    `${isCritical ? "Критично. " : ""}${expense.label}. Ако го натиснеш, ще отнеме ${formatMoneyGameAmount(amountEuro)} евро от фонда.`,
  );
  note.style.setProperty("--left", `${Math.random() * 100}%`);
  note.style.setProperty("--duration", `${(liteEffects ? 24 : 16) + Math.random() * (liteEffects ? 14 : 12)}s`);
  note.style.setProperty("--delay", `${-Math.random() * (liteEffects ? 12 : 18)}s`);
  note.style.setProperty("--drift", `${(liteEffects ? -48 : -100) + Math.random() * (liteEffects ? 96 : 200)}px`);
  note.style.setProperty("--rotation", `${(liteEffects ? -9 : -16) + Math.random() * (liteEffects ? 18 : 32)}deg`);
  note.style.setProperty("--scale", `${(liteEffects ? 0.8 : 0.84) + Math.random() * (liteEffects ? 0.22 : 0.4)}`);
  note.style.setProperty("--swing-duration", `${(liteEffects ? 5.8 : 4.2) + Math.random() * (liteEffects ? 3 : 3.4)}s`);
  note.innerHTML = `
    <span class="expense-note-core">
      ${isCritical ? '<span class="expense-note-badge">Критично</span>' : ""}
      <span class="expense-note-label">${expense.label}</span>
    </span>
  `;
  return note;
}

function getExpenseSpawnChance() {
  return getCurrentMoneyLevel() <= 1 ? 0.16 : 0.2;
}

function buildRainItem() {
  return Math.random() < getExpenseSpawnChance() ? buildExpenseNote() : buildMoneyNote();
}

function teardownMoneyGame() {
  window.clearTimeout(moneyGameMessageTimeoutId);
  window.clearTimeout(moneyGameHideTimeoutId);
  window.clearTimeout(moneyGameResetTimeoutId);
  window.clearTimeout(moneyRainStartTimeoutId);
  moneyGameMessageTimeoutId = 0;
  moneyGameHideTimeoutId = 0;
  moneyGameResetTimeoutId = 0;
  moneyRainStartTimeoutId = 0;

  if (moneyRainRoot) {
    moneyRainRoot.remove();
    moneyRainRoot = null;
  }

  if (moneyGamePanel) {
    moneyGamePanel.remove();
    moneyGamePanel = null;
  }

  moneyRainBound = false;
}

function setMoneyGameEnabled(enabled) {
  moneyGameEnabled = enabled;
  writeMoneyGamePreference(enabled);
  updateMoneyGameToggle();

  if (!enabled) {
    teardownMoneyGame();
    return;
  }

  if (!prefersReducedMotion()) {
    startMoneyRainWhenReady();
  }
}

function initMoneyRain() {
  if (moneyRainBound || !moneyGameEnabled || prefersReducedMotion() || !document.body) {
    return;
  }

  moneyRainBound = true;

  const rain = document.createElement("div");
  rain.className = "money-rain";
  rain.setAttribute("aria-hidden", "true");
  rain.dataset.mode = shouldUseLiteEffects() ? "lite" : "full";
  moneyRainRoot = rain;

  const count = getRainItemCount();
  Array.from({ length: count }, () => buildRainItem()).forEach((note) => rain.append(note));

  rain.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-rain-item]") : null;

    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    if (moneyGameResetTimeoutId) {
      return;
    }

    const amountEuro = Number.parseFloat(target.dataset.amountEuro || "0") || 0;

    if (!amountEuro) {
      return;
    }

    if (!resolveRainItem(target)) {
      return;
    }

    const currentCollected = moneyGameState.collected;
    const nextCollected = currentCollected + amountEuro;
    const appliedDelta = nextCollected - currentCollected;

    showMoneyGamePanel();
    moneyGameState.clicks += 1;
    moneyGameState.collected = nextCollected;
    updateMoneyGamePanel();

    if (appliedDelta) {
      spawnMoneyPop(target, appliedDelta);
    }

    replaceMoneyNote(target);

    const taxShouldApply = moneyGameState.clicks % 10 === 0;

    if (taxShouldApply) {
      const taxAmount = getTaxCharge(moneyGameState.collected);

      if (taxAmount > 0) {
        moneyGameState.collected -= taxAmount;
        recordMoneyGameExpense("данък", taxAmount);
        updateMoneyGamePanel();
        spawnMoneyPop(target, -taxAmount);
        setMoneyGameMessage(getTaxHitMessage(taxAmount), {
          state: "tax",
          temporary: true,
          duration: 2500,
        });
      }
    }

    if (amountEuro < 0) {
      const expenseLabel = target.dataset.label || "Разход";
      const isCritical = target.dataset.critical === "true";
      recordMoneyGameExpense(expenseLabel, amountEuro);
      updateMoneyGamePanel();
      if (!taxShouldApply) {
        setMoneyGameMessage(getExpenseHitMessage(expenseLabel, { critical: isCritical }), {
          state: "expense",
          temporary: true,
          duration: 2200,
        });
      }
      scheduleMoneyGameHide();
      return;
    }

    if (moneyGameState.collected < moneyGameState.target) {
      if (!taxShouldApply) {
        setMoneyGameMessage(getMoneyIdleMessage(), { state: "collecting" });
      }
      scheduleMoneyGameHide();
      return;
    }

    const completedTarget = moneyGameState.target;
    const completedPromise = getMoneyPromise();
    const nextTarget = getNextMoneyTarget(completedTarget, moneyGameState.rounds);
    moneyGameState.rounds += 1;
    const nextPromise = getMoneyPromise();
    const panel = getMoneyGamePanel();
    panel.classList.add("is-complete");
    updateMoneyGamePanel();
    setMoneyGameMessage(getMoneyMockMessage(nextTarget, completedPromise, nextPromise), {
      state: "mocking",
      temporary: true,
      duration: 3200,
    });

    moneyGameResetTimeoutId = window.setTimeout(() => {
      moneyGameState.target = nextTarget;
      moneyGameState.collected = 0;
      if (panel?.isConnected) {
        panel.classList.remove("is-complete");
      }
      if (moneyGameEnabled) {
        updateMoneyGamePanel();
      }
      moneyGameResetTimeoutId = 0;
      if (moneyGameEnabled) {
        scheduleMoneyGameHide();
      }
    }, 920);
  });

  rain.addEventListener("animationiteration", (event) => {
    if (event.animationName !== "money-fall") {
      return;
    }

    const target = event.target instanceof Element ? event.target.closest(".expense-note") : null;

    if (!(target instanceof HTMLButtonElement) || moneyGameResetTimeoutId) {
      return;
    }

    if (!resolveRainItem(target)) {
      return;
    }

    const amountEuro = Number.parseFloat(target.dataset.amountEuro || "0") || 0;

    if (!amountEuro) {
      replaceMoneyNote(target);
      return;
    }

    showMoneyGamePanel();
    moneyGameState.collected += amountEuro;
    updateMoneyGamePanel();
    spawnMoneyPop(target, amountEuro);
    replaceMoneyNote(target);

    const expenseLabel = target.dataset.label || "Разход";
    const isCritical = target.dataset.critical === "true";
    recordMoneyGameExpense(expenseLabel, amountEuro);
    updateMoneyGamePanel();
    setMoneyGameMessage(getExpenseHitMessage(expenseLabel, { autoCharged: true, critical: isCritical }), {
      state: "expense",
      temporary: true,
      duration: 2400,
    });
    scheduleMoneyGameHide();
  });

  document.body.prepend(rain);
  updateMoneyGamePanel();
}

function initScrollEffects() {
  if (scrollEffectsBound || prefersReducedMotion() || shouldUseLiteEffects()) {
    return;
  }

  scrollEffectsBound = true;

  const update = () => {
    const heroes = Array.from(document.querySelectorAll(".hero"));
    const viewportHeight = window.innerHeight || 1;

    heroes.forEach((hero) => {
      const rect = hero.getBoundingClientRect();
      const depth = Math.max(-1, Math.min(1, (viewportHeight * 0.52 - rect.top) / viewportHeight));
      const glow = Math.max(0.46, 1 - Math.abs(depth) * 0.38);

      hero.style.setProperty("--hero-depth", depth.toFixed(4));
      hero.style.setProperty("--hero-glow", glow.toFixed(4));
    });
  };

  let rafId = 0;
  const requestTick = () => {
    if (rafId) {
      return;
    }

    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      update();
    });
  };

  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
  requestTick();
}

function initPageEffects() {
  if (typeof document === "undefined" || !document.body) {
    return;
  }

  const liteEffects = applyPerformanceMode();
  moneyGameEnabled = readMoneyGamePreference();
  updateMoneyGameToggle();
  refreshPageEffects();
  if (moneyGameEnabled) {
    if (liteEffects && document.readyState !== "complete") {
      window.addEventListener("load", startMoneyRainWhenReady, { once: true });
    } else {
      startMoneyRainWhenReady();
    }
  }
  document.addEventListener("guru:intro-dismissed", () => {
    if (moneyGameEnabled) {
      startMoneyRainWhenReady();
    }
  });
  initScrollEffects();
}

window.refreshPageEffects = refreshPageEffects;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPageEffects, { once: true });
} else {
  initPageEffects();
}
