# お知らせ（トピックス）の管理について

トップページのカルーセルと、お知らせページの一覧は `data/topics.json` を参照しています。本番サーバー（PHP）では、管理画面から JSON と写真を直接書き込めます。

## ファイル構造

```
admin/
  topics.html             … 管理画面
  admin.css
  admin.js
  save.php                … サーバーへ書き込む処理

data/
  topics.json             … お知らせの一覧データ
  TOPICS_README.md        … 本説明

assets/
  slider/                 … カルーセル用の写真
```

## 管理画面の開き方

公開メニューには出しません。

1. 本番: `https://（サイト）/admin/`
2. ローカルで PHP 確認: `npm run start:php` のあと `http://127.0.0.1:3000/admin/`

日付が新しい 7 件に「カルーセル表示」と付きます。

## 本番での保存

1. 管理トップ（`admin/`）の「パスワードを変更」で初期値から本番用に変える（未変更なら `admin/save.php` の初期値）
2. 管理画面で追加・編集・削除する
3. パスワードを入力し「サーバーに保存」を押す
4. `data/topics.json` と、新しい写真は `otherimage/slider/` に書き込まれる
5. トップページを再読み込みすると反映される

`data/` と `otherimage/slider/` に PHP から書き込める権限（パーミッション）が必要です。

## PHP が使えない場合

「ダウンロード」で JSON と写真を出し、サーバーの `data/topics.json` と `otherimage/slider/` へ置いてください。

## data/topics.json の各項目

| 項目 | 説明 |
|------|------|
| id | 識別用ID（日付が新しい件が 1。JSON の先頭が最新） |
| date | 表示用日付（例: "2011-04-01"） |
| title | お知らせのタイトル（カルーセルの見出し） |
| category | カテゴリ（重要 / お知らせ / イベント / 求人 / 入札 / コロナ） |
| description | 説明文（任意。カルーセルの文章） |
| image | 画像パス（任意。空の場合はプレースホルダー画像） |

## 表示との連携

- **topic.html** では `other/topicLoader.js` が `data/topics.json` を読み込みます。
- **index.html** では `other/sliderLoader.js` が同じ JSON の新しい 7 件をカルーセルに出します。
