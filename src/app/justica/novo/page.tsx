'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import {
  Scale,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calculator,
  Gavel,
  Loader2,
  Play,
  User,
  MapPin,
  Building,
  Mail,
  Phone,
  Briefcase,
  Contact
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PartnerSelector } from '@/components/shared/PartnerSelector'
import { Label } from '@/components/shared/Label'

const STEPS = [
  { id: 'triagem', title: 'Problema', icon: AlertCircle },
  { id: 'qualificacao', title: 'Qualificação', icon: User },
  { id: 'coleta', title: 'Fatos', icon: MessageSquare },
  { id: 'calculo', title: 'Valores', icon: Calculator },
  { id: 'geracao', title: 'Petição', icon: FileText },
  { id: 'protocolo', title: 'Guia', icon: Gavel },
]

export default function NovoJusticaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    problemType: '',
    otherParty: '', // defendant name
    // Author
    authorId: '',
    authorName: '',
    authorDocument: '',
    authorAddress: '',
    authorEmail: '',
    authorPhone: '',
    // Defendant
    defendantId: '',
    defendantName: '',
    defendantDocument: '',
    defendantAddress: '',
    defendantEmail: '',
    defendantPhone: '',
    // Facts
    whatHappened: '',
    whenHappened: '',
    triedToResolve: 'Não',
    hasEvidence: 'Sim',
    // Values
    materialDamage: '',
    moralDamage: '',
  })

  const handleSelectPartner = (side: 'author' | 'defendant', partner: any) => {
    if (side === 'author') {
      setFormData(prev => ({
        ...prev,
        authorId: partner.id,
        authorName: partner.name,
        authorDocument: partner.document,
        authorAddress: partner.address,
        authorEmail: partner.email,
        authorPhone: partner.phone
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        defendantId: partner.id,
        defendantName: partner.name,
        defendantDocument: partner.document,
        defendantAddress: partner.address,
        defendantEmail: partner.email,
        defendantPhone: partner.phone,
        otherParty: partner.name
      }))
    }
  }

  // Pre-fill user data if available
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setFormData(prev => ({
          ...prev,
          authorName: user.user_metadata?.full_name || '',
          authorDocument: user.user_metadata?.document || '',
          authorEmail: user.email || '',
          authorPhone: user.user_metadata?.phone || ''
        }))
      }
    }
    loadUser()
  }, [supabase])

  // Validação JEC
  const valSalarioMinimo = 1412
  const limiteJEC = valSalarioMinimo * 20
  const valorTotalCausa = Number(formData.materialDamage.replace(/\D/g, '')) + Number(formData.moralDamage.replace(/\D/g, ''))
  const isAptoJEC = valorTotalCausa <= limiteJEC

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  const handleStartProcess = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/justica/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          diagnosticData: {
            ...formData,
            estimatedValue: valorTotalCausa.toString(),
            description: formData.whatHappened,
            defendantName: formData.defendantName || formData.otherParty
          } 
        })
      })

      if (!response.ok) throw new Error('Falha ao processar demanda')
      
      const result = await response.json()
      toast.success('Petição gerada com sucesso!')
      
      setTimeout(() => {
        router.push(`/justica/${result.demandId}`)
      }, 1500)

    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <PageContainer centered>
        <div className="max-w-4xl mx-auto flex flex-col gap-y-10 pb-20">
          
          {/* Timeline */}
          <div className="relative flex justify-between items-center px-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
             <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />
             {STEPS.map((step, idx) => (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                   <div className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border-2",
                     idx === currentStep ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110" :
                     idx < currentStep ? "bg-emerald-500 text-white border-emerald-500" :
                     "bg-white text-slate-300 border-slate-100 shadow-sm"
                   )}>
                     {idx < currentStep ? <CheckCircle2 size={24} /> : <step.icon size={22} />}
                   </div>
                   <span className={cn(
                     "text-[9px] font-black uppercase tracking-widest",
                     idx === currentStep ? "text-primary" : "text-slate-400"
                   )}>
                     {step.title}
                   </span>
                </div>
             ))}
          </div>

          <Card className="min-h-[500px] p-8 md:p-12 rounded-[40px] border-slate-100 shadow-sm relative overflow-hidden bg-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            {/* Step 0: Problema */}
            {currentStep === 0 && (
              <div className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-center text-slate-900 border-b border-slate-100 pb-8">
                   <h2 className="text-3xl font-black uppercase">O Problema</h2>
                   <p className="text-slate-500 font-medium">Selecione o tipo de reclamação para iniciarmos.</p>
                </div>

                <div className="grid grid-cols-1 gap-12 mt-4">
                   <div className="flex flex-col gap-y-4">
                      <Label>Tipo de Problema</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { id: 'consumer', label: 'Consumidor', desc: 'Compras, Atrasos, Defeitos' },
                          { id: 'civil', label: 'Cível', desc: 'Aluguel, Danos, Dívidas' },
                          { id: 'labor', label: 'Trabalhista', desc: 'Recisão, FGTS' },
                          { id: 'neighbor', label: 'Vizinhança', desc: 'Barulho, Muro' },
                          { id: 'other', label: 'Outros', desc: 'Demais casos' }
                        ].map((type) => (
                           <button
                             key={type.id}
                             type="button"
                             onClick={() => setFormData({...formData, problemType: type.id})}
                             className={cn(
                               "flex flex-col items-start p-5 rounded-[24px] border-2 transition-all duration-300 relative group",
                               formData.problemType === type.id 
                                 ? "bg-primary/5 border-primary shadow-lg shadow-primary/10" 
                                 : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-md"
                             )}
                           >
                             <div className={cn(
                               "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
                               formData.problemType === type.id ? "bg-primary text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                             )}>
                               {type.id === 'consumer' && <ArrowRight size={20} />}
                               {type.id === 'civil' && <ArrowRight size={20} />}
                               {type.id === 'labor' && <ArrowRight size={20} />}
                               {type.id === 'neighbor' && <ArrowRight size={20} />}
                               {type.id === 'other' && <ArrowRight size={20} />}
                             </div>
                             <span className={cn("text-sm font-black uppercase tracking-tight", formData.problemType === type.id ? "text-primary" : "text-slate-900")}>
                               {type.label}
                             </span>
                             <p className="text-[11px] text-slate-400 font-bold leading-tight mt-1">{type.desc}</p>
                             
                             {formData.problemType === type.id && (
                               <div className="absolute top-4 right-4 text-primary">
                                 <CheckCircle2 size={18} />
                               </div>
                             )}
                           </button>
                        ))}
                      </div>
                   </div>

                   <div className="flex flex-col gap-y-4 max-w-xl">
                    <PartnerSelector 
                        label="Quem você quer processar?"
                        onSelect={(p) => handleSelectPartner('defendant', p)}
                        selectedId={formData.defendantId}
                        placeholder="Empresa ou Pessoa... (Ex: Banco X)"
                        className="w-full"
                      />
                   </div>
                </div>
              </div>
            )}

            {/* Step 1: Qualificação */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-center border-b border-slate-100 pb-8">
                   <h2 className="text-3xl font-black text-slate-900 uppercase">Qualificação das Partes</h2>
                   <p className="text-slate-500 font-medium">Estes dados são essenciais para que o documento saia pronto para o protocolo.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 p-8 md:p-10 bg-slate-100 rounded-[40px] border-2 border-slate-200">
                  
                  {/* Requerente */}
                  <div className="flex flex-col gap-y-6">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-4">
                      <h4 className="font-black text-slate-900 flex items-center gap-3 text-sm">
                        <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 transition-all"><Contact size={20} /></div> 
                        Requerente (Você)
                      </h4>
                    </div>
                    
                    <div className="space-y-6 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                      <PartnerSelector 
                        label="Selecionar Seu Perfil"
                        onSelect={(p) => handleSelectPartner('author', p)}
                        selectedId={formData.authorId}
                        placeholder="Buscar no Partner Hub..."
                      />

                      {formData.authorId && (
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Qualificação Vinculada</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                             {formData.authorName} • {formData.authorDocument} • {formData.authorAddress.substring(0, 40)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Réu */}
                  <div className="flex flex-col gap-y-6">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-4">
                      <h4 className="font-black text-slate-900 flex items-center gap-3 text-sm">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200 transition-all"><Building size={20} /></div> 
                        Réu (Empresa/Pessoa)
                      </h4>
                    </div>
                    
                    <div className="space-y-6 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                      <PartnerSelector 
                        label="Selecionar Réu"
                        onSelect={(p) => handleSelectPartner('defendant', p)}
                        selectedId={formData.defendantId}
                        placeholder="Buscar no Partner Hub..."
                      />

                      {formData.defendantId && (
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Dados Carregados</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                             {formData.defendantName} • {formData.defendantDocument} • {formData.defendantAddress.substring(0, 40)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Fatos */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-center border-b border-slate-100 pb-8">
                   <h2 className="text-3xl font-black text-slate-900 uppercase">Relato do Ocorrido</h2>
                   <p className="text-slate-500 font-medium font-medium">Conte o que aconteceu de forma clara e objetiva.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                   <div className="flex flex-col gap-y-3 md:col-span-2 text-left">
                      <Label>O que houve? (Detalhes)</Label>
                      <textarea 
                        value={formData.whatHappened}
                        onChange={(e) => setFormData({...formData, whatHappened: e.target.value})}
                        placeholder="Descreva cronologicamente o que aconteceu..."
                        className="w-full h-44 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-inner-sm"
                      />
                   </div>
                   <div className="flex flex-col gap-y-3 text-left">
                      <Label>Têm provas do ocorrido?</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Sim', 'Não'].map(v => (
                          <button
                            key={v}
                            onClick={() => setFormData({...formData, hasEvidence: v})}
                            className={cn(
                              "h-14 rounded-xl font-bold transition-all border-2",
                              formData.hasEvidence === v ? "bg-primary text-white border-primary shadow-md" : "bg-slate-50 text-slate-500 border-slate-200"
                            )}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                   </div>
                   <div className="flex flex-col gap-y-3 text-left">
                      <Label>Quando isso ocorreu?</Label>
                      <input 
                        type="text"
                        value={formData.whenHappened}
                        onChange={(e) => setFormData({...formData, whenHappened: e.target.value})}
                        placeholder="Ex: Há 1 mês / Data específica"
                        className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                   </div>
                </div>
              </div>
            )}

            {/* Step 3: Valores */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-center border-b border-slate-100 pb-8">
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Cálculo de Indenização</h2>
                   <p className="text-slate-500 font-medium">O limite para processar sozinho no JEC é de 20 salários mínimos.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                   <div className="flex flex-col gap-y-3 text-left">
                      <Label>Dano Material (Prejuízo Real)</Label>
                      <input 
                        type="text"
                        value={formData.materialDamage}
                        onChange={(e) => setFormData({...formData, materialDamage: e.target.value})}
                        placeholder="Ex: 1500"
                        className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                   </div>
                   <div className="flex flex-col gap-y-3 text-left">
                      <Label>Dano Moral (Reparação)</Label>
                      <input 
                        type="text"
                        value={formData.moralDamage}
                        onChange={(e) => setFormData({...formData, moralDamage: e.target.value})}
                        placeholder="Ex: 3000"
                        className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                   </div>

                   <div className={cn(
                     "md:col-span-2 p-8 rounded-[32px] border flex flex-col items-center justify-center gap-2 transition-all shadow-inner-sm",
                     isAptoJEC ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
                   )}>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total do Valor da Causa</span>
                        <span className={cn("text-5xl font-black tracking-tighter transition-all", isAptoJEC ? "text-primary" : "text-red-500")}>
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalCausa)}
                        </span>
                        {!isAptoJEC && (
                          <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                             <AlertCircle size={14} /> Excede limite do JEC (R$ {limiteJEC.toLocaleString()})
                          </div>
                        )}
                   </div>
                </div>
              </div>
            )}

            {/* Passo Final: Geração */}
            {currentStep === 4 && (
              <div className="flex flex-col items-center justify-center text-center py-12 gap-y-10">
                <div className="w-32 h-32 rounded-full border-4 border-slate-100 flex items-center justify-center bg-slate-50 shadow-inner">
                  {loading ? <Loader2 size={48} className="text-primary animate-spin" /> : <ShieldCheck size={48} className="text-emerald-500 animate-pulse" />}
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Tudo Checado!</h3>
                  <p className="text-slate-500 max-w-sm mx-auto leading-relaxed font-bold">
                    Ao prosseguir, nossa IA irá fundir as qualificações, fatos e leis para gerar sua petição no formato ideal para o Juizado Especial.
                  </p>
                </div>

                {!loading && (
                   <Button 
                     size="lg"
                     onClick={handleStartProcess}
                     className="h-16 px-12 rounded-2xl shadow-xl shadow-primary/30 bg-primary hover:bg-blue-700 font-black text-xl hover:scale-105 active:scale-95 transition-all"
                   >
                     Gerar Petição Inicial
                   </Button>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            {currentStep < 4 && (
              <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-100 relative z-10">
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="font-bold text-slate-400 hover:text-slate-900 rounded-xl px-8"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={
                    (currentStep === 0 && (!formData.problemType || !formData.otherParty)) ||
                    (currentStep === 1 && (!formData.authorName || !formData.authorDocument || !formData.defendantName)) ||
                    (currentStep === 2 && !formData.whatHappened) ||
                    (currentStep === 3 && (!formData.materialDamage || !isAptoJEC))
                  }
                  className="bg-slate-900 hover:bg-black text-white px-10 h-14 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-slate-200"
                >
                  Continuar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

          </Card>
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
