import React from 'react'
import { Card } from './Card'
import { 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp,
  Brain,
  MessageSquare,
  Lightbulb,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface ProcessAnalysis {
  resumo: string
  traducao_leigo: string
  insights: string[]
  proximos_passos: string[]
  alerta_risco?: string
}

interface ProcessAnalysisSectionProps {
  analysis: ProcessAnalysis | null
  isLoading?: boolean
  onGenerate: () => void
}

export function ProcessAnalysisSection({ analysis, isLoading, onGenerate }: ProcessAnalysisSectionProps) {
  if (isLoading) {
    return (
      <Card className="p-12 border-slate-100 bg-white/50 rounded-[40px] flex flex-col items-center justify-center text-center gap-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-bounce">
          <Sparkles size={32} />
        </div>
        <div className="space-y-2">
          <h4 className="text-xl font-black text-slate-900">Minerva está analisando...</h4>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Processando as movimentações judiciais para extrair inteligência estratégica.
          </p>
        </div>
      </Card>
    )
  }

  if (!analysis) {
    return (
      <Card className="p-12 border-slate-100 bg-slate-50/50 border-dashed rounded-[40px] flex flex-col items-center justify-center text-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-slate-300">
          <Brain size={32} />
        </div>
        <div className="space-y-2">
          <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest">Análise de IA Pendente</h4>
          <p className="text-slate-400 text-sm max-w-sm mx-auto font-bold uppercase tracking-tight">
            Solicite uma análise à Minerva para obter insights sobre este processo.
          </p>
        </div>
        <button 
          onClick={onGenerate}
          className="mt-4 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-3 active:scale-95"
        >
          <Sparkles size={16} className="text-primary fill-primary" /> Gerar Análise com Minerva
        </button>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Coluna Principal: Resumo e Insights */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* Resumo da Minerva */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <MessageSquare size={18} className="text-primary" />
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Resumo Estratégico</h4>
          </div>
          <Card className="p-8 bg-white border-slate-100 rounded-[32px] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none">
              <Sparkles size={60} className="text-primary" />
            </div>
            <p className="text-lg font-medium text-slate-700 leading-relaxed italic relative z-10">
              "{analysis.resumo}"
            </p>
          </Card>
        </section>

        {/* Tradução para Leigos */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Brain size={18} className="text-emerald-500" />
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Minerva Explica (Para Leigos)</h4>
          </div>
          <Card className="p-8 bg-emerald-50/30 border-emerald-100 rounded-[32px] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.08] text-emerald-500 pointer-events-none">
              <Lightbulb size={60} />
            </div>
            <div className="prose prose-slate max-w-none relative z-10">
               <p className="text-slate-700 font-bold leading-relaxed">
                 {analysis.traducao_leigo}
               </p>
            </div>
          </Card>
        </section>

        {/* Insights */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Lightbulb size={18} className="text-amber-500" />
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Insights da Minerva</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.insights.map((insight, i) => (
              <Card key={i} className="p-6 bg-slate-50 border-slate-100 rounded-2xl flex flex-col gap-y-3 hover:border-primary/20 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <TrendingUp size={16} />
                </div>
                <p className="text-sm font-bold text-slate-700 leading-snug">
                  {insight}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Coluna Lateral: Riscos e Próximos Passos */}
      <div className="lg:col-span-4 space-y-8">
        
        {/* Alerta de Risco */}
        {analysis.alerta_risco && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <AlertTriangle size={18} className="text-rose-500" />
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Alerta Crítico</h4>
            </div>
            <Card className="p-6 bg-rose-50 border-rose-100 rounded-3xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <p className="text-xs font-black text-rose-800 leading-relaxed">
                {analysis.alerta_risco}
              </p>
            </Card>
          </section>
        )}

        {/* Próximos Passos */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Zap size={18} className="text-primary" />
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Plano de Ação</h4>
          </div>
          <div className="space-y-3">
            {analysis.proximos_passos.map((passo, i) => (
              <div key={i} className="group flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all cursor-default shadow-sm hover:shadow-md">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                  {i + 1}
                </div>
                <span className="text-xs font-bold text-slate-600 leading-tight flex-grow">{passo}</span>
                <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
