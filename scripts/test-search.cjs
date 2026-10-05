const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const test = require('node:test');

// Exercise the production functions with a small DOM facade, without a browser.
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
const names = ['safeString', 'typeOf', 'pathJoin', 'escapeHtml', 'runSearch', 'jumpToSearch'];
function functionsFrom(html) {
  return names.map(name => {
    const lines = html.split(/\r?\n/).filter(line => line.startsWith(`function ${name}(`));
    assert.equal(lines.length, 1, `Expected one ${name} function`);
    return lines[0];
  }).join('\n');
}
const sampleMatch = source.match(/loadText\('sample.json',JSON.stringify\((.*?),null,2\),'json'\)/);
assert.ok(sampleMatch, 'Built-in sample must be available');
const sample = JSON.parse(JSON.stringify(vm.runInNewContext(`(${sampleMatch[1]})`)));
const plain = value => JSON.parse(JSON.stringify(value));

function createHarness(html, data = sample, language = 'en') {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) {
      const classes = new Set();
      elements.set(selector, {
        value: '', textContent: '', innerHTML: '',
        classList: {
          remove: name => classes.delete(name),
          contains: name => classes.has(name),
          toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
        }
      });
    }
    return elements.get(selector);
  };
  let buttons = [];
  let resultHtml = '';
  Object.defineProperty(element('#searchResults'), 'innerHTML', {
    get: () => resultHtml,
    set: value => {
      resultHtml = value;
      buttons = [...value.matchAll(/data-search-index="(\d+)"/g)]
        .map(match => ({ dataset: { searchIndex: match[1] } }));
    }
  });
  const treeNodes = [];
  const jumps = [];
  const timers = [];
  const renderedViews = [];
  const state = { data, search: [], view: 'formatted' };
  const app = vm.createContext({
    state, $: element,
    $$: selector => selector === '[data-search-index]' ? buttons : treeNodes,
    t: key => key === 'searchResults' ? (language === 'ja' ? '件' : 'matches') : key,
    renderView: () => renderedViews.push(state.view),
    setTimeout: callback => timers.push(callback)
  });
  vm.runInContext(functionsFrom(html), app);
  const jump = app.jumpToSearch;
  app.jumpToSearch = item => { jumps.push(item); jump(item); };
  return {
    state, element, treeNodes, jumps, timers, renderedViews,
    get buttons() { return buttons; },
    search(query) { element('#searchInput').value = query; app.runSearch(); return state.search; }
  };
}

const releases = [['source', source]];
if (!process.env.SEARCH_SOURCE_ONLY) {
  releases.push(['readable release', fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')]);
  releases.push(['root download', fs.readFileSync(path.join(root, 'json-yaml-csv-viewer.html'), 'utf8')]);
  const wrapper = fs.readFileSync(path.join(root, 'dist/index.self-extract.html'), 'utf8');
  const payload = wrapper.match(/<script id="self-extract-payload" type="application\/octet-stream">([A-Za-z0-9+/=\r\n]+)<\/script>/);
  assert.ok(payload, 'Self-extract payload must be available');
  releases.push(['restored self-extract payload', zlib.gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8')]);
}

for (const [label, html] of releases) {
  test(`${label}: search functions match the editable source`, () => {
    assert.equal(functionsFrom(html), functionsFrom(source));
  });

  for (const [query, count] of [['Aki', 1], ['name', 3], ['a', 11], ['m', 10]]) {
    test(`${label}: built-in sample query ${query} lists each path once`, () => {
      const harness = createHarness(html);
      const results = harness.search(query);
      assert.equal(results.length, count);
      assert.equal(new Set(results.map(item => item.path)).size, count);
      assert.equal(harness.buttons.length, count);
      assert.equal(harness.element('#searchCount').textContent, `${count} matches`);
    });
  }

  test(`${label}: first-match traversal order and values are preserved`, () => {
    const harness = createHarness(html);
    assert.deepEqual(plain(harness.search('a').map(item => item.path)), [
      '$.project', '$.active', '$.owners[0].name', '$.owners[0].role',
      '$.owners[1].name', '$.owners[2].name', '$.settings.formats',
      '$.settings.formats[0]', '$.settings.formats[1]', '$.settings.formats[2]',
      '$.settings.limits.maxMB'
    ]);
    assert.equal(harness.state.search.find(item => item.path === '$.settings.formats').value, sample.settings.formats);
    assert.equal(harness.state.search.find(item => item.path === '$.owners[0].name').value, 'Aki');
  });

  test(`${label}: identical values at distinct exact paths remain separate`, () => {
    const data = { 'a.b': 'a', a: { b: 'a' }, 'a list': ['a', 'a'], flag: false };
    const harness = createHarness(html, data);
    assert.deepEqual(plain(harness.search('a').map(item => item.path)), [
      '$["a.b"]', '$.a', '$.a.b', '$["a list"]', '$["a list"][0]', '$["a list"][1]', '$.flag'
    ]);
    assert.equal(harness.state.search.find(item => item.path === '$.flag').value, false);
    assert.equal(createHarness(html, 'alpha').search('a')[0].path, '$');
  });

  test(`${label}: repeated, changed, cleared and empty searches have fresh state`, () => {
    const harness = createHarness(html, sample, 'ja');
    const first = plain(harness.search(' a '));
    assert.deepEqual(plain(harness.search('A')), first);
    assert.equal(harness.element('#searchCount').textContent, '11 件');
    assert.equal(harness.search('name').length, 3);
    assert.equal(harness.search('not-in-this-sample').length, 0);
    assert.equal(harness.element('#searchCount').textContent, '0 件');
    assert.equal(harness.element('#searchResults').classList.contains('active'), false);
    harness.search('a');
    assert.deepEqual(plain(harness.search('  ')), []);
    assert.equal(harness.element('#searchCount').textContent, '');
    assert.equal(harness.element('#searchResults').innerHTML, '');
    assert.equal(harness.element('#searchResults').classList.contains('active'), false);
    assert.equal(harness.buttons.length, 0);
    assert.deepEqual(plain(harness.search('a')), first);
    harness.state.data = { name: 'Aki' };
    assert.deepEqual(plain(harness.search('a')), [{ path: '$.name', value: 'Aki' }]);
  });

  test(`${label}: the 200-result cap counts unique paths before the 50-button limit`, () => {
    // Just over the existing UI cap; this is a boundary case, not a stress fixture.
    const data = Object.fromEntries(Array.from({ length: 205 }, (_, i) => [`match${i}`, 'match']));
    const harness = createHarness(html, data);
    const results = harness.search('match');
    assert.equal(results.length, 200);
    assert.deepEqual(plain(results.map(item => item.path)), Array.from({ length: 200 }, (_, i) => `$.match${i}`));
    assert.equal(harness.element('#searchCount').textContent, '200+ matches');
    assert.equal(harness.buttons.length, 50);
    harness.buttons.forEach((button, i) => {
      button.onclick();
      assert.equal(harness.jumps[i], results[i]);
    });
    const arrayHarness = createHarness(html, { match: Array(205).fill('match') });
    assert.equal(arrayHarness.search('match').length, 200);
    assert.equal(arrayHarness.state.search.at(-1).path, '$.match[198]');
  });

  test(`${label}: unique result callbacks retain tree navigation and values`, () => {
    const harness = createHarness(html);
    const dataBefore = JSON.stringify(sample);
    harness.search('a');
    const treeRoot = harness.element('#treeRoot');
    const details = { tagName: 'DETAILS', open: false, parentElement: treeRoot };
    const target = {
      dataset: { path: '$.owners[0].name' }, parentElement: details,
      style: { background: 'original' },
      scrollIntoView(options) { this.scrolled = plain(options); }
    };
    harness.treeNodes.push(target);
    const index = harness.state.search.findIndex(item => item.path === target.dataset.path);
    harness.buttons[index].onclick();
    assert.equal(harness.jumps[0], harness.state.search[index]);
    assert.deepEqual(plain(harness.jumps[0]), { path: target.dataset.path, value: 'Aki' });
    assert.equal(harness.state.view, 'tree');
    assert.deepEqual(harness.renderedViews, ['tree']);
    assert.equal(details.open, true);
    assert.deepEqual(target.scrolled, { behavior: 'smooth', block: 'center' });
    assert.equal(target.style.background, 'var(--accent-soft)');
    assert.equal(harness.element('#searchResults').classList.contains('active'), false);
    harness.timers[0]();
    assert.equal(target.style.background, 'original');
    assert.equal(JSON.stringify(sample), dataBefore);
  });
}
