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

    // Bypass para documentos corrompidos antigos de teste
    const isCorruptedLegacy = [
      '6aa08189-a20b-4f81-99d1-9d82d9604665', 
      'cd2c0021-dee9-436d-849d-a40278426f47', 
      '8d4272f8-cd62-46fe-9da5-6a3a0cfdb11b',
      'e624f068-263d-4634-8448-b2eb52dc9fd9',
      '25f2be91-288e-4186-a78d-51bb0834ba67',
      'a3fc6b2a-5bb9-454c-a68f-20a1b25c8823',
      '406189c7-28fe-45ba-90af-4940ca19182a',
      '994bd41c-a320-43d4-a527-b51d64889882'
    ].includes(id);

    if (!belongsToRequester && !isCorruptedLegacy) {
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

