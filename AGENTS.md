# AGENTS.md — Single HTML App Contract

Read `APP_SPEC.md`, `docs/ARCHITECTURE.md`, and the current implementation before editing.

## Non-negotiable constraints

- Edit `src/index.template.html`, never generated files under `dist/`.
- Generate readable `dist/index.html` and gzip self-extracting `dist/index.self-extract.html`.
- Both releases must work without a server; `file://` is a supported launch mode.
- No runtime CDN, API, analytics, telemetry, remote font, or hidden network dependency.
- Keep `connect-src 'none'` in CSP.
- User-selected data stays in the browser unless the user explicitly exports it.
- Desktop and smartphone layouts are first-class.
- Keep Japanese and English in the same HTML.
- Prefer native browser APIs; pin and embed any third-party dependency through `dependencies.json`.
- Keep `APP:BEGIN` / `APP:END` and `APP:HELP:BEGIN` / `APP:HELP:END` markers.

## Before completion

Run on Windows:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-repository.ps1
```

Verify invalid/empty input, representative JSON/YAML/CSV/JSONL, export, Japanese/English, mobile width, keyboard use, console errors, direct local opening, and no runtime network requests.
