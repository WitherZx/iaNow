'use client'

import React, { useState, Suspense } from 'react'
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
  CheckCircle2
} from 'lucide-react'
import { SectionTitle } from '@/components/shared/SectionTitle'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { Label } from '@/components/shared/Label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { upgradeToProAction } from '@/app/actions/asaas-actions'

function ConfiguraçõesPageContent() {
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'perfil')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [org, setOrg] = useState<any>(null)
  const isPro = org?.plan_id === '38ea6933-f519-40d7-8e3e-1ff70ab53293'

  const handleUpgrade = async () => {
    if (!org?.id) return
    
    try {
      setIsUpgrading(true)
      const promise = upgradeToProAction(org.id, '38ea6933-f519-40d7-8e3e-1ff70ab53293') 
      
      toast.promise(promise, {
        loading: 'Iniciando checkout seguro...',
        success: (res: any) => {
          if (res.success && res.checkoutUrl) {
            window.location.href = res.checkoutUrl
            return 'Redirecionando para o pagamento...'
          }
          throw new Error(res.error || 'Erro interno')
        },
        error: (err) => `Erro: ${err.message}`
      })

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsUpgrading(false)
    }
  }

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
    avatar_url: ''
  })

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) return
      
      try {
        setLoading(true)
        
        const user = session.user

        // Fetch Membership/Org
        const { data: membership } = await supabase
          .from('memberships')
          .select('organization_id, organizations(*)')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle() as any
        
        if (membership?.organizations) {
          const orgData = membership.organizations
          const meta = orgData.metadata || {}
          
          setOrg({
            ...orgData,
            document: meta.documento || orgData.document,
            address: meta.endereco || orgData.address,
            phone: meta.telefone || orgData.phone
          })

          // Map representative legal to profile if it matches or as default
          if (meta.representante_legal) {
            setProfile(prev => ({
              ...prev,
              nome: meta.representante_legal.nome || user.user_metadata?.full_name || prev.nome,
              email: user.email || '',
              cargo: meta.representante_legal.cargo || prev.cargo,
              telefone: meta.telefone || prev.telefone // Fallback to org phone
            }))
          } else {
             setProfile(prev => ({
              ...prev,
              nome: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
              email: user.email || '',
            }))
          }
        }
      } catch (err) {
        console.error('Error loading config:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [session, supabase])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Logic to update user metadata
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profile.nome }
      })
      if (error) throw error
      toast.success('Perfil atualizado com sucesso!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    { id: 'org', label: 'Organização', icon: Building2 },
    { id: 'assinaturas', label: 'Assinaturas', icon: CreditCard },
  ]

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f8fafc] -m-8 p-8">
        <PageContainer>
          <div className="flex flex-col gap-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
              {/* SIDEBAR TABS */}
              <aside className="p-4 bg-white/50 backdrop-blur-sm rounded-[40px] border border-slate-200/60 h-fit space-y-2 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 mb-2">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configurações</h2>
                </div>
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 group",
                        active 
                          ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                          : "text-slate-500 hover:bg-white hover:text-primary hover:shadow-sm"
                      )}
                    >
                      <Icon size={20} className={cn(active ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                      <span className="font-bold text-sm">{tab.label}</span>
                    </button>
                  )
                })}

              <div className="mt-8 p-6 rounded-3xl bg-white border border-slate-100 space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano Atual</p>
                    <p className="text-sm font-bold text-slate-900">{org?.plan_id ? 'Enterprise' : 'Free Explorer'}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('assinaturas')}
                  className="w-full text-[10px] font-black uppercase tracking-widest h-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Gerenciar Assinatura
                </Button>
              </div>
            </aside>

            {/* TAB CONTENT */}
            <main className="flex flex-col gap-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {activeTab === 'perfil' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-8">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-[40px] bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={64} className="text-slate-300" />
                        )}
                      </div>
                      <button className="absolute bottom-1 right-1 w-10 h-10 rounded-2xl bg-primary text-white border-4 border-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                        <Camera size={18} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{profile.nome}</h2>
                      <p className="text-slate-500 font-medium">{profile.email}</p>
                      <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 mt-2">{profile.cargo}</span>
                    </div>
                  </div>

                  <Card className="bg-white border-slate-100 shadow-sm p-8">
                    <form onSubmit={handleSaveProfile} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label>Nome Completo</Label>
                          <input 
                            type="text" 
                            value={profile.nome} 
                            onChange={e => setProfile({...profile, nome: e.target.value})}
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm placeholder:text-slate-400" 
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Email Profissional</Label>
                          <input 
                            type="email" 
                            disabled
                            value={profile.email} 
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 opacity-60 font-bold text-slate-900 outline-none shadow-sm cursor-not-allowed" 
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Telefone / WhatsApp</Label>
                          <input 
                            type="text" 
                            value={profile.telefone} 
                            onChange={e => setProfile({...profile, telefone: e.target.value})}
                            placeholder="+55 (41) 98877-6655"
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm placeholder:text-slate-400" 
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Cargo</Label>
                          <input 
                            type="text" 
                            value={profile.cargo} 
                            onChange={e => setProfile({...profile, cargo: e.target.value})}
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm placeholder:text-slate-400" 
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex justify-end">
                        <Button type="submit" isLoading={saving} className="h-14 px-12 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar Alterações
                        </Button>
                      </div>
                    </form>
                  </Card>
                </div>
              )}

              {activeTab === 'notificacoes' && (
                <div className="space-y-6">
                  <SectionTitle title="Notificações" subtitle="Controle como você recebe alertas e atualizações" />
                  <Card className="bg-white border-slate-100 shadow-sm p-4 divide-y divide-slate-50">
                    {[
                      { title: 'Alertas de Compliance', desc: 'Receba avisos quando um documento perder conformidade.', icon: ShieldCheck },
                      { title: 'Relatórios Mensais', desc: 'Envio automático do consolidado de performance no fim do mês.', icon: Bell },
                      { title: 'Novo Diagnóstico IA', desc: 'Seja notificado quando um novo plano estratégico estiver pronto.', icon: Zap },
                      { title: 'Acessos de Segurança', desc: 'Alertas de logins novos ou de dispositivos desconhecidos.', icon: Mail },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-6 px-4 hover:bg-slate-50/50 transition-all rounded-2xl first:rounded-b-none last:rounded-t-none">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <item.icon size={20} />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
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
                    <Card className="bg-white border-slate-100 shadow-sm p-8 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label>Nome da Organização</Label>
                          <input 
                            type="text" 
                            value={org.name || ''}
                            onChange={e => setOrg({...org, name: e.target.value})}
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm" 
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>CNPJ / Identificação</Label>
                          <input 
                            type="text" 
                            value={org.document || ''}
                            onChange={e => setOrg({...org, document: e.target.value})}
                            placeholder="00.000.000/0001-00"
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm" 
                          />
                        </div>
                        <div className="space-y-3 col-span-full">
                          <Label>Endereço Administrativo</Label>
                          <input 
                            type="text" 
                            value={org.address || ''}
                            onChange={e => setOrg({...org, address: e.target.value})}
                            placeholder="Rua, Número, Bairro, Cidade - UF"
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none shadow-sm" 
                          />
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-50 flex justify-end">
                        <Button className="h-14 px-12 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
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
                  <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-slate-900 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-[400px] h-full bg-primary/20 blur-[100px] pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-6">
                      <div className="w-16 h-16 rounded-3xl bg-primary/20 backdrop-blur-xl border border-white/10 flex items-center justify-center text-primary">
                        <Zap size={32} className="fill-primary animate-pulse" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Seu Plano Atual</p>
                        <h3 className="text-3xl font-black font-montserrat tracking-tight">
                          {org?.plan_id ? 'Enterprise Evolution' : 'iaNow Free Explorer'}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                            <CheckCircle2 size={14} /> Ativo e Seguro
                          </span>
                          {!org?.plan_id && (
                            <span className="text-xs text-slate-500 font-medium">• 14 dias restantes no teste</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10 mt-8 md:mt-0">
                       <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Próxima Fatura</p>
                          <p className="font-bold">{org?.plan_id ? 'R$ 49,90 em 15/04' : 'Upgrade Necessário'}</p>
                       </div>
                    </div>
                  </div>

                  {/* SUBSCRIPTION DASHBOARD GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {/* FREE */}
                    <div className="p-8 bg-white border border-slate-100 rounded-[40px] flex flex-col items-center text-center space-y-6 hover:shadow-xl transition-all border-b-4 border-b-slate-100 min-h-[520px]">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <User size={24} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-black text-slate-900">Free</h4>
                        <p className="text-xs text-slate-400 font-medium px-4">Ideal para testar o potencial de execução total da iaNow.</p>
                      </div>
                      <div className="text-3xl font-black text-slate-900">R$ 0<span className="text-sm text-slate-400 font-bold tracking-tight">/mês</span></div>
                      <ul className="w-full text-left space-y-3 pt-4 border-t border-slate-50 flex-1">
                        {[
                          '1 Geração de Estratégia', 
                          '1 Geração Jurídica (Contrato)', 
                          '1 Protocolo Jus Postulandi',
                          'Visualização completa'
                        ].map(f => (
                          <li key={f} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                            <Check className="text-emerald-500" size={14} /> {f}
                          </li>
                        ))}
                      </ul>
                      <Button variant="outline" disabled className="w-full h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-50">Plano Atual</Button>
                    </div>

                    {/* PRO */}
                    <div className="bg-white border border-primary/20 rounded-[40px] flex flex-col items-center text-center hover:shadow-2xl transition-all border-b-4 border-b-primary shadow-xl shadow-primary/5 relative overflow-hidden group min-h-[520px]">
                      <div className="w-full bg-primary py-2.5 text-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Acesso Total</span>
                      </div>
                      
                      <div className="p-8 flex flex-col items-center text-center space-y-6 flex-1 w-full">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                          <Zap size={24} className="fill-primary" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl font-black text-slate-900">Plano Pro</h4>
                          <p className="text-xs text-slate-400 font-medium px-4">Acesso total ilimitado aos 3 módulos principais do ERP iaNow.</p>
                        </div>
                        <div className="text-3xl font-black text-slate-900">R$ 49,90<span className="text-sm text-slate-400 font-bold tracking-tight">/mês</span></div>
                        <ul className="w-full text-left space-y-3 pt-4 border-t border-slate-50 flex-1">
                          {[
                            'Estratégia Ilimitada', 
                            'Jurídico (Contratos) Ilimitado', 
                            'Jus Postulandi Express Ilimitado', 
                            'Suporte Prioritário 24h'
                          ].map(f => (
                            <li key={f} className="flex items-center gap-2 text-[11px] font-bold text-slate-900">
                              <Check className="text-primary" size={14} /> {f}
                            </li>
                          ))}
                        </ul>
                        <Button className="w-full h-12 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Assinar Agora</Button>
                      </div>
                    </div>

                    {/* INVOICES COLUMN */}
                    <div className="p-8 bg-white border border-slate-100 rounded-[40px] flex flex-col space-y-6 hover:shadow-xl transition-all border-b-4 border-b-slate-100 min-h-[520px]">
                      <div className="flex items-center">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <CreditCard size={14} /> Faturas Recentes
                        </h4>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        {org?.plan_id ? (
                          [
                            { id: '1', date: '15 Mar', val: '49,90', status: 'pago' },
                            { id: '2', date: '15 Fev', val: '49,90', status: 'pago' },
                          ].map(inv => (
                            <div key={inv.id} className="p-5 bg-white border border-slate-50 rounded-[32px] flex items-center justify-between hover:border-primary/20 transition-all cursor-pointer group shadow-sm">
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
                          <div className="py-12 border-2 border-dashed border-slate-100 rounded-[40px] text-center flex flex-col items-center space-y-4">
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
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex items-start gap-4 mt-auto">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-400 flex-shrink-0">
                          <ShieldCheck size={16} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-black text-slate-900 uppercase leading-none">Pagamento Seguro</p>
                          <p className="text-[9px] text-slate-500 leading-relaxed">Protegido por criptografia de ponta e processado pelo Asaas.</p>
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
      </PageContainer>
    </div>
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
