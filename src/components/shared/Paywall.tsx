import React from 'react'
import { Card } from './Card'
import { Button } from './Button'
import { 
  Lock, 
  CheckCircle2, 
  Sparkles, 
  CreditCard, 
  Zap, 
  ShieldCheck,
  ArrowRight,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface PaywallProps {
  type: 'contrato' | 'estrategia' | 'processo'
  onSinglePurchase?: () => void
  onSubscribe?: () => void
}

const PRICING = {
  contrato: { 
    price: 'R$ 19,90', 
    label: 'Contrato Avulso', 
    desc: 'Acesso vital\u00edcio a este documento e todas as suas revis\u00f5es.',
    icon: ShieldCheck,
    color: 'text-primary'
  },
  estrategia: { 
    price: 'R$ 9,90', 
    label: 'Estrat\u00e9gia Avulsa', 
    desc: 'Relat\u00f3rio detalhado de viabilidade e blindagem jur\u00eddica.',
    icon: TrendingUp,
    color: 'text-amber-500'
  },
  processo: { 
    price: 'R$ 49,90', 
    label: 'Acompanhamento Premium', 
    desc: 'Monitoramento em tempo real e an\u00e1lises ilimitadas da Minerva.',
    icon: Zap,
    color: 'text-emerald-500'
  }
}

export function Paywall({ type, onSinglePurchase, onSubscribe }: PaywallProps) {
  const current = PRICING[type]
  const Icon = current.icon

  return (
    <div className="absolute inset-x-0 bottom-0 top-[20%] z-50 flex items-end justify-center pb-12 px-4 md:px-8 overflow-hidden">
      {/* Background Gradients/Blur */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-100 via-slate-100/95 to-transparent backdrop-blur-[2px]" />
      
      <Card className="relative w-full max-w-4xl bg-white border-slate-200 shadow-2xl rounded-[40px] overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          
          {/* Lado Esquerdo: Oferta Avulsa */}
          <div className="p-8 md:p-12 space-y-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50", current.color)}>
                  <Icon size={24} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Libera\u00e7\u00e3o imediata</h4>
                  <h3 className="text-2xl font-black text-slate-900">{current.label}</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-slate-600 leading-snug">Download em PDF de alta qualidade e pronto para assinatura.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-slate-600 leading-snug">Auditoria detalhada da Minerva inclu\u00edda.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-slate-600 leading-snug">{current.desc}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-8">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do {type}</span>
                  <span className="text-4xl font-black text-slate-900 tracking-tight">{current.price}</span>
               </div>
               <Button 
                onClick={onSinglePurchase}
                className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
               >
                 <CreditCard size={18} /> Desbloquear Agora
               </Button>
            </div>
          </div>

          {/* Lado Direito: Plano Mensal (Power-up) */}
          <div className="p-8 md:p-12 bg-slate-50 flex flex-col justify-between space-y-8 relative">
            <div className="absolute top-6 right-6">
               <span className="bg-primary text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Melhor Escolha</span>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/20">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase text-primary tracking-[0.2em]">Acesso Ilimitado</h4>
                  <h3 className="text-2xl font-black text-slate-900">Plano Mensal</h3>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-500 leading-relaxed">
                  Tenha a Minerva trabalhando 24/7 para sua empresa. Crie quantos documentos e estrat\u00e9gias desejar.
                </p>
                <div className="space-y-3 bg-white/50 p-4 rounded-2xl border border-white">
                   <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">Incluso no plano:</div>
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Lock size={12} className="text-primary" /> Hub de Contatos Ilimitado
                   </div>
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Lock size={12} className="text-primary" /> Auditoria de Risco Avan\u00e7ada
                   </div>
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <Lock size={12} className="text-primary" /> Suporte Jur\u00eddico Priorit\u00e1rio
                   </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Upgrade Mensal</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 tracking-tight">R$ 99,90</span>
                    <span className="text-sm font-bold text-slate-400">/m\u00eas</span>
                  </div>
               </div>
               <Button 
                onClick={onSubscribe}
                className="w-full h-14 rounded-2xl bg-primary hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
               >
                 Assinar Plano Premium <ArrowRight size={18} />
               </Button>
            </div>
          </div>

        </div>
      </Card>
    </div>
  )
}
