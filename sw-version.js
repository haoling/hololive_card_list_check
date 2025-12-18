// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.17.3";
const VERSION_DESCRIPTION = "バージョン更新";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.17.3",
  "binder_collection.html": "4.17.3",
  "collection_binder.html": "4.17.3",
  "card_list.html": "4.17.3",
  "holoca_skill_page.html": "4.17.3",
  "deck_builder.html": "4.17.3"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.17.3",
  description: "バージョン更新",
  changes: [
    "バージョンを4.17.3に更新"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
