// src/app/actions/asaas-actions.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { asaas } from '@/lib/asaas'
import { revalidatePath } from 'next/cache'

type CheckoutBillingType = 'PIX' | 'BOLETO' | 'UNDEFINED'

interface CreateCheckoutPayload {
  orgId: string
  planId: string
  billingType: CheckoutBillingType
  customer: {
    name: string
    email: string
    cpfCnpj: string
    mobilePhone?: string
  }
}

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>

function cleanDigits(value: string) {
  return value.replace(/\D/g, '')
}

async function assertOrganizationAdmin(supabase: ServerSupabase, orgId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) throw new Error('Usuário não autenticado')

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('organization_id, roles(name)')
    .eq('organization_id', orgId)
    .eq('user_id', userData.user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError || !membership) {
    throw new Error('Sem permissão para esta organização')
  }

  const roleName = (membership.roles as { name?: string } | null)?.name
  const allowed = new Set(['admin', 'owner', 'manager'])
  if (!roleName || !allowed.has(roleName)) {
    throw new Error('Apenas administradores podem alterar a assinatura')
  }
}

export async function createEmbeddedCheckoutAction(payload: CreateCheckoutPayload) {
  const supabase = await createServerSupabaseClient()
  await assertOrganizationAdmin(supabase, payload.orgId)

  // 1. Buscar a Organização e os dados do Plano
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', payload.orgId)
    .single()

  if (orgError || !org) throw new Error('Organização não encontrada')

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', payload.planId)
    .single()

  if (planError || !plan) throw new Error('Plano não encontrado')

  // 2. Garantir que temos um Cliente no Asaas
  let asaasCustomerId = org.asaas_customer_id

  if (!asaasCustomerId) {
    // Pegar metadados da organização para preencher dados no Asaas
    // (CNPJ, Endereço, etc. que buscamos no backend)
    const { data: orgData } = await supabase
      .from('organizations')
      .select('metadata')
      .eq('id', payload.orgId)
      .single()

    const meta = (orgData?.metadata as Record<string, string | undefined>) || {}
    const cpfCnpj = cleanDigits(payload.customer.cpfCnpj || meta.document || org.slug || '')
    if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
      throw new Error('CPF/CNPJ inválido para cobrança')
    }

    const customer = await asaas.createCustomer({
      name: payload.customer.name || org.name,
      email: payload.customer.email || org.email || meta.email,
      cpfCnpj,
      mobilePhone: cleanDigits(payload.customer.mobilePhone || meta.phone || ''),
      externalReference: org.id
    })

    asaasCustomerId = customer.id

    // Atualizar na nossa DB
    await supabase
      .from('organizations')
      .update({ asaas_customer_id: asaasCustomerId })
      .eq('id', payload.orgId)
  }

  // 3. Criar a Assinatura no Asaas
  try {
    const subscription = await asaas.post('/subscriptions', {
      customer: asaasCustomerId,
      billingType: payload.billingType,
      value: plan.price_monthly,
      nextDueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0], // 3 dias para o primeiro vencimento
      cycle: 'MONTHLY',
      description: `Mensalidade iaNow - Plano ${plan.name}`,
      externalReference: payload.orgId
    })

    // 4. Salvar log da subscrição no nosso Supabase
    await supabase
      .from('subscriptions')
      .upsert({
        organization_id: payload.orgId,
        plan_id: payload.planId,
        asaas_subscription_id: subscription.id,
        billing_cycle: 'monthly',
        status: 'pending' // Fica pendente até o webhook confirmar
      })

    revalidatePath('/configuracoes')

    return {
      success: true,
      checkoutUrl: subscription.invoiceUrl || subscription.invoiceCustomization?.url,
      subscriptionId: subscription.id
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao criar checkout' }
  }
}

export async function upgradeToProAction(orgId: string, planId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('name, email, metadata')
    .eq('id', orgId)
    .single()

  const meta = (org?.metadata as Record<string, string | undefined>) || {}
  return createEmbeddedCheckoutAction({
    orgId,
    planId,
    billingType: 'UNDEFINED',
    customer: {
      name: org?.name || 'Organização',
      email: org?.email || meta.email || '',
      cpfCnpj: meta.document || '',
      mobilePhone: meta.phone || ''
    }
  })
}
