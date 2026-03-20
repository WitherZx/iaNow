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
  X
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { cn } from '@/utils/cn'
import { Label } from '@/components/shared/Label'

export default function PartnerHubPage() {
  const { session } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pf' | 'pj'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
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
      email: p.contact_email || '',
      phone: (p.metadata as any)?.contato?.telefone || '',
      address: (p.metadata as any)?.endereco?.logradouro || '',
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPartner.name) return
    
    try {
      setIsSaving(true)
      
      const payload = {
        name: newPartner.name,
        metadata: {
          tipo: newPartner.type,
          documento: newPartner.document.trim(),
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
            category: newPartner.document.trim(),
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
          category: newPartner.document.trim(),
          metadata: payload.metadata
        })
        if (error) throw error
      }
      
      setIsModalOpen(false)
      setEditingId(null)
      await loadData()
      setNewPartner({ name: '', type: 'pj', document: '', email: '', phone: '', address: '', website: '', representative: { nome: '', cpf: '', cargo: '' } })
    } catch (err: any) {
      console.error('Save error:', err)
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
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Hub de Parceiros & CRM</h1>
              <p className="text-slate-500 font-medium">Gerencie seus clientes e fornecedores integrados à IA.</p>
            </div>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="h-12 px-8 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5 mr-3" /> Novo Parceiro
            </Button>
          </div>

          {/* STATS & FILTERS */}
          <div className="flex flex-col gap-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl">
                <button 
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === 'all' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Todos ({partners.length})
                </button>
                <button 
                  onClick={() => setActiveTab('pf')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === 'pf' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Pessoa Física
                </button>
                <button 
                  onClick={() => setActiveTab('pj')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    activeTab === 'pj' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Pessoa Jurídica
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar nome ou documento..." 
                    className="h-12 pl-12 pr-6 rounded-2xl bg-slate-50 border-none text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none w-full md:w-64"
                  />
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl">
                  <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-colors", viewMode === 'grid' ? "bg-white text-primary shadow-sm" : "text-slate-400")}><LayoutGrid size={18} /></button>
                  <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-colors", viewMode === 'list' ? "bg-white text-primary shadow-sm" : "text-slate-400")}><ListIcon size={18} /></button>
                </div>
              </div>
            </div>

            {/* PARTNERS GRID */}
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
            )}>
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
                    <div className="absolute top-4 right-4 z-10">
                      <span className="bg-primary text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-primary/20 flex items-center gap-1.5">
                        <ShieldCheck size={10} /> Perfil Matriz
                      </span>
                    </div>
                  )}

                  <div className="p-8 space-y-6">
                    <div className="flex items-start gap-5">
                      <div className={cn(
                        "w-16 h-16 rounded-[24px] flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-500",
                        partner.type === 'pj' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {partner.type === 'pj' ? <Building2 size={32} /> : <User size={32} />}
                      </div>
                      <div className="space-y-1.5 pt-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{partner.name}</h3>
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

                  <div className="p-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                    <Button 
                      onClick={() => handleEdit(partner)}
                      variant="ghost" 
                      size="sm" 
                      className="h-10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary"
                    >
                      Editar Cadastro
                    </Button>
                    <Link href={partner.type === 'pj' ? `/juridico/novo?partnerId=${partner.id}` : '#'}>
                      <Button variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-white active:scale-95 transition-all">
                        Gerar Documento <Plus size={14} className="ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* AI CONNECTION TIP */}
          <div className="bg-primary/5 border border-primary/20 rounded-[32px] p-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-primary shadow-lg shrink-0">
               <ShieldCheck size={48} className="animate-pulse" />
            </div>
            <div className="flex-1 space-y-4">
              <h4 className="text-xl font-black text-slate-900">IA Inteligente & Partner Hub unidos.</h4>
              <p className="text-slate-600 leading-relaxed font-medium">
                Os dados cadastrados aqui são estruturados em tempo real para alimentar nossa IA. Ao selecionar um parceiro em um novo contrato, o sistema monta automaticamente as cláusulas de qualificação, valida documentos e aplica regras específicas baseadas no tipo de perfil.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <span className="flex items-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest">
                  <CheckCircle2 size={14} /> Validação de CPF/CNPJ
                </span>
                <span className="flex items-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest">
                  <CheckCircle2 size={14} /> Integração Jurídica
                </span>
              </div>
            </div>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-bold hover:bg-slate-800 transition-all shrink-0 shadow-lg shadow-slate-200/50"
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
                  <div className="p-8 border-b border-slate-300 flex items-center justify-between bg-slate-200/50">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Novo Parceiro</h2>
                      <p className="text-sm text-slate-700 font-bold uppercase tracking-widest opacity-70">Cadastro Estruturado</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-300 flex items-center justify-center text-slate-900 hover:text-primary hover:border-primary/50 hover:shadow-lg transition-all"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white">
                    <div className="grid grid-cols-2 gap-4 p-2.5 bg-slate-200 rounded-[24px] border border-slate-300 shadow-inner">
                      <button 
                        type="button"
                        onClick={() => setNewPartner({...newPartner, type: 'pf'})}
                        className={cn("py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 leading-none", newPartner.type === 'pf' ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-slate-600 hover:text-slate-900")}
                      >
                        Pessoa Física
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewPartner({...newPartner, type: 'pj'})}
                        className={cn("py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 leading-none", newPartner.type === 'pj' ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-slate-600 hover:text-slate-900")}
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
                      <div className="p-8 bg-slate-200 border-2 border-slate-300 rounded-[32px] space-y-6">
                        <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-primary" /> Representante Legal
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label>Nome Completo</Label>
                            <input 
                              placeholder="..." 
                              value={newPartner.representative.nome}
                              onChange={e => setNewPartner({...newPartner, representative: {...newPartner.representative, nome: e.target.value}})}
                              className="bg-white border border-slate-200 rounded-xl h-14 px-5 text-sm font-bold shadow-inner outline-none placeholder:text-slate-400 focus:border-primary transition-all text-slate-900" 
                            />
                          </div>
                          <div className="space-y-3">
                            <Label>Doc Identidade (CPF)</Label>
                            <input 
                              placeholder="..." 
                              value={newPartner.representative.cpf}
                              onChange={e => setNewPartner({...newPartner, representative: {...newPartner.representative, cpf: e.target.value}})}
                              className="bg-white border border-slate-200 rounded-xl h-14 px-5 text-sm font-bold shadow-inner outline-none placeholder:text-slate-400 focus:border-primary transition-all text-slate-900" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-8 bg-slate-50 flex items-center gap-4">
                    <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-slate-200">Cancelar</Button>
                    <Button isLoading={isSaving} type="submit" className="flex-[2] h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20">Salvar Parceiro</Button>
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
