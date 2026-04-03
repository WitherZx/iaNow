'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Busca dados unificados para a Dashboard (Estratégias, Contratos, Justiça).
 * Garante visibilidade para Usuários e Visitantes (Guest).
 */
export async function getDashboardDataAction(guestId?: string | null, userIdHint?: string | null) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: serverUser } } = await supabase.auth.getUser()
    const finalUserId = serverUser?.id || userIdHint
    
    const admin = createAdminClient() as any
    
    // 1. Identificar Organizações (Sandbox default para visitantes)
    let possibleOrgIds: string[] = []
    if (finalUserId) {
      const { data: memberships } = await admin
        .from('memberships')
        .select('organization_id')
        .eq('user_id', finalUserId)
        .eq('status', 'active')
      
      possibleOrgIds = memberships?.map((m: any) => m.organization_id) || []
    }

    // Sempre incluir as organizações sandbox/default se for visitante ou não tiver org
    if (possibleOrgIds.length === 0) {
      const { data: allOrgs } = await admin.from('organizations').select('id').limit(5)
      possibleOrgIds = allOrgs?.map((o: any) => o.id) || []
    }

    console.log('[getDashboardDataAction] Unified Context:', { finalUserId, possibleOrgIds, guestId })

    // 2. Busca Paralela de Métricas e Itens Recentes
    const [
      stratsResult,
      docsResult,
      justiceResult
    ] = await Promise.all([
      // Estratégias
      fetchModuleData(admin, 'strategies', 'organization_id', 'created_by', possibleOrgIds, finalUserId, guestId),
      // Documentos Jurídicos
      fetchModuleData(admin, 'generated_documents', 'organization_id', 'created_by', possibleOrgIds, finalUserId, guestId),
      // Justiça
      fetchModuleData(admin, 'justice_demands', 'organization_id', 'user_id', possibleOrgIds, finalUserId, guestId)
    ])

    return {
      success: true,
      data: {
        strategies: stratsResult,
        legalDocs: docsResult,
        justiceDemands: justiceResult
      }
    }

  } catch (err: any) {
    console.error('getDashboardDataAction Error:', err)
    return { error: err.message || 'Falha ao carregar dados da dashboard' }
  }
}

/**
 * Helper robusto para buscar dados de um módulo com múltiplas vias de identificação.
 */
async function fetchModuleData(
  admin: any, 
  table: string, 
  orgCol: string, 
  userCol: string, 
  orgIds: string[], 
  userId: string | null | undefined, 
  guestId: string | null | undefined
) {
  let allItems: any[] = []

  // Via 1: Por Usuário Direto
  if (userId) {
    const { data } = await admin.from(table).select('*').eq(userCol, userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(10)
    if (data) allItems = [...data]
  }

  // Via 2: Por Organização
  if (orgIds.length > 0) {
    const { data } = await admin.from(table).select('*').in(orgCol, orgIds).is('deleted_at', null).order('created_at', { ascending: false }).limit(10)
    if (data) {
      const existingIds = new Set(allItems.map(i => i.id))
      data.forEach((i: any) => {
        if (!existingIds.has(i.id)) allItems.push(i)
      })
    }
  }

  // Via 3: Por Guest ID nos metadados
  if (guestId) {
    const { data } = await admin.from(table).select('*').contains('metadata', { guest_id: guestId }).is('deleted_at', null).order('created_at', { ascending: false }).limit(10)
    if (data) {
      const existingIds = new Set(allItems.map(i => i.id))
      data.forEach((i: any) => {
        if (!existingIds.has(i.id)) allItems.push(i)
      })
    }
  }

  // Ordenação e Limite Final
  allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return allItems.slice(0, 10)
}
