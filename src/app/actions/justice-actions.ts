'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Busca os detalhes de uma demanda jurídica de forma segura.
 * Permite acesso se o usuário for o dono (user_id) ou se o guest_id bater.
 */
export async function getJusticeDemandAction(id: string, guestId?: string | null) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const admin = createAdminClient() as any
    
    // Busca com admin para contornar RLS inicialmente e validar manualmente
    const { data, error } = await admin
      .from('justice_demands')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return { error: 'Demanda não encontrada' }

    // Validação de Segurança:
    // 1. O user_id da demanda é o do usuário logado?
    // 2. O guest_id nos metadados bate com o guest_id fornecido?
    const isOwner = user && data.user_id === user.id
    const matchesGuest = guestId && data.metadata?.guest_id === guestId
    
    // Se não for dono nem bater o guest_id, bloqueia
    if (!isOwner && !matchesGuest) {
      return { error: 'Você não tem permissão para acessar esta demanda.' }
    }

    return { success: true, data }
  } catch (err: any) {
    console.error('getJusticeDemandAction Error:', err)
    return { error: err.message || 'Falha ao buscar detalhes da demanda' }
  }
}
/**
 * Busca todas as demandas de um visitante (guest).
 */
export async function getGuestJusticeDemandsAction(guestId: string) {
  try {
    if (!guestId) return { data: [] }
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('justice_demands')
      .select('*')
      .eq('metadata->>guest_id', guestId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('getGuestJusticeDemandsAction Error:', err)
    return { error: err.message || 'Falha ao buscar demandas do visitante' }
  }
}
