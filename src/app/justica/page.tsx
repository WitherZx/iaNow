'use client'

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/shared/Card'
import { 
  Gavel, 
  PlusCircle, 
  Loader2, 
  ChevronRight, 
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  Scale,
  Calendar,
  FileSignature
} from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { cn } from '@/utils/cn'
import { EmptyState } from '@/components/shared/EmptyState'
import { CTAButton } from '@/components/shared/CTAButton'

interface Demand {
  id: string
  tipo_acao: string | null
  status: 'draft' | 'ready' | 'filed'
  valor_causa: number
  created_at: string
}

export default function JusticaPage() {
  const supabase = createClient()
  const [demands, setDemands] = useState<Demand[]>([])
  const [loading, setLoading] = useState(true)

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

  const getStatusInfo = (status: Demand['status']) => {
    switch (status) {
      case 'draft':
        return { 
          label: 'Rascunho', 
          icon: <Clock size={10} />, 
          className: 'bg-slate-100 text-slate-600 border-slate-200' 
        }
      case 'ready':
        return { 
          label: 'Pronto', 
          icon: <FileText size={10} />, 
          className: 'bg-emerald-100 text-emerald-700 border-emerald-200' 
        }
      case 'filed':
        return { 
          label: 'Protocolado', 
          icon: <CheckCircle2 size={10} />, 
          className: 'bg-primary/10 text-primary border-primary/20' 
        }
      default:
        return { 
          label: status, 
          icon: <AlertCircle size={10} />, 
          className: 'bg-slate-100 text-slate-600 border-slate-200' 
        }
    }
  }

  return (
    <DashboardLayout>
      <PageContainer 
        title="JUS POSTULANDI" 
        subtitle="Democratização do acesso à justiça para demandas de até 20 salários mínimos."
        action={
          <Link href="/justica/novo">
            <CTAButton icon={PlusCircle}>
              Novo Protocolo
            </CTAButton>
          </Link>
        }
      >
        
        {loading ? (
          <div className="flex h-full w-full items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : demands.length === 0 ? (
          <div className="mt-8">
            <EmptyState 
              icon={Gavel}
              title="Nenhuma demanda ativa"
              description="Você ainda não iniciou nenhum protocolo via Jus Postulandi. Comece agora para resolver pequenos conflitos sem advogado."
              actionText="Iniciar Primeiro Caso"
              actionHref="/justica/novo"
              className="mt-8"
            />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4">
            {demands.map((demand) => {
              const statusInfo = getStatusInfo(demand.status)
              return (
                <Link key={demand.id} href={`/justica/${demand.id}`}>
                  <Card className="p-0 overflow-hidden hover:shadow-lg transition-all group border-slate-200 rounded-[32px]">
                    <div className="flex flex-col md:flex-row md:items-stretch">
                      {/* Left Icon Area Area */}
                      <div className="p-6 md:w-32 flex items-center justify-center bg-slate-100/50 border-r border-slate-200">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100 transition-all duration-500 text-primary group-hover:scale-110 group-hover:shadow-md">
                          <Scale size={28} />
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 p-6 md:p-8 flex flex-col justify-center gap-y-4">
                        {/* Top Header Row */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                              statusInfo.className
                            )}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              <span className="w-1 h-1 rounded-full bg-slate-400 inline-block mr-1" /> Inteligência Jurídica
                            </span>
                          </div>
                          <span className="flex items-center gap-2 text-xs font-bold text-slate-500 text-right">
                             <Calendar size={14} className="text-slate-400" />
                             {new Date(demand.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                             })}
                          </span>
                        </div>

                        {/* Title and Description */}
                        <div className="space-y-1">
                          <h4 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">
                            {demand.tipo_acao || 'Ação não classificada'}
                          </h4>
                          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                            Valor da Causa: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(demand.valor_causa)}
                          </p>
                        </div>

                        {/* Footer Info Area */}
                        <div className="flex items-center gap-6 mt-1 pt-4 border-t border-slate-100">
                           <div className="flex items-center gap-2">
                             <div className="flex -space-x-1.5">
                               {[1, 2, 3].map(i => (
                                 <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center">
                                   <Scale size={10} className="text-primary" />
                                 </div>
                               ))}
                             </div>
                             <span className="text-[11px] font-bold text-slate-500 uppercase">Processo Gratuito</span>
                           </div>
                           
                           <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase">
                             <FileSignature size={12} className="text-primary/70 fill-primary/10" />
                             Pronto para Protocolar
                           </div>
                        </div>
                      </div>

                      {/* Right Action Area */}
                      <div className="p-6 md:w-32 flex items-center justify-center bg-slate-100/50 border-l border-slate-200">
                        <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:border-primary group-hover:text-white group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                          <ChevronRight size={24} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {/* Informative section */}
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
      </PageContainer>
    </DashboardLayout>
  )
}
