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
    <section class="site-intro-panel" role="dialog" aria-modal="true" aria-labelledby="site-intro-title">
      <p class="site-intro-eyebrow">Вдъхновение • Визия • Обществена Полза</p>
      <h2 id="site-intro-title">Направих този сайт от чисто възхищение, разбира се.</h2>
      <p class="site-intro-copy">
        Тези хора толкова силно ме вдъхновиха, че направо не можах да си стоя
        мирно. Видях толкова много величие, толкова много хоризонти, толкова
        много премиум енергия и си казах: това не бива да остане разпръснато
        из интернет.
      </p>
      <p class="site-intro-copy">
        Затова им направих сайт. Събрах ги на едно място с надеждата да помогнат
        и на вас, по същия фин, ненатрапчив и напълно неземно скромен начин, по
        който очевидно вече помагат на света всеки ден.
      </p>
      <p class="site-intro-copy site-intro-copy-muted">
        Ако и вие търсите правилна осанка, уверен поглед към бъдещето и още едно
        следващо ниво, добре дошли.
      </p>
      <button class="button site-intro-button" type="button" data-site-intro-close>
        Продължи
      </button>
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
