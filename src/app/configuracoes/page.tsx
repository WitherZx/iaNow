'use client'

import React, { useState, Suspense, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUserConfigAction } from '@/app/actions/user-config-actions'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import {
  User,
  Building2,
  ShieldCheck,
  Bell,
  Save,
  Mail,
  Phone,
  MapPin,
  Globe,
  Camera,
  LogOut,
  ChevronRight,
  Settings as SettingsIcon,
  CreditCard,
  Zap,
  FileText,
  AlertCircle,
  Check,
  CheckCircle2,
  X
} from 'lucide-react'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

import { Label } from '@/components/shared/Label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { EmbeddedCheckout } from '@/components/billing/EmbeddedCheckout'
import { TransparentCheckoutModal } from '@/components/billing/TransparentCheckoutModal'
import { getPlansAction, getMyOrgAction } from '@/app/actions/billing-actions'

interface OrganizationState {
  id?: string
  name: string
  email?: string | null
  plan_id?: string | null
  plans?: any
  metadata?: Record<string, any>
  document?: string
  address?: string
  phone?: string
  website?: string
  type?: 'pf' | 'pj'
}

function ConfiguraçõesPageContent() {
  const searchParams = useSearchParams()
  const { session, user } = useAuth()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'perfil')

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [org, setOrg] = useState<OrganizationState | null>(null)
  const [plans, setPlans] = useState<any[]>([])
  const isPro = org?.plans?.slug === 'pro'

  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  // Update tab if query changes
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  const [profile, setProfile] = useState({
    nome: '',
    email: '',
    cargo: 'Administrador Master',
    telefone: '',
    cpf: '',
    avatar_url: ''
  })

  // 1. Unified Configuration Query with Hybrid Hydration
  const { data: configData, isLoading: loading } = useQuery({
    queryKey: ['user-config', user?.id],
    queryFn: async () => {
      const res = await fetchUserConfigAction()
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    // Hydration: Se o AppDataProvider ou Sidebar já populou o cache, usa instantaneamente
    initialData: () => queryClient.getQueryData(['user-config', user?.id]),
    enabled: !!user?.id,
    staleTime: Infinity // Configurações mudam pouco, manter no cache agressivamente
  })

  // Sincroniza cache para forms locais apenas uma vez ao carregar ou atualizar
  useEffect(() => {
    if (configData) {
      if (configData.plans) setPlans(configData.plans)
      if (configData.org) setOrg(configData.org)

      if (configData.orgProfileData) {
        setProfile(prev => ({
          ...prev,
          ...configData.orgProfileData
        }))
      } else if (configData.user) {
        setProfile(prev => ({
          ...prev,
          nome: configData.user.nome,
          email: configData.user.email,
          avatar_url: configData.user.avatar_url,
          cpf: prev.cpf || ''
        }))
      }
    }
  }, [configData])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // 1. Update Profile (auth metadata)
      const { error: profileError } = await supabase.auth.updateUser({
        data: { full_name: profile.nome }
      })
      if (profileError) throw profileError

      // 2. Update Organization Info (if exists)
      if (org?.id) {
        const { error: orgError } = await supabase
          .from('organizations')
          .update({
            name: org.type === 'pf' ? profile.nome : org.name,
            document: org.document, // Mantém o CNPJ da empresa
            email: org.type === 'pf' ? profile.email : org.email,
            phone: org.type === 'pf' ? profile.telefone : org.phone,
            metadata: {
              ...org.metadata,
              tipo: org.type,
              documento: org.document, // Garante que o CNPJ seja salvo aqui também
              endereco: org.address,
              website: org.website,
              telefone: org.type === 'pf' ? profile.telefone : org.phone,
              representante_legal: {
                nome: profile.nome,
                cpf: profile.cpf // Salva o CPF separadamente aqui
              }
            }
          })
          .eq('id', org.id)

        if (orgError) throw orgError
      }

      toast.success('Perfil atualizado com sucesso!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session?.user) return

    try {
      setUploading(true)
      const user = session.user
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      const filePath = `${fileName}`

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 3. Update Auth Metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError

      // 4. Update State
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
      toast.success('Foto de perfil atualizada!')
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      toast.error(err.message || 'Erro ao fazer upload da imagem')
    } finally {
      setUploading(false)
    }
  }

  const isPF = org?.type === 'pf'

  const tabs = [
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    ...(!isPF ? [{ id: 'org', label: 'Organização', icon: Building2 }] : []),
    { id: 'assinaturas', label: 'Assinaturas', icon: CreditCard },
  ]

  const renderSidebar = () => (
    <aside className="hidden lg:flex flex-col w-[280px] shrink-0 bg-white border-r border-slate-200 h-full">
      {/* Sidebar Header */}
      <div className="px-6 py-6 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Painel</p>
        <p className="text-base font-bold text-slate-800">Configurações</p>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col flex-1 py-3 px-3 gap-y-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group",
                active
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon size={17} className={cn(active ? "text-white" : "text-slate-400 group-hover:text-slate-700")} />
              <span className="text-[13px] font-bold">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Plan at bottom */}
      <div className="mt-auto p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <CreditCard size={15} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Plano Atual</p>
              <p className="text-[13px] font-bold text-slate-900">
                {loading ? (
                  <span className="inline-block w-20 h-3 bg-slate-200 animate-pulse rounded" />
                ) : (
                  (org?.plans?.name || 'Free Explorer').replace('iaNow ', '')
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setActiveTab('assinaturas')}
            className="w-full text-[10px] font-black uppercase tracking-widest h-9 rounded-lg border-slate-200 text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all font-bold"
          >
            Gerenciar Assinatura
          </Button>
        </div>
      </div>
    </aside>
  )

  return (
    <DashboardLayout sidebar={renderSidebar()}>
      <div className="flex flex-col h-full min-h-0">

        {/* Mobile Navigation Container */}
        <div className="lg:hidden flex shrink-0 p-1.5 bg-slate-100 rounded-2xl mb-8 w-full overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all whitespace-nowrap flex-1",
                  active ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon size={14} /> {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

          <div>

            {/* TAB CONTENT */}
            <main className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {activeTab === 'perfil' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
                    <div className="relative group">
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-2xl bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden relative">
                        {uploading && (
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          </div>
                        )}
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={48} className="text-slate-300 md:size-16" />
                        )}
                      </div>
                      <label
                        htmlFor="avatar-upload"
                        className="absolute -bottom-1 -right-1 md:bottom-1 md:right-1 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-white border-2 md:border-4 border-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      >
                        <Camera size={14} className="md:size-4.5" />
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUploadAvatar}
                        disabled={uploading}
                      />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{profile.nome}</h2>
                      <p className="text-sm md:text-base text-slate-500 font-medium">{profile.email}</p>
                      {!isPF && (
                        <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 mt-2">Representante</span>
                      )}
                    </div>
                  </div>

                  <Card className="bg-white border-slate-100 shadow-sm p-5 md:p-8">
                    <form onSubmit={handleSaveProfile} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Tipo de Conta */}
                        <div className="space-y-4 col-span-full">
                          <Label>Tipo de Conta</Label>
                          <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full md:w-fit">
                            {[
                              { id: 'pf', label: 'Pessoa Física', icon: User },
                              { id: 'pj', label: 'Pessoa Jurídica', icon: Building2 },
                            ].map((t) => {
                              const active = org?.type === t.id
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setOrg(prev => prev ? { ...prev, type: t.id as 'pf' | 'pj' } : null)}
                                  className={cn(
                                    "flex flex-1 md:flex-none justify-center items-center gap-2 px-4 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all",
                                    active ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                                  )}
                                >
                                  <t.icon size={14} /> {t.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label>Nome Completo</Label>
                          <input
                            type="text"
                            value={profile.nome}
                            onChange={e => {
                              setProfile({ ...profile, nome: e.target.value })
                              if (isPF) setOrg(prev => prev ? { ...prev, name: e.target.value } : null)
                            }}
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm placeholder:text-slate-400"
                          />
                        </div>

                        {/* Se for PJ, mostra o CPF no lugar do Email */}
                        {!isPF ? (
                          <div className="space-y-3">
                            <Label>CPF do Titular</Label>
                            <input
                              type="text"
                              value={profile.cpf || ''}
                              onChange={e => setProfile({ ...profile, cpf: e.target.value })}
                              placeholder="000.000.000-00"
                              className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm"
                            />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Label>Email Profissional</Label>
                            <input
                              type="email"
                              disabled
                              value={profile.email}
                              className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 opacity-60 font-bold text-slate-900 outline-none shadow-sm cursor-not-allowed"
                            />
                          </div>
                        )}

                        {/* Se for PF, traz os campos restantes para cá */}
                        {isPF && (
                          <>
                            <div className="space-y-3">
                              <Label>CPF do Titular</Label>
                              <input
                                type="text"
                                value={profile.cpf || ''}
                                onChange={e => {
                                  setProfile({ ...profile, cpf: e.target.value })
                                  setOrg(prev => prev ? { ...prev, document: e.target.value } : null)
                                }}
                                placeholder="000.000.000-00"
                                className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label>Telefone / WhatsApp</Label>
                              <input
                                type="text"
                                value={profile.telefone}
                                onChange={e => {
                                  setProfile({ ...profile, telefone: e.target.value })
                                  setOrg(prev => prev ? { ...prev, phone: e.target.value } : null)
                                }}
                                placeholder="+55 (41) 98877-6655"
                                className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm placeholder:text-slate-400"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label>Site / URL (Opcional)</Label>
                              <input
                                type="url"
                                value={org?.website || ''}
                                onChange={e => setOrg(prev => prev ? { ...prev, website: e.target.value } : null)}
                                placeholder="https://meuportfolio.com"
                                className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label>Endereço Completo</Label>
                              <input
                                type="text"
                                value={org?.address || ''}
                                onChange={e => setOrg(prev => prev ? { ...prev, address: e.target.value } : null)}
                                placeholder="Rua, Número, Bairro, Cidade - UF"
                                className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex justify-center md:justify-end">
                        <Button type="submit" isLoading={saving} className="w-full md:w-auto h-12 md:h-14 px-12 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                          <Save className="w-4 h-4 mr-2" /> Salvar Alterações
                        </Button>
                      </div>
                    </form>
                  </Card>
                </div>
              )}

              {activeTab === 'notificacoes' && (
                <div className="space-y-6">
                  <SectionTitle title="Notificações" subtitle="Controle como você recebe alertas e atualizações" />
                  <Card className="bg-white border-slate-100 shadow-sm p-3 md:p-4 divide-y divide-slate-50">
                    {[
                      { title: 'Alertas de Compliance', desc: 'Conformidade de documentos.', icon: ShieldCheck },
                      { title: 'Relatórios Mensais', desc: 'Consolidado de performance mensal.', icon: Bell },
                      { title: 'Novo Diagnóstico IA', desc: 'Notificações de planos prontos.', icon: Zap },
                      { title: 'Acessos de Segurança', desc: 'Alertas de logins novos.', icon: Mail },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-4 md:py-6 px-3 md:px-4 hover:bg-slate-50/50 transition-all rounded-2xl first:rounded-b-none last:rounded-t-none">
                        <div className="flex items-center gap-3 md:gap-5">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <item.icon size={18} className="md:size-5" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[13px] md:text-base font-bold text-slate-900">{item.title}</p>
                            <p className="text-[10px] md:text-xs text-slate-500 font-medium">{item.desc}</p>
                          </div>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={i < 3} />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                        </div>
                      </div>
                    ))}
                  </Card>
                </div>
              )}

              {/* OUTRAS TABS PLACEHOLDERS COM DESIGN CONSISTENTE */}
              {activeTab === 'org' && (
                <div className="space-y-8">
                  <SectionTitle title="Dados da Organização" subtitle="Configurações corporativas da sua empresa" />

                  {org ? (
                    <Card className="bg-white border-slate-100 shadow-sm p-5 md:p-8 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

                        {/* Nome */}
                        <div className="space-y-3 col-span-full">
                          <Label>Nome / Razão Social</Label>
                          <input
                            type="text"
                            value={org.name || ''}
                            onChange={e => setOrg(prev => prev ? { ...prev, name: e.target.value } : null)}
                            placeholder="Nome da empresa"
                            className="w-full h-12 md:h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm"
                          />
                        </div>

                        {/* CNPJ */}
                        <div className="space-y-3">
                          <Label>CNPJ / Identificação</Label>
                          <input
                            type="text"
                            value={org.document || ''}
                            onChange={e => setOrg(prev => prev ? { ...prev, document: e.target.value } : null)}
                            placeholder="00.000.000/0001-00"
                            className="w-full h-12 md:h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm"
                          />
                        </div>

                        {/* Telefone */}
                        <div className="space-y-3">
                          <Label>Telefone Comercial</Label>
                          <input
                            type="text"
                            value={org.phone || ''}
                            onChange={e => setOrg(prev => prev ? { ...prev, phone: e.target.value } : null)}
                            placeholder="(41) 99999-0000"
                            className="w-full h-12 md:h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm"
                          />
                        </div>

                        {/* E-mail */}
                        <div className="space-y-3">
                          <Label>E-mail da Organização</Label>
                          <input
                            type="email"
                            value={org.email || ''}
                            onChange={e => setOrg(prev => prev ? { ...prev, email: e.target.value } : null)}
                            placeholder="contato@empresa.com.br"
                            className="w-full h-12 md:h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm"
                          />
                        </div>

                        {/* Site */}
                        <div className="space-y-3">
                          <Label>Site / URL</Label>
                          <input
                            type="url"
                            value={(org as any).website || ''}
                            onChange={e => setOrg(prev => prev ? { ...prev, website: e.target.value } as any : null)}
                            placeholder="https://empresa.com.br"
                            className="w-full h-12 md:h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm"
                          />
                        </div>

                        {/* Endereço */}
                        <div className="space-y-3 col-span-full">
                          <Label>Endereço Administrativo</Label>
                          <input
                            type="text"
                            value={org.address || ''}
                            onChange={e => setOrg(prev => prev ? { ...prev, address: e.target.value } : null)}
                            placeholder="Rua, Número, Bairro, Cidade - UF"
                            className="w-full h-12 md:h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm"
                          />
                        </div>

                      </div>
                      <div className="pt-4 border-t border-slate-50 flex justify-center md:justify-end">
                        <Button className="w-full md:w-auto h-12 md:h-14 px-12 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                          Salvar Dados da Org
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-8 border-dashed border-2 border-slate-200 text-center flex flex-col items-center justify-center py-20">
                      <Building2 size={48} className="text-slate-300 mb-4" />
                      <p className="text-slate-400 font-bold">Nenhuma organização encontrada para este perfil.</p>
                    </Card>
                  )}
                </div>
              )}

              {activeTab === 'assinaturas' && (
                <div className="space-y-12">
                  {/* CURRENT PLAN HEADER */}
                  <div className="flex flex-col lg:flex-row items-center justify-between p-6 md:p-8 bg-slate-900 rounded-xl md:rounded-2xl text-white relative overflow-hidden shadow-2xl gap-8">
                    <div className="absolute top-0 right-0 w-[400px] h-full bg-primary/20 blur-[100px] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-primary/20 backdrop-blur-xl border border-white/10 flex items-center justify-center text-primary">
                        <Zap size={28} className="fill-primary animate-pulse md:size-8" />
                      </div>
                      <div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Seu Plano Atual</p>
                        <h3 className="text-xl md:text-3xl font-black font-montserrat tracking-tight">
                          {loading ? (
                            <span className="inline-block w-40 h-8 bg-white/10 animate-pulse rounded-lg" />
                          ) : (
                            (org?.plans?.name || 'Free Explorer').replace('iaNow ', '')
                          )}
                        </h3>
                        <div className="flex items-center justify-center md:justify-start gap-3 mt-1">
                          <span className="flex items-center gap-1.5 text-[10px] md:text-xs text-emerald-400 font-bold">
                            <CheckCircle2 size={12} className="md:size-[14px]" /> Ativo e Seguro
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center lg:text-right">
                      <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status da Fatura</p>
                      <p className="font-bold text-sm md:text-base">
                        {org?.plans?.price_monthly && org?.plans?.price_monthly > 0
                          ? `R$ ${Number(org.plans.price_monthly).toFixed(2).replace('.', ',')} / mensal`
                          : 'Sem faturamento recorrente'}
                      </p>
                    </div>
                  </div>

                  {!isPro && org?.id && null}

                  {/* SUBSCRIPTION DASHBOARD GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {plans.map((p) => {
                      const isCurrent = org?.plan_id === p.id;
                      const isProPlan = p.slug === 'pro';
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "group relative flex flex-col items-center text-center transition-all bg-white rounded-2xl md:rounded-3xl overflow-hidden min-h-0 lg:min-h-[520px]",
                            isProPlan
                              ? "border border-primary/20 hover:shadow-2xl border-b-4 border-b-primary shadow-xl shadow-primary/5"
                              : "border border-slate-100 hover:shadow-xl border-b-4 border-b-slate-100 shadow-sm"
                          )}
                        >
                          {isProPlan && (
                            <div className="w-full bg-primary py-2 text-center">
                              <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.2em]">Acesso Total</span>
                            </div>
                          )}

                          <div className={cn("p-6 md:p-8 flex flex-col items-center text-center space-y-6 flex-1 w-full", !isProPlan && "pt-12")}>
                            <div className={cn(
                              "w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shadow-inner",
                              isProPlan ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                            )}>
                              {isProPlan ? <Zap size={20} className="fill-current md:size-6" /> : <User size={20} className="md:size-6" />}
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-lg md:text-xl font-black text-slate-900">{p.name.replace('iaNow ', '')}</h4>
                              <p className="text-[11px] md:text-xs text-slate-400 font-medium px-4">
                                {p.description || (isProPlan ? 'Acesso total ilimitado aos 3 módulos principais do ERP.' : 'Ideal para testar o potencial de execução total da plataforma.')}
                              </p>
                            </div>

                            <div className="text-2xl md:text-3xl font-black text-slate-900">
                              R$ {Number(p.price_monthly).toFixed(2).replace('.', ',')}
                              <span className="text-sm text-slate-400 font-bold tracking-tight">/mês</span>
                            </div>

                            <ul className="w-full text-left space-y-3 pt-4 border-t border-slate-50 flex-1">
                              {p.features?.map((f: string) => (
                                <li key={f} className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold text-slate-700">
                                  <Check className={cn("md:size-[14px]", isProPlan ? "text-primary" : "text-emerald-500")} size={12} /> {f}
                                </li>
                              ))}
                            </ul>

                            <Button
                              type="button"
                              disabled={isCurrent}
                              onClick={() => {
                                if (isProPlan) {
                                  setSelectedPlan(p.id)
                                  setShowCheckout(true)
                                }
                              }}
                              className={cn(
                                "w-full h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                isProPlan
                                  ? "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                                  : "bg-white border border-slate-200 text-slate-400"
                              )}
                            >
                              {isCurrent ? 'Plano Atual' : isProPlan ? 'Assinar Agora' : 'Ativo'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}

                    {/* INVOICES COLUMN */}
                    <div className="p-6 md:p-8 bg-white border border-slate-100 rounded-2xl md:rounded-3xl flex flex-col space-y-6 hover:shadow-xl transition-all border-b-4 border-b-slate-100 min-h-0 lg:min-h-[520px]">
                      <div className="flex items-center">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <CreditCard size={14} /> Faturamentos
                        </h4>
                      </div>

                      <div className="flex-1 space-y-3">
                        {org?.plan_id ? (
                          [
                            { id: '1', date: '07 Abr', val: Number(org?.plans?.price_monthly || 0).toFixed(2).replace('.', ','), status: 'pago' },
                          ].map(inv => (
                            <div key={inv.id} className="p-5 bg-white border border-slate-50 rounded-2xl flex items-center justify-between hover:border-primary/20 transition-all cursor-pointer group shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                  <FileText size={18} />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-900">{inv.date}, 2026</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">R$ {inv.val}</p>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                            </div>
                          ))
                        ) : (
                          <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl text-center flex flex-col items-center space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200">
                              <CreditCard size={24} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-black text-slate-900 uppercase">Nenhuma fatura</p>
                              <p className="text-[10px] text-slate-400 font-medium px-2">As cobranças aparecerão após a assinatura.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* HELPER CARD */}
                      <div className="p-4 md:p-6 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 flex items-start gap-4 mt-auto">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-400 flex-shrink-0">
                          <ShieldCheck size={16} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase leading-none">Checkout Seguro</p>
                          <p className="text-[9px] text-slate-500 leading-relaxed">Blindagem por criptografia Asaas.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'seguranca' && (
                <div className="space-y-6">
                  <SectionTitle title="Segurança da Conta" subtitle="Mantenha seus dados e acessos protegidos" />
                  <Card className="p-8 border-dashed border-2 border-slate-200 text-center flex flex-col items-center justify-center py-20 grayscale opacity-60">
                    <ShieldCheck size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-400 font-bold">Configurações de Segurança e 2FA disponíveis em breve.</p>
                  </Card>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
      {/* CHECKOUT MODAL OVERLAY */}
      {showCheckout && selectedPlan && org && (
        <TransparentCheckoutModal
          demandId={`upgrade_${org?.id}`}
          demandType="mensal"
          value={plans.find(p => p.id === selectedPlan)?.price_monthly || 0}
          description={`Assinatura - ${plans.find(p => p.id === selectedPlan)?.name || 'Pro'}`}
          onSuccess={() => {
            setShowCheckout(false)
            toast.success('Assinatura processada com sucesso!')
            setTimeout(() => {
              window.location.reload()
            }, 2000)
          }}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </DashboardLayout>
  )
}

export default function ConfiguraçõesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ConfiguraçõesPageContent />
    </Suspense>
  )
}
