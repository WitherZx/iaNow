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
  Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { EmptyState } from '@/components/shared/EmptyState'
import { CTAButton } from '@/components/shared/CTAButton'
import { DocumentCard } from '@/components/shared/DocumentCard'
import { Card } from '@/components/shared/Card'

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
        title="JUS POSTULANDI" 
        subtitle="Democratização do acesso à justiça para demandas de até 20 salários mínimos."
        action={
          <Link href="/justica/novo" className="w-full lg:w-auto">
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
