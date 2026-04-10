'use client'

import { useEffect } from 'react'
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { db } from '@/lib/storage/db'
import { useAuth } from '@/hooks/useAuth'
import { isDeleted } from '../optimistic/optimisticRegistry'

// ==========================================
// Reconciliação Passiva e Determinística
// ==========================================

async function handleInsert(queryClient: QueryClient, newRow: any, queryKey: QueryKey) {
  queryClient.setQueryData(queryKey, (old: any[]) => {
    if (!old) return [newRow]
    
    // 1. DEDUPLICAÇÃO DETERMINÍSTICA
    // Se o ID já existir (reconciliado por onSuccess) ou se o client_temp_id bater (placeholer local)
    const existingIndex = old.findIndex(item => 
      item.id === newRow.id || 
      (item.metadata?.client_temp_id && item.metadata?.client_temp_id === newRow.metadata?.client_temp_id)
    )

    if (existingIndex > -1) {
      const updatedList = [...old]
      // Substitui o placeholder pelo dado real do servidor
      updatedList[existingIndex] = { ...newRow, _optimistic: false, _source: 'server' }
      return updatedList
    }

    // 2. ADIÇÃO PADRÃO (se não for duplicado)
    return [newRow, ...old].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  })
}

async function handleUpdate(queryClient: QueryClient, newRow: any, queryKey: QueryKey, individualKeyPrefix: string) {
  // 1. Atualizar cache individual
  const individualKey = [individualKeyPrefix, newRow.id]
  const currentItem = queryClient.getQueryData<any>(individualKey)
  const remoteTime = new Date(newRow.updated_at || newRow.created_at).getTime()
  
  if (currentItem) {
    const localTime = new Date(currentItem.updated_at || currentItem.created_at).getTime()
    if (remoteTime >= localTime) {
      queryClient.setQueryData(individualKey, newRow)
    }
  }

  // 2. Atualizar cache da lista
  queryClient.setQueryData(queryKey, (old: any[]) => {
    if (!old) return old
    return old.map(item => {
      if (item.id === newRow.id) {
        const localTime = new Date(item.updated_at || item.created_at).getTime()
        if (remoteTime >= localTime) return { ...newRow, _optimistic: false, _source: 'server' }
      }
      return item
    })
  })
}

async function handleDelete(queryClient: QueryClient, oldRow: any, queryKey: QueryKey, individualKeyPrefix: string) {
  queryClient.removeQueries({ queryKey: [individualKeyPrefix, oldRow.id] })
  queryClient.setQueryData(queryKey, (old: any[]) => {
    if (!old) return old
    return old.filter(item => item.id !== oldRow.id)
  })
}

export function useRealtimeEngine() {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuth()
  const orgId = user?.user_metadata?.org_id

  useEffect(() => {
    if (!isAuthenticated || !user || !orgId) return

    const channelName = `realtime_sync_${user.id}_${orgId}`
    const channel = supabase.channel(channelName)

    // Configuração de tabelas e chaves
    const TABLE_CONFIGS = [
      { table: 'strategies', key: ['strategies'], individual: 'strategy', filter: `created_by=eq.${user.id}` },
      { table: 'partners', key: ['partners', orgId], individual: 'partner', filter: `organization_id=eq.${orgId}` },
      { table: 'justice_demands', key: ['justice-cases', orgId], individual: 'justice-case', filter: `organization_id=eq.${orgId}` },
      { table: 'generated_documents', key: ['juridico-documents'], individual: 'juridico-document', filter: `organization_id=eq.${orgId}` }
    ]

    TABLE_CONFIGS.forEach(cfg => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: cfg.table, filter: cfg.filter },
        async (payload) => {
          const newRow = payload.new as any | null
          const oldRow = payload.old as any | null
          const entityId = newRow?.id || oldRow?.id
          if (!entityId) return

          // LOCK DA OUTBOX: Ignora se houver mudança pendente localmente (Update/Delete)
          try {
            const isOfflineDirty = await db.outbox.where({ entityId }).count()
            if (isOfflineDirty > 0 || isDeleted(entityId)) return
          } catch (e) { return }

          const { eventType } = payload
          if (eventType === 'INSERT' && newRow) handleInsert(queryClient, newRow, cfg.key)
          else if (eventType === 'UPDATE' && newRow) handleUpdate(queryClient, newRow, cfg.key, cfg.individual)
          else if (eventType === 'DELETE' && oldRow) handleDelete(queryClient, oldRow, cfg.key, cfg.individual)
        }
      )
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isAuthenticated, user, orgId, queryClient])
}

