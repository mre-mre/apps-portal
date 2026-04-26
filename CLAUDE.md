# apps-portal — 追加・変更ルール

## 概要

このポータルは MRE のアプリ一覧ページ。新しいアプリを追加する際は本ファイルの手順に従うこと。

---

## 新規アプリ追加の手順

### Step 1: アイコンを生成する

`docs/generate-icon-template.js` をコピーして `docs/generate-icon-<app-id>.js` を作成し、以下を変更する：

- `APP_ID`: アプリ識別子（kebab-case）
- `DRAW_MOTIF`: アプリを象徴する図形・モチーフを描画する関数
- `COLOR_A` / `COLOR_B`: 後述のカラーパレットから2色を選ぶ

生成コマンド：
```bash
node docs/generate-icon-<app-id>.js
# → app-icons/<app-id>.png が生成される
```

### Step 2: index.html にカードを追加する

`.grid` ブロック内に以下のテンプレートをコピーして追記する：

```html
<!-- <app-id> -->
<div class="card">
  <a class="card-link" href="<デプロイ先URL>" target="_blank">
    <div class="icon"><img src="app-icons/<app-id>.png" width="44" height="44"></div>
    <span class="card-name"><表示名></span>
  </a>
  <button class="detail-btn" onclick="toggleDetail(this)" aria-label="詳細">⋮</button>
  <div class="detail">
    <div class="stack"><技術スタック（ · 区切り）></div>
    <p class="card-desc"><1〜2行の説明（日本語）></p>
  </div>
</div>
```

**記述ルール：**
| 項目 | ルール |
|------|--------|
| `href` | デプロイ先 URL（Vercel / GitHub Pages 等）、`target="_blank"` 必須 |
| `card-name` | アプリの正式表示名（英字 or 英字+カタカナ） |
| `stack` | `"React · Supabase · PWA"` のように ` · ` で区切る |
| `card-desc` | ユーザー目線の説明、2行以内、体言止め推奨 |

### Step 3: アイコン生成スクリプトを保存する

生成スクリプトは `docs/generate-icon-<app-id>.js` としてコミットする（再生成・変更時に使うため）。

### Step 4: アプリ本体側にもファビコンを設定する（必須）

ポータルだけでなく、**追加するアプリ本体の HTML にも必ずファビコンを設定する**こと。生成済みの `app-icons/<app-id>.png` をアプリ側にコピーして使用する。

#### 配置・参照ルール

| アプリ種別 | アイコン配置先 | HTML 記述 |
|-----------|--------------|----------|
| 静的 HTML / Vanilla JS | `<app>/icons/icon.png` | `<link rel="icon" type="image/png" href="icons/icon.png">` |
| PWA（manifest 同梱） | `<app>/icons/icon-192.png` `icon-512.png` | `<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">` + `<link rel="apple-touch-icon" href="icons/icon-192.png">` |
| Flask | `<app>/src/static/icons/icon.png` | `<link rel="icon" type="image/png" href="{{ url_for('static', filename='icons/icon.png') }}">` |
| Next.js (App Router) | `src/app/favicon.ico`（自動配信） + `public/icons/apple-touch-icon.png` | `layout.tsx` の `<head>` 内に `<link rel="apple-touch-icon" .../>` |

#### チェックリスト

- [ ] `<link rel="icon">` が HTML の `<head>` 内にある
- [ ] `<link rel="apple-touch-icon">` がある（iOS ホーム画面追加対応）
- [ ] デプロイ後にブラウザタブでファビコンが表示されることを確認

---

## デザインシステム

### カラーパレット

ポータル全体で統一して使う色。アイコン作成時もこのパレットから選ぶこと。

| 名前 | HEX | 用途 |
|------|-----|------|
| BG | `#0a0e1a` | アイコン背景（深い紺） |
| Surface | `#1a1d27` | カード背景 |
| Border | `#2e3250` | カードボーダー |
| Indigo | `#5c7cfa` / `#6366f1` | メインアクセント |
| Cyan | `#38bdf8` / `#22d3ee` | セカンドアクセント |
| Violet | `#a78bfa` | サードアクセント |
| Teal | `#2dd4bf` | サードアクセント（緑系） |

グラデーションは上記から2色を選ぶ。既存アプリとの色の重複を避けること：

| アプリ | 使用色 |
|--------|--------|
| apps-portal（ポータル自体） | Indigo → Cyan |

### アイコンデザイン規則

すべてのアイコンで以下を統一する：

| 項目 | 仕様 |
|------|------|
| サイズ | 256×256px（ポータル表示は 44px にスケール） |
| 形状 | iOS スタイル角丸矩形（半径 = サイズの 22%） |
| 背景色 | **アプリごとに異なる暗色**（共通ルール: 明度は低く・彩度は高く、各アプリを一目で区別できること） |
| スタイル | 暗背景 + グローエフェクト（輝き・発光）。モチーフがはっきり見えること |
| モチーフ | アプリの機能を象徴する図形（ノード・UFO・カレンダー等）。テキストなし |
| 実装 | Node.js スクリプトで PNG 生成（外部ライブラリ不使用） |

**NG 例：**
- 写真・スクリーンショットをそのまま使う
- 白背景 / 明るすぎる背景（ポータルのカード背景 `#1a1d27` に溶け込む）
- 純黒 `#000` / 共通暗色 `#0a0e1a` のみ（他のアプリと区別できない）
- 外部アイコンセット（Font Awesome 等）の SVG を貼り付けるだけ
- テキスト（アプリ名）を画像に入れる

### アイコン選色ガイド

アプリの「印象」に合わせて背景色と 2 色グラデーションを選ぶ：

| 印象 | 背景色（BG） | グラデーション（COLOR_A → COLOR_B） |
|------|-------------|-----------------------------------|
| 財務・データ | 暗マゼンタ系 `[40, 10, 40]` | Indigo → Violet |
| AI・自動化 | 暗ティール系 `[8, 30, 35]` | Cyan → Teal |
| 家族・生活 | 暗インディゴ系 `[10, 14, 45]` | Indigo → Cyan |
| 生産性・カレンダー | 暗シアン系 `[5, 25, 40]` | Violet → Cyan |
| 食・料理 | 暗グリーン系 `[8, 30, 20]` | Teal → Cyan |
| ゲーム・エンタメ | 暗バイオレット系 `[20, 8, 55]` | Violet → Teal |

各アプリの実際の背景色・使用色：

| アプリ | BG (RGB) | COLOR_A | COLOR_B |
|--------|----------|---------|---------|
| apps-portal（ポータル自体） | `[10, 14, 26]` | Indigo `#6366f1` | Cyan `#22d3ee` |
| survival-shooter | `[20, 8, 55]` | Violet `#a78bfa` | Teal `#2dd4bf` |

---

## ファイル構成

```
apps-portal/
├── app-icons/                    ← 各アプリのアイコン PNG（256×256）
│   └── <app-id>.png
├── docs/
│   ├── generate-icon-template.js ← アイコン生成テンプレート
│   └── generate-icon-<app-id>.js ← 各アプリ用生成スクリプト
├── generate-icons.js             ← ポータル自体のアイコン生成（icon-192/512）
├── index.html                    ← メインページ
├── manifest.json                 ← PWA マニフェスト
└── favicon.svg
```

---

## Git 運用

アプリ追加時のコミット順序：

1. `app-icons/<app-id>.png` + `docs/generate-icon-<app-id>.js` を追加
2. `index.html` にカードを追加

コミットメッセージ例：
```
feat: add <App Name> to portal
```
