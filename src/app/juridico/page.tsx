'use client'

import React, { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation'
import { Button } from '@/components/shared/Button'
import { MetricCard } from '@/components/shared/MetricCard'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { Card } from '@/components/shared/Card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { FileText, ShieldAlert, Scale, FileSignature, Loader2, Search, Clock, PlusCircle, Sparkles, AlertCircle } from 'lucide-react'
import { DocumentCard } from '@/components/shared/DocumentCard'
import { PrefetchWrapper } from '@/components/shared/PrefetchWrapper'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/utils/cn'
import { EmptyState } from '@/components/shared/EmptyState'
import { isDeleted } from '@/lib/optimistic/optimisticRegistry'
import { CTAButton } from '@/components/shared/CTAButton'
import { useOnboardingGuard } from '@/features/onboarding/hooks/useOnboardingGuard'
import { useRouter } from 'next/navigation'
import { 
  getJuridicoDocumentsAction,
  deleteJuridicoDocumentAction 
} from '@/app/actions/juridico-actions'
import { ModuleStatsSidebar } from '@/components/shared/ModuleStatsSidebar'

interface LegalDocument {
  id: string
  title: string
  document_type: string
  status: 'generating' | 'ready' | 'failed' | 'timeout'
  created_at: string
  metadata?: any
}

export default function JuridicoPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { session } = useAuth()
  const supabase = createClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'ready' | 'generating'>('all')
  const { needsOnboarding } = useOnboardingGuard()

  const handleNewDocument = () => {
    if (needsOnboarding) {
      router.push('/onboarding?redirect=/juridico/novo')
    } else {
      router.push('/juridico/novo')
    }
  }

  const { data: documents = [], isLoading: loading } = useQuery({
    queryKey: ['juridico-documents'],
    queryFn: async () => {
      const { data: allDocs, error } = await getJuridicoDocumentsAction()

      if (error) {
        console.error('[JuridicoPage] Fetch error:', error)
        throw new Error(error)
      }

      return (allDocs || []) as LegalDocument[]
    },
    // Polling dinâmico do TanStack! Se houver algum generating, refaz em 5 seg.
    refetchInterval: (query) => {
       const docs = query.state.data as LegalDocument[] | undefined
       return docs?.some(d => d.status === 'generating') ? 5000 : false
    }
  })

  const metrics = React.useMemo(() => {
    const hasHighRisk = documents.some(d => d.metadata?.audit?.risk_level === 'alto')
    const hasMediumRisk = documents.some(d => d.metadata?.audit?.risk_level === 'médio')
    
    const complianceStatus = hasHighRisk 
      ? 'Risco Crítico' 
      : hasMediumRisk 
        ? 'Alertas Médios' 
        : 'Seguro'

    return {
      total: documents.length,
      generating: documents.filter(d => d.status === 'generating').length,
      complianceStatus
    }
  }, [documents])

  const deleteMutation = useOptimisticMutation({
    actionName: 'excluir documento',
    mutationFn: (id: string) => deleteJuridicoDocumentAction(id),
    queryKey: ['juridico-documents'],
    operation: 'delete',
    getEntityId: (id: string) => id,
    updater: (old: any, id: string) => {
      if (!Array.isArray(old)) return old
      return old.filter((doc: any) => doc.id !== id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
  })

  const filteredDocuments = React.useMemo(() => {
    const filtered = documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filter === 'all' || doc.status === filter
      return matchesSearch && matchesFilter
    })

    // Deduplicação por ID (Proteção Realtime) e Filtro de Exclusão Otimista
    const seen = new Set()
    return filtered.filter(doc => {
      if (!doc.id || seen.has(doc.id) || isDeleted(doc.id)) return false
      seen.add(doc.id)
      return true
    })
  }, [documents, searchTerm, filter])

  if (loading) {
    return (
      <DashboardLayout>
         <div className="flex h-full w-full items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageContainer>
        {/* Mobile Title & Subtitle */}
        <div className="flex lg:hidden flex-col gap-y-1.5 items-center w-full text-center mb-8">
          <h1 className="font-montserrat font-bold text-2xl md:text-[26px] text-[#171717] m-0 uppercase leading-tight w-full">
            REPOSITÓRIO JURÍDICO
          </h1>
          <p className="font-montserrat font-normal text-sm text-[#737373] m-0 max-w-2xl leading-relaxed mx-auto">
            Documentos redigidos com precisão. Cada cláusula, revisada.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <ModuleStatsSidebar 
            stats={[
              { label: 'Contratos Gerados', value: metrics.total, icon: <FileSignature size={28} />, color: 'primary' },
              { label: 'Análises em Curso', value: metrics.generating, icon: <Loader2 size={28} className={metrics.generating > 0 ? "animate-spin" : ""} />, color: 'blue' },
              { label: 'Nível de Compliance', value: metrics.complianceStatus, icon: <ShieldAlert size={28} />, color: 'emerald' }
            ]}
            action={
              <CTAButton icon={PlusCircle} onClick={handleNewDocument} className="!w-full w-full shadow-xl shadow-primary/20">
                Redigir Documento
              </CTAButton>
            }
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-y-8 w-full min-w-0">
            
            {/* Desktop Title & Subtitle */}
            <div className="hidden lg:flex flex-col gap-y-1.5 items-start w-full text-left">
              <h1 className="font-montserrat font-bold text-2xl md:text-[26px] text-[#171717] m-0 uppercase leading-tight w-full">
                REPOSITÓRIO JURÍDICO
              </h1>
              <p className="font-montserrat font-normal text-sm text-[#737373] m-0 max-w-2xl leading-relaxed mx-0">
                Documentos redigidos com precisão. Cada cláusula, revisada.
              </p>
            </div>

            <div className="flex flex-col space-y-8">
              {/* Filters and Search - Padrão iaNow */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 p-2 rounded-[22px] border border-slate-100 shadow-inner-sm">
                <div className="relative flex items-center p-1 bg-slate-100/50 rounded-2xl w-full sm:w-auto">
                  <div 
                    className={cn(
                      "absolute h-[34px] transition-all duration-300 ease-out bg-white rounded-xl shadow-sm border border-slate-200/50",
                      filter === 'all' && "w-[calc(33.33%-4px)] left-1 sm:w-[80px] sm:left-1",
                      filter === 'ready' && "w-[calc(33.33%-4px)] left-[33.33%] sm:w-[94px] sm:left-[88px]",
                      filter === 'generating' && "w-[calc(33.33%-4px)] left-[calc(66.66%+2px)] sm:w-[94px] sm:left-[186px]"
                    )}
                  />
                  <button onClick={() => setFilter('all')} className={cn("relative z-10 px-2 sm:px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-1/3 sm:w-[80px]", filter === 'all' ? 'text-primary' : 'text-slate-400 hover:text-slate-600')}>Todas</button>
                  <button onClick={() => setFilter('ready')} className={cn("relative z-10 px-2 sm:px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-1/3 sm:w-[94px]", filter === 'ready' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600')}>Prontas</button>
                  <button onClick={() => setFilter('generating')} className={cn("relative z-10 px-2 sm:px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-1/3 sm:w-[94px]", filter === 'generating' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600')}>Em Fila</button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar contrato..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => {
                  const isGenerating = doc.status === 'generating'
                  const isStale = isGenerating && (new Date().getTime() - new Date(doc.created_at).getTime() > 180000)
                  const isReady = doc.status === 'ready'
                  
                  return (
                    <PrefetchWrapper
                      key={doc.id}
                      queryKey={['juridico-doc', doc.id]}
                      queryFn={async () => {
                        const { getJuridicoDocumentAction } = await import('@/app/actions/juridico-actions')
                        const { data, config, error } = await getJuridicoDocumentAction(doc.id)
                        if (error) throw new Error(error)
                        return {
                          document: data,
                          config: config || { isTestMode: false },
                          showPaywall: false
                        }
                      }}
                    >
                    <DocumentCard
                      id={doc.id}
                      href={`/juridico/${doc.id}`}
                      title={doc.title || 'Documento sem título'}
                      subtitle={doc.metadata?.description || 'Documento gerado pela Minerva'}
                      date={new Date(doc.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      isGenerating={isGenerating}
                      isTimeout={isStale}
                      onDelete={() => deleteMutation.mutate(doc.id)}
                      icon={<Scale size={22} />}
                      generatingIcon={<Clock size={16} className="animate-spin" />}
                      timeoutIcon={<AlertCircle size={22} />}
                      moduleLabel="Minerva · Inteligência Jurídica"
                      badge={{
                        label: isStale ? 'Timeout' : isGenerating ? 'Analisando' : isReady ? 'Pronto' : 'Falhou',
                        className: isStale
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : isGenerating
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : isReady
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }}
                      footerTags={[
                        {
                          icon: <div className="flex -space-x-1.5 mr-1">{[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center"><Scale size={8} className="text-primary" /></div>)}</div>,
                          label: 'Blindado'
                        },
                        {
                          icon: <FileSignature size={11} className="text-amber-500 fill-amber-500" />,
                          label: 'Pronto para Assinar'
                        }
                      ]}
                    />
                    </PrefetchWrapper>
                  )
                })
              ) : (
                <EmptyState 
                  icon={FileText}
                  title="Nenhum documento gerado ainda"
                  description="O repositório está vazio. Descreva o contexto e a Minerva redige o primeiro documento — pronto para assinar."
                  actionText="Redigir Primeiro Documento"
                  onClick={handleNewDocument}
                />
              )}
            </div>

            {/* Linha 5: Cards Informativos - Padrão iaNow */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-primary/5 border-primary/10 p-6 rounded-3xl">
                  <h4 className="text-primary font-black text-xs uppercase tracking-widest mb-2">Validade Jurídica</h4>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Cada documento gerado está em conformidade com o Código Civil e a MP 2.200-2/01 — válido para assinatura digital com plena eficácia legal.
                  </p>
              </Card>
              <Card className="bg-amber-50/50 border-amber-100 p-6 rounded-3xl">
                  <h4 className="text-amber-800 font-black text-xs uppercase tracking-widest mb-2">Proteção de Dados</h4>
                  <p className="text-amber-700/80 text-sm leading-relaxed font-medium">
                    Cláusulas de tratamento de dados são inseridas automaticamente, assegurando conformidade com a LGPD desde a minuta.
                  </p>
              </Card>
              <Card className="bg-emerald-50/50 border-emerald-100 p-6 rounded-3xl">
                  <h4 className="text-emerald-800 font-black text-xs uppercase tracking-widest mb-2">Atualização Contínua</h4>
                  <p className="text-emerald-700/80 text-sm leading-relaxed font-medium">
                    A Minerva acompanha as resoluções vigentes. Seus contratos refletem o estado atual da legislação, sem revisão manual.
                  </p>
              </Card>
            </div>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
