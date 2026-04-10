'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Registra uma nova versão de um documento.
 */
export async function createDocumentVersionAction(parentId: string, parentType: string, content: any) {
  try {
    const admin = createAdminClient() as any
    
    // Para simplificar, não validamos permissão aqui pois assume-se que 
    // a verificação já foi feita na Server Action de origem (update).
    const { error } = await admin
      .insert({
        parent_id: parentId,
        parent_type: parentType,
        content,
        metadata: {}
      })

    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('createDocumentVersionAction Error:', err)
    return { error: err.message }
  }
}

/**
 * Busca a lista de versões de um documento.
 */
export async function getDocumentVersionsAction(parentId: string, parentType: string) {
  try {
    const admin = createAdminClient() as any
    
    const { data, error } = await admin
      .from('document_versions')
      .select('id, created_at')
      .eq('parent_id', parentId)
      .eq('parent_type', parentType)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('getDocumentVersionsAction Error:', err)
    return { error: err.message }
  }
}

/**
 * Busca o conteúdo de uma versão específica.
 */
export async function getVersionContentAction(versionId: string) {
  try {
    const admin = createAdminClient() as any
    const { data, error } = await admin
      .from('document_versions')
      .select('content')
      .eq('id', versionId)
      .single()

    if (error) throw error
    return { success: true, data: data.content }
  } catch (err: any) {
    console.error('getVersionContentAction Error:', err)
    return { error: err.message }
  }
}
