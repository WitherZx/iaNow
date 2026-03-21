"use client"

import { useState } from 'react'
import { ArrowRight, CheckCircle2, ShieldCheck, Scale, Zap, Sparkles, Building2, UserCircle2 } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { cn } from '@/utils/cn'
import { Label } from '@/components/shared/Label'
import { StepBadge } from '@/components/shared/StepBadge'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { PartnerSelector } from '@/components/shared/PartnerSelector'

const COMPLEXITY_LEVELS = [
  { id: 'básico', title: 'Básico', desc: 'Direto e simplificado, focado no essencial ágil.', icon: Zap },
  { id: 'intermediário', title: 'Intermediário', desc: 'Foco no equilíbrio entre clareza e proteção ativa.', icon: Scale },
  { id: 'avançado', title: 'Avançado', desc: 'Robustez total, com 100% de cláusulas protecionistas.', icon: ShieldCheck }
]

export default function NewDocumentPage() {
  const [step, setStep] = useState(1)

  // 1. Contexto Geral (Base do Novo Prompt)
  const [tipoContrato, setTipoContrato] = useState('')
  const [nivel, setNivel] = useState('intermediário')
  const [perfilPartes, setPerfilPartes] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [foro, setForo] = useState('')

  // 2. Dados das Partes
  const [partyA, setPartyA] = useState({ id: '', name: '', document: '', address: '', role: 'Contratante/Sócio 1', type: 'pj' })
  const [partyB, setPartyB] = useState({ id: '', name: '', document: '', address: '', role: 'Contratada/Sócio 2', type: 'pj' })

  const handleSelectPartner = (side: 'A' | 'B', partner: any) => {
    const data = {
      id: partner.id,
      name: partner.name,
      document: partner.document,
      address: partner.address,
      type: partner.type,
      role: side === 'A' ? partyA.role : partyB.role
    }
    if (side === 'A') setPartyA(data)
    else setPartyB(data)
  }

  // 3. Parâmetros (Contexto Adicional)
  const [parametros, setParametros] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGenerate = async () => {
    setIsSubmitting(true)
    
    try {
      const res = await fetch('/api/juridico/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoContrato,
          nivel,
          perfilPartes,
          objetivo,
          foro,
          partyA,
          partyB,
          parametros
        })
      })

      if (!res.ok) throw new Error('Falha ao gerar o contrato')

      const data = await res.json()
      window.location.href = `/juridico/${data.documentId}`
    } catch (e) {
      console.error(e)
      setIsSubmitting(false)
    }
  }

  // Verificação de campos para habilitar os botões "Avançar"
  const isStep1Valid = tipoContrato.trim().length > 2 && objetivo.trim().length > 5 && perfilPartes.trim().length > 2 && foro.trim().length > 2

  return (
    <DashboardLayout>
      <PageContainer centered>
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-y-12 pb-20 pt-8">
          
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4">
            <div className="mx-auto w-20 h-20 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center text-primary mb-4 shadow-sm shadow-primary/20">
              <ShieldCheck size={36} strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Motor Jurídico</h1>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
              Defina os parâmetros, nós aplicamos a jurisprudência. Estruturando o seu documento validado e seguro.
            </p>
          </div>

          <Card className="min-h-[400px] p-5 md:p-12 border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-visible">
            
            {/* STEP PROGRESS INSTRUCTION */}
            <div className="hidden md:block absolute top-0 right-0 p-8">
               <StepBadge current={step} total={3} />
            </div>

            {/* STEP 1: CONTEXTO GERAL */}
            {step === 1 && (
              <div className="flex flex-col gap-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="mb-2 border-b border-slate-100 pb-6 flex flex-col gap-y-4">
                  <div className="md:hidden">
                    <StepBadge current={step} total={3} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                      1. Contexto do <span className="text-primary">Contrato</span>
                    </h3>
                    <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">Defina os parâmetros centrais e o escopo fundamental da negociação.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Tipo de Contrato */}
                  <div className="flex flex-col gap-y-3">
                    <Label required>Tipo de Documento</Label>
                    <input 
                      type="text" value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)}
                      placeholder="Ex: Prestação de Serviços, Acordo de Sócios, NDA"
                      className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                    />
                  </div>
                  
                  {/* Perfil das Partes */}
                  <div className="flex flex-col gap-y-3">
                    <Label required>Perfil das Partes</Label>
                    <input 
                      type="text" value={perfilPartes} onChange={(e) => setPerfilPartes(e.target.value)}
                      placeholder="Ex: Empresa de Software (B2B) vs Cliente Corporativo"
                      className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Objetivo Principal e Foro */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex flex-col gap-y-3 md:col-span-2">
                    <Label required>Objetivo Financeiro / Legal do Documento</Label>
                    <textarea 
                      value={objetivo} onChange={(e) => setObjetivo(e.target.value)}
                      placeholder="Ex: Regular a prestação de serviços continuados sob o framework ágil no valor mensal de R$ 10.000,00."
                      className="w-full h-24 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-y-3">
                    <Label required>Foro / Comarca</Label>
                    <textarea 
                      value={foro} onChange={(e) => setForo(e.target.value)}
                      placeholder="Ex: Comarca de São Paulo/SP"
                      className="w-full h-24 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none text-sm"
                    />
                  </div>
                </div>
                
                {/* Nível de Complexidade */}
                <div className="flex flex-col gap-y-5 pt-4">
                  <Label>Nível de Blindagem e Complexidade</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {COMPLEXITY_LEVELS.map(lvl => {
                      const isActive = nivel === lvl.id
                      return (
                        <button
                          key={lvl.id}
                          onClick={() => setNivel(lvl.id)}
                          className={cn(
                            "relative flex flex-col items-start gap-y-3 p-6 rounded-2xl border-2 transition-all duration-300 group text-left",
                            isActive 
                              ? "bg-primary/5 border-primary shadow-sm ring-2 ring-primary/10 scale-[1.02]" 
                              : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          {isActive && <div className="absolute top-4 right-4 text-primary animate-in zoom-in"><CheckCircle2 size={18} /></div>}
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300", isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                            <lvl.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                          </div>
                          <div>
                            <h4 className={cn("font-black text-sm transition-colors", isActive ? "text-primary" : "text-slate-800")}>{lvl.title}</h4>
                            <p className="text-[11px] font-semibold text-slate-400 mt-1 leading-relaxed">{lvl.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-end mt-4 pt-10 border-t border-slate-100">
                  <Button 
                    size="lg" disabled={!isStep1Valid} onClick={() => setStep(2)}
                    className="w-full md:w-auto bg-primary hover:bg-blue-700 font-black px-12 h-14 rounded-xl text-white shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-base"
                  >
                    Próxima Etapa <ArrowRight className="ml-3 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: DADOS DAS PARTES */}
            {step === 2 && (
              <div className="flex flex-col gap-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="mb-2 border-b border-slate-100 pb-6 flex flex-col gap-y-4">
                  <div className="md:hidden">
                    <StepBadge current={step} total={3} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                      2. <span className="text-primary">Qualificação</span> das Partes
                    </h3>
                    <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">Identifique quem compõe o polo ativo e passivo deste documento.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 p-4 md:p-10 bg-slate-100 rounded-[24px] md:rounded-[40px] border-2 border-slate-200">
                  
                  {/* Parte A */}
                  <div className="flex flex-col gap-y-6">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-4">
                      <h4 className="font-black text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 transition-all"><UserCircle2 size={24} /></div> 
                        Polo Ativo (A)
                      </h4>
                    </div>
                    
                    <div className="space-y-4 md:space-y-6 bg-white p-4 md:p-6 rounded-[20px] md:rounded-[32px] border border-slate-200 shadow-sm">
                      <div className="space-y-2.5">
                        <Label>Papel na Relação</Label>
                        <input 
                          type="text" 
                          value={partyA.role} 
                          onChange={(e) => setPartyA({...partyA, role: e.target.value})} 
                          placeholder="Ex: Contratante, Licenciante..." 
                          className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 font-bold focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm outline-none" 
                        />
                      </div>

                      <PartnerSelector 
                        label="Selecionar Parceiro Registrado"
                        onSelect={(p) => handleSelectPartner('A', p)}
                        selectedId={partyA.id}
                        placeholder="Buscar no Partner Hub..."
                      />

                      {partyA.id && (
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Qualificação Vinculada</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                             {partyA.name} • {partyA.document} • {partyA.address.substring(0, 40)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parte B */}
                  <div className="flex flex-col gap-y-6">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-4">
                      <h4 className="font-black text-slate-900 flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200 transition-all"><Building2 size={24} /></div> 
                         Polo Passivo (B)
                      </h4>
                    </div>

                    <div className="space-y-4 md:space-y-6 bg-white p-4 md:p-6 rounded-[20px] md:rounded-[32px] border border-slate-200 shadow-sm">
                      <div className="space-y-2.5">
                        <Label>Papel na Relação</Label>
                        <input 
                          type="text" 
                          value={partyB.role} 
                          onChange={(e) => setPartyB({...partyB, role: e.target.value})} 
                          placeholder="Ex: Contratada, Licenciada..." 
                          className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 font-bold focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm outline-none" 
                        />
                      </div>

                      <PartnerSelector 
                        label="Selecionar Parceiro Registrado"
                        onSelect={(p) => handleSelectPartner('B', p)}
                        selectedId={partyB.id}
                        placeholder="Buscar no Partner Hub..."
                      />

                      {partyB.id && (
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Qualificação Vinculada</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                             {partyB.name} • {partyB.document} • {partyB.address.substring(0, 40)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4 pt-10 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setStep(1)} className="w-full md:w-auto font-bold text-slate-400 hover:text-slate-900 h-14 px-6 order-2 md:order-1">
                    <ArrowRight className="mr-2 w-5 h-5 rotate-180" /> Voltar
                  </Button>
                  <Button 
                    size="lg" onClick={() => setStep(3)} disabled={!partyA.name.trim() || !partyB.name.trim()}
                    className="w-full md:w-auto bg-primary hover:bg-blue-700 font-black px-12 h-14 rounded-xl text-white shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-base group order-1 md:order-2"
                  >
                    Cláusulas Específicas <ArrowRight className="ml-3 w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: PARÂMETROS ADICIONAIS E GERAÇÃO */}
            {step === 3 && !isSubmitting && (
              <div className="flex flex-col gap-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="mb-2 border-b border-slate-100 pb-6 flex flex-col gap-y-4">
                  <div className="md:hidden">
                    <StepBadge current={step} total={3} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                      3. Parâmetros <span className="text-primary">Adicionais</span>
                    </h3>
                    <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">Insira cláusulas específicas de proteção, multas ou exceções particulares.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-y-4">
                  <p className="text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
                    Aqui você pode injetar regras customizadas que a Inteligência Sistêmica obrigatoriamente acatará. Ex: Multas rescisórias, prazos de vesting, métodos de compliance, regras de devolução de equipamento, etc.
                  </p>
                  <textarea 
                    value={parametros} onChange={(e) => setParametros(e.target.value)}
                    placeholder="Disposições que não podem faltar... (Você pode usar linguagem coloquial, nós validaremos os termos juridicamente)."
                    className="w-full min-h-[220px] p-6 rounded-3xl bg-slate-50 border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all resize-none text-base leading-relaxed mt-2"
                  />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-6 pt-10 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setStep(2)} className="w-full md:w-auto font-bold text-slate-400 hover:text-slate-900 h-14 px-6 order-2 md:order-1">
                    <ArrowRight className="mr-2 w-5 h-5 rotate-180" /> Partes
                  </Button>
                  <Button 
                    size="lg" 
                    disabled={isSubmitting} 
                    onClick={handleGenerate}
                    className="w-full md:w-auto bg-primary hover:bg-blue-700 font-black px-12 h-14 rounded-xl text-white shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-base group overflow-hidden relative order-1 md:order-2"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                    <Sparkles className="mr-3 w-5 h-5 group-hover:animate-pulse text-blue-200" />
                    Gerar Blindagem Jurídica
                  </Button>
                </div>
              </div>
            )}
            
          </Card>
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
