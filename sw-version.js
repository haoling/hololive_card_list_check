// Version Management Configuration
// このファイルはバージョンアップ時に更新されます

const APP_VERSION = "4.14.0";
const VERSION_DESCRIPTION = "Google Drive連携機能追加";

// ✅ 各ページのバージョン情報を一元管理
const PAGE_VERSIONS = {
  "index.html": "4.14.0",
  "binder_collection.html": "4.14.0",
  "collection_binder.html": "4.14.0",
  "card_list.html": "4.14.0",
  "holoca_skill_page.html": "4.14.0",
  "deck_builder.html": "4.14.0"
};

// ✅ 更新内容の詳細情報
const UPDATE_DETAILS = {
  title: "v4.14.0",
  description: "Google Drive連携機能追加",
  changes: [
    "Googleログインと連携してデータをGoogle Driveに自動保存する機能を追加",
    "カード所持数・デッキデータ・バインダーコレクションなどが自動的に同期されます",
    "書き込み中にページを離れようとすると警告が表示されます",
    "設定画面からOAuthクライアントIDを設定することで利用可能"
  ]
};

// Export for Service Worker (using global assignment for compatibility)
if (typeof self !== "undefined") {
  self.APP_VERSION = APP_VERSION;
  self.VERSION_DESCRIPTION = VERSION_DESCRIPTION;
  self.PAGE_VERSIONS = PAGE_VERSIONS;
  self.UPDATE_DETAILS = UPDATE_DETAILS;
}
