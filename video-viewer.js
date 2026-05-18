let activeVideoViewerTrigger = null;
let activeVideoViewerPlaylist = [];
let activeVideoViewerIndex = 0;
let activeVideoViewerTitle = "Видео";
let activeVideoViewerType = "";
let activeVideoViewerShareId = "";
let activeVideoViewerShareText = "";
let activeVideoViewerShareUrl = "";

function getGuruUtils() {
  return window.__GURU_UTILS__ || {};
}

function buildFacebookShareUrl(shareUrl) {
  if (!shareUrl) {
    return "";
  }

  const shareParams = new URLSearchParams({
    u: shareUrl,
  });

  return `https://www.facebook.com/sharer/sharer.php?${shareParams.toString()}`;
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

function getPlaylistFromTrigger(trigger) {
  const playlistValue = trigger.getAttribute("data-video-playlist") || "";
  const playlist = playlistValue
    .split("|")
    .map((source) => source.trim())
    .filter(Boolean);

  if (playlist.length) {
    return playlist;
  }

  const videoSrc = trigger.getAttribute("data-video-src") || "";
  return videoSrc ? [videoSrc] : [];
}

function getSequenceTitle() {
  if (activeVideoViewerPlaylist.length <= 1) {
    return activeVideoViewerTitle;
  }

  return `${activeVideoViewerTitle} (${activeVideoViewerIndex + 1}/${activeVideoViewerPlaylist.length})`;
}

function normaliseShareId(value) {
  return String(value || "")
    .replace(/^#/u, "")
    .trim();
}

function getCanonicalPageUrl() {
  const canonicalHref = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";

  if (canonicalHref) {
    try {
      const canonicalUrl = new URL(canonicalHref, window.location.href);
      canonicalUrl.search = "";
      canonicalUrl.hash = "";
      return canonicalUrl;
    } catch {
      // Fall through to the current page URL.
    }
  }

  const currentUrl = new URL(window.location.href);
  currentUrl.search = "";
  currentUrl.hash = "";
  return currentUrl;
}

function getVideoShareUrl(shareId) {
  if (!shareId) {
    return "";
  }

  const shareBaseUrl = getCanonicalPageUrl().toString().replace(/#.*$/u, "");
  return `${shareBaseUrl}#${encodeURIComponent(shareId)}`;
}

function getCurrentHashShareId() {
  try {
    return normaliseShareId(decodeURIComponent(window.location.hash.slice(1)));
  } catch {
    return normaliseShareId(window.location.hash.slice(1));
  }
}

function findVideoTriggerByShareId(shareId) {
  const normalizedShareId = normaliseShareId(shareId);

  if (!normalizedShareId) {
    return null;
  }

  return (
    Array.from(document.querySelectorAll("[data-video-share-id]")).find(
      (trigger) => normaliseShareId(trigger.getAttribute("data-video-share-id")) === normalizedShareId,
    ) || null
  );
}

function setVideoViewerUrl(shareId) {
  if (!shareId || typeof window.history?.pushState !== "function") {
    return;
  }

  const currentUrl = new URL(window.location.href);

  if (normaliseShareId(currentUrl.hash) === shareId) {
    return;
  }

  currentUrl.hash = shareId;
  window.history.pushState({ videoViewer: shareId }, "", currentUrl);
}

function clearVideoViewerUrl(shareId) {
  if (!shareId || typeof window.history?.replaceState !== "function") {
    return;
  }

  const currentUrl = new URL(window.location.href);

  if (normaliseShareId(currentUrl.hash) !== shareId) {
    return;
  }

  currentUrl.hash = "";
  window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}`);
}

function createVideoViewer() {
  const facebookIcon = getGuruUtils().getShareIcon?.("facebook") || "f";
  const viewer = document.createElement("div");
  viewer.className = "video-viewer";
  viewer.hidden = true;
  viewer.innerHTML = `
    <div class="video-viewer-backdrop" data-video-viewer-close></div>
    <section class="video-viewer-dialog" role="dialog" aria-modal="true" aria-labelledby="video-viewer-title">
      <div class="video-viewer-header">
        <div class="video-viewer-copy">
          <p class="video-viewer-eyebrow">Видео</p>
          <h2 id="video-viewer-title">Видео</h2>
          <p class="video-viewer-status" aria-live="polite"></p>
        </div>
        <div class="video-viewer-controls">
          <a
            class="video-viewer-facebook-share"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            data-video-viewer-facebook-share
            data-facebook-share="facebook"
            data-share-title=""
            data-share-text=""
            data-share-url=""
            aria-label="Сподели видеото във Facebook"
            hidden
          >
            ${facebookIcon}
            <span>Facebook</span>
          </a>
          <button class="video-viewer-close" type="button" data-video-viewer-close aria-label="Затвори видеото">
            Затвори
          </button>
        </div>
      </div>
      <div class="video-viewer-stage">
        <video class="video-viewer-player" controls playsinline preload="metadata">
          <source class="video-viewer-source" />
        </video>
      </div>
    </section>
  `;
  document.body.append(viewer);

  const player = viewer.querySelector(".video-viewer-player");

  if (player instanceof HTMLVideoElement) {
    player.addEventListener("ended", handleVideoViewerEnded);
  }

  return viewer;
}

function getVideoViewer() {
  return document.querySelector(".video-viewer") || createVideoViewer();
}

function closeVideoViewer(options = {}) {
  const viewer = document.querySelector(".video-viewer");

  if (!viewer) {
    return;
  }

  const player = viewer.querySelector(".video-viewer-player");
  const source = viewer.querySelector(".video-viewer-source");

  if (player instanceof HTMLVideoElement) {
    player.pause();
    player.preload = "metadata";
    player.removeAttribute("poster");

    if (source instanceof HTMLSourceElement) {
      source.removeAttribute("src");
      source.removeAttribute("type");
      player.load();
    } else {
      player.removeAttribute("src");
      player.load();
    }
  }

  viewer.classList.remove("is-visible");
  viewer.hidden = true;
  document.body.classList.remove("video-viewer-open");
  activeVideoViewerPlaylist = [];
  activeVideoViewerIndex = 0;
  activeVideoViewerTitle = "Видео";
  activeVideoViewerType = "";
  const shareIdToClear = activeVideoViewerShareId;
  activeVideoViewerShareId = "";
  activeVideoViewerShareText = "";
  activeVideoViewerShareUrl = "";

  if (options.updateUrl !== false) {
    clearVideoViewerUrl(shareIdToClear);
  }

  if (activeVideoViewerTrigger instanceof HTMLElement) {
    activeVideoViewerTrigger.focus();
  }

  activeVideoViewerTrigger = null;
}

function updateVideoViewerShareControls(viewer) {
  const facebookShare = viewer.querySelector("[data-video-viewer-facebook-share]");

  if (!(facebookShare instanceof HTMLAnchorElement)) {
    return;
  }

  if (!activeVideoViewerShareUrl) {
    facebookShare.hidden = true;
    facebookShare.href = "#";
    facebookShare.setAttribute("data-share-title", "");
    facebookShare.setAttribute("data-share-text", "");
    facebookShare.setAttribute("data-share-url", "");
    return;
  }

  facebookShare.hidden = false;
  facebookShare.href = buildFacebookShareUrl(activeVideoViewerShareUrl);
  facebookShare.setAttribute("data-share-title", activeVideoViewerTitle);
  facebookShare.setAttribute("data-share-text", activeVideoViewerShareText);
  facebookShare.setAttribute("data-share-url", activeVideoViewerShareUrl);
  facebookShare.setAttribute("aria-label", `Сподели ${activeVideoViewerTitle} във Facebook`);
}

function setVideoViewerSource(viewer, shouldAutoplay = true) {
  const title = viewer.querySelector("#video-viewer-title");
  const status = viewer.querySelector(".video-viewer-status");
  const player = viewer.querySelector(".video-viewer-player");
  const source = viewer.querySelector(".video-viewer-source");
  const videoSrc = activeVideoViewerPlaylist[activeVideoViewerIndex] || "";

  if (!(player instanceof HTMLVideoElement) || !videoSrc) {
    return;
  }

  if (title) {
    title.textContent = getSequenceTitle();
  }

  if (status) {
    status.textContent =
      activeVideoViewerPlaylist.length > 1
        ? "Следва автоматично, защото очевидно едно видео не стига."
        : "";
  }

  player.pause();
  player.preload = "auto";

  if (source instanceof HTMLSourceElement) {
    source.src = videoSrc;
    source.type =
      activeVideoViewerPlaylist.length === 1 && activeVideoViewerType
        ? activeVideoViewerType
        : getVideoMimeType(videoSrc);
  } else {
    player.src = videoSrc;
  }

  player.load();

  if (!shouldAutoplay) {
    return;
  }

  const playAttempt = player.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {});
  }
}

function handleVideoViewerEnded() {
  const viewer = document.querySelector(".video-viewer");

  if (!viewer || viewer.hidden || activeVideoViewerIndex >= activeVideoViewerPlaylist.length - 1) {
    return;
  }

  activeVideoViewerIndex += 1;
  setVideoViewerSource(viewer, true);
}

function openVideoViewer(trigger, options = {}) {
  const playlist = getPlaylistFromTrigger(trigger);

  if (!playlist.length) {
    return;
  }

  const videoTitle = trigger.getAttribute("data-video-title") || "Видео";
  const videoPoster = trigger.getAttribute("data-video-poster") || "";
  const viewer = getVideoViewer();
  const player = viewer.querySelector(".video-viewer-player");

  if (!(player instanceof HTMLVideoElement)) {
    return;
  }

  activeVideoViewerTrigger = trigger;
  activeVideoViewerPlaylist = playlist;
  activeVideoViewerIndex = 0;
  activeVideoViewerTitle = videoTitle;
  activeVideoViewerType = trigger.getAttribute("data-video-type") || "";
  activeVideoViewerShareId = normaliseShareId(trigger.getAttribute("data-video-share-id"));
  activeVideoViewerShareText =
    trigger.getAttribute("data-video-share-text") || `${activeVideoViewerTitle} от Регистъра на Онлайн Гурута.`;
  activeVideoViewerShareUrl = getVideoShareUrl(activeVideoViewerShareId);

  if (videoPoster) {
    player.poster = videoPoster;
  } else {
    player.removeAttribute("poster");
  }

  setVideoViewerSource(viewer, false);
  updateVideoViewerShareControls(viewer);

  if (activeVideoViewerShareId && options.updateUrl !== false) {
    setVideoViewerUrl(activeVideoViewerShareId);
  }

  viewer.hidden = false;
  document.body.classList.add("video-viewer-open");

  window.requestAnimationFrame(() => {
    viewer.classList.add("is-visible");
    const closeButton = viewer.querySelector(".video-viewer-close");
    if (closeButton instanceof HTMLElement) {
      closeButton.focus();
    }
  });

  const playAttempt = player.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {});
  }
}

function openVideoViewerFromLocation() {
  const trigger = findVideoTriggerByShareId(getCurrentHashShareId());

  if (!(trigger instanceof HTMLElement)) {
    return false;
  }

  if (activeVideoViewerShareId === normaliseShareId(trigger.getAttribute("data-video-share-id"))) {
    return true;
  }

  openVideoViewer(trigger, { updateUrl: false });
  return true;
}

function syncVideoViewerWithLocation() {
  if (openVideoViewerFromLocation()) {
    return;
  }

  if (activeVideoViewerShareId) {
    closeVideoViewer({ updateUrl: false });
  }
}

function initVideoViewer() {
  if (typeof document === "undefined" || !document.body) {
    return;
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;

    if (!target) {
      return;
    }

    const launchButton = target.closest("[data-video-launch]");

    if (launchButton instanceof HTMLElement) {
      event.preventDefault();
      openVideoViewer(launchButton);
      return;
    }

    const closeButton = target.closest("[data-video-viewer-close]");

    if (closeButton) {
      event.preventDefault();
      closeVideoViewer();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeVideoViewer();
    }
  });

  window.addEventListener("hashchange", syncVideoViewerWithLocation);
  window.addEventListener("popstate", syncVideoViewerWithLocation);
  openVideoViewerFromLocation();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initVideoViewer, { once: true });
} else {
  initVideoViewer();
}
