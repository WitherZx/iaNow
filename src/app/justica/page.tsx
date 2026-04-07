'use client'

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { 
  Gavel, 
  PlusCircle, 
  Loader2, 
  CheckCircle2,
  Search,
  Scale,
  Zap,
  FileSignature,
  Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'
import { EmptyState } from '@/components/shared/EmptyState'
import { TrackProcessModal } from '@/components/justica/TrackProcessModal'
import { createJusticeDemandAction, getGuestJusticeDemandsAction } from '@/app/actions/justice-actions'
import { Button } from '@/components/shared/Button'
import { CTAButton } from '@/components/shared/CTAButton'
import { Card } from '@/components/shared/Card'
import { useOnboardingGuard } from '@/features/onboarding/hooks/useOnboardingGuard'
import { DocumentCard } from '@/components/shared/DocumentCard'
import { ModuleStatsSidebar } from '@/components/shared/ModuleStatsSidebar'

interface Demand {
  id: string
  tipo_acao: string | null
  status: 'draft' | 'ready' | 'filed' | 'timeout'
  valor_causa: number
  created_at: string
  metadata?: any
}

export default function JusticaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [demands, setDemands] = useState<Demand[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'ready' | 'generating'>('all')
  const [loading, setLoading] = useState(true)
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false)
  const { needsOnboarding } = useOnboardingGuard()

  const loadDemands = async () => {
    try {
      setLoading(true)
      const guestId = localStorage.getItem('ianow_guest_id')
      const { data: { session } } = await supabase.auth.getSession()
      
      let allDemands: any[] = []

      if (session) {
        const { data: membership } = await supabase
          .from('memberships')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .single() as any

        if (membership) {
          const { data: orgDemands } = await supabase
            .from('justice_demands')
            .select('*')
            .eq('organization_id', membership.organization_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
          
          if (orgDemands) allDemands = [...orgDemands]
        }
      }

      if (guestId) {
        const { data: guestDemands } = await getGuestJusticeDemandsAction(guestId)
        if (guestDemands) {
          const guestIds = new Set(allDemands.map(d => d.id))
          guestDemands.forEach((d: any) => {
            if (!guestIds.has(d.id)) {
              allDemands.push(d)
            }
          })
        }
      }

      allDemands.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setDemands(allDemands)
    } catch (err) {
      console.error('Erro ao carregar demandas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDemands()
  }, [])

  const handleNewProtocol = () => {
    if (needsOnboarding) {
      router.push('/onboarding?redirect=/justica/novo')
    } else {
      router.push('/justica/novo')
    }
  }

  const handleTrackProcess = async (processNumber: string) => {
    const guestId = !localStorage.getItem('sb-auth-token') 
      ? (localStorage.getItem('ianow_guest_id') || crypto.randomUUID()) 
      : null
    
    if (guestId && !localStorage.getItem('ianow_guest_id')) {
      localStorage.setItem('ianow_guest_id', guestId)
    }

    const { data: newDemand, error } = await createJusticeDemandAction({
      status: 'ready',
      tipo_acao: 'Acompanhamento Externo',
      metadata: {
        process_number: processNumber,
        description: 'Processo adicionado para acompanhamento de movimentações.',
        is_external: true,
        guest_id: guestId
      }
    })

    if (error) throw new Error(error)
    router.push(`/justica/${newDemand.id}`)
  }

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
    
    let matchesFilter = filter === 'all'
    if (filter === 'generating') matchesFilter = d.status === 'draft'
    if (filter === 'ready') matchesFilter = d.status === 'ready' || d.status === 'filed'
    
    return matchesSearch && matchesFilter
  })

  return (
    <DashboardLayout>
      <PageContainer>
        {/* Mobile Title & Subtitle */}
        <div className="flex lg:hidden flex-col gap-y-1.5 items-center w-full text-center mb-8">
          <h1 className="font-montserrat font-bold text-2xl md:text-[26px] text-[#171717] m-0 uppercase leading-tight w-full">
            PROCESSOS JUDICIAIS
          </h1>
          <p className="font-montserrat font-normal text-sm text-[#737373] m-0 max-w-2xl leading-relaxed mx-auto">
            Democratização do acesso à justiça para demandas de até 20 salários mínimos via JEC.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <ModuleStatsSidebar 
            stats={[
              { label: 'Processos Ativos', value: metrics.total, icon: <Scale size={28} />, color: 'primary' },
              { label: 'Valor em Causa', value: `R$ ${metrics.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, icon: <Gavel size={28} />, color: 'emerald' },
              { label: 'Eficiência da IA', value: metrics.efficiency, icon: <Zap size={28} fill="currentColor" />, color: 'blue' }
            ]}
            action={
              <div className="flex flex-col gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setIsTrackModalOpen(true)}
                  className="h-12 px-6 rounded-2xl border-slate-200 bg-white text-slate-700 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group w-full"
                >
                  <Search size={16} className="text-primary group-hover:scale-110 transition-transform" />
                  Acompanhar Processo
                </Button>
                <CTAButton icon={PlusCircle} onClick={handleNewProtocol} className="!w-full w-full shadow-xl shadow-primary/20">
                  Novo Processo
                </CTAButton>
              </div>
            }
          />

          <div className="flex-1 flex flex-col gap-y-8 w-full min-w-0">
            
            {/* Desktop Title & Subtitle */}
            <div className="hidden lg:flex flex-col gap-y-1.5 items-start w-full text-left">
              <h1 className="font-montserrat font-bold text-2xl md:text-[26px] text-[#171717] m-0 uppercase leading-tight w-full">
                PROCESSOS JUDICIAIS
              </h1>
              <p className="font-montserrat font-normal text-sm text-[#737373] m-0 max-w-2xl leading-relaxed mx-0">
                Democratização do acesso à justiça para demandas de até 20 salários mínimos via JEC.
              </p>
            </div>

            <div className="flex flex-col space-y-8">
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
                    placeholder="Buscar processo..." 
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-slate-700 placeholder:text-slate-400" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin opacity-20" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">Escaneando Tribunal...</p>
                </div>
              ) : filteredDemands.length > 0 ? (
                filteredDemands.map((demand) => (
                  <DocumentCard
                    key={demand.id}
                    id={demand.id}
                    href={`/justica/${demand.id}`}
                    title={demand.tipo_acao || 'Acompanhamento Estratégico'}
                    subtitle={demand.valor_causa ? `Valor da Causa: R$ ${demand.valor_causa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : (demand.metadata?.process_number ? `Processo nº ${demand.metadata.process_number}` : 'Valor não informado')}
                    date={new Date(demand.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    isGenerating={demand.status === 'draft'}
                    badge={{
                      label: demand.status === 'draft' ? 'Analisando' : 'Pronto',
                      className: demand.status === 'draft' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }}
                    moduleLabel="MINERVA • JUSTIÇA GRATUITA"
                    icon={<Scale size={22} />}
                    generatingIcon={<Clock size={16} className="animate-spin text-primary" />}
                    footerTags={[
                      { icon: <CheckCircle2 size={11} className="text-emerald-500" />, label: 'Processo Gratuito' }, 
                      { icon: <FileSignature size={11} className="text-slate-400" />, label: 'Pronto para Protocolar' }
                    ]}
                  />
                ))
              ) : (
                <EmptyState 
                  icon={Gavel} 
                  title="Sua Prateleira de Justiça está Vazia" 
                  description="Você ainda não gerou petições ou iniciou o acompanhamento de processos." 
                  actionText="Iniciar Novo Caso" 
                  onClick={handleNewProtocol} 
                />
              )}
            </div>

            {/* Cards Informativos - Padrão iaNow */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-primary/5 border-primary/10 p-6 rounded-3xl">
                  <h4 className="text-primary font-black text-xs uppercase tracking-widest mb-2">Segurança Processual</h4>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Nossas petições são fundamentadas em jurisprudência atualizada, garantindo que sua demanda seja técnica e precisa.
                  </p>
              </Card>
              <Card className="bg-amber-50/50 border-amber-100 p-6 rounded-3xl">
                  <h4 className="text-amber-800 font-black text-xs uppercase tracking-widest mb-2">Acesso Facilitado</h4>
                  <p className="text-amber-700/80 text-sm leading-relaxed font-medium">
                    Focado no Juizado Especial Cível (JEC), sem a necessidade inicial de advogados para causas abaixo de 20 salários mínimos.
                  </p>
              </Card>
              <Card className="bg-emerald-50/50 border-emerald-100 p-6 rounded-3xl">
                  <h4 className="text-emerald-800 font-black text-xs uppercase tracking-widest mb-2">Acompanhamento Inteligente</h4>
                  <p className="text-emerald-700/80 text-sm leading-relaxed font-medium">
                    A Minerva monitora ativamente o processo através do número (CNJ), informando andamentos de forma clara.
                  </p>
              </Card>
            </div>
          </div>
        </div>
      </PageContainer>

      <TrackProcessModal 
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        onSuccess={handleTrackProcess}
      />
    </DashboardLayout>
  )
}
