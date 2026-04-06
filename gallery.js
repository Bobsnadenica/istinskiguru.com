const galleryMosaic = document.querySelector("#gallery-mosaic");
const galleryHeroTrack = document.querySelector("#gallery-hero-track");
const galleryDetail = document.querySelector("#gallery-detail");
const galleryDetailContent = document.querySelector("#gallery-detail-content");
const galleryCanonicalLink = document.querySelector('link[rel="canonical"]');
const galleryFallbackProfiles = Array.isArray(window.__GURU_PROFILES__) ? window.__GURU_PROFILES__ : [];

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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shuffleProfiles(profiles) {
  const shuffledProfiles = Array.isArray(profiles) ? [...profiles] : [];

  for (let index = shuffledProfiles.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledProfiles[index], shuffledProfiles[swapIndex]] = [shuffledProfiles[swapIndex], shuffledProfiles[index]];
  }

  return shuffledProfiles;
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

async function loadProfiles() {
  const isLocalRuntime =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (typeof window.fetch !== "function" || !isLocalRuntime) {
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
  const profileId = getProfileId(profile);
  const isFeatured = profile.orientation !== "landscape" && index % 7 === 0;
  const loading = eager ? "eager" : "lazy";
  const fetchpriority = eager ? "high" : "low";
  const buttonAttributes = inert
    ? 'tabindex="-1" aria-hidden="true"'
    : `aria-label="Отвори профила на ${escapeHtml(profile.name)}"`;

  return `
    <button
      class="${className}"
      type="button"
      data-profile-id="${escapeHtml(profileId)}"
      data-orientation="${escapeHtml(profile.orientation || "portrait")}"
      data-featured="${isFeatured ? "true" : "false"}"
      ${buttonAttributes}
    >
      <img
        src="${encodeURI(profile.image)}"
        alt="${inert ? "" : escapeHtml(profile.alt || `Портрет на ${profile.name}`)}"
        loading="${loading}"
        decoding="async"
        fetchpriority="${fetchpriority}"
      />
      <span class="sr-only">${escapeHtml(profile.name)}</span>
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

function renderGalleryMosaic(profiles) {
  if (!galleryMosaic) {
    return;
  }

  if (!profiles.length) {
    galleryMosaic.innerHTML = `
      <article class="gallery-empty reveal">
        <h3>Галерията е празна</h3>
        <p>Няма портрети за показване в момента. Явно величието е излязло по задачи.</p>
      </article>
    `;
    return;
  }

  galleryMosaic.innerHTML = profiles
    .map((profile, index) => getTileMarkup(profile, index))
    .join("");
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
  const channelLinks = (profile.links || [])
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`,
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
        <dd>${escapeHtml(profile.aura)}</dd>
      </div>
    `);
  }

  if (profile.funnel) {
    signalItems.push(`
      <div>
        <dt>Прочит</dt>
        <dd>${escapeHtml(profile.funnel)}</dd>
      </div>
    `);
  }

  const descriptionBlock = profile.description
    ? `
        <div class="profile-description">
          <p class="profile-description-label">Описание</p>
          <p>${escapeHtml(profile.description)}</p>
        </div>
      `
    : "";
  const insightBlock = profile.insight ? `<p class="profile-insight">${escapeHtml(profile.insight)}</p>` : "";
  const summaryBlock = profile.summary ? `<p class="profile-summary">${escapeHtml(profile.summary)}</p>` : "";
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
    <div class="gallery-detail-stack">
      <div class="gallery-detail-header">
        <p class="gallery-detail-kicker">${escapeHtml(profile.kicker || "Полево наблюдение")}</p>
        <h2 class="gallery-detail-title" id="gallery-detail-title">${escapeHtml(profile.name)}</h2>
        <p class="gallery-detail-lead">
          ${escapeHtml(profile.imageNote || profile.summary || "Тук вече идват думите след стойката.")}
        </p>
      </div>

      <div class="gallery-detail-media" data-orientation="${escapeHtml(profile.orientation || "portrait")}">
        <img src="${encodeURI(profile.image)}" alt="${escapeHtml(profile.alt || profile.name)}" loading="eager" decoding="async" fetchpriority="high" />
        <div class="media-chip">${escapeHtml(profile.imageNote || profile.kicker || profile.name)}</div>
      </div>

      <div class="gallery-detail-copy">
        ${summaryBlock}
        ${getShareButtons(profile, { includeOpenLink: true })}
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

  const nextUrl = new URL(window.location.href);
  nextUrl.hash = profileId ? encodeURIComponent(profileId) : "";
  window.history.replaceState({}, "", nextUrl.toString());
}

function openGalleryDetail(profile, trigger, options = {}) {
  if (!galleryDetail || !galleryDetailContent || !profile) {
    return;
  }

  const { updateHash = true } = options;
  window.clearTimeout(galleryCloseTimer);
  lastGalleryTrigger = trigger || document.activeElement;
  activeGalleryProfileId = getProfileId(profile);
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
      openGalleryDetail(nextProfile, findGalleryTrigger(nextHash), {
        updateHash: false,
      });
      return;
    }

    closeGalleryDetail({ restoreFocus: false, updateHash: false });
  });
}

async function initGalleryPage() {
  galleryProfiles = shuffleProfiles(await loadProfiles());
  galleryProfilesById = new Map(galleryProfiles.map((profile) => [getProfileId(profile), profile]));

  renderHeroTrack(galleryProfiles);
  renderGalleryMosaic(galleryProfiles);

  if (galleryDetailContent) {
    galleryDetailContent.innerHTML = getDefaultDetailMarkup();
  }

  attachGalleryInteractions();
  setupReveals();

  const initialHash = decodeURIComponent(window.location.hash.slice(1));

  if (galleryProfilesById.has(initialHash)) {
    const initialProfile = galleryProfilesById.get(initialHash);
    openGalleryDetail(initialProfile, findGalleryTrigger(initialHash), {
      updateHash: false,
    });
  }
}

initGalleryPage();
