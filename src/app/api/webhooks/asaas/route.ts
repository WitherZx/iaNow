// src/app/api/webhooks/asaas/route.ts
// Recebe notificações sobre pagamentos e assinaturas do Asaas

import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN

export async function POST(req: Request) {
  try {
    if (!ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Webhook token não configurado' }, { status: 500 })
    }

    const incomingToken = req.headers.get('asaas-access-token')
    if (!incomingToken || incomingToken !== ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const supabase = createAdminClient()
    const db = supabase as any
    const now = new Date().toISOString()

    const { event, payment, subscription } = body
    const orgId = payment?.externalReference || subscription?.externalReference
    const eventKey = `${event}:${payment?.id || subscription?.id || 'unknown'}`

    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'Sem identificador de organização' }, { status: 400 })
    }

    console.log('[ASAAS WEBHOOK] evento recebido', { event, orgId, eventKey })

    // 1. Pagamento Confirmado (Primeiro pagamento ou mensalidade)
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      if (!payment?.id) {
        return NextResponse.json({ ok: false, error: 'Evento sem payment.id' }, { status: 400 })
      }

      // Idempotência defensiva: se já está pago para a mesma charge, encerra
      const { data: existingInvoice } = await db
        .from('invoices')
        .select('id, status')
        .eq('asaas_charge_id', payment.id)
        .maybeSingle()

      if (existingInvoice?.status === 'paid') {
        return NextResponse.json({ ok: true, duplicate: true })
      }

      // Buscar o ID do plano 'pro' no banco de dados
      const { data: plans } = await db
        .from('plans')
        .select('id')
        .eq('slug', 'pro')
        .single()

      if (plans?.id) {
        await db
          .from('organizations')
          .update({ plan_id: plans.id, updated_at: now })
          .eq('id', orgId)

        await db
          .from('subscriptions')
          .update({ status: 'active', updated_at: now })
          .eq('organization_id', orgId)

        await db
          .from('invoices')
          .upsert(
            {
              organization_id: orgId,
              asaas_charge_id: payment.id,
              amount_due: payment.value,
              amount_paid: payment.value,
              status: 'paid',
              pdf_url: payment.invoiceUrl || null,
              updated_at: now
            },
            { onConflict: 'asaas_charge_id' }
          )
      }
    }

    // 2. Assinatura Cancelada (Downgrade para Free)
    if (event === 'SUBSCRIPTION_DELETED') {
      const { data: plans } = await db
        .from('plans')
        .select('id')
        .eq('slug', 'free')
        .single()

      if (plans?.id) {
        await db
          .from('organizations')
          .update({ plan_id: plans.id, updated_at: now })
          .eq('id', orgId)

        await db
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: now })
          .eq('organization_id', orgId)
      }
    }

    // 3. Pagamento Atrasado
    if (event === 'PAYMENT_OVERDUE') {
      await db
        .from('subscriptions')
        .update({ status: 'overdue', updated_at: now })
        .eq('organization_id', orgId)
    }

    console.log('[ASAAS WEBHOOK] evento processado', { event, orgId, eventKey })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    console.error('[ASAAS WEBHOOK] falha ao processar evento', { message })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
