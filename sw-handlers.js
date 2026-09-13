// Service Worker event handlers and cache management

// Message event handler function
async function handleMessage(event) {
  const { type, data } = event.data || {};

  switch (type) {
    case 'DELETE_PAGE_CACHE':
      // data.page で指定されたページのキャッシュだけ削除
      try {
        const pageUrl = data?.page;
        if (!pageUrl) throw new Error('No page specified');
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(`./${pageUrl}`);
        event.ports[0]?.postMessage({ type: 'DELETE_PAGE_CACHE_DONE', page: pageUrl });
        console.log('Deleted cache for page:', pageUrl);
      } catch (err) {
        event.ports[0]?.postMessage({ type: 'DELETE_PAGE_CACHE_ERROR', error: err.message });
      }
      break;
    case 'SKIP_WAITING':
      console.log('Received SKIP_WAITING message, taking control');
      self.skipWaiting();
      break;

    case 'GET_CACHE_NAME':
      // 現在のキャッシュ名を返す
      event.ports[0]?.postMessage({
        type: 'CACHE_NAME_RESPONSE',
        cacheName: CACHE_NAME
      });
      break;

    default:
      console.log('Message received:', type);
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.handleMessage = handleMessage;
}
