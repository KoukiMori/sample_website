# 施設取組のCMS管理について

施設取組ページで表示するセクション・項目をJSONで管理するための説明です。

## ファイル構造

```
data/
  shisetu_torikumi.json   … セクション・項目の定義（CMSで編集）
  SHISETU_TORIKUMI_README.md … 本説明

other/
  shisetu_torikumi.html    … 施設取組ページ
  shisetuTorikumiLoader.js … JSONを読み込み一覧を描画するスクリプト
```

## data/shisetu_torikumi.json の役割

- **CMSで編集する主なファイル**です。
- 施設取組ページ（other/shisetu_torikumi.html）で表示する「セクション」と、その中の「項目」を定義します。
- フロントはこのJSONを読み込み、セクション見出し・補足文・項目リンクを動的に生成します。

### 各項目の意味

| 項目 | 説明 |
|------|------|
| sections | セクションの配列（表示順） |
| sections[].title | セクションの見出し（例: 「新型コロナウイルスについて」） |
| sections[].note | セクションの補足文（空文字の場合は非表示） |
| sections[].items | そのセクション内の項目（リンクラベル）の配列 |

### セクションの追加手順

1. **data/shisetu_torikumi.json** の `sections` 配列に、新しいオブジェクトを追加する。
2. `title`（必須）、`note`（任意）、`items`（文字列の配列）を指定する。

```json
{
  "title": "新規セクションの見出し",
  "note": "補足があればここに記載（なければ \"\"）",
  "items": [
    "項目1のラベル",
    "項目2のラベル"
  ]
}
```

### 項目の追加・変更

- 既存セクションの `items` 配列に文字列を追加すると、そのセクション内に新しい項目が表示されます。
- 現状、すべての項目のリンク先は `href="#"`（空リンク）です。必要に応じてローダー側でURLを扱うよう拡張できます。

## 表示との連携

- 施設取組ページ（other/shisetu_torikumi.html）では、**shisetuTorikumiLoader.js** がこのJSONを読み込み、`#shisetuTorikumiList` 内にHTMLを生成します。
- JSONを編集して保存すると、次回のページ表示で内容が反映されます。
