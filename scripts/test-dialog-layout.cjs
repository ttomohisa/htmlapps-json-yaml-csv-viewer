const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { gunzipSync } = require('node:zlib');
const root = path.resolve(__dirname, '..');
const targets = process.argv.slice(2);
if (!targets.length) targets.push('src/index.template.html');

function phoneCss(css, width) {
  const marker = `@media(max-width:${width}px)`;
  const start = css.indexOf(marker);
  assert.ok(start >= 0, `Existing phone breakpoint must remain: ${width}px`);
  const opening = css.indexOf('{', start);
  let depth = 1;
  for (let end = opening + 1; end < css.length; end++) {
    if (css[end] === '{') depth++;
    if (css[end] === '}' && --depth === 0) return css.slice(opening + 1, end);
  }
  assert.fail('Unclosed phone breakpoint');
}

for (const target of targets) {
  const html = fs.readFileSync(path.resolve(root, target), 'utf8');
  const payload = html.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
  const source = payload ? gunzipSync(Buffer.from(payload[1].trim(), 'base64')).toString('utf8') : html;
  const css = source.match(/<style>([\s\S]*?)<\/style>/)[1];
  function rule(selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = css.match(new RegExp('(?:^|})\\s*' + escaped + '\\{([^}]+)\\}'));
    return Object.fromEntries((match?.[1] || '').split(';').filter(Boolean).map(d => d.split(':').map(s => s.trim())));
  }
  // CSS contracts complement native rendered geometry. Removing the flex body
  // constraints recreates the observed 47px clipped tail at a 1311x841 viewport.
  test(`${target}: dialog body shares the actual bounded height with its header`, () => {
    assert.equal(rule('dialog[open]').display, 'flex');
    assert.equal(rule('dialog[open]')['flex-direction'], 'column');
    assert.equal(rule('.dialog-head').flex, 'none');
    assert.equal(rule('.dialog-body')['min-height'], '0');
    assert.equal(rule('.dialog-body')['max-height'], 'none');
    assert.equal(rule('.dialog-body').overflow, 'auto');
  });
  test(`${target}: modal scrolling cannot move the background document`, () => {
    assert.equal(rule('html:has(dialog[open])').overflow, 'hidden');
    assert.equal(rule('.dialog-body')['overscroll-behavior'], 'contain');
  });
}

for (const target of targets) test(`${target}: phone footer hides without hiding data pagination`, () => {
  const html = fs.readFileSync(path.resolve(root, target), 'utf8');
  const payload = html.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
  const source = payload ? gunzipSync(Buffer.from(payload[1].trim(), 'base64')).toString('utf8') : html;
  const css = source.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.match(phoneCss(css, 640), /(?:^|})footer\{[^}]*display:none(?:;|})/);
  assert.doesNotMatch(css.slice(0, css.indexOf('@media')), /(?:^|})footer\{[^}]*display:none/);
  assert.doesNotMatch(phoneCss(css, 640), /\.table-footer\{[^}]*display:none/);
  assert.doesNotMatch(source.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)[0], /<(?:button|input|select)\b/);
});
