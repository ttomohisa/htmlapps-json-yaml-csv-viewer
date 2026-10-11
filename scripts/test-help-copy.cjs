'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');
const argument = process.argv.indexOf('--html');
const file = argument >= 0 ? process.argv[argument + 1] : path.join(__dirname, '../src/index.template.html');
let html = fs.readFileSync(file, 'utf8');
const payload = html.match(/<script id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\s]+)<\/script>/);
if (payload) html = gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8');
const excluded = [
  "<p>ヘルプと保存ダイアログは画面内に収まり、内容だけをスクロールできます。開いている間は背景のページは動きません。</p>",
  "<p>Help and export dialogs fit the window and scroll their contents independently. The background page stays still while a dialog is open.</p>",
  "表は100行ずつ表示してDOM負荷を抑えます。",
  "Tables render 100 rows at a time to keep the DOM responsive."
];
for (const text of excluded) {
  assert.equal(html.includes(text), false, `User-facing help must exclude obsolete audit/implementation copy: ${text}`);
}
console.log('User-facing help copy regression passed.');
