'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  RotateCcw,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getDocumentVersionsAction, getVersionContentAction } from '@/app/actions/version-actions'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { markDeleted } from '@/lib/optimistic/optimisticRegistry'
import { DocumentAuditLayout } from '@/components/shared/DocumentAuditLayout'
import { DocumentHero } from '@/components/shared/DocumentHero'
import { DocumentActionBar } from '@/components/shared/DocumentActionBar'
import { SidebarRefineSection } from '@/components/shared/SidebarRefineSection'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'
import { Paywall } from '@/components/shared/Paywall'
import { getJusticeDemandAction } from '@/app/actions/justice-actions'
import { deleteJusticeDemandAction } from '@/app/actions/justice-actions'
import { useOnboardingGuard } from '@/features/onboarding/hooks/useOnboardingGuard'

export default function DemandDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [demand, setDemand] = useState<any>(null)

  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [refinePrompt, setRefinePrompt] = useState('')
  const [refining, setRefining] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [recommendedEvidence, setRecommendedEvidence] = useState<string[]>([])

  const hasPetition = demand?.metadata?.petition_content
  const [activeTab, setActiveTab] = useState<'minuta' | 'acompanhamento' | 'analise' | 'auditoria'>('minuta')
  const [processStatus, setProcessStatus] = useState<any>(null)
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false)
  const { needsOnboarding } = useOnboardingGuard()
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  const [isTrackingLoading, setIsTrackingLoading] = useState(false)
  const [processAnalysis, setProcessAnalysis] = useState<any>(null)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
  
  const [processDocuments, setProcessDocuments] = useState<any[]>([])
  const [isDocsLoading, setIsDocsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)

  const isExternal = !!demand?.metadata?.process_number

  const [showPaywall, setShowPaywall] = useState(false)
  const [config, setConfig] = useState({ isAllAccess: false, isTestMode: false })

  const [versions, setVersions] = useState<any[]>([])
  const [viewingVersion, setViewingVersion] = useState<any>(null)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)

  const queryClient = useQueryClient()

  const { data: demandData, isLoading: loading } = useQuery({
    queryKey: ['justice-case', id],
    queryFn: async () => {
      if (!id) return null
      const { getJusticeDemandAction } = await import('@/app/actions/justice-actions')
      const res = await getJusticeDemandAction(id as string)
      if (res.error) throw new Error(res.error)
      
      // Auto-sync process remote status if missing
      const processNumber = res.data?.metadata?.process_number
      const cachedStatus = res.data?.metadata?.last_remote_status
      if (processNumber && !cachedStatus) {
        // Roda em background sem bloquear
        setTimeout(async () => {
             // Let internal component function fetchProcessStatus handle it via button or event if we cannot mutate easily, 
             // but we will expose a flag to trigger it.
        }, 500)
      }

      return {
        demand: res.data,
        config: res.config || { isAllAccess: false, isTestMode: false }
      }
    },
    initialData: () => {
      const allCases = queryClient.getQueryData<any[]>(['justice-cases'])
      const match = allCases?.find(c => c.id === id)
      if (match) {
        return { demand: match, config: { isAllAccess: false, isTestMode: false } }
      }
      return undefined
    }
  })

  // Sincronização do Data Source Immutable para os Mutable States do Editor
  useEffect(() => {
    if (demandData?.demand) {
      const data = demandData.demand
      setDemand(data)
      
      const content = data.metadata?.petition_content || ''
      setEditContent(content)
      setProcessStatus(data.metadata?.last_remote_status || null)
      setProcessAnalysis(data.metadata?.last_analysis || null)
      setProcessDocuments(data.metadata?.last_documents || [])
      setRecommendedEvidence(data.metadata?.auditoria?.provas_recomendadas || [])
      setConfig(demandData.config)

      // Redirecionamento Inteligente
      if (!content && activeTab === 'minuta') {
        setActiveTab('acompanhamento')
      }

      // Check paywall
      const alreadyPaid = data.is_paid || localStorage.getItem(`ianow_unlock_processo_${id}`) === 'true'
      if (!alreadyPaid && !demandData.config.isAllAccess) {
        setShowPaywall(true)
      }
    }
  }, [demandData, activeTab, id])

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

  // Gatilho Automático: Análise Minerva
  useEffect(() => {
    if (activeTab === 'analise' && !processAnalysis && !isAnalysisLoading && processStatus) {
      generateMinervaAnalysis()
    }
  }, [activeTab, processAnalysis, processStatus])

  // Gatilho Automático: Documentos do Escavador
  useEffect(() => {
    if (processStatus && processDocuments.length === 0 && !isDocsLoading) {
      fetchProcessDocuments()
    }
  }, [processStatus])

  const loadVersions = async () => {
    try {
      setLoadingVersions(true)
      const res = await getDocumentVersionsAction(id as string, 'justice')
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
      setLoadingVersions(true)
      const res = await getVersionContentAction(v.id)
      if (res.success) {
        setViewingVersion(v)
        setEditContent(res.data?.petition_content || '')
        toast.info(`Visualizando versão de ${new Date(v.created_at).toLocaleString('pt-BR')}`)
      }
    } finally {
      setLoadingVersions(false)
      setShowHistoryDropdown(false)
    }
  }

  // handleFileUpload removed as per request to focus on AI Proof Strategy

  const handleSave = async () => {
    try {
      setSaving(true)
      const { updateJusticeDemandMetadataAction } = await import('@/app/actions/justice-actions')
      const newMetadata = { ...demand.metadata, petition_content: editContent }
      const res = await updateJusticeDemandMetadataAction(id as string, newMetadata)

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
      const res = await deleteJusticeDemandAction(id as string)

      if (res.error) throw new Error(res.error)

      // Marca como deletado localmente para evitar ghosting na lista principal
      markDeleted(id as string)

      // Invalida o cache da lista e do dashboard
      queryClient.invalidateQueries({ queryKey: ['justice-cases'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })

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
      const { updateJusticeDemandAction } = await import('@/app/actions/justice-actions')
      const updatedMetadata = { ...demandData.metadata, last_remote_status: newStatus }

      const updates: any = { metadata: updatedMetadata }
      if (numericValorCausa !== undefined) {
        updates.valor_causa = numericValorCausa
      }

      const res = await updateJusticeDemandAction(demandData.id || id, updates)
      if (res.error) throw new Error(res.error)

      setDemand((prev: any) => ({ ...prev, metadata: updatedMetadata, ...(numericValorCausa !== undefined && { valor_causa: numericValorCausa }) }))
      
      // DISPARA SINCRONIZAÇÃO DO ESCAVADOR TAMBÉM
      await fetchProcessDocuments()
      
      if (isMounted.current) {
        setActiveTab('acompanhamento')
      }
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
      const response = await fetch('/api/justica/analisar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          processData: processStatus,
          petitionContent: editContent,
          documentList: processDocuments
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Erro ${response.status}`)
      }

      const analysis = await response.json()

      const updatedMetadata = { ...demand.metadata, last_analysis: analysis }

      const { updateJusticeDemandMetadataAction } = await import('@/app/actions/justice-actions')
      const saveRes = await updateJusticeDemandMetadataAction(id as string, updatedMetadata)

      if (saveRes.error) {
        console.error('[Analysis Save] Error:', saveRes.error)
      }

      setProcessAnalysis(analysis)
      setDemand((prev: any) => ({ ...prev, metadata: updatedMetadata }))
      
      if (isMounted.current) {
        setActiveTab('analise')
        toast.success('Análise da Minerva concluída!')
      }
    } catch (err) {
      console.error('Erro ao salvar análise:', err)
      toast.error('Erro ao gerar análise.')
    } finally {
      setIsAnalysisLoading(false)
    }
  }

  const fetchProcessDocuments = async () => {
    if (!demand?.metadata?.process_number) return
    if (isDocsLoading) return
    setIsDocsLoading(true)
    try {
      const { getProcessDocumentsAction, updateJusticeDemandMetadataAction } = await import('@/app/actions/justice-actions')
      const result = await getProcessDocumentsAction(demand.metadata.process_number)
      
      if (result.success) {
        const docs = result.data || []
        setProcessDocuments(docs)
        
        // Auto-extração da Petição Inicial se for externo
        if (isExternal && !editContent) {
          const initialDoc = docs.find((d: any) => d.category === 'petition_initial')
          if (initialDoc) {
            handleAutoExtract(initialDoc.url)
          }
        }

        // Salva no cache do documento
        const updatedMetadata = { ...demand.metadata, last_documents: docs }
        await updateJusticeDemandMetadataAction(id as string, updatedMetadata)
        
        if (docs.length > 0) {
          toast.success(`${docs.length} documentos encontrados no Escavador!`)
        } else {
          toast.info('Nenhum documento encontrado na base do Escavador para este número.')
        }

        setDemand((prev: any) => ({ ...prev, metadata: updatedMetadata }))
      }
    } catch (err: any) {
      console.error('[Escavador] Error:', err)
      toast.error(err.message || 'Erro ao buscar documentos no Escavador.')
    } finally {
      setIsDocsLoading(false)
    }
  }

  const handleAutoExtract = async (url: string) => {
    setIsExtracting(true)
    try {
      const { extractTextFromPdfAction, updateJusticeDemandMetadataAction } = await import('@/app/actions/justice-actions')
      const result = await extractTextFromPdfAction(url, demand?.metadata?.process_number || '')
      if (result.success && result.text) {
        setEditContent(result.text)
        // Salva opcionalmente no metadado para persistir
        await updateJusticeDemandMetadataAction(id as string, { 
          ...demand.metadata, 
          petition_content: result.text,
          is_external_petition: true 
        })
      }
    } catch (err) {
      console.error('Extraction error:', err)
    } finally {
      setIsExtracting(false)
    }
  }


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
              window.location.reload()
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
                            const { updateJusticeDemandMetadataAction } = await import('@/app/actions/justice-actions')
                            const { createDocumentVersionAction } = await import('@/app/actions/version-actions')

                            const newMetadata = { ...demand.metadata, petition_content: finalContent }
                            const res = await updateJusticeDemandMetadataAction(id as string, newMetadata)

                            if (res.error) throw new Error(res.error)

                            setDemand({ ...demand, metadata: newMetadata })
                            await createDocumentVersionAction(id as string, 'justice', newMetadata)

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

          {/* 3. AJUSTAR COM IA — Somente na Petição */}
          {activeTab === 'minuta' && (
            <SidebarRefineSection
              value={refinePrompt}
              onChange={setRefinePrompt}
              onSubmit={() => handleRefine()}
              isLoading={refining}
              label="Ajustar Petição com IA"
              hint="Descreva o que deseja mudar ou adicionar à petição de Jus Postulandi."
            />
          )}

          {/* 4. PONTUAÇÃO DE ROBUSTEZ (Compliance) — Somente na Petição */}
          {activeTab === 'minuta' && (
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
          )}

          {/* 5. GUIA DE PROTOCOLO PASSO A PASSO — Somente na Petição */}
          {activeTab === 'minuta' && (
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
              </div>
            </div>
          )}

          {/* 6. GESTÃO DE PROVAS — Somente na Petição */}
          {activeTab === 'minuta' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <FileText size={14} className="text-amber-500" /> Checklist de Provas
              </div>
              <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-5">
                <div className="space-y-3">
                  {(recommendedEvidence.length > 0 ? recommendedEvidence : ['Prints de conversas/WhatsApp', 'Faturas ou Notas Fiscais', 'E-mails de reclamação'])
                    .slice(0, 5)
                    .map((prova: string, i: number) => (
                      <div key={i} className="flex gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all">
                        <div className="w-5 h-5 bg-amber-100 text-amber-600 rounded flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                          <Sparkles size={10} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-black text-slate-700 leading-tight">{prova}</span>
                          <p className="text-[9px] font-bold text-slate-400 italic uppercase tracking-wider">Necessário para o êxito</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

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
              const isPetitionEmpty = tab === 'minuta' && !editContent && !isExtracting
              const labels: Record<string, string> = {
                minuta: 'Petição Inicial',
                acompanhamento: 'Processo CNJ',
                analise: 'Análise Minerva'
              }
              const isActive = activeTab === tab
              const isAvailable = tab !== 'minuta' || !isPetitionEmpty || isExternal
              return (
                <button
                  key={tab}
                  disabled={!isAvailable}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                    isActive 
                      ? 'bg-white text-primary shadow-sm ring-1 ring-slate-100 scale-105' 
                      : isAvailable 
                        ? 'text-slate-400 hover:text-primary hover:bg-slate-50' 
                        : 'text-slate-200 cursor-not-allowed opacity-30'
                  }`}
                >
                  {labels[tab]}
                  {tab === 'minuta' && isExternal && <span className="ml-1.5 opacity-50 text-[10px]">EXT</span>}
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
              {isExtracting ? (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
                  <Loader2 size={40} className="animate-spin text-primary opacity-20" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Extraindo texto da Petição Inicial...</p>
                </div>
              ) : isEditing && !isExternal ? (
                <div className="flex-1">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-[800px] border-none focus:ring-0 text-base md:text-lg text-slate-700 leading-relaxed font-mono whitespace-pre-wrap outline-none resize-none p-4 md:p-8"
                    placeholder="Edite o conteúdo da petição..."
                  />
                </div>
              ) : editContent ? (
                <div className="flex-1 print:p-0">
                  {isExternal && (
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                      <FileText size={18} className="text-blue-500" />
                      <div>
                        <p className="text-xs font-black text-blue-900 leading-none mb-1">Petição de Acompanhamento Externo</p>
                        <p className="text-[10px] font-bold text-blue-600/70 uppercase">Conteúdo extraído via Escavador • Modo de Leitura</p>
                      </div>
                    </div>
                  )}
                  <div className="text-slate-800 leading-[1.8] font-sans text-lg md:text-[17px] whitespace-pre-wrap selection:bg-primary/20">
                    {renderTextWithHighlights(editContent)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center text-slate-200">
                    <FileText size={40} />
                  </div>
                  <div className="max-w-xs">
                    <h4 className="text-xl font-black text-slate-900 mb-2">
                      {isExternal ? 'Petição não Localizada' : 'Nenhum Documento Gerado'}
                    </h4>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                      {isExternal 
                        ? 'O texto integral da petição inicial não foi encontrado automaticamente na base do Escavador para este processo.' 
                        : 'Este processo foi adicionado para acompanhamento. Para gerar uma petição, utilize o assistente de estratégias.'}
                    </p>
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

                                    const isNumeric = /^\d+$/.test(String(extra.valor || ''))
                                    const displayValue = isNumeric ? null : String(extra.valor)
                                    const displayName = String(extra.nome).replace(/\(S\)/g, '').trim()

                                    return (
                                      <span key={j} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold transition-all hover:scale-105 ${style}`}>
                                        <span className="font-black uppercase tracking-tight">{displayName}</span>
                                        {displayValue && (
                                          <>
                                            <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                                            <span className="opacity-80 font-medium">{displayValue}</span>
                                          </>
                                        )}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Documentos Anexados (do Escavador) */}
                              {(() => {
                                const movDate = new Date(mov.date)
                                movDate.setHours(0, 0, 0, 0)
                                const movTime = movDate.getTime()

                                // Filtra movimentos do mesmo dia para decidir se o vínculo por data é seguro
                                const allMovsSameDay = (processStatus.movements || []).filter((m: any) => {
                                  const d = new Date(m.date)
                                  d.setHours(0, 0, 0, 0)
                                  return d.getTime() === movTime
                                })

                                const relatedDocs = processDocuments.filter(d => {
                                  const docDate = new Date(d.date)
                                  docDate.setHours(0, 0, 0, 0)
                                  const docTime = docDate.getTime()
                                  
                                  if (docTime !== movTime) return false

                                  const nameMatch = mov.description && d.name && (
                                    mov.description.toLowerCase().includes(d.name.toLowerCase()) ||
                                    d.name.toLowerCase().includes(mov.description.toLowerCase())
                                  )

                                  // Se bater o nome, vincula sempre
                                  if (nameMatch) return true
                                  
                                  // Se não bater o nome, só vincula por data se for a única movimentação do dia
                                  // ou se o documento tiver um nome genérico que bata com o movimento
                                  return allMovsSameDay.length === 1
                                })
                                
                                if (relatedDocs.length === 0) return null

                                return (
                                  <div className="mt-4 pt-3 border-t border-slate-50 space-y-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                      <FileText size={10} /> Documentos Vinculados
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {relatedDocs.map(doc => (
                                        <a
                                          key={doc.id}
                                          href={doc.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl text-[10px] font-black text-blue-700 transition-all group/doc"
                                        >
                                          <Upload size={12} className="rotate-180 text-blue-400 group-hover/doc:text-blue-600" />
                                          {doc.name}
                                          {doc.size && <span className="opacity-40 font-bold ml-1">{doc.size}</span>}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })()}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Análise Estratégica</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Cérebro Jurídico Minerva AI</p>
                </div>
                <button
                  onClick={() => generateMinervaAnalysis()}
                  disabled={isAnalysisLoading}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/20 active:scale-95"
                >
                  {isAnalysisLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  {isAnalysisLoading ? 'Analisando...' : 'Refazer Análise'}
                </button>
              </div>

              {!editContent && (
                <div className="p-5 bg-amber-50 border border-amber-100 rounded-[28px] flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-amber-900 leading-none mb-1">Atenção: Contexto de Análise Parcial</p>
                    <p className="text-[11px] font-bold text-amber-600 leading-relaxed uppercase tracking-tight">O texto da petição inicial não foi localizado ou extraído. A Minerva está analisando apenas as movimentações do tribunal, o que pode limitar a precisão estratégica do mérito.</p>
                  </div>
                </div>
              )}

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
