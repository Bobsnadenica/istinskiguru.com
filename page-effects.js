let revealObserver = null;
const observedRevealNodes = new WeakSet();
let scrollEffectsBound = false;
let moneyRainBound = false;
let moneyRainRoot = null;
let moneyGamePanel = null;
let moneyGameMessageTimeoutId = 0;
let moneyGameResetTimeoutId = 0;
let moneyGameHideTimeoutId = 0;
const moneyGameState = {
  collected: 0,
  target: 1400,
  clicks: 0,
  rounds: 0,
};
const moneyGameHideDelay = 2600;
const expenseEvents = [
  { label: "бебе", amountEuro: 260 },
  { label: "сватба", amountEuro: 480 },
  { label: "ремонт на кола", amountEuro: 340 },
  { label: "наем", amountEuro: 420 },
  { label: "зъболекар", amountEuro: 180 },
  { label: "ветеринар", amountEuro: 160 },
  { label: "рожден ден", amountEuro: 140 },
  { label: "данъци", amountEuro: 390 },
  { label: "нов телефон", amountEuro: 220 },
];

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
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

function getMoneyMockMessage(nextTarget) {
  const messages = [
    `Чудесно. Вече си почти там. Остава само още един курс за ${formatMoneyGameAmount(nextTarget)}.`,
    "Браво. Наистина си съвсем близо. Само още един курс и вече започва истинската промяна.",
    "Супер напредък. Буквално си на крачка. Следващата стъпка е само още един курс.",
    "Вече си толкова близо, че би било жалко да спреш точно преди още един курс. Почти стана.",
  ];

  return messages[moneyGameState.rounds % messages.length];
}

function getMoneyIdleMessage() {
  const remaining = Math.max(0, moneyGameState.target - moneyGameState.collected);
  return remaining
    ? `Почти си там. Остават само още ${formatMoneyGameAmount(remaining)}.`
    : "Почти си готов. Остава съвсем малко.";
}

function getExpenseHitMessage(label) {
  const messages = [
    `${label}. Няма страшно. Пак си почти там.`,
    `${label}. Малък разход. Но вече си доста близо.`,
    `${label}. Леко те дръпна назад, но си почти готов.`,
    `${label}. Не е идеално, но следващото ниво пак е съвсем наблизо.`,
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

function createMoneyGamePanel() {
  const panel = document.createElement("aside");
  panel.className = "money-game-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <p class="money-game-eyebrow">Фонд</p>
    <h2>Следващо ниво</h2>
    <div class="money-game-stack">
      <div class="money-game-meter" aria-hidden="true">
        <div class="money-game-meter-fill" data-money-game-fill></div>
      </div>
      <div class="money-game-stats">
        <p class="money-game-amount"><strong data-money-game-current>0</strong> €</p>
        <p class="money-game-target">цел <span data-money-game-target>${formatMoneyGameAmount(moneyGameState.target)}</span> €</p>
      </div>
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
  const panel = getMoneyGamePanel();
  const fill = panel.querySelector("[data-money-game-fill]");
  const current = panel.querySelector("[data-money-game-current]");
  const target = panel.querySelector("[data-money-game-target]");
  const progress = moneyGameState.target ? Math.max(0, Math.min(1, moneyGameState.collected / moneyGameState.target)) : 0;

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
}

function spawnMoneyPop(note, amountEuro) {
  const rect = note.getBoundingClientRect();
  const pop = document.createElement("span");
  pop.className = "money-pop";

  if (amountEuro < 0) {
    pop.classList.add("is-negative");
  }

  pop.textContent = `${amountEuro < 0 ? "-" : "+"}${formatMoneyGameAmount(Math.abs(amountEuro))} €`;
  pop.style.left = `${rect.left + rect.width / 2}px`;
  pop.style.top = `${rect.top + rect.height / 2}px`;
  document.body.append(pop);
  window.setTimeout(() => pop.remove(), 950);
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
  note.style.setProperty("--duration", `${14 + Math.random() * 12}s`);
  note.style.setProperty("--delay", `${-Math.random() * 18}s`);
  note.style.setProperty("--drift", `${-80 + Math.random() * 160}px`);
  note.style.setProperty("--rotation", `${-18 + Math.random() * 36}deg`);
  note.style.setProperty("--scale", `${0.76 + Math.random() * 0.48}`);
  note.style.setProperty("--swing-duration", `${3.4 + Math.random() * 3.2}s`);
  note.innerHTML = `
    <span class="money-note-core">
      <span class="money-note-mark">${mark}</span>
      <span class="money-note-currency">${currency}</span>
    </span>
  `;
  return note;
}

function buildExpenseNote() {
  const expense = expenseEvents[Math.floor(Math.random() * expenseEvents.length)];
  const note = document.createElement("button");
  note.className = "expense-note";
  note.type = "button";
  note.tabIndex = -1;
  note.dataset.rainItem = "expense";
  note.dataset.amountEuro = String(-expense.amountEuro);
  note.dataset.label = expense.label;
  note.setAttribute(
    "aria-label",
    `${expense.label}. Ако го натиснеш, ще отнеме ${formatMoneyGameAmount(expense.amountEuro)} евро от фонда.`,
  );
  note.style.setProperty("--left", `${Math.random() * 100}%`);
  note.style.setProperty("--duration", `${16 + Math.random() * 12}s`);
  note.style.setProperty("--delay", `${-Math.random() * 18}s`);
  note.style.setProperty("--drift", `${-100 + Math.random() * 200}px`);
  note.style.setProperty("--rotation", `${-16 + Math.random() * 32}deg`);
  note.style.setProperty("--scale", `${0.84 + Math.random() * 0.4}`);
  note.style.setProperty("--swing-duration", `${4.2 + Math.random() * 3.4}s`);
  note.innerHTML = `
    <span class="expense-note-core">
      <span class="expense-note-label">${expense.label}</span>
    </span>
  `;
  return note;
}

function buildRainItem() {
  return Math.random() < 0.24 ? buildExpenseNote() : buildMoneyNote();
}

function initMoneyRain() {
  if (moneyRainBound || prefersReducedMotion() || !document.body) {
    return;
  }

  moneyRainBound = true;

  const rain = document.createElement("div");
  rain.className = "money-rain";
  rain.setAttribute("aria-hidden", "true");
  moneyRainRoot = rain;

  const count = Math.max(10, Math.min(18, Math.round(window.innerWidth / 95)));
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
      if (!taxShouldApply) {
        setMoneyGameMessage(getExpenseHitMessage(expenseLabel), {
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
    const nextTarget = getNextMoneyTarget(completedTarget, moneyGameState.rounds);
    moneyGameState.rounds += 1;
    const panel = getMoneyGamePanel();
    panel.classList.add("is-complete");
    updateMoneyGamePanel();
    setMoneyGameMessage(getMoneyMockMessage(nextTarget), {
      state: "mocking",
      temporary: true,
      duration: 3200,
    });

    moneyGameResetTimeoutId = window.setTimeout(() => {
      moneyGameState.target = nextTarget;
      moneyGameState.collected = 0;
      panel.classList.remove("is-complete");
      updateMoneyGamePanel();
      moneyGameResetTimeoutId = 0;
      scheduleMoneyGameHide();
    }, 920);
  });

  document.body.prepend(rain);
  updateMoneyGamePanel();
}

function initScrollEffects() {
  if (scrollEffectsBound || prefersReducedMotion()) {
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

  refreshPageEffects();
  initMoneyRain();
  initScrollEffects();
}

window.refreshPageEffects = refreshPageEffects;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPageEffects, { once: true });
} else {
  initPageEffects();
}
