// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.14.5";
const VERSION_DESCRIPTION = "viewModeを同期対象外に変更";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.14.5",
  "binder_collection.html": "4.14.5",
  "collection_binder.html": "4.14.5",
  "card_list.html": "4.14.5",
  "holoca_skill_page.html": "4.14.5",
  "deck_builder.html": "4.14.5"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.14.5",
  description: "viewModeを同期対象外に変更",
  changes: [
    "viewModeをGoogle Drive同期から除外",
    "binderViewModeをGoogle Drive同期から除外",
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
