'use client'

import React, { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import {
  Building2,
  Target,
  TrendingUp,
  Briefcase,
  Users,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Zap,
  CheckCircle2,
  Sparkles,
  Play,
  Clock,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Label } from '@/components/shared/Label'
import { StepBadge } from '@/components/shared/StepBadge'
import { PartnerSelector } from '@/components/shared/PartnerSelector'

const STEPS = [
  { id: 'profile', title: 'Contexto', icon: Building2 },
  { id: 'operation', title: 'Operação', icon: Briefcase },
  { id: 'risks', title: 'Riscos', icon: ShieldCheck },
  { id: 'vision', title: 'Visão', icon: TrendingUp },
  { id: 'preview', title: 'Análise', icon: Sparkles },
]

function CustomSelect({
  value,
  onChange,
  options,
  label
}: {
  value: string,
  onChange: (val: string) => void,
  options: string[],
  label: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <div className="flex flex-col gap-y-4">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-14 px-5 rounded-2xl bg-slate-200 border-none text-slate-900 font-bold flex items-center justify-between transition-all hover:bg-slate-300 group"
        >
          <span>{value}</span>
          <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[70] animate-in fade-in zoom-in-95 duration-200">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full h-12 px-4 rounded-xl text-left font-bold transition-all flex items-center justify-between group",
                  value === option ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {option}
                {value === option && <CheckCircle2 size={16} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function NovoDiagnosticoPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCustomSector, setIsCustomSector] = useState(false)
  const [formData, setFormData] = useState({
    companyName: 'Minha Empresa',
    website: '',
    sector: 'Tecnologia & Software',
    offeredSolution: '',
    size: '1-10',
    revenue: 'Até R$ 100k/mês',
    businessModel: 'B2B',
    digitalLevel: 3,
    mainPainPoint: '',
    challenges: [] as string[],
    legalStatus: 'Estável',
    financialControl: 'Planilha',
    goals: [] as string[],
    growthObstacle: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelectPartner = (partner: any) => {
    setFormData(prev => ({
      ...prev,
      companyName: partner.name || prev.companyName,
      website: partner.website || partner.metadata?.website || partner.metadata?.site || partner.metadata?.url || prev.website,
      sector: (partner.metadata?.setor || partner.metadata?.sector) || prev.sector
    }))
  }

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/ai/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosticData: formData })
      })

      if (!response.ok) throw new Error('Falha ao processar estratégia')

      const result = await response.json()

      if (result.success) {
        // Agora que a geração ocorre em background, mandamos de volta para a tela de estratégias (para cair em "Em Fila")
        setTimeout(() => {
          window.location.href = '/estrategia'
        }, 1500)
      } else {
        setTimeout(() => {
          window.location.href = '/estrategia'
        }, 1500)
      }

    } catch (err) {
      console.error(err)
      setIsSubmitting(false)
      alert('Erro ao gerar estratégia. Verifique sua conexão ou tente novamente.')
    }
  }

  return (
    <DashboardLayout>
      <PageContainer centered>
        <div className="max-w-5xl mx-auto flex flex-col gap-y-12 pb-20">

          {/* Progress Bar Container */}
          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />
            <div className="relative flex justify-between items-center px-2">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex flex-col items-center gap-y-3 relative z-10 bg-slate-50 md:bg-white px-4 py-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                    idx === currentStep
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110"
                      : idx < currentStep
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-white text-slate-300 border-slate-100"
                  )}>
                    {idx < currentStep ? <CheckCircle2 size={24} /> : <step.icon size={24} />}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    idx === currentStep ? "text-primary" : "text-slate-400"
                  )}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <Card className="min-h-[400px] p-8 md:p-12 border-slate-100 shadow-sm relative group overflow-visible">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="absolute top-0 right-0 p-8 hidden md:block">
              <StepBadge current={currentStep + 1} total={STEPS.length} />
            </div>

            {currentStep === 0 && (
              <div className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-left">
                  <h2 className="text-3xl font-black text-slate-900 uppercase">Dados da Empresa</h2>
                  <p className="text-slate-500 leading-relaxed max-w-2xl">
                    Para uma análise precisa, precisamos entender o contexto atual da sua operação.
                  </p>
                </div>

                {/* Seletor do Partner Hub */}
                <div className="pt-4 pb-8 border-b border-slate-100">
                  <PartnerSelector 
                    label="Puxar Dados do Partner Hub"
                    onSelect={handleSelectPartner}
                    placeholder="Buscar histórico ou empresa matriz..."
                  />
                  <p className="mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-1 leading-relaxed">
                    Selecione um registro existente para preencher os dados básicos automaticamente.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <div className="flex flex-col gap-y-4">
                    <Label>Nome da Organização</Label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="Ex: iaNow Intelligence"
                      className="w-full h-14 px-5 rounded-2xl bg-slate-200 border-none text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-y-4">
                    <Label>Site da Empresa (Opcional)</Label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="Ex: www.ianow.com.br"
                      className="w-full h-14 px-5 rounded-2xl bg-slate-200 border-none text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-y-4">
                    <Label>Qual solução você oferece hoje?</Label>
                    <input
                      type="text"
                      value={formData.offeredSolution}
                      onChange={(e) => setFormData({ ...formData, offeredSolution: e.target.value })}
                      placeholder="Ex: Consultoria em automação de processos via IA"
                      className="w-full h-14 px-5 rounded-2xl bg-slate-200 border-none text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-4">
                    <CustomSelect
                      label="Setor de Atuação"
                      value={isCustomSector ? 'Personalizado' : formData.sector}
                      onChange={(val) => {
                        if (val === 'Outro...') {
                          setIsCustomSector(true)
                          setFormData({ ...formData, sector: '' })
                        } else {
                          setIsCustomSector(false)
                          setFormData({ ...formData, sector: val })
                        }
                      }}
                      options={[
                        'Tecnologia & Software',
                        'Serviços Jurídicos',
                        'Varejo & E-commerce',
                        'Indústria & Logística',
                        'Saúde & Bem-estar',
                        'Educação',
                        'Outro...'
                      ]}
                    />
                    {isCustomSector && (
                      <div className="relative animate-in slide-in-from-top-2 duration-300">
                        <input
                          type="text"
                          autoFocus
                          value={formData.sector}
                          onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                          placeholder="Qual o seu setor?"
                          className="w-full h-14 pl-5 pr-32 rounded-2xl bg-slate-200 border-2 border-primary/20 text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        <button
                          onClick={() => {
                            setIsCustomSector(false)
                            setFormData({ ...formData, sector: 'Tecnologia & Software' })
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-primary hover:text-blue-700"
                        >
                          Voltar para lista
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-y-4">
                    <Label>Tamanho da Equipe</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {['1-10', '11-50', '50+'].map(val => (
                        <button
                          key={val}
                          onClick={() => setFormData({ ...formData, size: val })}
                          className={cn(
                            "h-14 rounded-2xl font-bold transition-all active:scale-95 border-2",
                            formData.size === val ? "bg-primary text-white border-primary" : "bg-slate-200 text-slate-600 border-transparent hover:border-primary/20"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-0">
                    <CustomSelect
                      label="Faturamento Médio Mensal"
                      value={formData.revenue}
                      onChange={(val) => setFormData({ ...formData, revenue: val })}
                      options={[
                        'Até R$ 50k',
                        'R$ 50k - R$ 200k',
                        'R$ 200k - R$ 1M',
                        'Acima de R$ 1M'
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-black text-slate-900 uppercase">Contexto Operacional</h2>
                  <p className="text-slate-500 leading-relaxed max-w-2xl mx-auto">
                    Como seu negócio funciona no dia a dia?
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <div className="flex flex-col gap-y-4">
                    <Label>Modelo de Negócio</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['B2B', 'B2C', 'Híbrido', 'SaaS'].map(val => (
                        <button
                          key={val}
                          onClick={() => setFormData({ ...formData, businessModel: val })}
                          className={cn(
                            "h-14 rounded-2xl font-bold transition-all active:scale-95 border-2",
                            formData.businessModel === val ? "bg-primary text-white border-primary" : "bg-slate-200 text-slate-600 border-transparent hover:border-primary/20"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-y-4">
                    <Label>Nível de Digitalização (1-5)</Label>
                    <div className="flex items-center gap-3">
                      {[1, 2, 3, 4, 5].map(val => (
                        <button
                          key={val}
                          onClick={() => setFormData({ ...formData, digitalLevel: val })}
                          className={cn(
                            "w-10 h-10 rounded-xl font-bold transition-all border-2",
                            formData.digitalLevel >= val ? "bg-primary border-primary text-white" : "bg-slate-200 border-transparent text-slate-400"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {formData.digitalLevel <= 2 && "Manual/Antigo"}
                      {formData.digitalLevel === 3 && "Em transição"}
                      {formData.digitalLevel >= 4 && "Altamente Tecnológico"}
                    </p>
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-y-4">
                    <Label>Qual o seu maior "Incêndio" hoje?</Label>
                    <textarea
                      value={formData.mainPainPoint}
                      onChange={(e) => setFormData({ ...formData, mainPainPoint: e.target.value })}
                      placeholder="Descreva o problema que mais toma seu tempo ou preocupa..."
                      className="w-full min-h-[100px] p-5 rounded-2xl bg-slate-200 border-none text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-black text-slate-900 uppercase">Riscos & Blindagem</h2>
                  <p className="text-slate-500 leading-relaxed max-w-2xl mx-auto">
                    Mapeando os pontos de vulnerabilidade da sua execução.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <div className="space-y-0">
                    <CustomSelect
                      label="Status Jurídico"
                      value={formData.legalStatus}
                      onChange={(val) => setFormData({ ...formData, legalStatus: val })}
                      options={[
                        '100% Estável',
                        'Riscos Trabalhistas ativos',
                        'Fragilidade em Contratos',
                        'Problemas Societários'
                      ]}
                    />
                  </div>

                  <div className="space-y-0">
                    <CustomSelect
                      label="Gestão Financeira"
                      value={formData.financialControl}
                      onChange={(val) => setFormData({ ...formData, financialControl: val })}
                      options={[
                        'ERP/Sistema Robusto',
                        'Planilhas de Controle',
                        'Conta Bancária (Extrato)',
                        'Sem controle formal'
                      ]}
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-y-4">
                    <Label>Selecione Desafios Adicionais</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        "Documentação",
                        "Fluxo de Caixa",
                        "Escalabilidade",
                        "Processos",
                        "Equipe",
                        "Vendas"
                      ].map(option => (
                        <button
                          key={option}
                          onClick={() => {
                            const newChallenges = formData.challenges.includes(option)
                              ? formData.challenges.filter(c => c !== option)
                              : [...formData.challenges, option]
                            setFormData({ ...formData, challenges: newChallenges })
                          }}
                          className={cn(
                            "h-12 rounded-xl text-xs font-bold transition-all border-2",
                            formData.challenges.includes(option) ? "bg-primary/5 border-primary text-primary" : "bg-slate-200 border-transparent text-slate-500"
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-black text-slate-900 uppercase">Visão de Crescimento</h2>
                  <p className="text-slate-500 leading-relaxed max-w-2xl mx-auto">
                    Onde sua execução precisa chegar?
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <div className="md:col-span-2 flex flex-col gap-y-4">
                    <Label>Objetivos Principais</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        "Reduzir Custos",
                        "Escala de Vendas",
                        "Compliance",
                        "Automação",
                        "Expansão",
                        "Investimento"
                      ].map(option => (
                        <button
                          key={option}
                          onClick={() => {
                            const newGoals = formData.goals.includes(option)
                              ? formData.goals.filter(g => g !== option)
                              : [...formData.goals, option]
                            setFormData({ ...formData, goals: newGoals })
                          }}
                          className={cn(
                            "h-12 rounded-xl text-xs font-bold transition-all border-2",
                            formData.goals.includes(option) ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-slate-200 border-transparent text-slate-500"
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-y-4">
                    <Label>O que impede você de dobrar de tamanho hoje?</Label>
                    <textarea
                      value={formData.growthObstacle}
                      onChange={(e) => setFormData({ ...formData, growthObstacle: e.target.value })}
                      placeholder="Identifique o maior gargalo para a escala..."
                      className="w-full min-h-[100px] p-5 rounded-2xl bg-slate-200 border-none text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="flex flex-col items-center justify-center text-center py-10 gap-y-8 animate-in zoom-in duration-500">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-slate-100 flex items-center justify-center">
                    {isSubmitting ? <Clock size={48} className="text-primary animate-spin" /> : <Sparkles size={48} className="text-primary animate-pulse" />}
                  </div>
                  <div className={cn("absolute inset-0 rounded-full border-4 border-primary border-t-transparent", isSubmitting ? "animate-spin" : "hidden")} />
                </div>

                <div className="space-y-3">
                  <h2 className="text-4xl font-black text-slate-900 uppercase">{isSubmitting ? "Processando..." : "Pronto para a Execução?"}</h2>
                  <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                    {isSubmitting ? "Aguarde enquanto nossa inteligência sistêmica mapeia sua rota de blindagem..." : "Nossa inteligência sistêmica analisará seus dados para gerar um plano estratégico completo em poucos segundos."}
                  </p>
                </div>

                {!isSubmitting && (
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    className="h-16 px-12 rounded-2xl shadow-2xl shadow-primary/40 bg-primary hover:bg-blue-700 font-bold text-xl group transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-6 h-6 mr-3 fill-white" /> Iniciar Processamento
                  </Button>
                )}

                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">IA Engine Version 4.0</span>
              </div>
            )}

            {/* Navigation Buttons */}
            {currentStep < STEPS.length - 1 && (
              <div className="flex items-center justify-between mt-12 pt-12 border-t border-slate-100 relative z-10">
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="font-bold text-slate-400 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Button
                  onClick={nextStep}
                  className="bg-slate-900 hover:bg-black text-white px-8 font-bold h-12 rounded-xl shadow-xl shadow-black/10 transition-all hover:translate-x-1"
                >
                  Continuar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </Card>

          {/* Tips Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Zap size={20} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-black text-primary uppercase tracking-widest">Dica da IA Ativa</span>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Quanto mais precisos forem os dados do setor e tamanho da empresa, mais personalizada será a blindagem gerada pelo nosso motor de execução.
                </p>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-center gap-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Estimado</span>
              <span className="text-xl font-bold text-slate-900">~ 2 minutos</span>
            </div>
          </div>

        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
