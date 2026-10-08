import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const script = await readFile(new URL('../directory.js', import.meta.url), 'utf8');
class Element {
  constructor(dataset = {}) { this.dataset = dataset; this.hidden = true; this.value = ''; this.textContent = ''; this.attributes = {}; this.events = {}; }
  addEventListener(name, callback) { this.events[name] = callback; }
  fire(name) { this.events[name]?.(); }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  querySelector() { return this.count; }
  focus() { this.focused = true; }
}
function directory(url = 'https://www.istinskiguru.com/', withFilters = true) {
  const input = new Element(), status = new Element(), empty = new Element(), clear = new Element(), group = new Element();
  group.attributes.hidden = '';
  const cards = [
    ['Стефан Минчев БАП лиценз', 'sourced'],
    ['Мария Боева курсове', 'sourced'],
    ['Мария Боева фирмени връзки', 'company'],
    ['Боян Москов менторство', 'sourced']
  ].map(([search, review]) => new Element({search, review}));
  const filters = withFilters ? ['all', 'sourced', 'company'].map(filter => {
    const button = new Element({filter}); button.count = new Element(); return button;
  }) : [];
  const elements = {'#directory-search': input, '#directory-status': status, '#directory-empty': empty, '#directory-clear': clear, '[data-directory-filters]': withFilters ? group : null};
  const location = {href: url}, events = {};
  vm.runInNewContext(script, {
    document: {querySelector: selector => elements[selector], querySelectorAll: selector => selector === '.investigation-card' ? cards : filters},
    window: {addEventListener: (name, callback) => { events[name] = callback; }}, location, URL,
    history: {replaceState: (_, __, target) => { location.href = String(target); }}
  });
  return {input, status, empty, clear, group, cards, filters, location, events,
    visible: () => cards.filter(card => !card.hidden).map(card => card.dataset.search),
    search: text => { input.value = text; input.fire('input'); },
    filter: type => filters.find(button => button.dataset.filter === type).fire('click')};
}

const page = directory('https://www.istinskiguru.com/?from=shared#directory');
assert.equal(page.visible().length, 4, 'All profiles are visible by default');
assert.equal(page.clear.hidden, true);
assert.equal(page.empty.hidden, true);
assert.ok(!('hidden' in page.group.attributes), 'Working filters are revealed');
page.search('  БОЕВА\t мария  ');
assert.deepEqual(page.visible(), ['Мария Боева курсове', 'Мария Боева фирмени връзки'], 'Cyrillic case, whitespace and word order are normalized');
assert.deepEqual(page.filters.map(button => Number(button.count.textContent)), [2, 1, 1], 'Counts describe the current search');
assert.equal(new URL(page.location.href).searchParams.has('q'), false, 'Typing does not rewrite the URL');
page.input.fire('change');
assert.equal(new URL(page.location.href).searchParams.get('q'), 'БОЕВА\t мария');
page.filter('company');
assert.deepEqual(page.visible(), ['Мария Боева фирмени връзки'], 'Search and type filters combine');
assert.equal(page.filters[2].attributes['aria-pressed'], 'true');
assert.equal(page.filters[0].attributes['aria-pressed'], 'false');
assert.equal(new URL(page.location.href).searchParams.get('view'), 'company');
assert.equal(new URL(page.location.href).searchParams.get('from'), 'shared', 'Other URL parameters survive');
assert.equal(new URL(page.location.href).hash, '#directory');
page.search('несъществуващо');
assert.deepEqual(page.visible(), []);
assert.equal(page.empty.hidden, false, 'A zero-result search offers recovery');
assert.match(page.status.textContent, /0 от 4/);
page.clear.fire('click');
assert.equal(page.visible().length, 4, 'Clear resets both query and type');
assert.equal(page.clear.hidden, true);
assert.equal(page.empty.hidden, true);
assert.equal(page.input.focused, true, 'Clear returns keyboard focus to search');
assert.equal(new URL(page.location.href).searchParams.has('q'), false);
assert.equal(new URL(page.location.href).searchParams.has('view'), false);

const returning = directory();
returning.search('  Минчев  ');
returning.input.fire('blur');
assert.equal(new URL(returning.location.href).searchParams.get('q'), 'Минчев', 'Leaving search saves the query even without a change event');
returning.input.value = '';
returning.events.pageshow();
assert.equal(returning.input.value, 'Минчев', 'Returning from a profile restores the saved query');
assert.deepEqual(returning.visible(), ['Стефан Минчев БАП лиценз'], 'Returning from a profile restores the filtered results');

const restored = directory('https://www.istinskiguru.com/?q=мария&view=company');
assert.deepEqual(restored.visible(), ['Мария Боева фирмени връзки'], 'Shared URLs restore search and type');
restored.location.href = 'https://www.istinskiguru.com/?q=МИНЧЕВ&view=sourced';
restored.events.popstate();
assert.deepEqual(restored.visible(), ['Стефан Минчев БАП лиценз'], 'Back navigation restores the displayed search');
restored.location.href = 'https://www.istinskiguru.com/?q=мария&view=invalid';
restored.events.pageshow();
assert.equal(restored.visible().length, 2, 'Invalid views fall back to all profiles after page restoration');
assert.equal(restored.filters[0].attributes['aria-pressed'], 'true');

const gallery = directory('https://www.istinskiguru.com/gallery.html?q=мария&view=sourced', false);
assert.equal(gallery.visible().length, 2, 'Search also works on pages without type buttons');
gallery.search('бап ЛИЦЕНЗ');
assert.deepEqual(gallery.visible(), ['Стефан Минчев БАП лиценз']);
gallery.input.fire('change');
assert.equal(new URL(gallery.location.href).searchParams.has('view'), false, 'A missing filter cannot leave a stale view active');
gallery.clear.fire('click');
assert.equal(gallery.visible().length, 4);
console.log('Directory: search, filter combinations, counts, empty/reset states and URL restoration passed.');
