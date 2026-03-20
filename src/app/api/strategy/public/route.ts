import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('strategies')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    // Return only necessary data for visualization if needed, 
    // but for now we return the whole strategy as the page expects it.
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Public Strategy API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
