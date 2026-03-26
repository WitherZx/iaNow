'use client'

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { 
  Gavel, 
  PlusCircle, 
  Loader2, 
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  Scale,
  FileSignature,
  Sparkles,
  Search,
  Zap,
  ArrowRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { EmptyState } from '@/components/shared/EmptyState'
import { CTAButton } from '@/components/shared/CTAButton'
import { DocumentCard } from '@/components/shared/DocumentCard'
import { Card } from '@/components/shared/Card'
import { useOnboardingGuard } from '@/features/onboarding/hooks/useOnboardingGuard'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'

interface Demand {
  id: string
  tipo_acao: string | null
  status: 'draft' | 'ready' | 'filed'
  valor_causa: number
  created_at: string
}

export default function JusticaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [demands, setDemands] = useState<Demand[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'ready' | 'draft' | 'filed'>('all')
  const [loading, setLoading] = useState(true)
  const { needsOnboarding } = useOnboardingGuard()

  const handleNewProtocol = () => {
    if (needsOnboarding) {
      router.push('/onboarding?redirect=/justica/novo')
    } else {
      router.push('/justica/novo')
    }
  }

  useEffect(() => {
    async function loadDemands() {
      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: membership } = await supabase
          .from('memberships')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .single() as any

        if (!membership) return

        const { data, error } = await supabase
          .from('justice_demands')
          .select('*')
          .eq('organization_id', membership.organization_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (error) throw error
        setDemands(data || [])
      } catch (err) {
        console.error('Erro ao carregar demandas:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDemands()
  }, [supabase])

  const [metrics, setMetrics] = useState({
    total: 0,
    totalValue: 0,
    efficiency: '100%',
  })

  useEffect(() => {
    if (demands.length > 0) {
      const totalValue = demands.reduce((acc, d) => acc + (d.valor_causa || 0), 0)
      setMetrics({
        total: demands.length,
        totalValue,
        efficiency: '100%'
      })
    }
  }, [demands])

  const filteredDemands = demands.filter(d => {
    const matchesSearch = (d.tipo_acao || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || d.status === filter
    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status: Demand['status']) => {
    switch (status) {
      case 'draft':
        return { label: 'Rascunho', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Clock size={10} /> }
      case 'ready':
        return { label: 'Pronto', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <FileText size={10} /> }
      case 'filed':
        return { label: 'Protocolado', className: 'bg-primary/10 text-primary border-primary/20', icon: <CheckCircle2 size={10} /> }
      default:
        return { label: status, className: 'bg-slate-100 text-slate-600 border-slate-200', icon: <AlertCircle size={10} /> }
    }
  }

  return (
    <DashboardLayout>
      <PageContainer 
        title="PROCESSOS JUDICIAIS" 
        subtitle="Democratização do acesso à justiça para demandas de até 20 salários mínimos via JEC."
        action={
          <CTAButton icon={PlusCircle} onClick={handleNewProtocol} className="w-full lg:w-auto">
            Novo Processo
          </CTAButton>
        }
      >
        <div className="flex flex-col gap-y-8">
          
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group hover:border-primary/20 transition-all text-center animate-in slide-in-from-bottom-[10px] fade-in">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                <Scale size={28} />
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-3xl font-black text-slate-900">{metrics.total}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Processos Ativos</span>
              </div>
            </Card>
            
            <Card className="bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group hover:border-emerald-500/20 transition-all text-center animate-in slide-in-from-bottom-[10px] fade-in delay-100">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                <Gavel size={28} />
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-2xl font-black text-slate-900 overflow-hidden text-ellipsis whitespace-nowrap px-2">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metrics.totalValue)}
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Valor em Causa</span>
              </div>
            </Card>

            <Card className="bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group hover:border-blue-500/20 transition-all text-center animate-in slide-in-from-bottom-[10px] fade-in delay-200">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                <Zap size={28} />
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-3xl font-black text-slate-900">{metrics.efficiency}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Eficiência da IA</span>
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
                filter === 'all' && "w-[calc(25%-4px)] left-1 sm:w-[80px] sm:left-1",
                filter === 'draft' && "w-[calc(25%-4px)] left-[25%] sm:w-[94px] sm:left-[88px]",
                filter === 'ready' && "w-[calc(25%-4px)] left-[50%] sm:w-[94px] sm:left-[186px]",
                filter === 'filed' && "w-[calc(25%-4px)] left-[75%] sm:w-[104px] sm:left-[284px]"
              )}
            />
            
            <button onClick={() => setFilter('all')} className={cn("relative z-10 px-2 sm:px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-1/4 sm:w-[80px]", filter === 'all' ? 'text-primary' : 'text-slate-400 hover:text-slate-600')}>Todas</button>
            <button onClick={() => setFilter('draft')} className={cn("relative z-10 px-2 sm:px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-1/4 sm:w-[94px]", filter === 'draft' ? 'text-slate-600' : 'text-slate-400 hover:text-slate-600')}>Fila</button>
            <button onClick={() => setFilter('ready')} className={cn("relative z-10 px-2 sm:px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-1/4 sm:w-[94px]", filter === 'ready' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600')}>Prontas</button>
            <button onClick={() => setFilter('filed')} className={cn("relative z-10 px-2 sm:px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300 w-1/4 sm:w-[104px]", filter === 'filed' ? 'text-primary' : 'text-slate-400 hover:text-slate-600')}>Protocolo</button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar processo..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-full w-full items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredDemands.length === 0 ? (
          <div className="mt-8">
            <EmptyState 
              icon={Gavel}
              title="Nenhuma demanda encontrada"
              description={searchTerm || filter !== 'all' ? "Tente ajustar seus filtros de busca." : "Você ainda não iniciou nenhum protocolo via Jus Postulandi."}
              actionText="Iniciar Primeiro Caso"
              onClick={handleNewProtocol}
              className="mt-8"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredDemands.map((demand) => {
              const badge = getStatusBadge(demand.status)
              const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(demand.valor_causa)
              
              return (
                <DocumentCard
                  key={demand.id}
                  id={demand.id}
                  href={`/justica/${demand.id}`}
                  title={demand.tipo_acao || 'Ação não classificada'}
                  subtitle={`Valor da Causa: ${valorFormatado}`}
                  date={new Date(demand.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  isGenerating={false}
                  icon={<Scale size={22} />}
                  moduleLabel="Inteligência Jurídica"
                  badge={badge}
                  footerTags={[
                    {
                      icon: <div className="flex -space-x-1.5 mr-1">{[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center"><Scale size={8} className="text-primary" /></div>)}</div>,
                      label: 'Processo Gratuito'
                    },
                    {
                      icon: <FileSignature size={11} className="text-primary/70" />,
                      label: 'Pronto para Protocolar'
                    }
                  ]}
                />
              )
            })}
          </div>
        )}
        </div>
        </div>

        {/* Linha 5: Cards Informativos - Padrão iaNow */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-emerald-50/50 border-emerald-100 p-6 rounded-3xl">
              <h4 className="text-emerald-800 font-black text-xs uppercase tracking-widest mb-2">Limite do JEC</h4>
              <p className="text-emerald-700/80 text-sm leading-relaxed">
                Você pode protocolar ações de até 20 salários mínimos sem advogado. Acima disso, será necessário acompanhamento profissional.
              </p>
           </Card>
           <Card className="bg-amber-50/50 border-amber-100 p-6 rounded-3xl">
              <h4 className="text-amber-800 font-black text-xs uppercase tracking-widest mb-2">Justiça Gratuita</h4>
              <p className="text-amber-700/80 text-sm leading-relaxed">
                No primeiro grau dos Juizados Especiais, não há cobrança de custas processuais ou honorários para ingressar com a ação.
              </p>
           </Card>
           <Card className="bg-blue-50/50 border-blue-100 p-6 rounded-3xl">
              <h4 className="text-blue-800 font-black text-xs uppercase tracking-widest mb-2">Documentação</h4>
              <p className="text-blue-700/80 text-sm leading-relaxed">
                Tenha em mãos CPF/CNPJ, comprovante de endereço e todas as provas (conversas, prints, notas fiscais) organizadas.
              </p>
           </Card>
        </div>

        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
