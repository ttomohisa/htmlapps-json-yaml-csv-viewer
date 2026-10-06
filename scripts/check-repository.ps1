param([switch]$ForceDownload)
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest;$Root=Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$required=@('AGENTS.md','APP_SPEC.md','app.config.json','dependencies.json','src\index.template.html','build-standalone.ps1','scripts\build-self-extract.ps1','scripts\verify-standalone.ps1','scripts\verify-self-extract.ps1','README.md','README.ja.md','LICENSE','THIRD_PARTY_NOTICES.md','schemas\app-config.schema.json','schemas\dependencies.schema.json');foreach($r in $required){if(-not(Test-Path(Join-Path $Root $r))){throw "Required repository file is missing: $r"}};$args=@{};if($ForceDownload){$args.ForceDownload=$true};& (Join-Path $Root 'build-standalone.ps1') @args;Write-Host '[OK] Repository check passed.' -ForegroundColor Green

# Header translation and version checks across canonical release variants.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22 or newer is required for header checks." }
& node (Join-Path $Root "scripts/test-header-consistency.cjs") (Join-Path $Root "src/index.template.html") (Join-Path $Root "dist/index.html") (Join-Path $Root "json-yaml-csv-viewer.html") (Join-Path $Root "dist/index.self-extract.html")
if ($LASTEXITCODE -ne 0) { throw "Header consistency regression checks failed." }
Write-Host "[OK] Header consistency checks passed." -ForegroundColor Green
