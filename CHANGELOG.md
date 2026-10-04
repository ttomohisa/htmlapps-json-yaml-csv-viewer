# Changelog

## 1.0 - 2026-08-15

- Fixed the self-extract PowerShell builder so the SHA-256 helper no longer collides with the built-in `h` / `Get-History` alias.
- Initial release.
- Added JSON, YAML, CSV, TSV, and JSON Lines / NDJSON input.
- Added tree, table, formatted, and analysis views.
- Added search, path/value copy, format conversion, data-quality checks, and JSON Schema inference.
- Added UTF-8 / Shift_JIS / UTF-16LE decoding and CSV delimiter detection.
- Added Japanese / English UI and responsive mobile layout.
- Adopted the official `htmlapps-template` source/build/dist repository structure.
- Added readable and gzip self-extracting standalone outputs, validation scripts, and GitHub Pages workflows.

## Audit follow-up — 2026-10-04
- Avoid JavaScript argument-list limits in CSV row width, object-of-arrays length, and numeric/string-length extrema.
- Preserve missing values, mixed types, duplicate-header and uneven-row behavior.
- Add dependency-free regressions (including 200,000 rows and 150,000 columns) and local browser analysis/export checks for both releases.

- Fix the self-extract loader doctype regular expression so the restored HTML can actually open; retain UTF-8 BOM in its PowerShell source for Japanese text on Windows PowerShell 5.1. Browser regression caught this existing build defect after static byte restoration had passed.
