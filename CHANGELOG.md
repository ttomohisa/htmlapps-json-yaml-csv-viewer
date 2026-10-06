# Changelog

## v1.0.3 - 2026-10-06

- Refresh existing data-quality results immediately when switching between Japanese and English, without reparsing the file or changing its data.
- Localize view-switcher and dialog-close accessible names on initial load and every language change.
- Add repeated-toggle regressions for all quality findings and canonical release variants, preserving table pages, search state, and unsafe-integer strings.

## v1.0.2 - 2026-10-06

- Preserve CSV/TSV unsafe integers and numeric overflow as their original string lexemes instead of silently rounding large identifiers.
- Keep numeric-looking strings quoted in YAML exports so protected values survive CSV, JSON, and YAML round trips.
- Preserve safe-number and ordinary scalar inference, document the remaining decimal/input precision limits, and add regressions for all canonical release variants.

## v1.0.1 - 2026-10-06

- Standardize local-processing badge and EN / JA header controls with localized target-language names and Help titles.
- Synchronize canonical metadata and standalone header versions at v1.0.1 after normalizing the legacy 1.0 version to 1.0.0.
- Add header regressions for source, readable, root download, and decompressed self-extract variants; preserve data behavior and responsive visibility.

## Subtree copy and scalar roots — 2026-10-06

- Add localized Copy JSON actions for object and array subtrees, including root and empty containers, with keyboard and touch access.
- Keep exact parsed references in a per-render Map and serialize only when copying; refuse non-finite numbers and negative zero instead of silently changing them.
- Refresh all views for valid `0`, `false`, and empty-string roots instead of leaving the previous file visible.
- Invalidate stale clipboard actions across file/parse changes, reset, view/language re-renders and later copy attempts; report fallback failures accurately.
- Add dependency-free regressions for every release variant and preserve existing search and large-data checks.

## Search results — 2026-10-05

- Show each matching path once when its key/path and scalar value both match, preserving the first-match order and navigation value.
- Apply the existing 200-result cap to unique paths before rendering the first 50 result buttons.
- Add dependency-free search regressions for the source, root download, readable release, and restored self-extract payload.
- Refresh the root HTML download from the generated release, including the already-merged large-data profiling fixes.

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
