'use server'

import { getGlobalConfigsAction, getMyOrgAction, getPlansAction } from './billing-actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function fetchUserConfigAction() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'Não autenticado' }
    }

    // Parallel fetch for peak performance
    const [configsRes, orgRes, plansRes] = await Promise.all([
      getGlobalConfigsAction(),
      getMyOrgAction(),
      getPlansAction()
    ])

    const userData = {
      id: user.id,
      nome: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
      email: user.email || '',
      avatar_url: user.user_metadata?.avatar_url || ''
    }

    const orgData = orgRes.success ? orgRes.data : null
    let orgProfileData = null

    if (orgData) {
      const meta = (orgData.metadata as Record<string, any>) || {}
      if (meta.representante_legal) {
        const rep = meta.representante_legal as any
        orgProfileData = {
          nome: rep.nome || userData.nome,
          email: userData.email,
          cargo: rep.cargo || 'Administrador Master',
          telefone: (meta.telefone as string) || '',
          cpf: rep.cpf || '',
          avatar_url: userData.avatar_url
        }
      }
    }

    return {
      success: true,
      data: {
        user: userData,
        org: orgData,
        plans: plansRes.success ? plansRes.data || [] : [],
        configs: configsRes.success ? configsRes.data || {} : {},
        orgProfileData
      }
    }
  } catch (err: any) {
    console.error('[fetchUserConfigAction] Error:', err)
    return { success: false, error: err.message }
  }
}
