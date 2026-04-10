'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createChatSession() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: user?.id || null,
      metadata: { last_active: new Date().toISOString() }
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating chat session:', error)
    return { error: 'Failed to create chat session' }
  }

  return { session: data }
}

export async function getChatMessages(sessionId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching chat messages:', error)
    return { error: 'Failed to fetch messages' }
  }

  return { messages: data }
}

export async function saveChatMessage({
  sessionId,
  role,
  content,
  toolCalls = null
}: {
  sessionId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  toolCalls?: any
}) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      tool_calls: toolCalls
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving chat message:', error)
    return { error: 'Failed to save message' }
  }

  // Update session activity
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  return { message: data }
}

export async function updateSessionMetadata(sessionId: string, metadata: any) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('chat_sessions')
    .update({ 
      metadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)

  if (error) {
    console.error('Error updating session metadata:', error)
    return { error: 'Failed to update metadata' }
  }

  return { success: true }
}

export async function getLatestSession() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase.from('chat_sessions').select('*').order('updated_at', { ascending: false }).limit(1)

  if (user) {
    query = query.eq('user_id', user.id)
  } else {
    return { session: null }
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('Error fetching latest session:', error)
    return { error: 'Failed to fetch latest session' }
  }

  return { session: data }
}
export async function deleteChatSession(sessionId: string) {
  const supabase = await createServerSupabaseClient()

  // Messages will be deleted automatically if there's a cascade delete, 
  // but let's be safe and delete them explicitly if not.
  await supabase
    .from('chat_messages')
    .delete()
    .eq('session_id', sessionId)

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('Error deleting chat session:', error)
    return { error: 'Failed to delete session' }
  }

  return { success: true }
}
