# バージョン更新 Quick Start

**キャッシュの無効化はもう手動更新不要。** `main` に push すればデプロイ時に
自動でキャッシュが無効化される（`CLAUDE.md`「キャッシュ運用ルール」参照）。
「更新確認」ボタンや個別ページのバージョン比較UIは廃止した
（更新はブラウザ標準のSW更新検知で自動的に反映される）。

## 更新履歴を書き残したいとき（任意）

```bash
node scripts/maintenance/update-version.js 4.29.0 "新機能の説明"
```
`sw-version.js` の `APP_VERSION` / `VERSION_DESCRIPTION` と `package.json` の
`version`（存在する場合）だけを更新する、表示用の備忘録スクリプト。
Node.js が無い環境では `sw-version.js` を直接編集してもよい。
