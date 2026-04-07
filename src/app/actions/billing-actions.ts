
'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Busca todas as configurações globais da plataforma.
 */
export async function getGlobalConfigsAction() {
  try {
    const admin = createAdminClient() as any
    
    // Tenta buscar todas as colunas. Se value_number/value_text não existirem ainda,
    // o Supabase retorna erro — então fazemos um fallback para apenas value_bool.
    let data: any[] = []
    const { data: fullData, error: fullError } = await admin
      .from('app_configs')
      .select('key, value_bool, value_number, value_text')
    
    if (fullError) {
      // Provavelmente as colunas value_number/value_text ainda não existem
      console.warn('getGlobalConfigsAction: fallback to value_bool only —', fullError.message)
      const { data: boolData, error: boolError } = await admin
        .from('app_configs')
        .select('key, value_bool')
      if (boolError) throw boolError
      data = boolData || []
    } else {
      data = fullData || []
    }

    // Converte array para mapa de fácil acesso: { key: value }
    const configMap: Record<string, any> = {}
    data.forEach((c: any) => {
      if (c.value_bool !== null && c.value_bool !== undefined) configMap[c.key] = c.value_bool
      else if (c.value_number !== null && c.value_number !== undefined) configMap[c.key] = c.value_number
      else if (c.value_text !== null && c.value_text !== undefined) configMap[c.key] = c.value_text
    })

    console.log('[getGlobalConfigsAction] Config map:', configMap)
    return { success: true, data: configMap }
  } catch (err: any) {
    console.error('getGlobalConfigsAction Error:', err)
    return { success: false, data: {}, error: err.message }
  }
}

/**
 * Busca a organização do usuário autenticado via admin client (ignora RLS).
 */
export async function getMyOrgAction() {
  try {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { success: false, data: null, error: 'Não autenticado' }

    const admin = createAdminClient() as any

    // 1. Tenta por membership (admin bypass RLS)
    const { data: membership } = await admin
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    // 2. Fallback: org_id no app_metadata do JWT
    const orgId = membership?.organization_id || user.app_metadata?.organization_id
    if (!orgId) return { success: true, data: null }

    // 3. Busca org completa + plano
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .select('*, plans(*)')
      .eq('id', orgId)
      .single()

    if (orgError) throw orgError

    // 4. Injeta preço dinâmico no plano
    const { data: configs } = await getGlobalConfigsAction()
    if (configs && org.plans) {
      const configKey = `price_${org.plans.slug}_monthly`
      const dynamicPrice = (configs as Record<string, any>)[configKey]
      if (dynamicPrice) org.plans = { ...org.plans, price_monthly: dynamicPrice }
    }

    return { success: true, data: org }
  } catch (err: any) {
    console.error('getMyOrgAction Error:', err)
    return { success: false, data: null, error: err.message }
  }
}

/**
 * Busca todos os planos ativos, injetando preços dinâmicos da app_configs.
 */
export async function getPlansAction() {
  try {
    const admin = createAdminClient() as any
    
    // 1. Busca Planos
    const { data: plans, error: plansError } = await admin
      .from('plans')
      .select('*')
      .eq('status', 'active')
      .eq('is_public', true)
      .order('price_monthly', { ascending: true })

    if (plansError) throw plansError

    // 2. Busca Preços Centrais (Fallback)
    const { data: configs } = await getGlobalConfigsAction()
    
    const mergedPlans = plans?.map((p: any) => {
      // Se houver um preço específico na app_configs para o slug deste plano, use-o
      // Formato esperado: price_{slug}_monthly
      const configKey = `price_${p.slug}_monthly`
      const dynamicPrice = (configs as Record<string, any> | undefined)?.[configKey]
      
      return {
        ...p,
        price_monthly: dynamicPrice ?? p.price_monthly
      }
    })

    return { success: true, data: mergedPlans }
  } catch (err: any) {
    console.error('getPlansAction Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Busca o plano atual da organização (com preço dinâmico).
 */
export async function getOrgPlanAction(orgId: string) {
  try {
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('organizations')
      .select('*, plans(*)')
      .eq('id', orgId)
      .single()

    if (error) throw error
    if (!data.plans) return { success: true, data: null }

    // Aplica Preço Dinâmico
    const { data: configs } = await getGlobalConfigsAction()
    const configKey = `price_${data.plans.slug}_monthly`
    const dynamicPrice = (configs as Record<string, any> | undefined)?.[configKey]

    const mergedPlan = {
      ...data.plans,
      price_monthly: dynamicPrice ?? data.plans.price_monthly
    }

    return { success: true, data: mergedPlan }
  } catch (err: any) {
    console.error('getOrgPlanAction Error:', err)
    return { success: false, error: err.message }
  }
}
