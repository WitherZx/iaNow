'use client'

import React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { MetricCard } from '@/components/shared/MetricCard'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { Card } from '@/components/shared/Card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DashboardItemCard } from '@/components/shared/DashboardItemCard'
import { Button } from '@/components/shared/Button'
import { CTAButton } from '@/components/shared/CTAButton'
import { Lightbulb, Scale, Gavel, PlayCircle, Eye, Loader2, Play, ShieldCheck, PlusCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { ExecutionShield } from '@/components/dashboard/ExecutionShield'
import { MinervaAssistant } from '@/components/dashboard/MinervaAssistant'
import { cn } from '@/utils/cn'
import { getDashboardDataAction } from '@/app/actions/dashboard-actions'
import { WelcomeDashboard } from '@/components/dashboard/WelcomeDashboard'

// Tipagens para o Dashboard
interface Metric {
  label: string
  value: string | number
  icon: React.ReactNode
  change?: number
  accent?: boolean
}

interface DashboardItem {
  id: string
  title: string
  description: string
  status: string
  date: string
  rawDate: string
  href: string
}

export default function DashboardPage() {
  const { session } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'assistant' | 'traditional'>('traditional')
  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Visitante'

  const [data, setData] = useState<{
    metrics: Metric[]
    strategies: DashboardItem[]
    legalDocs: DashboardItem[]
    justiceDemands: DashboardItem[]
    insightsCount: number
  }>({
    metrics: [],
    strategies: [],
    legalDocs: [],
    justiceDemands: [],
    insightsCount: 0
  })

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        const guestId = typeof window !== 'undefined' ? localStorage.getItem('ianow_guest_id') : null
        
        console.log('[DashboardPage] Fetching unified data. Session:', !!session)
        
        // Busca unificada via Server Action (Bypassa RLS e Merges Guest/Org)
        const { data: dashboard, error } = await getDashboardDataAction(guestId, session?.user?.id)
        
        if (error) {
          console.error('[DashboardPage] Error:', error)
          return
        }

        const stats = dashboard || { strategies: [], legalDocs: [], justiceDemands: [] }

        // Mapeamento de Métricas
        const metrics = [
          { label: 'Estratégias Ativas', value: stats.strategies.filter((s: any) => s.status === 'active').length, icon: <Lightbulb size={22} />, change: undefined },
          { label: 'Documentos Jurídicos', value: stats.legalDocs.filter((d: any) => d.status === 'ready').length, icon: <Scale size={22} />, change: undefined },
          { label: 'Jus Postulandi', value: stats.justiceDemands.length, icon: <Gavel size={22} />, change: undefined },
        ]

        setData({
          metrics,
          strategies: (stats.strategies || []).slice(0, 4).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description || '',
            status: s.status === 'active' ? 'ready' : 'generating',
            date: new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
            rawDate: s.created_at,
            href: `/estrategia/${s.id}`
          })),
          legalDocs: (stats.legalDocs || []).slice(0, 4).map((d: any) => ({
            id: d.id,
            title: d.title || 'Documento jurídico',
            description: d.metadata?.description || 'Gerado via IA',
            status: d.status,
            date: new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
            rawDate: d.created_at,
            href: `/juridico/${d.id}`
          })),
          justiceDemands: (stats.justiceDemands || []).slice(0, 3).map((d: any) => ({
            id: d.id,
            title: d.tipo_acao || 'Ação não classificada',
            description: `Valor: ${(d.valor_causa || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
            status: d.status,
            date: new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
            rawDate: d.created_at,
            href: `/justica/${d.id}`
          })),
          insightsCount: stats.strategies.reduce((acc: number, curr: any) => acc + (curr.content?.aiInsights?.length || 0), 0)
        })
      } catch (err) {
        console.error('Erro ao carregar Dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [session])

  // Persistência simples da preferência de view
  useEffect(() => {
    const saved = localStorage.getItem('ianow_dashboard_view') as 'assistant' | 'traditional'
    if (saved) setViewMode(saved)
  }, [])

  const toggleView = () => {
    const newMode = viewMode === 'assistant' ? 'traditional' : 'assistant'
    setViewMode(newMode)
    localStorage.setItem('ianow_dashboard_view', newMode)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full w-full items-center justify-center min-h-[400px]" suppressHydrationWarning>
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  const { metrics, strategies: recentStrategies, legalDocs: recentDocs, justiceDemands: recentDemands } = data
  
  // Condição para mostrar Dashboard de Boas-vindas: 
  // Usuário que não gerou pelo menos 1 de cada item core
  const hasActivity = data.strategies.length > 0 && data.legalDocs.length > 0 && data.justiceDemands.length > 0

  const renderGhostCards = (count: number) => (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-primary/5 border-primary/10 grayscale-0 pointer-events-none border-dashed shadow-sm">
          <div className="flex flex-col gap-y-4">
            <div className="flex items-center justify-between">
              <div className="w-16 h-5 bg-primary/20 rounded animate-pulse" />
              <div className="w-12 h-3 bg-primary/10 rounded" />
            </div>
            <div className="w-3/4 h-5 bg-primary/20 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="w-full h-3 bg-primary/10 rounded" />
              <div className="w-5/6 h-3 bg-primary/10 rounded" />
            </div>
          </div>
        </Card>
      ))}
    </>
  )

  const renderItemCard = (item: DashboardItem, index: number, total: number) => {
    const isGenerating = item.status === 'generating' || item.status === 'processing'
    const isStale = isGenerating && (new Date().getTime() - new Date(item.rawDate).getTime() > 180000)
    
    // Lógica de span dinâmico
    let spanClass = "col-span-1"
    if (total === 1) spanClass = "col-span-1 md:col-span-2"
    if (total === 3 && index === 2) spanClass = "col-span-1 md:col-span-2"

    return (
      <DashboardItemCard
        key={item.id}
        id={item.id}
        title={item.title}
        description={item.description}
        status={item.status}
        date={item.date}
        href={item.href}
        isGenerating={isGenerating}
        isStale={isStale}
        className={spanClass}
      />
    )
  }

  const content = viewMode === 'traditional' ? (
    !hasActivity ? (
      <PageContainer>
        <WelcomeDashboard 
          userName={userName} 
          onActivateMinerva={() => setViewMode('assistant')} 
        />
      </PageContainer>
    ) : (
    <PageContainer
      title={
        <div className="flex flex-col gap-y-4 items-center lg:items-start text-center lg:text-left">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] px-3 py-1.5 bg-primary/5 rounded-full w-fit border border-primary/10 mx-auto lg:mx-0">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </div>
            Monitoramento Ativo
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-black text-slate-950 leading-[1.1] tracking-tight">
            Olá, <span className="text-primary">{userName}</span>.
          </h1>
        </div>
      }
      subtitle={
        <div className="flex flex-col gap-y-8 md:gap-y-12 items-center lg:items-start text-center lg:text-left">
          <p className="text-slate-500 text-lg md:text-2xl font-medium leading-relaxed m-0 max-w-2xl mx-auto lg:mx-0">
            Sua blindagem institucional está sendo monitorada em tempo real. Transformamos processos complexos em execução instantânea.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            {/* Card 1: Security */}
            <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center lg:justify-start gap-4 md:gap-5 hover:border-primary/20 hover:shadow-md transition-all group">
              <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <div className="flex flex-col gap-y-0.5 text-center lg:text-left">
                <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Status de Conformidade</span>
                <span className="text-base md:text-lg font-bold text-slate-900">Blindagem Ativa</span>
              </div>
            </div>

            {/* Card 2: AI Intelligence */}
            <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center lg:justify-start gap-4 md:gap-5 hover:border-primary/20 hover:shadow-md transition-all group">
              <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Lightbulb size={28} />
              </div>
              <div className="flex flex-col gap-y-0.5 text-center lg:text-left">
                <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">IA & Estratégia</span>
                <span className="text-base md:text-lg font-bold text-slate-900">{data.insightsCount} {data.insightsCount === 1 ? 'Insight Gerado' : 'Insights Gerados'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-8 w-full">
            <Link href="/estrategia" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 md:h-16 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] font-bold px-8 md:px-12 text-lg md:text-xl bg-primary hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 group mx-auto">
                <Play className="w-5 h-5 md:w-6 md:h-6 mr-3 fill-white group-hover:animate-pulse" /> Iniciar Execução
              </Button>
            </Link>

            <div className="flex flex-col items-center">
              <Button variant="ghost" onClick={toggleView} className="text-[11px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                <img src="/minerva-icon.png" alt="Minerva" className="w-5 h-5 object-contain" /> Experimentar Assistente Minerva
              </Button>
            </div>
          </div>
        </div>
      }
      action={
        <div className="relative shrink-0 flex justify-center lg:block lg:mr-8 scale-[0.7] sm:scale-85 lg:scale-[1.15] xl:scale-[1.25] transition-all hover:scale-[1.3] duration-500">
          <ExecutionShield />
        </div>
      }
    >
      <div className="space-y-12">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {metrics.map((metric, idx) => (
            <MetricCard
              key={idx}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              change={metric.change}
              changeLabel={metric.change ? "vs mês pass." : undefined}
              accent={metric.accent}
              className="animate-in fade-in slide-in-from-bottom duration-500"
              style={{ animationDelay: `${idx * 100}ms` } as React.CSSProperties}
            />
          ))}
        </div>

        <div className="w-full flex flex-col space-y-12">
          
          {/* Top Row: Estratégias and Documentos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Estratégias */}
            <div className="flex flex-col space-y-6">
              <SectionTitle
                title="Estratégia"
                subtitle="Últimos planos gerados"
                action={<Link href="/estrategia"><Button variant="link" className="text-primary font-bold px-0">Ver todas</Button></Link>}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentStrategies.length > 0 ? recentStrategies.map((item, idx) => renderItemCard(item, idx, recentStrategies.length)) : renderGhostCards(4)}
                {recentStrategies.length === 0 && (
                  <Card className="col-span-full py-6 text-center bg-primary/5 border-dashed border-primary/20">
                    <p className="text-sm text-slate-600 mb-3">Pronto para começar?</p>
                    <Link href="/estrategia"><Button size="sm" className="font-bold">Gerar Diagnóstico</Button></Link>
                  </Card>
                )}
              </div>
            </div>

            {/* Documentos */}
            <div className="flex flex-col space-y-6">
              <SectionTitle
                title="Contratos"
                subtitle="Contratos e ofícios recentes"
                action={<Link href="/juridico"><Button variant="link" className="text-primary font-bold px-0">Ver todos</Button></Link>}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentDocs.length > 0 ? recentDocs.map((item, idx) => renderItemCard(item, idx, recentDocs.length)) : renderGhostCards(4)}
                {recentDocs.length === 0 && (
                  <Card className="col-span-full py-6 text-center bg-primary/5 border-dashed border-primary/20">
                    <p className="text-sm text-slate-600 mb-3">Nenhum documento gerado.</p>
                    <Link href="/juridico/novo"><Button size="sm" className="font-bold">Criar Documento</Button></Link>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Jus Postulandi */}
          <div className="flex flex-col space-y-6 pt-4 border-t border-slate-100">
             <SectionTitle
                title="Processos"
                subtitle="Demandas protocoladas recentes"
                action={<Link href="/justica"><Button variant="link" className="text-primary font-bold px-0">Ver todas</Button></Link>}
             />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {recentDemands.length > 0 ? recentDemands.map((item, idx) => renderItemCard(item, idx, recentDemands.length)) : renderGhostCards(4)}
               {recentDemands.length === 0 && (
                 <Card className="col-span-full py-6 text-center bg-primary/5 border-dashed border-primary/20">
                   <p className="text-sm text-slate-600 mb-3">Nenhuma demanda ativa no momento.</p>
                   <Link href="/justica/novo"><Button size="sm" className="font-bold">Novo Protocolo</Button></Link>
                 </Card>
               )}
             </div>
          </div>

        </div>
      </div>
    </PageContainer>
    )
  ) : (
    <div className="-mx-6 -my-8 md:-mx-8 md:-my-10 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <MinervaAssistant userName={userName} onToggleView={toggleView} />
    </div>
  )

  return (
    <DashboardLayout>
      {content}
    </DashboardLayout>
  )
}
