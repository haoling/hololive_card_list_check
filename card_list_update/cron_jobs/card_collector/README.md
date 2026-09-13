# Card Collector Cron Job

ホロライブTCG公式サイトからカード情報を収集する cron ジョブです。

## 機能

- カード情報の自動クロール
- カードデータ（基本情報・スキルなど）の解析
- JSON ファイルへの保存
- 差分更新のサポート

## ディレクトリ構成

```
card_collector/
├── src/                    # ソースコードディレクトリ
│   ├── collectors/        # クローラー関連コード
│   ├── parsers/          # パーサー関連コード
│   ├── models/           # データモデル
│   └── utils/            # ユーティリティ関数
├── data/                  # データ保存ディレクトリ
├── logs/                  # ログディレクトリ
└── requirements.txt       # 依存関係の設定
```

## 実行方法

1. 依存関係をインストール:
```bash
pip install -r requirements.txt
```

2. プログラムを実行:
```bash
python -m src
```

## 出力

- カードデータは `data/card_data.json` に保存されます（`CARD_DATA_FILE` 環境変数で出力先を変更可能。GitHub Actions では `json_file/card_data.json`（アプリ本体のカードDB）を直接指定し、差分更新している）
- 実行ログは `logs/card_collector.log` に保存されます

## GitHub Actions での自動実行

`.github/workflows/update-card-data.yml` から手動実行（`workflow_dispatch`）できます。
`json_file/card_data.json` を直接更新し、変更があれば `sw-version.js` / `sw.js` のバージョンを自動で上げた上で Pull Request を作成します。
