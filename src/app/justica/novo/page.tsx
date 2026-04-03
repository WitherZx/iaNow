'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { 
  AlertCircle, 
  User, 
  MessageSquare, 
  Calculator, 
  FileText,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft 
} from 'lucide-react'
import { FormInput } from '@/components/shared/FormInput'
import { FormSelect } from '@/components/shared/FormSelect'
import { FormTextArea } from '@/components/shared/FormTextArea'
import { PartnerSelector } from '@/components/shared/PartnerSelector'
import { StepBadge } from '@/components/shared/StepBadge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/utils/cn'

const STEPS = [
  { id: 'triagem', title: 'Problema', icon: AlertCircle },
  { id: 'qualificacao', title: 'Qualificação', icon: User },
  { id: 'calculo', title: 'Valores', icon: Calculator },
]

export default function NovoJusticaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    problemType: 'Consumidor',
    authorName: '',
    authorDocument: '',
    defendantName: '',
    defendantId: '',
    whatHappened: '',
    whenHappened: '',
    materialDamage: '0',
    moralDamage: '0'
  })

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setFormData(prev => ({
          ...prev,
          authorName: session.user.user_metadata?.full_name || '',
          authorDocument: session.user.user_metadata?.document || '',
        }))
        setUser(session.user)
      }
    }
    loadUser()
  }, [supabase])

  const handleComplete = async () => {
    try {
      setLoading(true)
      const guestId = !localStorage.getItem('sb-auth-token') 
        ? (localStorage.getItem('ianow_guest_id') || crypto.randomUUID()) 
        : null
      
      if (guestId && !localStorage.getItem('ianow_guest_id')) {
        localStorage.setItem('ianow_guest_id', guestId)
      }

      const fullData = {
        ...formData,
        authorEmail: user?.email || '',
        authorPhone: user?.user_metadata?.phone || '',
        description: formData.whatHappened,
        estimatedValue: (Number(formData.materialDamage || 0) + Number(formData.moralDamage || 0)).toString()
      }

      const response = await fetch('/api/justica/gerar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(guestId ? { 'X-Guest-Id': guestId } : {})
        },
        body: JSON.stringify({ diagnosticData: fullData })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao processar demanda')
      }
      
      const result = await response.json()
      toast.success('Petição redigida. Redirecionando...')
      
      setTimeout(() => {
        router.push(`/justica/${result.demandId}`)
      }, 1500)

    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar.')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1))
  const prevStep = () => setActiveStep(prev => Math.max(prev - 1, 0))

  const renderStep = () => {
    switch (activeStep) {
      case 0: // Problema
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <FormSelect 
              label="Tipo de Problema"
              value={formData.problemType}
              onChange={(val) => setFormData({ ...formData, problemType: val })}
              options={['Consumidor', 'Trabalhista', 'Cível Geral', 'Imobiliário', 'Outro']}
              required
            />
            <FormTextArea 
              label="O que aconteceu?"
              placeholder="Descreva o problema com detalhes..."
              value={formData.whatHappened}
              onChange={(e) => setFormData({ ...formData, whatHappened: e.target.value })}
              required
            />
            <FormInput 
              label="Quando aconteceu?"
              placeholder="Ex: Ontem, Semana passada, 01/01/2024"
              value={formData.whenHappened}
              onChange={(e) => setFormData({ ...formData, whenHappened: e.target.value })}
              required
            />
          </div>
        )
      case 1: // Qualificação
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput 
                label="Seu Nome Completo"
                value={formData.authorName}
                onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                required
              />
              <FormInput 
                label="Seu CPF/CNPJ"
                value={formData.authorDocument}
                onChange={(e) => setFormData({ ...formData, authorDocument: e.target.value })}
                required
              />
            </div>
            <div className="pt-4 border-t border-slate-100">
              <PartnerSelector 
                label="Quem você está processando?"
                onSelect={(p) => setFormData({ ...formData, defendantName: p.name, defendantId: p.id })}
                placeholder="Busque ou cadastre o réu..."
              />
              {formData.defendantName && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
                   <CheckCircle2 size={16} className="text-emerald-500" />
                   <span className="text-xs font-bold text-emerald-700 uppercase tracking-tight">Réu Selecionado: {formData.defendantName}</span>
                </div>
              )}
            </div>
          </div>
        )
      case 2: // Valores
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput 
                label="Prejuízo Material (R$)"
                type="number"
                value={formData.materialDamage}
                onChange={(e) => setFormData({ ...formData, materialDamage: e.target.value })}
                required
              />
              <FormInput 
                label="Danos Morais (R$)"
                type="number"
                value={formData.moralDamage}
                onChange={(e) => setFormData({ ...formData, moralDamage: e.target.value })}
                required
              />
            </div>
            <Card className="p-6 bg-slate-50 border-none shadow-none">
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Valor Total da Causa</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(formData.materialDamage) + Number(formData.moralDamage))}
                </span>
              </div>
            </Card>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <PageContainer centered>
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-y-10 pb-20">
          <div className="flex flex-col gap-y-2">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Nova Demanda</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm">Assistente de Protocolo Minerva AI</p>
          </div>

          <div className="flex items-center gap-2 mb-2">
            {STEPS.map((s, i) => (
              <div 
                key={s.id} 
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  i === activeStep ? "bg-primary w-12" : i < activeStep ? "bg-emerald-500" : "bg-slate-100"
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
             <StepBadge current={activeStep + 1} total={STEPS.length} />
             <div className="flex items-center gap-1">
                {STEPS.map((s, i) => (
                   <div key={s.id} className={cn(
                      "w-2 h-2 rounded-full",
                      i === activeStep ? "bg-primary" : "bg-slate-200"
                   )} />
                ))}
             </div>
          </div>

          {loading ? (
             <Card className="flex flex-col items-center justify-center p-20 gap-6">
                <Loader2 size={64} className="text-primary animate-spin" />
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Minerva está redigindo...</h2>
                  <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-[10px]">Isso pode levar alguns segundos. Por favor, aguarde.</p>
                </div>
             </Card>
          ) : (
            <Card className="p-8 md:p-12 bg-white border border-slate-100 shadow-2xl rounded-[40px]">
              <div className="mb-10 flex items-center gap-4 border-b border-slate-50 pb-8">
                 <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    {React.createElement(STEPS[activeStep].icon, { size: 24 })}
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Passo {activeStep + 1} de 3</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{STEPS[activeStep].title}</p>
                 </div>
              </div>

              {renderStep()}

              <div className="mt-12 flex items-center justify-between pt-8 border-t border-slate-50">
                <Button 
                  variant="outline"
                  onClick={prevStep}
                  disabled={activeStep === 0}
                  className="h-12 px-8 rounded-xl font-black uppercase text-xs tracking-widest"
                >Voltar</Button>
                
                {activeStep === 2 ? (
                  <Button 
                    onClick={handleComplete}
                    className="h-12 px-10 bg-primary text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
                  >Gerar Petição Agora <ArrowRight size={16} className="ml-2" /></Button>
                ) : (
                  <Button 
                    onClick={nextStep}
                    className="h-12 px-10 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/10"
                  >Próximo Passo <ArrowRight size={16} className="ml-2" /></Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
