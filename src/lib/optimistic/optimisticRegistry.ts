/**
 * Registro de IDs deletados otimisticamente.
 * Funciona como um "Tombstone" para evitar que eventos de Realtime
 * façam o item ressurgir na UI antes que o Supabase processe o DELETE.
 */

const deletedIds = new Set<string>()

/**
 * Marca um ID como deletado localmente.
 * O ID será mantido no registro por 10 segundos (TTL).
 */
export const markDeleted = (id: string) => {
  deletedIds.add(id)
  // Remove após 30 segundos para dar tempo do Realtime sincronizar a deleção real
  setTimeout(() => {
    deletedIds.delete(id)
  }, 30000)
}

/**
 * Verifica se um ID está no registro de deleções recentes.
 */
export const isDeleted = (id: string) => {
  return deletedIds.has(id)
}
