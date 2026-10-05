# Contributing

1. Read `AGENTS.md` and `APP_SPEC.md`.
2. Change source/configuration, not generated `dist/` files.
3. Keep runtime network access disabled.
4. Run `scripts/check-repository.ps1` on Windows.
5. Update docs/changelog when behavior changes.

Run the dependency-free regressions with Node.js after building and refreshing the
root download from `dist/index.html`:

```sh
node --test scripts/test-large-data.cjs scripts/test-search.cjs
```

The search suite covers the source and all distributed payloads with a small DOM
facade. It does not replace the browser checks listed in `AGENTS.md`.
