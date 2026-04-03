'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Cria uma conta temporária para um visitante e vincula seus dados.
 */
export async function createGuestAccountAction(guestId: string) {
  try {
    const admin = createAdminClient()
    
    // 1. Gera credenciais aleatórias
    const randomId = Math.random().toString(36).substring(2, 10)
    const email = `visitante_${randomId}@ianow.com.br`
    const password = `temp_${Math.random().toString(36).substring(2, 15)}`
    
    // 2. Cria o usuário no auth do Supabase (Admin para não exigir confirmação de e-mail)
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Visitante iaNow',
        is_temporary: true,
        original_guest_id: guestId
      }
    })

    if (authError || !authUser.user) throw authError

    const userId = authUser.user.id

    // 3. Criar Organização Padrão para o novo usuário
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({
        name: `Minha Empresa (Visitante)`,
        slug: `visitante-${randomId}`,
        status: 'active'
      } as any)
      .select().single() as any

    if (orgError || !org) throw orgError

    // 4. Criar Membership (Admin)
    const { data: adminRole } = await admin
      .from('roles').select('id').eq('name', 'admin').single() as any

    await admin.from('memberships').insert({
      organization_id: org.id,
      user_id: userId,
      role_id: adminRole?.id || 'admin',
      status: 'active'
    } as any)

    // 5. Vincular dados legados do guest_id ao novo userId
    await linkGuestDataToUserAction(userId, guestId)

    return { 
      success: true, 
      credentials: { email, password },
      userId 
    }
  } catch (err: any) {
    console.error('createGuestAccountAction Error:', err)
    return { error: err.message || 'Falha ao criar conta temporária' }
  }
}

/**
 * Vincula todos os registros gerados como convidado a um ID de usuário real.
 */
export async function linkGuestDataToUserAction(userId: string, guestId: string) {
  try {
    const admin = createAdminClient() as any
    
    // 1. Buscar a organização real do usuário
    const { data: membership } = await admin
      .from('memberships')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    const orgId = membership?.organization_id
    if (!orgId) {
      console.warn('linkGuestDataToUserAction: No active organization found for user', userId)
      return { error: 'No active organization found' }
    }

    // 2. Lista de tabelas que possuem guest_id no metadata ou campos de owner
    // Atualizamos tanto o ID do dono quanto o ID da organização real
    await admin
      .from('justice_demands')
      .update({ 
        user_id: userId,
        organization_id: orgId
      })
      .filter('metadata->>guest_id', 'eq', guestId)

    await admin
      .from('generated_documents')
      .update({ 
        created_by: userId,
        organization_id: orgId
      })
      .filter('metadata->>guest_id', 'eq', guestId)

    await admin
      .from('strategies')
      .update({ 
        created_by: userId,
        organization_id: orgId
      })
      .filter('metadata->>guest_id', 'eq', guestId)

    await admin
      .from('diagnostics')
      .update({ 
        created_by: userId,
        organization_id: orgId
      })
      .filter('metadata->>guest_id', 'eq', guestId)
    
    return { success: true }
  } catch (err: any) {
    console.error('linkGuestDataToUserAction Error:', err)
    return { error: err.message }
  }
}
