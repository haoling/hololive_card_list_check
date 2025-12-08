// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.14.4";
const VERSION_DESCRIPTION = "フィルター状態を同期対象外に変更";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.14.4",
  "binder_collection.html": "4.14.4",
  "collection_binder.html": "4.14.4",
  "card_list.html": "4.14.4",
  "holoca_skill_page.html": "4.14.4",
  "deck_builder.html": "4.14.4"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.14.4",
  description: "フィルター状態を同期対象外に変更",
  changes: [
    "検索ボックスの入力内容をGoogle Drive同期から除外",
    "フィルター状態をGoogle Drive同期から除外",
    "これらの設定はデバイスごとに個別保持"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
