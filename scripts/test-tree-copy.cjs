const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
const releases = [['source', source]];
if (!process.env.TREE_SOURCE_ONLY) {
  releases.push(['readable', fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')]);
  releases.push(['root download', fs.readFileSync(path.join(root, 'json-yaml-csv-viewer.html'), 'utf8')]);
  const wrapper = fs.readFileSync(path.join(root, 'dist/index.self-extract.html'), 'utf8');
  releases.push(['restored self-extract', zlib.gunzipSync(Buffer.from(wrapper.match(/<script id="self-extract-payload" type="application\/octet-stream">([A-Za-z0-9+/=\r\n]+)<\/script>/)[1], 'base64')).toString('utf8')]);
}
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function harness(html, language = 'en', protocol = 'https:') {
  const elements = new Map(), groups = new Map(), writes = [], copied = [], errors = [];
  let native = text => { writes.push(text); return Promise.resolve(); }, fallback = () => true;
  function element(selector) {
    if (!elements.has(selector)) {
      const classes = new Set();
      const el = { value: '', textContent: '', dataset: {}, style: {}, isConnected: true,
        classList: { add: v => classes.add(v), remove: v => classes.delete(v), contains: v => classes.has(v), toggle: (v, on) => on ? classes.add(v) : classes.delete(v) },
        setAttribute() {}, addEventListener() {}, select() {}, remove() { this.isConnected = false; }, click() {}, showModal() {}, close() {} };
      let content = '';
      Object.defineProperty(el, 'innerHTML', { get: () => content, set: value => {
        content = value;
        for (const old of groups.get(selector) || []) old.isConnected = false;
        const buttons = [...value.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([, attrs, label]) => {
          const b = { dataset: {}, textContent: decode(label), isConnected: true };
          for (const [, name, val] of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)) b.dataset[name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = decode(val);
          const id = attrs.match(/id="([^"]+)"/); if (id) elements.set('#' + id[1], b);
          return b;
        });
        groups.set(selector, buttons);
      }});
      elements.set(selector, el);
    }
    return elements.get(selector);
  }
  const document = {
    querySelector: element,
    querySelectorAll(selector) {
      if (selector === '.tab') return ['tree', 'table', 'formatted', 'analysis'].map(v => { const el = element('#tab-' + v); el.dataset.view = v; return el; });
      const m = selector.match(/^\[data-([\w-]+)\]$/); if (!m) return [];
      const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return [...groups.values()].flat().filter(b => b.isConnected && Object.hasOwn(b.dataset, key));
    },
    documentElement: {}, addEventListener() {},
    createElement() { return { value: '', style: {}, select() { copied.push(this.value); }, remove() { this.removed = true; } }; },
    body: { appendChild() {} }, execCommand: () => fallback()
  };
  const app = vm.createContext({ document, navigator: { language, clipboard: { writeText: text => native(text) } }, location: { protocol }, TextEncoder, TextDecoder, console: { error: e => errors.push(e) }, setTimeout: () => 1, clearTimeout() {} });
  const code = html.slice(html.indexOf("'use strict';\nconst $="), html.lastIndexOf('})();'));
  vm.runInContext(code + '\nglobalThis.appState=state;', app);
  return { app, state: app.appState, element, document, writes, copied, errors,
    buttons(key = 'copyJson') { return document.querySelectorAll('[data-' + key.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ']'); },
    load(value) { app.loadText('test.json', JSON.stringify(value), 'json'); },
    native(fn) { native = fn; }, fallback(fn) { fallback = fn; },
    click(button) { const e = { prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } }; assert.equal(typeof button?.onclick, 'function', 'Expected a bound copy button'); button.onclick(e); return e; },
    toast() { return [element('#toast').textContent, element('#toast').className]; }
  };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
for (const [label, html] of releases) {
  for (const view of ['tree', 'table', 'formatted', 'analysis']) {
    test(`${label}: ${view} refreshes falsy roots instead of showing the previous file`, () => {
      const h = harness(html); h.state.view = view;
      for (const value of [0, false, '', null, true, 1, 'ok', {}, []]) {
        h.load([{ previous: 'sentinel' }]); const previous = h.element('#mainPanel').innerHTML;
        h.load(value);
        assert.notEqual(h.element('#mainPanel').innerHTML, previous);
        assert.doesNotMatch(h.element('#mainPanel').innerHTML, /sentinel/);
        assert.equal(h.state.stats.nodes, 1);
        assert.deepEqual(JSON.parse(JSON.stringify(h.state.data)), value);
      }
    });
  }
  test(`${label}: copies pretty JSON for root, nested, empty and hostile-key containers`, async () => {
    const h = harness(html);
    const data = JSON.parse('{"a.b":{"keep":false},"a":{"b":[0,"",null]},"quote\\\"[x]":{"emoji":"猫🐈"},"__proto__":{"owned":true},"constructor":{},"empty":[]}');
    h.load(data);
    const expected = [data, data['a.b'], data.a, data.a.b, data['quote"[x]'], data.__proto__, data.constructor, data.empty];
    assert.equal(h.buttons().length, expected.length);
    for (const [i, button] of h.buttons().entries()) {
      const event = h.click(button); await settle();
      assert.equal(event.prevented, true); assert.equal(event.stopped, true);
      assert.equal(h.writes.at(-1), JSON.stringify(expected[i], null, 2));
      assert.equal(h.toast()[0], 'Copied');
    }
    assert.equal(JSON.stringify(h.state.data), JSON.stringify(data));
    assert.doesNotMatch(h.element('#mainPanel').innerHTML, /data-copy-json="[^\"]*(?:keep|owned|emoji)/);
    assert.ok(h.buttons('copyPath').length > h.buttons().length);
    for (const value of [{}, []]) { h.load(value); h.click(h.buttons()[0]); await settle(); assert.equal(h.writes.at(-1), JSON.stringify(value)); }
  });
  test(`${label}: retains raw primitive value and path copy`, async () => {
    const h = harness(html); h.load({ 'a.b': 'hello\n猫', bool: false, number: 0 });
    h.click(h.buttons('copyValue')[0]); await settle(); assert.equal(h.writes.at(-1), 'hello\n猫');
    h.click(h.buttons('copyPath')[1]); await settle(); assert.equal(h.writes.at(-1), '$["a.b"]');
    h.load(false); assert.equal(h.buttons().length, 0);
  });
  test(`${label}: JSON copy preserves parser results for YAML, CSV and JSONL`, async () => {
    const h = harness(html);
    for (const [name, text, format] of [['a.yaml', 'items:\n  - name: 猫\n    enabled: true\n', 'yaml'], ['a.csv', 'name,count\n猫,0\n犬,2', 'csv'], ['a.jsonl', '{"x":false}\n{"x":0}', 'jsonl']]) {
      h.app.loadText(name, text, format); h.state.view = 'tree'; h.app.renderView();
      const expected = JSON.stringify(h.state.data, null, 2);
      h.click(h.buttons()[0]); await settle(); assert.equal(h.writes.at(-1), expected);
    }
  });
  test(`${label}: refuses lossy non-finite numbers and negative zero without copying`, async () => {
    for (const language of ['en', 'ja']) {
      const h = harness(html, language);
      for (const text of ['{"value":1e400}', '{"value":-1e400}', '{"value":-0}', '{"nested":[0,{"value":-0}]}']) {
        h.app.loadText('numbers.json', text, 'json'); h.click(h.buttons()[0]); await settle();
        assert.equal(h.writes.length, 0); assert.equal(h.copied.length, 0);
        assert.match(h.toast()[0], language === 'en' ? /cannot.*JSON|JSON.*cannot/i : /JSON/);
        assert.match(h.toast()[1], /error/);
      }
      h.load({ value: 1 }); h.state.data.value = NaN; h.click(h.buttons()[0]); await settle(); assert.equal(h.writes.length, 0);
    }
  });
  test(`${label}: serializes only on click and keeps exact references`, async () => {
    const h = harness(html); h.load({ nested: { value: 'before' } });
    h.state.data.nested.value = 'after'; h.click(h.buttons()[1]); await settle();
    assert.equal(h.writes.at(-1), '{\n  "value": "after"\n}');
  });
  test(`${label}: stale buttons cannot copy after re-render, view/language changes, reset or a new load`, async () => {
    const h = harness(html);
    for (const change of [() => h.app.renderView(), () => { h.state.view = 'formatted'; h.app.renderView(); }, () => h.element('#langBtn').onclick(), () => h.app.reset(), () => h.load({ fresh: true }), () => h.app.loadFile({ name: 'pending.json', size: 10, arrayBuffer: () => new Promise(() => {}) }), () => { try { h.app.loadText('invalid.json', '{', 'json'); } catch {} }]) {
      h.state.view = 'tree'; h.load({ old: [1] }); const stale = h.buttons()[0];
      const count = h.writes.length; change(); h.click(stale); await settle();
      assert.equal(h.writes.length, count);
    }
  });
  test(`${label}: failed or pending input cannot revive old-file copy after a view/language refresh`, async () => {
    const h = harness(html);
    for (const next of [() => { try { h.app.loadText('invalid.json', '{', 'json'); } catch {} }, () => h.app.loadFile({ name: 'pending.json', size: 10, arrayBuffer: () => new Promise(() => {}) })]) {
      h.load({ old: true }); next(); h.element('#langBtn').onclick(); h.app.renderView();
      for (const b of h.buttons()) h.click(b);
      await settle(); assert.equal(h.writes.length, 0);
    }
  });
  test(`${label}: repeated copy supersedes pending fallback and stale primitive/formatted actions`, async () => {
    const h = harness(html); let rejectFirst;
    h.load({ first: { value: 1 }, second: { value: 2 } });
    h.native(text => { h.writes.push(text); return h.writes.length === 1 ? new Promise((_, reject) => { rejectFirst = reject; }) : Promise.resolve(); });
    h.click(h.buttons()[1]); h.click(h.buttons()[2]); await settle();
    rejectFirst(); await settle(); assert.equal(h.copied.length, 0);
    const stale = h.buttons('copyValue')[0]; h.load({ fresh: true }); const count = h.writes.length;
    h.click(stale); await settle(); assert.equal(h.writes.length, count);
    h.state.view = 'formatted'; h.app.renderView(); const formatted = h.element('#copyFormatted');
    h.load({ newest: true }); h.click(formatted); await settle(); assert.equal(h.writes.length, count);
  });
  test(`${label}: pending native copy cannot fallback or toast into newer context`, async () => {
    for (const reject of [false, true]) {
      const h = harness(html); let complete;
      h.native(text => { h.writes.push(text); return new Promise((resolve, fail) => { complete = reject ? fail : resolve; }); });
      h.load({ old: true }); h.click(h.buttons()[0]);
      h.load({ fresh: true }); const before = h.toast(); complete(); await settle();
      assert.deepEqual(h.toast(), before); assert.equal(h.copied.length, 0);
    }
  });
  test(`${label}: a refused copy supersedes an older pending success message`, async () => {
    for (const reject of [false, true]) {
    const h = harness(html); let complete;
    h.app.loadText('mixed.json', '{"safe":{},"lossy":{"value":-0}}', 'json');
    h.native(() => new Promise((resolve, fail) => { complete = reject ? fail : resolve; }));
    h.click(h.buttons()[1]); h.click(h.buttons()[2]); const error = h.toast();
    assert.match(error[1], /error/); complete(); await settle(); assert.deepEqual(h.toast(), error); assert.equal(h.copied.length, 0);
    }
  });
  test(`${label}: fallback reports actual success, false results and exceptions in both languages`, async () => {
    for (const language of ['en', 'ja']) {
      for (const protocol of ['file:', 'https:']) {
        const h = harness(html, language, protocol); h.native(() => Promise.reject(new Error('Denied')));
        for (const outcome of ['success', 'false', 'throw']) {
          h.load({ test: true }); h.fallback(() => { if (outcome === 'throw') throw Error('Denied'); return outcome === 'success'; });
          h.click(h.buttons()[0]); await settle();
          assert.equal(h.copied.at(-1), '{\n  "test": true\n}');
          assert.equal(h.toast()[0], outcome === 'success' ? (language === 'ja' ? 'コピーしました' : 'Copied') : (language === 'ja' ? 'コピーできませんでした' : 'Copy failed'));
          assert.equal(h.toast()[1].includes('error'), outcome !== 'success');
        }
      }
    }
  });
  test(`${label}: JSON copy controls are localized and visible to keyboard and touch users`, () => {
    for (const language of ['en', 'ja']) {
      const h = harness(html, language); h.load({});
      assert.equal(h.buttons()[0]?.textContent, language === 'ja' ? 'JSONをコピー' : 'Copy JSON');
    }
    assert.match(html, /focus-within[^{}]*\.path-actions|\.path-actions:focus-within/);
    assert.match(html, /@media\s*\(hover:\s*none\)/);
    assert.match(html, /connect-src 'none'/);
  });
}
