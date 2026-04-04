'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DataJudService } from '@/lib/services/datajud'
import { createDocumentVersionAction } from './version-actions'

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

    // Busca Configurações Centralizadas (App Configs)
    const { data: configs } = await admin
      .from('app_configs')
      .select('key, value_bool')
      .in('key', ['is_all_access', 'test_mode']) as any

    const isAllAccessGlobal = configs?.find((c: any) => c.key === 'is_all_access')?.value_bool === true
    const isTestModeGlobal = configs?.find((c: any) => c.key === 'test_mode')?.value_bool === true

    // Validação de Segurança:
    const isOwner = user && data.user_id === user.id
    const matchesGuest = guestId && data.metadata?.guest_id === guestId
    
    if (!isOwner && !matchesGuest && !isAllAccessGlobal) {
      return { error: 'Você não tem permissão para acessar esta demanda.' }
    }

    return { 
      success: true, 
      data, 
      config: { 
        isAllAccess: isAllAccessGlobal, 
        isTestMode: isTestModeGlobal
      } 
    }
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

/**
 * Consulta um processo real na base do DataJud (Server-Side).
 */
export async function getRemoteProcessInfoAction(processNumber: string) {
  try {
    if (!processNumber) return { error: 'Número do processo ausente.' }
    const status = await DataJudService.getProcessInfo(processNumber)
    return { success: true, data: status }
  } catch (err: any) {
    console.error('getRemoteProcessInfoAction Error:', err)
    return { error: err.message || 'Falha na consulta ao DataJud' }
  }
}

/**
 * Cria uma nova demanda jurídica de forma segura (admin client para guests).
 */
export async function createJusticeDemandAction(demandData: any) {
  try {
    const admin = createAdminClient() as any
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Se não tiver organização, busca a primeira (Sandbox)
    let orgId = demandData.organization_id
    if (!orgId) {
      const { data: orgs } = await admin.from('organizations').select('id').limit(1)
      orgId = orgs?.[0]?.id
    }

    // Se não tiver usuário (Guest), buscamos o primeiro usuário da organização para servir de âncora
    let finalUserId = user?.id || null
    if (!finalUserId) {
      const { data: firstMember } = await admin
        .from('memberships')
        .select('user_id')
        .eq('organization_id', orgId)
        .limit(1)
        .single() as any
      finalUserId = firstMember?.user_id || null
    }

    const { data, error } = await admin
      .from('justice_demands')
      .insert({
        ...demandData,
        organization_id: orgId,
        user_id: finalUserId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('createJusticeDemandAction Error:', err)
    return { error: err.message || 'Falha ao criar demanda' }
  }
}

/**
 * Simula uma compra para testes (apenas se test_mode estiver ativo).
 */
export async function simulatePurchaseAction(id: string, type: 'contrato' | 'estrategia' | 'processo' = 'processo') {
  try {
    const admin = createAdminClient() as any
    
    // 1. Identifica a tabela correta
    let table = 'justice_demands'
    if (type === 'contrato') table = 'generated_documents'
    else if (type === 'estrategia') table = 'strategies'

    // 2. Busca o documento para validar existência
    const { data: doc } = await admin.from(table).select('metadata').eq('id', id).maybeSingle()
    if (!doc && ![
      '6aa08189-a20b-4f81-99d1-9d82d9604665', 
      'cd2c0021-dee9-436d-849d-a40278426f47', 
      '8d4272f8-cd62-46fe-9da5-6a3a0cfdb11b',
      'e624f068-263d-4634-8448-b2eb52dc9fd9',
      '25f2be91-288e-4186-a78d-51bb0834ba67',
      'a3fc6b2a-5bb9-454c-a68f-20a1b25c8823',
      '406189c7-28fe-45ba-90af-4940ca19182a',
      '994bd41c-a320-43d4-a527-b51d64889882'
    ].includes(id)) {
      return { error: 'Documento não encontrado para simulação' }
    }

    // 3. Busca Configuração Central (test_mode)
    const { data: config } = await admin
      .from('app_configs')
      .select('value_bool')
      .eq('key', 'test_mode')
      .single() as any
    
    if (config?.value_bool !== true) {
      return { error: 'Opção disponível apenas em Modo de Teste Global.' }
    }

    // 4. Executa o desbloqueio
    // Para Processos, usamos is_paid
    if (type === 'processo') {
      await admin.from('justice_demands').update({ is_paid: true }).eq('id', id)
    } 
    
    // Independente do tipo, injetamos 'unlocked: true' no metadata para garantir que o Paywall saia da frente
    const currentMeta = doc?.metadata || {}
    await admin.from(table).update({ 
      metadata: { ...currentMeta, unlocked: true, single_purchase_paid: true } 
    }).eq('id', id)

    return { success: true }
  } catch (err: any) {
    console.error('simulatePurchaseAction Error:', err)
    return { error: 'Falha na simulação: ' + err.message }
  }
}

/**
 * Exclui logicamente (soft delete) uma demanda jurídica.
 * Permite exclusão se o usuário for o dono (user_id) ou se o guest_id bater.
 */
export async function deleteJusticeDemandAction(id: string, guestId?: string | null) {
  try {
    const admin = createAdminClient() as any
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Busca a demanda
    const { data: demand, error: fetchError } = await admin
      .from('justice_demands')
      .select('user_id, metadata')
      .eq('id', id)
      .single()

    if (fetchError || !demand) return { error: 'Demanda não encontrada' }

    // 2. Valida segurança
    const isOwner = user && demand.user_id === user.id
    let meta = demand.metadata || {}
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta) } catch(e) {}
    }

    const demandGuestId = meta?.guest_id || demand.metadata?.guest_id
    const matchesGuest = demandGuestId && guestId && String(demandGuestId) === String(guestId)

    if (!isOwner && !matchesGuest) {
      return { error: 'Você não tem permissão para excluir esta demanda.' }
    }

    // 3. Executa o soft delete
    const { error: updateError } = await admin
      .from('justice_demands')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) throw updateError

    return { success: true }
  } catch (err: any) {
    console.error('deleteJusticeDemandAction Error:', err)
    return { error: err.message || 'Falha ao excluir demanda' }
  }
}

/**
 * Atualiza o metadata de uma demanda (para sincronização de tracking, análise, e edição de petição).
 * Permite atualização se o usuário for o dono (user_id) ou se o guest_id bater.
 */
export async function updateJusticeDemandMetadataAction(id: string, metadata: any, guestId?: string | null) {
  try {
    const admin = createAdminClient() as any
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Busca a demanda
    const { data: demand, error: fetchError } = await admin
      .from('justice_demands')
      .select('user_id, metadata')
      .eq('id', id)
      .single()

    if (fetchError || !demand) return { error: 'Demanda não encontrada' }

    // 2. Valida segurança
    const isOwner = user && demand.user_id === user.id
    const matchesGuest = guestId && demand.metadata?.guest_id === guestId

    if (!isOwner && !matchesGuest) {
      return { error: 'Você não tem permissão para atualizar esta demanda.' }
    }
    // 3. Atualiza o banco
    const { error: updateError } = await admin
      .from('justice_demands')
      .update({ metadata })
      .eq('id', id)

    if (updateError) throw updateError

    // 4. Cria Versão Histórica (Time Travel)
    await createDocumentVersionAction(id, 'justice', metadata, guestId)

    return { success: true }
  } catch (err: any) {
    console.error('updateJusticeDemandMetadataAction Error:', err)
    return { error: err.message || 'Falha ao atualizar demanda' }
  }
}

/**
 * Atualiza campos avulsos da demanda (ex: valor_causa, status).
 */
export async function updateJusticeDemandAction(id: string, updates: any, guestId?: string | null) {
  try {
    const admin = createAdminClient() as any
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: demand, error: fetchError } = await admin
      .from('justice_demands')
      .select('user_id, metadata')
      .eq('id', id)
      .single()

    if (fetchError || !demand) return { error: 'Demanda não encontrada' }

    const isOwner = user && demand.user_id === user.id
    const matchesGuest = guestId && demand.metadata?.guest_id === guestId

    if (!isOwner && !matchesGuest) {
      return { error: 'Você não tem permissão para atualizar esta demanda.' }
    }

    const { error: updateError } = await admin
      .from('justice_demands')
      .update(updates)
      .eq('id', id)

    if (updateError) throw updateError
    return { success: true }
  } catch (err: any) {
    console.error('updateJusticeDemandAction Error:', err)
    return { error: err.message || 'Falha ao atualizar demanda' }
  }
}

