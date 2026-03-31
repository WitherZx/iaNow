'use client'

import { cn } from '@/utils/cn'
import { CreditCard, Landmark, QrCode } from 'lucide-react'

export type EmbeddedBillingType = 'PIX' | 'BOLETO' | 'UNDEFINED'

interface CheckoutPaymentMethodProps {
  value: EmbeddedBillingType
  onChange: (value: EmbeddedBillingType) => void
}

const methods = [
  { id: 'PIX' as const, label: 'PIX', description: 'Confirmação rápida', icon: QrCode },
  { id: 'BOLETO' as const, label: 'Boleto', description: 'Pagamento tradicional', icon: Landmark },
  { id: 'UNDEFINED' as const, label: 'Cartão/Outros', description: 'Escolha no ambiente Asaas', icon: CreditCard }
]

export function CheckoutPaymentMethod({ value, onChange }: CheckoutPaymentMethodProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {methods.map((method) => {
        const active = value === method.id
        const Icon = method.icon

        return (
          <button
            key={method.id}
            type="button"
            onClick={() => onChange(method.id)}
            className={cn(
              'rounded-2xl border p-4 text-left transition-all',
              active
                ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <Icon size={18} className={active ? 'text-primary' : 'text-slate-500'} />
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  active ? 'bg-primary' : 'bg-slate-200'
                )}
              />
            </div>
            <p className="text-sm font-black text-slate-900">{method.label}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{method.description}</p>
          </button>
        )
      })}
    </div>
  )
}
