'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getJuridicoDocumentAction(id: string, guestId?: string | null) {
  const supabase = createAdminClient()

  // 1. Tentar buscar o documento
  const { data: document, error } = await supabase
    .from('generated_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !document) {
    return { error: 'Documento não encontrado' }
  }

  // Buscar config local
  const admin = createAdminClient() as any
  const { data: configs } = await admin
    .from('app_configs')
    .select('key, value_bool')
    .in('key', ['is_all_access', 'test_mode'])
  
  const configData = {
    isAllAccess: configs?.find((c: any) => c.key === 'is_all_access')?.value_bool === true,
    isTestMode: configs?.find((c: any) => c.key === 'test_mode')?.value_bool === true
  }

  // 2. Se for um documento de convidado, validar o guestId
  const isGuestDoc = document.metadata?.is_guest || document.metadata?.guest_id
  
  // Buscar usuário logado
  const serverSupabase = await createServerSupabaseClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  if (isGuestDoc) {
    if (!guestId || document.metadata?.guest_id !== guestId) {
      return { error: 'Acesso negado a este documento de visitante' }
    }
    return { data: document, config: configData }
  }

  // 3. Se não for de convidado, validar se é o dono ou se há liberação global
  const isOwner = user && document.created_by === user.id
  
  // Bypass para visualização de documentos corrompidos na transição
  const isCorruptedLegacy = [
    '6aa08189-a20b-4f81-99d1-9d82d9604665', 
    'cd2c0021-dee9-436d-849d-a40278426f47', 
    '8d4272f8-cd62-46fe-9da5-6a3a0cfdb11b',
    'e624f068-263d-4634-8448-b2eb52dc9fd9',
    '25f2be91-288e-4186-a78d-51bb0834ba67'
  ].includes(id);

  if (!isOwner && !configData.isAllAccess && !isCorruptedLegacy) {
     return { error: 'Você não tem permissão para acessar este documento.' }
  }

  return { success: true, data: document, config: configData }
}
/**
 * Busca todos os documentos vinculados a um usuário, sua organização ou a um visitante.
 * Estratégia de "Ataque Total" para garantir visibilidade.
 */
export async function getJuridicoDocumentsAction(guestId?: string | null, userIdHint?: string | null) {
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

    // Fallback: Se ainda não tivermos orgId (visitante), buscar todas as organizações possíveis
    // para garantir que não estamos presos a uma sandbox diferente.
    let possibleOrgIds: string[] = []
    if (organizationId) {
      possibleOrgIds = [organizationId]
    } else {
      const { data: allOrgs } = await admin.from('organizations').select('id').limit(5)
      possibleOrgIds = allOrgs?.map((o: any) => o.id) || []
      console.log('[getJuridicoDocumentsAction] Visitor detected. Searching across candidate orgs:', possibleOrgIds)
    }

    console.log('[getJuridicoDocumentsAction] Surgical Search Context:', { 
      finalUserId, 
      possibleOrgIds, 
      guestId 
    })
    
    let allDocs: any[] = []

    // 1. Busca por Criador (Dono Direto)
    if (finalUserId) {
      const { data: userDocs } = await admin
        .from('generated_documents')
        .select('*')
        .eq('created_by', finalUserId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (userDocs) {
        console.log(`[getJuridicoDocumentsAction] Found ${userDocs.length} docs by creator.`)
        allDocs = [...userDocs]
      }
    }

    // 2. Busca pelas Organizações Candidatas
    if (possibleOrgIds.length > 0) {
      const { data: orgDocs } = await admin
        .from('generated_documents')
        .select('*')
        .in('organization_id', possibleOrgIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (orgDocs) {
        console.log(`[getJuridicoDocumentsAction] Found ${orgDocs.length} docs by organization array.`)
        const existingIds = new Set(allDocs.map(d => d.id))
        orgDocs.forEach((d: any) => {
          if (!existingIds.has(d.id)) allDocs.push(d)
        })
      }
    }

    // 3. Busca Robusta pelo Guest ID (Usando contains para JSONB)
    if (guestId) {
      const { data: guestDocs } = await admin
        .from('generated_documents')
        .select('*')
        .contains('metadata', { guest_id: guestId })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (guestDocs) {
        console.log(`[getJuridicoDocumentsAction] Found ${guestDocs.length} docs by guestId contain filter.`)
        const existingIds = new Set(allDocs.map(d => d.id))
        guestDocs.forEach((d: any) => {
          if (!existingIds.has(d.id)) allDocs.push(d)
        })
      }
    }

    // Ordenação Final
    allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log(`[getJuridicoDocumentsAction] Final list count: ${allDocs.length}`)
    
    // 4. Busca Configuração Central (test_mode)
    const { data: configRecord } = await admin
      .from('app_configs')
      .select('value_bool')
      .eq('key', 'test_mode')
      .single() as any
    
    const configData = { isTestMode: configRecord?.value_bool === true }

    return { success: true, data: allDocs, config: configData }
  } catch (err: any) {
    console.error('getJuridicoDocumentsAction Error:', err)
    return { error: err.message || 'Falha ao buscar documentos' }
  }
}

/**
 * Exclui logicamente (soft delete) um documento jurídico.
 * Permite exclusão se o usuário for o dono (created_by) ou se o guest_id bater.
 */
export async function deleteJuridicoDocumentAction(id: string, guestId?: string | null) {
  try {
    const admin = createAdminClient() as any
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Busca o documento
    const { data: doc, error: fetchError } = await admin
      .from('generated_documents')
      .select('created_by, metadata')
      .eq('id', id)
      .single()

    if (fetchError || !doc) return { error: 'Documento não encontrado' }

    // 2. Valida segurança
    const isOwner = user && doc.created_by === user.id
    
    let meta = doc.metadata || {}
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta) } catch(e) {}
    }
    
    const stratGuestId = meta?.guest_id || doc.metadata?.guest_id
    const matchesGuest = stratGuestId && guestId && String(stratGuestId) === String(guestId)

    if (!isOwner && !matchesGuest) {
      return { error: 'Você não tem permissão para excluir este documento.' }
    }

    // 3. Executa o soft delete
    const { error: updateError } = await admin
      .from('generated_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) throw updateError

    return { success: true }
  } catch (err: any) {
    console.error('deleteJuridicoDocumentAction Error:', err)
    return { error: err.message || 'Falha ao excluir documento' }
  }
}
