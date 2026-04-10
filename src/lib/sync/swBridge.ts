'use client'

import { db } from '@/lib/storage/db'

/**
 * Ponte de comunicação entre o Cliente (App) e o Service Worker.
 * Permite que o SW acesse dados do IndexedDB de forma indireta (via postMessage)
 * e receba confirmações de sincronização concluída em background.
 */
export function setupSWBridge() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.onmessage = async (event) => {
    const { type, clientMutationId } = event.data

    // 1. SW solicita a fila do outbox
    if (type === 'REQUEST_OUTBOX') {
      const port = event.ports[0]
      const pendingData = await db.getPendingOutbox()
      
      if (port) {
        port.postMessage({
          type: 'OUTBOX_DATA',
          payload: pendingData
        })
      }
    }

    // 2. SW confirma que um item foi sincronizado com sucesso
    if (type === 'SYNC_SUCCESS' && clientMutationId) {
      console.log(`[SWBridge] Background sync success for ${clientMutationId}. Cleaning up...`)
      await db.outbox.delete(clientMutationId)
      
      // Opcional: Notificar componentes ou invalidar queries se necessário
      // No momento, o invalid Queries acontecerá quando o app for focado novamente pelo SyncEngine
    }
  }
}
