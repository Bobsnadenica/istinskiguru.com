let activeVideoViewerTrigger = null;

function createVideoViewer() {
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
        </div>
        <button class="video-viewer-close" type="button" data-video-viewer-close aria-label="Затвори видеото">
          Затвори
        </button>
      </div>
      <div class="video-viewer-stage">
        <video class="video-viewer-player" controls playsinline preload="metadata">
          <source class="video-viewer-source" />
        </video>
      </div>
    </section>
  `;
  document.body.append(viewer);
  return viewer;
}

function getVideoViewer() {
  return document.querySelector(".video-viewer") || createVideoViewer();
}

function closeVideoViewer() {
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

  if (activeVideoViewerTrigger instanceof HTMLElement) {
    activeVideoViewerTrigger.focus();
  }

  activeVideoViewerTrigger = null;
}

function openVideoViewer(trigger) {
  const videoSrc = trigger.getAttribute("data-video-src") || "";
  const videoType = trigger.getAttribute("data-video-type") || "";

  if (!videoSrc) {
    return;
  }

  const videoTitle = trigger.getAttribute("data-video-title") || "Видео";
  const videoPoster = trigger.getAttribute("data-video-poster") || "";
  const viewer = getVideoViewer();
  const title = viewer.querySelector("#video-viewer-title");
  const player = viewer.querySelector(".video-viewer-player");
  const source = viewer.querySelector(".video-viewer-source");

  if (!(player instanceof HTMLVideoElement)) {
    return;
  }

  activeVideoViewerTrigger = trigger;

  if (title) {
    title.textContent = videoTitle;
  }

  player.pause();
  player.preload = "auto";

  if (source instanceof HTMLSourceElement) {
    source.src = videoSrc;

    if (videoType) {
      source.type = videoType;
    } else {
      source.removeAttribute("type");
    }
  } else {
    player.src = videoSrc;
  }

  if (videoPoster) {
    player.poster = videoPoster;
  } else {
    player.removeAttribute("poster");
  }

  player.load();
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initVideoViewer, { once: true });
} else {
  initVideoViewer();
}
