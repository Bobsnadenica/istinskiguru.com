/**
 * Shared utility functions for the IstinskiGuru.com website.
 */

window.__GURU_UTILS__ = (function() {
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

  function toRootRelativeUrl(value) {
    const normalised = String(value || "").trim();

    if (!normalised) {
      return "";
    }

    if (/^(?:https?:)?\/\//i.test(normalised)) {
      return normalised;
    }

    return `/${normalised.replace(/^\/+/u, "")}`;
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

  return {
    escapeHtml,
    normalizeForSearch,
    getProfileId,
    getVideoMimeType,
    toRootRelativeUrl,
    getShareIcon
  };
})();
