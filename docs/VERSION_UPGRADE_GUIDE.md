# バージョンアップ手順（旧: 手動更新ガイド）

**このドキュメントは古い運用（sw.js/sw-utils.js/sw-handlersのバージョンコメント手動同期、
PAGE_VERSIONS個別管理）を説明していたが、2026-09にキャッシュ無効化が完全自動化されたため
不要になった。** 最新の仕組みは `CLAUDE.md`「キャッシュ運用ルール」と
`docs/VERSION_UPDATE_GUIDE.md` を参照。

やることは以下だけ:

- 更新履歴として書き残したい変更をしたときだけ、`sw-version.js` の `APP_VERSION` /
  `VERSION_DESCRIPTION` / `UPDATE_DETAILS.changes` を更新する（任意・表示専用）
- それ以外（sw.js のバージョンコメント同期、HTML個別のバージョンコメント、
  PAGE_VERSIONS）はすべて廃止済み。何もする必要はない
