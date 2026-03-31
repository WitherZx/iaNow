'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trash2,
  Printer,
  Copy,
  Sparkles,
  Scale,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Gavel,
  RefreshCcw,
  Send,
  Pencil,
  Save,
  X,
  ExternalLink,
  Upload,
  FileText,
  CheckSquare,
  MapPin,
  List,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { cn } from '@/utils/cn'
import { Paywall } from '@/components/shared/Paywall'

import { DocumentActionBar } from '@/components/shared/DocumentActionBar'
import { DocumentHero } from '@/components/shared/DocumentHero'
import { DocumentAuditLayout } from '@/components/shared/DocumentAuditLayout'
import { SidebarActionItem } from '@/components/shared/SidebarActionItem'
import { TechnicalReportCard } from '@/components/shared/TechnicalReportCard'
import { SidebarRefineSection } from '@/components/shared/SidebarRefineSection'
import { ProcessTrackingSection } from '@/components/shared/ProcessTrackingSection'
import { ProcessAnalysisSection } from '@/components/shared/ProcessAnalysisSection'
import { legalApi } from '@/lib/services/legal-api'

export default function DemandDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient() as any

  const [loading, setLoading] = useState(true)
  const [demand, setDemand] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [refining, setRefining] = useState(false)
  const [refinePrompt, setRefinePrompt] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [activeToken, setActiveToken] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)

  // Novas funcionalidades de Processo
  const [activeTab, setActiveTab] = useState<'minuta' | 'acompanhamento' | 'analise'>('minuta')
  const [processStatus, setProcessStatus] = useState<any>(null)
  const [processAnalysis, setProcessAnalysis] = useState<any>(null)
  const [isTrackingLoading, setIsTrackingLoading] = useState(false)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)

  const scrollToToken = (token: string) => {
    setActiveToken(token)
    // Pequeno delay para garantir que o elemento existe se o Markdown renderizar algo novo
    setTimeout(() => {
      const id = `token-${token.replace(/[\[\]]/g, '')}`
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Adiciona uma classe temporária de destaque pulsante
        el.classList.add('animate-pulse', 'ring-4', 'ring-primary/40', 'bg-primary/20')
        setTimeout(() => {
          el.classList.remove('animate-pulse', 'ring-4', 'ring-primary/40', 'bg-primary/20')
          setActiveToken(null)
        }, 3000)
      } else {
        setActiveToken(null)
      }
    }, 100)
  }

  const renderTextWithHighlights = (text: string) => {
    if (!text) return null
    const parts = text.split(/(\[.*?\])/g)
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const tokenCleanup = part.replace(/[\[\]]/g, '')
        const isActive = activeToken === part
        return (
          <span 
            key={i} 
            id={`token-${tokenCleanup}`}
            className={cn(
              "transition-all duration-500 rounded px-1.5 py-0.5 font-bold cursor-help border",
              isActive 
                ? "bg-primary text-white border-primary shadow-lg scale-110 z-10" 
                : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
            )}
            title={`Variável: ${tokenCleanup}`}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  useEffect(() => {
    async function loadDemand() {
      if (!id) return
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('justice_demands')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setDemand(data)
        setEditContent(data.metadata?.petition_content || '')
      } catch (err) {
        toast.error('Ocorreu um erro ao carregar a demanda.')
      } finally {
        setLoading(false)
      }
    }

    loadDemand()

    // Check auth for paywall
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setShowPaywall(true)
      }
    }
    checkAuth()
  }, [id, supabase])

  const handleSave = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('justice_demands')
        .update({
          metadata: {
            ...demand.metadata,
            petition_content: editContent
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      setDemand({ ...demand, metadata: { ...demand.metadata, petition_content: editContent } })
      setIsEditing(false)
      toast.success('Alterações salvas.')
    } catch (err) {
      toast.error('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Deseja realmente excluir esta demanda?')) return
    try {
      const { error: upError } = await supabase
        .from('justice_demands')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id as string)

      if (upError) {
        const { error: delError } = await supabase
          .from('justice_demands')
          .delete()
          .eq('id', id as string)
        if (delError) throw delError
      }

      toast.success('Demanda removida com sucesso.')
      router.push('/justica')
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || 'Sem permissão'))
    }
  }

  const handleRefine = async (customPrompt?: string) => {
    const promptToSend = customPrompt || refinePrompt
    if (!promptToSend.trim() || refining) return
    setRefining(true)
    const toastId = toast.loading('IA redigindo ajustes...')
    try {
      const response = await fetch('/api/justica/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          demandId: id, 
          diagnosticData: { 
            ...demand.metadata, 
            refinePrompt: promptToSend, 
            isRefining: true 
          } 
        })
      })
      if (!response.ok) throw new Error('Erro ao refinar')
      toast.success('Petição ajustada!', { id: toastId })
      
      // Update local state instead of reload if possible, but the API returns success:true only.
      // To be safe and consistent with the existing codebase:
      window.location.reload()
    } catch (err) {
      toast.error('Erro ao ajustar.', { id: toastId })
    } finally {
      setRefining(false)
    }
  }

  const fetchProcessStatus = async () => {
    if (!demand?.metadata?.process_number) {
      toast.error('Número do processo não informado.')
      return
    }
    setIsTrackingLoading(true)
    try {
      const status = await legalApi.getProcessInfo(demand.metadata.process_number)
      setProcessStatus(status)
      toast.success('Status do processo atualizado.')
    } catch (err) {
      toast.error('Erro ao consultar processo.')
    } finally {
      setIsTrackingLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!processStatus) {
      toast.error('Consulte o status do processo antes de analisar.')
      return
    }
    setIsAnalysisLoading(true)
    try {
      const response = await fetch('/api/justica/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processData: processStatus })
      })
      if (!response.ok) throw new Error('Erro na análise')
      const analysis = await response.json()
      setProcessAnalysis(analysis)
      setActiveTab('analise')
      toast.success('Análise da Minerva concluída!')
    } catch (err) {
      toast.error('Erro ao gerar análise.')
    } finally {
      setIsAnalysisLoading(false)
    }
  }

  if (loading) return <DashboardLayout><div className="flex h-full w-full items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div></DashboardLayout>
  if (!demand) return <DashboardLayout><PageContainer>Não encontrado.</PageContainer></DashboardLayout>

  const auditoria = demand.metadata?.auditoria || {}
  const ondeProtocolar = auditoria.onde_protocolar || {}
  const checklist = auditoria.documentos_necessarios || []
  const instrucoes = auditoria.instrucoes_protocolo || []

  return (
    <DocumentAuditLayout
      backLink="/justica"
      actions={
        <DocumentActionBar
          isEditing={isEditing}
          onEdit={() => setIsEditing(true)}
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
          isSaving={saving}
          onPrint={() => window.print()}
          onDelete={handleDelete}
        />
      }
      hero={
        <DocumentHero
          category={demand.status === 'ready' ? 'Kit Pronto para Protocolo' : 'Protocolado'}
          date={new Date(demand.created_at).toLocaleDateString('pt-BR')}
          title={demand.tipo_acao}
          description={demand.metadata?.description || 'Petição de Jus Postulandi gerada com inteligência artificial para o juizado especial cível.'}
        />
      }
      sidebar={
        <>
          {/* 1. NÚMERO DO PROCESSO (ACOMPANHAMENTO) */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <Gavel size={14} className="text-primary" /> Número do Processo
              </div>
              <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm space-y-4">
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="0000000-00.0000.0.00.0000"
                    value={demand.metadata?.process_number || ''}
                    onChange={async (e) => {
                       const val = e.target.value
                       setDemand({ ...demand, metadata: { ...demand.metadata, process_number: val } })
                       // Auto-save process number
                       await supabase.from('justice_demands').update({
                         metadata: { ...demand.metadata, process_number: val }
                       }).eq('id', id)
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-[13px] font-black focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-slate-700 placeholder:text-slate-300 tracking-wider"
                  />
                  <p className="text-[9px] text-slate-400 font-bold px-1">Necessário para acompanhamento e análise em tempo real.</p>
                </div>
                {demand.metadata?.process_number && (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => {
                      fetchProcessStatus()
                      setActiveTab('acompanhamento')
                    }}
                    isLoading={isTrackingLoading}
                    className="w-full rounded-xl"
                  >
                    Consultar Status
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 2. PREENCHER VARIÁVEIS - Padrão iaNow */}
          {!isEditing && activeTab === 'minuta' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <Pencil className="w-3.5 h-3.5" /> Preencher Variáveis
              </div>
              
              <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm space-y-4">
                {(() => {
                  const content = demand.metadata?.petition_content || ''
                  const tokens = Array.from(new Set(content.match(/\[(.*?)\]/g) || [])) as string[]
                  
                  if (tokens.length === 0) {
                    return <p className="text-[10px] text-slate-400 text-center py-2 font-bold uppercase tracking-wider">Nenhum campo variável detectado</p>
                  }
                  
                  return (
                    <>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {tokens.map((token: string) => {
                          const rawLabel = token.slice(1, -1)
                          const labelMap: Record<string, string> = {
                            'DATA': 'Data da ocorrência',
                            'LOCAL': 'Cidade/UF',
                            'VALOR': 'Valor da causa',
                            'NOME_AUTOR': 'Nome do Autor',
                            'NOME_REU': 'Nome do Réu',
                            'CPF_AUTOR': 'CPF do Autor',
                            'CPF_REU': 'CPF do Réu',
                            'ENDERECO_AUTOR': 'Endereço do Autor',
                            'ENDERECO_REU': 'Endereço do Réu'
                          }
                          const label = labelMap[rawLabel.toUpperCase()] || rawLabel

                          return (
                            <div key={token} className="space-y-1.5 group/var">
                              <button 
                                onClick={() => scrollToToken(token)}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 ml-1 hover:text-primary transition-colors text-left"
                              >
                                {label}
                                <ExternalLink size={10} className="opacity-0 group-hover/var:opacity-100 transition-opacity" />
                              </button>
                              <input
                                type="text"
                                placeholder="..."
                                value={fieldValues[token] || ''}
                                onChange={(e) => setFieldValues(prev => ({ ...prev, [token]: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-10 text-[12px] font-medium focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-slate-700 placeholder:text-slate-300"
                              />
                            </div>
                          )
                        })}
                      </div>
                      <Button
                        onClick={async () => {
                          const filledData = Object.entries(fieldValues)
                            .filter(([_, v]) => v.trim())
                            .map(([k, v]) => `${k}: ${v}`)
                            .join('\n')
                          
                          if (!filledData) return

                          const aiPrompt = `Por favor, preencha as variáveis abaixo na petição de forma contextualizada. Integre as informações no texto removendo os colchetes e garantindo a coesão jurídica:\n\n${filledData}`
                          
                          await handleRefine(aiPrompt)
                          setFieldValues({})
                        }}
                        disabled={Object.values(fieldValues).filter(v => v.trim()).length === 0 || refining || saving}
                        className="w-full rounded-xl bg-slate-900 text-white font-black text-[11px] h-11 hover:bg-black transition-all shadow-lg shadow-slate-200"
                      >
                        {refining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar Alterações'}
                      </Button>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* 2. AJUSTES COM IA */}
          {!isEditing && (
             <SidebarRefineSection
                value={refinePrompt}
                onChange={setRefinePrompt}
                onSubmit={() => handleRefine()}
                isLoading={refining}
             />
          )}

          {/* 3. PROVAS ANEXADAS */}
          {demand.metadata?.evidenceFiles?.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <Upload className="w-3.5 h-3.5" /> Provas Anexadas
              </div>
              <div className="space-y-2">
                {demand.metadata.evidenceFiles.map((file: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:border-primary/20 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      {file.type?.includes('image') ? <Upload size={14} /> : <FileText size={14} />}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[11px] font-black text-slate-700 truncate">{file.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{(file.size / 1024).toFixed(0)} KB • Armazenado</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. GUIA DE PROTOCOLO */}
          <Card className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-100/50 bg-white overflow-hidden border">
            <div className="p-6 bg-primary/5 border-b border-primary/10">
              <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-primary">
                <Gavel size={16} className="text-primary fill-primary/20" /> Guia de Protocolo
              </h4>
            </div>
            <div className="p-6 flex flex-col gap-6">
              <div className="space-y-3">
                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <MapPin size={12} /> Onde Protocolar?
                </h5>
                <div className="p-4 bg-slate-200 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-sm font-black text-slate-900">{ondeProtocolar.orgao || 'Juizado Especial Cível'}</p>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{ondeProtocolar.instrucao || 'Procure o setor de atermação presencialmente.'}</p>
                  {ondeProtocolar.portal && (
                    <a href={ondeProtocolar.portal} target="_blank" className="inline-flex items-center gap-1.5 text-xs text-primary font-black mt-2 hover:underline">
                      Ir para o Portal Eletrônico <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {checklist.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <CheckSquare size={12} /> Checklist de Documentos
                  </h5>
                  <div className="space-y-2">
                    {checklist.map((item: string, i: number) => (
                      <div key={i} className="flex gap-2 p-2 px-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                        <span className="text-[11px] font-bold text-slate-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <List size={12} /> Passo a Passo
                </h5>
                <div className="space-y-4">
                  {instrucoes.length > 0 ? instrucoes.map((inst: string, i: number) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-black text-primary border border-primary/20">{i + 1}</div>
                      <p className="text-[11px] font-bold text-slate-500 leading-relaxed">{inst}</p>
                    </div>
                  )) : (
                    <p className="text-[10px] text-slate-400 italic px-2">Nenhuma instrução específica.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* 5. SCORE CIRCULAR */}
          <Card className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm flex flex-col items-center">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2",
              demand.score_risco >= 80 ? "text-emerald-500 bg-emerald-50 border-emerald-100" : "text-amber-500 bg-amber-50 border-amber-100"
            )}>
              <span className="text-3xl font-black">{demand.score_risco}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 text-center">Score de Compliance</span>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div className={cn(
                "h-full transition-all duration-1000",
                demand.score_risco >= 80 ? "bg-emerald-500" : demand.score_risco >= 50 ? "bg-amber-500" : "bg-red-500"
              )} style={{ width: `${demand.score_risco}%` }} />
            </div>
            <div className="px-3 py-1.5 bg-slate-50 rounded-xl flex items-center gap-2 w-full justify-center mb-3">
              <span className={`w-2 h-2 rounded-full ${demand.score_risco >= 80 ? 'bg-emerald-500' : demand.score_risco >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">
                Risco {demand.score_risco >= 80 ? 'Baixo' : demand.score_risco >= 50 ? 'Médio' : 'Alto'}
              </span>
            </div>
          </Card>

          {/* 6. PONTOS FORTES E RISCOS */}
          <div className="flex flex-col gap-6">
            {auditoria.pontos_fortes?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-500" /> Pontos Fortes</h4>
                {auditoria.pontos_fortes.map((p: string, i: number) => (
                  <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-start gap-3 shadow-sm group hover:border-emerald-100 transition-all">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 leading-tight">{p}</span>
                  </div>
                ))}
              </div>
            )}
            {auditoria.falhas_detectadas?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest flex items-center gap-2"><AlertTriangle size={14} className="text-amber-500" /> Riscos Identificados</h4>
                {auditoria.falhas_detectadas.map((f: string, i: number) => (
                  <SidebarActionItem
                    key={i}
                    icon={<AlertTriangle size={16} className="text-amber-500" />}
                    text={f}
                    onAction={() => setRefinePrompt(`Corrigir o seguinte risco: ${f}`)}
                    isLoading={refining}
                    variant="amber"
                  />
                ))}
              </div>
            )}
          </div>

          <TechnicalReportCard aiModel={demand.ai_model} createdAt={demand.created_at} />
        </>
      }
    >
      <div className="min-w-0 flex flex-col space-y-8">
        
        {/* TABS SELECTOR */}
        <div className="flex items-center bg-slate-100/50 p-1.5 rounded-[24px] w-fit border border-slate-200/50 print:hidden overflow-x-auto max-w-full no-scrollbar">
           <button 
             onClick={() => setActiveTab('minuta')}
             className={cn(
               "px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
               activeTab === 'minuta' ? "bg-white text-primary shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
             )}
           >
             Minuta da Petição
           </button>
           <button 
             onClick={() => {
               setActiveTab('acompanhamento')
               if (!processStatus && demand.metadata?.process_number) fetchProcessStatus()
             }}
             className={cn(
               "px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
               activeTab === 'acompanhamento' ? "bg-white text-emerald-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
             )}
           >
             <Clock size={14} /> Acompanhamento
           </button>
           <button 
             onClick={() => setActiveTab('analise')}
             className={cn(
               "px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
               activeTab === 'analise' ? "bg-white text-primary shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
             )}
           >
             <Sparkles size={14} className="fill-current" /> Análise Minerva
           </button>
        </div>

        <div className="flex-1 min-h-[500px] relative">
          <div className={cn("transition-all duration-1000", showPaywall && "blur-md select-none pointer-events-none opacity-40")}>
            {activeTab === 'minuta' && (
              <Card className="min-h-[600px] border-none shadow-2xl shadow-slate-200/50 rounded-[20px] md:rounded-[40px] bg-white flex flex-col overflow-hidden print:shadow-none print:border-none print:rounded-none">
                <div className="bg-slate-50 p-4 md:p-6 border-b border-slate-100 flex items-center justify-between print:hidden">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <FileText size={14} /> Minuta Gerada pela IA
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">Pág 1 de 1</div>
                </div>
                <div className="flex-1 p-4 md:p-8">
                  {isEditing ? (
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-full min-h-[800px] border-none focus:ring-0 text-sm md:text-base text-slate-700 leading-relaxed font-mono resize-none outline-none" />
                  ) : (
                    <div className="prose prose-slate max-w-none break-words whitespace-normal prose-headings:font-black prose-p:text-slate-700 text-sm sm:text-base md:text-lg leading-relaxed selection:bg-primary/20 overflow-hidden">
                      <ReactMarkdown
                        components={{
                          li: ({node, children, ...props}) => (
                            <li className="break-words whitespace-normal" {...props}>
                              {typeof children === 'string' ? renderTextWithHighlights(children) : children}
                            </li>
                          ),
                          p: ({node, children, ...props}) => (
                            <p className="break-words whitespace-normal" {...props}>
                              {typeof children === 'string' ? renderTextWithHighlights(children) : children}
                            </p>
                          ),
                          blockquote: ({node, children, ...props}) => (
                            <blockquote className="break-words whitespace-normal" {...props}>
                              {typeof children === 'string' ? renderTextWithHighlights(children) : children
                              }
                            </blockquote>
                          )
                        }}
                      >
                        {demand.metadata?.petition_content || ''}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {activeTab === 'acompanhamento' && (
              <ProcessTrackingSection 
                status={processStatus} 
                isLoading={isTrackingLoading} 
                onAnalyze={() => {
                  if (processAnalysis) setActiveTab('analise')
                  else handleAnalyze()
                }}
              />
            )}

            {activeTab === 'analise' && (
              <ProcessAnalysisSection 
                analysis={processAnalysis} 
                isLoading={isAnalysisLoading} 
                onGenerate={handleAnalyze} 
              />
            )}
          </div>

          {showPaywall && (
            <Paywall 
              type="processo" 
              onPay={() => router.push('/onboarding?redirect=' + encodeURIComponent(window.location.pathname))}
            />
          )}
        </div>
      </div>
    </DocumentAuditLayout>
  )
}

