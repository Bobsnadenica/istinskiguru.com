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
  const sections = review.sections.map((section) => {
    if (!Array.isArray(section.sources) || !section.sources.length) throw new Error("Review section requires sources");
    const links = section.sources.map((source) => {
      const url = new URL(source.url);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("Review sources must use public HTTPS URLs");
      return `<a href="${text(url.href)}" target="_blank" rel="noopener noreferrer">${text(source.label)}</a>`;
    });
    return `<section class="evidence-section"><h3>${text(section.title)}</h3>
      <p><strong>Какво установихме:</strong> ${text(section.fact)}</p>
      <p><strong>Нашият прочит:</strong> ${text(section.assessment)}</p>
      <p class="source-note">Източници: ${links.join(" · ")}</p></section>`;
  }).join("\n");
  return `<article class="evidence-review" aria-label="Проверка по публични източници">
    <header class="evidence-verdict"><p class="eyebrow">Проверено на <time datetime="${text(review.reviewedOn)}">${text(review.reviewedOn.split("-").reverse().join("."))}</time></p>
      <h2>${text(review.verdict)}</h2><p>${text(review.conclusion)}</p></header>
    ${sections}
    <section class="evidence-section"><h3>Обхват на проверката</h3>${list(review.limitations)}</section>
    <section class="evidence-section"><h3>Какво да поискаш преди плащане</h3>${list(review.questions)}</section>
    <p class="source-note">Това е преглед на публични материали към посочената дата, не решение на съд или регулатор. <a href="/contactus.html">Изпрати документ, корекция или право на отговор.</a></p>
  </article>`;
}
