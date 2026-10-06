const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gunzipSync } = require('node:zlib');

const root = path.resolve(__dirname, '..');
const paths = process.argv.slice(2);
const artifacts = paths.length ? paths : ['src/index.template.html', 'dist/index.html', 'json-yaml-csv-viewer.html', 'dist/index.self-extract.html'];
const unsafe = [
  '9223372036854775807', '-9223372036854775808',
  '9007199254740992', '9007199254740993', '-9007199254740992', '-9007199254740993',
  '+9223372036854775807', '-0009223372036854775808', ' 9223372036854775807 ',
  '9223372036854775807.0', '-9223372036854775808.0', '9007199254740993.25',
  '9.223372036854775807e18', '-9.223372036854775808E+18', '90071992547409930e-1',
  '1e309', '-1e309', '9'.repeat(400)
];
const controls = [
  ['9007199254740991', Number.MAX_SAFE_INTEGER], ['-9007199254740991', Number.MIN_SAFE_INTEGER],
  ['42', 42], ['-42', -42], ['+42', 42], ['0', 0], ['-0', -0],
  ['1.25', 1.25], ['-2.5', -2.5], ['.5', .5], ['1.', 1], ['1.25e2', 125],
  ['1e3', 1000], ['1e-3', .001], [' 42 ', 42],
  ['true', true], ['false', false], ['yes', true], ['off', false], ['null', null], ['~', null],
  ['', ''], ['001', '001'], ['hello', 'hello'], ['Infinity', 'Infinity']
];

for (const artifact of artifacts) {
  let html = fs.readFileSync(path.resolve(root, artifact), 'utf8');
  const payload = html.match(/id="self-extract-payload"[^>]*>([A-Za-z0-9+/=\r\n]+)<\/script>/);
  if (payload) html = gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8');
  const names = ['parseCSV', 'coerceScalar', 'stripYamlComment', 'splitTopLevel', 'parseFlow', 'findYamlColon', 'unquote', 'parseYamlScalar', 'yamlScalar', 'toYAML', 'toTable', 'csvEscape', 'toCSV', 'safeString', 'typeOf', 'inferSchema', 'mergeSchemas', 'profileColumns'];
  const functions = names.map(name => {
    const line = html.split(/\r?\n/).find(line => line.startsWith(`function ${name}(`));
    assert.ok(line, `Find production ${name}`);
    return line;
  });
  // The CSV-only helper is absent in the regression baseline; parseCSV itself
  // must fail on lost digits, rather than the harness requiring the new helper.
  const csvHelper = html.split(/\r?\n/).find(line => line.startsWith('function coerceCsvScalar('));
  if (csvHelper) functions.push(csvHelper);
  functions.push(html.slice(html.indexOf('function parseYAML('), html.indexOf('function parseCurrent(')));
  const app = vm.createContext({});
  vm.runInContext(functions.join('\n'), app);

  for (const [format, delimiter] of [['CSV', ','], ['TSV', '\t']]) {
    test(`${artifact}: ${format} preserves unsafe integer and overflow lexemes`, () => {
      const text = ['id' + delimiter + 'value', ...unsafe.map((value, i) => `${i}${delimiter}${value}`)].join('\n');
      const parsed = app.parseCSV(text, delimiter);
      for (let i = 0; i < unsafe.length; i++) assert.equal(parsed.data[i].value, unsafe[i], unsafe[i]);
      assert.equal(parsed.unevenRows, false);
    });
    test(`${artifact}: ${format} keeps ordinary scalar inference`, () => {
      for (const [text, expected] of controls) {
        const parsed = app.parseCSV(`value${delimiter}label\n${text}${delimiter}control`, delimiter);
        assert.equal(parsed.data[0].value, expected, JSON.stringify(text));
      }
    });
  }
  test(`${artifact}: quoted CSV fields and metadata survive the precision guard`, () => {
    const parsed = app.parseCSV('id,id,nested\n"9223372036854775807","-9223372036854775808","{""n"":9223372036854775807}"\n7', ',');
    assert.equal(parsed.data[0].id, '9223372036854775807');
    assert.equal(parsed.data[0].id_2, '-9223372036854775808');
    assert.equal(parsed.data[0].nested, '{"n":9223372036854775807}');
    assert.equal(parsed.duplicateHeaders, true);
    assert.equal(parsed.unevenRows, true);
  });
  for (const kind of ['CSV', 'JSON', 'YAML']) {
    test(`${artifact}: ${kind} export and reimport retain every protected lexeme`, () => {
      const data = app.parseCSV('value,label\n' + unsafe.map(value => `${value},large`).join('\n'), ',').data;
      const output = kind === 'CSV' ? app.toCSV(data) : kind === 'JSON' ? JSON.stringify(data) : app.toYAML(data);
      const restored = kind === 'CSV' ? app.parseCSV(output, ',').data : kind === 'JSON' ? JSON.parse(output) : app.parseYAML(output);
      unsafe.forEach((value, i) => assert.equal(restored[i].value, value, value));
      assert.equal(output.includes('9223372036854776000'), false);
    });
  }
  test(`${artifact}: YAML quotes numeric-looking strings before they can be re-inferred`, () => {
    for (const value of [...unsafe, '123', '1.25', '1e3']) {
      const output = app.toYAML({ value });
      assert.equal(app.parseYAML(output).value, value, output);
    }
  });
  test(`${artifact}: original YAML numeric input and ordinary decimal behavior stay unchanged`, () => {
    assert.equal(app.parseYAML('value: 9223372036854775807').value, Number('9223372036854775807'));
    assert.equal(app.parseYAML('value: 1.25').value, 1.25);
    assert.equal(app.coerceScalar('9223372036854775807'), Number('9223372036854775807'));
    // This patch does not promise arbitrary precision for ordinary decimals.
    assert.equal(app.parseCSV('value,label\n0.1234567890123456789,decimal', ',').data[0].value, Number('0.1234567890123456789'));
  });
  test(`${artifact}: schema and profile report protected values honestly as strings`, () => {
    const data = app.parseCSV('value\n9223372036854775807', ',').data;
    assert.equal(app.inferSchema(data).items.properties.value.type, 'string');
    const profile = app.profileColumns(data)[0];
    assert.equal(profile.types[0], 'string');
    assert.equal(profile.min, null);
    assert.equal(profile.max, null);
  });
}
