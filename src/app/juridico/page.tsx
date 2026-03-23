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
import { FileText, ShieldAlert, Scale, FileSignature, Loader2, Search, Clock, PlusCircle, Sparkles } from 'lucide-react'
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
  status: 'generating' | 'ready' | 'failed'
  created_at: string
}

export default function JuridicoPage() {
  const router = useRouter()
  const { session } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<LegalDocument[]>([])
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
      if (!session?.user?.id) return

      try {
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
        title="Central de Contratos"
        subtitle="Geração de contratos inteligentes, procurações automáticas e blindagem legal."
        action={
          <CTAButton icon={PlusCircle} onClick={handleNewDocument} className="w-full lg:w-auto">
             Novo Documento
          </CTAButton>
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
                title="Meus Contratos" 
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
                      icon={<Scale size={22} />}
                      generatingIcon={<Clock size={16} className="animate-spin" />}
                      moduleLabel="Inteligência Jurídica"
                      badge={{
                        label: isGenerating ? 'Gerando' : isReady ? 'Pronto' : 'Falhou',
                        className: isGenerating
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
                  title="Nenhum documento gerado"
                  description="Seu repositório jurídico está em branco. Comece a blindar seu negócio gerando o primeiro contrato padrão ou análise."
                  actionText="Criar Primeiro Documento"
                  onClick={handleNewDocument}
                />
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
