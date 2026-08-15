# Security

## Trust boundary

Selected files are parsed locally in the browser. The application has no server component and its CSP blocks runtime network connections with `connect-src 'none'`.

## File handling

Treat imported files as untrusted data. Values are rendered as text/escaped HTML; the app does not intentionally execute file contents. Parsed data is held in memory and is cleared when the page/file is closed.

## Reports

Please report security issues privately to the repository owner rather than posting sensitive exploit details publicly.
