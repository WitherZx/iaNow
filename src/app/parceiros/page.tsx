'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
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
  FileText, 
  Gavel, 
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
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { cn } from '@/utils/cn'
import { Label } from '@/components/shared/Label'
import { toast } from 'sonner'

export default function PartnerHubPage() {
  const { session } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pf' | 'pj'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [partners, setPartners] = useState<any[]>([])
  const [orgInfo, setOrgInfo] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

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

  const loadData = async () => {
    if (!session?.user?.id) return
    
      try {
        setLoading(true)
        
        // 1. Fetch Org Info (Profile Matriz)
        const { data: membership } = await supabase
          .from('memberships')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle() as any
          
        if (membership?.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', membership.organization_id)
            .single() as any
          
          if (orgData) setOrgInfo(orgData)
        }

        // 2. Fetch Partners
        const { data: partnersData } = await supabase
          .from('partners')
          .select('*')
          .order('created_at', { ascending: false })
          
        setPartners(partnersData || [])
      } catch (err) {
        console.error('Error loading partners:', err)
      } finally {
        setLoading(false)
      }
  }

  useEffect(() => {
    loadData()
  }, [session, supabase])


  const allPartners = [
    ...(orgInfo ? [{
      id: orgInfo.id,
      type: (orgInfo.metadata as any)?.tipo || 'pj',
      name: orgInfo.name,
      document: (orgInfo.metadata as any)?.documento || (orgInfo as any).category || '',
      email: (orgInfo.metadata as any)?.email || session?.user?.email || '',
      phone: (orgInfo.metadata as any)?.telefone || '',
      address: (orgInfo.metadata as any)?.endereco || '',
      website: (orgInfo.metadata as any)?.website || (orgInfo.metadata as any)?.site || '',
      representative: (orgInfo.metadata as any)?.representante_legal?.nome || '',
      representative_cpf: (orgInfo.metadata as any)?.representante_legal?.cpf || '',
      isDefault: true,
      metadata: orgInfo.metadata,
      contractsCount: 0,
      casesCount: 0
    }] : []),
    ...partners.map(p => ({
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
      isDefault: false,
      contractsCount: 0,
      casesCount: 0
    }))
  ]

  const [editingId, setEditingId] = useState<string | null>(null)

  const handleEdit = (partner: any) => {
    setNewPartner({
      name: partner.name,
      type: partner.type,
      document: partner.document,
      email: partner.email,
      phone: partner.phone,
      address: partner.address,
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

  const handleDelete = async (partner: any) => {
    if (partner.isDefault) return
    if (!confirm(`Tem certeza que deseja remover "${partner.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      const { error } = await (supabase.from('partners') as any).delete().eq('id', partner.id)
      if (error) throw error
      toast.success(`"${partner.name}" removido com sucesso.`)
      await loadData()
    } catch (err: any) {
      toast.error('Erro ao remover parceiro: ' + (err.message || 'Erro desconhecido'))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPartner.name) return
    
    try {
      setIsSaving(true)
      
      const payload = {
        name: newPartner.name,
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

      const isEditingMatriz = editingId === orgInfo?.id

      if (isEditingMatriz) {
        // Update Organization
        const { error } = await (supabase.from('organizations') as any)
          .update({ 
            name: payload.name, 
            metadata: payload.metadata 
          })
          .eq('id', editingId as string)
        if (error) throw error
      } else if (editingId) {
        // Update Partner
        const { error } = await (supabase.from('partners') as any)
          .update({
            name: payload.name,
            contact_email: newPartner.email,
            metadata: payload.metadata
          })
          .eq('id', editingId as string)
        if (error) throw error
      } else {
        // Insert Partner
        const { error } = await (supabase.from('partners') as any).insert({
          name: newPartner.name,
          slug: newPartner.name.toLowerCase().replace(/ /g, '-') + '-' + Math.random().toString(36).substring(7),
          contact_email: newPartner.email,
          metadata: payload.metadata
        })
        if (error) throw error
      }
      
      setIsModalOpen(false)
      setEditingId(null)
      await loadData()
      setNewPartner({ name: '', type: 'pj', document: '', email: '', phone: '', address: '', website: '', representative: { nome: '', cpf: '', cargo: '' } })
      toast.success(editingId ? 'Parceiro atualizado!' : 'Parceiro cadastrado com sucesso!')
    } catch (err: any) {
      console.error('CRITICAL SAVE ERROR:', err)
      console.log('Error Type:', typeof err)
      console.log('Payload sent:', {
        editingId,
        newPartner,
        orgInfoId: orgInfo?.id
      })
      
      const errorMsg = err.message || JSON.stringify(err)
      toast.error('Impossível salvar: ' + errorMsg)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredPartners = allPartners.filter(p => {
    if (activeTab === 'all') return true
    return p.type === activeTab
  })

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="flex flex-col gap-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-full overflow-x-hidden">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-y-8 text-center lg:text-left">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Hub de Parceiros & CRM</h1>
              <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl mx-auto lg:mx-0">Gerencie seus clientes e fornecedores integrados à inteligência sistêmica.</p>
            </div>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="h-12 px-8 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full lg:w-auto"
            >
              <Plus className="w-5 h-5 mr-2" /> Novo Parceiro
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
                    placeholder="Buscar parceiro..." 
                    className="h-12 pl-12 pr-6 rounded-2xl bg-slate-200/60 border-none text-sm font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none w-full md:w-64 placeholder:text-slate-500 shadow-inner-sm"
                  />
                </div>
              </div>
            </div>

            {/* PARTNERS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {filteredPartners.map((partner) => (
                <Card 
                  key={partner.id} 
                  padding="none" 
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
                    <div className="flex items-start gap-4 md:gap-5">
                      <div className={cn(
                        "w-14 h-14 md:w-16 md:h-16 rounded-[20px] md:rounded-[24px] flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-500 shrink-0",
                        partner.type === 'pj' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {partner.type === 'pj' ? <Building2 size={24} className="md:size-[32px]" /> : <User size={24} className="md:size-[32px]" />}
                      </div>
                      <div className="space-y-1.5 pt-1 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{partner.name}</h3>
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

                    <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><FileText size={14} /></div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{partner.contractsCount}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Contratos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Gavel size={14} /></div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{partner.casesCount}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Processos</p>
                        </div>
                      </div>
                    </div>

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
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
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

                  <div className="p-3 bg-slate-50/50 border-t border-slate-50 flex items-center gap-2">
                    <Button 
                      onClick={() => handleEdit(partner)}
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 h-10 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary border border-transparent hover:border-primary/10"
                    >
                      Editar
                    </Button>
                    <Link href={partner.type === 'pj' ? `/juridico/novo?partnerId=${partner.id}` : '#'} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-10 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-white active:scale-95 transition-all">
                        Documento <Plus size={12} className="ml-1" />
                      </Button>
                    </Link>
                    {!partner.isDefault && (
                      <Button
                        onClick={() => handleDelete(partner)}
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 shrink-0 text-slate-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* AI CONNECTION TIP */}
          <div className="bg-primary/5 border border-primary/20 rounded-[32px] p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white flex items-center justify-center text-primary shadow-lg shrink-0">
               <ShieldCheck size={32} className="animate-pulse md:size-[48px]" />
            </div>
            <div className="flex-1 space-y-3 md:space-y-4">
              <h4 className="text-lg md:text-xl font-black text-slate-900 leading-tight">IA Inteligente & Partner Hub unidos.</h4>
              <p className="text-slate-600 text-[13px] md:text-base leading-relaxed font-medium">
                Os dados cadastrados aqui são estruturados em tempo real para alimentar nossa IA. Ao selecionar um parceiro em um novo contrato, o sistema monta automaticamente as cláusulas de qualificação, valida documentos e aplica regras específicas baseadas no tipo de perfil.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-y-3 gap-x-6 pt-2">
                <span className="flex items-center gap-2 text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                  <CheckCircle2 size={14} /> Validação de CPF/CNPJ
                </span>
                <span className="flex items-center gap-2 text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                  <CheckCircle2 size={14} /> Integração Jurídica
                </span>
              </div>
            </div>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="h-12 md:h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-bold hover:bg-slate-800 transition-all shrink-0 shadow-lg shadow-slate-200/50 w-full md:w-auto"
            >
              Novo Parceiro <Plus className="ml-2 w-5 h-5" />
            </Button>
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
                        onClick={() => setNewPartner({...newPartner, type: 'pf'})}
                        className={cn("py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300 leading-none", newPartner.type === 'pf' ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-slate-600 hover:text-slate-900")}
                      >
                        Pessoa Física
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewPartner({...newPartner, type: 'pj'})}
                        className={cn("py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300 leading-none", newPartner.type === 'pj' ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-slate-600 hover:text-slate-900")}
                      >
                        Pessoa Jurídica
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3 col-span-full">
                        <Label>Nome / Razão Social</Label>
                        <input 
                          required
                          value={newPartner.name}
                          onChange={e => setNewPartner({...newPartner, name: e.target.value})}
                          placeholder="Ex: iaNow Tech Ltda" 
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold text-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-slate-400 text-lg shadow-sm" 
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>{newPartner.type === 'pj' ? 'CNPJ' : 'CPF'}</Label>
                        <input 
                          value={newPartner.document}
                          onChange={e => setNewPartner({...newPartner, document: e.target.value})}
                          placeholder={newPartner.type === 'pj' ? '00.000.000/0001-00' : '000.000.000-00'} 
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold text-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-slate-400 shadow-sm" 
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Telefone</Label>
                        <input 
                          value={newPartner.phone}
                          onChange={e => setNewPartner({...newPartner, phone: e.target.value})}
                          placeholder="+55 (11) 99999-9999" 
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold text-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-slate-400 shadow-sm" 
                        />
                      </div>
                      <div className="space-y-3 col-span-full">
                        <Label>E-mail</Label>
                        <input 
                          type="email"
                          value={newPartner.email}
                          onChange={e => setNewPartner({...newPartner, email: e.target.value})}
                          placeholder="contato@empresa.com" 
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold text-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-slate-400 shadow-sm" 
                        />
                      </div>
                      <div className="space-y-3 col-span-full">
                        <Label>Site / URL (Opcional)</Label>
                        <input 
                          type="url"
                          value={newPartner.website}
                          onChange={e => setNewPartner({...newPartner, website: e.target.value})}
                          placeholder="https://www.empresa.com" 
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold text-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-slate-400 shadow-sm" 
                        />
                      </div>
                      <div className="space-y-3 col-span-full">
                        <Label>Endereço Completo</Label>
                        <input 
                          value={newPartner.address}
                          onChange={e => setNewPartner({...newPartner, address: e.target.value})}
                          placeholder="Rua, Número, Cidade/Estado" 
                          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold text-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-slate-400 shadow-sm" 
                        />
                      </div>
                    </div>

                    {newPartner.type === 'pj' && (
                      <div className="p-5 md:p-8 bg-slate-200 border-2 border-slate-300 rounded-[28px] md:rounded-[32px] space-y-5 md:space-y-6">
                        <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-primary" /> Representante Legal
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          <div className="space-y-3">
                            <Label>Nome Completo</Label>
                            <input 
                              placeholder="..." 
                              value={newPartner.representative.nome}
                              onChange={e => setNewPartner({...newPartner, representative: {...newPartner.representative, nome: e.target.value}})}
                              className="w-full bg-white border border-slate-200 rounded-xl h-14 px-5 text-sm font-bold shadow-inner outline-none placeholder:text-slate-400 focus:border-primary transition-all text-slate-900" 
                            />
                          </div>
                          <div className="space-y-3">
                            <Label>Doc Identidade (CPF)</Label>
                            <input 
                              placeholder="..." 
                              value={newPartner.representative.cpf}
                              onChange={e => setNewPartner({...newPartner, representative: {...newPartner.representative, cpf: e.target.value}})}
                              className="w-full bg-white border border-slate-200 rounded-xl h-14 px-5 text-sm font-bold shadow-inner outline-none placeholder:text-slate-400 focus:border-primary transition-all text-slate-900" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 md:p-8 bg-slate-50 flex items-center gap-3 md:gap-4">
                    <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl font-bold border-slate-200 text-xs md:text-base">Cancelar</Button>
                    <Button isLoading={isSaving} type="submit" className="flex-[2] h-12 md:h-14 rounded-xl md:rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 text-xs md:text-base">Salvar Parceiro</Button>
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
