'use client'

import { Card } from '@/components/shared/Card'
import { BadgeCheck, Sparkles } from 'lucide-react'

interface CheckoutPlanSummaryProps {
  planName: string
  priceMonthly: number
  features: string[]
}

export function CheckoutPlanSummary({
  planName,
  priceMonthly,
  features
}: CheckoutPlanSummaryProps) {
  return (
    <Card className="rounded-[28px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          <Sparkles size={12} />
          iaNow Pro
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mensal</span>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm font-semibold text-slate-500">{planName}</p>
        <p className="mt-1 text-4xl font-black tracking-tight text-slate-900">
          R$ {priceMonthly.toFixed(2).replace('.', ',')}
          <span className="text-base font-bold text-slate-400">/mês</span>
        </p>
      </div>

      <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <BadgeCheck size={16} className="text-primary" />
            {feature}
          </div>
        ))}
      </div>
    </Card>
  )
}
