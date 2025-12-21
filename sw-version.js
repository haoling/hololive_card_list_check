// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.19.0";
const VERSION_DESCRIPTION = "カード検索でスペース区切りAND検索に対応";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.19.0",
  "binder_collection.html": "4.19.0",
  "collection_binder.html": "4.19.0",
  "card_list.html": "4.19.0",
  "holoca_skill_page.html": "4.19.0",
  "deck_builder.html": "4.19.0"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.19.0",
  description: "カード検索でスペース区切りAND検索に対応",
  changes: [
    "カード一覧の検索でスペース区切りによるAND検索をサポート",
    "半角スペースと全角スペースの両方に対応"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
