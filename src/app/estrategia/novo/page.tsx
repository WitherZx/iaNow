'use client'

import React, { useState, useEffect } from 'react'
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
import { FormInput } from '@/components/shared/FormInput'
import { FormTextArea } from '@/components/shared/FormTextArea'
import { FormSelect } from '@/components/shared/FormSelect'
import { StepBadge } from '@/components/shared/StepBadge'
import { Label } from '@/components/shared/Label'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  { id: 'profile', title: 'Contexto', icon: Building2 },
  { id: 'operation', title: 'Operação', icon: Briefcase },
  { id: 'risks', title: 'Riscos', icon: ShieldCheck },
  { id: 'vision', title: 'Visão', icon: TrendingUp },
  { id: 'preview', title: 'Análise', icon: Sparkles },
]

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


  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      const guestId = !localStorage.getItem('sb-auth-token')
        ? (localStorage.getItem('ianow_guest_id') || crypto.randomUUID())
        : null

      if (guestId && !localStorage.getItem('ianow_guest_id')) {
        localStorage.setItem('ianow_guest_id', guestId)
      }

      const response = await fetch('/api/ai/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestId ? { 'X-Guest-Id': guestId } : {})
        },
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
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-y-12 pb-20">


          {/* Form Content */}
          <Card padding="none" className="w-full min-w-0 min-h-[400px] p-4 sm:p-8 md:p-12 border-slate-100 shadow-sm relative group overflow-visible">
            <div className="absolute inset-0 overflow-hidden rounded-[24px] md:rounded-[40px] pointer-events-none">
              <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-primary/5 rounded-full blur-2xl md:blur-3xl -mr-16 -mt-16 md:-mr-32 md:-mt-32" />
            </div>

            <div className="absolute top-0 right-0 p-8 hidden md:block">
              <StepBadge current={currentStep + 1} total={STEPS.length} />
            </div>

            {currentStep === 0 && (
              <div className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-left min-w-0">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase break-words">Dados da Empresa</h2>
                  <p className="text-slate-500 leading-relaxed max-w-2xl">
                    Para uma análise precisa, precisamos entender o contexto atual da sua operação.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-4">
                  <FormInput
                    label="Nome da Organização"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Ex: iaNow Intelligence"
                    tooltip="Razão social ou nome fantasia da sua organização. Será o identificador principal no dashboard."
                  />
                  <FormInput
                    label="Qual solução você oferece hoje?"
                    value={formData.offeredSolution}
                    onChange={(e) => setFormData({ ...formData, offeredSolution: e.target.value })}
                    placeholder="Ex: Consultoria em automação de processos via IA"
                    tooltip="Descreva brevemente seu produto ou serviço core. Ex: 'Consultoria financeira B2B' ou 'SaaS de gestão de estoque'."
                  />
                  <div className="space-y-4">
                    <FormSelect
                      label="Setor de Atuação"
                      tooltip="Mercado principal onde sua empresa gera receita. Isso calibra o perfil de risco da análise."
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
                    <Label tooltip="Número total de colaboradores, incluindo sócios e prestadores fixos. Define o porte operacional.">Tamanho da Equipe</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {['1-10', '11-50', '50+'].map(val => (
                        <button
                          key={val}
                          onClick={() => setFormData({ ...formData, size: val })}
                          className={cn(
                            "h-14 rounded-2xl font-bold transition-all active:scale-95 border-2",
                            formData.size === val ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-primary/20"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-0">
                    <FormSelect
                      label="Faturamento Médio Mensal"
                      tooltip="Faixa de receita bruta mensal recorrente. Usado para sugerir níveis de blindagem adequados ao ticket."
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
                <div className="space-y-2 text-left min-w-0">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase break-words">Contexto Operacional</h2>
                  <p className="text-slate-500 leading-relaxed max-w-2xl">
                    Como seu negócio funciona no dia a dia?
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-4">
                  <div className="flex flex-col gap-y-4">
                    <Label tooltip="Natureza da sua venda principal. B2B (empresas), B2C (consumidor final), Híbrido ou SaaS (assinaturas).">Modelo de Negócio</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['B2B', 'B2C', 'Híbrido', 'SaaS'].map(val => (
                        <button
                          key={val}
                          onClick={() => setFormData({ ...formData, businessModel: val })}
                          className={cn(
                            "h-14 rounded-2xl font-bold transition-all active:scale-95 border-2",
                            formData.businessModel === val ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-primary/20"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-y-4">
                    <Label tooltip="1 = Processos manuais/papel. 5 = Fluxos totalmente digitais, automações e sistemas integrados.">Nível de Digitalização (1-5)</Label>
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

                  <div className="md:col-span-2">
                    <FormTextArea
                      label="Qual o seu maior 'Incêndio' hoje?"
                      value={formData.mainPainPoint}
                      onChange={(e) => setFormData({ ...formData, mainPainPoint: e.target.value })}
                      placeholder="Descreva o problema que mais toma seu tempo ou preocupa..."
                      tooltip="O problema operacional ou estratégico que mais consome sua energia ou do seu time agora."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-left min-w-0">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase break-words">Riscos & Blindagem</h2>
                  <p className="text-slate-500 leading-relaxed max-w-2xl">
                    Mapeando os pontos de vulnerabilidade da sua execução.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <div className="space-y-0">
                    <FormSelect
                      label="Status Jurídico"
                      tooltip="Sua percepção atual sobre a segurança legal do negócio. Ajuda a priorizar recomendações de compliance."
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
                    <FormSelect
                      label="Gestão Financeira"
                      tooltip="Como o dinheiro é controlado. Essencial para verificar a maturidade administrativa."
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
                    <Label tooltip="Selecione as áreas que impedem o negócio de fluir com mais agilidade.">Selecione Desafios Adicionais</Label>
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
                <div className="space-y-2 text-left min-w-0">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase break-words">Visão de Crescimento</h2>
                  <p className="text-slate-500 leading-relaxed max-w-2xl">
                    Onde sua execução precisa chegar?
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  <div className="md:col-span-2 flex flex-col gap-y-4">
                    <Label tooltip="O que o iaNow deve priorizar para você nos próximos meses.">Objetivos Principais</Label>
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

                  <div className="md:col-span-2">
                    <FormTextArea
                      label="O que impede você de dobrar de tamanho hoje?"
                      value={formData.growthObstacle}
                      onChange={(e) => setFormData({ ...formData, growthObstacle: e.target.value })}
                      placeholder="Identifique o maior gargalo para a escala..."
                      tooltip="Identifique o maior gargalo (capital, equipe, processos, tecnologia) que impede o crescimento acelerado."
                      className="min-h-[100px]"
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
                  <h2 className="text-2xl md:text-4xl font-black text-slate-900 uppercase">{isSubmitting ? "Minerva Está Analisando..." : "Pronto para Iniciar?"}</h2>
                  <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                    {isSubmitting ? "Mapeando os dados fornecidos e estruturando o plano estratégico. Isso leva em torno de 60 segundos." : "Com base nos dados fornecidos, a Minerva estrutura um diagnóstico estratégico com recomendações priorizadas."}
                  </p>
                </div>

                {!isSubmitting && (
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    className="w-full sm:w-auto h-16 px-6 sm:px-12 rounded-2xl shadow-2xl shadow-primary/40 bg-primary hover:bg-blue-700 font-bold text-lg sm:text-xl group transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                  >
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-3 fill-white shrink-0" /> Iniciar Análise
                  </Button>
                )}

                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">IA Engine Version 4.0</span>
              </div>
            )}

            {currentStep < STEPS.length - 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-8 border-t border-slate-100 relative z-10 gap-4">
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="w-full sm:w-auto font-bold text-slate-400 hover:text-slate-900 order-2 sm:order-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Button
                  onClick={nextStep}
                  className="w-full sm:w-auto flex items-center justify-center bg-slate-900 hover:bg-black text-white px-8 font-bold h-12 rounded-xl shadow-xl shadow-black/10 transition-all hover:translate-x-1 order-1 sm:order-2"
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
                <span className="text-[11px] font-black text-primary uppercase tracking-widest">Dica da Minerva</span>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Dados precisos geram diagnósticos precisos. Setor, porte e modelo de negócio calibram diretamente a qualidade das recomendações.
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
