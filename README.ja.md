# JSON / YAML / CSV Viewer

JSON / YAML / CSV / TSV / JSON Lines を、アップロードせずに閲覧・検索・解析・変換できるローカルファーストの単一HTMLアプリです。

## 主な機能

- ドラッグ&ドロップ / ファイル選択
- JSON / YAML のツリー表示、パス・値コピー
- CSV・配列オブジェクトの表表示と100行単位ページング
- キー・値・パスの横断検索
- 整形表示
- 列プロファイル（型、欠損、ユニーク、Min/Max、文字列長）
- 型混在・欠損・重複ヘッダー・不揃い行の簡易品質チェック
- JSON Schema 推定
- JSON / YAML / CSV / JSON Schema への変換・保存
- CSV / TSV 区切り文字自動判定
- UTF-8 / Shift_JIS / UTF-16LE。UTF-8 と Shift_JIS は自動判定
- JSON Lines / NDJSON
- 日本語 / English
- PC / スマートフォン対応
- 実行時の外部通信なし

## 使い方

ビルド済みの `dist/index.html` をブラウザーで直接開き、ファイルをドロップしてください。Webサーバーは不要です。

開発時は `src/index.template.html` を編集し、`dist/` は直接編集しません。Windowsで次を実行すると、通常版と自己展開版を生成・検証します。

```powershell
.\build-standalone.bat
```

または:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-repository.ps1
```

## 生成物

- `dist/index.html` — 読みやすい完全内包版
- `dist/index.self-extract.html` — gzipペイロードをブラウザー内で展開する圧縮版
- `dist/dependency-manifest.json` — 埋め込み依存の監査情報
- `dist/self-extract-manifest.json` — 自己展開版のハッシュ情報

## YAMLについて

依存ライブラリなしで動く軽量YAMLパーサーを内蔵しています。一般的なマッピング、配列、スカラー、引用文字列、フローコレクション、ブロックスカラーに対応します。高度なタグ、アンカー/エイリアス、複雑な複数ドキュメントは完全対応ではありません。

## GitHub Pages

`main` へのpushでビルドと検証を行い、Pagesが有効なら `dist/` を公開します。最初の一度だけ **Settings → Pages → Source: GitHub Actions** を設定してください。Pages未有効の場合はビルド成功のままデプロイをスキップします。

## プライバシー

入力ファイルはブラウザー内だけで処理されます。Analytics / Telemetry はなく、CSPで `connect-src 'none'` を指定しています。

## License

MIT
