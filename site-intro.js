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

function hasDirectContentTarget() {
  return Boolean(window.location.hash) || document.body.classList.contains("profile-page");
}

function createSiteIntro() {
  const intro = document.createElement("div");
  intro.className = "site-intro";
  intro.setAttribute("data-site-intro", "");
  intro.innerHTML = `
    <div class="site-intro-backdrop"></div>
    <section class="site-intro-panel" role="dialog" aria-modal="true" aria-labelledby="site-intro-title" aria-describedby="site-intro-description">
      <p class="site-intro-eyebrow">Сатира • Scam Сигнали • Публични Материали</p>
      <h2 id="site-intro-title">Комедия за обещанията, които продават лесни пари прекалено красиво.</h2>
      <div class="site-intro-body" id="site-intro-description">
        <p class="site-intro-copy">
          Това е сатиричен каталог за публични онлайн гуру образи, курсове,
          менторства, пасивен доход и други обещания, които звучат твърде добре,
          за да не ги погледнем с лупа и усмивка.
        </p>
        <p class="site-intro-copy">
          Работим с публични материали и редакционен коментар. Шегуваме се с
          маркетингови модели, натиск, ъпсел и чудодейни формули, без да
          произнасяме присъди вместо съд.
        </p>
        <p class="site-intro-copy site-intro-copy-muted">
          Накратко: смей се, но проверявай. Особено преди да пратиш пари след
          “безплатен” семинар.
        </p>
      </div>
      <div class="site-intro-footer">
        <p class="site-intro-love">Сатира, публичен интерес и малко здравословно недоверие.</p>
        <button class="button site-intro-button" type="button" data-site-intro-close>
          Продължи
        </button>
      </div>
    </section>
  `;

  return intro;
}

function initSiteIntro() {
  if (typeof document === "undefined" || !document.body || hasDirectContentTarget() || !shouldShowSiteIntro()) {
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
