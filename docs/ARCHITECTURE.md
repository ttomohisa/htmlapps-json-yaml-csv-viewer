# Architecture

## Repository layout

```text
app.config.json              Product/build metadata
dependencies.json            Exact embedded npm assets (currently empty)
src/index.template.html      Editable app source
build-standalone.ps1         Builds release artifacts
scripts/verify-standalone.ps1
scripts/build-self-extract.ps1
scripts/verify-self-extract.ps1
dist/index.html              Generated readable standalone app
dist/index.self-extract.html Generated gzip self-extracting app
```

The builder replaces `__APP_CONFIG_JSON__`, `__BUILD_MANIFEST_JSON__`, and `__EMBEDDED_ASSET_BUNDLE_BASE64__` exactly once. Generated files under `dist/` must not be edited manually.

## Runtime boundary

All parsing, search, profiling, inference, and conversion happen in the page. CSP blocks network connections. The generated page exposes `window.StandaloneAssets` for future embedded packages.
