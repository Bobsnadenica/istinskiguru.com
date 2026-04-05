let revealObserver = null;
const observedRevealNodes = new WeakSet();
let scrollEffectsBound = false;
let moneyRainBound = false;

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

function buildMoneyNote() {
  const values = [
    ["100", "лв"],
    ["500", "лв"],
    ["100", "$"],
    ["250", "$"],
    ["100", "€"],
    ["200", "€"],
  ];
  const [mark, currency] = values[Math.floor(Math.random() * values.length)];
  const note = document.createElement("span");
  note.className = "money-note";
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

function initMoneyRain() {
  if (moneyRainBound || prefersReducedMotion() || !document.body) {
    return;
  }

  moneyRainBound = true;

  const rain = document.createElement("div");
  rain.className = "money-rain";
  rain.setAttribute("aria-hidden", "true");

  const count = Math.max(10, Math.min(18, Math.round(window.innerWidth / 95)));
  Array.from({ length: count }, () => buildMoneyNote()).forEach((note) => rain.append(note));

  document.body.prepend(rain);
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
