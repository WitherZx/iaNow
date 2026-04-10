'use client'

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { db } from '@/lib/storage/db'
import { toast } from 'sonner'

interface UseOptimisticMutationOptions<TData, TVariables> {
  /** Nome da Server Action para o Outbox (ex: 'updateStrategy') */
  actionName: string

  /** A Server Action que será chamada */
  mutationFn: (variables: TVariables) => Promise<any>

  /** QueryKey que será atualizada otimisticamente */
  queryKey: QueryKey

  /** 
   * Função que retorna o entityId a partir das variáveis.
   * Usado para deduplicação no Outbox.
   */
  getEntityId: (variables: TVariables) => string

  /** 
   * Função que aplica a atualização otimista no cache.
   * Recebe o dado atual e as variáveis, retorna o dado atualizado.
   */
  updater: (currentData: TData | undefined, variables: TVariables) => TData

  /** Tipo de operação para lógica específica */
  operation?: 'create' | 'update' | 'delete'

  /** Callback opcional de sucesso */
  onSuccess?: (data: any, variables: TVariables) => void

  /** Callback opcional de erro */
  onError?: (error: Error, variables: TVariables) => void
}

/**
 * Hook de mutação otimista com suporte a Outbox Pattern.
 * 
 * Fluxo:
 * 1. Snapshot do estado atual (para rollback)
 * 2. Aplica a mudança otimista na UI imediatamente
 * 3. Tenta executar a Server Action
 * 4. Se falhar: reverte a UI e enfileira no Outbox para retry posterior
 * 5. Se sucesso: confirma e invalida a query para sincronizar
 */
import { markDeleted } from '@/lib/optimistic/optimisticRegistry'

export function useOptimisticMutation<TData = any[], TVariables = any>({
  actionName,
  mutationFn,
  queryKey,
  getEntityId,
  updater,
  onSuccess,
  onError,
  operation = 'update',
}: UseOptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient()
  const isCreate = operation === 'create'
  const isDelete = operation === 'delete'

  return useMutation({
    mutationFn,

    onMutate: async (variables: any) => {
      // 1. Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey })

      // 2. SNAPSHOT
      const previousData = queryClient.getQueryData<TData>(queryKey)

      // 3. GENERATE TEMP ID (para Create)
      const tempId = isCreate ? crypto.randomUUID() : null
      
      // Injeta client_temp_id se for criação para reconciliação determinística
      if (isCreate && tempId) {
        if (!variables.metadata) variables.metadata = {}
        variables.metadata.client_temp_id = tempId
      }

      // 4. OPTIMISTIC UPDATE
      queryClient.setQueryData<TData>(queryKey, (old: any) => {
        if (isCreate && tempId) {
          const newItem = {
            id: tempId,
            ...variables,
            _optimistic: true,
            _source: 'local',
            status: 'creating',
            created_at: new Date().toISOString()
          }
          
          if (Array.isArray(old)) {
            return [newItem, ...old] as TData
          }
          
          // Se não for array, delegamos ao updater para saber onde inserir o newItem
          return updater(old, newItem as any)
        }

        if (isDelete) {
          const id = getEntityId(variables)
          markDeleted(id)
          if (!Array.isArray(old)) {
            // Se não for array, delegamos ao updater (necessário para Parceiros/Dashboard)
            return updater(old, variables)
          }
          return old.filter((item: any) => item.id !== id) as TData
        }

        return updater(old, variables)
      })

      return { previousData, variables, tempId }
    },

    onError: async (error: Error, variables: TVariables, context: any) => {
      // 5. OUTBOX (Apenas Update. Create e Delete são RAM-only nesta fase)
      if (!isCreate && !isDelete) {
        const clientMutationId = crypto.randomUUID()
        const entityId = getEntityId(variables)
        let enqueueSuccess = false

        try {
          await db.enqueue({
            clientMutationId,
            entityId,
            action: actionName,
            payload: variables,
          })
          enqueueSuccess = true

          toast.info('Alteração salva localmente. Será sincronizada quando a conexão voltar.', {
            duration: 4000,
          })
        } catch (enqueueError) {
          console.error('[OptimisticMutation] Falha ao enfileirar no Outbox:', enqueueError)
          toast.error('Erro ao salvar alteração. Falha de consistência.')
        }

        // ROLLBACK CONDICIONAL (Apenas se falhou Outbox)
        if (!enqueueSuccess && context?.previousData !== undefined) {
          queryClient.setQueryData(queryKey, context.previousData)
        }
      } else if (isCreate) {
        // CREATE ERROR: Remover item otimista específico
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!Array.isArray(old)) return old
          return old.filter((item: any) => item.id !== context?.tempId) as TData
        })
        toast.error('Falha ao criar item. Tente novamente.')
      } else if (isDelete) {
        // DELETE ERROR: Rollback total (o item reaparece)
        if (context?.previousData) {
          queryClient.setQueryData(queryKey, context.previousData)
        }
        toast.error('Falha ao excluir item. Revertendo...')
      }

      onError?.(error, variables)
    },

    onSuccess: async (data: any, variables: TVariables, context: any) => {
      if (isCreate && context?.tempId) {
        // RECONCILIAÇÃO DETERMINÍSTICA: Substituir tempId pelo real
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!Array.isArray(old)) return old
          return old.map((item: any) => {
            if (item.id === context.tempId) {
              return { 
                ...data, 
                _optimistic: false, 
                _source: 'server' 
              }
            }
            return item
          }) as TData
        })
      } else {
        // Para updates, o invalidate standard garante consistência
        await queryClient.invalidateQueries({ queryKey })
      }

      onSuccess?.(data, variables)
    },

    onSettled: (data, error, variables, context: any) => {
      // Se não for create (onde fazemos reconcile manual), invalidamos para garantir.
      if (!isCreate) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}

