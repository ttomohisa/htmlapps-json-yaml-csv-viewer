param(
  [switch]$ForceDownload,
  [switch]$SkipSelfExtract,
  [string]$OutputPath = ""
)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$TemplatePath = Join-Path $Root "src\index.template.html"
$AppConfigPath = Join-Path $Root "app.config.json"
$DependenciesPath = Join-Path $Root "dependencies.json"
$DistRoot = Join-Path $Root "dist"
$CacheRoot = Join-Path $Root ".cache"
New-Item -ItemType Directory -Force -Path $DistRoot,$CacheRoot | Out-Null
function Json([object]$v,[int]$depth=40){ return ($v|ConvertTo-Json -Compress -Depth $depth).Replace("<","\u003c").Replace(">","\u003e").Replace("&","\u0026") }
function HashBytes([byte[]]$b){ $h=[Security.Cryptography.SHA256]::Create(); try { return (($h.ComputeHash($b)|%{$_.ToString('x2')}) -join '') } finally {$h.Dispose()} }
function Mime([string]$p){ switch([IO.Path]::GetExtension($p).ToLowerInvariant()){'.js'{'text/javascript'} '.mjs'{'text/javascript'} '.css'{'text/css'} '.json'{'application/json'} '.wasm'{'application/wasm'} '.svg'{'image/svg+xml'} '.png'{'image/png'} '.woff2'{'font/woff2'} default{'application/octet-stream'}} }
$app=Get-Content -Raw -Encoding UTF8 $AppConfigPath|ConvertFrom-Json
$depConfig=Get-Content -Raw -Encoding UTF8 $DependenciesPath|ConvertFrom-Json
$deps=@(); if($depConfig.dependencies){$deps=@($depConfig.dependencies)}
$bundle=[ordered]@{schemaVersion=1;dependencies=[ordered]@{}}
$manifestDeps=@()
foreach($d in $deps){
  if([string]::IsNullOrWhiteSpace([string]$d.id)){throw 'Dependency id is required.'}
  $pkg=[string]$d.package; $ver=[string]$d.version; $id=[string]$d.id
  $key=(($pkg -replace '[^A-Za-z0-9._-]','-')+'-'+$ver); $root=Join-Path $CacheRoot $key; $tgz=Join-Path $root 'package.tgz'; $extract=Join-Path $root 'extracted'; $packageRoot=Join-Path $extract 'package'
  if($ForceDownload -and (Test-Path $root)){Remove-Item -Recurse -Force $root}; New-Item -ItemType Directory -Force -Path $root|Out-Null
  if(-not(Test-Path $tgz)){
    $meta=Invoke-RestMethod -UseBasicParsing -Uri ("https://registry.npmjs.org/{0}/{1}" -f [Uri]::EscapeDataString($pkg),$ver) -Headers @{'User-Agent'='htmlapps-template/1.0'}
    Invoke-WebRequest -UseBasicParsing -Uri ([string]$meta.dist.tarball) -OutFile $tgz -Headers @{'User-Agent'='htmlapps-template/1.0'}
  }
  if(-not(Test-Path $packageRoot)){ if(-not(Get-Command tar.exe -ErrorAction SilentlyContinue)){throw 'tar.exe is required when dependencies are configured.'}; Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $extract; New-Item -ItemType Directory -Force -Path $extract|Out-Null; & tar.exe -xzf $tgz -C $extract; if($LASTEXITCODE -ne 0){throw 'tar.exe failed.'} }
  $actual=(Get-Content -Raw -Encoding UTF8 (Join-Path $packageRoot 'package.json')|ConvertFrom-Json).version; if([string]$actual -ne $ver){throw "Package version mismatch: $pkg expected $ver actual $actual"}
  $assets=[ordered]@{}; $manifestAssets=@()
  foreach($a in @($d.assets)){
    $path=[IO.Path]::GetFullPath((Join-Path $packageRoot ([string]$a.path))); $packageFull=[IO.Path]::GetFullPath($packageRoot).TrimEnd([char[]]@([char]92,[char]47)); if(-not $path.StartsWith($packageFull+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Dependency path escapes package root.'}
    $bytes=[IO.File]::ReadAllBytes($path); $mime=if($a.PSObject.Properties.Name -contains 'mime'){[string]$a.mime}else{Mime $path}; $assets[[string]$a.key]=[ordered]@{mime=$mime;base64=[Convert]::ToBase64String($bytes)}; $manifestAssets+=[ordered]@{key=[string]$a.key;path=[string]$a.path;mime=$mime;bytes=$bytes.Length;sha256=(HashBytes $bytes)}
  }
  $bundle.dependencies[$id]=[ordered]@{package=$pkg;version=$ver;assets=$assets}; $manifestDeps+=[ordered]@{id=$id;package=$pkg;version=$ver;license=[string]$d.license;homepage=[string]$d.homepage;tarballSha256=(Get-FileHash -Algorithm SHA256 $tgz).Hash.ToLowerInvariant();assets=$manifestAssets}
}
$manifest=[ordered]@{schemaVersion=1;builder='htmlapps-template/1.0';generatedAtUtc=[DateTime]::UtcNow.ToString('o');app=[ordered]@{name=[string]$app.name;slug=[string]$app.slug;version=[string]$app.version};dependencies=$manifestDeps}
$template=[IO.File]::ReadAllText($TemplatePath,[Text.Encoding]::UTF8)
$bundleJson=Json $bundle 50
$faviconSource=Join-Path $Root 'assets\favicon.svg'; if(-not(Test-Path $faviconSource)){throw 'assets/favicon.svg is required.'}; $faviconSvg=([IO.File]::ReadAllText($faviconSource,[Text.Encoding]::UTF8) -replace "`r?`n",' ').Trim(); $faviconDataUrl='data:image/svg+xml,'+$faviconSvg
$replace=[ordered]@{'__APP_CONFIG_JSON__'=(Json $app 20);'__BUILD_MANIFEST_JSON__'=(Json $manifest 40);'__EMBEDDED_ASSET_BUNDLE_BASE64__'=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($bundleJson));'__FAVICON_DATA_URL__'=$faviconDataUrl}
foreach($k in $replace.Keys){$count=([regex]::Matches($template,[regex]::Escape($k))).Count;if($count -ne 1){throw "Template placeholder $k must occur exactly once; found $count."};$template=$template.Replace($k,[string]$replace[$k])}
if([string]::IsNullOrWhiteSpace($OutputPath)){$OutputPath=Join-Path $Root ([string]$app.build.output)}elseif(-not [IO.Path]::IsPathRooted($OutputPath)){$OutputPath=Join-Path $Root $OutputPath}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath)|Out-Null
[IO.File]::WriteAllText($OutputPath,$template,(New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path (Split-Path -Parent $OutputPath) 'dependency-manifest.json'),($manifest|ConvertTo-Json -Depth 40),(New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path (Split-Path -Parent $OutputPath) '.nojekyll'),'',(New-Object Text.UTF8Encoding($false)))
& (Join-Path $Root 'scripts\verify-standalone.ps1') -Path $OutputPath -RequireNetworkBlock ([bool]$app.build.blockRuntimeNetwork)
if(-not $SkipSelfExtract -and $app.build.selfExtract -and [bool]$app.build.selfExtract.enabled){$self=Join-Path $Root ([string]$app.build.selfExtract.output); & (Join-Path $Root 'scripts\build-self-extract.ps1') -InputPath $OutputPath -OutputPath $self -AppName ([string]$app.name) -AppNameJa ([string]$app.nameJa)}
Write-Host "[OK] Standalone HTML: $OutputPath" -ForegroundColor Green
