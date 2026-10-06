const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gunzipSync } = require('node:zlib');

const root = path.resolve(__dirname, '..');
const artifacts = process.argv.slice(2);
if (!artifacts.length) artifacts.push('src/index.template.html', 'dist/index.html', 'json-yaml-csv-viewer.html', 'dist/index.self-extract.html');

// Run the complete production app with a minimal DOM facade. Static attributes
// come from the real HTML; these checks complement, rather than replace, browser QA.
function harness(html, language = 'ja') {
  const nodes = new Map();
  function element(selector) {
    if (!nodes.has(selector)) {
      const attrs = {}, classes = new Set();
      nodes.set(selector, { attrs, dataset: {}, value: '', textContent: '', innerHTML: '', style: {},
        setAttribute(key, value) { attrs[key] = String(value); },
        getAttribute(key) { return attrs[key] ?? null; },
        classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name), toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) },
        addEventListener() {}, click() {}, showModal() {}, close() {}
      });
    }
    return nodes.get(selector);
  }
  let anonymous = 0;
  for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*?)>/gi)) {
    const attrs = Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const node = element(attrs.id ? '#' + attrs.id : 'anonymous-' + anonymous++);
    Object.assign(node.attrs, attrs);
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('data-')) node.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
  }
  const document = {
    documentElement: {}, addEventListener() {}, querySelector: element,
    querySelectorAll(selector) {
      if (selector === '.tab') return [...nodes.values()].filter(n => n.attrs.class?.split(' ').includes('tab'));
      const attr = selector.match(/^\[([\w-]+)\]$/)?.[1];
      return attr ? [...nodes.values()].filter(n => Object.hasOwn(n.attrs, attr)) : [];
    }
  };
  const app = vm.createContext({ document, navigator: { language }, location: { protocol: 'file:' }, TextEncoder, TextDecoder, console, setTimeout: () => 1, clearTimeout() {} });
  const start = html.indexOf("'use strict';\nconst $=");
  assert.notEqual(start, -1, 'Locate production application code');
  vm.runInContext(html.slice(start, html.lastIndexOf('})();')) + '\nglobalThis.appState=state;', app);
  return { app, state: app.appState, document, element, nodes,
    toggle() { element('#langBtn').onclick(); },
    load(text, format = 'json') { app.loadText('test.' + format, text, format); },
    quality() { return element('#qualityList').innerHTML; }
  };
}

const findings = [
  ['clean CSV', 'id,name\n1,猫\n2,犬', 'csv', ['qualityGood']],
  ['mixed and missing values', '[{"value":1},{"value":"cat"},{"value":null}]', 'json', ['mixedTypes', 'missingValues']],
  ['duplicate headers and uneven rows', 'id,id\n1,2\n3', 'csv', ['missingValues', 'duplicateHeaders', 'unevenRows']],
  ['YAML scope warning', 'value: &anchor cat', 'yaml', ['yamlLimited']]
];

for (const artifact of artifacts) {
  let html = fs.readFileSync(path.resolve(root, artifact), 'utf8');
  const payload = html.match(/id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\r\n]+)<\/script>/);
  if (payload) html = gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8');
  const dictionary = vm.runInNewContext('(' + html.match(/const I18N\s*=\s*(\{[\s\S]*?\n\s*\});/)[1] + ')');

  for (const initial of ['ja', 'en']) {
    for (const [name, text, format, keys] of findings) {
      test(`${artifact}: ${name} follows repeated language toggles from ${initial}`, () => {
        const h = harness(html, initial); h.load(text, format);
        const data = h.state.data, quality = h.state.quality, before = JSON.stringify(h.state);
        for (let i = 0; i < 5; i++) {
          const locale = h.document.documentElement.lang;
          assert.equal(h.quality(), keys.map(key => `<div class="quality-item ${key === 'qualityGood' ? 'good' : 'warn'}">${dictionary[locale][key]}</div>`).join(''));
          assert.equal(h.state.data, data);
          assert.equal(h.state.quality, quality);
          assert.equal(JSON.stringify(h.state), before, 'No reparse or data-state mutation during language changes');
          h.toggle();
        }
      });
    }

    test(`${artifact}: view selector and dialog close names follow ${initial} toggles`, () => {
      const h = harness(html, initial);
      const tabs = [...h.nodes.values()].find(n => n.attrs.class === 'view-tabs');
      assert.ok(tabs, 'Locate the actual view switcher');
      for (let i = 0; i < 5; i++) {
        const ja = h.document.documentElement.lang === 'ja';
        assert.equal(tabs.getAttribute('aria-label'), ja ? '表示切替' : 'Switch view');
        for (const id of ['#helpClose', '#exportClose']) assert.equal(h.element(id).getAttribute('aria-label'), ja ? '閉じる' : 'Close');
        h.toggle();
      }
    });
  }

  test(`${artifact}: toggles preserve table page, search, parsed references and numeric lexemes`, () => {
    const h = harness(html);
    h.load('id,value\n' + Array.from({ length: 205 }, (_, i) => `${i},9223372036854775807`).join('\n'), 'csv');
    h.state.view = 'table'; h.state.page = 2; h.app.renderView();
    h.element('#searchInput').value = '204'; h.app.runSearch();
    const before = JSON.stringify(h.state), data = h.state.data, schema = h.state.schema, stats = h.state.stats;
    for (let i = 0; i < 6; i++) {
      h.toggle();
      assert.equal(JSON.stringify(h.state), before);
      assert.equal(h.state.data, data); assert.equal(h.state.schema, schema); assert.equal(h.state.stats, stats);
      assert.equal(h.element('#searchInput').value, '204');
      assert.equal(h.state.data[204].value, '9223372036854775807');
      assert.equal(h.state.page, 2);
    }
  });

  test(`${artifact}: reset clears findings before language changes and loading another file`, () => {
    const h = harness(html);
    assert.equal(h.quality(), '');
    h.load(findings[1][1]); h.app.reset(); h.toggle();
    assert.equal(h.quality(), '');
    h.load('false');
    assert.equal(h.quality(), '<div class="quality-item good">No major issues detected</div>');
    h.toggle();
    assert.equal(h.quality(), '<div class="quality-item good">大きな問題は見つかりませんでした</div>');
  });
}
