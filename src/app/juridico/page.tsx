'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/shared/Button'
import { MetricCard } from '@/components/shared/MetricCard'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { Card } from '@/components/shared/Card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { FileText, ShieldAlert, Scale, FileSignature, Loader2, Search, Clock, PlusCircle, Sparkles, AlertCircle } from 'lucide-react'
import { DocumentCard } from '@/components/shared/DocumentCard'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/utils/cn'
import { EmptyState } from '@/components/shared/EmptyState'
import { CTAButton } from '@/components/shared/CTAButton'
import { useOnboardingGuard } from '@/features/onboarding/hooks/useOnboardingGuard'
import { useRouter } from 'next/navigation'

interface LegalDocument {
  id: string
  title: string
  document_type: string
  status: 'generating' | 'ready' | 'failed' | 'timeout'
  created_at: string
}

export default function JuridicoPage() {
  const router = useRouter()
  const { session } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<LegalDocument[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'ready' | 'generating'>('all')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { needsOnboarding } = useOnboardingGuard()

  const handleNewDocument = () => {
    if (needsOnboarding) {
      router.push('/onboarding?redirect=/juridico/novo')
    } else {
      router.push('/juridico/novo')
    }
  }
  
  const [metrics, setMetrics] = useState({
    total: 0,
    generating: 0,
    complianceStatus: '100% Protegido',
  })

  useEffect(() => {
    let interval: NodeJS.Timeout

    async function loadData() {
      try {
        setLoading(true)
        if (!session?.user?.id) {
          setDocuments([])
          return
        }

        const { data: membership, error: memberError } = await supabase
          .from('memberships')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle() as any

        if (memberError || !membership) {
          console.error('Membership error:', memberError)
          setLoading(false)
          return
        }

        const orgId = membership.organization_id

        const { data: docs } = await supabase
          .from('generated_documents')
          .select('id, title, document_type, status, created_at, metadata')
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        const parsedDocs = (docs || []) as any[]
        
        setDocuments(parsedDocs as LegalDocument[])

        // Cálculo dinâmico das métricas de compliance
        const hasHighRisk = parsedDocs.some(d => d.metadata?.audit?.risk_level === 'alto')
        const hasMediumRisk = parsedDocs.some(d => d.metadata?.audit?.risk_level === 'médio')
        
        const complianceStatus = hasHighRisk 
          ? 'Risco Crítico' 
          : hasMediumRisk 
            ? 'Alertas Médios' 
            : 'Seguro'

        setMetrics({
          total: parsedDocs.length,
          generating: parsedDocs.filter(d => d.status === 'generating').length,
          complianceStatus
        })

        // Se houver documentos gerando, ativa o polling
        if (parsedDocs.some(d => d.status === 'generating')) {
          if (!interval) {
            interval = setInterval(loadData, 5000)
          }
        } else {
          if (interval) clearInterval(interval)
        }

      } catch (err) {
        console.error('Erro ao buscar documentos:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [session, supabase])

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || doc.status === filter
    return matchesSearch && matchesFilter
  })

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
      <PageContainer
        title="Repositório Jurídico"
        subtitle="Documentos redigidos com precisão. Cada cláusula, revisada."
        action={
          <CTAButton icon={PlusCircle} onClick={handleNewDocument} className="w-full lg:w-auto">
             Redigir Documento
          </CTAButton>
        }
      >
        <div className="flex flex-col gap-y-8">
          
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group hover:border-primary/20 transition-all text-center animate-in slide-in-from-bottom-[10px] fade-in">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                <FileSignature size={28} />
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-3xl font-black text-slate-900">{metrics.total}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Contratos Gerados</span>
              </div>
            </Card>
            
            <Card className="bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group hover:border-blue-500/20 transition-all text-center animate-in slide-in-from-bottom-[10px] fade-in delay-100">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                metrics.generating > 0 ? "bg-primary text-white shadow-lg shadow-primary/20 animate-pulse" : "bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white"
              )}>
                <Loader2 size={28} className={metrics.generating > 0 ? "animate-spin" : ""} />
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-3xl font-black text-slate-900">{metrics.generating}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Análises em Curso</span>
              </div>
            </Card>

            <Card className="bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group hover:border-emerald-500/20 transition-all text-center animate-in slide-in-from-bottom-[10px] fade-in delay-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                <ShieldAlert size={28} />
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{metrics.complianceStatus}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Nível de Compliance</span>
              </div>
            </Card>
          </div>

          <div className="flex flex-col space-y-6">
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
                  const displayStatus = isStale ? 'timeout' : doc.status
                  const isReady = doc.status === 'ready'
                  
                  return (
                    <DocumentCard
                      key={doc.id}
                      id={doc.id}
                      href={`/juridico/${doc.id}`}
                      title={doc.title}
                      subtitle={doc.document_type}
                      date={new Date(doc.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      isGenerating={isGenerating}
                      isTimeout={isStale}
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
        </div>

        {/* Linha 5: Cards Informativos - Padrão iaNow */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </PageContainer>
    </DashboardLayout>
  )
}
