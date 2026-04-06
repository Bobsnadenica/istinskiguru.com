const siteIntroSessionKey = "guruSiteIntroDismissed";

function shouldShowSiteIntro() {
  try {
    return window.sessionStorage.getItem(siteIntroSessionKey) !== "true";
  } catch {
    return true;
  }
}

function markSiteIntroDismissed() {
  try {
    window.sessionStorage.setItem(siteIntroSessionKey, "true");
  } catch {
    // Ignore storage failures and just hide the intro for the current page.
  }
}

function createSiteIntro() {
  const intro = document.createElement("div");
  intro.className = "site-intro";
  intro.setAttribute("data-site-intro", "");
  intro.innerHTML = `
    <div class="site-intro-backdrop"></div>
    <section class="site-intro-panel" role="dialog" aria-modal="true" aria-labelledby="site-intro-title" aria-describedby="site-intro-description">
      <p class="site-intro-eyebrow">Любов • Подкрепа • Обществена Полза</p>
      <h2 id="site-intro-title">Този сайт е направен с много любов. И съвсем малко възторг.</h2>
      <div class="site-intro-body" id="site-intro-description">
        <p class="site-intro-copy">
          Тези хора ме вдъхновиха толкова дълбоко, че почувствах почти
          духовно-задължителен порив да им направя сайт. Когато човек види
          толкова концентриран бизнес размах, просто иска да го подреди красиво
          и да го поднесе на обществото.
        </p>
        <p class="site-intro-copy">
          Тук разпространявам много любов и, както личи, обожавам да помагам на
          хората. Затова събрах тези сияйни примери на едно място с надеждата да
          помогнат и на вас със същата безкрайна щедрост, деликатност и
          напълно земна скромност, с която очевидно вече помагат на света.
        </p>
        <p class="site-intro-copy site-intro-copy-muted">
          Накратко: обществена услуга, изработена с грижа, прозрачност и едно
          подозрително голямо количество добро намерение.
        </p>
      </div>
      <div class="site-intro-footer">
        <p class="site-intro-love">Споделям много любов. Помагам на хората. Просто такъв човек съм.</p>
        <button class="button site-intro-button" type="button" data-site-intro-close>
          Продължи
        </button>
      </div>
    </section>
  `;

  return intro;
}

function initSiteIntro() {
  if (typeof document === "undefined" || !document.body || !shouldShowSiteIntro()) {
    return;
  }

  const intro = createSiteIntro();
  const closeButton = intro.querySelector("[data-site-intro-close]");

  const dismissIntro = () => {
    markSiteIntroDismissed();
    document.body.classList.remove("site-intro-open");
    intro.classList.add("is-dismissed");
    document.dispatchEvent(new CustomEvent("guru:intro-dismissed"));
    window.setTimeout(() => {
      intro.remove();
    }, 240);
  };

  closeButton?.addEventListener("click", dismissIntro);
  intro.addEventListener("click", (event) => {
    if (event.target === intro.querySelector(".site-intro-backdrop")) {
      dismissIntro();
    }
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && document.body.classList.contains("site-intro-open")) {
        dismissIntro();
      }
    },
    { once: true },
  );

  document.body.append(intro);
  document.body.classList.add("site-intro-open");
  document.dispatchEvent(new CustomEvent("guru:intro-shown"));
  window.requestAnimationFrame(() => {
    intro.classList.add("is-visible");
    closeButton?.focus();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSiteIntro, { once: true });
} else {
  initSiteIntro();
}
