function showShareToast(message) {
  let toast = document.querySelector("[data-share-toast]");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "share-toast";
    toast.setAttribute("data-share-toast", "");
    document.body.append(toast);
  }

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(showShareToast.timerId);
  showShareToast.timerId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}

async function copyShareText(value) {
  if (!value) {
    return false;
  }

  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function guessMimeType(filePath) {
  const lowered = String(filePath || "").toLowerCase();

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

function getPlatformLabel(platform) {
  switch (platform) {
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    default:
      return "приложението";
  }
}

function isLikelyMobileDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";

  if (/iPhone|iPad|iPod|Android/i.test(userAgent)) {
    return true;
  }

  if (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024) {
    return true;
  }

  return Boolean(window.matchMedia?.("(max-width: 980px) and (pointer: coarse)").matches);
}

function isAppleMobileDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(userAgent);
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

async function buildShareFile(videoUrl, title) {
  if (!videoUrl || typeof window.fetch !== "function") {
    return null;
  }

  try {
    const response = await fetch(videoUrl);

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const pathname = new URL(videoUrl, window.location.href).pathname;
    const extension = pathname.includes(".") ? pathname.slice(pathname.lastIndexOf(".")) : ".mp4";
    const safeTitle = String(title || "guru")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    return new File([blob], `${safeTitle || "guru"}${extension}`, {
      type: blob.type || guessMimeType(videoUrl),
    });
  } catch {
    return null;
  }
}

async function shareToMediaApp(button) {
  const platform = button.getAttribute("data-native-share") || "";
  const title = button.getAttribute("data-share-title") || "";
  const text = button.getAttribute("data-share-text") || "";
  const shareUrl = button.getAttribute("data-share-url") || "";
  const videoUrl = button.getAttribute("data-share-video") || "";
  const shareText = [text, shareUrl].filter(Boolean).join(" ");
  const platformLabel = getPlatformLabel(platform);

  if (navigator.share) {
    try {
      if (videoUrl && typeof navigator.canShare === "function") {
        const shareFile = await buildShareFile(videoUrl, title);

        if (shareFile && navigator.canShare({ files: [shareFile] })) {
          await navigator.share({
            title,
            text: shareText,
            files: [shareFile],
          });
          return;
        }
      }

      await navigator.share({
        title,
        text,
        url: shareUrl,
      });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
  }

  const copied = await copyShareText(shareText || shareUrl);
  showShareToast(
    copied
      ? `Копирах линка. Ако ${platformLabel} не прие видеото автоматично, довърши споделянето ръчно.`
      : `Споделянето към ${platformLabel} изисква native share на телефона или ръчно качване.`,
  );
}

async function shareToFacebook(button) {
  const title = button.getAttribute("data-share-title") || "";
  const shareText = button.getAttribute("data-share-text") || "";
  const shareUrl = button.getAttribute("data-share-url") || "";
  const isMobile = isLikelyMobileDevice();
  const fallbackHref = button.getAttribute("href") || "";
  const href = buildFacebookShareUrl(shareUrl) || fallbackHref;

  if (isAppleMobileDevice() && navigator.share && shareUrl) {
    try {
      await navigator.share({
        title,
        text: shareText,
        url: shareUrl,
      });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
  }

  if (href && isMobile) {
    const popup = window.open(href, "_blank", "noopener,noreferrer");

    if (popup) {
      return;
    }
  }

  if (href) {
    const popup = window.open(
      href,
      "facebook-share",
      "popup=yes,noopener,noreferrer,width=720,height=660",
    );

    if (popup) {
      return;
    }

    try {
      window.location.assign(href);
      return;
    } catch {
      // Fall back to copying the share URL below.
    }
  }

  const copied = await copyShareText([shareText, shareUrl].filter(Boolean).join(" ") || shareUrl);
  showShareToast(
    copied
      ? "Копирах линка към профила. Постави го във Facebook, ако прозорецът за споделяне не се отвори."
      : "Facebook share не се отвори надеждно. Опитай отново или сподели профилния линк ръчно.",
  );
}

document.addEventListener("click", (event) => {
  const button =
    event.target instanceof Element
      ? event.target.closest("[data-facebook-share], [data-native-share]")
      : null;

  if (!button) {
    return;
  }

  event.preventDefault();

  if (button.hasAttribute("data-facebook-share")) {
    shareToFacebook(button);
    return;
  }

  shareToMediaApp(button);
});
