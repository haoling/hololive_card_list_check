// Version Management Configuration（単一ソース）
// ★バージョンを上げるときは、この APP_VERSION だけを変更すればよい。
//   - 各ページの表示([v…])は実行時に APP_VERSION から描画される
//   - 更新検知は「稼働中SWの APP_VERSION」と「配信中 sw-version.js の APP_VERSION」を比較する
//   - PAGE_VERSIONS は APP_VERSION から自動生成（手書きしない）
//   ※ sw.js 本体のバージョンコメントも合わせて更新するとSW更新検知が最速（sw.js のバイト差分）

const APP_VERSION = "4.24.0";
const VERSION_DESCRIPTION = "カード一覧の検索でハイフン等の記号を無視してカード番号を検索できるように改善";

// ✅ 対象ページ一覧（バージョンは APP_VERSION に統一＝単一ソース。手書きの個別バージョンは持たない）
const VERSIONED_PAGES = [
  "index.html",
  "binder_collection.html",
  "collection_binder.html",
  "card_list.html",
  "holoca_skill_page.html",
  "deck_builder.html"
];
const PAGE_VERSIONS = Object.fromEntries(VERSIONED_PAGES.map((p) => [p, APP_VERSION]));

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: `v${APP_VERSION}`,
  description: VERSION_DESCRIPTION,
  changes: [
    "カード一覧ページの検索ボックスで、カード番号のハイフンなどの記号を無視して検索できるように改善（例: 「08085」と入力しても「hBP08-085」がヒットする）"
  ]
};

// Export for Service Worker / ページ（self は SW でも window でも有効）
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
