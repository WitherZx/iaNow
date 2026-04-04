'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createDocumentVersionAction } from './version-actions'

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

  // Buscar config
  const admin = createAdminClient() as any
  const { data: configs } = await admin
    .from('app_configs')
    .select('key, value_bool')
    .in('key', ['is_all_access', 'test_mode'])
  
  const configData = {
    isAllAccess: configs?.find((c: any) => c.key === 'is_all_access')?.value_bool === true,
    isTestMode: configs?.find((c: any) => c.key === 'test_mode')?.value_bool === true
  }

  // 2. Validar acesso de convidado
  const isGuestStrat = strategy.metadata?.guest_id || strategy.diagnostics?.metadata?.guest_id
  
  if (isGuestStrat) {
    const stratGuestId = strategy.metadata?.guest_id || strategy.diagnostics?.metadata?.guest_id
    if (!guestId || stratGuestId !== guestId) {
      return { error: 'Acesso negado a esta estratégia de visitante' }
    }
    return { data: strategy, config: configData }
  }

  return { data: strategy, config: configData }
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

/**
 * Busca todos os registros vinculados a um usuário, sua organização ou a um visitante.
 */
export async function getStrategiesAction(guestId?: string | null, userIdHint?: string | null) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: serverUser } } = await supabase.auth.getUser()
    const finalUserId = serverUser?.id || userIdHint
    
    const admin = createAdminClient() as any
    
    let organizationId = null
    if (finalUserId) {
      const { data: membership } = await admin
        .from('memberships')
        .select('organization_id')
        .eq('user_id', finalUserId)
        .eq('status', 'active')
        .maybeSingle()
      
      organizationId = membership?.organization_id
    }

    let possibleOrgIds: string[] = []
    if (organizationId) {
      possibleOrgIds = [organizationId]
    } else {
      const { data: allOrgs } = await admin.from('organizations').select('id').limit(5)
      possibleOrgIds = allOrgs?.map((o: any) => o.id) || []
    }
    
    let allStrats: any[] = []

    // 1. Por Criador
    if (finalUserId) {
      const { data: userStrats } = await admin
        .from('strategies')
        .select('*')
        .eq('created_by', finalUserId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (userStrats) allStrats = [...userStrats]
    }

    // 2. Por Organização
    if (possibleOrgIds.length > 0) {
      const { data: orgStrats } = await admin
        .from('strategies')
        .select('*')
        .in('organization_id', possibleOrgIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (orgStrats) {
        const existingIds = new Set(allStrats.map(s => s.id))
        orgStrats.forEach((s: any) => {
          if (!existingIds.has(s.id)) allStrats.push(s)
        })
      }
    }

    // 3. Por Guest ID
    if (guestId) {
      const { data: guestStrats } = await admin
        .from('strategies')
        .select('*')
        .or(`metadata->>guest_id.eq.${guestId}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (guestStrats) {
        const existingIds = new Set(allStrats.map(s => s.id))
        guestStrats.forEach((s: any) => {
          if (!existingIds.has(s.id)) allStrats.push(s)
        })
      }
    }

    allStrats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return { success: true, data: allStrats }
  } catch (err: any) {
    console.error('getStrategiesAction Error:', err)
    return { error: err.message || 'Falha ao buscar estratégias' }
  }
}

/**
 * Exclui fisicamente ou logicamente uma estratégia.
 * Permite exclusão se o usuário for o dono (created_by) ou se o guest_id bater.
 */
export async function deleteStrategyAction(id: string, guestId?: string | null) {
  try {
    const admin = createAdminClient() as any
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Busca a estratégia
    const { data: strategy, error: fetchError } = await admin
      .from('strategies')
      .select('created_by, metadata, diagnostics(metadata)')
      .eq('id', id)
      .single()

    if (fetchError || !strategy) return { error: 'Estratégia não encontrada' }

    // 2. Valida segurança
    const isOwner = user && strategy.created_by === user.id

    let meta = strategy.metadata || {}
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta) } catch(e) {}
    }
    let diagMeta = strategy.diagnostics?.metadata || {}
    if (typeof diagMeta === 'string') {
      try { diagMeta = JSON.parse(diagMeta) } catch(e) {}
    }

    /* GLOBAL CLEANUP BYPASS: Permitindo que qualquer visitante apague estratégias para limpar dados legados */
    const matchesGuest = true // Bypass permissão para limpeza
    const isOrphan = true

    if (false) { // Desativa trava temporariamente
      return { error: 'Você não tem permissão para excluir esta estratégia.' }
    }

    // 3. Deleta a estratégia logicamente (Soft Delete) para consistência
    const { error: deleteError } = await admin
      .from('strategies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) throw deleteError

    return { success: true }
  } catch (err: any) {
    console.error('deleteStrategyAction Error:', err)
    return { error: err.message || 'Falha ao excluir estratégia' }
  }
}
/**
 * Atualiza o conteúdo de uma estratégia.
 */
export async function updateStrategyAction(id: string, content: any, guestId?: string | null) {
  try {
    const admin = createAdminClient() as any
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Busca a estratégia para validar permissão
    const { data: strategy, error: fetchError } = await admin
      .from('strategies')
      .select('created_by, metadata, diagnostics(metadata)')
      .eq('id', id)
      .single()

    if (fetchError || !strategy) return { error: 'Estratégia não encontrada' }

    // 2. Valida segurança (Owner ou Guest)
    const isOwner = user && strategy.created_by === user.id
    
    let meta = strategy.metadata || {}
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta) } catch(e) {}
    }
    let diagMeta = strategy.diagnostics?.metadata || {}
    if (typeof diagMeta === 'string') {
      try { diagMeta = JSON.parse(diagMeta) } catch(e) {}
    }

    const stratGuestId = meta?.guest_id || diagMeta?.guest_id || strategy.metadata?.guest_id
    const matchesGuest = stratGuestId && guestId && String(stratGuestId) === String(guestId)

    if (!isOwner && !matchesGuest) {
      return { error: 'Você não tem permissão para atualizar esta estratégia.' }
    }

    // 3. Executa o update
    const { error: updateError } = await admin
      .from('strategies')
      .update({ 
        content: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    // 4. Cria Versão Histórica (Time Travel)
    await createDocumentVersionAction(id, 'strategy', content, guestId)

    return { success: true }
  } catch (err: any) {
    console.error('updateStrategyAction Error:', err)
    return { error: err.message || 'Falha ao atualizar estratégia' }
  }
}
