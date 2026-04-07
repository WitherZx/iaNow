// src/app/actions/asaas-actions.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { asaas } from '@/lib/asaas'
import { revalidatePath } from 'next/cache'
import { getGlobalConfigsAction } from './billing-actions'

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
type MembershipRow = { roles?: { name?: string } | null }
type OrganizationRow = {
  id: string
  name: string
  email: string | null
  slug: string | null
  asaas_customer_id: string | null
  metadata?: Record<string, string | undefined> | null
}
type PlanRow = { id: string; name: string; slug: string; price_monthly: number }
type AsaasCustomerResponse = { id: string }
type AsaasSubscriptionResponse = {
  id: string
  invoiceUrl?: string
  invoiceCustomization?: { url?: string }
}

function cleanDigits(value: string) {
  return value.replace(/\D/g, '')
}

async function assertOrganizationAdmin(supabase: ServerSupabase, orgId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) throw new Error('Usuário não autenticado')

  const { data: membershipData, error: membershipError } = await supabase
    .from('memberships')
    .select('organization_id, roles(name)')
    .eq('organization_id', orgId)
    .eq('user_id', userData.user.id)
    .eq('status', 'active')
    .maybeSingle()
  const membership = membershipData as MembershipRow | null

  if (membershipError || !membership) {
    throw new Error('Sem permissão para esta organização')
  }

  const roleName = membership.roles?.name
  const allowed = new Set(['admin', 'owner', 'manager'])
  if (!roleName || !allowed.has(roleName)) {
    throw new Error('Apenas administradores podem alterar a assinatura')
  }
}

export async function createEmbeddedCheckoutAction(payload: CreateCheckoutPayload) {
  const supabase = await createServerSupabaseClient()
  await assertOrganizationAdmin(supabase, payload.orgId)

  // 1. Buscar a Organização e os dados do Plano
  const { data: orgDataRaw, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', payload.orgId)
    .single()
  const org = orgDataRaw as OrganizationRow | null

  if (orgError || !org) throw new Error('Organização não encontrada')

  const { data: planDataRaw, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', payload.planId)
    .single()
  const plan = planDataRaw as PlanRow | null

  if (planError || !plan) throw new Error('Plano não encontrado')

  // 1.1. Buscar Preço Dinâmico Global se existir
  let finalPrice = plan.price_monthly
  const { success: configSuccess, data: configs } = await getGlobalConfigsAction()
  if (configSuccess && configs) {
    const configKey = `price_${plan.slug}_monthly`
    const typedConfigs = configs as Record<string, any>
    if (typedConfigs[configKey]) {
      finalPrice = typedConfigs[configKey]
    }
  }

  // 2. Garantir que temos um Cliente no Asaas
  let asaasCustomerId = org.asaas_customer_id

  if (!asaasCustomerId) {
    // Pegar metadados da organização para preencher dados no Asaas
    // (CNPJ, Endereço, etc. que buscamos no backend)
    const { data: orgDataRaw } = await supabase
      .from('organizations')
      .select('metadata')
      .eq('id', payload.orgId)
      .single()
    const orgData = orgDataRaw as Pick<OrganizationRow, 'metadata'> | null

    const meta = (orgData?.metadata as Record<string, string | undefined>) || {}
    const cpfCnpj = cleanDigits(payload.customer.cpfCnpj || meta.document || org.slug || '')
    if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
      throw new Error('CPF/CNPJ inválido para cobrança')
    }

    const customer = (await asaas.createCustomer({
      name: payload.customer.name || org.name,
      email: payload.customer.email || org.email || meta.email || '',
      cpfCnpj,
      mobilePhone: cleanDigits(payload.customer.mobilePhone || meta.phone || ''),
      externalReference: org.id
    })) as AsaasCustomerResponse

    asaasCustomerId = customer.id

    // Atualizar na nossa DB
    await (supabase as any)
      .from('organizations')
      .update({ asaas_customer_id: asaasCustomerId })
      .eq('id', payload.orgId)
  }

  // 3. Criar a Assinatura no Asaas
  try {
    const subscription = (await asaas.post('/subscriptions', {
      customer: asaasCustomerId,
      billingType: payload.billingType,
      value: finalPrice,
      nextDueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0], // 3 dias para o primeiro vencimento
      cycle: 'MONTHLY',
      description: `Mensalidade iaNow - Plano ${plan.name}`,
      externalReference: payload.orgId
    })) as AsaasSubscriptionResponse

    // 4. Salvar log da subscrição no nosso Supabase
    await (supabase as any)
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

  const { data: orgDataRaw } = await supabase
    .from('organizations')
    .select('name, email, metadata')
    .eq('id', orgId)
    .single()
  const org = orgDataRaw as Pick<OrganizationRow, 'name' | 'email' | 'metadata'> | null

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

export interface CreateTransparentChargePayload {
  demandId: string
  name: string
  email: string
  cpfCnpj: string
  mobilePhone: string
  postalCode: string
  addressNumber: string
  addressComplement?: string
  billingType: 'CREDIT_CARD' | 'PIX'
  value: number
  description: string
  creditCard?: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
}

export async function createTransparentChargeAction(payload: CreateTransparentChargePayload) {
  try {
    const rawCpf = cleanDigits(payload.cpfCnpj)
    
    // 1. Criar Cliente no Asaas para a transação avulsa
    const customer = (await asaas.createCustomer({
      name: payload.name,
      email: payload.email,
      cpfCnpj: rawCpf,
      mobilePhone: cleanDigits(payload.mobilePhone),
      externalReference: payload.demandId
    })) as AsaasCustomerResponse

    const customerId = customer.id

    // 2. Montar payload do pagamento
    const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0]
    const paymentPayload: any = {
      customer: customerId,
      billingType: payload.billingType,
      dueDate: tomorrow,
      value: payload.value,
      description: payload.description,
      externalReference: payload.demandId
    }

    if (payload.billingType === 'CREDIT_CARD' && payload.creditCard) {
      paymentPayload.creditCard = {
        holderName: payload.creditCard.holderName,
        number: cleanDigits(payload.creditCard.number),
        expiryMonth: payload.creditCard.expiryMonth.padStart(2, '0'),
        expiryYear: payload.creditCard.expiryYear.length === 2 ? `20${payload.creditCard.expiryYear}` : payload.creditCard.expiryYear,
        ccv: payload.creditCard.ccv
      }
      paymentPayload.creditCardHolderInfo = {
        name: payload.name,
        email: payload.email,
        cpfCnpj: rawCpf,
        postalCode: cleanDigits(payload.postalCode),
        addressNumber: payload.addressNumber,
        addressComplement: payload.addressComplement || '',
        phone: cleanDigits(payload.mobilePhone),
        mobilePhone: cleanDigits(payload.mobilePhone)
      }
    }

    // 3. Processar Cobrança
    const payment = await asaas.post<any>('/payments', paymentPayload)

    // Se for PIX, precisamos pegar o QRCode. O Asaas gera isso em /payments/{id}/pixQrCode
    if (payload.billingType === 'PIX' && payment.id) {
      const pixInfo = await asaas.get<any>(`/payments/${payment.id}/pixQrCode`)
      return {
        success: true,
        paymentId: payment.id,
        pix: {
          encodedImage: pixInfo.encodedImage,
          payload: pixInfo.payload,
          expirationDate: pixInfo.expirationDate
        }
      }
    }

    return {
      success: true,
      paymentId: payment.id,
      status: payment.status,
      receiptUrl: payment.transactionReceiptUrl || payment.invoiceUrl
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro genérico no checkout transparente' }
  }
}

export async function unlockDocumentMockAction(demandId: string, type: 'contrato' | 'estrategia' | 'processo') {
  try {
    const admin = createAdminClient() as any
    let table = ''
    if (type === 'contrato') table = 'generated_documents'
    else if (type === 'estrategia') table = 'strategies'
    else table = 'justice_demands'

    // Not all tables might exist (e.g. justice_demands). 
    // In any case, we fetch current metadata, then append unlocked: true
    const { data: doc } = await admin.from(table).select('metadata').eq('id', demandId).maybeSingle()
    if (doc) {
      const newMeta = { ...(doc.metadata || {}), unlocked: true }
      await admin.from(table).update({ metadata: newMeta }).eq('id', demandId)
    }
    return { success: true }
  } catch (err) {
    console.error('Mock Unlock Error:', err)
    return { success: false }
  }
}
