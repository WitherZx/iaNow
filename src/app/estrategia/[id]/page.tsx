'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { markDeleted } from '@/lib/optimistic/optimisticRegistry'
import { supabase } from '@/lib/supabase/client'
import { deleteStrategyAction } from '@/app/actions/strategy-actions'
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
  RotateCcw,
  AlertTriangle
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
import { db } from '@/lib/storage/db'
import { conflictStore } from '@/lib/conflict/conflictStore'

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
  const queryClient = useQueryClient()
  const initialCache = typeof window !== 'undefined' 
    ? queryClient.getQueryData<any[]>(['strategies'])?.find((s: any) => s.id === id) || null
    : null
    
  const [strategy, setStrategy] = useState<any>(initialCache)
  // If we have initialCache, we skip the blocking loader!
  const [loading, setLoading] = useState(!initialCache)
  const [refining, setRefining] = useState(false)
  const [refinePrompt, setRefinePrompt] = useState('')
  const [showPaywall, setShowPaywall] = useState(false)
  const [configParams, setConfigParams] = useState({ isTestMode: false })

  const [versions, setVersions] = useState<any[]>([])
  const [viewingVersion, setViewingVersion] = useState<any>(null)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  const [isConflictLocked, setIsConflictLocked] = useState(false)

  // Garantir que content seja um objeto válido para evitar TypeError
  // Definindo no topo para respeitar as Regras de Hooks (sempre antes de condicionais e useEffects)
  const content = useMemo(() => {
    const rawContent = strategy?.content
    
    // Se não temos o objeto content ainda, tentamos usar o que veio do cache da lista (flat structure)
    if (!rawContent) {
      return { 
        title: strategy?.title || 'Carregando...', 
        description: strategy?.description || '', 
        actionPlan: [] 
      }
    }

    if (typeof rawContent === 'string') {
      try { return JSON.parse(rawContent) } catch (e) { return { title: strategy?.title || 'Erro no conteúdo', description: strategy?.description || '', actionPlan: [] } }
    }
    return rawContent
  }, [strategy?.content, strategy?.title, strategy?.description])

  // Monitora conflitos pendentes para esta entidade específicos (Fase 5)
  useEffect(() => {
    if (!id) return
    const unsubscribe = conflictStore.subscribe(() => {
      setIsConflictLocked(conflictStore.has(id as string))
    })
    return () => { unsubscribe() }
  }, [id])

  useEffect(() => {
    async function loadAndCheck() {
      if (!id) return
      try {
        const { getStrategyAction } = await import('@/app/actions/strategy-actions')
        const { data, config, error } = await getStrategyAction(id as string)

        if (error || !data) throw new Error(error || 'Estratégia não encontrada')

        setStrategy(data)
        if (config) setConfigParams(config)

        // 1. All Access check (Server-side verified)
        if (config?.isAllAccess) {
          setShowPaywall(false)
          return
        }

        // 2. Individual Unlock Check
        let metadata = data.metadata || {}
        if (typeof metadata === 'string') {
          try { metadata = JSON.parse(metadata) } catch (e) { metadata = {} }
        }
        const isUnlocked = data.is_paid === true || metadata.unlocked === true

        if (isUnlocked) {
          setShowPaywall(false)
        } else {
          // 3. Fallback check for Pro Plan (Client side verification if server didn't set isAllAccess)
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            setShowPaywall(true)
            return
          }

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

              setShowPaywall(plan?.slug !== 'pro')
            } else {
              setShowPaywall(true)
            }
          }
        }
      } catch (err: any) {
        console.error('Error loading strategy:', err)
        toast.error(err.message || 'Ocorreu um erro ao carregar os dados.')
      } finally {
        setLoading(false)
      }
    }

    loadAndCheck()
  }, [id])

  const loadVersions = async () => {
    try {
      setLoadingVersions(true)
      setLoadingVersions(true)
      const { getDocumentVersionsAction } = await import('@/app/actions/version-actions')
      const res = await getDocumentVersionsAction(id as string, 'strategy')
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
      const response = await fetch('/api/ai/strategy/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          strategyId: id as string, 
          prompt: refinePrompt
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
      const { updateStrategyAction } = await import('@/app/actions/strategy-actions')
      const res = await updateStrategyAction(id as string, newContent)
      
      if (res.error) throw new Error(res.error)

      setViewingVersion(null) // Fork: volta para versão atual ao editar
      loadVersions()

      toast.success('Alteração salva!', { id: toastId })
    } catch (err: any) {
      console.error('Erro de rede ao salvar, tentando salvar localmente:', err)
      
      let enqueueSuccess = false

      // 1. OUTBOX: Tenta enfileirar primeiro para manter a consistência otimista
      try {
        await db.enqueue({
          clientMutationId: crypto.randomUUID(),
          entityId: id as string,
          action: 'updateStrategy',
          payload: { id: id as string, content: newContent },
        })
        enqueueSuccess = true
        toast.info('Alteração salva localmente. Será sincronizada automaticamente.', { id: toastId })
      } catch (outboxErr) {
        console.error('Falha crítica ao gravar no disco local:', outboxErr)
        toast.error('Ocorreu um erro ao salvar: ' + err.message, { id: toastId })
      }

      // 2. ROLLBACK CONDICIONAL: Só reverte a UI se a ação foi perdida inteiramente
      if (!enqueueSuccess) {
        const originalContent = { ...strategy.content }
        setStrategy({ ...strategy, content: originalContent })
      }
    }
  }

  const handleDelete = async () => {
    if (!id || !window.confirm('Tem certeza que deseja deletar este documento permanentemente?')) return
    
    try {
      const res = await deleteStrategyAction(id as string)
      
      if (res.error) throw new Error(res.error)

      // Marca como deletado localmente para evitar ghosting na lista principal
      markDeleted(id as string)

      // Invalida o cache da lista e do dashboard
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      
      toast.success('Estratégia excluída!')
      router.push('/estrategia')
    } catch (err: any) {
      console.error('Erro ao deletar:', err)
      toast.error(err.message || 'Erro ao deletar')
    }
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
            onUnlockSuccess={async () => {
              // 1. Atualiza estados locais imediatamente para remover o Paywall da tela
              setShowPaywall(false)
              setStrategy((prev: any) => prev ? { ...prev, metadata: { ...prev.metadata, unlocked: true } } : prev)
              
              // 2. Notifica o usuário
              toast.success('Acesso liberado com sucesso!')
              
              // 3. Recarrega os dados em background para garantir sincronia com o servidor sem F5
              const { getStrategyAction } = await import('@/app/actions/strategy-actions')
              const res = await getStrategyAction(id as string)
              if (res.data) {
                setStrategy(res.data)
              }
            }}
          />
        </div>
      </DashboardLayout>
    )
  }



  return (
    <DocumentAuditLayout
      backLink="/estrategia"
      actions={
        <DocumentActionBar
          onDelete={handleDelete}
          className="print:hidden"
        />
      }
      hero={
        <DocumentHero
          category="Estratégia"
          date={strategy.raw_created_at ? new Date(strategy.raw_created_at).toLocaleDateString('pt-BR') : (strategy.created_at || '...') }
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
            isLoading={refining || isConflictLocked}
          />

          {isConflictLocked && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-[11px] font-bold text-amber-800 uppercase leading-tight">
                Ações desativadas: Você tem um conflito de dados pendente para esta estratégia. Resolva-o para continuar.
              </p>
            </div>
          )}

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
                  "group flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-5 md:p-6 border rounded-[24px] md:rounded-2xl transition-all select-none cursor-pointer",
                  item.completed 
                    ? "bg-emerald-50/20 border-emerald-100/50" 
                    : "bg-white border-slate-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50/50"
                )}
              >
                <div className="flex items-center justify-between w-full md:w-auto md:flex-initial">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-bold text-sm md:text-lg transition-all",
                    item.completed
                      ? "bg-emerald-500 text-white" 
                      : "bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                  )}>
                    {item.completed ? <CheckCircle size={20} /> : (index + 1)}
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
