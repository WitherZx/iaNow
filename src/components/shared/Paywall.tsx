
'use client'

import React, { useState, useEffect } from 'react'
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
  TrendingUp,
  Microscope,
  Clock,
  Check
} from 'lucide-react'
import { cn } from '@/utils/cn'

import { TransparentCheckoutModal } from '../billing/TransparentCheckoutModal'
import { simulatePurchaseAction } from '@/app/actions/justice-actions'
import { toast } from 'sonner'
import { getPlansAction, getGlobalConfigsAction } from '@/app/actions/billing-actions'

interface PaywallProps {
  demandId: string
  type: 'contrato' | 'estrategia' | 'processo'
  onUnlockSuccess: () => void
  fullscreen?: boolean
  onBack?: () => void
  isTestMode?: boolean
}

interface PricingConfig {
  price: string
  label: string
  desc: string
  icon: any
  color: string
  features?: string[]
}

const DEFAULT_PRICING: Record<string, PricingConfig> = {
  contrato: {
    price: '---',
    label: 'Contrato avulso',
    desc: 'Acesso vitalício a este documento e todas as suas revisões.',
    icon: ShieldCheck,
    color: 'text-primary'
  },
  estrategia: {
    price: '---',
    label: 'Estratégia avulsa',
    desc: 'Relatório detalhado de viabilidade e blindagem jurídica.',
    icon: TrendingUp,
    color: 'text-amber-500'
  },
  processo: {
    price: '---',
    label: 'Acompanhamento premium',
    desc: 'Monitoramento em tempo real e análises ilimitadas da Minerva.',
    icon: Zap,
    color: 'text-emerald-500'
  }
}

export function Paywall({ demandId, type, onUnlockSuccess, fullscreen = false, onBack, isTestMode }: PaywallProps) {
  const [pricing, setPricing] = useState<Record<string, PricingConfig>>(DEFAULT_PRICING)
  const [proPlan, setProPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'avulso' | 'premium'>('avulso')
  const [checkoutMode, setCheckoutMode] = useState<'avulso' | 'premium' | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [isAllAccess, setIsAllAccess] = useState(false)
  const [localTestMode, setLocalTestMode] = useState(isTestMode)

  useEffect(() => {
    async function loadPricing() {
      try {
        const [plansRes, configsRes] = await Promise.all([
          getPlansAction(),
          getGlobalConfigsAction()
        ])

        const configs: any = configsRes.data || {}
        const dbPlans = plansRes.success ? plansRes.data || [] : []
        const newPricing = { ...DEFAULT_PRICING }
        
        // 1. Preços Avulsos Centralizados
        if (configs.price_contrato_avulso) {
          newPricing.contrato = { ...newPricing.contrato, price: `R$ ${parseFloat(configs.price_contrato_avulso).toFixed(2).replace('.', ',')}` }
        }
        if (configs.price_estrategia_avulsa) {
          newPricing.estrategia = { ...newPricing.estrategia, price: `R$ ${parseFloat(configs.price_estrategia_avulsa).toFixed(2).replace('.', ',')}` }
        }
        if (configs.price_processo_avulso) {
          newPricing.processo = { ...newPricing.processo, price: `R$ ${parseFloat(configs.price_processo_avulso).toFixed(2).replace('.', ',')}` }
        }

        // 2. Extrair features dos planos se existirem
        const contratoPlan = dbPlans.find((p: any) => p.slug === 'contrato-avulso')
        if (contratoPlan?.features) newPricing.contrato.features = contratoPlan.features

        const estrategiaPlan = dbPlans.find((p: any) => p.slug === 'estrategia-avulsa')
        if (estrategiaPlan?.features) newPricing.estrategia.features = estrategiaPlan.features

        const processoPlan = dbPlans.find((p: any) => p.slug === 'processo-avulso')
        if (processoPlan?.features) newPricing.processo.features = processoPlan.features

        setPricing(newPricing)
        setProPlan(dbPlans.find((p: any) => p.slug === 'pro'))
        
        // 3. Flags Globais
        if (configs.is_all_access === true) setIsAllAccess(true)
        if (configs.test_mode === true) setLocalTestMode(true)
      } catch (err) {
        console.error('Paywall pricing load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPricing()
  }, [])

  const current = pricing[type] || pricing.contrato
  const Icon = current.icon

  const handleSimulate = async () => {
    try {
      setSimulating(true)
      const res = await simulatePurchaseAction(demandId, type)
      if (res.error) throw new Error(res.error)

      toast.success('Simulação de compra concluída!')
      onUnlockSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Falha na simulação')
    } finally {
      setSimulating(false)
    }
  }

  if (isAllAccess) return null

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

        <Card className="w-full flex flex-col gap-8 bg-white border-slate-200 shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden animate-in slide-in-from-bottom-8 duration-700">

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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 shadow-inner", current.color)}>
                      <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em]">Liberação imediata</span>
                      <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none">{current.label}</h3>
                    </div>
                  </div>

                  {/* Dev Simulation Button */}
                  {localTestMode && (
                    <Button
                      onClick={handleSimulate}
                      disabled={simulating}
                      className="bg-amber-500 hover:bg-amber-600 text-white border-none h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      {simulating ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Microscope className="w-3.5 h-3.5" />}
                      {simulating ? 'Simulando...' : 'Liberar (Dev)'}
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-5">
                  <p className="text-[13px] font-bold text-slate-500 leading-relaxed">
                    Solução ideal para demandas pontuais. Garanta segurança jurídica imediata com nossa IA especializada sem custos recorrentes.
                  </p>

                  <div className="flex flex-col gap-4">
                    {(current.features || ['Download Word/PDF', 'Auditoria Minerva', 'Acesso Vitalício']).map((f, i) => (
                      <div key={i} className="flex items-start gap-3 group">
                        <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center mt-0.5 group-hover:bg-emerald-100 transition-colors">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        </div>
                        <p className="text-[13px] font-bold text-slate-600 leading-snug group-hover:text-slate-900 transition-colors">
                          {f}
                        </p>
                      </div>
                    ))}
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
                  className="w-full h-14 rounded-xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900 font-black text-xs uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all group"
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
                    <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-blue-600 text-white shadow-xl shadow-primary/30 ring-4 ring-primary/10">
                      <Sparkles size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-primary tracking-[0.25em]">Acesso Ilimitado</span>
                      <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none">{proPlan?.name || 'Plano Pro'}</h3>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <p className="text-[13px] font-bold text-slate-500 leading-relaxed pr-4">
                    Tenha a Minerva trabalhando 24/7 para sua empresa. Crie quantos documentos e estratégias desejar, sem limites.
                  </p>

                  <div className="flex flex-col gap-4 bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl pointer-events-none" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Incluso no plano:</span>

                    {(proPlan?.features || ['Hub de Contatos Ilimitado', 'Auditoria Avançada', 'Suporte Prioritário']).map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check size={10} className="text-primary" />
                        </div>
                        <span className="text-[13px] font-bold text-slate-700">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5 pt-6 border-t border-slate-200/60 relative z-10 mt-auto">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Upgrade Mensal</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                      {proPlan?.price_monthly 
                        ? `R$ ${Number(proPlan.price_monthly).toFixed(2).replace('.', ',')}` 
                        : '---'}
                    </span>
                    <span className="text-[13px] font-bold text-slate-400">/mês</span>
                  </div>
                </div>
                <Button
                  onClick={() => setCheckoutMode('premium')}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:shadow-primary/40 flex items-center justify-center gap-3 active:scale-95 transition-all group"
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
          value={parseFloat(current.price.replace('R$ ', '').replace(',', '.')) || 0}
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
          value={proPlan?.price_monthly || 99.90}
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
