'use client'

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { 
  PlusCircle, 
  Lightbulb, 
  Target, 
  Zap, 
  ArrowRight, 
  Calendar,
  Clock,
  Sparkles,
  Search,
  Filter,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { cn } from '@/utils/cn'
import { EmptyState } from '@/components/shared/EmptyState'
import { CTAButton } from '@/components/shared/CTAButton'
import { DocumentCard } from '@/components/shared/DocumentCard'
import { useOnboardingGuard } from '@/features/onboarding/hooks/useOnboardingGuard'
import { useRouter } from 'next/navigation'

interface Strategy {
  id: string
  title: string
  description: string
  status: 'ready' | 'generating' | 'draft' | 'archived' | 'timeout'
  created_at: string
  raw_created_at: string
  version: number
  ai_model: string
}

export default function EstrategiaPage() {
  const router = useRouter()
  const { session } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [filter, setFilter] = useState<'all' | 'ready' | 'generating'>('all')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { needsOnboarding, isLoading: isLoadingOnboarding } = useOnboardingGuard()

  const handleNewStrategy = () => {
    if (needsOnboarding) {
      router.push('/onboarding?redirect=/estrategia/novo')
    } else {
      router.push('/estrategia/novo')
    }
  }

  useEffect(() => {
    async function fetchStrategies() {
      try {
        setLoading(true)
        const guestId = localStorage.getItem('ianow_guest_id')
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        const { getStrategiesAction } = await import('@/app/actions/strategy-actions')
        const { data: allStrats, error } = await getStrategiesAction(guestId, currentSession?.user?.id)

        if (error) throw new Error(error)
        
        setStrategies((allStrats || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          status: s.status === 'active' ? 'ready' : s.status === 'processing' ? 'generating' : s.status,
          created_at: new Date(s.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          raw_created_at: s.created_at,
          version: s.version || 1,
          ai_model: s.ai_model || 'Minerva'
        })))
      } catch (err) {
        console.error('Erro ao buscar estratégias:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStrategies()
  }, [session, supabase])

  const filteredStrategies = strategies.filter(s => {
    if (filter === 'all') return true
    return s.status === filter
  })

  return (
    <DashboardLayout>
      <PageContainer 
        title="CENTRAL DE ESTRATÉGIA" 
        subtitle="Gerencie seus planos de ação e diretrizes geradas por inteligência sistêmica."
        action={
          <CTAButton icon={PlusCircle} onClick={handleNewStrategy} className="w-full lg:w-auto">
            Novo Diagnóstico
          </CTAButton>
        }
      >
        <div className="flex flex-col gap-y-8">
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group hover:border-primary/20 transition-all text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                <Target size={28} />
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-3xl font-black text-slate-900">{strategies.length}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Planos Ativos</span>
              </div>
            </Card>
            
            <Card className="bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group hover:border-emerald-500/20 transition-all text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                <Zap size={28} />
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-3xl font-black text-slate-900">100%</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Eficiência da IA</span>
              </div>
            </Card>

            <Card className="bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group hover:border-blue-500/20 transition-all text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                <Sparkles size={28} />
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-3xl font-black text-slate-900">{strategies.length * 2}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Insights Gerados</span>
              </div>
            </Card>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 p-2 rounded-[22px] border border-slate-100 shadow-inner-sm">
            <div className="relative flex items-center p-1 bg-slate-100/50 rounded-2xl w-full sm:w-auto">
              {/* Active Pill Background */}
              <div 
                className={cn(
                  "absolute h-[34px] transition-all duration-300 ease-out bg-white rounded-xl shadow-sm border border-slate-200/50",
                  filter === 'all' && "w-[calc(33.33%-4px)] left-1 sm:w-[80px] sm:left-1",
                  filter === 'ready' && "w-[calc(33.33%-4px)] left-[33.33%] sm:w-[94px] sm:left-[88px]",
                  filter === 'generating' && "w-[calc(33.33%-4px)] left-[calc(66.66%+2px)] sm:w-[94px] sm:left-[186px]"
                )}
              />
              
              <button 
                onClick={() => setFilter('all')}
                className={cn(
                  "relative z-10 px-2 sm:px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-1/3 sm:w-[80px]",
                  filter === 'all' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                Todas
              </button>
              <button 
                onClick={() => setFilter('ready')}
                className={cn(
                  "relative z-10 px-2 sm:px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-1/3 sm:w-[94px]",
                  filter === 'ready' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                Prontas
              </button>
              <button 
                onClick={() => setFilter('generating')}
                className={cn(
                  "relative z-10 px-2 sm:px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-1/3 sm:w-[94px]",
                  filter === 'generating' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                Em Fila
              </button>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar estratégia..."
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Strategy List */}
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
                <Clock className="w-10 h-10 animate-spin text-primary/30" />
                <p className="font-medium">Sincronizando com a rede...</p>
              </div>
            ) : filteredStrategies.length > 0 ? (
              filteredStrategies.map((strategy) => {
                const isGenerating = strategy.status === 'generating'
                const isStale = isGenerating && (new Date().getTime() - new Date(strategy.raw_created_at).getTime() > 180000)
                const isReady = strategy.status === 'ready'
                
                return (
                  <DocumentCard
                    key={strategy.id}
                    id={strategy.id}
                    href={`/estrategia/${strategy.id}`}
                    title={strategy.title}
                    subtitle={strategy.description}
                    date={strategy.created_at}
                    isGenerating={isGenerating}
                    isTimeout={isStale}
                    icon={<Lightbulb size={22} />}
                    generatingIcon={<Clock size={16} className="animate-spin" />}
                    timeoutIcon={<AlertCircle size={22} />}
                    moduleLabel="Minerva · Inteligência Estratégica"
                    badge={{
                      label: isStale ? 'Timeout' : isGenerating ? 'Gerando' : isReady ? 'Pronto' : 'Falhou',
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
                        icon: <div className="flex -space-x-1.5 mr-1">{[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center"><Sparkles size={8} className="text-primary" /></div>)}</div>,
                        label: 'AI Intelligence'
                      },
                      {
                        icon: <Zap size={11} className="text-amber-500 fill-amber-500" />,
                        label: 'Execução Imediata'
                      }
                    ]}
                  />
                )
              })
            ) : (
              <EmptyState 
                icon={Lightbulb}
                title="Nenhuma estratégia gerada"
                description="Sua inteligência sistêmica ainda não possui dados suficientes para traçar um plano de ação. Comece seu primeiro diagnóstico agora."
                actionText="Gerar Primeiro Diagnóstico"
                onClick={handleNewStrategy}
              />
            )}
          </div>

        </div>

        {/* Linha 5: Cards Informativos - Padrão iaNow */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-primary/5 border-primary/10 p-6 rounded-3xl">
              <h4 className="text-primary font-black text-xs uppercase tracking-widest mb-2">Execução Imediata</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                Cada diagnóstico é acompanhado de um plano de ação tático projetado para implementação instantânea no seu negócio.
              </p>
           </Card>
           <Card className="bg-blue-50/50 border-blue-100 p-6 rounded-3xl">
              <h4 className="text-blue-800 font-black text-xs uppercase tracking-widest mb-2">Inteligência Sistêmica</h4>
              <p className="text-blue-700/80 text-sm leading-relaxed font-medium">
                Nossas análises cruzam dados de múltiplas fontes para identificar riscos invisíveis e oportunidades de crescimento.
              </p>
           </Card>
           <Card className="bg-amber-50/50 border-amber-100 p-6 rounded-3xl">
              <h4 className="text-amber-800 font-black text-xs uppercase tracking-widest mb-2">Refinamento Contínuo</h4>
              <p className="text-amber-700/80 text-sm leading-relaxed font-medium">
                As estratégias evoluem conforme você escala. Recomendamos um novo diagnóstico a cada mudança significativa de cenário.
              </p>
           </Card>
        </div>

      </PageContainer>
    </DashboardLayout>
  )
}
