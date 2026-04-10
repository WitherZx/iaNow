'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getJuridicoDocumentAction(id: string) {
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

  // 2. Buscar usuário logado e validar acesso
  const serverSupabase = await createServerSupabaseClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  
  if (!user || document.created_by !== user.id) {
     const { data: membership } = await admin
       .from('memberships')
       .select('organization_id')
       .eq('user_id', user?.id)
       .eq('organization_id', document.organization_id)
       .eq('status', 'active')
       .maybeSingle()
     
     if (!membership && !configData.isAllAccess) {
       return { error: 'Acesso negado a este documento' }
     }
  }

  return { success: true, data: document, config: configData }
}
/**
 * Busca todos os documentos vinculados à organização do usuário.
 */
/**
 * Busca todos os documentos vinculados à organização do usuário.
 */
export async function getJuridicoDocumentsAction() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user: serverUser } } = await supabase.auth.getUser()
    
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

    // 2. Buscar todos os documentos da organização
    const { data: documents, error } = await admin
      .from('generated_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // 3. Busca Configuração Central (test_mode)
    const { data: configRecord } = await admin
      .from('app_configs')
      .select('value_bool')
      .eq('key', 'test_mode')
      .single() as any
    
    const configData = { isTestMode: configRecord?.value_bool === true }

    return { success: true, data: documents || [], config: configData }
  } catch (err: any) {
    console.error('getJuridicoDocumentsAction Error:', err)
    return { error: err.message || 'Falha ao buscar documentos' }
  }
}

/**
 * Exclui logicamente (soft delete) um documento jurídico.
 * Permite exclusão se o usuário for o dono (created_by) ou membro da organização vinculada.
 */
export async function deleteJuridicoDocumentAction(id: string) {
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
    if (!isOwner) {
       const { data: membership } = await admin
         .from('memberships')
         .select('id')
         .eq('user_id', user?.id)
         .eq('organization_id', doc.organization_id)
         .maybeSingle()
       
       if (!membership) return { error: 'Você não tem permissão para excluir este documento.' }
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
