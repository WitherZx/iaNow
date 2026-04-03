'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { 
  ArrowLeft, 
  CheckCircle2, 
  Zap, 
  TrendingUp,
  ShieldCheck,
  Rocket,
  Download,
  Share2,
  Sparkles,
  Clock,
  Layout,
  Send,
  CheckCircle,
  Trash2,
  Loader2
} from 'lucide-react'
import { Card } from "@/components/shared/Card"
import { Button } from "@/components/shared/Button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { cn } from "@/utils/cn"
import { toast } from 'sonner'
import { TechnicalReportCard } from '@/components/shared/TechnicalReportCard'
import { SidebarRefineSection } from '@/components/shared/SidebarRefineSection'
import { Paywall } from '@/components/shared/Paywall'
import { getMonthlyPaymentLink, getSinglePaymentLink } from '@/lib/monetization'

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

  useEffect(() => {
    console.log('Current Strategy State:', strategy)
  }, [strategy])

  useEffect(() => {
    async function loadAndCheck() {
      if (!id) return
      try {
        setLoading(true)
        const guestId = localStorage.getItem('ianow_guest_id')

        // 1. Buscar a estratégia via Server Action (com suporte a Guest)
        const { getStrategyAction } = await import('@/app/actions/strategy-actions')
        const { data, error } = await getStrategyAction(id as string, guestId)

        if (error || !data) {
          // Fallback para API pública se houver erro
          const response = await fetch(`/api/strategy/public?id=${id as string}`)
          if (!response.ok) throw new Error('Falha ao carregar estratégia')
          const fallbackData = await response.json()
          setStrategy(fallbackData)
          setLoading(false)
          return
        }

        setStrategy(data)

        // --- Lógica de Paywall & Auth ---
        const { data: { session } } = await supabase.auth.getSession()
        const isGuestDoc = data.metadata?.guest_id === guestId
        const isUnlocked = data.metadata?.unlocked === true

        // 1. Se estiver desbloqueado explicitamente (avulso), libera
        if (isUnlocked) {
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

  const handleRefine = async () => {
    if (!refinePrompt.trim() || refining || isGuest) return
    setRefining(true)
    try {
      const response = await fetch('/api/ai/strategy/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId: id as string, prompt: refinePrompt })
      })
      const data = await response.json()
      if (data.success) {
        setStrategy({ ...strategy, content: data.content })
        setRefinePrompt('')
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
    if (refining || isGuest) return
    
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
      const response = await fetch('/api/strategy/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id as string, content: newContent })
      })
      
      const resData = await response.json()
      
      if (!response.ok) {
        throw new Error(resData.error || 'Erro no servidor')
      }

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
    if (isGuest) return
    if (!confirm('Tem certeza que deseja deletar este plano permanentemente?')) return
    
    try {
      const response = await fetch('/api/strategy/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id as string })
      })
      const resData = await response.json()
      
      if (!response.ok) {
        throw new Error(resData.error || 'Erro no servidor')
      }

      toast.success('Plano deletado com sucesso')
      router.refresh()
      router.push('/estrategia')
    } catch (err) {
      console.error('Erro ao deletar:', err)
      toast.error('Erro ao deletar o plano')
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: strategy?.content.title,
        text: strategy?.content.description,
        url: window.location.href,
      }).catch(() => {
        navigator.clipboard.writeText(window.location.href)
        toast.success('Link copiado para a área de transferência!')
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado!')
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
            {!isGuest && (
              <Button variant="outline" onClick={() => router.push('/estrategia')}>Voltar</Button>
            )}
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
            onBack={() => router.back()}
            onUnlockSuccess={() => {
              localStorage.setItem(`ianow_unlock_estrategia_${id as string}`, 'true')
              setShowPaywall(false)
            }}
          />
        </div>
      </DashboardLayout>
    )
  }

  const { content } = strategy

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="flex flex-col gap-y-12 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-700">
          
          {/* Header */}
          <div className="flex items-center justify-between gap-3 print:hidden">
            {!isGuest ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 w-10 md:w-auto md:px-5 rounded-xl border-slate-200 bg-white text-slate-500 hover:text-slate-900 shadow-sm transition-all"
                onClick={() => router.push('/estrategia')}
              >
                <ArrowLeft className="w-5 h-5 md:mr-2 shrink-0" /> <span className="hidden md:inline">Voltar</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-primary font-black text-[10px] md:text-sm uppercase tracking-widest bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-100">
                <Sparkles className="w-4 h-4 fill-primary" /> iaNow <span className="hidden sm:inline">Strategic Plan</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleShare} 
                className="h-10 w-10 md:w-auto md:px-5 rounded-xl bg-primary text-white shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4 md:mr-2 shrink-0" /> 
                <span className="hidden md:inline">Compartilhar</span>
              </Button>
              {!isGuest && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-10 w-10 md:w-auto md:px-5 rounded-xl border-slate-200 bg-white text-rose-500 hover:bg-rose-50 shadow-sm hover:scale-105 active:scale-95 transition-all" 
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 md:mr-2 shrink-0" /> 
                  <span className="hidden md:inline">Deletar</span>
                </Button>
              )}
            </div>
          </div>

          {/* Hero - Reverting to Dark Style but with Standard Radius */}
          <div className="relative overflow-hidden bg-slate-900 rounded-[24px] md:rounded-[40px] p-6 md:p-12 text-white shadow-xl shadow-slate-200/50 print:hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/20 blur-[100px] pointer-events-none" />
            <div className="relative z-10 space-y-4 md:space-y-6">
              <div className="flex items-center gap-3">
                <StatusBadge status={strategy.status} className="bg-white/10 text-white border-white/10 text-[9px] md:text-sm" />
                <div className="flex items-center gap-2 text-white/40 text-[10px] md:text-xs font-bold uppercase">
                  <Clock className="w-3 md:w-3.5 h-3 md:h-3.5" />
                  {new Date(strategy.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div className="space-y-3 md:space-y-4">
                <h1 className="text-2xl md:text-5xl font-black tracking-tight leading-[1.1] font-montserrat">
                  {content.title}
                </h1>
                <p className="text-slate-400 text-sm md:text-xl leading-relaxed max-w-none w-full font-medium">
                  {content.description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start print:block relative">
            <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 transition-all duration-1000">
              {/* Left Column */}
              <div className="lg:col-span-8 flex flex-col gap-y-12 print:w-full">
                
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

                {/* Action Plan - High Visibility Interactive Checklist */}
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
                            "w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-sm md:text-lg transition-all",
                            item.completed && !isGuest
                              ? "bg-emerald-500 text-white" 
                              : "bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                          )}>
                            {item.completed && !isGuest ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" /> : (index + 1)}
                          </div>

                          {/* Right Checkbox - Only for owners, visible on mobile right of the number */}
                          {!isGuest && (
                            <div className={cn(
                              "w-8 h-8 md:w-10 md:h-10 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all md:hidden",
                              item.completed 
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                                : "border-slate-200 bg-white"
                            )}>
                              <CheckCircle2 className={cn(
                                "w-4 h-4 transition-all text-white",
                                item.completed ? "scale-100 opacity-100" : "scale-75 opacity-0"
                              )} />
                            </div>
                          )}
                        </div>

                        <div className="flex-grow space-y-2 w-full">
                          <h4 className={cn(
                            "text-base md:text-lg font-bold transition-all leading-tight",
                            item.completed ? "text-slate-400 line-through" : "text-slate-900"
                          )}>
                            {item.task}
                          </h4>
                          <div className={cn(
                            "flex items-center gap-2 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-lg w-fit transition-colors border",
                            item.completed ? "bg-slate-100 text-slate-400 border-transparent" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                          )}>
                            <TrendingUp className="w-3.5 h-3.5" />
                            Impacto: {item.impact}
                          </div>
                        </div>
                        
                        {/* Desktop Checkbox Column */}
                        {!isGuest && (
                          <div className={cn(
                            "hidden md:flex w-10 h-10 flex-shrink-0 rounded-full border-2 items-center justify-center transition-all",
                            item.completed 
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                              : "border-slate-200 bg-white group-hover:border-emerald-500"
                          )}>
                            <CheckCircle2 className={cn(
                              "w-5 h-5 transition-all text-white",
                              item.completed ? "scale-100 opacity-100" : "scale-75 opacity-0 group-hover:opacity-20 group-hover:scale-95"
                            )} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 flex flex-col gap-y-8 sticky top-24 print:hidden">
                
                {/* 1. AJUSTAR COM IA */}
                {!isGuest && (
                  <SidebarRefineSection
                    value={refinePrompt}
                    onChange={setRefinePrompt}
                    onSubmit={handleRefine}
                    isLoading={refining}
                    hint="Descreva o que deseja mudar ou adicionar ao plano."
                  />
                )}

                {/* 2. AI INSIGHTS (ANÁLISE) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-primary tracking-widest">
                    <Sparkles className="w-4 h-4 fill-primary" /> AI Intelligence
                  </div>
                  {content.aiInsights?.map((item: any, index: number) => {
                    const insightText = typeof item === 'string' ? item : item?.insight || JSON.stringify(item)
                    return (
                      <div key={index} className="p-8 bg-white border border-primary/10 rounded-2xl relative overflow-hidden group hover:shadow-md transition-all flex flex-col gap-y-3">
                        <Zap className="absolute -top-4 -right-4 w-16 h-16 text-primary opacity-[0.03]" />
                        <p className="relative z-10 text-slate-700 italic font-medium leading-relaxed">
                          "{insightText}"
                        </p>
                        {typeof item === 'object' && item?.impact && (
                           <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                             <TrendingUp className="w-3 h-3" /> Impacto: {item.impact}
                           </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <TechnicalReportCard aiModel={strategy.ai_model} createdAt={strategy.created_at} />

              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
