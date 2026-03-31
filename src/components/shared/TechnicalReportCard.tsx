import { cn } from '@/utils/cn'

interface TechnicalReportCardProps {
  aiModel?: string
  createdAt: string
  className?: string
}

export function TechnicalReportCard({ aiModel, createdAt, className }: TechnicalReportCardProps) {
  const formattedModel = aiModel?.toLowerCase() === 'minerva' ? 'Minerva AI - V4' : (aiModel || 'Minerva AI - V4')
  const date = new Date(createdAt).toLocaleDateString('pt-BR')

  return (
    <div className={cn('p-8 bg-slate-900 rounded-2xl border border-slate-800 space-y-6', className)}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase text-slate-500">Relatório Técnico</span>
      </div>
      <div className="space-y-4 text-xs font-bold uppercase">
        <div className="flex justify-between border-b border-white/5 pb-4">
          <span className="text-slate-600">Modelo</span>
          <span className="text-white font-mono normal-case tracking-normal">{formattedModel}</span>
        </div>
        <div className="flex justify-between border-b border-white/5 pb-4">
          <span className="text-slate-600">Criado em</span>
          <span className="text-white">{date}</span>
        </div>
      </div>
    </div>
  )
}
