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
import { FileText, Plus, ShieldAlert, Scale, FileSignature, Loader2, Search, ArrowRight, ChevronRight, Calendar, Clock, PlusCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/utils/cn'
import { EmptyState } from '@/components/shared/EmptyState'
import { CTAButton } from '@/components/shared/CTAButton'

interface LegalDocument {
  id: string
  title: string
  document_type: string
  status: 'generating' | 'ready' | 'failed'
  created_at: string
}

export default function JuridicoPage() {
  const { session } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<LegalDocument[]>([])
  
  const [metrics, setMetrics] = useState({
    total: 0,
    generating: 0,
    complianceStatus: '100% Protegido',
  })

  useEffect(() => {
    async function loadData() {
      if (!session?.user?.id) return

      try {
        const { data: membership } = await supabase
          .from('memberships')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .single() as any

        if (!membership) {
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

      } catch (err) {
        console.error('Erro ao buscar documentos:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session, supabase])

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
        title="Central Jurídica"
        subtitle="Geração de contratos inteligentes, procurações automáticas e blindagem legal."
        action={
          <Link href="/juridico/novo">
            <CTAButton icon={PlusCircle}>
               Novo Documento
            </CTAButton>
          </Link>
        }
      >
        <div className="flex flex-col gap-y-12 pb-20">
          
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group hover:border-primary/20 transition-all text-center animate-in slide-in-from-bottom-[10px] fade-in">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                <FileSignature size={28} />
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-3xl font-black text-slate-900">{metrics.total}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Documentos Gerados</span>
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
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Processamentos IA</span>
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

          {/* Listagem de Documentos */}
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <SectionTitle 
                title="Repositório Ativo" 
                subtitle="Todos os seus documentos blindados e contratos gerados."
              />
              <div className="relative group w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Pesquisar documento..." 
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {documents.length > 0 ? (
                documents.map((doc) => {
                  const isGenerating = doc.status === 'generating'
                  
                  return (
                    <Card key={doc.id} className={cn("transition-all border-slate-200 p-0 overflow-hidden group", isGenerating ? "opacity-90 bg-slate-50/50" : "hover:shadow-lg")}>
                      <div className="flex flex-col md:flex-row md:items-stretch">
                        {/* Left Icon Area */}
                        <div className="p-6 md:w-32 flex items-center justify-center bg-slate-100/50 border-r border-slate-200">
                          <div className={cn("w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-200 transition-all duration-500", isGenerating ? "text-blue-500 shadow-blue-500/10" : "text-primary group-hover:scale-110 group-hover:shadow-md")}>
                            {isGenerating ? <Clock size={28} className="animate-spin" /> : <Scale size={28} />}
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center gap-y-4">
                          {/* Top Header Row */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <StatusBadge status={isGenerating ? 'processing' : (doc.status as any)} />
                              {!isGenerating && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  <span className="w-1 h-1 rounded-full bg-slate-400 inline-block mr-1" /> Inteligência Jurídica
                                </span>
                              )}
                            </div>
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-500 text-right">
                              <Calendar size={14} className="text-slate-400" />
                              {new Date(doc.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          {/* Title and Description */}
                          <div className="space-y-1">
                            <h3 className={cn("text-xl font-black transition-colors leading-tight", isGenerating ? "text-slate-800" : "text-slate-900 group-hover:text-primary")}>
                              {doc.title}
                            </h3>
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                              {doc.document_type}
                            </p>
                          </div>

                          {/* Footer Info Area */}
                          {!isGenerating && (
                            <div className="flex items-center gap-6 mt-1 pt-4 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-1.5">
                                  {[1, 2, 3].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center">
                                      <Scale size={10} className="text-primary" />
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Documento Blindado</span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase">
                                <FileSignature size={12} className="text-amber-500 fill-amber-500" />
                                Pronto para Assinar
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Action Area */}
                        <div className="p-6 md:w-32 flex items-center justify-center bg-slate-100/50 border-l border-slate-200">
                          {isGenerating ? (
                            <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-400">
                              <Clock size={20} className="animate-spin" />
                            </div>
                          ) : (
                            <Link href={`/juridico/${doc.id}`}>
                              <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:border-primary group-hover:text-white group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                                <ChevronRight size={24} />
                              </div>
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })
              ) : (
                <EmptyState 
                  icon={FileText}
                  title="Nenhum documento gerado"
                  description="Seu repositório jurídico está em branco. Comece a blindar seu negócio gerando o primeiro contrato padrão ou análise."
                  actionText="Criar Primeiro Documento"
                  actionHref="/juridico/novo"
                />
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
