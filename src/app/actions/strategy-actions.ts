'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function getStrategyAction(id: string, guestId?: string | null) {
  const supabase = createAdminClient()

  // 1. Tentar buscar a estratégia
  const { data: strategy, error } = await supabase
    .from('strategies')
    .select('*, diagnostics(*)')
    .eq('id', id)
    .single()

  if (error || !strategy) {
    return { error: 'Estratégia não encontrada' }
  }

  // 2. Validar acesso de convidado
  const isGuestStrat = strategy.metadata?.guest_id || strategy.diagnostics?.metadata?.guest_id
  
  if (isGuestStrat) {
    const stratGuestId = strategy.metadata?.guest_id || strategy.diagnostics?.metadata?.guest_id
    if (!guestId || stratGuestId !== guestId) {
      return { error: 'Acesso negado a esta estratégia de visitante' }
    }
    return { data: strategy }
  }

  return { data: strategy }
}
/**
 * Busca todas as estratégias de um visitante (guest).
 */
export async function getGuestStrategiesAction(guestId: string) {
  try {
    if (!guestId) return { data: [] }
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('strategies')
      .select('*')
      .eq('metadata->>guest_id', guestId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('getGuestStrategiesAction Error:', err)
    return { error: err.message || 'Falha ao buscar estratégias do visitante' }
  }
}
