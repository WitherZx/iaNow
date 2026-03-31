'use client'

import React, { useState } from 'react'
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

import { TransparentCheckoutModal } from '../billing/TransparentCheckoutModal'

interface PaywallProps {
  demandId: string
  type: 'contrato' | 'estrategia' | 'processo'
  onUnlockSuccess: () => void
  fullscreen?: boolean
  onBack?: () => void
}

const PRICING = {
  contrato: {
    price: 'R$ 19,90',
    label: 'Contrato avulso',
    desc: 'Acesso vitalício a este documento e todas as suas revisões.',
    icon: ShieldCheck,
    color: 'text-primary'
  },
  estrategia: {
    price: 'R$ 9,90',
    label: 'Estratégia avulsa',
    desc: 'Relatório detalhado de viabilidade e blindagem jurídica.',
    icon: TrendingUp,
    color: 'text-amber-500'
  },
  processo: {
    price: 'R$ 49,90',
    label: 'Acompanhamento premium',
    desc: 'Monitoramento em tempo real e análises ilimitadas da Minerva.',
    icon: Zap,
    color: 'text-emerald-500'
  }
}

export function Paywall({ demandId, type, onUnlockSuccess, fullscreen = false, onBack }: PaywallProps) {
  const current = PRICING[type]
  const Icon = current.icon
  const [activeTab, setActiveTab] = useState<'avulso' | 'premium'>('avulso')
  const [checkoutMode, setCheckoutMode] = useState<'avulso' | 'premium' | null>(null)

  return (
    <div
      className={cn(
        fullscreen
          ? "fixed inset-0 z-[999] p-4 py-8 bg-slate-900/50 backdrop-blur-sm overflow-y-auto flex flex-col items-center justify-start lg:justify-center"
          : "absolute inset-x-0 bottom-0 top-[20%] z-50 flex items-end justify-center pb-12 px-4 overflow-hidden"
      )}
    >
      {/* Background overlay */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          fullscreen
            ? "bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-900/60"
            : "bg-gradient-to-t from-slate-100 via-slate-100/95 to-transparent backdrop-blur-[2px]"
        )}
      />

      <div className="w-full max-w-5xl relative z-10 flex flex-col gap-4">
        {fullscreen && onBack && (
          <div className="w-full flex justify-start">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-sm px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:bg-white hover:text-slate-900 transition-all flex items-center gap-2 w-max"
            >
              ← Voltar
            </button>
          </div>
        )}

        <Card className="w-full flex flex-col gap-8 bg-white border-slate-200 shadow-2xl rounded-[24px] lg:rounded-[32px] overflow-hidden animate-in slide-in-from-bottom-8 duration-700">

          {/* Mobile Tabs */}
          <div className="lg:hidden border-b border-slate-100 bg-slate-50/50">
            <div className="flex bg-slate-200/50 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('avulso')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'avulso' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Avulso
              </button>
              <button
                onClick={() => setActiveTab('premium')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'premium' ? "bg-gradient-to-r from-primary to-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Premium
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row w-full flex-1 relative">
            {/* Divider visible only on lg */}
            <div className="hidden lg:block absolute left-1/2 top-10 bottom-10 w-[1px] bg-gradient-to-b from-transparent via-slate-200 to-transparent -translate-x-1/2 z-10" />

            {/* Lado Esquerdo: Oferta Avulsa */}
            <div className={cn(
              "lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-100/50 hover:bg-slate-50/50 transition-colors flex-1 flex-col gap-8",
              activeTab === 'avulso' ? "flex" : "hidden lg:flex"
            )}>
              <div className="flex flex-col gap-6 flex-1">
                <div className="flex items-center gap-4">
                  <div className={cn("shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 shadow-inner", current.color)}>
                    <Icon size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em]">Liberação imediata</span>
                    <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none">{current.label}</h3>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <p className="text-[13px] font-bold text-slate-500 leading-relaxed">
                    Solução ideal para demandas pontuais. Garanta segurança jurídica imediata com nossa IA especializada sem custos recorrentes.
                  </p>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 group">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center mt-0.5 group-hover:bg-emerald-100 transition-colors">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      </div>
                      <p className="text-[13px] font-bold text-slate-600 leading-snug group-hover:text-slate-900 transition-colors">
                        Download em PDF de alta qualidade pronto para assinatura.
                      </p>
                    </div>
                    <div className="flex items-start gap-3 group">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center mt-0.5 group-hover:bg-emerald-100 transition-colors">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      </div>
                      <p className="text-[13px] font-bold text-slate-600 leading-snug group-hover:text-slate-900 transition-colors">
                        Auditoria detalhada da Minerva incluída.
                      </p>
                    </div>
                    <div className="flex items-start gap-3 group">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center mt-0.5 group-hover:bg-emerald-100 transition-colors">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      </div>
                      <p className="text-[13px] font-bold text-slate-600 leading-snug group-hover:text-slate-900 transition-colors">
                        {current.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5 pt-6 border-t border-slate-100/50 mt-auto">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do {type}</span>
                  <span className="text-4xl font-black text-slate-900 tracking-tight leading-none">{current.price}</span>
                </div>
                <Button
                  onClick={() => setCheckoutMode('avulso')}
                  className="w-full h-14 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900 font-black text-xs uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all group"
                >
                  <CreditCard size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" /> Desbloquear Agora
                </Button>
              </div>
            </div>

            {/* Lado Direito: Plano Mensal */}
            <div className={cn(
              "lg:p-10 relative bg-slate-50/80 overflow-hidden group/premium flex-1 flex-col gap-8",
              activeTab === 'premium' ? "flex" : "hidden lg:flex"
            )}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover/premium:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />

              <div className="flex flex-col gap-6 relative z-10 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-blue-600 text-white shadow-xl shadow-primary/30 ring-4 ring-primary/10">
                      <Sparkles size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-primary tracking-[0.25em]">Acesso Ilimitado</span>
                      <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none">Plano Mensal</h3>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <p className="text-[13px] font-bold text-slate-500 leading-relaxed pr-4">
                    Tenha a Minerva trabalhando 24/7 para sua empresa. Crie quantos documentos e estratégias desejar, sem limites.
                  </p>

                  <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl pointer-events-none" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Incluso no plano:</span>

                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lock size={10} className="text-primary" />
                      </div>
                      <span className="text-[13px] font-bold text-slate-700">Hub de Contatos Ilimitado</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lock size={10} className="text-primary" />
                      </div>
                      <span className="text-[13px] font-bold text-slate-700">Auditoria de Risco Avançada</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lock size={10} className="text-primary" />
                      </div>
                      <span className="text-[13px] font-bold text-slate-700">Suporte Jurídico Prioritário</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5 pt-6 border-t border-slate-200/60 relative z-10 mt-auto">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Upgrade Mensal</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-slate-900 tracking-tight leading-none">R$ 99,90</span>
                    <span className="text-[13px] font-bold text-slate-400">/mês</span>
                  </div>
                </div>
                <Button
                  onClick={() => setCheckoutMode('premium')}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:shadow-primary/40 flex items-center justify-center gap-3 active:scale-95 transition-all group"
                >
                  Assinar Premium <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>

          </div>
        </Card>
      </div>

      {checkoutMode === 'avulso' && (
        <TransparentCheckoutModal
          demandId={demandId}
          demandType={type}
          value={parseFloat(current.price.replace('R$ ', '').replace(',', '.'))}
          description={`Desbloqueio Avulso: ${current.label}`}
          onSuccess={() => {
            setCheckoutMode(null)
            onUnlockSuccess()
          }}
          onClose={() => setCheckoutMode(null)}
        />
      )}

      {checkoutMode === 'premium' && (
        <TransparentCheckoutModal
          demandId="premium_upgrade"
          demandType="mensal"
          value={99.90}
          description="Plano Premium Mensal"
          onSuccess={() => {
            setCheckoutMode(null)
            onUnlockSuccess()
          }}
          onClose={() => setCheckoutMode(null)}
        />
      )}
    </div>
  )
}
