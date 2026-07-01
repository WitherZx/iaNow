// Service Worker iaNow - v1.1 (Silent Logs & Improved Nav)
const CACHE_NAME = 'ianow-cache-v5';
const STATIC_ASSETS = [
  '/dashboard',
  '/favicon.webp',
  '/logo.webp',
  '/minerva-icon.png',
  '/noise.svg'
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

// 3. Estratégia de Cache: Hybrid (Network-First para Docs, SWR para Assets)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Ignora requisições de API e Supabase para não quebrar o Realtime/Sync
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co') || event.request.url.startsWith('chrome-extension')) {
    return;
  }

  // Estratégia 1: Navegação (Páginas HTML e RSC) - Network-First com Fallback
  const isPageRequest = event.request.mode === 'navigate' || 
                        event.request.headers.get('accept')?.includes('text/html') ||
                        event.request.headers.get('x-nextjs-data');

  if (isPageRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Tenta o cache exato
          const cached = await caches.match(event.request);
          if (cached) return cached;
          
          // Fallback para o /dashboard se nada for encontrado (página principal do PWA)
          const dashboardCache = await caches.match('/dashboard');
          if (dashboardCache) return dashboardCache;

          return new Response('Offline: O conteúdo solicitado não está disponível no cache.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Estratégia 2: Outros Assets - Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          }).catch(() => {});
          
          return networkResponse;
        })
        .catch(() => {
          // Silencioso em caso de erro de rede (comum em dev/servidor reiniciando)
          return cachedResponse || new Response('', { status: 404 });
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
