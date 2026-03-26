'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { 
  ArrowLeft, 
  FileText, 
  Gavel, 
  Target, 
  Loader2, 
  Building2, 
  User, 
  ExternalLink,
  Plus,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'

export default function PartnerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState<any>(null)
  const [items, setItems] = useState({
    contracts: [] as any[],
    strategies: [] as any[],
    protocols: [] as any[]
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id || !id) return
      
      try {
        setLoading(true)
        
        // 1. Fetch Partner (or Org if it's the Matriz)
        // Check if ID is a partner or organization
        const { data: partnerData } = await supabase
          .from('partners')
          .select('*')
          .eq('id', id)
          .maybeSingle() as any

        let finalPartner = partnerData
        
        if (!partnerData) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', id)
            .maybeSingle() as any
          
          if (orgData) {
            finalPartner = {
              ...orgData,
              isMatriz: true,
              type: (orgData.metadata as any)?.tipo || 'pj',
              document: (orgData.metadata as any)?.documento || ''
            }
          }
        } else {
            finalPartner = {
                ...partnerData,
                type: (partnerData.metadata as any)?.tipo || 'pj',
                document: (partnerData.metadata as any)?.documento || ''
            }
        }

        if (!finalPartner) {
          router.push('/parceiros')
          return
        }

        setPartner(finalPartner)

        // 2. Fetch Linked Items
        // Contracts (using metadata->partyA->id or metadata->partyB->id or metadata->partnerId)
        // If Matriz, show all organization's contracts
        const contractQuery = supabase.from('generated_documents').select('*')
        if (finalPartner.isMatriz) {
          contractQuery.eq('organization_id', id)
        } else {
          contractQuery.or(`metadata->partyA->>id.eq.${id},metadata->partyB->>id.eq.${id},metadata->>partnerId.eq.${id}`)
        }
        const { data: contracts } = await contractQuery.order('created_at', { ascending: false }) as any

        // Strategies (using metadata->partnerId)
        // If Matriz, show all organization's strategies
        const strategyQuery = supabase.from('strategies').select('*')
        if (finalPartner.isMatriz) {
          strategyQuery.eq('organization_id', id)
        } else {
          strategyQuery.or(`metadata->>partnerId.eq.${id}`)
        }
        const { data: strategies } = await strategyQuery.order('created_at', { ascending: false }) as any

        // Protocolos (justice_demands)
        // If Matriz, show all organization's demands
        const protocolQuery = supabase.from('justice_demands').select('*')
        if (finalPartner.isMatriz) {
            protocolQuery.eq('organization_id', id)
        } else {
            protocolQuery.or(`metadata->>authorId.eq.${id},metadata->>defendantId.eq.${id}`)
        }
        const { data: protocols } = await protocolQuery.order('created_at', { ascending: false }) as any

        setItems({
          contracts: (contracts || []).map((c: any) => ({ ...c, __table: 'generated_documents' })),
          strategies: (strategies || []).map((s: any) => ({ ...s, __table: 'strategies' })),
          protocols: (protocols || []).map((p: any) => ({ ...p, __table: 'justice_demands' }))
        })

      } catch (err) {
        console.error('Error loading partner detail:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, session, supabase, router])

  const handleRestore = async (item: any) => {
    try {
      const { error } = await (supabase.from(item.__table) as any)
        .update({ deleted_at: null })
        .eq('id', item.id)

      if (error) throw error

      toast.success('Item restaurado com sucesso!')
      
      // Refresh local state
      setItems(prev => ({
        contracts: prev.contracts.map(c => c.id === item.id ? { ...c, deleted_at: null } : c),
        strategies: prev.strategies.map(s => s.id === item.id ? { ...s, deleted_at: null } : s),
        protocols: prev.protocols.map(p => p.id === item.id ? { ...p, deleted_at: null } : p)
      }))
    } catch (err: any) {
      console.error('Error restoring item:', err)
      toast.error('Erro ao restaurar item: ' + err.message)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-slate-500 font-medium">Carregando itens vinculados...</p>
          </div>
        </PageContainer>
      </DashboardLayout>
    )
  }

  const renderDashboardItem = (item: any, href: string) => {
    const isDeleted = !!item.deleted_at

    return (
      <div key={item.id} className="relative group/card h-full w-full">
        <Link href={isDeleted ? '#' : href} className={cn("flex flex-col h-full w-full", isDeleted && "pointer-events-none opacity-60 grayscale-[0.5]")}>
          <Card padding="sm" className={cn("hover:border-primary/30 hover:shadow-md transition-all h-full min-h-[140px]", isDeleted ? "bg-slate-50 border-dashed border-slate-200" : "cursor-pointer group")}>
            <div className="flex flex-col gap-y-3 h-full">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border",
                  isDeleted ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                  {isDeleted ? 'Apagado' : 'Pronto'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                  {new Date(item.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h4 className={cn("font-bold text-sm transition-colors line-clamp-2 leading-tight", isDeleted ? "text-slate-400" : "text-slate-900 group-hover:text-primary")}>
                {item.title || item.name || item.tipo_acao || 'Execução'}
              </h4>
              <div className="flex-1 flex flex-col justify-end">
                <p className="text-[10px] text-slate-500 line-clamp-1 leading-relaxed font-medium">
                  {item.metadata?.description || item.category || (item.valor_causa ? `Valor: ${item.valor_causa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : 'Gerado via IA')}
                </p>
              </div>
            </div>
          </Card>
        </Link>
        
        {isDeleted && (
          <button
            onClick={() => handleRestore(item)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-orange-600 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-full border border-orange-200 shadow-lg hover:bg-orange-600 hover:text-white transition-all flex items-center gap-2 opacity-0 group-hover/card:opacity-100 scale-90 group-hover/card:scale-100 z-10"
          >
            <RotateCcw size={12} strokeWidth={3} /> Restaurar
          </button>
        )}
      </div>
    )
  }

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="flex flex-col gap-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => router.back()}
                className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-primary hover:border-primary/20 transition-all shadow-sm group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
                    {partner?.name}
                  </h1>
                  {partner?.isMatriz && (
                    <span className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-primary/20">
                      Matriz
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm font-medium">
                  {partner?.type === 'pj' ? 'CNPJ' : 'CPF'}: {partner?.document}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => router.push(`/juridico/novo?partnerId=${id}`)}
                className="rounded-xl h-12 px-6 bg-primary text-white font-bold"
              >
                <Plus size={18} className="mr-2" /> Novo Contrato
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* CONTRACTS */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Contratos</h3>
                <span className="ml-auto w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                  {items.contracts.length}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {items.contracts.length > 0 ? items.contracts.map((doc: any) => (
                  renderDashboardItem(doc, `/juridico/${doc.id}`)
                )) : (
                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum contrato</p>
                  </div>
                )}
              </div>
            </div>

            {/* STRATEGIES */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Target size={20} />
                </div>
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Estratégias</h3>
                <span className="ml-auto w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                  {items.strategies.length}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {items.strategies.length > 0 ? items.strategies.map((strat: any) => (
                   renderDashboardItem(strat, `/estrategia/${strat.id}`)
                )) : (
                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhuma estratégia</p>
                  </div>
                )}
              </div>
            </div>

            {/* PROCESSOS (JUSTICA) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Gavel size={20} />
                </div>
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Processos</h3>
                <span className="ml-auto w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                  {items.protocols.length}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {items.protocols.length > 0 ? items.protocols.map((proc: any) => (
                   renderDashboardItem(proc, `/justica/${proc.id}`)
                )) : (
                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum protocolo</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
