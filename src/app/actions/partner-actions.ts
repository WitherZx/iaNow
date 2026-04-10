'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPartnersAction(orgId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function createPartnerAction(payload: any) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('partners')
    .insert(payload)
    .select('*')
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/parceiros')
  return { data, error: null }
}

export async function updatePartnerAction(id: string, payload: any) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('partners')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/parceiros')
  return { data, error: null }
}

export async function deletePartnerAction(id: string) {
  const supabase = await createServerSupabaseClient()
  // Marcamos como deletado ou removemos fisicamente? 
  // O iaNow prefere deleção física para parceiros por enquanto ou soft delete?
  // O código original usava delete().
  const { error } = await supabase
    .from('partners')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/parceiros')
  return { error: null }
}
