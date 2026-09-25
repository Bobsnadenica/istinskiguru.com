// One escaped HTML representation for the static profile and gallery dialog.
export function renderReview(review) {
  const text = (value) => {
    if (typeof value !== "string" || !value.trim()) throw new Error("Review text must be a non-empty string");
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedOn)) throw new Error("Review requires an ISO date");
  if (!["Person", "Organization"].includes(review.subjectType)) throw new Error("Invalid review subject type");
  if (!Array.isArray(review.sections) || !review.sections.length) throw new Error("Review requires sourced sections");
  const list = (items) => {
    if (!Array.isArray(items) || !items.length) throw new Error("Review requires limitations and questions");
    return `<ul>${items.map((item) => `<li>${text(item)}</li>`).join("")}</ul>`;
  };
  const sections = review.sections.map((section, index) => {
    if (!Array.isArray(section.sources) || !section.sources.length) throw new Error("Review section requires sources");
    const links = section.sources.map((source) => {
      const url = new URL(source.url);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("Review sources must use public HTTPS URLs");
      return `<a href="${text(url.href)}" target="_blank" rel="noopener noreferrer">${text(source.label)}</a>`;
    });
    let table = "";
    if (section.table) {
      const { caption, columns, rows } = section.table;
      if (!Array.isArray(columns) || !columns.length || !Array.isArray(rows) || !rows.length ||
          rows.some((row) => !Array.isArray(row) || row.length !== columns.length)) {
        throw new Error("Review table requires columns and matching rows");
      }
      table = `<table class="evidence-table"><caption>${text(caption)}</caption><thead><tr>${columns.map((column) => `<th scope="col">${text(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, column) => column === 0 ? `<th scope="row">${text(cell)}</th>` : `<td>${text(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    }
    const images = (section.images || []).map((image) => {
      if (!/^\/site-assets\/evidence\/[a-z0-9_-]+\.(png|jpg|webp)$/.test(image.src) ||
          !Number.isInteger(image.width) || image.width < 1 || !Number.isInteger(image.height) || image.height < 1) {
        throw new Error("Evidence images require a local path and positive dimensions");
      }
      return `<figure class="evidence-capture"><a href="${text(image.src)}" target="_blank" rel="noopener"><img src="${text(image.src)}" alt="${text(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async" /></a><figcaption>${text(image.caption)}</figcaption></figure>`;
    }).join("");
    return `<section class="evidence-section" id="finding-${index + 1}"><h3>${text(section.title)}</h3>
      <p><strong>Какво установихме:</strong> ${text(section.fact)}</p>${table}
      <p><strong>Нашият прочит:</strong> ${text(section.assessment)}</p>
      <p class="source-note">Източници: ${links.join(" · ")}</p>${images}</section>`;
  }).join("\n");
  const founders = review.founders?.length ? `<section class="evidence-section"><h3>Основатели — представяне от сайта</h3>
    <div class="evidence-founders">${review.founders.map((founder) => {
      if (!/^\/site-assets\/[a-z0-9/_-]+\.(jpg|png|webp)$/.test(founder.image)) throw new Error("Founder photos must use local site assets");
      const source = new URL(founder.source);
      if (source.protocol !== "https:" || source.username || source.password) throw new Error("Founder source must be a public HTTPS URL");
      return `<figure><img src="${text(founder.image)}" alt="${text(founder.name)} — снимка от сайта на организаторите" loading="lazy" decoding="async" width="360" height="400" />
        <figcaption><strong>${text(founder.name)}</strong><a href="${text(source.href)}" target="_blank" rel="noopener noreferrer">Снимка и представяне от сайта</a></figcaption></figure>`;
    }).join("")}</div></section>` : "";
  return `<article class="evidence-review" aria-label="Проверка по публични източници">
    <header class="evidence-verdict"><p class="eyebrow">Проверено на <time datetime="${text(review.reviewedOn)}">${text(review.reviewedOn.split("-").reverse().join("."))}</time></p>
      <h2>${text(review.verdict)}</h2><p>${text(review.conclusion)}</p></header>
    <nav class="review-contents" aria-label="В тази проверка"><strong>В тази проверка</strong><ol>${review.sections.map((section, index) => `<li><a href="#finding-${index + 1}">${text(section.title)}</a></li>`).join("")}</ol></nav>
    ${founders}
    ${sections}
    <section class="evidence-section"><h3>Обхват на проверката</h3>${list(review.limitations)}</section>
    <section class="evidence-section"><h3>${text(review.questionsTitle || "Какво да поискаш преди плащане")}</h3>${list(review.questions)}</section>
    <p class="source-note">Това е преглед на публични материали към посочената дата, не решение на съд или регулатор. <a href="/contactus.html">Изпрати документ, корекция или право на отговор.</a></p>
  </article>`;
}
