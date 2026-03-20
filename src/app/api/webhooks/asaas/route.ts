// src/app/api/webhooks/asaas/route.ts
// Recebe notificações sobre pagamentos e assinaturas do Asaas

import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = createAdminClient() as any

  const { event, payment, subscription } = body
  const orgId = payment?.externalReference || subscription?.externalReference

  console.log(`[ASAAS WEBHOOK] Evento: ${event} para Org: ${orgId}`)

  if (!orgId) return NextResponse.json({ ok: false, error: 'Sem identificador de organização' })

  // 1. Pagamento Confirmado (Primeiro pagamento ou mensalidade)
  if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
    // Buscar o ID do plano 'pro' no banco de dados
    const { data: plans } = await supabase
      .from('plans')
      .select('id')
      .eq('slug', 'pro')
      .single()

    if (plans?.id) {
       // Atualizar a organização para o plano PRO
       await supabase
         .from('organizations')
         .update({ plan_id: plans.id, updated_at: new Date().toISOString() })
         .eq('id', orgId)

       // Atualizar o status da subscrição
       await supabase
         .from('subscriptions')
         .update({ status: 'active', updated_at: new Date().toISOString() })
         .eq('organization_id', orgId)

       // Registrar a fatura paga
       if (payment.id) {
          await supabase
            .from('invoices')
            .upsert({
              organization_id: orgId,
              asaas_charge_id: payment.id,
              amount_due: payment.value,
              amount_paid: payment.value,
              status: 'paid',
              pdf_url: payment.invoiceUrl || null,
              updated_at: new Date().toISOString()
            }, { onConflict: 'asaas_charge_id' })
       }
       
       console.log(`[ASAAS WEBHOOK] Org: ${orgId} agora é PRO ✅`)
    }
  }

  // 2. Assinatura Cancelada (Downgrade para Free)
  if (event === 'SUBSCRIPTION_DELETED') {
    // Buscar o ID do plano 'free'
    const { data: plans } = await supabase
      .from('plans')
      .select('id')
      .eq('slug', 'free')
      .single()

    if (plans?.id) {
       await supabase
         .from('organizations')
         .update({ plan_id: plans.id, updated_at: new Date().toISOString() })
         .eq('id', orgId)

       await supabase
         .from('subscriptions')
         .update({ status: 'canceled', updated_at: new Date().toISOString() })
         .eq('organization_id', orgId)

       console.log(`[ASAAS WEBHOOK] Org: ${orgId} retornou para o FREE ⬇️`)
    }
  }

  // 3. Pagamento Atrasado (Opcional: Bloquear ou Notificar)
  if (event === 'PAYMENT_OVERDUE') {
     // Aqui podemos marcar a subscrição como 'overdue' para limitar acessos
     await supabase
       .from('subscriptions')
       .update({ status: 'overdue' })
       .eq('organization_id', orgId)
     
     console.log(`[ASAAS WEBHOOK] Org: ${orgId} está com pagamento em atraso! ⚠️`)
  }

  return NextResponse.json({ ok: true })
}
