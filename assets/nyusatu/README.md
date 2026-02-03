# 入札結果ファイルの保存場所

年度別にExcel・PDFを配置するフォルダです。CMSでアップロードしたファイルをここに保存してください。

## フォルダ構成

```
nyusatu/
  r7/          令和7年度
    excel/     Excelファイル（.xls, .xlsx）
    pdf/       PDFファイル
  r6/          令和6年度
    excel/
    pdf/
  r5/          令和5年度
    excel/
    pdf/
```

## 運用の流れ

1. 新年度のときは、この直下に `r8` のように年度フォルダを作成し、その中に `excel/` と `pdf/` を作成する。
2. 入札結果のExcel・PDFを、執行日に対応する年度の `excel/` と `pdf/` に配置する。
3. 一覧の表示・リンクは **data/nyusatu.json** で管理する。ファイルを追加したら、そちらの `results` に項目を追加する。

詳細は **data/NYUSATU_README.md** を参照してください。
