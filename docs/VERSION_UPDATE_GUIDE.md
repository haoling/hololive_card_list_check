# バージョン更新ガイドライン

**2026-09〜: キャッシュの無効化は完全に自動化された。** `main` に push すると
`.github/workflows/deploy.yml` が `scripts/deploy/build_site.py` を実行し、
JS/CSSファイルを内容ハッシュ付きファイル名にリネームしてデプロイする。
これにより、ここで説明する `APP_VERSION` はキャッシュの動作に一切影響しない
**更新履歴表示用の備忘録**になった。書き忘れてもキャッシュが古くなる心配はない。

詳しい仕組みは `CLAUDE.md` の「キャッシュ運用ルール」を参照。

## 更新履歴を書きたいとき（任意）

更新履歴として意味のある変更をしたときだけ、`sw-version.js` を編集する
（`APP_VERSION` / `VERSION_DESCRIPTION` / `UPDATE_DETAILS.changes`）。

自動化スクリプトを使う場合:
```bash
node scripts/maintenance/update-version.js 4.29.0 "新機能の説明"
```
`sw-version.js` の `APP_VERSION` / `VERSION_DESCRIPTION` と、`package.json` の
`version` フィールド（存在する場合）を更新する。この開発機に Node.js が無い場合は
`sw-version.js` を直接編集してもよい（`APP_VERSION` / `VERSION_DESCRIPTION` の
2箇所だけを書き換える単純なファイル）。
