# 入札情報のCMS管理について

入札結果のExcel・PDFファイルを年度別に管理するためのデータとファイル構造の説明です。

## ファイル構造

```
data/
  nyusatu.json          … 年度別・執行日別のメタデータ（CMSで編集）
  NYUSATU_README.md     … 本説明

assets/
  nyusatu/
    r7/                 … 令和7年度
      excel/            … Excelファイル (.xls, .xlsx)
      pdf/              … PDFファイル
    r6/                 … 令和6年度
      excel/
      pdf/
    r5/                 … 令和5年度
      excel/
      pdf/
    …                   … 必要に応じて r4, r3, h31 などを追加
```

## data/nyusatu.json の役割

- **CMSで編集する主なファイル**です。
- 各年度（yearId）と、その中の「執行日ごとの結果」（results）を定義します。
- フロントはこのJSONを参照して、入札結果一覧の表示やリンク先を組み立てます。

### 各項目の意味

| 項目 | 説明 |
|------|------|
| yearId | 年度の識別子（r7=令和7年度, r6=令和6年度, r5=令和5年度 など） |
| label | 画面上に表示する年度名（例: 「令和7年度」） |
| results | その年度の入札結果の配列 |
| results[].dateLabel | 表示用の執行日（例: 「令和７年３月１９日執行分」） |
| results[].dateId | ファイル名に使う日付ID（YYYYMMDD、例: 20250319） |
| results[].excel | Excelファイル名（assets/nyusatu/{yearId}/excel/ に配置） |
| results[].pdf | PDFファイル名（assets/nyusatu/{yearId}/pdf/ に配置） |

### 新規年度の追加手順（CMS運用）

1. **assets/nyusatu/** に `r8` など年度フォルダを作成し、その中に `excel/` と `pdf/` を作成。
2. **data/nyusatu.json** の `years` に、新しい年度のオブジェクトを追加。
3. 各執行分の結果を `results` に追加し、`excel` と `pdf` に実際に配置したファイル名を記載。
4. 実際のExcel・PDFファイルを、`assets/nyusatu/{yearId}/excel/` および `pdf/` にアップロード。

### 新規執行分の追加手順

1. 該当年度の `excel/` と `pdf/` にファイルを配置（ファイル名は dateId ベースを推奨、例: 20250701.xls）。
2. **data/nyusatu.json** の該当年度の `results` に、`dateLabel`・`dateId`・`excel`・`pdf` を追加。

## ファイル名のルール（推奨）

- **dateId** と一致させる: 例として `20250319.xls` / `20250319.pdf`。
- 拡張子は Excel は `.xls` または `.xlsx`、PDF は `.pdf`。

## 表示との連携

- 入札情報ページ（other/nyusatu_info.html）では、このJSONを読み込み、年度ごとの展開ブロックと「執行日＋Excel/PDFリンク」を動的に生成できます。
- 現状はHTMLに直書きでも運用可能です。CMSで nyusatu.json を編集し、ビルドやスクリプトでHTMLを生成する形にすることもできます。
