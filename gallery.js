const galleryMosaic = document.querySelector("#gallery-mosaic");
const galleryHeroTrack = document.querySelector("#gallery-hero-track");
const galleryDetail = document.querySelector("#gallery-detail");
const galleryDetailContent = document.querySelector("#gallery-detail-content");
const galleryCanonicalLink = document.querySelector('link[rel="canonical"]');
const searchInput = document.querySelector("#guru-search");
const searchStatus = document.querySelector("#search-status");
const galleryFallbackProfiles = Array.isArray(window.__GURU_PROFILES__) ? window.__GURU_PROFILES__ : [];
const heroImage = document.querySelector("#hero-image");
const heroProfileLink = document.querySelector("#hero-profile-link");
const heroQuoteLabel = document.querySelector("#hero-quote-label");
const heroQuoteText = document.querySelector("#hero-quote-text");
const heroStorageKey = "guruHeroIndex";
const defaultHeroLabel = heroQuoteLabel?.textContent?.trim() || "Полево наблюдение";
const defaultHeroText =
  heroQuoteText?.textContent?.trim() || "Силно кафе. Още по-силна енергия за наставничество.";

const utils = window.__GURU_UTILS__;

let galleryProfiles = [];
let galleryProfilesById = new Map();
let activeGalleryProfileId = "";
let galleryCloseTimer = 0;
let lastGalleryTrigger = null;

function findGalleryTrigger(profileId) {
  if (!profileId) {
    return null;
  }

  const allButtons = Array.from(document.querySelectorAll("[data-profile-id]"));
  return (
    allButtons.find((button) => button.closest("#gallery-mosaic") && button.dataset.profileId === profileId) ||
    allButtons.find((button) => button.dataset.profileId === profileId) ||
    null
  );
}

function getCanonicalPageUrl() {
  const canonicalHref = galleryCanonicalLink?.href || "";

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

function shuffleProfiles(profiles) {
  const shuffledProfiles = Array.isArray(profiles) ? [...profiles] : [];

  for (let index = shuffledProfiles.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledProfiles[index], shuffledProfiles[swapIndex]] = [shuffledProfiles[swapIndex], shuffledProfiles[index]];
  }

  return shuffledProfiles;
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

  heroImage.src = encodeURI(utils.toRootRelativeUrl(heroProfile.image));
  heroImage.alt = heroProfile.alt || "";
  heroImage.style.objectPosition = heroProfile.orientation === "landscape" ? "center center" : "center 32%";

  if (heroProfileLink) {
    const heroProfileUrl = toSameOriginUrl(getProfileShareUrl(heroProfile));
    const heroProfileLabel = heroProfile.name ? `Отвори профила на ${heroProfile.name}` : "Отвори профила";
    heroProfileLink.href = heroProfileUrl || heroProfileLink.href;
    heroProfileLink.setAttribute("aria-label", heroProfileLabel);
    heroProfileLink.title = heroProfileLabel;
  }

  if (heroQuoteLabel) {
    heroQuoteLabel.textContent = heroProfile.name || defaultHeroLabel;
  }

  if (heroQuoteText) {
    heroQuoteText.textContent =
      heroProfile.imageNote || heroProfile.kicker || heroProfile.summary || defaultHeroText;
  }
}

function getProfileShareUrl(profile) {
  const baseUrl = getSiteRootUrl();
  const profileId = utils.getProfileId(profile);

  if (!baseUrl || !profileId) {
    return baseUrl;
  }

  return new URL(`profiles/${profileId}/`, baseUrl).toString();
}

function toSameOriginUrl(value) {
  if (typeof window === "undefined") {
    return value || "";
  }

  try {
    const parsedUrl = new URL(value, window.location.href);
    return new URL(`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`, window.location.origin).toString();
  } catch {
    return "";
  }
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

function getShareButtons(profile) {
  const shareUrl = getProfileShareUrl(profile);
  const shareMessage = getShareMessage(profile);
  const profileVideos = getProfileVideos(profile);
  const firstVideo = utils.toRootRelativeUrl(profileVideos[0] || "");
  const buttons = [
    `
      <a
        class="share-button share-button-facebook"
        href="${utils.escapeHtml(getFacebookShareUrl(profile))}"
        data-facebook-share="facebook"
        data-share-title="${utils.escapeHtml(profile.name)}"
        data-share-text="${utils.escapeHtml(shareMessage)}"
        data-share-url="${utils.escapeHtml(shareUrl)}"
        aria-label="Сподели профила на ${utils.escapeHtml(profile.name)} във Facebook"
        title="Facebook"
      >
        ${utils.getShareIcon("facebook")}
      </a>
    `,
    `
      <a
        class="share-button share-button-linkedin"
        href="${utils.escapeHtml(getLinkedInShareUrl(profile))}"
        target="_blank"
        rel="noopener"
        aria-label="Сподели профила на ${utils.escapeHtml(profile.name)} в LinkedIn"
        title="LinkedIn"
      >
        ${utils.getShareIcon("linkedin")}
      </a>
    `,
  ];

  if (firstVideo) {
    const nativeAttributes = `
        href="${utils.escapeHtml(shareUrl)}"
        role="button"
        data-native-share="instagram"
        data-share-title="${utils.escapeHtml(profile.name)}"
        data-share-text="${utils.escapeHtml(shareMessage)}"
        data-share-url="${utils.escapeHtml(shareUrl)}"
        data-share-video="${utils.escapeHtml(firstVideo)}"
        aria-label="Сподели профила на ${utils.escapeHtml(profile.name)} към Instagram"
        title="Instagram"
      `;
    buttons.push(`
      <a class="share-button share-button-instagram" ${nativeAttributes}>
        ${utils.getShareIcon("instagram")}
      </a>
    `);
    buttons.push(`
      <a
        class="share-button share-button-tiktok"
        href="${utils.escapeHtml(shareUrl)}"
        role="button"
        data-native-share="tiktok"
        data-share-title="${utils.escapeHtml(profile.name)}"
        data-share-text="${utils.escapeHtml(shareMessage)}"
        data-share-url="${utils.escapeHtml(shareUrl)}"
        data-share-video="${utils.escapeHtml(firstVideo)}"
        aria-label="Сподели профила на ${utils.escapeHtml(profile.name)} към TikTok"
        title="TikTok"
      >
        ${utils.getShareIcon("tiktok")}
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

function getSearchableText(profile) {
  return utils.normalizeForSearch(
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

function getProfileThumbnailUrl(profile) {
  return utils.toRootRelativeUrl(profile.thumbnailImage || profile.image);
}

async function loadProfiles() {
  const isLocalRuntime =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const useSourceApi =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("source") === "assets";

  if (typeof window.fetch !== "function" || !isLocalRuntime || !useSourceApi) {
    return galleryFallbackProfiles;
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

    return galleryFallbackProfiles;
  } catch {
    return galleryFallbackProfiles;
  }
}

function getTileMarkup(profile, index, options = {}) {
  const { className = "gallery-tile", inert = false, eager = false } = options;
  const profileId = utils.getProfileId(profile);
  const imageUrl = getProfileThumbnailUrl(profile);
  const isFeatured = profile.orientation !== "landscape" && index % 7 === 0;
  const loading = eager ? "eager" : "lazy";
  const fetchpriority = eager ? "high" : "low";
  const sizes = className === "gallery-hero-card" ? "(max-width: 760px) 38vw, 180px" : "(max-width: 760px) 44vw, 240px";
  const buttonAttributes = inert
    ? 'tabindex="-1" aria-hidden="true"'
    : `aria-label="Отвори профила на ${utils.escapeHtml(profile.name)}"`;

  return `
    <button
      class="${className}"
      type="button"
      data-profile-id="${utils.escapeHtml(profileId)}"
      data-orientation="${utils.escapeHtml(profile.orientation || "portrait")}"
      data-featured="${isFeatured ? "true" : "false"}"
      ${buttonAttributes}
    >
      <img
        src="${encodeURI(imageUrl)}"
        alt="${inert ? "" : utils.escapeHtml(profile.alt || `Портрет на ${profile.name}`)}"
        loading="${loading}"
        decoding="async"
        fetchpriority="${fetchpriority}"
        sizes="${sizes}"
      />
      <span class="sr-only">${utils.escapeHtml(profile.name)}</span>
    </button>
  `;
}

function renderHeroTrack(profiles) {
  if (!galleryHeroTrack) {
    return;
  }

  const runwayProfiles = profiles.slice(0, Math.min(12, profiles.length));

  if (!runwayProfiles.length) {
    galleryHeroTrack.innerHTML = "";
    return;
  }

  galleryHeroTrack.innerHTML = `
    <div class="gallery-hero-track-group">
      ${runwayProfiles.map((profile, index) => getTileMarkup(profile, index, { className: "gallery-hero-card", eager: index < 4 })).join("")}
    </div>
    <div class="gallery-hero-track-group" aria-hidden="true">
      ${runwayProfiles.map((profile, index) => getTileMarkup(profile, index, { className: "gallery-hero-card", inert: true })).join("")}
    </div>
  `;
}

function renderGalleryMosaic(profiles, options = {}) {
  if (!galleryMosaic) {
    return;
  }

  const emptyTitle = options.emptyTitle || "Галерията е празна";
  const emptyBody = options.emptyBody || "Няма портрети за показване в момента. Явно величието е излязло по задачи.";

  if (!profiles.length) {
    galleryMosaic.innerHTML = `
      <article class="gallery-empty reveal">
        <h3>${utils.escapeHtml(emptyTitle)}</h3>
        <p>${utils.escapeHtml(emptyBody)}</p>
      </article>
    `;
    return;
  }

  galleryMosaic.innerHTML = profiles
    .map((profile, index) => getTileMarkup(profile, index))
    .join("");
}

function attachSearch(allProfiles) {
  if (!galleryMosaic) {
    return;
  }

  const searchIndex = buildSearchIndex(allProfiles);
  let filterTimeoutId = 0;

  const applyFilter = () => {
    const rawQuery = searchInput?.value.trim() || "";
    const query = utils.normalizeForSearch(rawQuery);
    const filteredProfiles = query
      ? searchIndex.filter((entry) => entry.searchableText.includes(query)).map((entry) => entry.profile)
      : allProfiles;

    if (!filteredProfiles.length) {
      renderGalleryMosaic([], {
        emptyTitle: "Няма съвпадения",
        emptyBody: `Нищо не беше намерено за "${rawQuery}".`,
      });
      setupReveals();
      return;
    }

    renderGalleryMosaic(filteredProfiles);
    setupReveals();
    updateSearchStatus(filteredProfiles.length, allProfiles.length, rawQuery);
  };

  if (!searchInput) {
    renderGalleryMosaic(allProfiles);
    setupReveals();
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

function getDefaultDetailMarkup() {
  return `
    <div class="gallery-detail-empty">
      <p class="gallery-detail-kicker">Портретно наблюдение</p>
      <h2 id="gallery-detail-title">Натисни който портрет ти хване окото.</h2>
      <p>
        Галерията е само лицето отпред. При клик идват линковете, видеата,
        описанието и цялата добре опакована увереност зад кадъра.
      </p>
    </div>
  `;
}

function buildDetailMarkup(profile) {
  const imageUrl = utils.toRootRelativeUrl(profile.image);
  const thumbnailUrl = getProfileThumbnailUrl(profile);
  const channelLinks = (profile.links || [])
    .map(
      (link) =>
        `<a href="${utils.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${utils.escapeHtml(link.label)}</a>`,
    )
    .join("");
  const signalItems = [
    `
      <div>
        <dt>Канали</dt>
        <dd class="channel-links">${channelLinks || "<span>Няма подадени канали.</span>"}</dd>
      </div>
    `,
  ];
  const profileVideos = getProfileVideos(profile);

  if (profile.aura) {
    signalItems.push(`
      <div>
        <dt>Обещан вайб</dt>
        <dd>${utils.escapeHtml(profile.aura)}</dd>
      </div>
    `);
  }

  if (profile.funnel) {
    signalItems.push(`
      <div>
        <dt>Прочит</dt>
        <dd>${utils.escapeHtml(profile.funnel)}</dd>
      </div>
    `);
  }

  const descriptionBlock = profile.description
    ? `
        <div class="profile-description">
          <p class="profile-description-label">Описание</p>
          <p>${utils.escapeHtml(profile.description)}</p>
        </div>
      `
    : "";
  const insightBlock = profile.insight ? `<p class="profile-insight">${utils.escapeHtml(profile.insight)}</p>` : "";
  const summaryBlock = profile.summary ? `<p class="profile-summary">${utils.escapeHtml(profile.summary)}</p>` : "";
  const profileVideoBlock = profileVideos.length
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
                      data-video-src="${encodeURI(utils.toRootRelativeUrl(videoPath))}"
                      data-video-type="${utils.getVideoMimeType(videoPath)}"
                      data-video-poster="${encodeURI(thumbnailUrl)}"
                      data-video-title="${utils.escapeHtml(`${profile.name} • ${profileVideos.length > 1 ? `Видео ${index + 1}` : "Видео"}`)}"
                      aria-label="Отвори ${utils.escapeHtml(profileVideos.length > 1 ? `видео ${index + 1}` : "видеото")} на ${utils.escapeHtml(profile.name)}"
                    >
                      <img class="profile-video-poster" src="${encodeURI(thumbnailUrl)}" alt="" loading="lazy" decoding="async" fetchpriority="low" />
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
    <div class="gallery-detail-stack">
      <div class="gallery-detail-header">
        <p class="gallery-detail-kicker">${utils.escapeHtml(profile.kicker || "Полево наблюдение")}</p>
        <h2 class="gallery-detail-title" id="gallery-detail-title">${utils.escapeHtml(profile.name)}</h2>
        <p class="gallery-detail-lead">
          ${utils.escapeHtml(profile.imageNote || profile.summary || "Тук вече идват думите след стойката.")}
        </p>
      </div>

      <div class="gallery-detail-media" data-orientation="${utils.escapeHtml(profile.orientation || "portrait")}">
        <img src="${encodeURI(imageUrl)}" alt="${utils.escapeHtml(profile.alt || profile.name)}" loading="eager" decoding="async" fetchpriority="high" />
        <div class="media-chip">${utils.escapeHtml(profile.imageNote || profile.kicker || profile.name)}</div>
      </div>

      <div class="gallery-detail-copy">
        ${summaryBlock}
        ${getShareButtons(profile)}
        ${descriptionBlock}
        <dl class="signal-grid">${signalItems.join("")}</dl>
        ${insightBlock}
        ${profileVideoBlock}
      </div>
    </div>
  `;
}

function syncActiveTiles(profileId) {
  const tileButtons = Array.from(document.querySelectorAll("[data-profile-id]"));

  tileButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.profileId === profileId);
  });
}

function updateGalleryHash(profileId) {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl =
    profileId && galleryProfilesById.has(profileId)
      ? toSameOriginUrl(getProfileShareUrl(galleryProfilesById.get(profileId)))
      : toSameOriginUrl(getCanonicalPageUrl()) || new URL(window.location.href).toString();

  window.history.replaceState({}, "", nextUrl);
}

function openGalleryDetail(profile, trigger, options = {}) {
  if (!galleryDetail || !galleryDetailContent || !profile) {
    return;
  }

  const { updateHash = true } = options;
  window.clearTimeout(galleryCloseTimer);
  lastGalleryTrigger = trigger || document.activeElement;
  activeGalleryProfileId = utils.getProfileId(profile);
  galleryDetailContent.innerHTML = buildDetailMarkup(profile);
  galleryDetail.hidden = false;
  document.body.classList.add("gallery-detail-open");
  syncActiveTiles(activeGalleryProfileId);

  window.requestAnimationFrame(() => {
    galleryDetail.classList.add("is-open");
  });

  if (updateHash) {
    updateGalleryHash(activeGalleryProfileId);
  }
}

function closeGalleryDetail(options = {}) {
  if (!galleryDetail || galleryDetail.hidden) {
    return;
  }

  const { restoreFocus = true, updateHash = true } = options;
  const triggerToRestore = lastGalleryTrigger;

  galleryDetail.classList.remove("is-open");
  document.body.classList.remove("gallery-detail-open");
  activeGalleryProfileId = "";
  syncActiveTiles("");

  if (updateHash) {
    updateGalleryHash("");
  }

  galleryCloseTimer = window.setTimeout(() => {
    galleryDetail.hidden = true;
    galleryDetailContent.innerHTML = getDefaultDetailMarkup();
  }, 240);

  if (restoreFocus && triggerToRestore && typeof triggerToRestore.focus === "function") {
    triggerToRestore.focus();
  }
}

function attachGalleryInteractions() {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const tileButton = event.target.closest("[data-profile-id]");

    if (tileButton && tileButton instanceof HTMLElement) {
      const nextProfile = galleryProfilesById.get(tileButton.dataset.profileId || "");

      if (nextProfile) {
        openGalleryDetail(nextProfile, tileButton);
      }

      return;
    }

    if (event.target.closest("[data-gallery-close]")) {
      closeGalleryDetail();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeGalleryDetail({ restoreFocus: true });
    }
  });

  window.addEventListener("hashchange", () => {
    const nextHash = decodeURIComponent(window.location.hash.slice(1));

    if (galleryProfilesById.has(nextHash)) {
      const nextProfile = galleryProfilesById.get(nextHash);
      openGalleryDetail(nextProfile, findGalleryTrigger(nextHash));
      return;
    }

    closeGalleryDetail({ restoreFocus: false, updateHash: false });
  });
}

async function initGalleryPage() {
  galleryProfiles = shuffleProfiles(await loadProfiles());
  galleryProfilesById = new Map(galleryProfiles.map((profile) => [utils.getProfileId(profile), profile]));

  updateHeroVisual(galleryProfiles);
  renderHeroTrack(galleryProfiles);
  attachSearch(galleryProfiles);

  if (galleryDetailContent) {
    galleryDetailContent.innerHTML = getDefaultDetailMarkup();
  }

  attachGalleryInteractions();
  setupReveals();

  const initialHash = decodeURIComponent(window.location.hash.slice(1));

  if (galleryProfilesById.has(initialHash)) {
    const initialProfile = galleryProfilesById.get(initialHash);
    openGalleryDetail(initialProfile, findGalleryTrigger(initialHash));
  }
}

initGalleryPage();
