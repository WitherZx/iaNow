'use client'

import { useMemo, useState } from 'react'
import { Card } from '@/components/shared/Card'
import { Input } from '@/components/shared/Input'
import { Button } from '@/components/shared/Button'
import { Label } from '@/components/shared/Label'
import { Lock, ShieldCheck } from 'lucide-react'
import { CheckoutPaymentMethod, type EmbeddedBillingType } from './CheckoutPaymentMethod'
import { CheckoutPlanSummary } from './CheckoutPlanSummary'
import { createEmbeddedCheckoutAction } from '@/app/actions/asaas-actions'
import { toast } from 'sonner'

interface EmbeddedCheckoutProps {
  org: {
    id?: string
    name?: string
    email?: string | null
    document?: string | null
    phone?: string | null
  }
  planId: string
}

export function EmbeddedCheckout({ org, planId }: EmbeddedCheckoutProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [billingType, setBillingType] = useState<EmbeddedBillingType>('PIX')
  const [customer, setCustomer] = useState({
    name: org?.name || '',
    email: org?.email || '',
    cpfCnpj: org?.document || '',
    mobilePhone: org?.phone || ''
  })

  const canSubmit = useMemo(() => {
    return customer.name && customer.email && customer.cpfCnpj
  }, [customer])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!org?.id) return

    try {
      setIsSubmitting(true)
      const result = await createEmbeddedCheckoutAction({
        orgId: org.id,
        planId,
        billingType,
        customer
      })

      if (!result.success) throw new Error(result.error || 'Falha ao gerar checkout')
      if (!result.checkoutUrl) throw new Error('Checkout sem URL de pagamento')

      toast.success('Checkout criado com sucesso. Abrindo pagamento...')
      window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar checkout')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="rounded-[32px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h4 className="text-lg font-black tracking-tight text-slate-900">Checkout iaNow</h4>
          <p className="text-sm font-medium text-slate-500">Pagamento seguro e confirmado por webhook</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">
          <Lock size={12} />
          Seguro
        </span>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nome"
            value={customer.name}
            onChange={(e) => setCustomer((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Razão social ou responsável"
          />
          <Input
            label="Email"
            type="email"
            value={customer.email}
            onChange={(e) => setCustomer((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="financeiro@empresa.com"
          />
          <Input
            label="CPF/CNPJ"
            value={customer.cpfCnpj}
            onChange={(e) => setCustomer((prev) => ({ ...prev, cpfCnpj: e.target.value }))}
            placeholder="Somente números ou formatado"
          />
          <Input
            label="Telefone"
            value={customer.mobilePhone}
            onChange={(e) => setCustomer((prev) => ({ ...prev, mobilePhone: e.target.value }))}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="space-y-2">
          <Label>Método de pagamento</Label>
          <CheckoutPaymentMethod value={billingType} onChange={setBillingType} />
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!canSubmit}
          className="h-12 w-full rounded-2xl bg-primary text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20"
        >
          Finalizar Checkout
        </Button>
      </form>
    </Card>
  )
}
