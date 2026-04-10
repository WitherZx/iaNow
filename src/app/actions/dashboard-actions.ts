'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'

/**
 * Busca dados unificados para a Dashboard (Estratégias, Contratos, Justiça).
 * Garante visibilidade baseada na organização ativa do usuário.
 */
export async function getDashboardDataAction(userIdHint?: string | null) {
  const supabase = await createServerSupabaseClient()
  const { data: { user: serverUser } } = await supabase.auth.getUser()
  const finalUserId = serverUser?.id || userIdHint
  const cacheKey = finalUserId || 'public'

  // Usamos unstable_cache para armazenar o resultado por 60 segundos
  // ou até que a tag 'dashboard' seja invalidada
  const fetchCachedDashboard = unstable_cache(
    async (uid: string | null | undefined) => {
      try {
        const admin = createAdminClient() as any
        
        let possibleOrgIds: string[] = []
        if (uid) {
          const { data: memberships } = await admin
            .from('memberships')
            .select('organization_id')
            .eq('user_id', uid)
            .eq('status', 'active')
          
          possibleOrgIds = memberships?.map((m: any) => m.organization_id) || []
        }

        if (possibleOrgIds.length === 0) {
          const { data: allOrgs } = await admin.from('organizations').select('id').limit(5)
          possibleOrgIds = allOrgs?.map((o: any) => o.id) || []
        }

        const [stratsResult, docsResult, justiceResult] = await Promise.all([
          fetchModuleData(admin, 'strategies', 'organization_id', 'created_by', possibleOrgIds, uid, 'id, title, description, status, created_at'),
          fetchModuleData(admin, 'generated_documents', 'organization_id', 'created_by', possibleOrgIds, uid, 'id, title, status, created_at, metadata'),
          fetchModuleData(admin, 'justice_demands', 'organization_id', 'user_id', possibleOrgIds, uid, 'id, tipo_acao, valor_causa, status, created_at')
        ])

        return {
          strategies: stratsResult,
          legalDocs: docsResult,
          justiceDemands: justiceResult
        }
      } catch (err) {
        throw err
      }
    },
    [`dashboard-${cacheKey}`],
    { revalidate: 60, tags: ['dashboard', `dashboard-${cacheKey}`] }
  )

  try {
    const data = await fetchCachedDashboard(finalUserId)
    return { success: true, data }
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
  selectFields: string = '*'
) {
  // Construímos uma query única com OR para evitar múltiplos round-trips
  let query = admin
    .from(table)
    .select(selectFields)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  const filters: string[] = []
  if (userId) filters.push(`${userCol}.eq.${userId}`)
  if (orgIds.length > 0) filters.push(`${orgCol}.in.(${orgIds.join(',')})`)

  if (filters.length > 0) {
    const { data } = await query.or(filters.join(','))
    return data || []
  }

  const { data } = await query
  return data || []
}
