// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.14.1";
const VERSION_DESCRIPTION = "リロードループ修正";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.14.1",
  "binder_collection.html": "4.14.1",
  "collection_binder.html": "4.14.1",
  "card_list.html": "4.14.1",
  "holoca_skill_page.html": "4.14.1",
  "deck_builder.html": "4.14.1"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.14.1",
  description: "リロードループ修正",
  changes: [
    "Google Driveデータ読み込み後の自動リロードを削除",
    "代わりにリロードを促す通知バーを表示",
    "ユーザーが手動でリロードを選択可能に"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
