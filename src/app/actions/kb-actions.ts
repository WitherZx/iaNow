'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function searchKnowledgeBase(query?: string, category?: 'juridico' | 'estrategia' | 'geral', sessionId?: string | null) {
  const supabase = await createServerSupabaseClient()

  let dbQuery = supabase
    .from('kb_documents')
    .select('title, content, category, tags')
    .eq('active', true)

  // PRIORIDADE: Documentos da sessão atual ou globais (null)
  if (sessionId) {
    dbQuery = dbQuery.or(`session_id.eq.${sessionId},session_id.is.null`)
  } else {
    dbQuery = dbQuery.is('session_id', null)
  }

  if (category) {
    dbQuery = dbQuery.eq('category', category)
  }

  // Se houver uma query, faz a busca textual (fallback simples ao vector)
  if (query && query.trim().length > 3) {
    // Usando Full Text Search do PostgreSQL ou ILIKE como fallback imediato
    dbQuery = dbQuery.textSearch('content', query, {
      config: 'portuguese',
      type: 'phrase'
    })
  }

  const { data, error } = await dbQuery.limit(3)

  if (error) {
    console.error('Error fetching knowledge base:', error)
    // Se falhar o textSearch (tabela vazia ou erro de extensão), fallback p/ select simples
    const { data: fallbackData } = await supabase
      .from('kb_documents')
      .select('*')
      .limit(2)
    return { documents: fallbackData || [] }
  }

  return { documents: data }
}

export async function addKnowledgeDocument({ title, content, category, tags = [], sessionId = null }: {
  title: string,
  content: string,
  category: 'juridico' | 'estrategia' | 'geral',
  tags?: string[],
  sessionId?: string | null
}) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('kb_documents')
    .insert({ title, content, category, tags, session_id: sessionId })
    .select()
    .single()

  if (error) {
    console.error('Error adding knowledge document:', error)
    return { error: 'Failed to add document' }
  }

  return { document: data }
}
