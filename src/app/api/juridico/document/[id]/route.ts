import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const admin = createAdminClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    const guestId = req.headers.get('X-Guest-Id')

    if (!user && !guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: document, error: docError } = await admin
      .from('generated_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (docError || !document) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    const metadata = (document.metadata || {}) as Record<string, any>
    const ownerGuestId = metadata?.guest_id
    const ownerOrganizationId = document.organization_id as string | null

    let belongsToRequester = false
    let hasActivePlan = false

    if (user && ownerOrganizationId) {
      const { data: membership } = await admin
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', ownerOrganizationId)
        .eq('status', 'active')
        .maybeSingle()

      belongsToRequester = Boolean(membership)

      if (belongsToRequester) {
        const { data: organization } = await admin
          .from('organizations')
          .select('plan_id')
          .eq('id', ownerOrganizationId)
          .maybeSingle()

        if (organization?.plan_id) {
          const { data: plan } = await admin
            .from('plans')
            .select('slug')
            .eq('id', organization.plan_id)
            .maybeSingle()
          hasActivePlan = plan?.slug === 'pro'
        }
      }
    }

    if (!belongsToRequester && guestId) {
      belongsToRequester = ownerGuestId === guestId
    }

    if (!belongsToRequester) {
      return NextResponse.json({ error: 'Sem acesso ao documento' }, { status: 403 })
    }

    const hasSinglePurchase =
      metadata?.single_purchase_paid === true ||
      metadata?.unlocked === true ||
      metadata?.access?.single_purchase_paid === true ||
      (user && Array.isArray(metadata?.access?.unlocked_user_ids) && metadata.access.unlocked_user_ids.includes(user.id)) ||
      (guestId && Array.isArray(metadata?.access?.unlocked_guest_ids) && metadata.access.unlocked_guest_ids.includes(guestId))

    if (!hasActivePlan && !hasSinglePurchase) {
      return NextResponse.json(
        {
          error: 'Pagamento necessário',
          paywall: true,
          document: {
            id: document.id,
            title: document.title,
            document_type: document.document_type,
            created_at: document.created_at
          }
        },
        { status: 402 }
      )
    }

    return NextResponse.json({ success: true, document })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao validar acesso' }, { status: 500 })
  }
}

