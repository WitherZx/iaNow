'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Plus, Check, Send } from 'lucide-react'
import { cn } from '@/utils/cn'
import { FormSelect } from '@/components/shared/FormSelect'
import { PartnerSelector } from '@/components/shared/PartnerSelector'
import { formatCpf, formatCnpj, formatDoc, formatGenericDocument } from '@/utils/formatters'
import { WizardField } from '@/types/minerva'

interface AutoExpandingTextareaProps {
  value: string
  onChange: (val: string) => void
  placeholder: string
  disabled: boolean
}

const AutoExpandingTextarea: React.FC<AutoExpandingTextareaProps> = ({
  value,
  onChange,
  placeholder,
  disabled
}) => {
  const ref = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = () => {
    const target = ref.current
    if (target) {
      target.style.height = 'auto'
      target.style.height = (target.scrollHeight + 2) + 'px'
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300 min-h-[46px] resize-none overflow-hidden"
      disabled={disabled}
    />
  )
}

interface MinervaChatFormProps {
  fields: WizardField[]
  onSubmit: (data: Record<string, string>) => void
  isLastMessage: boolean
  isGuest?: boolean
}

export const MinervaChatForm: React.FC<MinervaChatFormProps> = ({
  fields,
  onSubmit,
  isLastMessage,
  isGuest = false
}) => {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initials: Record<string, string> = {}
    fields.forEach(f => {
      if (f.defaultValue) {
        // Se for campo de contato e o valor não parecer um UUID, assumimos que é um nome para preenchimento manual
        const isUuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(f.defaultValue.replace(/[*_`]/g, ''))
        if (f.isContact && !isUuid) {
          initials[f.id] = 'manual'
          initials[`${f.id}_name`] = f.defaultValue.replace(/[*_`]/g, '')
        } else {
          initials[f.id] = f.defaultValue
        }
      }
      // Se não houver dados no Hub e for um campo de contato sem valor padrão, inicia como manual
      if (f.isContact && !initials[f.id]) initials[f.id] = 'manual'
    })
    return initials
  })

  useEffect(() => {
    setFormData(prev => {
      let changed = false
      const next = { ...prev }
      fields.forEach(f => {
        if (f.defaultValue && !prev[f.id] && f.defaultValue !== '...') {
          next[f.id] = f.defaultValue
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [fields])

  const [isSubmitted, setIsSubmitted] = useState(false)

  const isFormValid = () => {
    return !fields.some(f => {
      if (!formData[f.id]?.trim()) return true;
      if (formData[f.id] === 'manual') {
        const missingBasic = !formData[`${f.id}_name`]?.trim() || !formData[`${f.id}_doc`]?.trim()
        if (missingBasic) return true;
      }
      return false;
    })
  }

  return (
    <div className="mt-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase text-primary tracking-widest">
        <Plus size={12} /> Preencha os campos abaixo
      </div>

      <div className="grid grid-cols-1 gap-4">
        {fields.map(field => (
          <div key={field.id} className="space-y-1.5 flex flex-col">
            {field.isContact ? (
              <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black uppercase text-amber-700 tracking-wider ml-1">
                    Função da Parte no Contrato
                  </label>
                  <input
                    type="text"
                    value={formData[`${field.id}_role`] !== undefined ? formData[`${field.id}_role`] : field.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_role`]: e.target.value }))}
                    placeholder="Ex: Contratante, Prestador de Serviço, Locador..."
                    className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                    disabled={!isLastMessage || isSubmitted}
                  />
                </div>

                <PartnerSelector
                  label="Selecionar Contato do Hub"
                  selectedId={formData[`${field.id}`]}
                  onSelect={(partner) => {
                    if (partner.id === 'manual') {
                      setFormData(prev => ({ ...prev, [field.id]: 'manual' }))
                      return
                    }

                    setFormData(prev => ({
                      ...prev,
                      [field.id]: partner.id,
                      [`${field.id}_name`]: partner.name,
                      [`${field.id}_doc`]: partner.document,
                      [`${field.id}_type`]: (partner.type || partner.metadata?.tipo || 'PJ').toUpperCase(),
                      [`${field.id}_address`]: partner.address || '',
                      [`${field.id}_contact`]: partner.email || partner.phone || '',
                      [`${field.id}_rg`]: partner.metadata?.rg || '',
                      [`${field.id}_nationality`]: partner.metadata?.nacionalidade || partner.metadata?.nationality || '',
                      [`${field.id}_maritalStatus`]: partner.metadata?.estado_civil || partner.metadata?.maritalStatus || '',
                      [`${field.id}_profession`]: partner.metadata?.profissao || partner.metadata?.profession || '',
                      [`${field.id}_representative`]: partner.metadata?.representante?.nome || partner.metadata?.representative || '',
                      [`${field.id}_representativeDoc`]: partner.metadata?.representante?.cpf || partner.metadata?.repDoc || '',
                    }))
                  }}
                  className={cn((!isLastMessage || isSubmitted) && "opacity-60 pointer-events-none")}
                />

                {formData[field.id] === 'manual' && (
                  <>
                    <div className="flex bg-white rounded-xl p-1 border border-amber-200/50 shadow-sm w-full">
                      <button
                        type="button"
                        disabled={!isLastMessage || isSubmitted}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          [`${field.id}_type`]: 'PF',
                          [`${field.id}_doc`]: formatDoc(prev[`${field.id}_doc`] || '', 'PF')
                        }))}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                          (!formData[`${field.id}_type`] || formData[`${field.id}_type`] === 'PF')
                            ? "bg-amber-100 text-amber-800 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Pessoa Física
                      </button>
                      <button
                        type="button"
                        disabled={!isLastMessage || isSubmitted}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          [`${field.id}_type`]: 'PJ',
                          [`${field.id}_doc`]: formatDoc(prev[`${field.id}_doc`] || '', 'PJ')
                        }))}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                          formData[`${field.id}_type`] === 'PJ'
                            ? "bg-amber-100 text-amber-800 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Pessoa Jurídica
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">
                          {formData[`${field.id}_type`] === 'PJ' ? 'Razão Social' : 'Nome Completo'}
                        </label>
                        <input
                          type="text"
                          value={formData[`${field.id}_name`] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_name`]: e.target.value }))}
                          placeholder={formData[`${field.id}_type`] === 'PJ' ? 'Empresa LTDA...' : 'Nome do contato...'}
                          className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          disabled={!isLastMessage}
                        />
                      </div>

                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">
                          {formData[`${field.id}_type`] === 'PJ' ? 'CNPJ' : 'CPF'}
                        </label>
                        <input
                          type="text"
                          value={formData[`${field.id}_doc`] || ''}
                          onChange={(e) => setFormData(prev => {
                            const pType = (prev[`${field.id}_type`] as 'PF' | 'PJ') || 'PF'
                            return {
                              ...prev,
                              [`${field.id}_doc`]: formatDoc(e.target.value, pType)
                            }
                          })}
                          placeholder={formData[`${field.id}_type`] === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                          className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          disabled={!isLastMessage}
                        />
                      </div>

                      {formData[`${field.id}_type`] === 'PJ' && (
                        <>
                          <div className="space-y-1.5 flex flex-col">
                            <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">Nome do Rep. Legal (Opcional)</label>
                            <input
                              type="text"
                              value={formData[`${field.id}_rep_name`] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_rep_name`]: e.target.value }))}
                              placeholder="Nome do Sócio/Diretor (Se souber)..."
                              className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                              disabled={!isLastMessage}
                            />
                          </div>
                          <div className="space-y-1.5 flex flex-col">
                            <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">CPF do Rep. Legal (Opcional)</label>
                            <input
                              type="text"
                              value={formData[`${field.id}_rep_doc`] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_rep_doc`]: formatCpf(e.target.value) }))}
                              placeholder="000.000.000-00"
                              className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                              disabled={!isLastMessage || isSubmitted}
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">E-mail / Telefone (Opcional)</label>
                        <input
                          type="text"
                          value={formData[`${field.id}_contact`] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_contact`]: e.target.value }))}
                          placeholder="contato@exemplo.com ou (11) 9..."
                          className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          disabled={!isLastMessage || isSubmitted}
                        />
                      </div>

                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">Endereço Completo (Opcional)</label>
                        <input
                          type="text"
                          value={formData[`${field.id}_address`] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_address`]: e.target.value }))}
                          placeholder="Rua, Número, Bairro, Cidade - UF"
                          className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          disabled={!isLastMessage || isSubmitted}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : field.options ? (
              <FormSelect
                label={field.label}
                value={formData[field.id] || ''}
                onChange={(val) => setFormData(prev => ({ ...prev, [field.id]: val }))}
                options={field.options}
                className={cn((!isLastMessage || isSubmitted) && "opacity-60 pointer-events-none")}
              />
            ) : (
              <>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">{field.label}</label>
                <AutoExpandingTextarea
                  value={formData[field.id] || ''}
                  onChange={(val) => {
                    const finalVal = field.id === 'documentNumber' ? formatGenericDocument(val) : val;
                    setFormData(prev => ({ ...prev, [field.id]: finalVal }))
                  }}
                  placeholder="..."
                  disabled={!isLastMessage || isSubmitted}
                />
              </>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          setIsSubmitted(true)
          onSubmit(formData)
        }}
        disabled={!isLastMessage || isSubmitted || !isFormValid()}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg",
          isSubmitted
            ? "bg-emerald-500 text-white shadow-emerald-200 cursor-default"
            : "bg-primary text-white hover:bg-slate-900 shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
        )}
      >
        {isSubmitted ? (
          <>Informações Enviadas <Check size={12} /></>
        ) : (
          <>Enviar Informações <Send size={12} /></>
        )}
      </button>
    </div>
  )
}
