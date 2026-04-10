'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { db, type OutboxRecord } from '@/lib/storage/db'
import { useAuth } from '@/hooks/useAuth'
import { conflictStore } from '@/lib/conflict/conflictStore'

// ==========================================
// Registry: Mapeia action names → Server Actions
// ==========================================

type ActionHandler = (payload: any) => Promise<any>
const actionRegistry = new Map<string, ActionHandler>()

/**
 * Registra uma Server Action no Sync Engine.
 * Cada módulo chama isso para "ensinar" o engine como processar suas mutações.
 */
export function registerSyncAction(name: string, handler: ActionHandler) {
  actionRegistry.set(name, handler)
}

// ==========================================
// Backoff exponencial
// ==========================================

function getBackoffDelay(attempts: number): number {
  // 2s, 4s, 8s, 16s (cap em 16s)
  return Math.min(Math.pow(2, attempts) * 1000, 16000)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==========================================
// Max retries antes de marcar como 'failed'
// ==========================================

const MAX_ATTEMPTS = 5

// ==========================================
// Hook: useSyncEngine
// ==========================================

/**
 * Hook singleton que monitora a conectividade e processa
 * a fila do Outbox de forma sequencial e dedupicada.
 * 
 * Deve ser chamado UMA ÚNICA VEZ no DashboardLayout.
 */
export function useSyncEngine() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()
  const isSyncing = useRef(false)

  const processOutbox = useCallback(async () => {
    // Trava: evita processamento paralelo
    if (isSyncing.current) return
    if (!navigator.onLine) return
    if (!isAuthenticated) return

    isSyncing.current = true

    try {
      const pending = await db.getPendingOutbox()
      if (pending.length === 0) {
        isSyncing.current = false
        return
      }

      // Registro do Background Sync (Fase 6)
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready
          await (registration as any).sync.register('sync-outbox')
          console.debug('[SyncEngine] Background Sync registrado: sync-outbox')
        } catch (swErr) {
          console.warn('[SyncEngine] Falha ao registrar Background Sync:', swErr)
        }
      }

      // Processa sequencialmente (FIFO estrito)
      for (const record of pending) {
        const handler = actionRegistry.get(record.action)
        if (!handler) {
          console.warn(`[SyncEngine] Handler não registrado: ${record.action}`)
          // Marca como failed — sem handler, sem solução
          await db.outbox.update(record.clientMutationId, {
            status: 'failed',
            lastAttemptAt: Date.now()
          })
          continue
        }

        // Backoff exponencial se já tentou antes
        if (record.attempts > 0) {
          const delay = getBackoffDelay(record.attempts)
          await sleep(delay)
        }

        // Marca como 'syncing' antes de tentar
        await db.outbox.update(record.clientMutationId, {
          status: 'syncing',
          lastAttemptAt: Date.now()
        })

        try {
          const result = await handler(record.payload)

          if (result?.error) {
            throw new Error(result.error)
          }

          // DETECÇÃO DE CONFLITO (Fase 5)
          if (result?.conflict) {
            console.debug(`[SyncEngine] Conflito detectado para entidade ${record.entityId}. Pausando sync para este item.`)
            
            // 1. Move para status 'conflict' para tirar da fila principal de processamento
            await db.outbox.update(record.clientMutationId, {
              status: 'conflict',
              lastAttemptAt: Date.now()
            })

            // 2. Registra na ConflictStore (in-memory) para avisar a UI
            conflictStore.addConflict({
              entityId: record.entityId,
              type: result.remoteData?.deleted_at ? 'DELETE_VS_UPDATE' : 'FULL_OVERRIDE',
              localData: record.payload,
              remoteData: result.remoteData,
              action: record.action,
              clientMutationId: record.clientMutationId
            })

            // Interrompe o processamento deste item (não remove do outbox)
            continue
          }

          // Sucesso: remove do outbox e invalida a query
          await db.outbox.delete(record.clientMutationId)

          // Invalida as queries relevantes para sincronizar estado servidor → cliente
          await queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey as string[]
              // Invalida queries que contenham o entityId ou a action relevante
              return key.some(k => 
                typeof k === 'string' && (
                  k === record.entityId ||
                  k.includes('strategies') ||
                  k.includes('dashboard')
                )
              )
            }
          })

        } catch (err) {
          const newAttempts = record.attempts + 1

          if (newAttempts >= MAX_ATTEMPTS) {
            // Falha definitiva
            await db.outbox.update(record.clientMutationId, {
              status: 'failed',
              attempts: newAttempts,
              lastAttemptAt: Date.now()
            })
            console.error(`[SyncEngine] Falha definitiva: ${record.action} (${record.entityId})`, err)
          } else {
            // Volta para pending com attempts incrementado
            await db.outbox.update(record.clientMutationId, {
              status: 'pending',
              attempts: newAttempts,
              lastAttemptAt: Date.now()
            })
          }

          // Se a rede caiu durante o processamento, para imediatamente
          if (!navigator.onLine) break
        }
      }
    } catch (err) {
      console.error('[SyncEngine] Erro geral no processamento:', err)
    } finally {
      isSyncing.current = false
    }
  }, [queryClient, isAuthenticated])

  useEffect(() => {
    // Processa ao montar (caso haja pendências de sessão anterior)
    processOutbox()

    // Listener: reconexão de rede
    const handleOnline = () => {
      console.debug('[SyncEngine] Conexão restaurada. Processando outbox...')
      processOutbox()
    }

    // Listener: foco na janela (usuário voltou para a aba)
    const handleFocus = () => {
      processOutbox()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', handleFocus)

    // Polling suave: verifica a cada 30s se há pendências
    const interval = setInterval(processOutbox, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [processOutbox])

  return {
    processOutbox,  // Para disparar sync manualmente se necessário
    isSyncing: isSyncing.current
  }
}
