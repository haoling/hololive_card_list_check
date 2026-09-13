// Utility functions for Service Worker operations
// バージョンは sw-version.js の APP_VERSION が単一ソース（表示用の備忘録）。
// キャッシュの無効化自体はデプロイ時のビルドスクリプトが自動で行うため、
// ここではバージョン比較や更新チェックのロジックは持たない。

// ✅ バージョン情報をコンソールに表示
function logVersionInfo() {
  console.log(`%c🚀 Hololive Card Tool Service Worker v${APP_VERSION}`, 'color: #4CAF50; font-weight: bold; font-size: 16px;');
  console.log(`%c📝 ${VERSION_DESCRIPTION}`, 'color: #2196F3; font-weight: bold;');
  console.log(`%c🗂️ キャッシュ名: ${CACHE_NAME}`, 'color: #9C27B0;');
}

// Function to update cache with latest data
async function updateCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      './json_file/card_data.json',
      './json_file/release_dates.json'
    ]);
    console.log('Cache updated with latest data');
  } catch (error) {
    console.log('Failed to update cache:', error);
  }
}

// Export functions for Service Worker (using global assignment for compatibility)
if (typeof self !== 'undefined') {
  self.logVersionInfo = logVersionInfo;
  self.updateCache = updateCache;
}
