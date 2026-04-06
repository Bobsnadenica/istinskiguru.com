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

function getShareIcon(platform) {
  switch (platform) {
    case "facebook":
      return `
        <svg class="share-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M13.6 21v-7.3h2.45l.37-2.87H13.6V9.01c0-.83.23-1.4 1.42-1.4h1.52V5.05c-.27-.04-1.2-.11-2.28-.11-2.25 0-3.79 1.37-3.79 3.89v1.97H7.93v2.87h2.54V21z" />
        </svg>
      `;
    case "linkedin":
      return `
        <svg class="share-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M6.78 8.64a1.62 1.62 0 1 1 0-3.24 1.62 1.62 0 0 1 0 3.24zM5.38 9.92h2.8V18h-2.8zM9.95 9.92h2.68v1.1h.04c.38-.7 1.29-1.44 2.65-1.44 2.84 0 3.37 1.8 3.37 4.13V18h-2.8v-3.58c0-.85-.02-1.94-1.24-1.94-1.24 0-1.43.91-1.43 1.89V18h-2.8z" />
        </svg>
      `;
    case "instagram":
      return `
        <svg class="share-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3.35" y="3.35" width="17.3" height="17.3" rx="5.1" fill="none" stroke="currentColor" stroke-width="1.9" />
          <circle cx="12" cy="12" r="4.15" fill="none" stroke="currentColor" stroke-width="1.9" />
          <circle cx="17.35" cy="6.75" r="1.2" fill="currentColor" />
        </svg>
      `;
    case "tiktok":
      return `
        <svg class="share-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M14.58 3.4c.84 1.22 1.83 2.03 3.49 2.27v2.3a7.05 7.05 0 0 1-3.35-1.06v5.15c0 3.42-2.36 5.84-5.71 5.84A5.48 5.48 0 0 1 3.5 12.4c0-3.02 2.3-5.41 5.45-5.41.35 0 .68.03.98.1v2.42a3.49 3.49 0 0 0-.98-.14c-1.67 0-2.94 1.27-2.94 3.01 0 1.86 1.42 3.03 2.89 3.03 1.95 0 3.17-1.53 3.17-3.68V3.4z" />
        </svg>
      `;
    default:
      return "";
  }
}

function normalizeForSearch(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function shuffleProfiles(profiles) {
  const shuffledProfiles = Array.isArray(profiles) ? [...profiles] : [];

  for (let index = shuffledProfiles.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledProfiles[index], shuffledProfiles[swapIndex]] = [shuffledProfiles[swapIndex], shuffledProfiles[index]];
  }

  return shuffledProfiles;
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

function buildSearchIndex(profiles) {
  return profiles.map((profile) => ({
    profile,
    searchableText: getSearchableText(profile),
  }));
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

function getSiteRootUrl() {
  const canonicalUrl = getCanonicalPageUrl();

  if (canonicalUrl) {
    return canonicalUrl;
  }

  if (typeof window === "undefined") {
    return "";
  }

  return new URL("/", window.location.href).toString();
}

function getProfileShareUrl(profile) {
  const baseUrl = getSiteRootUrl();
  const profileId = getProfileId(profile);

  if (!baseUrl || !profileId) {
    return baseUrl;
  }

  return new URL(`profiles/${profileId}/`, baseUrl).toString();
}

function getFacebookShareUrl(profile) {
  const shareParams = new URLSearchParams({
    u: getProfileShareUrl(profile),
  });

  return `https://www.facebook.com/sharer/sharer.php?${shareParams.toString()}`;
}

function getLinkedInShareUrl(profile) {
  const shareParams = new URLSearchParams({
    url: getProfileShareUrl(profile),
  });

  return `https://www.linkedin.com/sharing/share-offsite/?${shareParams.toString()}`;
}

function getShareMessage(profile) {
  return profile.summary || profile.imageNote || `Профилът на ${profile.name} в Каталога на Онлайн Гурута.`;
}

function getProfileVideos(profile) {
  if (Array.isArray(profile?.videos)) {
    return profile.videos;
  }

  if (profile?.video) {
    return [profile.video];
  }

  return [];
}

function getShareButtons(profile, options = {}) {
  const { includeOpenLink = false } = options;
  const shareUrl = getProfileShareUrl(profile);
  const shareMessage = getShareMessage(profile);
  const profileVideos = getProfileVideos(profile);
  const firstVideo = profileVideos[0] || "";
  const buttons = [
    `
      <a
        class="share-button share-button-facebook"
        href="${escapeHtml(getFacebookShareUrl(profile))}"
        target="_blank"
        rel="noopener"
        aria-label="Сподели профила на ${escapeHtml(profile.name)} във Facebook"
        title="Facebook"
      >
        ${getShareIcon("facebook")}
      </a>
    `,
    `
      <a
        class="share-button share-button-linkedin"
        href="${escapeHtml(getLinkedInShareUrl(profile))}"
        target="_blank"
        rel="noopener"
        aria-label="Сподели профила на ${escapeHtml(profile.name)} в LinkedIn"
        title="LinkedIn"
      >
        ${getShareIcon("linkedin")}
      </a>
    `,
  ];

  if (firstVideo) {
    const nativeAttributes = `
        href="${escapeHtml(shareUrl)}"
        role="button"
        data-native-share="instagram"
        data-share-title="${escapeHtml(profile.name)}"
        data-share-text="${escapeHtml(shareMessage)}"
        data-share-url="${escapeHtml(shareUrl)}"
        data-share-video="${escapeHtml(firstVideo)}"
        aria-label="Сподели профила на ${escapeHtml(profile.name)} към Instagram"
        title="Instagram"
      `;
    buttons.push(`
      <a class="share-button share-button-instagram" ${nativeAttributes}>
        ${getShareIcon("instagram")}
      </a>
    `);
    buttons.push(`
      <a
        class="share-button share-button-tiktok"
        href="${escapeHtml(shareUrl)}"
        role="button"
        data-native-share="tiktok"
        data-share-title="${escapeHtml(profile.name)}"
        data-share-text="${escapeHtml(shareMessage)}"
        data-share-url="${escapeHtml(shareUrl)}"
        data-share-video="${escapeHtml(firstVideo)}"
        aria-label="Сподели профила на ${escapeHtml(profile.name)} към TikTok"
        title="TikTok"
      >
        ${getShareIcon("tiktok")}
      </a>
    `);
  }

  if (includeOpenLink) {
    buttons.push(`
      <a class="button button-secondary profile-open-link" href="${escapeHtml(shareUrl)}">
        Отвори споделимата страница
      </a>
    `);
  }

  return `
    <div class="profile-actions">
      <div class="share-button-group" aria-label="Опции за споделяне">
        <span class="share-button-heading">Сподели</span>
        ${buttons.join("")}
      </div>
    </div>
  `;
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
      const profileVideos = getProfileVideos(profile);
      const kickerBlock = hook.kicker ? `<p class="profile-kicker">${escapeHtml(hook.kicker)}</p>` : "";
      const summaryBlock = hook.summary ? `<p class="profile-summary">${escapeHtml(hook.summary)}</p>` : "";
      const shareBlock = getShareButtons(profile);
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
      const profileVideo = profileVideos.length
        ? `
            <div class="profile-video-wrap" data-count="${profileVideos.length}">
              <p class="profile-video-label">${profileVideos.length > 1 ? "Видеа" : "Видео"}</p>
              <div class="profile-video-grid">
                ${profileVideos
                  .map(
                    (videoPath, index) => `
                      <div class="profile-video-frame">
                        <button
                          class="profile-video-launch"
                          type="button"
                          data-video-launch
                          data-video-src="${encodeURI(videoPath)}"
                          data-video-type="${getVideoMimeType(videoPath)}"
                          data-video-poster="${encodeURI(profile.image)}"
                          data-video-title="${escapeHtml(`${profile.name} • ${profileVideos.length > 1 ? `Видео ${index + 1}` : "Видео"}`)}"
                          aria-label="Отвори ${escapeHtml(profileVideos.length > 1 ? `видео ${index + 1}` : "видеото")} на ${escapeHtml(profile.name)}"
                        >
                          <img class="profile-video-poster" src="${encodeURI(profile.image)}" alt="" loading="lazy" decoding="async" fetchpriority="low" />
                          <span class="profile-video-overlay">
                            <span class="profile-video-badge">${profileVideos.length > 1 ? `Видео ${index + 1}` : "Видео"}</span>
                            <span class="profile-video-hint">Гледай на голям екран</span>
                          </span>
                        </button>
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
          <div class="profile-rail">
            <div class="profile-media">
              <img src="${encodeURI(profile.image)}" alt="${escapeHtml(profile.alt)}" loading="lazy" decoding="async" fetchpriority="low" />
              <div class="media-chip">${escapeHtml(profile.imageNote)}</div>
            </div>
            ${profileVideo}
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
  if (!profileList) {
    return;
  }

  const searchIndex = buildSearchIndex(allProfiles);
  let filterTimeoutId = 0;

  const applyFilter = () => {
    const rawQuery = searchInput?.value.trim() || "";
    const query = normalizeForSearch(rawQuery);
    const filteredProfiles = query
      ? searchIndex.filter((entry) => entry.searchableText.includes(query)).map((entry) => entry.profile)
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

  if (!searchInput) {
    renderProfiles(allProfiles);
    setupReveals();
    syncProfileHash({ scroll: false });
    updateSearchStatus(allProfiles.length, allProfiles.length, "");
    return;
  }

  const scheduleFilter = () => {
    window.clearTimeout(filterTimeoutId);
    filterTimeoutId = window.setTimeout(applyFilter, 90);
  };

  searchInput.addEventListener("input", scheduleFilter);
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
  if (typeof window.refreshPageEffects === "function") {
    window.refreshPageEffects();
    return;
  }

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
  const profiles = shuffleProfiles(await loadProfiles());
  updateHeroVisual(profiles);
  attachSearch(profiles);
  window.addEventListener("hashchange", () => syncProfileHash());
  syncProfileHash({ scroll: Boolean(window.location.hash) });
}

initPage();
