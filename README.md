# apps-portal

MRE アプリ一覧のポータルサイト。

## 新しいアプリを追加する

### 1. アイコンを生成する

```bash
# テンプレートをコピー
cp docs/generate-icon-template.js docs/generate-icon-<app-id>.js
```

`docs/generate-icon-<app-id>.js` を開き、以下を編集する：

| 変数 | 内容 |
|------|------|
| `APP_ID` | kebab-case のアプリ識別子（例: `my-new-app`） |
| `COLOR_A` / `COLOR_B` | アイコンに使う 2 色（下記カラーパレット参照） |
| `drawMotif()` | アプリを象徴する図形（例のコードを書き換える） |

```bash
node docs/generate-icon-<app-id>.js
# → app-icons/<app-id>.png が生成される
```

### 2. index.html にカードを追加する

`<div class="grid">` 内に以下をコピーして追記する：

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

### 3. コミットする

```bash
git add app-icons/<app-id>.png docs/generate-icon-<app-id>.js index.html
git commit -m "feat: add <App Name> to portal"
git push
```

---

## カラーパレット

アイコン作成時は以下の 2 色をグラデーションに使う。既存アプリとの重複を避けること。

| 色名 | HEX | RGB |
|------|-----|-----|
| Indigo | `#6366f1` | 99, 102, 241 |
| Cyan | `#22d3ee` | 34, 211, 238 |
| Violet | `#a78bfa` | 167, 139, 250 |
| Teal | `#2dd4bf` | 45, 212, 191 |

**既存アプリの使用色：**

| アプリ | 色の組み合わせ |
|--------|--------------|
| apps-portal（ポータル自体） | Indigo → Cyan |

---

## アイコンデザインの共通ルール

- **形状**: iOS スタイルの角丸矩形（半径 = サイズの 22%）
- **背景色**: アプリごとに異なる暗色（各アプリを一目で区別できる彩度の高い暗色）
- **スタイル**: 暗背景 + グローエフェクト（発光・輝き）
- **テキストなし**: アプリ名などの文字は入れない
- **PNG 生成**: Node.js スクリプトで生成（外部ライブラリ不使用）

---

## GitHub Pages

`Settings > Pages` で `main` ブランチのルートを公開元に設定することで公開できる。
