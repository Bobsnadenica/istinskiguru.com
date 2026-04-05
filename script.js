const profileList = document.querySelector("#profile-list");
const searchInput = document.querySelector("#guru-search");
const searchStatus = document.querySelector("#search-status");
const heroImage = document.querySelector("#hero-image");
const heroQuoteLabel = document.querySelector("#hero-quote-label");
const heroQuoteText = document.querySelector("#hero-quote-text");
const canonicalLink = document.querySelector('link[rel="canonical"]');
const fallbackProfiles = Array.isArray(window.__GURU_PROFILES__) ? window.__GURU_PROFILES__ : [];
const heroStorageKey = "guruHeroIndex";
const defaultHeroLabel = heroQuoteLabel?.textContent?.trim() || "Полево наблюдение";
const defaultHeroText =
  heroQuoteText?.textContent?.trim() || "Силно кафе. Още по-силна енергия за наставничество.";

function getProfileId(profile) {
  if (profile?.id) {
    return String(profile.id).trim() || "profil";
  }

  const preferredSource = String(profile?.image || "").split("/").pop() || String(profile?.name || "profil");

  return preferredSource
    .replace(/\.[^.]+$/u, "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "profil";
}

function getCanonicalPageUrl() {
  const canonicalHref = canonicalLink?.href || "";

  if (!canonicalHref) {
    return "";
  }

  try {
    const canonicalUrl = new URL(canonicalHref);
    canonicalUrl.hash = "";
    canonicalUrl.search = "";
    return canonicalUrl.toString();
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeForSearch(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function getSearchableText(profile) {
  return normalizeForSearch(
    [
      profile.name,
      profile.description,
      profile.kicker,
      profile.summary,
      profile.aura,
      profile.funnel,
      profile.insight,
      profile.channels?.join(" "),
      profile.links?.map((link) => `${link.label} ${link.url}`).join(" "),
    ].join(" "),
  );
}

function getVideoMimeType(videoPath) {
  const lowered = String(videoPath || "").toLowerCase();

  if (lowered.endsWith(".webm")) {
    return "video/webm";
  }

  if (lowered.endsWith(".mov")) {
    return "video/quicktime";
  }

  if (lowered.endsWith(".m4v")) {
    return "video/x-m4v";
  }

  return "video/mp4";
}

function getCurrentPageUrl() {
  const canonicalUrl = getCanonicalPageUrl();

  if (canonicalUrl) {
    return canonicalUrl;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const pageUrl = new URL(window.location.href);
  pageUrl.hash = "";
  pageUrl.search = "";

  return pageUrl.toString();
}

function getProfileShareUrl(profile) {
  const baseUrl = getCurrentPageUrl();
  const profileId = getProfileId(profile);

  return profileId ? `${baseUrl}#${profileId}` : baseUrl;
}

function getFacebookShareUrl(profile) {
  const shareParams = new URLSearchParams({
    u: getProfileShareUrl(profile),
  });

  return `https://www.facebook.com/sharer/sharer.php?${shareParams.toString()}`;
}

function pickHeroProfile(profiles) {
  const heroProfiles = profiles.filter((profile) => profile?.image);

  if (!heroProfiles.length) {
    return null;
  }

  try {
    const previousIndex = Number.parseInt(window.localStorage.getItem(heroStorageKey) || "", 10);
    const nextIndex = (Number.isInteger(previousIndex) ? previousIndex + 1 : 0) % heroProfiles.length;
    window.localStorage.setItem(heroStorageKey, String(nextIndex));
    return heroProfiles[nextIndex];
  } catch {
    return heroProfiles[0];
  }
}

function updateHeroVisual(profiles) {
  if (!heroImage) {
    return;
  }

  const heroProfile = pickHeroProfile(profiles);

  if (!heroProfile) {
    return;
  }

  heroImage.src = encodeURI(heroProfile.image);
  heroImage.alt = heroProfile.alt || "";
  heroImage.style.objectPosition = heroProfile.orientation === "landscape" ? "center center" : "center 32%";

  if (heroQuoteLabel) {
    heroQuoteLabel.textContent = heroProfile.name || defaultHeroLabel;
  }

  if (heroQuoteText) {
    heroQuoteText.textContent =
      heroProfile.imageNote || heroProfile.kicker || heroProfile.summary || defaultHeroText;
  }
}

function renderProfiles(profiles, options = {}) {
  if (!profileList) {
    return;
  }

  const emptyTitle = options.emptyTitle || "Каталогът е празен";
  const emptyBody =
    options.emptyBody || "Провери отново по-късно за нови попълнения, линкове и блестящи обещания.";

  if (!profiles.length) {
    profileList.innerHTML = `
      <article class="profile-card reveal is-empty">
        <div class="profile-copy">
          <p class="profile-kicker">${escapeHtml(emptyTitle)}</p>
          <h3>${escapeHtml(emptyBody)}</h3>
        </div>
      </article>
    `;
    return;
  }

  profileList.innerHTML = profiles
    .map((profile) => {
      const profileId = getProfileId(profile);
      const hook = {
        kicker: profile.kicker || "",
        summary: profile.summary || "",
        aura: profile.aura || "",
        funnel: profile.funnel || "",
        insight: profile.insight || "",
      };
      const kickerBlock = hook.kicker ? `<p class="profile-kicker">${escapeHtml(hook.kicker)}</p>` : "";
      const summaryBlock = hook.summary ? `<p class="profile-summary">${escapeHtml(hook.summary)}</p>` : "";
      const shareBlock = `
        <div class="profile-actions">
          <a
            class="share-button share-button-facebook"
            href="${escapeHtml(getFacebookShareUrl(profile))}"
            target="_blank"
            rel="noopener"
            aria-label="Сподели профила на ${escapeHtml(profile.name)} във Facebook"
          >
            Сподели във Facebook
          </a>
        </div>
      `;
      const descriptionBlock = profile.description
        ? `
            <div class="profile-description">
              <p class="profile-description-label">Описание</p>
              <p>${escapeHtml(profile.description)}</p>
            </div>
          `
        : "";
      const channelLinks = profile.links
        .map(
          (link) =>
            `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`,
        )
        .join("");
      const signalItems = [
        `
          <div>
            <dt>Канали</dt>
            <dd class="channel-links">${channelLinks}</dd>
          </div>
        `,
      ];

      if (hook.aura) {
        signalItems.push(`
          <div>
            <dt>Обещан вайб</dt>
            <dd>${escapeHtml(hook.aura)}</dd>
          </div>
        `);
      }

      if (hook.funnel) {
        signalItems.push(`
          <div>
            <dt>Прочит</dt>
            <dd>${escapeHtml(hook.funnel)}</dd>
          </div>
        `);
      }

      const signalGrid = `<dl class="signal-grid">${signalItems.join("")}</dl>`;
      const insightBlock = hook.insight ? `<p class="profile-insight">${escapeHtml(hook.insight)}</p>` : "";
      const profileVideos = Array.isArray(profile.videos)
        ? profile.videos
        : profile.video
          ? [profile.video]
          : [];
      const profileVideo = profileVideos.length
        ? `
            <div class="profile-video-wrap" data-count="${profileVideos.length}">
              <p class="profile-video-label">${profileVideos.length > 1 ? "Видеа" : "Видео"}</p>
              <div class="profile-video-grid">
                ${profileVideos
                  .map(
                    (videoPath) => `
                      <div class="profile-video-frame">
                        <video controls playsinline preload="metadata" poster="${encodeURI(profile.image)}">
                          <source src="${encodeURI(videoPath)}" type="${getVideoMimeType(videoPath)}" />
                        </video>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
            </div>
          `
        : "";

      return `
        <article
          class="profile-card reveal"
          id="${escapeHtml(profileId)}"
          tabindex="-1"
          data-orientation="${escapeHtml(profile.orientation)}"
        >
          <div class="profile-media">
            <img src="${encodeURI(profile.image)}" alt="${escapeHtml(profile.alt)}" />
            <div class="media-chip">${escapeHtml(profile.imageNote)}</div>
          </div>

          <div class="profile-copy">
            <div class="profile-main">
              ${kickerBlock}
              <h3>${escapeHtml(profile.name)}</h3>
              ${summaryBlock}
              ${shareBlock}
              ${descriptionBlock}
              ${signalGrid}
              ${insightBlock}
            </div>
            ${profileVideo}
          </div>
        </article>
      `;
    })
    .join("");
}

function syncProfileHash(options = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const { scroll = true } = options;
  const activeHash = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
  const targetedCards = Array.from(document.querySelectorAll(".profile-card.is-targeted"));

  targetedCards.forEach((card) => {
    if (card.id !== activeHash) {
      card.classList.remove("is-targeted");
    }
  });

  if (!activeHash) {
    return;
  }

  const targetCard = document.getElementById(activeHash);

  if (!targetCard) {
    return;
  }

  targetCard.classList.add("is-targeted");

  if (!scroll) {
    return;
  }

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.requestAnimationFrame(() => {
    targetCard.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  });
}

function updateSearchStatus(filteredCount, totalCount, query) {
  if (!searchStatus) {
    return;
  }

  if (!totalCount) {
    searchStatus.textContent = "";
    return;
  }

  if (!query) {
    searchStatus.textContent = `${totalCount} профила в каталога.`;
    return;
  }

  searchStatus.textContent = `Показани ${filteredCount} от ${totalCount} резултата за "${query}".`;
}

function attachSearch(allProfiles) {
  if (!searchInput) {
    return;
  }

  const applyFilter = () => {
    const rawQuery = searchInput.value.trim();
    const query = normalizeForSearch(rawQuery);
    const filteredProfiles = query
      ? allProfiles.filter((profile) => getSearchableText(profile).includes(query))
      : allProfiles;

    if (!filteredProfiles.length) {
      renderProfiles([], {
        emptyTitle: "Няма съвпадения",
        emptyBody: `Нищо не беше намерено за "${rawQuery}".`,
      });
      setupReveals();
      syncProfileHash({ scroll: false });
      updateSearchStatus(0, allProfiles.length, rawQuery);
      return;
    }

    renderProfiles(filteredProfiles);
    setupReveals();
    syncProfileHash({ scroll: false });
    updateSearchStatus(filteredProfiles.length, allProfiles.length, rawQuery);
  };

  searchInput.addEventListener("input", applyFilter);
  applyFilter();
}

async function loadProfiles() {
  const isLocalRuntime =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (typeof window.fetch !== "function" || !isLocalRuntime) {
    return fallbackProfiles;
  }

  try {
    const response = await fetch("/api/profiles", {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (Array.isArray(payload?.profiles)) {
      return payload.profiles;
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    return fallbackProfiles;
  } catch {
    return fallbackProfiles;
  }
}

function setupReveals() {
  const revealNodes = Array.from(document.querySelectorAll(".reveal"));

  if (!("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -40px 0px",
    },
  );

  revealNodes.forEach((node) => observer.observe(node));
}

async function initPage() {
  const profiles = await loadProfiles();
  updateHeroVisual(profiles);
  renderProfiles(profiles);
  setupReveals();
  attachSearch(profiles);
  window.addEventListener("hashchange", () => syncProfileHash());
  syncProfileHash({ scroll: Boolean(window.location.hash) });
}

initPage();
