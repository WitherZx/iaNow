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

    const { id, content } = await req.json()
    console.log('API Updating Strategy ID:', id)

    if (!id || !content) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const adminClient: any = createAdminClient()
    const { data, error } = await adminClient
      .from('strategies')
      .update({ content: content } as any)
      .eq('id', id)
      .select()

    if (error) {
      console.error('Supabase Update Error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error('No record found with ID:', id)
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    console.log('Successfully updated strategy:', id)
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Update Strategy API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
