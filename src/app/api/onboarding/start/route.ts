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
    let { data: membership } = await adminClient
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle() as any

    let orgId = membership?.organization_id

    // IF NO ORGANIZATION FOUND: Create a default one to allow onboarding to start
    if (!orgId) {
      console.log('User has no organization, creating default one for user:', user.id)
      
      const placeholderName = 'Minha Organização'
      const slug = placeholderName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50)
      const uniqueSlug = `${slug}-${Date.now().toString(36)}`

      // a. Create organization
      const { data: newOrg, error: orgError } = await adminClient
        .from('organizations')
        .insert({ 
          name: placeholderName, 
          slug: uniqueSlug, 
          email: user.email, 
          status: 'trial' 
        })
        .select('id')
        .single() as any

      if (orgError) {
        console.error('Error creating default organization:', orgError)
        throw new Error(`Failed to create default organization: ${orgError.message}`)
      }

      orgId = newOrg.id

      // b. Find admin role
      const { data: adminRole } = await adminClient
        .from('roles')
        .select('id')
        .eq('name', 'admin')
        .is('organization_id', null)
        .single() as any

      if (!adminRole) {
        console.error('Admin role not found in system')
        throw new Error('System configuration error: Admin role not found')
      }

      // c. Create membership
      const { error: memError } = await adminClient
        .from('memberships')
        .insert({
          organization_id: orgId,
          user_id: user.id,
          role_id: adminRole.id,
          status: 'active',
          joined_at: new Date().toISOString()
        })

      if (memError) {
        console.error('Error creating membership:', memError)
        throw new Error(`Failed to create membership: ${memError.message}`)
      }

      // d. Update app_metadata for JWT
      await adminClient.auth.admin.updateUserById(user.id, {
        app_metadata: { organization_id: orgId }
      })
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
