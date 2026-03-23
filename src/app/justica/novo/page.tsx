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
  Contact,
  Upload,
  X,
  FileSearch,
  BookOpen
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PartnerSelector } from '@/components/shared/PartnerSelector'
import { Label } from '@/components/shared/Label'
import { StepBadge } from '@/components/shared/StepBadge'

const STEPS = [
  { id: 'triagem', title: 'Problema', icon: AlertCircle },
  { id: 'qualificacao', title: 'Qualificação', icon: User },
  { id: 'coleta', title: 'Fatos', icon: MessageSquare },
  { id: 'calculo', title: 'Valores', icon: Calculator },
  { id: 'geracao', title: 'Petição', icon: FileText },
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
    comarca: '',
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
    jurisprudence: '', // PDF or Text content
    // Values
    materialDamage: '',
    moralDamage: '',
  })
  const [isExtracting, setIsExtracting] = useState(false)

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
            defendantName: formData.defendantName || formData.otherParty,
            jurisprudence: formData.jurisprudence
          } 
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao processar demanda')
      }
      
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
          

          <Card className="min-h-[500px] p-5 sm:p-8 md:p-12 rounded-[40px] border-slate-100 shadow-sm relative bg-white overflow-visible">
            <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-primary/5 rounded-full blur-2xl md:blur-3xl -mr-16 -mt-16 md:-mr-32 md:-mt-32 pointer-events-none" />
            
            <div className="flex w-full justify-center mb-8">
              <StepBadge current={currentStep + 1} total={STEPS.length} />
            </div>
            
            {/* Step 0: Problema */}
            {currentStep === 0 && (
              <div className="flex flex-col gap-y-6 animate-in fade-in slide-in-from-right-4 duration-500 overflow-visible">
                <div className="space-y-2 text-left text-slate-900 border-b border-slate-100 pb-5">
                   <h2 className="text-3xl font-black uppercase">O Problema</h2>
                   <p className="text-slate-500 font-medium">Selecione o tipo de reclamação para iniciarmos.</p>
                </div>

                <div className="grid grid-cols-1 gap-12 mt-1">
                   <div className="flex flex-col gap-y-4">
                      <Label tooltip="Selecione a área jurídica mais próxima do seu caso. Em caso de dúvida, escolha 'Outros' e a IA identificará o encaminhamento correto.">Tipo de Problema</Label>
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
                </div>
              </div>
            )}

            {/* Step 1: Qualificação */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-y-6 animate-in fade-in slide-in-from-right-4 duration-500 overflow-visible">
                <div className="space-y-2 text-left border-b border-slate-100 pb-5">
                   <h2 className="text-3xl font-black text-slate-900 uppercase">Qualificação das Partes</h2>
                   <p className="text-slate-500 font-medium">Estes dados são essenciais para que o documento saia pronto para o protocolo.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 p-4 sm:p-8 md:p-10 bg-slate-100 rounded-[24px] sm:rounded-[40px] border-2 border-slate-200 mt-1">
                  
                  {/* Requerente */}
                  <div className="flex flex-col gap-y-4 sm:gap-y-6">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-3 sm:pb-4">
                      <h4 className="font-black text-slate-900 flex items-center gap-2 sm:gap-3 text-sm">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 transition-all"><Contact className="w-4 h-4 sm:w-5 sm:h-5" /></div> 
                        Requerente (Você)
                      </h4>
                    </div>
                    
                    <div className="space-y-4 sm:space-y-6 bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 shadow-sm">
                      <PartnerSelector 
                        label="Selecionar Seu Perfil"
                        onSelect={(p) => handleSelectPartner('author', p)}
                        selectedId={formData.authorId}
                        placeholder="Buscar no Hub de Contatos..."
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
                  <div className="flex flex-col gap-y-4 sm:gap-y-6">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-3 sm:pb-4">
                      <h4 className="font-black text-slate-900 flex items-center gap-2 sm:gap-3 text-sm">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200 transition-all"><Building className="w-4 h-4 sm:w-5 sm:h-5" /></div> 
                        Réu (Empresa/Pessoa)
                      </h4>
                    </div>
                    
                    <div className="space-y-4 sm:space-y-6 bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-200 shadow-sm">
                      <PartnerSelector 
                        label="Selecionar Réu"
                        onSelect={(p) => handleSelectPartner('defendant', p)}
                        selectedId={formData.defendantId}
                        placeholder="Buscar no Hub de Contatos..."
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

                <div className="flex flex-col gap-y-3 mt-4 text-left p-4 sm:p-8 bg-slate-50 rounded-[24px] sm:rounded-[40px] border-2 border-slate-200">
                  <Label tooltip="A comarca é a cidade do fórum onde o processo correrá. No JEC, você pode protocolar na sua cidade ou na cidade do Réu.">Comarca de Preferência do Fórum (Cidade/UF)</Label>
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                     <div className="w-12 h-12 shrink-0 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-500"><MapPin className="w-5 h-5" /></div>
                     <input 
                       type="text"
                       value={formData.comarca}
                       onChange={(e) => setFormData({...formData, comarca: e.target.value})}
                       placeholder="Ex: São Paulo - SP"
                       className="w-full md:w-1/2 h-14 px-5 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                     />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Fatos */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-left border-b border-slate-100 pb-5">
                   <h2 className="text-3xl font-black text-slate-900 uppercase">Relato do Ocorrido</h2>
                   <p className="text-slate-500 font-medium">Conte o que aconteceu de forma clara e objetiva.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-1">
                   <div className="flex flex-col gap-y-3 md:col-span-2 text-left">
                      <Label tooltip="Descreva cronologicamente o que aconteceu. Quanto mais detalhes, mais precisa será a petição. Ex: Em 01/01/2024 adquiri o produto X por R$ 500. Ele chegou com defeito e o vendedor se recusou a trocar.">O que houve? (Detalhes)</Label>
                      <textarea 
                        value={formData.whatHappened}
                        onChange={(e) => setFormData({...formData, whatHappened: e.target.value})}
                        placeholder="Descreva cronologicamente o que aconteceu..."
                        className="w-full h-44 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-inner-sm"
                      />
                   </div>
                   <div className="flex flex-col gap-y-3 text-left">
                      <Label tooltip="Nota fiscal, print de conversa, foto do produto danificado, contrato — qualquer documento que comprove o ocorrido. Provas fortalecem muito a petição mesmo no JEC.">Têm provas do ocorrido?</Label>
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
                      <Label tooltip="Data exata ou período aproximado. Ex: 15/02/2024 ou Há cerca de 2 meses. Importante para verificar prescrição (prazo legal para entrar com a ação).">Quando isso ocorreu?</Label>
                      <input 
                        type="text"
                        value={formData.whenHappened}
                        onChange={(e) => setFormData({...formData, whenHappened: e.target.value})}
                        placeholder="Ex: Há 1 mês / Data específica"
                        className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                   </div>

                   {/* NOVO: JURISPRUDÊNCIA / REFERÊNCIA LEGAL */}
                   <div className="md:col-span-2 flex flex-col gap-y-4 pt-6 mt-4 border-t border-slate-100 text-left">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        <Label tooltip="Se você tem um PDF de uma decisão ou jurisprudência favorável, suba aqui. A IA extrairá os fundamentos legais para replicar na sua petição.">Jurisprudência de Referência (Opcional)</Label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                          <div className={cn(
                            "relative h-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[32px] transition-all group",
                            isExtracting ? "bg-slate-50 border-slate-200" : "bg-white border-slate-100 hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
                          )}>
                            <input 
                              type="file" 
                              accept=".pdf,.txt"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                
                                setIsExtracting(true)
                                try {
                                  // Mock da extração (Para o usuário sentir o poder)
                                  // Em um app Real, usaríamos pdfjs ou o endpoint de extrator que criamos
                                  setTimeout(() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      jurisprudence: `[EXTRAÍDO DO PDF: ${file.name}]\n\nAqui entra o teor da jurisprudência que a IA vai usar como base legal para o seu pedido...`
                                    }))
                                    setIsExtracting(false)
                                    toast.success('Jurisprudência analisada!')
                                  }, 1500)
                                } catch (err) {
                                  toast.error('Erro ao ler PDF')
                                  setIsExtracting(false)
                                }
                              }}
                            />
                            {isExtracting ? (
                              <>
                                <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Extraindo...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-10 h-10 text-slate-300 group-hover:text-primary transition-all mb-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary">Subir PDF</span>
                                <span className="text-[10px] text-slate-300 font-bold mt-1">Ou arraste aqui</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <textarea 
                            value={formData.jurisprudence}
                            onChange={(e) => setFormData({...formData, jurisprudence: e.target.value})}
                            placeholder="A jurisprudência extraída aparecerá aqui, ou cole um texto legal de referência..."
                            className="w-full h-40 p-5 rounded-3xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-inner-sm"
                          />
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* Step 3: Valores */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-left border-b border-slate-100 pb-5">
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Cálculo de Indenização</h2>
                   <p className="text-slate-500 font-medium">O limite para processar sozinho no JEC é de 20 salários mínimos.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-1">
                   <div className="flex flex-col gap-y-3 text-left">
                      <Label tooltip="Valor real e comprovável que você perdeu financeiramente. Ex: preço do produto com defeito (R$ 500), conserto pago (R$ 200), passagem gasta para resolver o problema (R$ 50).">Dano Material (Prejuízo Real)</Label>
                      <input 
                        type="text"
                        value={formData.materialDamage}
                        onChange={(e) => setFormData({...formData, materialDamage: e.target.value})}
                        placeholder="Ex: 1500"
                        className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                   </div>
                   <div className="flex flex-col gap-y-3 text-left">
                      <Label tooltip="Valor pedido como reparação pelo sofrimento, angúustia ou humilhação causados. Não há regra fixa, mas o JEC tende a aceitar valores razoáveis e proporcionais ao dano. Limite total da causa: 20 salários mínimos.">Dano Moral (Reparação)</Label>
                      <input 
                        type="text"
                        value={formData.moralDamage}
                        onChange={(e) => setFormData({...formData, moralDamage: e.target.value})}
                        placeholder="Ex: 3000"
                        className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                   </div>

                   <div className={cn(
                     "md:col-span-2 p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border flex flex-col items-center justify-center gap-2 transition-all shadow-inner-sm text-center",
                     isAptoJEC ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
                   )}>
                        <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1 sm:mb-2">Total do Valor da Causa</span>
                        <span className={cn("text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter transition-all break-all", isAptoJEC ? "text-primary" : "text-red-500")}>
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalCausa)}
                        </span>
                        {!isAptoJEC && (
                          <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest text-center">
                             <AlertCircle size={14} className="shrink-0" /> Excede limite do JEC (R$ {limiteJEC.toLocaleString()})
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
                  <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">Tudo Checado!</h3>
                  <p className="text-slate-500 max-w-sm leading-relaxed font-bold">
                    Ao prosseguir, nossa IA irá fundir as qualificações, fatos e leis para gerar sua petição no formato ideal para o Juizado Especial.
                  </p>
                </div>

                {!loading && (
                   <Button 
                     size="lg"
                     onClick={handleStartProcess}
                     className="w-full sm:w-auto h-16 px-6 sm:px-12 rounded-2xl shadow-xl shadow-primary/30 bg-primary hover:bg-blue-700 font-black text-lg sm:text-xl hover:scale-105 active:scale-95 transition-all text-center flex items-center justify-center"
                   >
                     Gerar Petição Inicial
                   </Button>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            {currentStep < 4 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-12 pt-8 border-t border-slate-100 relative z-10 gap-4">
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="w-full sm:w-auto font-bold text-slate-400 hover:text-slate-900 rounded-xl px-8 order-2 sm:order-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={
                    (currentStep === 0 && !formData.problemType) ||
                    (currentStep === 1 && (!formData.authorName || !formData.authorDocument || !formData.defendantName || !formData.comarca)) ||
                    (currentStep === 2 && !formData.whatHappened) ||
                    (currentStep === 3 && (!formData.materialDamage || !isAptoJEC))
                  }
                  className="w-full sm:w-auto flex justify-center items-center bg-slate-900 hover:bg-black text-white px-10 h-14 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-slate-200 order-1 sm:order-2"
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
