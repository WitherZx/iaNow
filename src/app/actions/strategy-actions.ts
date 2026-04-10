'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createDocumentVersionAction } from './version-actions'

export async function getStrategyAction(id: string) {
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

  // 2. Validar acesso (Dono Real)
  const serverSupabase = await createServerSupabaseClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  
  if (!user || strategy.created_by !== user.id) {
     const { data: membership } = await admin
       .from('memberships')
       .select('organization_id')
       .eq('user_id', user?.id)
       .eq('organization_id', strategy.organization_id)
       .eq('status', 'active')
       .maybeSingle()
     
     if (!membership && !configData.isAllAccess) {
       return { error: 'Acesso negado a esta estratégia' }
     }
  }

  return { data: strategy, config: configData }
}
/**
 * Busca todos os registros vinculados à organização do usuário.
 */
export async function getStrategiesAction() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user : serverUser } } = await supabase.auth.getUser()
    
    if (!serverUser) return { error: 'Unauthorized' }

    const admin = createAdminClient() as any
    
    // 1. Buscar a organização ativa do usuário
    const { data: membership } = await admin
      .from('memberships')
      .select('organization_id')
      .eq('user_id', serverUser.id)
      .eq('status', 'active')
      .maybeSingle()
    
    if (!membership) return { data: [] }
    const organizationId = membership.organization_id

    // 2. Buscar todas as estratégias da organização
    const { data: strategies, error } = await admin
      .from('strategies')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return { success: true, data: strategies || [] }
  } catch (err: any) {
    console.error('getStrategiesAction Error:', err)
    return { error: err.message || 'Falha ao buscar estratégias' }
  }
}

/**
 * Exclui fisicamente ou logicamente uma estratégia.
 * Permite exclusão se o usuário for o dono (created_by).
 */
export async function deleteStrategyAction(id: string) {
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
    if (!isOwner) {
       // Checa se está na mesma organização e tem permissão
       const { data: membership } = await admin
         .from('memberships')
         .select('id')
         .eq('user_id', user?.id)
         .eq('organization_id', strategy.organization_id)
         .maybeSingle()
       
       if (!membership) return { error: 'Você não tem permissão para excluir esta estratégia.' }
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
export async function updateStrategyAction(
  id: string, 
  content: any, 
  options?: { lastUpdatedAt?: string; force?: boolean }
) {
  try {
    const admin = createAdminClient() as any
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Busca a estratégia para validar permissão
    const { data: strategy, error: fetchError } = await admin
      .from('strategies')
      .select('created_by, metadata, updated_at, diagnostics(metadata)')
      .eq('id', id)
      .single()

    if (fetchError || !strategy) return { error: 'Estratégia não encontrada' }

    // 2. Valida segurança (Owner)
    const isOwner = user && strategy.created_by === user.id
    if (!isOwner) {
       const { data: membership } = await admin
         .from('memberships')
         .select('id')
         .eq('user_id', user?.id)
         .eq('organization_id', strategy.organization_id)
         .maybeSingle()
       
       if (!membership) return { error: 'Você não tem permissão para atualizar esta estratégia.' }
    }

    // 2.1 Detecção de Conflito (Servidor como Autoridade)
    if (!options?.force && options?.lastUpdatedAt && strategy.updated_at) {
      const serverTime = new Date(strategy.updated_at).getTime()
      const clientTime = new Date(options.lastUpdatedAt).getTime()

      if (serverTime > clientTime) {
        console.warn(`[SyncConflict] Entity ${id} diverged. Server: ${strategy.updated_at}, Client: ${options.lastUpdatedAt}`)
        return { 
          conflict: true, 
          remoteData: strategy,
          message: 'Os dados no servidor são mais recentes.'
        }
      }
    }

    // 3. Executa o update com trilha de auditoria se houver force
    const updatedMeta = {
      ...meta,
      ...(options?.force ? { 
        updated_by_force: true, 
        conflict_resolved_at: new Date().toISOString() 
      } : {})
    }

    const { error: updateError } = await admin
      .from('strategies')
      .update({ 
        content: content,
        metadata: updatedMeta,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    // 4. Cria Versão Histórica (Time Travel)
    await createDocumentVersionAction(id, 'strategy', content)

    return { success: true }
  } catch (err: any) {
    console.error('updateStrategyAction Error:', err)
    return { error: err.message || 'Falha ao atualizar estratégia' }
  }
}
