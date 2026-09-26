(function() {
let revealObserver = null;
const observedRevealNodes = new WeakSet();
let scrollEffectsBound = false;

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
  applyPerformanceMode();
  refreshPageEffects();
  initScrollEffects();
}
window.refreshPageEffects = refreshPageEffects;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPageEffects, { once: true });
} else {
  initPageEffects();
}
})();
