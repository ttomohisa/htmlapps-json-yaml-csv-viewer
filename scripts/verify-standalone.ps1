param([Parameter(Mandatory=$true)][string]$Path,[bool]$RequireNetworkBlock=$true)
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
if(-not(Test-Path $Path)){throw "HTML file not found: $Path"};$html=Get-Content -Raw -Encoding UTF8 $Path
$checks=@(
@{m='HTML document marker is missing';f=-not $html.TrimStart().StartsWith('<!doctype html>',[StringComparison]::OrdinalIgnoreCase)},
@{m='Viewport metadata is missing';f=$html -notmatch '<meta\s+name=["'']viewport["'']'},
@{m='A build placeholder remains';f=$html -match '__[A-Z0-9_]{3,}__'},
@{m='An external script URL remains';f=$html -match '<script[^>]+src\s*=\s*["'']https?://'},
@{m='An external stylesheet URL remains';f=$html -match '<link[^>]+href\s*=\s*["'']https?://'},
@{m='An external frame URL remains';f=$html -match '<(?:iframe|frame)[^>]+src\s*=\s*["'']https?://'},
@{m='An external CSS url() remains';f=$html -match 'url\(\s*["'']?https?://'},
@{m='An external module import remains';f=$html -match '(?:import\s+.+?from\s*|import\s*\()\s*["'']https?://'} )
if($RequireNetworkBlock -and $html -notmatch "connect-src\s+'none'"){throw "connect-src 'none' is missing from Content Security Policy"};foreach($c in $checks){if($c.f){throw $c.m}};Write-Host "[OK] Standalone verification passed: $Path" -ForegroundColor Green
