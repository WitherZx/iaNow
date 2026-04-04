'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  Gavel,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Pencil,
  Save,
  X,
  Upload,
  User,
  Scale,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  ChevronDown,
  Info,
  Search,
  History,
  RotateCcw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getDocumentVersionsAction, getVersionContentAction } from '@/app/actions/version-actions'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { DocumentAuditLayout } from '@/components/shared/DocumentAuditLayout'
import { DocumentHero } from '@/components/shared/DocumentHero'
import { DocumentActionBar } from '@/components/shared/DocumentActionBar'
import { SidebarRefineSection } from '@/components/shared/SidebarRefineSection'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'
import { Paywall } from '@/components/shared/Paywall'
import { getJusticeDemandAction } from '@/app/actions/justice-actions'

export default function DemandDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [demand, setDemand] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [refinePrompt, setRefinePrompt] = useState('')
  const [refining, setRefining] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [uploadedEvidence, setUploadedEvidence] = useState<{ id: string; name: string; url: string; type: string }[]>([])

  const hasPetition = demand?.metadata?.petition_content
  const [activeTab, setActiveTab] = useState<'minuta' | 'acompanhamento' | 'analise' | 'auditoria'>('minuta')
  const [processStatus, setProcessStatus] = useState<any>(null)
  const [isTrackingLoading, setIsTrackingLoading] = useState(false)
  const [processAnalysis, setProcessAnalysis] = useState<any>(null)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)

  const [showPaywall, setShowPaywall] = useState(false)
  const [config, setConfig] = useState({ isAllAccess: false, isTestMode: false })

  const [versions, setVersions] = useState<any[]>([])
  const [viewingVersion, setViewingVersion] = useState<any>(null)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)

  const loadDemand = async () => {
    try {
      setLoading(true)
      const guestId = localStorage.getItem('ianow_guest_id')
      const res = await getJusticeDemandAction(id as string, guestId)

      if (res.error) throw new Error(res.error)

      const data = res.data
      setDemand(data)
      const content = data.metadata?.petition_content || ''
      setEditContent(content)
      setProcessStatus(data.metadata?.last_remote_status || null)
      setProcessAnalysis(data.metadata?.last_analysis || null)
      setUploadedEvidence(data.metadata?.evidence_files || [])
      setConfig(res.config || { isAllAccess: false, isTestMode: false })

      // Redirecionamento Inteligente: Se não tem petição, foca no acompanhamento
      if (!content && activeTab === 'minuta') {
        setActiveTab('acompanhamento')
      }

      // Auto-sync: Se tem número de processo mas não tem status em cache, sincroniza automaticamente
      const processNumber = data.metadata?.process_number
      const cachedStatus = data.metadata?.last_remote_status
      if (processNumber && !cachedStatus) {
        // Roda em background sem bloquear o carregamento da página
        setTimeout(() => fetchProcessStatus(data), 500)
      }

      // Check paywall
      const alreadyPaid = data.is_paid || localStorage.getItem(`ianow_unlock_processo_${id}`) === 'true'
      if (!alreadyPaid && !res.config?.isAllAccess) {
        setShowPaywall(true)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const activeTokenRef = useRef<string | null>(null)

  const scrollToToken = (token: string) => {
    const tokenCleanup = token.replace(/[\[\]]/g, '')
    const id = `token-${tokenCleanup}`
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('animate-pulse', 'ring-4', 'ring-primary/40', 'bg-primary/20')
      setTimeout(() => {
        el.classList.remove('animate-pulse', 'ring-4', 'ring-primary/40', 'bg-primary/20')
      }, 3000)
    }
  }

  const renderTextWithHighlights = (text: string) => {
    if (!text) return null
    const parts = text.split(/(\[.*?\])/g)
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const tokenCleanup = part.replace(/[\[\]]/g, '')
        return (
          <span
            key={i}
            id={`token-${tokenCleanup}`}
            className="transition-all duration-500 rounded px-1 py-0.5 font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 cursor-help"
            title={`Variável: ${tokenCleanup}`}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  const handleDateMask = (val: string) => {
    const digits = val.replace(/\D/g, '').substring(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.substring(0, 2)}/${digits.substring(2)}`
    return `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4)}`
  }

  useEffect(() => {
    if (id) loadDemand()
  }, [id])

  const loadVersions = async () => {
    try {
      setLoadingVersions(true)
      const guestId = localStorage.getItem('ianow_guest_id')
      const res = await getDocumentVersionsAction(id as string, 'justice', guestId)
      if (res.success) setVersions(res.data)
    } finally {
      setLoadingVersions(false)
    }
  }

  const handleSelectVersion = async (v: any) => {
    if (!v) {
      setViewingVersion(null)
      setEditContent(demand.metadata?.petition_content || '')
      return
    }
    try {
      setLoading(true)
      const res = await getVersionContentAction(v.id)
      if (res.success) {
        setViewingVersion(v)
        setEditContent(res.data?.petition_content || '')
        toast.info(`Visualizando versão de ${new Date(v.created_at).toLocaleString('pt-BR')}`)
      }
    } finally {
      setLoading(false)
      setShowHistoryDropdown(false)
    }
  }

  const handleFileUpload = async (file: File, label: string) => {
    try {
      setSaving(true)
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        const base64Content = reader.result as string
        const newFile = {
          id: Math.random().toString(36).substr(2, 9),
          name: label || file.name,
          url: base64Content,
          type: file.type
        }

        const updatedEvidence = [...uploadedEvidence, newFile]
        const guestId = localStorage.getItem('ianow_guest_id')
        const { updateJusticeDemandMetadataAction } = await import('@/app/actions/justice-actions')
        const newMetadata = { ...demand.metadata, evidence_files: updatedEvidence }

        const res = await updateJusticeDemandMetadataAction(id as string, newMetadata, guestId)
        if (res.error) throw new Error(res.error)

        setUploadedEvidence(updatedEvidence)
        setDemand({ ...demand, metadata: newMetadata })
        toast.success(`Anexado: ${label || file.name}`)
      }
    } catch (err) {
      toast.error('Erro ao anexar arquivo.')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const guestId = localStorage.getItem('ianow_guest_id')
      const { updateJusticeDemandMetadataAction } = await import('@/app/actions/justice-actions')
      const newMetadata = { ...demand.metadata, petition_content: editContent }
      const res = await updateJusticeDemandMetadataAction(id as string, newMetadata, guestId)

      if (res.error) throw new Error(res.error)
      setDemand({ ...demand, metadata: newMetadata })
      setIsEditing(false)
      setViewingVersion(null) // Fork concluído: volta para a corrente principal
      toast.success('Petição salva com sucesso!')
      loadVersions() // Atualiza lista de versões
    } catch (err) {
      console.error('Erro ao salvar:', err)
      toast.error('Erro ao salvar alterações.')
    } finally {
      setSaving(false)
    }
  }

  const handleRefine = async (customPrompt?: string) => {
    try {
      setRefining(true)
      const prompt = customPrompt || refinePrompt
      if (!prompt) return

      const response = await fetch('/api/justica/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refine_petition',
          content: editContent,
          instructions: prompt,
          context: demand.metadata?.description
        })
      })

      if (!response.ok) throw new Error('Falha na resposta da IA')
      const data = await response.json()

      setEditContent(data.refinedContent)
      setRefinePrompt('')
      toast.success('Petição refinada pela Minerva!')
    } catch (err) {
      console.error('Erro no refinamento:', err)
      toast.error('Erro ao refinar petição.')
    } finally {
      setRefining(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta demanda?')) return
    try {
      const guestId = localStorage.getItem('ianow_guest_id')
      const { deleteJusticeDemandAction } = await import('@/app/actions/justice-actions')
      const res = await deleteJusticeDemandAction(id as string, guestId)

      if (res.error) throw new Error(res.error)
      router.push('/justica')
      toast.success('Demanda excluída.')
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || 'Sem permissão'))
    }
  }

  const fetchProcessStatus = async (demandOverride?: any) => {
    const demandData = demandOverride || demand
    if (!demandData?.metadata?.process_number) return
    try {
      setIsTrackingLoading(true)
      const { getRemoteProcessInfoAction } = await import('@/app/actions/justice-actions')
      const result = await getRemoteProcessInfoAction(demandData.metadata.process_number)

      if (result.error) throw new Error(result.error)

      const newStatus = result.data
      if (!newStatus) throw new Error('Status não retornado.')
      setProcessStatus(newStatus)

      // Se houver valor da causa no retorno, extraia o numérico
      let numericValorCausa = undefined
      if (newStatus.valorCausa) {
        const strVal = newStatus.valorCausa.replace(/[^\d,-]/g, '').replace(',', '.')
        const floatVal = parseFloat(strVal)
        if (!isNaN(floatVal)) numericValorCausa = floatVal
      }

      // Persistir no banco
      const guestId = localStorage.getItem('ianow_guest_id')
      const { updateJusticeDemandAction } = await import('@/app/actions/justice-actions')
      const updatedMetadata = { ...demandData.metadata, last_remote_status: newStatus }

      const updates: any = { metadata: updatedMetadata }
      if (numericValorCausa !== undefined) {
        updates.valor_causa = numericValorCausa
      }

      const res = await updateJusticeDemandAction(demandData.id || id, updates, guestId)
      if (res.error) throw new Error(res.error)

      setDemand((prev: any) => ({ ...prev, metadata: updatedMetadata, ...(numericValorCausa !== undefined && { valor_causa: numericValorCausa }) }))
      setActiveTab('acompanhamento')
    } catch (err: any) {
      console.error('[Sync] Error:', err)
      toast.error(err.message || 'Erro ao sincronizar com o tribunal.')
    } finally {
      setIsTrackingLoading(false)
    }
  }

  const generateMinervaAnalysis = async () => {
    if (!processStatus) return
    try {
      setIsAnalysisLoading(true)
      const guestId = localStorage.getItem('ianow_guest_id') || ''
      const response = await fetch('/api/justica/analisar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Id': guestId
        },
        body: JSON.stringify({ processData: processStatus })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Erro ${response.status}`)
      }

      const analysis = await response.json()

      const updatedMetadata = { ...demand.metadata, last_analysis: analysis }

      const { updateJusticeDemandMetadataAction } = await import('@/app/actions/justice-actions')
      const saveRes = await updateJusticeDemandMetadataAction(id as string, updatedMetadata, guestId)

      if (saveRes.error) {
        console.error('[Analysis Save] Error:', saveRes.error)
      }

      setProcessAnalysis(analysis)
      setDemand((prev: any) => ({ ...prev, metadata: updatedMetadata }))
      setActiveTab('analise')
      toast.success('Análise da Minerva concluída!')
    } catch (err) {
      console.error('Erro ao salvar análise:', err)
      toast.error('Erro ao gerar análise.')
    } finally {
      setIsAnalysisLoading(false)
    }
  }

  if (loading) return <DashboardLayout><div className="flex h-full w-full items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div></DashboardLayout>
  if (!demand) return <DashboardLayout><PageContainer>Não encontrado.</PageContainer></DashboardLayout>

  if (showPaywall) {
    return (
      <DashboardLayout>
        <div className="relative h-[calc(100vh-64px)] overflow-hidden bg-slate-100">
          <Paywall
            demandId={id as string}
            type="processo"
            fullscreen
            isTestMode={config.isTestMode}
            onBack={() => router.back()}
            onUnlockSuccess={() => {
              localStorage.setItem(`ianow_unlock_processo_${id as string}`, 'true')
              setShowPaywall(false)
              loadDemand()
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  const auditoriaData = demand.metadata?.auditoria || {}
  const ondeProtocolar = auditoriaData.onde_protocolar || {}

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
          onViewHistory={
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (!showHistoryDropdown) loadVersions()
                  setShowHistoryDropdown(!showHistoryDropdown)
                }}
                title="Histórico de alterações"
                className={cn(
                  "h-10 w-10 rounded-xl border-slate-200 text-slate-900 transition-all hover:scale-105",
                  viewingVersion ? "bg-amber-50 border-amber-200 text-amber-600" : "hover:text-primary hover:border-primary/30"
                )}
              >
                <History size={18} />
              </Button>

              {showHistoryDropdown && (
                <div className="absolute right-0 top-12 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-50 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Versões</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    <button
                      onClick={() => handleSelectVersion(null)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between group",
                        !viewingVersion ? "bg-primary/10 text-primary" : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-tight">Versão Atual (Live)</span>
                        <span className="text-[9px] font-bold opacity-60">Conteúdo mais recente</span>
                      </div>
                      {!viewingVersion && <CheckCircle2 size={12} />}
                    </button>

                    {loadingVersions && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={16} className="animate-spin text-slate-300" />
                      </div>
                    )}

                    {!loadingVersions && versions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleSelectVersion(v)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between group mt-1",
                          viewingVersion?.id === v.id ? "bg-amber-50 text-amber-600" : "hover:bg-slate-50 text-slate-600"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black uppercase tracking-tight">
                            {new Date(v.created_at).toLocaleDateString('pt-BR')} às {new Date(v.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[9px] font-bold opacity-60">ID: {v.id.slice(0, 8)}...</span>
                        </div>
                        {viewingVersion?.id === v.id && <Clock size={12} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          }
        />
      }
      hero={
        <DocumentHero
          category={demand.status === 'ready' ? 'Kit Pronto para Protocolo' : 'Protocolado'}
          date={new Date(demand.created_at).toLocaleDateString('pt-BR')}
          title={demand.tipo_acao || 'Acompanhamento Estratégico'}
          description={demand.metadata?.description || 'Petição de Jus Postulandi gerada com inteligência artificial para o juizado especial cível.'}
        />
      }
      sidebar={
        <div className="space-y-6">
          {/* 1. NÚMERO DO PROCESSO (CNJ) */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <Gavel size={14} className="text-slate-400" /> Acompanhamento CNJ
              </div>
              <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                  <span className="text-xs font-black text-slate-700 tracking-tight flex-1 truncate">{demand.metadata?.process_number || 'Não informado'}</span>
                  <button
                    onClick={() => fetchProcessStatus()}
                    disabled={isTrackingLoading}
                    title="Forçar atualização"
                    className="shrink-0 w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-900 hover:text-white text-slate-500 flex items-center justify-center transition-all"
                  >
                    {isTrackingLoading
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Search size={14} />}
                  </button>
                </div>
                {isTrackingLoading && (
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center animate-pulse">Sincronizando...</p>
                )}
              </div>
            </div>
          )}

          {/* 2. PREENCHER VARIÁVEIS */}
          {!isEditing && activeTab === 'minuta' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <Pencil size={14} className="text-primary" /> Preencher Variáveis
              </div>
              <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-4">
                {(() => {
                  const tokens = Array.from(new Set((demand.metadata?.petition_content || '').match(/\[(.*?)\]/g) || [])) as string[]
                  if (tokens.length === 0) return <p className="text-[10px] text-slate-400 font-bold text-center">Nenhum campo variável</p>
                  return (
                    <div className="space-y-4">
                      {tokens.map(token => {
                        const isDate = token.toUpperCase().includes('DATA')
                        return (
                          <div key={token} className="space-y-1.5 group/var">
                            <button
                              onClick={() => scrollToToken(token)}
                              className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase ml-1 hover:text-primary transition-colors text-left"
                            >
                              {token.slice(1, -1)}
                              <ExternalLink size={10} className="opacity-0 group-hover/var:opacity-100 transition-opacity" />
                            </button>
                            <input
                              type="text"
                              placeholder={isDate ? 'DD/MM/AAAA' : '...'}
                              value={fieldValues[token] || ''}
                              onChange={(e) => {
                                let val = e.target.value
                                if (isDate) val = handleDateMask(val)
                                setFieldValues(prev => ({ ...prev, [token]: val }))
                              }}
                              className="w-full bg-white rounded-xl h-10 px-4 text-xs font-bold focus:ring-1 focus:ring-primary/20 transition-all border-slate-200 border-1"
                            />
                          </div>
                        )
                      })}
                      <Button
                        onClick={async () => {
                          let finalContent = editContent
                          Object.entries(fieldValues).forEach(([token, val]) => {
                            if (val.trim()) {
                              finalContent = finalContent.replaceAll(token, val)
                            }
                          })

                          setEditContent(finalContent)
                          setFieldValues({})

                          // Persiste no banco imediatamente
                          try {
                            setSaving(true)
                            const guestId = localStorage.getItem('ianow_guest_id')
                            const { updateJusticeDemandMetadataAction } = await import('@/app/actions/justice-actions')
                            const { createDocumentVersionAction } = await import('@/app/actions/version-actions')

                            const newMetadata = { ...demand.metadata, petition_content: finalContent }
                            const res = await updateJusticeDemandMetadataAction(id as string, newMetadata, guestId)

                            if (res.error) throw new Error(res.error)

                            setDemand({ ...demand, metadata: newMetadata })
                            await createDocumentVersionAction(id as string, 'justice', newMetadata, guestId)

                            toast.success('Variáveis aplicadas e salvas!')
                            loadVersions()
                          } catch (err) {
                            console.error('Erro ao salvar após aplicar variáveis:', err)
                            toast.error('Variáveis aplicadas localmente, mas houve erro ao salvar.')
                          } finally {
                            setSaving(false)
                          }
                        }}
                        isLoading={saving}
                        className="w-full bg-primary text-white font-black h-11 rounded-xl text-[10px]"
                      >Aplicar ao Texto</Button>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* 3. AJUSTAR COM IA */}
          <SidebarRefineSection
            value={refinePrompt}
            onChange={setRefinePrompt}
            onSubmit={() => handleRefine()}
            isLoading={refining}
            label="Ajustar Petição com IA"
            hint="Descreva o que deseja mudar ou adicionar à petição de Jus Postulandi."
          />

          {/* 4. PONTUAÇÃO DE ROBUSTEZ (Compliance) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <Scale size={14} className="text-emerald-500" /> Auditoria de Risco
            </div>
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm">
              <div className="flex flex-col items-center text-center gap-2 mb-6">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                    <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={226} strokeDashoffset={226 - (226 * (demand.score_risco || 0)) / 100} className="text-emerald-500 transition-all duration-1000" />
                  </svg>
                  <span className="absolute text-xl font-black text-slate-900">{demand.score_risco || 0}%</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Robustez</p>
              </div>

              {auditoriaData.pontos_fortes?.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  {auditoriaData.pontos_fortes.slice(0, 2).map((p: string, i: number) => (
                    <div key={i} className="flex gap-3">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-slate-600 leading-tight">{p}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5. GUIA DE PROTOCOLO PASSO A PASSO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <MapPin size={14} className="text-blue-500" /> Guia de Protocolo
            </div>
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
                <p className="text-xs font-black text-blue-900 mb-1 leading-tight">{ondeProtocolar.orgao || 'JEC - Juizado Especial Cível'}</p>
                <p className="text-[10px] text-blue-600 font-bold leading-relaxed">{ondeProtocolar.instrucao || 'Procure o setor de atermação presencialmente ou via portal digital.'}</p>
                {ondeProtocolar.portal && (
                  <a href={ondeProtocolar.portal} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-[10px] font-black text-blue-700 hover:underline">
                    Acessar Portal <ExternalLink size={10} className="ml-1" />
                  </a>
                )}
              </div>

              {auditoriaData.instrucoes_protocolo?.length > 0 && (
                <div className="space-y-3 pt-2">
                  {auditoriaData.instrucoes_protocolo.map((step: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i + 1}</div>
                      <p className="text-[11px] font-bold text-slate-600 leading-tight">{step}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* DOCUMENTOS DE IDENTIFICAÇÃO (APENAS ADMINISTRATIVOS) */}
              <div className="pt-4 border-t border-slate-50 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documentos de Identificação</p>
                {(auditoriaData.documentos_necessarios || [])
                  .filter((doc: string) => {
                    const d = doc.toLowerCase()
                    return d.includes('rg') || d.includes('cpf') || d.includes('cnh') || d.includes('residência') || d.includes('foto') || d.includes('pessoais')
                  })
                  .concat(['Documento com Foto (RG/CNH)', 'CPF', 'Comprovante de Residência'])
                  .slice(0, 3)
                  .filter((v: any, i: number, a: any[]) => a.indexOf(v) === i)
                  .map((doc: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-600 truncate">{doc}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* 6. GESTÃO DE PROVAS (APENAS MÉRITO/FATOS) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <FileText size={14} className="text-amber-500" /> Provas dos Fatos
            </div>
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-5">
              <div className="space-y-3">
                {(auditoriaData.provas_recomendadas || [])
                  .filter((prova: string) => {
                    const p = prova.toLowerCase()
                    return !p.includes('rg') && !p.includes('cpf') && !p.includes('residencia') && !p.includes('cnh')
                  })
                  .concat(['Prints de conversas/WhatsApp', 'Faturas ou Notas Fiscais', 'E-mails de reclamação'])
                  .slice(0, 3)
                  .filter((v: any, i: number, a: any[]) => a.indexOf(v) === i)
                  .map((prova: string, i: number) => {
                    const hasAnexo = uploadedEvidence.some(f => f.name === prova)
                    return (
                      <div key={i} className={cn(
                        "group relative border rounded-2xl p-4 transition-all overflow-hidden",
                        hasAnexo ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 hover:bg-white border-slate-100 hover:border-amber-200"
                      )}>
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="text-[11px] font-black text-slate-700 leading-tight flex-1">{prova}</span>
                          {hasAnexo ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <Upload size={14} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                          )}
                        </div>
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file, prova)
                          }}
                        />
                        <p className="text-[9px] font-bold text-slate-400 italic">
                          {hasAnexo ? 'Arquivo anexado com sucesso' : 'Clique para anexar prova'}
                        </p>
                      </div>
                    )
                  })
                }

                <label className="group relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 hover:border-amber-200 rounded-2xl cursor-pointer bg-slate-50/50 transition-all mt-2">
                  <input type="file" className="hidden" multiple onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, file.name)
                  }} />
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                    <Upload size={16} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Outras Provas</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* 7. RELATÓRIO TÉCNICO (CARD ESCURO DO PRINT) */}
          <div className="bg-[#0f172a] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-8">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Relatório Técnico
            </div>

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo</span>
                <span className="text-sm font-black text-white tracking-tight">Minerva AI - V4</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Criado em</span>
                <span className="text-sm font-black text-white tracking-tight">
                  {new Date(demand.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Efeito visual de fundo */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full" />
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full bg-white rounded-[32px] overflow-hidden print:block print:h-auto print:overflow-visible border border-slate-100 shadow-sm transition-all duration-500 print:shadow-none print:border-none print:rounded-none print:bg-transparent">
        <div className="flex items-center gap-2 p-3 bg-slate-50/50 border-b border-slate-100 print:hidden overflow-x-auto whitespace-nowrap custom-scrollbar justify-between">
          <div className="flex items-center gap-2">
            {(['minuta', 'acompanhamento', 'analise'] as const).map((tab) => {
              const isPetitionEmpty = tab === 'minuta' && !editContent
              const labels: Record<string, string> = {
                minuta: 'Petição IA',
                acompanhamento: 'Processo CNJ',
                analise: 'Análise Minerva'
              }
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  disabled={isPetitionEmpty}
                  title={isPetitionEmpty ? 'Petição gerada pela Minerva. Não disponível para processos de acompanhamento externo.' : undefined}
                  className={cn(
                    "px-6 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0",
                    activeTab === tab
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : isPetitionEmpty
                        ? "text-slate-200 cursor-not-allowed"
                        : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {labels[tab]}
                  {isPetitionEmpty && <span className="ml-1.5 text-[8px] text-slate-300">· IA</span>}
                </button>
              )
            })}
          </div>

          {viewingVersion && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse mr-2">
              <Clock size={12} className="text-amber-600" />
              <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Visualizando Histórico: {new Date(viewingVersion.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <button
                onClick={() => handleSelectVersion(null)}
                className="ml-1 hover:text-amber-900 transition-colors"
                title="Voltar para versão atual"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar print:overflow-visible print:p-0 print:m-0">
          {activeTab === 'minuta' && (
            <div className="mx-auto space-y-8 animate-in fade-in duration-700 print:space-y-0">
              {isEditing ? (
                <div className="flex-1">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-[800px] border-none focus:ring-0 text-base md:text-lg text-slate-700 leading-relaxed font-mono whitespace-pre-wrap outline-none resize-none p-4 md:p-8"
                    placeholder="Edite o conteúdo da petição..."
                  />
                </div>
              ) : editContent ? (
                <div className="flex-1 print:p-0 text-slate-800 leading-[1.8] font-sans text-lg md:text-[17px] whitespace-pre-wrap selection:bg-primary/20">
                  {renderTextWithHighlights(editContent)}

                  {/* ANEXOS DE PROVAS (SÓ PARA IMPRESSÃO) */}
                  {uploadedEvidence.length > 0 && (
                    <div className="hidden print:block">
                      {uploadedEvidence.map((file, idx) => (
                        <div key={file.id} className="pt-2" style={{ pageBreakBefore: 'always' }}>
                          <div className="mb-6 flex items-center justify-between border-b pb-2">
                            <h2 className="text-xl font-bold uppercase tracking-widest text-slate-500">ANEXO {idx + 1}</h2>
                            <span className="text-sm font-medium text-slate-400">{file.name}</span>
                          </div>

                          <div className="flex items-center justify-center min-h-[800px]">
                            {file.type.startsWith('image/') ? (
                              <img src={file.url} alt={file.name} className="max-w-full max-h-[900px] object-contain" />
                            ) : file.type === 'application/pdf' ? (
                              <div className="text-center p-20 border-2 border-dashed rounded-3xl">
                                <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                                <p className="text-slate-500 font-bold">Documento PDF: {file.name}</p>
                                <p className="text-xs text-slate-400 mt-2">Deve ser anexado manualmente ao sistema do tribunal.</p>
                              </div>
                            ) : (
                              <p className="text-slate-400">Arquivo: {file.name}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center text-slate-200">
                    <FileText size={40} />
                  </div>
                  <div className="max-w-xs">
                    <h4 className="text-xl font-black text-slate-900 mb-2">Sem Petição Gerada</h4>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">Este processo foi adicionado apenas para acompanhamento de movimentos oficiais.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'acompanhamento' && (
            <div className=" mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {processStatus ? (
                <div className="space-y-6">
                  {/* Cabeçalho com Status e Botão Minerva */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-emerald-50 rounded-[28px] border border-emerald-100 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Status Atual</p>
                      <h3 className="text-2xl font-black text-emerald-900">{processStatus.status}</h3>
                      <p className="text-xs font-bold text-emerald-600/60 uppercase mt-1 tracking-tight">{processStatus.court}</p>
                      {(processStatus.classe || processStatus.subject) && (
                        <p className="text-xs font-bold text-emerald-700/70 mt-1">{[processStatus.classe, processStatus.subject].filter(Boolean).join(' • ')}</p>
                      )}
                    </div>
                    <Button
                      onClick={generateMinervaAnalysis}
                      disabled={isAnalysisLoading}
                      className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl h-12 px-8 shadow-lg shadow-emerald-500/20 shrink-0"
                    >
                      {isAnalysisLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="mr-2" />}
                      Analisar com Minerva
                    </Button>
                  </div>

                  {/* Partes do processo */}
                  {processStatus.partes && processStatus.partes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['Autor', 'Réu'].map(polo => {
                        const parties = processStatus.partes.filter((p: any) => p.tipo === polo)
                        if (parties.length === 0) return null
                        return (
                          <div key={polo} className={`p-6 rounded-[24px] border ${polo === 'Autor' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${polo === 'Autor' ? 'text-blue-600' : 'text-red-600'}`}>{polo}</p>
                            <div className="space-y-2">
                              {parties.map((p: any, i: number) => (
                                <p key={i} className="text-sm font-black text-slate-900 leading-tight">{p.nome}</p>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Informações adicionais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {processStatus.valorCausa && (
                      <div className="flex flex-col gap-1 px-4 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor da Causa</span>
                        <span className="text-sm font-black text-slate-900 leading-tight">{processStatus.valorCausa}</span>
                      </div>
                    )}
                    {processStatus.distributionDate && (
                      <div className="flex flex-col gap-1 px-4 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuído em</span>
                        <span className="text-sm font-black text-slate-900 leading-tight">{processStatus.distributionDate}</span>
                      </div>
                    )}
                    {processStatus.judge && processStatus.judge !== 'Não identificado' && (
                      <div className="flex flex-col gap-1 px-4 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Juízo</span>
                        <span className="text-sm font-black text-slate-900 leading-tight">{processStatus.judge}</span>
                      </div>
                    )}
                  </div>

                  {/* Aviso sobre petições */}
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-amber-800 mb-0.5">Documentos do processo não disponíveis via DataJud</p>
                      <p className="text-[11px] font-medium text-amber-700 leading-relaxed">O CNJ disponibiliza apenas metadados e movimentações. Para visualizar petições e decisões, acesse o portal do tribunal diretamente.</p>
                    </div>
                  </div>

                  {/* Timeline de Movimentações */}
                  <div className="space-y-4">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Últimas Movimentações</p>

                    {/* Banner "Sua Vez" — só aparece quando a movimentação mais recente exige ação */}
                    {processStatus.movements?.[0]?.actionRequired && (
                      <div className="flex items-start gap-3 p-5 bg-amber-400 rounded-[24px] shadow-lg shadow-amber-400/30">
                        <Zap size={20} className="text-white shrink-0 mt-0.5 fill-white" />
                        <div>
                          <p className="text-sm font-black text-white mb-0.5">⚡ Sua vez de agir!</p>
                          <p className="text-xs font-bold text-amber-900 leading-relaxed">{processStatus.movements[0].actionHint || 'Verifique prazos e providências necessárias.'}</p>
                        </div>
                      </div>
                    )}

                    {processStatus.movements?.map((mov: any, i: number) => {
                      const poloConfig: Record<string, { label: string; color: string; iconColor: string }> = {
                        juizo: { label: 'Juízo', color: 'bg-slate-800 text-white', iconColor: 'text-slate-500' },
                        ativo: { label: 'Parte Ativa', color: 'bg-blue-600 text-white', iconColor: 'text-blue-400' },
                        passivo: { label: 'Parte Passiva', color: 'bg-rose-600 text-white', iconColor: 'text-rose-400' },
                        mp: { label: 'MP', color: 'bg-purple-600 text-white', iconColor: 'text-purple-400' },
                        outro: { label: 'Movimento', color: 'bg-slate-200 text-slate-600', iconColor: 'text-slate-300' },
                      };
                      const polo = poloConfig[mov.polo || 'outro'];

                      return (
                        <div key={i} className="p-4 bg-white border border-slate-100 rounded-3xl shadow-sm hover:border-primary/20 hover:shadow-md transition-all">
                          <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 sm:items-center min-w-0">
                            {/* Cabecalho da Movimentacao (apenas mobile) ou apenas Relogio (desktop) */}
                            <div className="flex items-center justify-between sm:justify-center shrink-0">
                              <div className="flex items-center gap-2.5">
                                <div className={`shrink-0 w-8 h-8 sm:w-12 sm:h-12 bg-slate-50 rounded-[12px] sm:rounded-2xl flex items-center justify-center border-2 border-slate-200 ${polo.iconColor}`}>
                                  <Clock size={14} className="sm:hidden" />
                                  <Clock size={20} className="hidden sm:block" />
                                </div>
                                <span className="sm:hidden text-[10px] font-black text-primary uppercase tracking-widest">{new Date(mov.date).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <span className={`sm:hidden text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${polo.color}`}>{polo.label}</span>
                            </div>

                            {/* Conteudo */}
                            <div className="flex-1 min-w-0">
                              <div className="hidden sm:flex items-center justify-between gap-3 flex-wrap mb-2">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{new Date(mov.date).toLocaleDateString('pt-BR')}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${polo.color}`}>{polo.label}</span>
                              </div>

                              <p className="text-sm sm:text-base font-black text-slate-900 leading-tight mb-2">{mov.description}</p>

                              {/* Texto livre do complemento */}
                              {mov.details && (
                                <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed mb-3 border-l-2 border-slate-100 pl-3">{mov.details}</p>
                              )}

                              {/* Complementos tabelados como badges */}
                              {mov.extras?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1 sm:mt-2">
                                  {mov.extras.map((extra: any, j: number) => {
                                    const v = String(extra.valor ?? '').toLowerCase()
                                    const n = String(extra.nome ?? '').toLowerCase()
                                    // Lógica de cor semântica
                                    const style =
                                      v.includes('entregue') || v.includes('cumprido') || v.includes('deferido') || v.includes('procedente')
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : v.includes('não cumprido') || v.includes('cancelado') || v.includes('indeferido') || v.includes('improcedente')
                                          ? 'bg-red-50 border-red-200 text-red-700'
                                          : n.includes('decisão') || n.includes('sentença') || n.includes('despacho')
                                            ? 'bg-purple-50 border-purple-200 text-purple-700'
                                            : n.includes('document') || n.includes('petição') || n.includes('ofício')
                                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                                              : 'bg-yellow-100 border-yellow-300 text-yellow-700'

                                    return (
                                      <span key={j} className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1 rounded-lg sm:rounded-full border text-[9px] sm:text-[10px] font-bold overflow-hidden ${style}`}>
                                        <span className="font-black uppercase opacity-80 sm:opacity-100">{extra.nome}:</span>
                                        <span className="leading-tight">{extra.valor}</span>
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center text-slate-200">
                    <Gavel size={40} />
                  </div>
                  <div className="max-w-xs">
                    <h4 className="text-xl font-black text-slate-900 mb-2">Sincronize seu Processo</h4>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">Insira o número CNJ na barra lateral para monitorar movimentações em tempo real direto do tribunal.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analise' && (
            <div className="mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {processAnalysis ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-8 border-none bg-indigo-50 shadow-sm relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Parecer da Minerva</p>
                        <p className="text-lg font-bold text-indigo-900 leading-relaxed italic">"{processAnalysis.resumo || processAnalysis.sumario_executivo || processAnalysis.analysis}"</p>
                      </div>
                      <Sparkles size={120} className="absolute -bottom-10 -right-10 text-indigo-500/10 rotate-12" />
                    </Card>
                    {processAnalysis.alerta_risco && (
                      <Card className="p-8 border-none bg-amber-50 shadow-sm border border-amber-100">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">⚠ Alerta de Risco</p>
                        <p className="text-base font-bold text-amber-900 leading-relaxed">{processAnalysis.alerta_risco}</p>
                      </Card>
                    )}
                  </div>

                  {processAnalysis.traducao_leigo && (
                    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
                      <h4 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-4">
                        <Info size={20} className="text-blue-500" /> Tradução para você
                      </h4>
                      <p className="text-base font-medium text-slate-600 leading-relaxed">{processAnalysis.traducao_leigo}</p>
                    </div>
                  )}

                  <div className="bg-white border border-slate-100 rounded-[32px] shadow-sm space-y-6">
                    <h4 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <Zap size={20} className="text-amber-500 fill-amber-500" /> Próximos Passos Recomendados
                    </h4>
                    <div className="space-y-4">
                      {(processAnalysis.proximos_passos || processAnalysis.nextSteps || []).map((passo: string, i: number) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                          <div className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">{i + 1}</div>
                          <p className="text-base font-bold text-slate-700 leading-tight">{passo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 text-slate-300">
                  <Sparkles size={64} />
                  <p className="text-sm font-black uppercase tracking-widest">Sincronize o processo para gerar a auditoria IA</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DocumentAuditLayout>
  )
}
