# JSON / YAML / CSV Viewer

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-json-yaml-csv-viewer/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-json-yaml-csv-viewer/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-json-yaml-csv-viewer/)

[日本語版 README](README.ja.md)

A privacy-focused, single-HTML viewer for inspecting, searching, profiling, checking, and converting JSON, YAML, CSV, TSV, and JSON Lines entirely in your browser.

## 🚀 Live demo

### [Open JSON / YAML / CSV Viewer on GitHub Pages](https://ttomohisa.github.io/htmlapps-json-yaml-csv-viewer/)

GitHub Pages delivers the initial HTML. After it loads, file decoding, parsing, searching, tree/table rendering, profiling, quality checks, schema inference, and conversion are processed locally on your device. Files you select are not uploaded by the app.

## Features

- Open files by drag and drop or file picker
- Automatically detect JSON, YAML, CSV / TSV, and JSON Lines / NDJSON
- Browse JSON and YAML as an expandable tree
- Copy a value or its JSONPath-like path from the tree
- View CSV and array-of-object data in a paged table
- Search keys, values, and paths across the whole parsed document
- View normalized, formatted text
- Profile columns: inferred types, missing values, unique values, numeric min/max, and string-length range
- Flag basic data-quality issues such as mixed types, missing values, duplicate CSV headers, and uneven rows
- Infer a draft JSON Schema from the parsed data
- Convert and download data as JSON, YAML, CSV, or JSON Schema
- Automatically detect CSV separators such as comma, tab, semicolon, and pipe
- Decode UTF-8, Shift_JIS, and UTF-16LE; UTF-8 / Shift_JIS are automatically selected when possible
- Support JSON Lines / NDJSON as a first-class input format
- Japanese and English UI in the same HTML
- Responsive desktop and smartphone layout
- No runtime network request, analytics, telemetry, account, or server upload

## Quick start

### Use the web demo

Just [open the demo](https://ttomohisa.github.io/htmlapps-json-yaml-csv-viewer/). No installation or account is required.

### Use the standalone HTML

1. Download [`dist/index.html`](https://github.com/ttomohisa/htmlapps-json-yaml-csv-viewer/blob/main/dist/index.html).
2. Open it directly in a current Chromium-based browser, Firefox, or Safari.
3. Drop a supported file onto the page.

A local web server is not required. The generated file works from `file://`.

### Build it yourself (advanced)

1. Download or clone this repository.
2. Double-click `build-standalone.bat` on Windows.
3. The build creates and verifies both standalone release variants under `dist/`.
4. Copy `dist/index.html` wherever you need it and open that one file later, even without an internet connection.

Python, Node.js, and a local web server are not required. The builder uses Windows PowerShell and the built-in `tar.exe`.

## Usage

1. Drop a `.json`, `.yaml`, `.yml`, `.csv`, `.tsv`, `.jsonl`, or `.ndjson` file onto the page, or choose a file manually.
2. The app detects the format and, for delimited text, the likely encoding and separator.
3. Switch between **Tree**, **Table**, **Formatted**, and **Analyze** views.
4. Use the search box to find matching keys, values, or paths.
5. Review the Analyze view for column profiles, basic quality findings, and inferred JSON Schema.
6. Use the download action to export the parsed data as JSON, YAML, CSV, or JSON Schema.

### Supported inputs

| Format | Extensions | Notes |
| --- | --- | --- |
| JSON | `.json` | Objects, arrays, and scalar JSON values |
| YAML | `.yaml`, `.yml` | Common YAML subset; see limitations below |
| CSV / TSV | `.csv`, `.tsv` | Separator detection and table view |
| JSON Lines / NDJSON | `.jsonl`, `.ndjson` | One JSON value per non-empty line |

The current maximum input size is **50 MB per file**.

### Text encoding

- UTF-8
- Shift_JIS
- UTF-16LE
- Automatic UTF-8 / Shift_JIS selection for practical Japanese CSV files

If automatic decoding is not correct, the encoding can be changed from the file toolbar after loading.

## Why this is more than a formatter

Many data viewers stop after syntax highlighting or pretty-printing. This app also provides lightweight inspection tools that are useful before importing a file into another system:

- **Cross-format workflow:** inspect JSON, YAML, CSV, TSV, and JSON Lines in the same interface.
- **Data profiling:** quickly see missing values, uniqueness, type distribution, ranges, and string lengths.
- **Quality checks:** surface likely issues such as mixed column types and malformed CSV row widths.
- **Schema inference:** generate a draft JSON Schema as a starting point for documentation or validation rules.
- **Local conversion:** convert parsed data between common formats without sending the source file anywhere.

## Publish with GitHub Pages

The repository includes a workflow that rebuilds the standalone HTML and deploys `dist/` to GitHub Pages.

1. Push the repository to GitHub as `htmlapps-json-yaml-csv-viewer`.
2. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main`, or manually run the Pages workflow from the **Actions** tab.
4. After a successful deployment, the demo is available at `https://ttomohisa.github.io/htmlapps-json-yaml-csv-viewer/`.

If Pages has not been enabled yet, the workflow still completes the build and verification steps, then skips deployment with setup instructions instead of failing at `configure-pages`.

## Development and build layout

```text
.
├─ src/index.template.html           # Editable application source
├─ app.config.json                   # Product metadata and build settings
├─ dependencies.json                 # Pinned assets to embed (currently none)
├─ build-standalone.bat              # Windows build entry point
├─ build-standalone.ps1              # Standalone HTML builder
├─ scripts/
│  ├─ check-repository.ps1           # Full repository/build verification
│  ├─ build-self-extract.ps1         # gzip self-extracting HTML builder
│  ├─ verify-standalone.ps1          # Standalone static checks
│  └─ verify-self-extract.ps1        # Self-extract restoration check
├─ samples/                          # JSON / YAML / CSV / JSONL test files
├─ dist/
│  ├─ index.html                     # Generated readable standalone app
│  └─ index.self-extract.html        # Generated gzip self-extracting variant
└─ .github/workflows/
   ├─ build-standalone.yml           # Pull request build validation
   └─ deploy-pages.yml               # Build and deploy from main
```

Edit `src/index.template.html`; do not edit the generated files in `dist/` by hand.

To run the complete repository check:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-repository.ps1
```

The build process automatically:

- Generates `dist/index.html` from the source template and app configuration
- Embeds any dependencies declared in `dependencies.json`
- Records SHA-256 information in `dist/dependency-manifest.json`
- Rejects unresolved build placeholders and external runtime resource references
- Generates a gzip self-extracting `dist/index.self-extract.html`
- Restores the self-extract payload during verification and checks it byte-for-byte against `dist/index.html`

## Privacy and runtime network protection

The generated HTML is designed for local processing:

- Content Security Policy contains `connect-src 'none'`
- No runtime CDN, remote font, analytics, telemetry, or API is used
- Selected file contents stay in browser memory and are not intentionally persisted by the app
- Downloads are created locally only after a user action

The GitHub Pages version naturally requires the initial HTML request. After the page is loaded, the selected data file is not uploaded by the application. For completely disconnected use, open `dist/index.html` locally.

See [SECURITY.md](SECURITY.md) and [VERIFY_OFFLINE.md](VERIFY_OFFLINE.md) for the project security boundary and offline verification notes.

## Limitations

- YAML custom tags, anchors / aliases, and complex multi-document YAML are not fully supported by the built-in lightweight parser.
- JSON Schema inference is heuristic and should be reviewed before using it as a production contract.
- CSV uses the first parsed record as the header row.
- Very large or deeply nested documents can use substantial browser memory and make full tree rendering slower.
- The app currently accepts one file at a time, up to 50 MB.
- CSV export is available only when the parsed data can be represented as a table.

## Dependencies

Version 1.0 has **no runtime third-party JavaScript, CSS, font, WASM, or other package dependency**. Parsing and UI behavior are implemented with browser-native APIs and project code.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency policy and notices.

## Contributing

Bug reports and feature proposals are welcome through GitHub Issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## License

Copyright © 2026 ttomohisa

Licensed under the [MIT License](LICENSE).
