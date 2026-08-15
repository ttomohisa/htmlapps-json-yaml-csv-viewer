# Offline verification

1. Run `scripts/check-repository.ps1` on Windows.
2. Disconnect the network or enable DevTools Network offline mode.
3. Open `dist/index.html` directly with `file://`.
4. Load JSON, YAML, CSV, and JSONL samples.
5. Search, switch views, and export a converted file.
6. Repeat with `dist/index.self-extract.html`.
7. Confirm no runtime request is attempted and the console has no errors.

The static verifier also rejects common external scripts/styles/frames/imports and requires `connect-src 'none'`.
