import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 })
    }

    const adminClient = createAdminClient() as any

    // 1. Mark session as completed
    const { error: completeError } = await adminClient
      .from('onboarding_sessions')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      })
      .eq('id', sessionId)

    if (completeError) throw completeError

    // 2. Fetch all answers to pass to an initial diagnostic / strategy (optional automation here)
    // We will leave the AI generation step to be called from the frontend explicitly or we could trigger it here.
    // O roadmap diz: "Ao completar -> criar diagnostic + enfileirar job IA".
    // We can just bundle the answers and simulate the diagnostic creation.
    
    const { data: answers } = await adminClient
      .from('onboarding_answers')
      .select('*')
      .eq('session_id', sessionId)

    // The frontend can now redirect to dashboard, or hit the AI generation endpoint.
    return NextResponse.json({ 
      success: true, 
      answers_summary: answers?.length || 0 
    })

  } catch (error: any) {
    console.error('API Error [onboarding/complete]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
