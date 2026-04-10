'use client'

/**
 * Registro das Server Actions do módulo Estratégia no Sync Engine.
 * 
 * Este arquivo deve ser importado uma vez (no DashboardLayout ou similar)
 * para que o Sync Engine saiba como processar mutações pendentes do Outbox.
 */

import { registerSyncAction } from '@/lib/sync/syncEngine'
import { syncHandlers } from '@/lib/sync/actions-map'

/**
 * Registra todos os handlers mapeados para o Outbox Pattern.
 * Isso garante que o SyncEngine saiba como processar cada ação.
 */
Object.entries(syncHandlers).forEach(([name, handler]) => {
  registerSyncAction(name, handler)
})

