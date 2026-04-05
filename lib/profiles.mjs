import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const videoExtensions = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const cyrillicMap = new Map([
  ["а", "a"],
  ["б", "b"],
  ["в", "v"],
  ["г", "g"],
  ["д", "d"],
  ["е", "e"],
  ["ж", "zh"],
  ["з", "z"],
  ["и", "i"],
  ["й", "y"],
  ["к", "k"],
  ["л", "l"],
  ["м", "m"],
  ["н", "n"],
  ["о", "o"],
  ["п", "p"],
  ["р", "r"],
  ["с", "s"],
  ["т", "t"],
  ["у", "u"],
  ["ф", "f"],
  ["х", "h"],
  ["ц", "ts"],
  ["ч", "ch"],
  ["ш", "sh"],
  ["щ", "sht"],
  ["ъ", "a"],
  ["ь", "y"],
  ["ю", "yu"],
  ["я", "ya"],
]);
const labelAliases = new Map([
  ["youtube", "YouTube"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["tik tok", "TikTok"],
  ["tiktok", "TikTok"],
  ["linkedin", "LinkedIn"],
  ["viber", "Viber"],
  ["website", "Уебсайт"],
  ["links", "Уебсайт"],
]);
const textFieldAliases = new Map([
  ["description", "description"],
  ["описание", "description"],
  ["kicker", "kicker"],
  ["надзаглавие", "kicker"],
  ["summary", "summary"],
  ["резюме", "summary"],
  ["subtitle", "summary"],
  ["vibe", "aura"],
  ["aura", "aura"],
  ["вайб", "aura"],
  ["обещан вайб", "aura"],
  ["reading", "funnel"],
  ["прочит", "funnel"],
  ["insight", "insight"],
  ["наблюдение", "insight"],
  ["коментар", "insight"],
  ["image note", "imageNote"],
  ["image note text", "imageNote"],
  ["бележка върху снимката", "imageNote"],
  ["бележка на снимката", "imageNote"],
  ["текст върху снимката", "imageNote"],
]);
const portraitImageNotes = [
  "Портрет, подготвен да внушава увереност още преди първия линк.",
  "Кадър с внимателно дозирана сериозност и достатъчно обещание за следващо ниво.",
  "Фронтална самоувереност с усещане, че успехът вече е резервиран.",
  "Снимка, която носи енергия на частен урок, премиум пакет и леко присвити очи.",
  "Личен бранд в портретен формат с отчетлива готовност за ново просветление.",
  "Поглед, изчислен да вдъхва доверие, мащаб и още едно записване.",
];
const landscapeImageNotes = [
  "Широк кадър с достатъчно въздух за визия, растеж и още една покана за включване.",
  "Пейзажен формат с увереност, че големите резултати са точно зад следващия бутон.",
  "Кадър с промо мащаб и ясно усещане за внимателно режисиран успех.",
  "Широкоформатно присъствие, подготвено да побере обещание, авторитет и плавен ъпсел.",
  "Сцена с достатъчно пространство за амбиция, статус и едно добре осветено послание.",
  "Визуален размах, който говори за хоризонти, програми и следващо ниво на достъп.",
];
const defaultSiteDomain = "www.istinskiguru.com";
const shareCardWidth = 1200;
const shareCardHeight = 630;

function toTitleCase(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSlug(value) {
  const transliterated = value
    .normalize("NFC")
    .toLowerCase()
    .split("")
    .map((char) => cyrillicMap.get(char) || char)
    .join("");

  return transliterated
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normaliseLabel(value) {
  const lowered = value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  return labelAliases.get(lowered) || toTitleCase(value);
}

function normaliseKey(value) {
  return value
    .trim()
    .normalize("NFC")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

function getDefaultImageNote(orientation, sequence = 0) {
  const options = orientation === "landscape" ? landscapeImageNotes : portraitImageNotes;
  const index = sequence % options.length;
  return options[index];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normaliseText(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value, maxLength = 220) {
  const normalised = normaliseText(value);

  if (normalised.length <= maxLength) {
    return normalised;
  }

  return `${normalised.slice(0, maxLength - 1).trimEnd()}…`;
}

async function getSiteBaseUrl(rootDir) {
  const cnamePath = path.join(rootDir, "CNAME");

  try {
    const configuredDomain = normaliseText(await fs.readFile(cnamePath, "utf8")).replace(/^https?:\/\//i, "");

    if (configuredDomain) {
      return `https://${configuredDomain.replace(/\/+$/g, "")}/`;
    }
  } catch {
    // Fall back to the default production domain below.
  }

  return `https://${defaultSiteDomain}/`;
}

function toRootRelativePath(assetPath) {
  return `/${String(assetPath || "").replace(/^\/+/g, "")}`;
}

function getProfilePageUrl(profile, siteBaseUrl) {
  return new URL(`profiles/${profile.id}/`, siteBaseUrl).toString();
}

function getProfileCatalogUrl(profile, siteBaseUrl) {
  const catalogUrl = new URL(siteBaseUrl);
  catalogUrl.hash = profile.id;
  return catalogUrl.toString();
}

function getFacebookShareUrl(profilePageUrl) {
  const shareParams = new URLSearchParams({
    u: profilePageUrl,
  });

  return `https://www.facebook.com/sharer/sharer.php?${shareParams.toString()}`;
}

function getLinkedInShareUrl(profilePageUrl) {
  const shareParams = new URLSearchParams({
    url: profilePageUrl,
  });

  return `https://www.linkedin.com/sharing/share-offsite/?${shareParams.toString()}`;
}

function getShareMessage(profile) {
  return normaliseText(profile.summary || profile.imageNote || `Профил на ${profile.name} в Каталога на Онлайн Гурута.`);
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

function getProfileMetaDescription(profile) {
  return truncateText(
    [
      profile.summary || profile.imageNote || `Профил на ${profile.name} в каталога на онлайн гурута.`,
      profile.insight || profile.kicker || profile.aura,
      "Виж публичните линкове, описанието и полевите бележки в Каталога на Онлайн Гурута.",
    ]
      .filter(Boolean)
      .map((part) => normaliseText(part))
      .join(" "),
    240,
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

async function generateShareCard(profile, sourceImagePath, outputImagePath) {
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), "guru-share-"));
  const payloadPath = path.join(tempDir, "payload.json");
  const swiftModuleCachePath = path.join(tempDir, "swift-module-cache");
  const clangModuleCachePath = path.join(tempDir, "clang-module-cache");
  const rendererScriptPath = path.join(process.cwd(), "scripts", "render-share-card.swift");
  const payload = {
    sourceImagePath,
    outputImagePath,
    width: shareCardWidth,
    height: shareCardHeight,
    brand: "Каталог на Онлайн Гурута",
    name: normaliseText(profile.name),
    kicker: truncateText(profile.kicker || profile.aura || "Полево наблюдение", 72),
    summary: truncateText(profile.summary || profile.imageNote || profile.insight || "", 180),
  };

  try {
    await fs.writeFile(payloadPath, JSON.stringify(payload), "utf8");
    await fs.mkdir(swiftModuleCachePath, { recursive: true });
    await fs.mkdir(clangModuleCachePath, { recursive: true });

    await execFileAsync("/usr/bin/env", [
      `HOME=${tempDir}`,
      `SWIFT_MODULECACHE_PATH=${swiftModuleCachePath}`,
      `CLANG_MODULE_CACHE_PATH=${clangModuleCachePath}`,
      "swift",
      rendererScriptPath,
      payloadPath,
    ]);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function buildProfileSharePage(profile, siteBaseUrl) {
  const shareTitle = `${profile.name}${profile.kicker ? ` • ${profile.kicker}` : ""}`;
  const pageTitle = `${shareTitle} | Каталог на Онлайн Гурута`;
  const pageDescription = getProfileMetaDescription(profile);
  const imagePath = toRootRelativePath(profile.image);
  const shareImagePath = toRootRelativePath(profile.shareImage || profile.image);
  const shareImageUrl = new URL(shareImagePath, siteBaseUrl).toString();
  const pageUrl = getProfilePageUrl(profile, siteBaseUrl);
  const catalogUrl = getProfileCatalogUrl(profile, siteBaseUrl);
  const shareMessage = getShareMessage(profile);
  const firstVideo = Array.isArray(profile.videos) && profile.videos.length ? toRootRelativePath(profile.videos[0]) : "";
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

  const summaryBlock = profile.summary ? `<p class="profile-summary">${escapeHtml(profile.summary)}</p>` : "";
  const descriptionBlock = profile.description
    ? `
        <div class="profile-description">
          <p class="profile-description-label">Описание</p>
          <p>${escapeHtml(profile.description)}</p>
        </div>
      `
    : "";
  const insightBlock = profile.insight ? `<p class="profile-insight">${escapeHtml(profile.insight)}</p>` : "";
  const profileVideos = Array.isArray(profile.videos) ? profile.videos : [];
  const profileVideoBlock = profileVideos.length
    ? `
        <div class="profile-video-wrap" data-count="${profileVideos.length}">
          <p class="profile-video-label">${profileVideos.length > 1 ? "Видеа" : "Видео"}</p>
          <div class="profile-video-grid">
            ${profileVideos
              .map(
                (videoPath) => `
                  <div class="profile-video-frame">
                    <video controls playsinline preload="metadata" poster="${escapeHtml(imagePath)}">
                      <source
                        src="${escapeHtml(toRootRelativePath(videoPath))}"
                        type="${escapeHtml(getVideoMimeType(videoPath))}"
                      />
                    </video>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
      `
    : "";
  const shareButtons = [
    `
      <a
        class="share-button share-button-facebook"
        href="${escapeHtml(getFacebookShareUrl(pageUrl))}"
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
        href="${escapeHtml(getLinkedInShareUrl(pageUrl))}"
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
    shareButtons.push(`
      <a
        class="share-button share-button-instagram"
        href="${escapeHtml(pageUrl)}"
        role="button"
        data-native-share="instagram"
        data-share-title="${escapeHtml(profile.name)}"
        data-share-text="${escapeHtml(shareMessage)}"
        data-share-url="${escapeHtml(pageUrl)}"
        data-share-video="${escapeHtml(firstVideo)}"
        aria-label="Сподели профила на ${escapeHtml(profile.name)} към Instagram"
        title="Instagram"
      >
        ${getShareIcon("instagram")}
      </a>
    `);
    shareButtons.push(`
      <a
        class="share-button share-button-tiktok"
        href="${escapeHtml(pageUrl)}"
        role="button"
        data-native-share="tiktok"
        data-share-title="${escapeHtml(profile.name)}"
        data-share-text="${escapeHtml(shareMessage)}"
        data-share-url="${escapeHtml(pageUrl)}"
        data-share-video="${escapeHtml(firstVideo)}"
        aria-label="Сподели профила на ${escapeHtml(profile.name)} към TikTok"
        title="TikTok"
      >
        ${getShareIcon("tiktok")}
      </a>
    `);
  }

  return `<!DOCTYPE html>
<html lang="bg">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDescription)}" />
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
    <meta property="og:locale" content="bg_BG" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Каталог на Онлайн Гурута" />
    <meta property="og:title" content="${escapeHtml(shareTitle)}" />
    <meta property="og:description" content="${escapeHtml(pageDescription)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(shareImageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(shareImageUrl)}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="${shareCardWidth}" />
    <meta property="og:image:height" content="${shareCardHeight}" />
    <meta property="og:image:alt" content="${escapeHtml(profile.alt || profile.name)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(shareTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(pageDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(shareImageUrl)}" />
    <link rel="stylesheet" href="/styles.css" />
    <script src="/site-intro.js" defer></script>
    <script src="/share-actions.js" defer></script>
  </head>
  <body class="profile-page">
    <div class="page-shell">
      <header class="hero article-hero profile-share-hero" id="top">
        <div class="hero-copy">
          <nav class="page-nav" aria-label="Навигация">
            <a href="${escapeHtml(catalogUrl)}">Към каталога</a>
          </nav>
          <p class="eyebrow">Споделим Профил • Публични Линкове • Описание</p>
          <h1>${escapeHtml(profile.name)}</h1>
          <p class="hero-text">${escapeHtml(profile.summary || profile.description || profile.imageNote)}</p>
          <div class="hero-actions">
            <a class="button" href="${escapeHtml(catalogUrl)}">Виж в каталога</a>
            <a class="button button-secondary" href="${escapeHtml(siteBaseUrl)}">Начална страница</a>
          </div>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="hero-frame">
            <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(profile.alt)}" />
          </div>
          <div class="hero-quote">
            <span>${escapeHtml(profile.kicker || "Полево наблюдение")}</span>
            <strong>${escapeHtml(profile.imageNote || pageDescription)}</strong>
          </div>
        </div>
      </header>

      <main class="profile-share-main">
        <article class="profile-card" id="${escapeHtml(profile.id)}" data-orientation="${escapeHtml(profile.orientation)}">
          <div class="profile-media">
            <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(profile.alt)}" />
            <div class="media-chip">${escapeHtml(profile.imageNote)}</div>
          </div>

          <div class="profile-copy">
            <div class="profile-main">
              ${profile.kicker ? `<p class="profile-kicker">${escapeHtml(profile.kicker)}</p>` : ""}
              <h3>${escapeHtml(profile.name)}</h3>
              ${summaryBlock}
              <div class="profile-actions">
                <a class="button" href="${escapeHtml(catalogUrl)}">Отвори в каталога</a>
                <div class="share-button-group" aria-label="Опции за споделяне">
                  <span class="share-button-heading">Сподели</span>
                  ${shareButtons.join("")}
                </div>
              </div>
              ${descriptionBlock}
              <dl class="signal-grid">${signalItems.join("")}</dl>
              ${insightBlock}
            </div>
            ${profileVideoBlock}
          </div>
        </article>
      </main>

      <footer class="site-footer">
        <p>Каталог на Онлайн Гурута</p>
        <a href="#top">Обратно горе</a>
      </footer>
    </div>
  </body>
</html>
`;
}

function labelFromUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname.includes("facebook.com")) {
      return "Facebook";
    }

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return "YouTube";
    }

    if (hostname.includes("instagram.com")) {
      return "Instagram";
    }

    if (hostname.includes("tiktok.com")) {
      return "TikTok";
    }

    if (hostname.includes("linkedin.com")) {
      return "LinkedIn";
    }

    if (hostname.includes("viber.com")) {
      return "Viber";
    }

    return "Уебсайт";
  } catch {
    return "Уебсайт";
  }
}

function normaliseUrl(label, rawValue) {
  const value = rawValue.trim();
  const cleanedLabel = normaliseLabel(label || value);

  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return { label: label ? cleanedLabel : labelFromUrl(value), url: value };
  }

  if (label && label.toLowerCase() === "instagram" && value.startsWith("@")) {
    return {
      label: "Instagram",
      url: `https://www.instagram.com/${value.slice(1)}/`,
    };
  }

  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(value)) {
    return {
      label: cleanedLabel,
      url: `https://${value}`,
    };
  }

  if (value.startsWith("@")) {
    return {
      label: cleanedLabel,
      url: `https://www.instagram.com/${value.slice(1)}/`,
    };
  }

  return null;
}

function parseLinks(rawText) {
  const links = [];
  const channels = new Set();
  const labelCounts = new Map();
  const textFields = {
    description: "",
    kicker: "",
    summary: "",
    aura: "",
    funnel: "",
    insight: "",
    imageNote: "",
  };

  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const isFullUrl = /^https?:\/\//i.test(line);
    const colonIndex = isFullUrl ? -1 : line.indexOf(":");
    const hasLabel = colonIndex > -1;
    const label = hasLabel ? line.slice(0, colonIndex).trim() : "";
    const value = hasLabel ? line.slice(colonIndex + 1).trim() : line;

    if (hasLabel) {
      const mappedField = textFieldAliases.get(normaliseKey(label));

      if (mappedField) {
        textFields[mappedField] = value;
        continue;
      }
    }

    const parsed = normaliseUrl(label, value);

    if (!parsed) {
      continue;
    }

    const baseLabel = parsed.label;
    const count = (labelCounts.get(baseLabel) || 0) + 1;
    labelCounts.set(baseLabel, count);

    links.push({
      ...parsed,
      label: count === 1 ? baseLabel : `${baseLabel} ${count}`,
    });
    channels.add(baseLabel);
  }

  return {
    ...textFields,
    links,
    channels: Array.from(channels),
  };
}

async function detectOrientation(filePath) {
  try {
    const { stdout } = await execFileAsync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath]);
    const widthMatch = stdout.match(/pixelWidth:\s+(\d+)/);
    const heightMatch = stdout.match(/pixelHeight:\s+(\d+)/);

    if (!widthMatch || !heightMatch) {
      return "portrait";
    }

    return Number(widthMatch[1]) >= Number(heightMatch[1]) ? "landscape" : "portrait";
  } catch {
    return "portrait";
  }
}

export async function readProfiles(rootDir = process.cwd()) {
  const assetsDir = path.join(rootDir, "assets");

  try {
    await fs.access(assetsDir);
  } catch {
    return [];
  }

  const entries = await fs.readdir(assetsDir, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((left, right) => left.name.localeCompare(right.name));

  const profiles = [];
  const idUsage = new Map();
  const noteUsage = {
    portrait: 0,
    landscape: 0,
  };

  for (const folder of folders) {
    const folderPath = path.join(assetsDir, folder.name);
    const displayName = folder.name.normalize("NFC");
    const baseId = toSlug(displayName) || "guru";
    const idCount = (idUsage.get(baseId) || 0) + 1;
    const profileId = idCount === 1 ? baseId : `${baseId}-${idCount}`;
    const files = await fs.readdir(folderPath, { withFileTypes: true });
    const imageFile = files.find((entry) => imageExtensions.has(path.extname(entry.name).toLowerCase()));
    const videoFiles = files
      .filter((entry) => videoExtensions.has(path.extname(entry.name).toLowerCase()))
      .sort((left, right) => left.name.localeCompare(right.name));
    const textFile = files.find((entry) => path.extname(entry.name).toLowerCase() === ".txt");

    if (!imageFile || !textFile) {
      continue;
    }

    const imagePath = path.join(folderPath, imageFile.name);
    const rawText = await fs.readFile(path.join(folderPath, textFile.name), "utf8");
    const { description, kicker, summary, aura, funnel, insight, imageNote, links, channels } =
      parseLinks(rawText);
    const orientation = await detectOrientation(imagePath);
    const defaultImageNote = imageNote || getDefaultImageNote(orientation, noteUsage[orientation]);

    if (!imageNote) {
      noteUsage[orientation] += 1;
    }

    idUsage.set(baseId, idCount);

    profiles.push({
      id: profileId,
      name: displayName,
      image: path.posix.join("assets", folder.name, imageFile.name),
      alt: `Профилно изображение за ${displayName}`,
      imageNote: defaultImageNote,
      videos: videoFiles.map((entry) => path.posix.join("assets", folder.name, entry.name)),
      orientation,
      description,
      kicker,
      summary,
      aura,
      funnel,
      insight,
      channels,
      links,
    });
  }

  return profiles;
}

export async function writeSiteData(rootDir = process.cwd()) {
  const profiles = await readProfiles(rootDir);
  const staticAssetsDir = path.join(rootDir, "site-assets");
  const profilePagesDir = path.join(rootDir, "profiles");
  const outputFile = path.join(rootDir, "site-data.js");
  const siteBaseUrl = await getSiteBaseUrl(rootDir);

  await fs.mkdir(staticAssetsDir, { recursive: true });
  await fs.rm(profilePagesDir, { recursive: true, force: true });
  await fs.mkdir(profilePagesDir, { recursive: true });
  const staticProfiles = [];

  for (const profile of profiles) {
    const extension = path.extname(profile.image).toLowerCase();
    const fileSlug = profile.id || toSlug(profile.name) || "guru";
    const targetFileName = `${fileSlug}${extension}`;
    const shareCardFileName = `${fileSlug}-share.jpg`;
    const sourceImagePath = path.join(rootDir, profile.image);
    const targetImagePath = path.join(staticAssetsDir, targetFileName);
    const shareCardPath = path.join(staticAssetsDir, shareCardFileName);

    await fs.copyFile(sourceImagePath, targetImagePath);
    await generateShareCard(profile, targetImagePath, shareCardPath);

    const staticVideoPaths = [];

    for (const [index, videoPath] of (profile.videos || []).entries()) {
      const videoExtension = path.extname(videoPath).toLowerCase();
      const targetVideoFileName =
        index === 0 ? `${fileSlug}-video${videoExtension}` : `${fileSlug}-video-${index + 1}${videoExtension}`;
      const sourceVideoPath = path.join(rootDir, videoPath);
      const targetVideoPath = path.join(staticAssetsDir, targetVideoFileName);

      await fs.copyFile(sourceVideoPath, targetVideoPath);
      staticVideoPaths.push(path.posix.join("site-assets", targetVideoFileName));
    }

    staticProfiles.push({
      ...profile,
      image: path.posix.join("site-assets", targetFileName),
      shareImage: path.posix.join("site-assets", shareCardFileName),
      videos: staticVideoPaths,
    });
  }

  for (const profile of staticProfiles) {
    const profileDir = path.join(profilePagesDir, profile.id);
    const profilePagePath = path.join(profileDir, "index.html");

    await fs.mkdir(profileDir, { recursive: true });
    await fs.writeFile(profilePagePath, buildProfileSharePage(profile, siteBaseUrl), "utf8");
  }

  const fileContent = `window.__GURU_PROFILES__ = ${JSON.stringify(staticProfiles, null, 2)};\n`;

  await fs.writeFile(outputFile, fileContent, "utf8");

  return staticProfiles;
}
