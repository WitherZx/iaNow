'use client'

import React, { useState, useEffect } from 'react'
import { Search, User, Building2, Check, ChevronDown, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/utils/cn'
import { Label } from '@/components/shared/Label'

interface Partner {
  id: string
  name: string
  type: 'pf' | 'pj'
  document: string
  email: string
  phone: string
  address: string
  isDefault?: boolean
  metadata?: any
}

interface PartnerSelectorProps {
  label: string
  onSelect: (partner: any) => void
  selectedId?: string
  placeholder?: string
  className?: string
}

export function PartnerSelector({ label, onSelect, selectedId, placeholder = "Selecione um parceiro...", className }: PartnerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    checkSession()
  }, [supabase])

  useEffect(() => {
    async function loadPartners() {
      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }

        // 1. Fetch Membership
        const { data: membership } = await supabase
          .from('memberships')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle() as any

        if (!membership) {
          setLoading(false)
          return
        }

        const orgId = membership.organization_id

        // 2. Fetch Organization Info (Profile Matriz)
        const { data: orgInfo } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single() as any

        if (!orgInfo) {
          throw new Error('Organization not found')
        }

        // Profile Matriz (The organization itself)
        const matriz: Partner = {
          id: orgInfo.id,
          name: orgInfo.name,
          type: (orgInfo.metadata as any)?.tipo || 'pj',
          document: (orgInfo.metadata as any)?.documento || orgInfo.document || '',
          email: (orgInfo.metadata as any)?.email || orgInfo.email || session.user.email || '',
          phone: (orgInfo.metadata as any)?.telefone || orgInfo.phone || '',
          address: (orgInfo.metadata as any)?.endereco || orgInfo.address || '',
          isDefault: true,
          metadata: orgInfo.metadata
        }

        // 2. Fetch Partners (Filtered by Organization)
        const { data: partnersData, error: partnersError } = await supabase
          .from('partners')
          .select('*')
          .eq('organization_id', orgId)
          .order('name')

        if (partnersError) throw partnersError

        const mappedPartners: Partner[] = (partnersData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          type: (p.metadata as any)?.tipo || 'pf',
          document: (p.metadata as any)?.documento || '',
          email: p.contact_email || '',
          phone: (p.metadata as any)?.contato?.telefone || (p.metadata as any)?.telefone || '',
          address: (p.metadata as any)?.logradouro || (p.metadata as any)?.endereco || '',
          metadata: p.metadata
        }))

        // Combined list: Matriz + Partners
        setPartners([matriz, ...mappedPartners])
      } catch (err) {
        console.error('Error loading partners for selector:', err)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen || (selectedId && selectedId !== 'manual')) loadPartners()
  }, [isOpen, hasSession, supabase, selectedId])

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.document.includes(searchTerm)
  )

  // Auto-resolve non-uuid names from AI predictions
  useEffect(() => {
    if (selectedId && selectedId !== 'manual' && partners.length > 0) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedId);
      if (!isUuid) {
        const match = partners.find(p => p.name.toLowerCase() === selectedId.toLowerCase() || p.name.toLowerCase().includes(selectedId.toLowerCase()));
        if (match) {
          // Wrap in slight timeout to prevent React update loops during render
          setTimeout(() => onSelect(match), 0)
        }
      }
    }
  }, [selectedId, partners])

  let selectedPartner: Partner | undefined = partners.find(p => p.id === selectedId)
  if (selectedId && selectedId !== 'manual' && !selectedPartner) {
     // Se tiver um ID/Nome que ainda não foi carregado
     selectedPartner = { id: selectedId, name: selectedId, document: 'Preenchendo via AI...', type: 'pf', email: '', phone: '', address: '' }
  } else if (selectedId === 'manual') {
    selectedPartner = { id: 'manual', name: 'Inserção Manual', document: 'Preenchimento abaixo', type: 'pf', email: '', phone: '', address: '' }
  }

  return (
    <div className={cn("flex flex-col gap-y-3 relative", className)}>
      <Label>{label}</Label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full p-4 rounded-2xl bg-white border-2 flex items-center justify-between transition-all outline-none",
          isOpen ? "border-primary ring-4 ring-primary/5 shadow-lg" : "border-slate-200 hover:border-slate-300 shadow-sm"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {selectedPartner ? (
            <>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", selectedPartner.id === 'manual' ? "bg-amber-100 text-amber-600" : selectedPartner.isDefault ? "bg-primary text-white" : "bg-slate-100 text-slate-500")}>
                {selectedPartner.id === 'manual' ? <UserPlus size={16} /> : selectedPartner.type === 'pj' ? <Building2 size={16} /> : <User size={16} />}
              </div>
              <div className="flex flex-col items-start leading-tight min-w-0 flex-1">
                <span className="text-[13px] sm:text-sm font-bold text-slate-900 truncate w-full block text-left">{selectedPartner.name}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase truncate w-full block text-left">{selectedPartner.document || '--'}</span>
              </div>
            </>
          ) : (
            <span className="text-[13px] sm:text-sm font-bold text-slate-400 truncate block flex-1 text-left">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={18} className={cn("text-slate-400 transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {hasSession && (
            <div className="p-3 bg-slate-50/50 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  autoFocus
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar contato..."
                  className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>
          )}

          <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-2">
            {loading ? (
              <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Buscando contatos...</div>
            ) : (
              <div className="space-y-1">
                {hasSession && filteredPartners.length > 0 && filteredPartners.map(partner => (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => {
                      onSelect(partner)
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all group",
                      selectedId === partner.id ? "bg-primary/5 shadow-inner" : "hover:bg-slate-50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3 text-left overflow-hidden">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                        selectedId === partner.id ? "bg-primary text-white" : "bg-white border border-slate-100 text-slate-400 group-hover:border-primary/20 group-hover:text-primary"
                      )}>
                        {partner.type === 'pj' ? <Building2 size={18} /> : <User size={18} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-black truncate", selectedId === partner.id ? "text-primary" : "text-slate-900")}>
                            {partner.name}
                          </span>
                          {partner.isDefault && (
                            <span className="text-[8px] font-black bg-primary text-white px-1.5 py-0.5 rounded-md shrink-0">MATRIZ</span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">{partner.document || 'Sem documento'}</span>
                      </div>
                    </div>
                    {selectedId === partner.id && <Check size={16} className="text-primary shrink-0" />}
                  </button>
                ))}
                
                {hasSession && filteredPartners.length === 0 && (
                  <div className="py-4 text-center">
                    <p className="text-slate-400 font-bold text-xs">Nenhum contato encontrado.</p>
                  </div>
                )}

                <div className={cn("pt-2 mt-2", hasSession && "border-t border-slate-100")}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect({ id: 'manual', name: '', document: '', type: 'pf' })
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all group",
                      selectedId === 'manual' ? "bg-amber-100/50 shadow-inner" : "hover:bg-slate-50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3 text-left overflow-hidden">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                        selectedId === 'manual' ? "bg-amber-100 text-amber-600 border border-amber-200" : "bg-white border border-slate-200 text-slate-500 group-hover:text-amber-600 group-hover:border-amber-200"
                      )}>
                        <UserPlus size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={cn("text-sm font-black truncate", selectedId === 'manual' ? "text-amber-700" : "text-slate-900 group-hover:text-amber-700")}>
                          Inserir Manualmente
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate group-hover:text-amber-600/70">
                          Digitar dados apenas para este caso
                        </span>
                      </div>
                    </div>
                    {selectedId === 'manual' && <Check size={16} className="text-amber-600 shrink-0" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
