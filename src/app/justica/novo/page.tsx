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
  ArrowLeft,
  UserPlus
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
import { useAuth } from '@/hooks/useAuth'

const TYPE_OPTIONS = [
  { label: 'Pessoa Física', value: 'pf' },
  { label: 'Pessoa Jurídica', value: 'pj' }
]

const STEPS = [
  { id: 'triagem', title: 'Problema', icon: AlertCircle },
  { id: 'qualificacao', title: 'Qualificação', icon: User },
  { id: 'calculo', title: 'Valores', icon: Calculator },
]

// Formatting helpers replicated from MinervaAssistant
const formatCpf = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

const formatCnpj = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    .slice(0, 18)
}

const formatDoc = (value: string, type: 'pf' | 'pj') => {
  return type === 'pj' ? formatCnpj(value) : formatCpf(value)
}

export default function NovoJusticaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  const { isAuthenticated, user: authUser } = useAuth()

  const [formData, setFormData] = useState({
    problemType: 'Consumidor',
    // Author
    authorType: 'pf' as 'pf' | 'pj',
    authorName: '',
    authorDocument: '',
    authorEmail: '',
    authorPhone: '',
    authorAddress: '',
    authorId: '',
    authorRepName: '',
    authorRepDoc: '',
    // Defendant
    defendantType: 'pf' as 'pf' | 'pj',
    defendantName: '',
    defendantDocument: '',
    defendantEmail: '',
    defendantPhone: '',
    defendantAddress: '',
    defendantId: '',
    defendantRepName: '',
    defendantRepDoc: '',
    // Case
    whatHappened: '',
    whenHappened: '',
    materialDamage: '0',
    moralDamage: '0'
  })

  useEffect(() => {
    if (authUser) {
      setFormData(prev => ({
        ...prev,
        authorName: authUser.user_metadata?.full_name || '',
        authorDocument: authUser.user_metadata?.document || '',
        authorEmail: authUser.email || '',
        authorPhone: authUser.user_metadata?.phone || '',
      }))
    }
  }, [authUser])

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
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Author Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <User size={18} />
                </div>
                <h3 className="text-sm font-black text-slate-900 tracking-widest">Qualificação do Autor</h3>
              </div>

              {isAuthenticated && (
                <PartnerSelector
                  label="Selecione o Autor"
                  onSelect={(p) => setFormData({
                    ...formData,
                    authorId: p.id,
                    authorName: p.name || '',
                    authorDocument: p.document || '',
                    authorType: p.type || 'pf',
                    authorEmail: p.email || '',
                    authorPhone: p.phone || '',
                    authorAddress: p.address || ''
                  })}
                  selectedId={formData.authorId}
                  placeholder="Selecione a empresa ou pessoa..."
                />
              )}

              {(!isAuthenticated || formData.authorId === 'manual' || !formData.authorId) && (
                <div className="p-4 sm:p-6 bg-amber-50/50 border border-amber-100 rounded-[24px] sm:rounded-[32px] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-[10px] font-black uppercase text-amber-700/60 tracking-widest">Dados do Autor</span>
                    {/* PF/PJ Toggle */}
                    <div className="flex bg-white rounded-xl p-1 border border-amber-200/50 shadow-sm self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, authorType: 'pf' })}
                        className={cn(
                          "px-3 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                          formData.authorType === 'pf' ? "bg-amber-100 text-amber-800 shadow-sm" : "text-slate-400"
                        )}
                      >Pessoa Física</button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, authorType: 'pj' })}
                        className={cn(
                          "px-3 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                          formData.authorType === 'pj' ? "bg-amber-100 text-amber-800 shadow-sm" : "text-slate-400"
                        )}
                      >Pessoa Jurídica</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-widest ml-1">{formData.authorType === 'pj' ? 'Razão Social' : 'Nome Completo'}</label>
                      <input
                        className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                        placeholder={formData.authorType === 'pj' ? 'Empresa LTDA...' : 'Nome do contato...'}
                        value={formData.authorName}
                        onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-widest ml-1">{formData.authorType === 'pj' ? 'CNPJ' : 'CPF'}</label>
                      <input
                        className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                        placeholder={formData.authorType === 'pj' ? "00.000.000/0000-00" : "000.000.000-00"}
                        value={formData.authorDocument}
                        onChange={(e) => setFormData({ ...formData, authorDocument: formatDoc(e.target.value, formData.authorType) })}
                      />
                    </div>

                    {formData.authorType === 'pj' && (
                      <>
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">Nome do Rep. Legal (Opcional)</label>
                          <input
                            type="text"
                            value={formData.authorRepName}
                            onChange={(e) => setFormData({ ...formData, authorRepName: e.target.value })}
                            placeholder="Nome do Sócio/Diretor (Se souber)..."
                            className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">CPF do Representante (Opcional)</label>
                          <input
                            type="text"
                            value={formData.authorRepDoc}
                            onChange={(e) => setFormData({ ...formData, authorRepDoc: formatCpf(e.target.value) })}
                            placeholder="000.000.000-00 (Se souber)"
                            className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-widest ml-1">E-mail / Telefone (Opcional)</label>
                      <input
                        className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                        placeholder="contato@exemplo.com ou (11) 9..."
                        value={formData.authorEmail}
                        onChange={(e) => setFormData({ ...formData, authorEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-widest ml-1">Endereço Completo (Opcional)</label>
                      <input
                        className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                        placeholder="Rua, Número, Bairro, Cidade - UF"
                        value={formData.authorAddress}
                        onChange={(e) => setFormData({ ...formData, authorAddress: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Defendant Section */}
            <div className="space-y-6 pt-10 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                  <UserPlus size={18} />
                </div>
                <h3 className="text-sm font-black text-slate-900 tracking-widest">Qualificação do Réu</h3>
              </div>

              {isAuthenticated && (
                <PartnerSelector
                  label="Selecione o Réu"
                  onSelect={(p) => setFormData({
                    ...formData,
                    defendantId: p.id,
                    defendantName: p.name || '',
                    defendantDocument: p.document || '',
                    defendantType: p.type || 'pf',
                    defendantEmail: p.email || '',
                    defendantPhone: p.phone || '',
                    defendantAddress: p.address || ''
                  })}
                  selectedId={formData.defendantId}
                  placeholder="Busque o réu nos contatos..."
                />
              )}

              {(!isAuthenticated || formData.defendantId === 'manual' || !formData.defendantId) && (
                <div className="p-4 sm:p-6 bg-amber-50/50 border border-amber-100 rounded-[24px] sm:rounded-[32px] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-[10px] font-black uppercase text-amber-700/60 tracking-widest">Dados do Réu</span>
                    {/* PF/PJ Toggle */}
                    <div className="flex bg-white rounded-xl p-1 border border-amber-200/50 shadow-sm self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, defendantType: 'pf' })}
                        className={cn(
                          "px-3 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                          formData.defendantType === 'pf' ? "bg-amber-100 text-amber-800 shadow-sm" : "text-slate-400"
                        )}
                      >Pessoa Física</button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, defendantType: 'pj' })}
                        className={cn(
                          "px-3 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                          formData.defendantType === 'pj' ? "bg-amber-100 text-amber-800 shadow-sm" : "text-slate-400"
                        )}
                      >Pessoa Jurídica</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-widest ml-1">{formData.defendantType === 'pj' ? 'Razão Social' : 'Nome Completo'}</label>
                      <input
                        className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                        placeholder={formData.defendantType === 'pj' ? 'Empresa LTDA...' : 'Nome do contato...'}
                        value={formData.defendantName}
                        onChange={(e) => setFormData({ ...formData, defendantName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-widest ml-1">{formData.defendantType === 'pj' ? 'CNPJ' : 'CPF'}</label>
                      <input
                        className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                        placeholder={formData.defendantType === 'pj' ? "00.000.000/0000-00" : "000.000.000-00"}
                        value={formData.defendantDocument}
                        onChange={(e) => setFormData({ ...formData, defendantDocument: formatDoc(e.target.value, formData.defendantType) })}
                      />
                    </div>

                    {formData.defendantType === 'pj' && (
                      <>
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">Nome do Rep. Legal (Opcional)</label>
                          <input
                            type="text"
                            value={formData.defendantRepName}
                            onChange={(e) => setFormData({ ...formData, defendantRepName: e.target.value })}
                            placeholder="Nome do Sócio/Diretor (Se souber)..."
                            className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">CPF do Representante (Opcional)</label>
                          <input
                            type="text"
                            value={formData.defendantRepDoc}
                            onChange={(e) => setFormData({ ...formData, defendantRepDoc: formatCpf(e.target.value) })}
                            placeholder="000.000.000-00 (Se souber)"
                            className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-widest ml-1">E-mail / Telefone (Opcional)</label>
                      <input
                        className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                        placeholder="contato@exemplo.com ou (11) 9..."
                        value={formData.defendantEmail}
                        onChange={(e) => setFormData({ ...formData, defendantEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-widest ml-1">Endereço Completo (Opcional)</label>
                      <input
                        className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                        placeholder="Rua, Número, Bairro, Cidade - UF"
                        value={formData.defendantAddress}
                        onChange={(e) => setFormData({ ...formData, defendantAddress: e.target.value })}
                      />
                    </div>
                  </div>
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
            <div className="bg-slate-50/50 rounded-[32px] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] leading-relaxed">Valor Total<br className="hidden sm:block" /> da Causa</p>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                R$ {(Number(formData.materialDamage || 0) + Number(formData.moralDamage || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <PageContainer centered>
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-y-6 sm:gap-y-10 pb-10 sm:pb-20 px-0 sm:px-4">
          <div className="flex flex-col gap-y-1 sm:gap-y-2 px-0 sm:px-0">
            <h1 className="text-2xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Nova Demanda</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] md:text-sm">Assistente de Protocolo Minerva AI</p>
          </div>

          <div className="flex items-center gap-2 mb-2 px-0 sm:px-0">
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

          <div className="flex items-center justify-between mb-4 px-0 sm:px-0">
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
            <Card className="flex flex-col items-center justify-center p-12 sm:p-20 gap-6 rounded-[32px] sm:rounded-[40px]">
              <Loader2 size={48} className="text-primary animate-spin sm:w-[64px] sm:h-[64px]" />
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight italic">Minerva está redigindo...</h2>
                <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-[9px] sm:text-[10px]">Isso pode levar alguns segundos. Por favor, aguarde.</p>
              </div>
            </Card>
          ) : (
            <Card className="p-4 sm:p-12 bg-white border border-slate-100 shadow-2xl rounded-[32px] sm:rounded-[40px] mx-0 sm:mx-0">
              <div className="mb-8 flex items-center gap-3 sm:gap-4 border-b border-slate-50">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-primary">
                  {React.createElement(STEPS[activeStep].icon, { size: 20 })}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">Passo {activeStep + 1} de 3</h3>
                  <p className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest">{STEPS[activeStep].title}</p>
                </div>
              </div>

              {renderStep()}

              <div className="mt-8 sm:mt-12 border-t border-slate-50">
                <div className="flex items-center justify-between w-full gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={activeStep === 0}
                    className="flex-shrink-0 h-10 sm:h-12 px-3 sm:px-8 rounded-xl font-black uppercase text-[9px] sm:text-xs tracking-widest min-w-[70px] sm:min-w-0"
                  >Voltar</Button>

                  {activeStep === 2 ? (
                    <Button
                      onClick={handleComplete}
                      className="flex-1 sm:flex-none h-10 sm:h-12 px-3 sm:px-10 bg-primary text-white rounded-xl font-black uppercase text-[9px] sm:text-xs tracking-widest shadow-xl shadow-primary/20 whitespace-nowrap"
                    >Gerar Petição Agora <ArrowRight size={12} className="ml-1 sm:ml-2" /></Button>
                  ) : (
                    <Button
                      onClick={nextStep}
                      className="flex-1 sm:flex-none h-10 sm:h-12 px-3 sm:px-10 bg-slate-900 text-white rounded-xl font-black uppercase text-[9px] sm:text-xs tracking-widest shadow-xl shadow-slate-900/10 whitespace-nowrap"
                    >Próximo Passo <ArrowRight size={12} className="ml-1 sm:ml-2" /></Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
