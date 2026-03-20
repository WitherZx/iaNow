import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_ONBOARDING_STEPS = [
  { step_number: 1, step_key: 'company_info', title: 'Informações da Empresa' },
  { step_number: 2, step_key: 'sector', title: 'Setor e Mercado' },
  { step_number: 3, step_key: 'challenges', title: 'Desafios Principais' },
  { step_number: 4, step_key: 'goals', title: 'Metas e Objetivos' },
]

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient() as any

    // 1. Get user's organization
    const { data: membership } = await adminClient
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .single() as any

    const orgId = membership?.organization_id

    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found for user' }, { status: 404 })
    }

    // 2. Check for existing "in_progress" session
    const { data: existingSession, error: sessionError } = await adminClient
      .from('onboarding_sessions')
      .select('*, onboarding_steps(*)')
      .eq('organization_id', orgId)
      .eq('status', 'in_progress')
      .single() as any

    if (existingSession && !sessionError) {
      return NextResponse.json({ 
        success: true, 
        session: existingSession,
        steps: existingSession.onboarding_steps.sort((a: any, b: any) => a.step_number - b.step_number)
      })
    }

    // 3. Create a new onboarding session
    const { data: newSession, error: createError } = await adminClient
      .from('onboarding_sessions')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        status: 'in_progress',
        current_step: 1,
        total_steps: DEFAULT_ONBOARDING_STEPS.length
      })
      .select()
      .single() as any

    if (createError) throw createError

    // 4. Create the steps for this session
    const stepsToInsert = DEFAULT_ONBOARDING_STEPS.map(step => ({
      session_id: newSession.id,
      organization_id: orgId,
      step_number: step.step_number,
      step_key: step.step_key,
      title: step.title,
      status: step.step_number === 1 ? 'in_progress' : 'pending'
    }))

    const { data: createdSteps, error: stepsError } = await adminClient
      .from('onboarding_steps')
      .insert(stepsToInsert)
      .select()

    if (stepsError) throw stepsError

    return NextResponse.json({ 
      success: true, 
      session: newSession,
      steps: createdSteps?.sort((a: any, b: any) => a.step_number - b.step_number)
    })

  } catch (error: any) {
    console.error('API Error [onboarding/start]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
