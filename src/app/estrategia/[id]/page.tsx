'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { 
  TrendingUp,
  ShieldCheck,
  Rocket,
  Sparkles,
  CheckCircle,
  Layout,
  Zap,
  Loader2,
  History as HistoryIcon,
  Clock,
  CheckCircle2,
  RotateCcw
} from 'lucide-react'
import { Card } from "@/components/shared/Card"
import { Button } from "@/components/shared/Button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { cn } from "@/utils/cn"
import { toast } from 'sonner'
import { DocumentActionBar } from '@/components/shared/DocumentActionBar'
import { DocumentHero } from '@/components/shared/DocumentHero'
import { DocumentAuditLayout } from '@/components/shared/DocumentAuditLayout'
import { TechnicalReportCard } from '@/components/shared/TechnicalReportCard'
import { SidebarRefineSection } from '@/components/shared/SidebarRefineSection'
import { Paywall } from '@/components/shared/Paywall'

// Standard local components
const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase", className)}>
    {children}
  </span>
)

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-slate-200/60 rounded-xl", className)} />
)

export default function EstrategiaDetalhePage() {
  const { id } = useParams()
  const router = useRouter()
  const [strategy, setStrategy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refining, setRefining] = useState(false)
  const [refinePrompt, setRefinePrompt] = useState('')
  const [isGuest, setIsGuest] = useState(true)
  const [showPaywall, setShowPaywall] = useState(true)
  const [configParams, setConfigParams] = useState({ isTestMode: false })

  const [versions, setVersions] = useState<any[]>([])
  const [viewingVersion, setViewingVersion] = useState<any>(null)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)

  useEffect(() => {
    async function loadAndCheck() {
      if (!id) return
      try {
        setLoading(true)
        const guestId = localStorage.getItem('ianow_guest_id')

        // 1. Buscar a estratégia via Server Action (com suporte a Guest)
        const { getStrategyAction } = await import('@/app/actions/strategy-actions')
        const { data, config, error } = await getStrategyAction(id as string, guestId)

        if (error || !data) {
          // Fallback para API pública se houver erro
          const response = await fetch(`/api/strategy/public?id=${id as string}`)
          if (!response.ok) throw new Error('Falha ao carregar estratégia')
          
          let fallbackData = null
          try {
            fallbackData = await response.json()
          } catch (jsonErr) {
            console.error('JSON parsing error:', jsonErr)
            throw new Error('Falha de formato na resposta')
          }
          
          setStrategy(fallbackData)
          setLoading(false)
          return
        }

        setStrategy(data)
        // Sincroniza o isTestMode vindo da Action (App Configs)
        if (config && typeof config.isTestMode !== 'undefined') {
          setConfigParams({ isTestMode: config.isTestMode })
        }

        // --- Lógica de Paywall & Auth ---
        const { data: { session } } = await supabase.auth.getSession()
        const isGuestDoc = data.metadata?.guest_id === guestId
        const isUnlocked = data.metadata?.unlocked === true

        // 0. Se for isAllAccess, bypass do paywall
        if (config?.isAllAccess) {
          setShowPaywall(false)
          setIsGuest(!session)
        }
        // 1. Se estiver desbloqueado explicitamente (avulso), libera
        else if (isUnlocked) {
          setShowPaywall(false)
          setIsGuest(false)
        } 
        // 2. Se for Guest e não estiver desbloqueado, bloqueia
        else if (isGuestDoc && !session) {
          setShowPaywall(true)
          setIsGuest(true)
        }
        // 3. Se estiver logado, verifica plano Pro
        else if (session) {
          setIsGuest(false)
          const { data: membership } = await supabase
            .from('memberships')
            .select('organization_id')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .maybeSingle()

          if (!membership) {
            setShowPaywall(true)
          } else {
            const { data: org } = await supabase
              .from('organizations')
              .select('plan_id')
              .eq('id', membership.organization_id)
              .single()

            if (org?.plan_id) {
              const { data: plan } = await supabase
                .from('plans')
                .select('slug')
                .eq('id', org.plan_id)
                .maybeSingle()

              if (plan?.slug === 'pro') {
                setShowPaywall(false)
              } else {
                setShowPaywall(true)
              }
            } else {
              setShowPaywall(true)
            }
          }
        } else {
          setShowPaywall(true)
        }
      } catch (err) {
        console.error('Error loading strategy:', err)
        toast.error('Ocorreu um erro ao carregar os dados.')
      } finally {
        setLoading(false)
      }
    }

    loadAndCheck()
  }, [id])

  const loadVersions = async () => {
    try {
      setLoadingVersions(true)
      const guestId = localStorage.getItem('ianow_guest_id')
      const { getDocumentVersionsAction } = await import('@/app/actions/version-actions')
      const res = await getDocumentVersionsAction(id as string, 'strategy', guestId)
      if (res.success) setVersions(res.data)
    } catch (err) {
      console.error('Erro ao carregar versões:', err)
    } finally {
      setLoadingVersions(false)
    }
  }

  const handleSelectVersion = async (v: any) => {
    if (!v) {
      setViewingVersion(null)
      setStrategy({ ...strategy, content: strategy.content }) // Trigger re-render with original
      return
    }
    try {
      setLoading(true)
      const { getVersionContentAction } = await import('@/app/actions/version-actions')
      const res = await getVersionContentAction(v.id)
      if (res.success) {
        setViewingVersion(v)
        setStrategy({ ...strategy, content: res.data })
        toast.info(`Visualizando versão de ${new Date(v.created_at).toLocaleString('pt-BR')}`)
      }
    } catch (err) {
      console.error('Erro ao carregar conteúdo da versão:', err)
    } finally {
      setLoading(false)
      setShowHistoryDropdown(false)
    }
  }

  const handleRefine = async () => {
    if (!refinePrompt.trim() || refining) return
    setRefining(true)
    try {
      const guestId = localStorage.getItem('ianow_guest_id')
      const response = await fetch('/api/ai/strategy/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          strategyId: id as string, 
          prompt: refinePrompt,
          guestId
        })
      })
      const data = await response.json()
      if (data.success) {
        setStrategy({ ...strategy, content: data.content })
        setRefinePrompt('')
        setViewingVersion(null) // Fork concluído
        loadVersions() // Atualiza lista
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Erro ao refinar estratégia:', err)
    } finally {
      setRefining(false)
    }
  }

  const toggleTask = async (taskIndex: number) => {
    if (refining) return
    
    const toastId = toast.loading('Sincronizando...')
    
    // Optimistic update
    const newContent = { ...strategy.content }
    const updatedActionPlan = [...newContent.actionPlan]
    updatedActionPlan[taskIndex] = {
      ...updatedActionPlan[taskIndex],
      completed: !updatedActionPlan[taskIndex].completed
    }
    newContent.actionPlan = updatedActionPlan
    
    // UI Update
    setStrategy({ ...strategy, content: newContent })

    try {
      const guestId = localStorage.getItem('ianow_guest_id')
      const { updateStrategyAction } = await import('@/app/actions/strategy-actions')
      const res = await updateStrategyAction(id as string, newContent, guestId)
      
      if (res.error) throw new Error(res.error)

      setViewingVersion(null) // Fork: volta para versão atual ao editar
      loadVersions()

      toast.success('Alteração salva!', { id: toastId })
    } catch (err: any) {
      console.error('Erro ao salvar:', err)
      toast.error('Erro ao salvar: ' + err.message, { id: toastId })
      
      // Rollback UI
      const originalContent = { ...strategy.content }
      setStrategy({ ...strategy, content: originalContent })
    }
  }

  const handleDelete = async () => {
    if (!id || !window.confirm('Tem certeza que deseja deletar este documento permanentemente?')) return
    
    try {
      const guestId = localStorage.getItem('ianow_guest_id')
      const { deleteStrategyAction } = await import('@/app/actions/strategy-actions')
      const res = await deleteStrategyAction(id as string, guestId)
      
      if (res.error) throw new Error(res.error)

      toast.success('Estratégia excluída!')
      router.push('/estrategia')
    } catch (err: any) {
      console.error('Erro ao deletar:', err)
      toast.error(err.message || 'Erro ao deletar')
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <PageContainer>
          <div className="space-y-8">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-[200px] w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="lg:col-span-2 h-[400px]" />
              <Skeleton className="h-[400px]" />
            </div>
          </div>
        </PageContainer>
      </DashboardLayout>
    )
  }

  if (!strategy) {
    return (
      <DashboardLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Layout className="w-12 h-12 text-slate-200 mb-4" />
            <h1 className="text-xl font-bold mb-2">Plano não encontrado</h1>
            <Button variant="outline" onClick={() => router.push('/estrategia')}>Voltar</Button>
          </div>
        </PageContainer>
      </DashboardLayout>
    )
  }

  if (showPaywall) {
    return (
      <DashboardLayout>
        <div className="relative h-[calc(100vh-64px)] overflow-hidden bg-slate-100">
          <Paywall
            demandId={id as string}
            type="estrategia"
            fullscreen
            isTestMode={configParams.isTestMode}
            onBack={() => router.back()}
            onUnlockSuccess={() => {
              setShowPaywall(false)
              setTimeout(() => window.location.reload(), 1500)
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  const { content } = strategy

  return (
    <DocumentAuditLayout
      backLink="/estrategia"
      actions={
        <DocumentActionBar
          onDelete={handleDelete}
          className="print:hidden"
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
                <HistoryIcon size={18} />
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
          category="Estratégia"
          date={new Date(strategy.created_at).toLocaleDateString('pt-BR')}
          title={content.title}
          description={content.description}
        />
      }
      sidebar={
        <>
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1 text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" /> Métricas de Execução
            </div>
            <Card className="rounded-3xl border-slate-100 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Geral</span>
                <StatusBadge status={strategy.status} />
              </div>
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Progresso</span>
                <span className="text-sm font-black text-slate-900">
                  {Math.round((content.actionPlan?.filter((i: any) => i.completed).length / content.actionPlan?.length) * 100) || 0}%
                </span>
              </div>
            </Card>
          </section>

          <SidebarRefineSection
            value={refinePrompt}
            onChange={setRefinePrompt}
            onSubmit={handleRefine}
            isLoading={refining}
          />

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-primary tracking-widest">
              <Sparkles className="w-4 h-4 fill-primary" /> AI Insights
            </div>
            {content.aiInsights?.map((item: any, index: number) => {
              const insightText = typeof item === 'string' ? item : item?.insight || ""
              return (
                <div key={index} className="p-6 bg-white border border-primary/10 rounded-2xl relative overflow-hidden group hover:shadow-md transition-all flex flex-col gap-y-2">
                  <Zap className="absolute -top-4 -right-4 w-12 h-12 text-primary opacity-[0.03]" />
                  <p className="relative z-10 text-xs text-slate-700 italic font-medium leading-relaxed">
                    "{insightText}"
                  </p>
                </div>
              )
            })}
          </div>

          <TechnicalReportCard aiModel={strategy.ai_model || 'Minerva'} createdAt={strategy.created_at} />
        </>
      }
    >
      <div className="flex flex-col gap-y-12">
        {viewingVersion && (
          <div className="flex items-center gap-2 px-6 py-3 bg-amber-500/10 border border-amber-500/20 rounded-3xl animate-pulse mb-0 justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-600" />
              <span className="text-[11px] font-black text-amber-700 uppercase tracking-widest">
                Visualizando Histórico: {new Date(viewingVersion.created_at).toLocaleString('pt-BR')}
              </span>
            </div>
            <button 
              onClick={() => handleSelectVersion(null)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 rounded-xl transition-all text-[10px] font-black uppercase tracking-tight"
              title="Voltar para versão atual"
            >
              <RotateCcw size={12} />
              Sair do Histórico
            </button>
          </div>
        )}
        {/* Pillars */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <h2 className="text-lg md:text-2xl font-bold text-slate-950 font-montserrat">Pilares Estratégicos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.pillars?.map((pillar: any, index: number) => (
              <Card key={index} className="rounded-2xl border-slate-100 hover:border-primary/20 transition-all" padding="none">
                <div className="p-6 h-full flex flex-col gap-y-4">
                  <Badge className={cn(
                    pillar.priority === 'Alta' ? "bg-rose-50 text-rose-600" : 
                    pillar.priority === 'Média' ? "bg-amber-50 text-amber-600" : 
                    "bg-blue-50 text-blue-600"
                  )}>
                    Prioridade {pillar.priority}
                  </Badge>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {pillar.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed flex-grow">
                    {pillar.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Action Plan */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Rocket className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
            <h2 className="text-lg md:text-2xl font-bold text-slate-950 font-montserrat">Plano de Ação</h2>
          </div>
          <div className="flex flex-col gap-y-4">
            {content.actionPlan?.map((item: any, index: number) => (
              <div 
                key={index} 
                onClick={() => toggleTask(index)}
                className={cn(
                  "group flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-5 md:p-6 border rounded-[24px] md:rounded-2xl transition-all select-none",
                  isGuest ? "cursor-default" : "cursor-pointer",
                  item.completed 
                    ? "bg-emerald-50/20 border-emerald-100/50" 
                    : cn(
                        "bg-white border-slate-100",
                        !isGuest && "hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50/50"
                      )
                )}
              >
                <div className="flex items-center justify-between w-full md:w-auto md:flex-initial">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-bold text-sm md:text-lg transition-all",
                    item.completed && !isGuest
                      ? "bg-emerald-500 text-white" 
                      : "bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                  )}>
                    {item.completed && !isGuest ? <CheckCircle size={20} /> : (index + 1)}
                  </div>
                </div>

                <div className="flex-grow space-y-1">
                  <h4 className={cn(
                    "text-base md:text-lg font-bold transition-all",
                    item.completed ? "text-slate-400 line-through" : "text-slate-900"
                  )}>
                    {item.task}
                  </h4>
                  <p className={cn(
                    "text-sm md:text-base font-medium leading-relaxed",
                    item.completed ? "text-slate-300" : "text-slate-500"
                  )}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DocumentAuditLayout>
  )
}
