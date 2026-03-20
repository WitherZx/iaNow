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

    const { sessionId, stepKey, answers } = await req.json()

    if (!sessionId || !stepKey || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient() as any

    // 1. Get the step
    const { data: step, error: stepFetchError } = await adminClient
      .from('onboarding_steps')
      .select('*')
      .eq('session_id', sessionId)
      .eq('step_key', stepKey)
      .single() as any

    if (stepFetchError || !step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }

    // 2. Save the answers
    const { error: answerError } = await adminClient
      .from('onboarding_answers')
      .insert({
        session_id: sessionId,
        organization_id: step.organization_id,
        step_id: step.id,
        question_key: stepKey,
        answer: answers
      })

    if (answerError) {
      // If conflicting or already exists we could just ignore or handle it (the schema allows multiple rows or we could update)
      // Since there's no unique constraint on question_key alone, we'll just insert.
    }

    // 3. Mark step as completed
    await adminClient
      .from('onboarding_steps')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', step.id)

    // 4. Update session current_step and start next step if any
    const { data: session } = await adminClient
      .from('onboarding_sessions')
      .select('current_step, total_steps')
      .eq('id', sessionId)
      .single() as any

    const isLastStep = session.current_step >= session.total_steps
    const nextStepNum = isLastStep ? session.total_steps : session.current_step + 1

    await adminClient
      .from('onboarding_sessions')
      .update({ current_step: nextStepNum })
      .eq('id', sessionId)

    // Set next step to in_progress
    if (!isLastStep) {
      await adminClient
        .from('onboarding_steps')
        .update({ status: 'in_progress' })
        .eq('session_id', sessionId)
        .eq('step_number', nextStepNum)
    }

    return NextResponse.json({ 
      success: true, 
      isLastStep,
      nextStepNum: nextStepNum
    })

  } catch (error: any) {
    console.error('API Error [onboarding/submit-step]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
