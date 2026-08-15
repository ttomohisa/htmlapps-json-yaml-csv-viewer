param([Parameter(Mandatory=$true)][string]$InputPath,[Parameter(Mandatory=$true)][string]$OutputPath,[string]$AppName='Standalone app',[string]$AppNameJa='単一HTMLアプリ')
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$inputBytes=[IO.File]::ReadAllBytes($InputPath);$ms=New-Object IO.MemoryStream;try{$gz=[IO.Compression.GZipStream]::new($ms,[IO.Compression.CompressionMode]::Compress,$true);try{$gz.Write($inputBytes,0,$inputBytes.Length)}finally{$gz.Dispose()};$compressed=$ms.ToArray()}finally{$ms.Dispose()}
function Get-Sha256Hex([byte[]]$Bytes) {
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    return (($algorithm.ComputeHash($Bytes) | ForEach-Object { $_.ToString("x2") }) -join "")
  } finally {
    $algorithm.Dispose()
  }
}
$payload=[Convert]::ToBase64String($compressed)
$sourceHash=Get-Sha256Hex $inputBytes
$gzipHash=Get-Sha256Hex $compressed
$title=[Net.WebUtility]::HtmlEncode("$AppNameJa / $AppName")
$wrapper=@"
<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; media-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"><meta name="robots" content="noindex,nofollow"><title>$title</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui;background:#f5f5f2;color:#20211f}main{text-align:center;padding:24px}.spin{width:32px;height:32px;margin:0 auto 14px;border:3px solid #d8dfdc;border-top-color:#16624f;border-radius:50%;animation:s .8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}pre{white-space:pre-wrap;color:#b3261e}</style></head><body><main><div class="spin"></div><strong>アプリを展開しています / Unpacking the app</strong><pre id="error"></pre></main><script id="self-extract-payload" type="application/octet-stream">$payload</script><script>(()=>{'use strict';const fail=e=>{document.querySelector('.spin').style.display='none';document.getElementById('error').textContent='展開に失敗しました / Failed to unpack\n'+(e&&e.message?e.message:e);};(async()=>{if(!('DecompressionStream'in window))throw new Error('DecompressionStream is not supported.');const p=document.getElementById('self-extract-payload').textContent.trim();const bin=atob(p);const b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);const html=await new Response(new Blob([b],{type:'application/gzip'}).stream().pipeThrough(new DecompressionStream('gzip'))).text();if(!/^\\s*<!doctype html>/i.test(html))throw new Error('Invalid restored HTML.');document.open('text/html','replace');document.write(html);document.close();})().catch(fail);})();</script></body></html>
"@
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath)|Out-Null;[IO.File]::WriteAllText($OutputPath,$wrapper,(New-Object Text.UTF8Encoding($false)))
$manifest=[ordered]@{schemaVersion=1;generatedAtUtc=[DateTime]::UtcNow.ToString('o');source=[ordered]@{path=[IO.Path]::GetFileName($InputPath);bytes=$inputBytes.Length;sha256=$sourceHash};compressedPayload=[ordered]@{format='gzip';bytes=$compressed.Length;sha256=$gzipHash;encoding='base64'};output=[ordered]@{path=[IO.Path]::GetFileName($OutputPath);bytes=(Get-Item $OutputPath).Length;sha256=(Get-FileHash -Algorithm SHA256 $OutputPath).Hash.ToLowerInvariant()};runtime=[ordered]@{decompressor='DecompressionStream';networkRequired=$false}}
[IO.File]::WriteAllText((Join-Path (Split-Path -Parent $OutputPath) 'self-extract-manifest.json'),($manifest|ConvertTo-Json -Depth 10),(New-Object Text.UTF8Encoding($false))); & (Join-Path $PSScriptRoot 'verify-self-extract.ps1') -Path $OutputPath -ExpectedSourcePath $InputPath
