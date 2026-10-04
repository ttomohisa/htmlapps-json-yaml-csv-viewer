const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_BROWSER_CHANNEL||'msedge'});try{
for(const variant of ['index.html','index.self-extract.html']){
 const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort()});
 await page.goto(pathToFileURL(path.join(__dirname,'../dist',variant)).href);
 for(const [name,text] of [['small.json','[{"value":1},{"value":2}]'],['small.yaml','- value: 1\n- value: 2'],['small.jsonl','{"value":1}\n{"value":2}'],['small.csv','value\n1\n2']]){
  await page.locator('#fileInput').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(text)});
  await page.waitForFunction(n=>document.querySelector('#fileName').textContent===n,name);
  assert.equal(await page.locator('#metricRows').textContent(),'2');
  await page.locator('[data-view="analysis"]').click();
  assert.equal(await page.locator('.profile-table tbody td').nth(4).textContent(),'1 – 2');
 }
 // Keep the existing analysis view for the large file; full-tree DOM expansion is a documented separate cost.
 const large='value\n'+Array.from({length:200000},(_,i)=>String(i-100000)).join('\n');
 await page.locator('#fileInput').setInputFiles({name:'large.csv',mimeType:'text/csv',buffer:Buffer.from(large)});
 await page.waitForFunction(()=>document.querySelector('#fileName').textContent==='large.csv');
 assert.equal((await page.locator('#metricRows').textContent()).replace(/,/g,''),'200000');
 assert.equal(await page.locator('.profile-table tbody td').nth(4).textContent(),'-100000 – 99999');
 await page.locator('[data-view="table"]').click();assert.equal(await page.locator('.data-table tbody tr').count(),100);
 await page.locator('#downloadBtn').click();const downloadPromise=page.waitForEvent('download');await page.locator('#saveJsonBtn').click();const download=await downloadPromise;
 const records=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(records.length,200000);assert.deepEqual(records[0],{value:-100000});assert.deepEqual(records.at(-1),{value:99999});
 await page.keyboard.press('Escape');await page.locator('#langBtn').click();await page.setViewportSize({width:390,height:844});
 await page.locator('#helpBtn').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#helpDialog').isVisible(),true);await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.setViewportSize({width:1280,height:900});await page.locator('#resetBtn').click();
 for(const [name,text] of [['invalid.json','{'],['empty.csv','']]){await page.locator('#fileInput').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForTimeout(100);assert.equal(await page.locator('#workspace').evaluate(e=>e.classList.contains('active')),false);assert.ok(await page.locator('#toast').textContent());}
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log(`PASS ${variant}: formats, 200k-row analysis/table/export, invalid/empty, EN/mobile/keyboard, no page errors/network`);await context.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
