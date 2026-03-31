import React from 'react'
import { Card } from './Card'
import { 
  History, 
  MapPin, 
  Calendar, 
  User, 
  Gavel, 
  ArrowRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileText,
  Sparkles
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { ProcessStatus, ProcessMovement } from '@/lib/services/legal-api'

interface ProcessTrackingSectionProps {
  status: ProcessStatus | null
  isLoading?: boolean
  onAnalyze?: () => void
}

export function ProcessTrackingSection({ status, isLoading, onAnalyze }: ProcessTrackingSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-100 rounded-[32px]" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-50 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!status) return null

  return (
    <div className="space-y-8">
      {/* Resumo do Processo */}
      <Card className="p-8 border-slate-100 shadow-sm bg-white rounded-[32px] overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Gavel size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-3 py-1 rounded-full">
              Status Atual
            </span>
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2 pt-2">
              {status.status}
              <CheckCircle2 size={24} className="text-emerald-500" />
            </h3>
            <p className="text-slate-500 font-bold text-sm">{status.number}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <MapPin size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tribunal</span>
                <span className="text-xs font-bold text-slate-700 leading-tight">{status.court}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <Calendar size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuição</span>
                <span className="text-xs font-bold text-slate-700">{status.distributionDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
             <button 
               onClick={onAnalyze}
               className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-95 group"
             >
                <Sparkles size={16} className="fill-current group-hover:animate-pulse" />
                Análise Inteligente com Minerva
             </button>
          </div>
        </div>
      </Card>

      {/* Timeline de Movimentações */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
            <History size={16} /> Movimentações Recentes
          </h4>
          <span className="text-[10px] font-bold text-slate-400 px-3 py-1 bg-slate-100 rounded-full">
            {status.movements.length} Atos
          </span>
        </div>

        <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
          {status.movements.map((movement, idx) => (
            <div key={movement.id} className="relative group">
              {/* Dot mapping to the line */}
              <div className={cn(
                "absolute -left-[23px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 transition-transform duration-300 group-hover:scale-125",
                idx === 0 ? "bg-primary" : "bg-slate-300"
              )} />
              
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:border-primary/20 transition-all group-hover:shadow-md cursor-default">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
                    <Clock size={12} />
                    {new Date(movement.date).toLocaleDateString('pt-BR')} às {new Date(movement.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border w-fit",
                    movement.type === 'Decisão' ? "bg-amber-50 text-amber-600 border-amber-100" :
                    movement.type === 'Distribuição' ? "bg-blue-50 text-blue-600 border-blue-100" :
                    "bg-slate-50 text-slate-500 border-slate-100"
                  )}>
                    {movement.type}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                  {movement.description}
                </p>
                
                {/* Micro Action */}
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                      Ver Detalhes <ChevronRight size={12} />
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
