'use client'

import { cn } from '@/utils/cn'

type Status = 'active' | 'pending' | 'processing' | 'completed' | 'failed' | 'draft' |
              'canceled' | 'past_due' | 'trialing' | 'generating' | 'ready' | string

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  active:     { label: 'Ativo',        bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-200' },
  trialing:   { label: 'Trial',        bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-200' },
  pending:    { label: 'Pendente',     bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200' },
  processing: { label: 'Processando', bg: 'bg-blue-50', color: 'text-primary', border: 'border-primary/20' },
  generating: { label: 'Gerando',     bg: 'bg-blue-50', color: 'text-primary', border: 'border-primary/20' },
  completed:  { label: 'Concluído',   bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-200' },
  ready:      { label: 'Pronto',       bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-200' },
  failed:     { label: 'Falhou',       bg: 'bg-red-50', color: 'text-red-700', border: 'border-red-200' },
  draft:      { label: 'Rascunho',    bg: 'bg-slate-50', color: 'text-slate-600', border: 'border-slate-200' },
  canceled:   { label: 'Cancelado',   bg: 'bg-red-50', color: 'text-red-700', border: 'border-red-200' },
  filed:      { label: 'Protocolado', bg: 'bg-primary/10', color: 'text-primary', border: 'border-primary/20' },
  timeout:    { label: 'Timeout',      bg: 'bg-amber-100', color: 'text-amber-800', border: 'border-amber-200' },
  deleted:    { label: 'Apagado',      bg: 'bg-orange-50', color: 'text-orange-600', border: 'border-orange-100' },
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const config = STATUS_MAP[status] ?? { label: status, bg: 'bg-slate-50', color: 'text-slate-600', border: 'border-slate-200' }
  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-[0.15em] border transition-all",
      config.bg,
      config.color,
      config.border,
      className
    )}>
      {config.label}
    </span>
  )
}
