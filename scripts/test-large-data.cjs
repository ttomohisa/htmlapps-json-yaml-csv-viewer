const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
const names=['parseCSV','coerceScalar','toTable','profileColumns','typeOf','safeString'];
const functions=names.map(name=>{const line=source.split(/\r?\n/).find(l=>l.startsWith(`function ${name}(`));assert.ok(line,name);return line}).join('\n');
const app=vm.createContext({});vm.runInContext(functions,app);
const plain=value=>JSON.parse(JSON.stringify(value));
test('CSV parsing accepts 200,000 records without an argument-list overflow',()=>{
  const input='value\n'+Array.from({length:200000},(_,i)=>String(i-100000)).join('\n');
  const parsed=app.parseCSV(input,',');
  assert.equal(parsed.data.length,200000);assert.deepEqual(plain(parsed.headers),['value']);
  assert.equal(parsed.data[0].value,-100000);assert.equal(parsed.data[199999].value,99999);
  assert.equal(parsed.unevenRows,false);
});
test('numeric extrema cover 200,000 rows including both ends',()=>{
  const p=app.profileColumns(Array.from({length:200000},(_,i)=>i-100000))[0];
  assert.deepEqual(plain(p),{name:'value',types:['number'],missing:0,total:200000,unique:200000,min:-100000,max:99999,minLen:null,maxLen:null});
});
test('string length extrema cover 200,000 nonempty strings',()=>{
  const values=Array(200000).fill('abc');values[0]='a';values[199999]='abcdef';
  const p=app.profileColumns(values)[0];
  assert.deepEqual(plain(p),{name:'value',types:['string'],missing:0,total:200000,unique:3,min:null,max:null,minLen:1,maxLen:6});
});
test('missing, mixed, and nonfinite values retain their profiling semantics',()=>{
  const p=app.profileColumns([null,undefined,'',-3,4,Infinity,'xy',false])[0];
  assert.deepEqual(plain(p),{name:'value',types:['number','string','boolean'],missing:3,total:8,unique:5,min:-3,max:4,minLen:2,maxLen:2});
  assert.deepEqual(plain(app.profileColumns([])),[]);
  assert.deepEqual(plain(app.profileColumns([null,'',undefined])[0]),{name:'value',types:[],missing:3,total:3,unique:0,min:null,max:null,minLen:null,maxLen:null});
});
test('CSV retains quoted multiline cells, uneven rows and duplicate header metadata',()=>{
  const p=app.parseCSV('x,x\n"a,b","line1\nline2"\n3\n4,5,6',',');
  assert.deepEqual(plain(p.headers),['x','x_2','column_3']);
  assert.equal(p.data[0].x,'a,b');assert.equal(p.data[0].x_2,'line1\nline2');assert.equal(p.data[2].column_3,6);
  assert.equal(p.duplicateHeaders,true);assert.equal(p.unevenRows,true);
  assert.deepEqual(plain(app.parseCSV('',',').data),[]);
});
test('object-of-arrays table accepts many columns without argument spreading',()=>{
  const data=Object.fromEntries(Array.from({length:150000},(_,i)=>['c'+i,[i]]));data.c0.push(-1);
  const tab=app.toTable(data);assert.equal(tab.headers.length,150000);assert.equal(tab.rows.length,2);
  assert.equal(tab.rows[0][149999],149999);assert.equal(tab.rows[1][0],-1);assert.equal(tab.rows[1][1],undefined);
});
