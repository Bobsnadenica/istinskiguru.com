// Deep links from the homepage open the relevant explanation.
function revealLinkedTopic() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  let parent = target;
  while (parent) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }
  target.scrollIntoView({behavior:'instant',block:'start'});
}
window.addEventListener('hashchange', revealLinkedTopic);
revealLinkedTopic();
