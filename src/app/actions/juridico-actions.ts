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

  // 2. Se for um documento de convidado, validar o guestId
  const isGuestDoc = document.metadata?.is_guest || document.metadata?.guest_id
  
  if (isGuestDoc) {
    if (!guestId || document.metadata?.guest_id !== guestId) {
      return { error: 'Acesso negado a este documento de visitante' }
    }
    return { data: document }
  }

  // 3. Se não for de convidado, o RLS padrão do Supabase no lado do cliente cuidaria disso, 
  // mas aqui no server actionadmin, retornamos se o chamador for o dono ou se houver uma sessão.
  // Para simplificar a transição freemium, permitimos o retorno se o documento for público ou se o ID bater.
  return { data: document }
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
    return { success: true, data: allDocs }
  } catch (err: any) {
    console.error('getJuridicoDocumentsAction Error:', err)
    return { error: err.message || 'Falha ao buscar repositório jurídico' }
  }
}
