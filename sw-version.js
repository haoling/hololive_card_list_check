// Version Management Configuration（表示専用の備忘録）
// ★キャッシュの無効化はデプロイ時にビルドスクリプトが自動で行うため、
//   ここでの APP_VERSION はもう更新検知には使われない。
//   更新履歴として意味のある変更をしたときだけ、人間が手動で上げればよい。

const APP_VERSION = "4.28.2";
const VERSION_DESCRIPTION = "カードデータ自動更新（2026-09-13）";

// ✅ 更新内容の詳細情報（更新履歴の備忘録。UIからは参照されない）
const UPDATE_DETAILS = {
  title: `v${APP_VERSION}`,
  description: VERSION_DESCRIPTION,
  changes: [
    "カード一覧画面のモバイル表示で、Googleにログイン中でもヘッダーにGoogleログインボタン（Gロゴ）が残ってしまう不具合を修正"
  ]
};

// Export for Service Worker / ページ（self は SW でも window でも有効）
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
