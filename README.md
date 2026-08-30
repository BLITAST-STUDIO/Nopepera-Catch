# のっぺらCATCH

のっぺらぼうの顔面で、落ちてくる眉・目・鼻・口をキャッチするブラウザゲーム。

安定版（itch.io HTML5 書き出し済み）。ここから新機能を足していく。

## 遊び方

- 左右にのっぺらを動かす
- パーツが顔の高さに来たらキャッチ
- 3ラウンド。最後のパーツが乗ると完成顔を一瞬表示
- キャッチ位置のまま顔に貼り付く。正確でもだいたい変な顔になる

### 操作

| | PC | スマホ |
| --- | --- | --- |
| 移動 | ←→ / A D | ドラッグ |
| キャッチ | スペース / 画面下ボタン | タップ / 画面下ボタン |

## 開発

```bash
npm install
npm run dev
```

## itch.io 書き出し

```bash
npm run build:itch
```

`dist-itch.zip` ができる。ZIP 直下に `index.html` がある。手順は `itch-readme.md`。

- 設計解像度: 420 × 780
- 推奨 embed: 480 × 860

## 技術

- Canvas 2D + React（TanStack Start / Vite）
- 音声は Web Audio の合成音
- ハイスコアは localStorage
