#!/usr/bin/env node
/**
 * Static itch.io HTML5 export. Does not touch the live-preview (8080) config.
 */
import {
  copyFileSync,
  cpSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist-itch");

execSync("npx vite build --config vite.itch.config.ts", {
  cwd: root,
  stdio: "inherit",
});

const indexPath = path.join(dist, "index.html");
let html = readFileSync(indexPath, "utf8");
html = html.replace(/\s*crossorigin(="[^"]*")?/gi, "");
html = html.replace(
  /https?:\/\/(localhost|127\.0\.0\.1|fonts\.googleapis\.com|fonts\.gstatic\.com)[^"'\s]*/gi,
  "",
);
writeFileSync(indexPath, html);

cpSync(path.join(root, "public", "sprites"), path.join(dist, "sprites"), { recursive: true });
copyFileSync(path.join(root, "public", "favicon.svg"), path.join(dist, "favicon.svg"));

const readme = `# のっぺらCATCH — itch.io 公開手順

のっぺらぼうの顔面で、落ちてくる眉・目・鼻・口をキャッチするブラウザゲームです。
この ZIP は **Kind: HTML** 用の静的書き出しです。サーバーやログインは不要です。

## アップロード

1. [itch.io](https://itch.io) で新しいページを作る
2. **Kind of project** を **HTML** にする
3. \`dist-itch.zip\` をアップロードする（ZIP の直下に \`index.html\` があること）
4. **This file will be played in the browser** にチェック

ZIP を解凍したとき、親フォルダを一段かぶせず \`index.html\` が見える状態にしてください。

## Embed in page

**Embed game in page** を推奨します。

| 用途 | 幅 × 高さ |
| --- | --- |
| 設計解像度（ゲーム内部） | **420 × 780** |
| 推奨 viewport（embed） | **480 × 860** |
| 大きめ | **540 × 980** |

縦長のゲームです。1280×720 などの横長だと上下に余白が出ます。
ゲーム画面は iframe いっぱいに広がり、内部の 420×780 を contain でレターボックスします。

その他の推奨:

- キーボードを使うので、ページをクリックするとゲームにフォーカスが入ります
- フルスクリーン可
- SharedArrayBuffer / 特殊フラグは不要

## 操作

- **移動**: ドラッグ / ← → / A D / ゲームパッド左スティック
- **キャッチ**: 画面下の「キャッチ」/ タップ / スペース / ゲームパッド A
- **ミュート**: 左上のスピーカー
- ハイスコアは端末の localStorage に保存（ブラウザごと）

## モバイル

縦向き推奨。左右ドラッグで移動、下の大きなボタンでキャッチ。
iOS / Android のモバイルブラウザ、itch アプリ内 WebView でも動作します。

## 既知の制限

- オンライン機能・ランキング・ログインはありません
- ハイスコアは端末・ブラウザをまたぎません
- 外部フォント CDN には接続しません（woff2 同梱）
- 音声は Web Audio の合成音です。初回タップ後に鳴ります
- ゲーム内容はこの書き出し時点のライブ版と同一です
`;

writeFileSync(path.join(dist, "itch-readme.md"), readme);
writeFileSync(path.join(root, "itch-readme.md"), readme);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(dist);
const maxFile = 200 * 1024 * 1024;
const maxTotal = 500 * 1024 * 1024;
let total = 0;
for (const f of files) {
  const n = statSync(f).size;
  total += n;
  if (n > maxFile) {
    throw new Error(`file too large for itch: ${f} (${n} bytes)`);
  }
}
if (files.length > 1000) throw new Error(`too many files: ${files.length}`);
if (total > maxTotal) throw new Error(`zip payload too large: ${total}`);

const zipPath = path.join(root, "dist-itch.zip");
execSync(
  `python3 - <<'PY'
import zipfile
from pathlib import Path
root = Path(${JSON.stringify(dist)})
out = Path(${JSON.stringify(zipPath)})
if out.exists():
    out.unlink()
with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for p in sorted(root.rglob("*")):
        if p.is_file():
            zf.write(p, p.relative_to(root).as_posix())
print("zipped", len(zf.namelist()) if False else "ok")
PY`,
  { stdio: "inherit" },
);

const absHits = [];
for (const f of files) {
  if (!/\.(html|js|css|map)$/.test(f)) continue;
  const text = readFileSync(f, "utf8");
  if (/crossorigin/i.test(text) && f.endsWith(".html")) absHits.push(`crossorigin in ${f}`);
  if (/https?:\/\/(localhost|127\.0\.0\.1|grok\.com)/i.test(text)) {
    absHits.push(`absolute host in ${f}`);
  }
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(text)) {
    absHits.push(`google fonts CDN in ${f}`);
  }
}
if (absHits.length) {
  console.warn("post-check warnings:\n", absHits.join("\n"));
}

console.log(
  JSON.stringify(
    {
      files: files.length,
      bytes: total,
      zip: zipPath,
      index: indexPath,
    },
    null,
    2,
  ),
);
