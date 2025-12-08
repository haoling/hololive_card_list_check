// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.14.2";
const VERSION_DESCRIPTION = "デバイス間同期修正";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.14.2",
  "binder_collection.html": "4.14.2",
  "collection_binder.html": "4.14.2",
  "card_list.html": "4.14.2",
  "holoca_skill_page.html": "4.14.2",
  "deck_builder.html": "4.14.2"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.14.2",
  description: "デバイス間同期修正",
  changes: [
    "ページリロード時にGoogle Driveから最新データを取得するよう修正",
    "デバイス間でデータが同期されない問題を修正"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
