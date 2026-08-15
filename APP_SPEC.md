# APP_SPEC.md

## 1. Product identity

- **Name:** JSON / YAML / CSV Viewer
- **Version:** 1.0
- **Purpose:** Inspect, search, profile, validate, and convert common structured-data files without uploading them.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`

## 2. Supported input

- JSON (`.json`)
- JSON Lines / NDJSON (`.jsonl`, `.ndjson`)
- YAML (`.yaml`, `.yml`) — common YAML subset
- CSV / TSV (`.csv`, `.tsv`)
- Maximum file size: 50 MB
- Decoding: UTF-8, Shift_JIS, UTF-16LE; automatic UTF-8/Shift_JIS choice

## 3. Core flow

1. Drop or select a local file.
2. Detect format, encoding, and CSV delimiter where applicable.
3. Parse entirely in the browser.
4. Browse Tree / Table / Formatted / Analyze views.
5. Search keys, values, and paths.
6. Review inferred types and basic data-quality findings.
7. Export parsed data as JSON, YAML, CSV, or inferred JSON Schema.

## 4. Differentiating capabilities

- Cross-format viewer rather than one viewer per format.
- Column profiling: inferred types, missing values, unique counts, numeric min/max, string length.
- Basic quality checks: mixed types, missing values, duplicate CSV headers, uneven rows.
- JSON Schema inference.
- JSON/YAML/CSV conversion after parsing.
- Shift_JIS and delimiter detection for practical Japanese CSV files.
- JSON Lines / NDJSON support.

## 5. Privacy and security

- No runtime network access; CSP contains `connect-src 'none'`.
- No server storage, login, analytics, telemetry, or tracking.
- Input is held in memory only and is discarded when the file/page is closed.
- Downloads occur only after an explicit user action.

## 6. UX and accessibility

- Light-only UI following `htmlapps-template`.
- Mobile-first behavior from 320 px upward.
- Visible keyboard focus, accessible labels, native dialogs, and `aria-live` status.
- Respect `prefers-reduced-motion`.
- Japanese and English in the same HTML.

## 7. Known limitations

- YAML custom tags, anchors/aliases, and complex multi-document YAML are not fully supported.
- Very large or deeply nested data can be expensive to render as a complete tree.
- CSV treats the first parsed record as the header.
- JSON Schema inference is heuristic and is not a substitute for a hand-authored contract.

## 8. Acceptance criteria

- `scripts/check-repository.ps1` builds and verifies both standalone outputs on Windows.
- No unresolved build placeholder remains in `dist/index.html`.
- No external runtime script, stylesheet, frame, module import, font, or API request is required.
- The main flow works from direct `file://` opening.
- Representative JSON/YAML/CSV/JSONL samples parse without console errors.
- Japanese and English controls fit at narrow mobile width.
