'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Plus
} from 'lucide-react'
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
        // Contracts (using metadata->partnerId)
        const { data: contracts } = await supabase
          .from('generated_documents')
          .select('*')
          .or(`metadata->>authorId.eq.${id},metadata->>defendantId.eq.${id},metadata->>partnerId.eq.${id}`)
          .order('created_at', { ascending: false }) as any

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
        const { data: protocols } = await supabase
          .from('justice_demands')
          .select('*')
          .or(`metadata->>authorId.eq.${id},metadata->>defendantId.eq.${id}`)
          .order('created_at', { ascending: false }) as any

        setItems({
          contracts: contracts || [],
          strategies: strategies || [],
          protocols: protocols || []
        })

      } catch (err) {
        console.error('Error loading partner detail:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, session, supabase, router])

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
              
              <div className="space-y-4">
                {items.contracts.length > 0 ? items.contracts.map((doc: any) => (
                  <Card key={doc.id} className="p-4 hover:border-primary/20 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 line-clamp-1">{doc.title || 'Contrato'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <ExternalLink size={14} className="text-slate-300" />
                    </div>
                  </Card>
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
              
              <div className="space-y-4">
                {items.strategies.length > 0 ? items.strategies.map((strat: any) => (
                  <Card key={strat.id} className="p-4 hover:border-emerald-500/20 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 line-clamp-1">{strat.name || 'Estratégia'}</p>
                        <p className="text-[10px] text-slate-500 font-medium capitalize">
                          {strat.category || 'Geral'}
                        </p>
                      </div>
                      <ExternalLink size={14} className="text-slate-300" />
                    </div>
                  </Card>
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
              
              <div className="space-y-4">
                {items.protocols.length > 0 ? items.protocols.map((proc: any) => (
                  <Card key={proc.id} className="p-4 hover:border-purple-500/20 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 line-clamp-1">{proc.title || 'Processo'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Protocolo: {proc.protocol_number || '---'}
                        </p>
                      </div>
                      <ExternalLink size={14} className="text-slate-300" />
                    </div>
                  </Card>
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
