// src/app/actions/asaas-actions.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { asaas } from '@/lib/asaas'
import { revalidatePath } from 'next/cache'

export async function upgradeToProAction(orgId: string, planId: string) {
  const supabase = (await createServerSupabaseClient()) as any

  // 1. Buscar a Organização e os dados do Plano
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single() as any

  if (orgError || !org) throw new Error('Organização não encontrada')

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single() as any

  if (planError || !plan) throw new Error('Plano não encontrado')

  // 2. Garantir que temos um Cliente no Asaas
  let asaasCustomerId = org.asaas_customer_id

  if (!asaasCustomerId) {
    // Pegar metadados da organização para preencher dados no Asaas
    // (CNPJ, Endereço, etc. que buscamos no backend)
    const { data: orgData } = await supabase
      .from('organizations')
      .select('metadata')
      .eq('id', orgId)
      .single()

    const meta = (orgData?.metadata as any) || {}

    const customer = await asaas.createCustomer({
      name: org.name,
      email: org.email || meta.email || 'atendimento@empresa.com.br', // Fallback se não tiver e-mail
      cpfCnpj: meta.document || org.slug, // Idealmente o CNPJ da organização
      mobilePhone: meta.phone || '',
      externalReference: org.id
    })

    asaasCustomerId = customer.id

    // Atualizar na nossa DB
    await supabase
      .from('organizations')
      .update({ asaas_customer_id: asaasCustomerId })
      .eq('id', orgId)
  }

  // 3. Criar a Assinatura no Asaas
  // Vamos usar 'UNDEFINED' para permitir que o usuário escolha no checkout do Asaas
  // Ou podemos fixar em 'PIX' ou 'CREDIT_CARD' se quisermos.
  try {
    const subscription = await asaas.post('/subscriptions', {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // Deixa o usuário escolher no link de pagamento
      value: plan.price_monthly,
      nextDueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0], // 3 dias para o primeiro vencimento
      cycle: 'MONTHLY',
      description: `Mensalidade iaNow - Plano ${plan.name}`,
      externalReference: orgId
    })

    // 4. Salvar log da subscrição no nosso Supabase
    await supabase
      .from('subscriptions')
      .upsert({
        organization_id: orgId,
        plan_id: planId,
        asaas_subscription_id: subscription.id,
        billing_cycle: 'monthly',
        status: 'pending' // Fica pendente até o webhook confirmar
      })

    revalidatePath('/configuracoes')

    // Retornamos o invoiceUrl da primeira cobrança para redirecionar o usuário
    // O Asaas cria uma cobrança imediata para assinaturas
    return { success: true, checkoutUrl: subscription.invoiceUrl || subscription.invoiceCustomization?.url }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
