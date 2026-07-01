'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PrefetchWrapper } from '@/components/shared/PrefetchWrapper'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  Users,
  Search,
  Plus,
  Filter,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Trash2,
  X
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { 
  createPartnerAction, 
  getPartnersAction, 
  updatePartnerAction,
  deletePartnerAction 
} from '../actions/partner-actions'
import { createClient } from '@/lib/supabase/client'

import { cn } from '@/utils/cn'
import { FormInput } from '@/components/shared/FormInput'
import { FormTextArea } from '@/components/shared/FormTextArea'
import { toast } from 'sonner'
import { useOnboardingGuard } from '@/features/onboarding/hooks/useOnboardingGuard'
import { useAppData } from '@/providers/AppDataProvider'
import { useRouter } from 'next/navigation'
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation'

export default function PartnerHubPage() {
  const { session, user } = useAuth()
  const router = useRouter()
  const { needsOnboarding, isLoading: guardLoading } = useOnboardingGuard()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'all' | 'pf' | 'pj'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const { org: currentOrg } = useAppData()
  const queryKey = ['partners', currentOrg?.id]

  const { data: qData, isLoading: loading, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) return { partners: [], orgInfo: null }

      let orgId = currentOrg?.id

      // 1. Fallback if org is not in AppData yet
      if (!orgId) {
        const { data: membership } = await supabase
          .from('memberships')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle() as any
        orgId = membership?.organization_id
      }

      if (!orgId) return { partners: [], orgInfo: null }

      // 2. Parallel fetch
      const res = await Promise.all([
        supabase.from('organizations').select('*').eq('id', orgId).single(),
        supabase.from('partners').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
      ]) as any[]

      const [orgRes, partnersRes] = res
      
      return {
        orgInfo: orgRes.data || null,
        partners: partnersRes.data || []
      }
    },
    enabled: !!user?.id && !!currentOrg?.id
  })

  // Destructure from query data with safe fallbacks
  const partners = qData?.partners || []
  const orgInfo = qData?.orgInfo || null

  useEffect(() => {
    if (needsOnboarding === true) {
      router.push('/onboarding?redirect=/parceiros')
    }
  }, [needsOnboarding, router])


  // Form State
  const [newPartner, setNewPartner] = useState({
    name: '',
    type: 'pj' as 'pf' | 'pj',
    document: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    representative: { nome: '', cpf: '', cargo: '' }
  })

  const queryClient = useQueryClient()
  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: ['partners'] })
  }

  // Build unique partners list
  const allPartners = React.useMemo(() => {
    const seen = new Set()
    const list: any[] = []

    // 1. Matriz (Organization)
    if (orgInfo) {
      list.push({
        id: orgInfo.id,
        type: (orgInfo.metadata as any)?.type || (orgInfo.metadata as any)?.tipo || 'pj',
        name: orgInfo.name,
        document: (orgInfo.metadata as any)?.documento || (orgInfo as any).category || '',
        email: (orgInfo.metadata as any)?.email || session?.user?.email || '',
        phone: (orgInfo.metadata as any)?.telefone || '',
        address: (orgInfo.metadata as any)?.endereco || '',
        website: (orgInfo.metadata as any)?.website || (orgInfo.metadata as any)?.site || '',
        representative: (orgInfo.metadata as any)?.representante_legal?.nome || '',
        representative_cpf: (orgInfo.metadata as any)?.representante_legal?.cpf || '',
        isDefault: true,
        metadata: orgInfo.metadata
      })
      seen.add(orgInfo.id)
    }

    // 2. Others
    if (partners) {
      partners.forEach((p: any) => {
        if (!p.id || seen.has(p.id)) return
        seen.add(p.id)
        
        list.push({
          ...p,
          type: (p.metadata as any)?.tipo || 'pj',
          document: (p.metadata as any)?.documento || p.category || '',
          email: p.contact_email || (p.metadata as any)?.email || '',
          phone: (p.metadata as any)?.telefone || (p.metadata as any)?.contato?.telefone || '',
          address: typeof (p.metadata as any)?.endereco === 'string'
            ? (p.metadata as any)?.endereco
            : (p.metadata as any)?.endereco?.logradouro || '',
          website: (p.metadata as any)?.website || (p.metadata as any)?.site || '',
          representative: (p.metadata as any)?.representante_legal?.nome || '',
          representative_cpf: (p.metadata as any)?.representante_legal?.cpf || '',
          isDefault: false
        })
      })
    }

    return list
  }, [orgInfo, partners, session?.user?.email])

  const [editingId, setEditingId] = useState<string | null>(null)

  const handleEdit = (partner: any) => {
    setNewPartner({
      name: partner.name,
      type: partner.type,
      document: partner.document,
      email: partner.email,
      phone: partner.phone,
      address: partner.address || '',
      website: partner.website || (partner.metadata as any)?.website || '',
      representative: {
        nome: partner.representative || '',
        cpf: (partner.metadata as any)?.representante_legal?.cpf || '',
        cargo: (partner.metadata as any)?.representante_legal?.cargo || ''
      }
    })
    setEditingId(partner.id)
    setIsModalOpen(true)
  }

  const deleteMutation = useOptimisticMutation({
    actionName: 'excluir parceiro',
    mutationFn: (id: string) => deletePartnerAction(id),
    queryKey: ['partners', currentOrg?.id],
    operation: 'delete',
    getEntityId: (id: string) => id,
    updater: (old: any, id: string) => {
      if (!old) return old
      return {
        ...old,
        partners: old.partners.filter((p: any) => p.id !== id)
      }
    },
  })

  const handleDelete = async (id: string) => {
    if (!id || !window.confirm('Tem certeza que deseja remover este contato?')) return
    deleteMutation.mutate(id)
  }

  const saveMutation = useOptimisticMutation({
    actionName: editingId ? (editingId === orgInfo?.id ? 'updateOrganization' : 'updatePartner') : 'createPartner',
    queryKey,
    operation: editingId ? 'update' : 'create',
    getEntityId: () => editingId || 'new',
    mutationFn: async (variables: any) => {
      const isEditingMatriz = editingId === orgInfo?.id

      if (isEditingMatriz) {
        const { data, error } = await (supabase.from('organizations') as any)
          .update({
            name: variables.name,
            metadata: variables.metadata
          })
          .eq('id', editingId as string)
          .select('*')
          .single()
        if (error) throw error
        return data
      } else if (editingId) {
        const { data, error } = await (supabase.from('partners') as any)
          .update({
            name: variables.name,
            contact_email: variables.contact_email,
            metadata: variables.metadata
          })
          .eq('id', editingId as string)
          .select('*')
          .single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await (supabase.from('partners') as any).insert({
          organization_id: currentOrg?.id,
          name: variables.name,
          slug: variables.name.toLowerCase().replace(/ /g, '-') + '-' + Math.random().toString(36).substring(7),
          contact_email: variables.contact_email,
          metadata: variables.metadata
        }).select('*').single()
        if (error) throw error
        return data
      }
    },
    updater: (old: any, variables: any) => {
      if (!old) return old
      // Se variables.id existe, é um update. Caso contrário (ou se for o newItem otimista), é um create.
      const isUpdate = variables.id && old.partners.some((p: any) => p.id === variables.id)

      if (isUpdate) {
        return {
          ...old,
          partners: old.partners.map((p: any) => p.id === variables.id ? { ...p, ...variables } : p)
        }
      }

      // Lógica de Create: Inserir no início da lista partners do objeto
      return {
        ...old,
        partners: [variables, ...old.partners]
      }
    },
    onSuccess: () => {
      setIsModalOpen(false)
      setEditingId(null)
      setNewPartner({ name: '', type: 'pj', document: '', email: '', phone: '', address: '', website: '', representative: { nome: '', cpf: '', cargo: '' } })
      toast.success(editingId ? 'Parceiro atualizado!' : 'Parceiro cadastrado com sucesso!')
    }
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPartner.name) return

    const payload = {
      name: newPartner.name,
      contact_email: newPartner.email,
      metadata: {
        tipo: newPartner.type,
        documento: newPartner.document.trim() || 'Sem Documento',
        email: newPartner.email,
        telefone: newPartner.phone,
        endereco: newPartner.address,
        website: newPartner.website,
        representante_legal: newPartner.representative
      }
    }

    saveMutation.mutate(payload)
  }


  const filteredPartners = allPartners.filter((p: any) => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.document || '').toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === 'all') return matchesSearch
    return p.type === activeTab && matchesSearch
  })

  // Performance: Solo mostramos el spinner de pantalla completa si NO hay datos
  // Si hay datos en cache (aunque sea stale), renderizamos la UI inmediatamente.
  const hasNoData = loading && partners.length === 0
  
  if ((hasNoData || guardLoading) && needsOnboarding !== false) {
    return (
      <DashboardLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-slate-500 font-medium">Carregando Hub de Parceiros...</p>
          </div>
        </PageContainer>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="flex flex-col gap-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-full overflow-x-hidden">

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-y-8 text-center lg:text-left">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Hub de Contatos & CRM</h1>
              <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl mx-auto lg:mx-0">Gerencie as relações da sua empresa integradas à inteligência sistêmica.</p>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="h-12 px-8 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full lg:w-auto"
            >
              <Plus className="w-5 h-5 mr-2" /> Novo Contato
            </Button>
          </div>

          {/* STATS & FILTERS */}
          <div className="flex flex-col gap-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-3 md:p-4 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="grid grid-cols-3 md:flex items-center gap-1 md:gap-2 p-1.5 bg-slate-200/60 rounded-2xl overflow-hidden shadow-inner-sm">
                <button
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    "px-2 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all text-center",
                    activeTab === 'all' ? "bg-white text-primary shadow-md" : "text-slate-600 hover:text-slate-800"
                  )}
                >
                  Todos
                </button>
                <button
                  onClick={() => setActiveTab('pf')}
                  className={cn(
                    "px-2 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all text-center",
                    activeTab === 'pf' ? "bg-white text-primary shadow-md" : "text-slate-600 hover:text-slate-800"
                  )}
                >
                  PF
                </button>
                <button
                  onClick={() => setActiveTab('pj')}
                  className={cn(
                    "px-2 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all text-center",
                    activeTab === 'pj' ? "bg-white text-primary shadow-md" : "text-slate-600 hover:text-slate-800"
                  )}
                >
                  PJ
                </button>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar parceiro..."
                    className="h-12 pl-12 pr-6 rounded-2xl bg-slate-200/60 border-none text-sm font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none w-full md:w-64 placeholder:text-slate-500 shadow-inner-sm"
                  />
                </div>
              </div>
            </div>

            {/* PARTNERS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {filteredPartners.map((partner) => (
                <PrefetchWrapper
                  key={partner.id}
                  queryKey={['partner', partner.id]}
                  queryFn={async () => {
                    return { partner: partner, items: { contracts: [], strategies: [], protocols: [] } }
                  }}
                >
                  <Card
                    className={cn(
                      "group relative overflow-hidden bg-white hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5",
                      partner.isDefault && "border-primary/40 bg-primary/[0.01]"
                    )}
                  >
                    {partner.isDefault && (
                      <div className="hidden lg:block absolute top-4 right-4 z-10">
                        <span className="bg-primary text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-primary/20 flex items-center gap-1.5">
                          <ShieldCheck size={10} /> Perfil Matriz
                        </span>
                      </div>
                    )}

                    <div className="p-5 md:p-8 space-y-6">
                      <div className="flex items-center gap-4 md:gap-5">
                        <div className={cn(
                          "w-14 h-14 md:w-16 md:h-16 rounded-[20px] md:rounded-[24px] flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-500 shrink-0",
                          partner.type === 'pj' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {partner.type === 'pj' ? <Building2 size={24} className="md:size-[32px]" /> : <User size={24} className="md:size-[32px]" />}
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{partner.name}</h3>
                            {partner._optimistic && (
                              <span className="w-fit flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-[8px] font-black text-amber-600 uppercase tracking-widest border border-amber-100 animate-pulse">
                                <Loader2 size={10} className="animate-spin" />
                                Sincronizando...
                              </span>
                            )}
                            {partner.isDefault && (
                              <span className="lg:hidden w-fit bg-primary text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                <ShieldCheck size={8} /> Matriz
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {partner.type === 'pj' ? 'CNPJ' : 'CPF'} • {partner.document}
                          </div>
                        </div>
                      </div>

                      <div className="pb-2 border-b border-blue-300" />


                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-500 hover:text-primary transition-colors cursor-pointer group/item">
                          <Mail size={14} className="group-hover/item:scale-110 transition-transform" />
                          <span className="text-[11px] font-medium truncate">{partner.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                          <Phone size={14} />
                          <span className="text-[11px] font-medium">{partner.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                          <MapPin size={14} className="shrink-0" />
                          <span className="text-[11px] font-medium truncate">{partner.address}</span>
                        </div>
                      </div>

                      {partner.representative && (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 bg-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.1em]">Representante</span>
                            <CheckCircle2 size={12} className="text-primary" />
                          </div>
                          <p className="text-[11px] font-bold text-slate-900 truncate">
                            {partner.representative}
                            {partner.representative_cpf && (
                              <span className="text-slate-400 font-medium ml-2 text-[9px]">({partner.representative_cpf})</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                      <Button
                        onClick={() => handleEdit(partner)}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest text-slate-600 border-slate-200 hover:border-primary hover:text-primary hover:bg-white shadow-sm rounded-xl transition-all"
                      >
                        Editar
                      </Button>
                      {!partner.isDefault && (
                          <Button
                            onClick={() => handleDelete(partner.id)}
                            variant="outline"
                            size="sm"
                            className="h-10 w-10 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-200 hover:border-red-200 rounded-xl transition-all shadow-sm"
                          >
                            <Trash2 size={14} />
                          </Button>
                      )}
                    </div>
                  </Card>
                </PrefetchWrapper>
              ))}
            </div>
          </div>

          {/* COMPANY HERO BANNER */}
          <div className="bg-primary/5 border border-primary/20 rounded-[32px] p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white flex items-center justify-center text-primary shadow-lg shrink-0">
              <Building2 size={32} className="md:size-[48px]" />
            </div>
            <div className="flex-1 space-y-3 md:space-y-4">
              <h4 className="text-lg md:text-xl font-black text-slate-900 leading-tight">Formalize seu negócio com a Company Hero</h4>
              <p className="text-slate-600 text-[13px] md:text-base leading-relaxed font-medium">
                Simplifique a sua jornada empreendedora. A Company Hero oferece todas as soluções para você abrir, regularizar e proteger sua empresa em um só lugar.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-y-3 gap-x-6 pt-2 text-left mx-auto md:mx-0 w-max md:w-auto">
                <span className="flex items-center gap-2 text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                  <CheckCircle2 size={14} className="shrink-0" /> Abertura de CNPJ
                </span>
                <span className="flex items-center gap-2 text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                  <CheckCircle2 size={14} className="shrink-0" /> Endereço Fiscal e Comercial
                </span>
                <span className="flex items-center gap-2 text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                  <CheckCircle2 size={14} className="shrink-0" /> Conta Digital PJ
                </span>
                <span className="flex items-center gap-2 text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                  <CheckCircle2 size={14} className="shrink-0" /> Registro de Marca
                </span>
              </div>
            </div>
            <Link href="https://www.companyhero.com/afiliados/MIRVANACONSULTORIA25" target="_blank" rel="noopener noreferrer" className="shrink-0 w-full md:w-auto">
              <Button
                className="h-12 md:h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200/50 w-full md:w-auto"
              >
                Conhecer a Hero <ExternalLink className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>

          {/* ADD PARTNER MODAL */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
              <Card padding="none" className="relative w-full max-w-2xl bg-white shadow-2xl rounded-[32px] overflow-hidden border-none animate-in zoom-in-95 duration-200">
                <form onSubmit={handleSave} className="flex flex-col">
                  <div className="p-5 md:p-8 border-b border-slate-300 flex items-center justify-between bg-slate-200/50">
                    <div>
                      <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">Novo Parceiro</h2>
                      <p className="text-[10px] md:text-sm text-slate-700 font-bold uppercase tracking-widest opacity-70">Cadastro Estruturado</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-300 flex items-center justify-center text-slate-900 hover:text-primary hover:border-primary/50 hover:shadow-lg transition-all"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="p-5 md:p-8 space-y-6 md:space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar bg-white">
                    <div className="grid grid-cols-2 gap-2 md:gap-4 p-2 bg-slate-200 rounded-[22px] md:rounded-[24px] border border-slate-300 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setNewPartner({ ...newPartner, type: 'pf' })}
                        className={cn("py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300 leading-none", newPartner.type === 'pf' ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-slate-600 hover:text-slate-900")}
                      >
                        Pessoa Física
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPartner({ ...newPartner, type: 'pj' })}
                        className={cn("py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300 leading-none", newPartner.type === 'pj' ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-slate-600 hover:text-slate-900")}
                      >
                        Pessoa Jurídica
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="col-span-full">
                        <FormInput
                          label="Nome / Razão Social"
                          required
                          value={newPartner.name}
                          onChange={e => setNewPartner({ ...newPartner, name: e.target.value })}
                          placeholder="Ex: iaNow Tech Ltda"
                        />
                      </div>
                      <FormInput
                        label={newPartner.type === 'pj' ? 'CNPJ' : 'CPF'}
                        value={newPartner.document}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '')
                          let formatted = val
                          if (newPartner.type === 'pf') {
                            formatted = val
                              .replace(/(\d{3})(\d)/, '$1.$2')
                              .replace(/(\d{3})(\d)/, '$1.$2')
                              .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                              .slice(0, 14)
                          } else {
                            formatted = val
                              .replace(/(\d{2})(\d)/, '$1.$2')
                              .replace(/(\d{3})(\d)/, '$1.$2')
                              .replace(/(\d{3})(\d)/, '$1/$2')
                              .replace(/(\d{4})(\d{1,2})/, '$1-$2')
                              .slice(0, 18)
                          }
                          setNewPartner({ ...newPartner, document: formatted })
                        }}
                        placeholder={newPartner.type === 'pj' ? '00.000.000/0001-00' : '000.000.000-00'}
                      />
                      <FormInput
                        label="Telefone"
                        value={newPartner.phone}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '')
                          let formatted = val
                          if (val.length > 10) {
                            formatted = val.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                          } else if (val.length > 5) {
                            formatted = val.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
                          } else if (val.length > 2) {
                            formatted = val.replace(/(\d{2})(\d{0,5})/, '($1) $2')
                          }
                          setNewPartner({ ...newPartner, phone: formatted.slice(0, 15) })
                        }}
                        placeholder="(11) 99999-9999"
                      />
                      <div className="col-span-full">
                        <FormInput
                          label="E-mail"
                          type="email"
                          value={newPartner.email}
                          onChange={e => setNewPartner({ ...newPartner, email: e.target.value })}
                          placeholder="contato@empresa.com"
                        />
                      </div>
                      <div className="col-span-full">
                        <FormInput
                          label="Site / URL (Opcional)"
                          value={newPartner.website}
                          onChange={e => setNewPartner({ ...newPartner, website: e.target.value })}
                          placeholder="exemplo.com.br"
                        />
                      </div>
                      <div className="col-span-full">
                        <FormInput
                          label="Endereço Completo"
                          value={newPartner.address}
                          onChange={e => setNewPartner({ ...newPartner, address: e.target.value })}
                          placeholder="Rua, Número, Cidade/Estado"
                        />
                      </div>
                    </div>

                    {newPartner.type === 'pj' && (
                      <div className="p-5 md:p-8 bg-slate-200 border-2 border-slate-300 rounded-[28px] md:rounded-[32px] space-y-5 md:space-y-6">
                        <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-primary" /> Representante Legal
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          <FormInput
                            label="Nome Completo"
                            placeholder="..."
                            value={newPartner.representative.nome}
                            onChange={e => setNewPartner({ ...newPartner, representative: { ...newPartner.representative, nome: e.target.value } })}
                            className="bg-white"
                          />
                          <FormInput
                            label="Doc Identidade (CPF)"
                            placeholder="..."
                            value={newPartner.representative.cpf}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '')
                              const formatted = val
                                .replace(/(\d{3})(\d)/, '$1.$2')
                                .replace(/(\d{3})(\d)/, '$1.$2')
                                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                                .slice(0, 14)
                              setNewPartner({ ...newPartner, representative: { ...newPartner.representative, cpf: formatted } })
                            }}
                            className="bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 md:p-8 bg-slate-50 flex items-center gap-3 md:gap-4">
                    <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl font-bold border-slate-200 text-xs md:text-base">Cancelar</Button>
                    <Button isLoading={saveMutation.isPending} type="submit" className="flex-[2] h-12 md:h-14 rounded-xl md:rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 text-xs md:text-base">Salvar Parceiro</Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
