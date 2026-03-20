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
  ChevronRight
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { cn } from '@/utils/cn'
import { EmptyState } from '@/components/shared/EmptyState'
import { CTAButton } from '@/components/shared/CTAButton'

interface Strategy {
  id: string
  title: string
  description: string
  status: 'ready' | 'generating' | 'draft' | 'archived'
  created_at: string
  version: number
  ai_model: string
}

export default function EstrategiaPage() {
  const { session } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [filter, setFilter] = useState<'all' | 'ready' | 'generating'>('all')

  useEffect(() => {
    async function fetchStrategies() {
      if (!session?.user?.id) return

      try {
        setLoading(true)
        // Pegar a organização do usuário
        const { data: membershipData } = await supabase
          .from('memberships')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .limit(1)
          .single() as any

        if (membershipData) {
          const { data, error } = await supabase
            .from('strategies')
            .select('*')
            .eq('organization_id', membershipData.organization_id)
            .order('created_at', { ascending: false })
          
          if (data) {
            setStrategies((data as any[]).map(s => ({
              id: s.id,
              title: s.title,
              description: s.description,
              status: s.status === 'active' ? 'ready' : s.status === 'processing' ? 'generating' : s.status,
              created_at: new Date(s.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }),
              version: s.version || 1,
              ai_model: s.ai_model || 'gemini-2.0-flash'
            })))
          }
        }
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
          <Link href="/estrategia/novo">
            <CTAButton icon={PlusCircle}>
              Novo Diagnóstico
            </CTAButton>
          </Link>
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
            <div className="relative flex items-center p-1 bg-slate-100/50 rounded-2xl">
              {/* Active Pill Background */}
              <div 
                className={cn(
                  "absolute h-[34px] transition-all duration-300 ease-out bg-white rounded-xl shadow-sm border border-slate-200/50",
                  filter === 'all' && "w-[80px] left-1",
                  filter === 'ready' && "w-[94px] left-[88px]",
                  filter === 'generating' && "w-[94px] left-[186px]"
                )}
              />
              
              <button 
                onClick={() => setFilter('all')}
                className={cn(
                  "relative z-10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-[80px]",
                  filter === 'all' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                Todas
              </button>
              <button 
                onClick={() => setFilter('ready')}
                className={cn(
                  "relative z-10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-[94px]",
                  filter === 'ready' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                Prontas
              </button>
              <button 
                onClick={() => setFilter('generating')}
                className={cn(
                  "relative z-10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-[94px]",
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
                
                return (
                <Card key={strategy.id} className={cn("transition-all border-slate-200 p-0 overflow-hidden group", isGenerating ? "opacity-90 bg-slate-50/50" : "hover:shadow-lg")}>
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    {/* Left Icon Area - Increased Contrast */}
                    <div className="p-6 md:w-32 flex items-center justify-center bg-slate-100/50 border-r border-slate-200">
                      <div className={cn("w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-200 transition-all duration-500", isGenerating ? "text-blue-500 shadow-blue-500/10" : "text-primary group-hover:scale-110 group-hover:shadow-md")}>
                        {isGenerating ? <Clock size={28} className="animate-pulse" /> : <Lightbulb size={28} />}
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center gap-y-4">
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={strategy.status} />
                          {!isGenerating && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              <span className="w-1 h-1 rounded-full bg-slate-400 inline-block mr-1" /> {strategy.ai_model}
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-2 text-xs font-bold text-slate-500 text-right">
                          <Calendar size={14} className="text-slate-400" />
                          {strategy.created_at}
                        </span>
                      </div>

                      {/* Title and Description */}
                      <div className="space-y-1">
                        <h3 className={cn("text-xl font-black transition-colors leading-tight", isGenerating ? "text-slate-800" : "text-slate-900 group-hover:text-primary")}>
                          {strategy.title}
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 max-w-4xl">
                          {strategy.description}
                        </p>
                      </div>

                      {/* Footer Info Area */}
                      {!isGenerating && (
                        <div className="flex items-center gap-6 mt-1 pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                             <div className="flex -space-x-1.5">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center">
                                     <Sparkles size={10} className="text-primary" />
                                  </div>
                                ))}
                             </div>
                             <span className="text-[11px] font-bold text-slate-500 uppercase">AI Intelligence</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase">
                            <Zap size={12} className="text-amber-500 fill-amber-500" />
                            Execução Imediata
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Action Area - Increased Contrast */}
                    <div className="p-6 md:w-32 flex items-center justify-center bg-slate-100/50 border-l border-slate-200">
                      {isGenerating ? (
                        <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-400">
                          <Clock size={20} className="animate-spin" />
                        </div>
                      ) : (
                        <Link href={`/estrategia/${strategy.id}`}>
                          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:border-primary group-hover:text-white group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                            <ChevronRight size={24} />
                          </div>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              )})
            ) : (
              <EmptyState 
                icon={Lightbulb}
                title="Nenhuma estratégia gerada"
                description="Sua inteligência sistêmica ainda não possui dados suficientes para traçar um plano de ação. Comece seu primeiro diagnóstico agora."
                actionText="Gerar Primeiro Diagnóstico"
                actionHref="/estrategia/novo"
              />
            )}
          </div>

        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
