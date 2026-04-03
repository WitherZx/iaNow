'use client'

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { 
  Gavel, 
  PlusCircle, 
  Loader2, 
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
  Scale,
  Zap,
  FileSignature,
  ArrowRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { EmptyState } from '@/components/shared/EmptyState'
import { CTAButton } from '@/components/shared/CTAButton'
import { Card } from '@/components/shared/Card'
import { useOnboardingGuard } from '@/features/onboarding/hooks/useOnboardingGuard'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'
import { Button } from '@/components/shared/Button'
import { TrackProcessModal } from '@/components/justica/TrackProcessModal'
import { createJusticeDemandAction, getGuestJusticeDemandsAction } from '@/app/actions/justice-actions'
import { DocumentCard } from '@/components/shared/DocumentCard'

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

      // 1. Buscas se estiver logado (pela organização)
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

      // 2. Buscas pelo Guest ID (Usando Server Action para contornar RLS)
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
      <PageContainer 
        title="PROCESSOS JUDICIAIS" 
        subtitle="Democratização do acesso à justiça para demandas de até 20 salários mínimos via JEC."
        action={
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Button 
              variant="outline"
              onClick={() => setIsTrackModalOpen(true)}
              className="h-12 px-6 rounded-2xl border-slate-200 bg-white text-slate-700 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group"
            >
              <Search size={16} className="text-primary group-hover:scale-110 transition-transform" />
              Acompanhar Processo
            </Button>
            <CTAButton icon={PlusCircle} onClick={handleNewProtocol} className="w-full lg:w-auto shadow-xl shadow-primary/20">
              Novo Processo
            </CTAButton>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-10 bg-white border-none shadow-sm flex flex-col items-center justify-center text-center gap-4 group hover:translate-y-[-4px] transition-all duration-300">
            <div className="w-16 h-16 rounded-[24px] bg-blue-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <Scale size={28} />
            </div>
            <div>
              <p className="text-4xl font-black text-slate-900 leading-none mb-2">{metrics.total}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Processos Ativos</p>
            </div>
          </Card>

          <Card className="p-10 bg-white border-none shadow-sm flex flex-col items-center justify-center text-center gap-4 group hover:translate-y-[-4px] transition-all duration-300">
            <div className="w-16 h-16 rounded-[24px] bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
              <Gavel size={28} />
            </div>
            <div>
              <p className="text-4xl font-black text-slate-900 leading-none mb-2">
                R$ {metrics.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Valor em Causa</p>
            </div>
          </Card>

          <Card className="p-10 bg-white border-none shadow-sm flex flex-col items-center justify-center text-center gap-4 group hover:translate-y-[-4px] transition-all duration-300">
            <div className="w-16 h-16 rounded-[24px] bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
              <Zap size={28} fill="currentColor" />
            </div>
            <div>
              <p className="text-4xl font-black text-slate-900 leading-none mb-2">{metrics.efficiency}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Eficiência da IA</p>
            </div>
          </Card>
        </div>

        <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 rounded-[24px] shadow-sm">
          <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-2xl w-fit">
            <button 
              onClick={() => setFilter('all')}
              className={cn(
                "px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >Todas</button>
            <button 
              onClick={() => setFilter('ready')}
              className={cn(
                "px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filter === 'ready' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >Prontas</button>
            <button 
              onClick={() => setFilter('generating')}
              className={cn(
                "px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filter === 'generating' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >Em Fila</button>
          </div>

          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Buscar processo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-600 placeholder:text-slate-300 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Escaneando Tribunal...</p>
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
                  label: demand.status === 'ready' || demand.status === 'filed' ? 'CONCLUÍDO' : 'GERANDO',
                  icon: demand.status === 'ready' || demand.status === 'filed' ? <CheckCircle2 size={10} /> : <Clock size={10} />,
                  className: demand.status === 'ready' || demand.status === 'filed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                }}
                moduleLabel="MINERVA • JUSTIÇA GRATUITA"
                icon={<Scale size={24} />}
                generatingIcon={<Loader2 size={24} className="animate-spin" />}
                footerTags={[
                  { icon: <CheckCircle2 size={12} className="text-emerald-500" />, label: 'Processo Gratuito' },
                  { icon: <FileSignature size={12} className="text-slate-400" />, label: 'Pronto para Protocolar' }
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
      </PageContainer>

      <TrackProcessModal 
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        onSuccess={handleTrackProcess}
      />
    </DashboardLayout>
  )
}
