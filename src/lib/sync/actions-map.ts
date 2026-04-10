import { updateStrategyAction, deleteStrategyAction } from '@/app/actions/strategy-actions'

/**
 * Mapa central de handlers para mutações do Outbox.
 * Compartilhado entre o SyncEngine (Client) e a Relay API (Server/SW).
 */
export const syncHandlers: Record<string, (payload: any) => Promise<any>> = {
  updateStrategy: async (payload) => {
    const { id, content, options } = payload
    return updateStrategyAction(id, content, options)
  },
  deleteStrategy: async (payload) => {
    const { id } = payload
    return deleteStrategyAction(id)
  }
}
