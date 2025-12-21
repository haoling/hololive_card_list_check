// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.18.0";
const VERSION_DESCRIPTION = "バージョン更新";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.18.0",
  "binder_collection.html": "4.18.0",
  "collection_binder.html": "4.18.0",
  "card_list.html": "4.18.0",
  "holoca_skill_page.html": "4.18.0",
  "deck_builder.html": "4.18.0"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.18.0",
  description: "バージョン更新",
  changes: [
    "バージョンを4.18.0に更新"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
