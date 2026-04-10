"use client"

import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Scale,
  Zap,
  Sparkles,
  Building2,
  UserCircle2,
  FileSearch,
  User,
  Building,
  Calculator,
  TrendingUp,
  MapPin,
  Loader2,
  FileText
} from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { cn } from '@/utils/cn'
import { FormInput } from '@/components/shared/FormInput'
import { FormTextArea } from '@/components/shared/FormTextArea'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { StepBadge } from '@/components/shared/StepBadge'
import { PartnerSelector } from '@/components/shared/PartnerSelector'
import { Label } from '@/components/shared/Label'
import { toast } from 'sonner'
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation'
import { useQueryClient } from '@tanstack/react-query'

const COMPLEXITY_LEVELS = [
  { id: 'básico', title: 'Básico', desc: 'Estrutura enxuta para acordos diretos e de baixo risco.', icon: Zap },
  { id: 'intermediário', title: 'Intermediário', desc: 'Cláusulas de proteção balanceadas — indicado para a maioria dos contratos.', icon: Scale },
  { id: 'avançado', title: 'Avançado', desc: 'Máxima proteção contratual. Ideal para alto valor ou risco elevado.', icon: ShieldCheck }
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
  const [protectedSide, setProtectedSide] = useState<'A' | 'B'>('A')

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
  const queryClient = useQueryClient()
  const queryKey = ['juridico-documents']

  const generateMutation = useOptimisticMutation({
    actionName: 'createJuridicoDocument',
    queryKey,
    operation: 'create',
    getEntityId: () => 'new',
    mutationFn: async (variables: any) => {
      const res = await fetch('/api/juridico/gerar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(variables)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao processar a geração do contrato')
      }

      return await res.json()
    },
    updater: (old: any, variables) => old,
    onSuccess: (data) => {
      window.location.href = `/juridico/${data.documentId}`
    }
  })

  const handleGenerate = async () => {
    const payload = {
      tipoContrato,
      nivel,
      perfilPartes,
      objetivo,
      foro,
      partyA,
      partyB,
      protectedSide,
      parametros,
      // Metadata para reconciliação determinística
      metadata: {
        title: tipoContrato,
        // client_temp_id injetado pelo hook
      }
    }

    generateMutation.mutate(payload)
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
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Minerva — Redação Jurídica</h1>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
              Descreva o contexto. A Minerva redige o documento com base na legislação vigente e nas cláusulas de proteção adequadas ao seu caso.
            </p>
          </div>

          <Card padding="none" className="w-full min-w-0 min-h-[400px] p-4 sm:p-5 md:p-12 border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-visible">

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
                    <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">Informe o tipo, o objetivo e o foro. Esses dados determinam a estrutura legal do documento.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormInput
                    label="Tipo de Documento"
                    required
                    value={tipoContrato}
                    onChange={(e) => setTipoContrato(e.target.value)}
                    placeholder="Ex: Prestação de Serviços, Acordo de Sócios, NDA"
                    tooltip="Qual a natureza jurídica deste documento? Ex: Prestação de Serviços, NDA, Acordo de Sócios, Contrato de Locação. Isso define a estrutura das cláusulas geradas."
                  />
                  <FormInput
                    label="Perfil das Partes"
                    required
                    value={perfilPartes}
                    onChange={(e) => setPerfilPartes(e.target.value)}
                    placeholder="Ex: Empresa de Software (B2B) vs Cliente Corporativo"
                    tooltip="Identifique quem são os contratantes: Pessoa Física ou Jurídica, e a natureza da relação. Ex: Agência de marketing (PJ) prestando serviços para cliente corporativo (PJ)."
                  />
                </div>

                {/* Objetivo Principal e Foro */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2">
                    <FormTextArea
                      label="Objetivo do Documento"
                      required
                      value={objetivo}
                      onChange={(e) => setObjetivo(e.target.value)}
                      placeholder="Ex: Regular a prestação de serviços continuados sob o framework ágil no valor mensal de R$ 10.000,00."
                      tooltip="O que este documento deve assegurar? Inclua valores, prazos e obrigações principais. Ex: Formalizar prestação de serviços mensais de R$ 10.000,00 pelo prazo de 12 meses, com cláusula de renovação automática."
                    />
                  </div>
                  <FormTextArea
                    label="Foro / Comarca"
                    required
                    value={foro}
                    onChange={(e) => setForo(e.target.value)}
                    placeholder="Ex: Comarca de São Paulo/SP"
                    tooltip="Cidade e estado onde eventuais litígios serão julgados. Normalmente a sede de uma das partes. Ex: Comarca de São Paulo/SP. Este dado é obrigatório no contrato."
                  />
                </div>

                {/* Nível de Complexidade */}
                <div className="flex flex-col gap-y-5 pt-4">
                  <Label tooltip="Básico = simples e ágil, ideal para acordos rápidos. Intermediário = cláusulas de proteção balanceadas. Avançado = máxima proteção, ideal para contratos de alto valor ou risco elevado.">Nível de Blindagem e Complexidade</Label>
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

                <div className="flex justify-end border-t border-slate-100">
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
                    <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">Vincule os dados das partes. Eles serão inseridos automaticamente nas cláusulas de identificação.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-12 p-3 sm:p-4 md:p-10 bg-slate-100 rounded-[20px] sm:rounded-[24px] md:rounded-[40px] border-2 border-slate-200">

                  {/* Parte A */}
                  <div className="flex flex-col gap-y-6">
                    <div className="flex flex-col gap-y-4 border-b border-slate-300 pb-4">
                      <button
                        onClick={() => setProtectedSide('A')}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all w-fit",
                          protectedSide === 'A'
                            ? "bg-primary/10 border-primary text-primary shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-50 hover:opacity-100"
                        )}
                      >
                        <ShieldCheck size={14} className={cn(protectedSide === 'A' && "fill-primary text-white")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{protectedSide === 'A' ? "Protegido" : "Proteger"}</span>
                      </button>

                      <h4 className="font-black text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 transition-all"><UserCircle2 size={24} /></div>
                        Polo Ativo (A)
                      </h4>
                    </div>

                    <div className={cn(
                      "space-y-4 md:space-y-6 bg-white p-4 md:p-6 rounded-[20px] md:rounded-[32px] border transition-all",
                      protectedSide === 'A' ? "border-primary shadow-lg shadow-primary/5 ring-2 ring-primary/5" : "border-slate-200 shadow-sm"
                    )}>
                      <FormInput
                        label="Papel na Relação"
                        value={partyA.role}
                        onChange={(e) => setPartyA({ ...partyA, role: e.target.value })}
                        placeholder="Ex: Contratante, Licenciante..."
                      />

                      <PartnerSelector
                        label="Selecionar Contato Registrado"
                        onSelect={(p) => handleSelectPartner('A', p)}
                        selectedId={partyA.id}
                        placeholder="Buscar no Hub de Contatos..."
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
                    <div className="flex flex-col gap-y-4 border-b border-slate-300 pb-4">
                      <button
                        onClick={() => setProtectedSide('B')}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all w-fit",
                          protectedSide === 'B'
                            ? "bg-primary/10 border-primary text-primary shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-50 hover:opacity-100"
                        )}
                      >
                        <ShieldCheck size={14} className={cn(protectedSide === 'B' && "fill-primary text-white")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{protectedSide === 'B' ? "Protegido" : "Proteger"}</span>
                      </button>

                      <h4 className="font-black text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200 transition-all"><Building2 size={24} /></div>
                        Polo Passivo (B)
                      </h4>
                    </div>

                    <div className={cn(
                      "space-y-4 md:space-y-6 bg-white p-4 md:p-6 rounded-[20px] md:rounded-[32px] border transition-all",
                      protectedSide === 'B' ? "border-primary shadow-lg shadow-primary/5 ring-2 ring-primary/5" : "border-slate-200 shadow-sm"
                    )}>
                      <FormInput
                        label="Papel na Relação"
                        value={partyB.role}
                        onChange={(e) => setPartyB({ ...partyB, role: e.target.value })}
                        placeholder="Ex: Contratada, Licenciada..."
                      />

                      <PartnerSelector
                        label="Selecionar Contato Registrado"
                        onSelect={(p) => handleSelectPartner('B', p)}
                        selectedId={partyB.id}
                        placeholder="Buscar no Hub de Contatos..."
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

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100">
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
            {step === 3 && (
              <div className="flex flex-col gap-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                {!generateMutation.isPending ? (
                  <>
                    <div className="mb-2 border-b border-slate-100 pb-6 flex flex-col gap-y-4">
                      <div className="md:hidden">
                        <StepBadge current={step} total={3} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                          3. Parâmetros <span className="text-primary">Adicionais</span>
                        </h3>
                        <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">Adicione cláusulas específicas: multas, prazos de carência, regras de sigilo ou qualquer disposição obrigatória.</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-y-4">
                      <p className="text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
                        Informe disposições que não podem faltar no documento. A Minerva validará os termos e os incorporará com precisão jurídica — você pode usar linguagem coloquial.
                      </p>
                      <FormTextArea
                        label="Parâmetros Específicos"
                        value={parametros}
                        onChange={(e) => setParametros(e.target.value)}
                        placeholder="Ex: Multa de 20% sobre o valor total em caso de rescisão antecipada. Equipamentos fornecidos devem ser devolvidos em até 5 dias úteis."
                        className="min-h-[220px] mt-2"
                        tooltip="Disposições e cláusulas obrigatórias para este caso específico."
                      />
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 uppercase tracking-widest text-[11px] font-black">
                      <Button variant="ghost" onClick={() => setStep(2)} className="w-full md:w-auto font-bold text-slate-400 hover:text-slate-900 h-14 px-6 order-2 md:order-1">
                        <ArrowRight className="mr-2 w-5 h-5 rotate-180" /> Parte Anterior
                      </Button>
                      <Button
                        size="lg"
                        disabled={generateMutation.isPending}
                        onClick={handleGenerate}
                        className="w-full md:w-auto bg-primary hover:bg-blue-700 font-black px-8 min-h-[56px] h-auto py-3 rounded-xl text-white shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-sm sm:text-base group overflow-hidden relative order-1 md:order-2 flex items-center justify-center text-center"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                        <Sparkles className="mr-3 w-5 h-5 group-hover:animate-pulse text-blue-200 shrink-0" />
                        <span>Gerar Documento <br className="sm:hidden" /> Blindado</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  /* PROCESSAMENTO UI - Novo */
                  <div className="flex flex-col items-start text-left py-6 gap-y-10 min-h-[400px]">
                    <div className="flex flex-col md:flex-row items-start gap-6 border-b border-slate-100 pb-10 w-full animate-in zoom-in-95 duration-500">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-[22px] md:rounded-[28px] border-4 border-primary/5 flex items-center justify-center bg-primary text-white shadow-xl shadow-primary/20 shrink-0">
                        <Zap size={32} className="animate-pulse" />
                      </div>
                      <div className="space-y-2 mt-2 min-w-0">
                        <h3 className="text-xl sm:text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight break-words">Minerva Está Redigindo</h3>
                        <p className="text-slate-500 max-w-xl leading-relaxed font-bold">
                          Analisando o contexto e aplicando cláusulas de proteção de nível <span className="text-primary uppercase">{nivel}</span>. Cada detalhe está sendo revisado.
                        </p>
                      </div>
                    </div>

                    {/* Resumo da Blindagem */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                      <div className="p-6 bg-slate-200 border border-slate-100 rounded-[32px] space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                          <Scale className="w-4 h-4" /> Natureza Contratual
                        </div>
                        <div className="flex flex-col gap-y-1 px-1">
                          <span className="text-lg font-black text-slate-900">{tipoContrato}</span>
                          <span className="text-[11px] text-slate-400 font-bold">{objetivo.substring(0, 100)}...</span>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-200 border border-slate-100 rounded-[32px] space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                          <ShieldCheck className="w-4 h-4" /> Partes Envolvidas
                        </div>
                        <div className="space-y-3 px-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-xs font-bold text-slate-700 truncate">{partyA.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                            <span className="text-xs font-bold text-slate-700 truncate">{partyB.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full p-6 sm:p-8 bg-primary/5 rounded-[24px] sm:rounded-[32px] border border-primary/20 flex flex-col items-center justify-center gap-y-4">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <div className="text-center">
                        <p className="text-primary font-black uppercase tracking-widest text-[11px]">Redigindo o Documento...</p>
                        <p className="text-primary/60 font-bold text-[10px] mt-1 italic">A análise pode levar até 30 segundos. Não feche esta janela.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </Card>
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
