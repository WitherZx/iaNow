import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await req.json()
    console.log('API Deleting Strategy ID:', id)

    if (!id) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const adminClient = createAdminClient() as any
    const { data, error } = await adminClient
      .from('strategies')
      .update({ deleted_at: new Date().toISOString(), status: 'archived' })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Supabase Delete Error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error('No record found with ID:', id)
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    console.log('Successfully deleted strategy:', id)
    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    console.error('Delete Strategy API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
