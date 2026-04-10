const CACHE_NAME = 'ianow-cache-v1';
const STATIC_ASSETS = [
  '/dashboard',
  '/favicon.webp',
  '/logo.webp',
  '/minerva-icon.png'
];

// 1. Instalação: Cache inicial do App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. Estratégia de Cache: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  // Ignora requisições de API e Supabase para não quebrar o Realtime/Sync
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Background Sync: Reconciliação via Relay API
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-outbox') {
    console.log('[SW] Background Sync Triggered: sync-outbox');
    event.waitUntil(processBackgroundSync());
  }
});

/**
 * Orquestra o sync sem acessar o IndexedDB diretamente.
 * Solicita os dados pendentes para um cliente (aba) ativo.
 */
async function processBackgroundSync() {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  
  // REGRA: Seleciona apenas o focado ou o primeiro para evitar duplicação de sync
  const client = allClients.find(c => c.visibilityState === 'visible') || allClients[0];

  if (!client) {
    console.log('[SW] No active clients found to fulfill sync request.');
    return;
  }

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    
    channel.port1.onmessage = async (messageEvent) => {
      if (messageEvent.data.type === 'OUTBOX_DATA') {
        const pendingItems = messageEvent.data.payload || [];
        console.log(`[SW] Received ${pendingItems.length} items from client for background sync.`);

        for (const item of pendingItems) {
          try {
            const response = await fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: item.action,
                payload: item.payload
              })
            });

            if (response.ok) {
              // Notifica o cliente para remover do local storage se sucesso
              client.postMessage({ 
                type: 'SYNC_SUCCESS', 
                clientMutationId: item.clientMutationId 
              });
            }
          } catch (err) {
            console.error('[SW] Failed to sync item:', item.clientMutationId, err);
          }
        }
        resolve();
      }
    };

    // Solicita o outbox ao cliente selecionado
    client.postMessage({ type: 'REQUEST_OUTBOX' }, [channel.port2]);
  });
}
