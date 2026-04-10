'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/shared/Card'
import { Input } from '@/components/shared/Input'
import { Button } from '@/components/shared/Button'
import { Label } from '@/components/shared/Label'
import { Lock, CreditCard as CreditCardIcon, QrCode, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, User, MapPin, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'
import { createTransparentChargeAction } from '@/app/actions/asaas-actions'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type CheckoutStep = 'IDENTIFICATION' | 'ADDRESS' | 'PAYMENT' | 'PIX_CODE' | 'SUCCESS'

interface TransparentCheckoutProps {
  demandId: string
  demandType: 'contrato' | 'estrategia' | 'processo' | 'mensal'
  value: number
  description: string
  onSuccess: () => void
  onClose: () => void
}

export function TransparentCheckoutModal({ demandId, demandType, value, description, onSuccess, onClose }: TransparentCheckoutProps) {
  const [step, setStep] = useState<CheckoutStep>('IDENTIFICATION')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Dados Pessoais
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    cpfCnpj: '',
    mobilePhone: '',
  })

  // Endereço
  const [address, setAddress] = useState({
    postalCode: '',
    street: '',
    addressNumber: '',
    addressComplement: '',
    city: '',
    state: ''
  })
  const [isLoadingCep, setIsLoadingCep] = useState(false)

  // Pagamento
  const [billingType, setBillingType] = useState<'CREDIT_CARD' | 'PIX'>('CREDIT_CARD')
  const [card, setCard] = useState({
    number: '',
    holderName: '',
    expiryDate: '', // MM/YY
    ccv: ''
  })

  // Retorno do Asaas
  const [pixData, setPixData] = useState<{ encodedImage: string, payload: string } | null>(null)

  // Validações
  const canGoToAddress = useMemo(() => customer.name.length > 3 && customer.email.includes('@') && customer.cpfCnpj.length >= 11 && customer.mobilePhone.length >= 10, [customer])
  const canGoToPayment = useMemo(() => address.postalCode.length >= 8 && address.addressNumber.length > 0, [address])
  const canSubmit = useMemo(() => {
    if (billingType === 'PIX') return true
    return card.number.length >= 15 && card.holderName.length > 3 && card.expiryDate.length === 5 && card.ccv.length >= 3
  }, [billingType, card])

  // Busca CEP automático
  useEffect(() => {
    const rawCep = address.postalCode.replace(/\D/g, '')
    if (rawCep.length === 8) {
      setIsLoadingCep(true)
      fetch(`https://viacep.com.br/ws/${rawCep}/json/`)
        .then(res => res.json())
        .then(data => {
          if (!data.erro) {
            setAddress(prev => ({ ...prev, street: data.logradouro, city: data.localidade, state: data.uf }))
          }
        })
        .finally(() => setIsLoadingCep(false))
    }
  }, [address.postalCode])

  const formatCpfCnpj = (v: string) => {
    v = v.replace(/\D/g, "")
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, "$1.$2")
      v = v.replace(/(\d{3})(\d)/, "$1.$2")
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    } else {
      v = v.replace(/^(\d{2})(\d)/, "$1.$2")
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      v = v.replace(/\.(\d{3})(\d)/, ".$1/$2")
      v = v.replace(/(\d{4})(\d)/, "$1-$2")
    }
    return v
  }

  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "")
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2")
    v = v.replace(/(\d)(\d{4})$/, "$1-$2")
    return v
  }

  const formatCardNumber = (v: string) => {
    v = v.replace(/\D/g, "")
    v = v.replace(/(\d{4})/g, "$1 ").trim()
    return v
  }

  const formatExpiry = (v: string) => {
    v = v.replace(/\D/g, "")
    if (v.length >= 2) {
      v = v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      let expiryMonth = '', expiryYear = ''
      if (billingType === 'CREDIT_CARD') {
        const [m, y] = card.expiryDate.split('/')
        expiryMonth = m
        expiryYear = y
      }

      const payload = {
        demandId,
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj.replace(/\D/g, ''),
        mobilePhone: customer.mobilePhone.replace(/\D/g, ''),
        postalCode: address.postalCode.replace(/\D/g, ''),
        addressNumber: address.addressNumber,
        addressComplement: address.addressComplement,
        billingType,
        value,
        description,
        ...(billingType === 'CREDIT_CARD' ? {
          creditCard: {
            holderName: card.holderName,
            number: card.number.replace(/\D/g, ''),
            expiryMonth,
            expiryYear,
            ccv: card.ccv
          }
        } : {})
      }

      const result = await createTransparentChargeAction(payload)

      if (!result.success) {
        throw new Error(result.error)
      }

      if (billingType === 'PIX' && result.pix) {
        setPixData(result.pix)
        setStep('PIX_CODE')
      } else {
        // Sucesso no Cartão de Crédito
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          toast.error('Pagamento aprovado! Por favor, faça login para acessar.')
          router.push('/login')
        } else {
          setStep('SUCCESS')
          setTimeout(() => {
            onSuccess()
          }, 2000)
        }
      }

    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pagamento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyPixLine = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload)
      toast.success('Código PIX copiado!')
      // Mock de verificação (em um ambiente real, deve haver Webhook)
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
        } else {
          setStep('SUCCESS')
          setTimeout(() => onSuccess(), 2000)
        }
      }, 5000)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <Card className="w-full max-w-xl bg-white border-0 shadow-2xl rounded-[24px] md:rounded-[32px] overflow-hidden flex flex-col relative my-auto">

        {/* Header Yampi Style */}
        <div className="bg-slate-50 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Lock size={18} className="text-emerald-500" /> Checkout Seguro
            </h3>
            <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Fechar ✕</button>
          </div>

          {/* Progress Bar */}
          {(step !== 'SUCCESS' && step !== 'PIX_CODE') && (
            <div className="flex items-center gap-2 pt-2">
              <div className={cn("h-1.5 flex-1 rounded-full", step !== 'IDENTIFICATION' ? "bg-emerald-500" : "bg-primary")} />
              <div className={cn("h-1.5 flex-1 rounded-full", step === 'ADDRESS' ? "bg-primary" : step === 'PAYMENT' ? "bg-emerald-500" : "bg-slate-200")} />
              <div className={cn("h-1.5 flex-1 rounded-full", step === 'PAYMENT' ? "bg-primary" : "bg-slate-200")} />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex flex-col gap-6">

          {/* STEP 1: IDENTIFICATION */}
          {step === 'IDENTIFICATION' && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 mt-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><User size={16} /></div>
                <div>
                  <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Identificação</h4>
                  <p className="text-[11px] font-bold text-slate-400">Seus dados para emissão da nota e acesso</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nome Completo / Razão" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Seu nome completo" required />
                <Input label="E-mail" type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} placeholder="seu@email.com" required />
                <Input label="CPF/CNPJ" value={customer.cpfCnpj} onChange={e => setCustomer({ ...customer, cpfCnpj: formatCpfCnpj(e.target.value) })} placeholder="000.000.000-00" maxLength={18} required />
                <Input label="WhatsApp" value={customer.mobilePhone} onChange={e => setCustomer({ ...customer, mobilePhone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" maxLength={15} required />
              </div>

              <Button disabled={!canGoToAddress} onClick={() => setStep('ADDRESS')} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest mt-2 flex items-center justify-center gap-2 group">
                Continuar para Endereço <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}

          {/* STEP 2: ADDRESS */}
          {step === 'ADDRESS' && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 mt-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><MapPin size={16} /></div>
                  <div>
                    <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Endereço</h4>
                    <p className="text-[11px] font-bold text-slate-400">Necessário para cobrança antifraude</p>
                  </div>
                </div>
                <button onClick={() => setStep('IDENTIFICATION')} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={16} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Input label="CEP" value={address.postalCode} onChange={e => setAddress({ ...address, postalCode: e.target.value.replace(/\D/g, '') })} placeholder="00000-000" maxLength={8} required />
                  {isLoadingCep && <span className="text-[9px] text-primary font-bold mt-1 block">Buscando...</span>}
                </div>
                <div className="md:col-span-2">
                  <Input label="Rua / Logradouro" value={address.street} disabled className="bg-slate-50" placeholder="..." />
                </div>
                <div className="md:col-span-1">
                  <Input label="Número" value={address.addressNumber} onChange={e => setAddress({ ...address, addressNumber: e.target.value })} placeholder="Ex: 123" required />
                </div>
                <div className="md:col-span-2">
                  <Input label="Complemento (Opcional)" value={address.addressComplement} onChange={e => setAddress({ ...address, addressComplement: e.target.value })} placeholder="Apto, Sala, Bloco..." />
                </div>
              </div>

              <Button disabled={!canGoToPayment} onClick={() => setStep('PAYMENT')} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest mt-2 flex items-center justify-center gap-2 group">
                Ir para o Pagamento <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}

          {/* STEP 3: PAYMENT */}
          {step === 'PAYMENT' && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 mt-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><CreditCardIcon size={16} /></div>
                  <div>
                    <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Pagamento</h4>
                    <p className="text-[11px] font-bold text-slate-400">Total a pagar: R$ {value.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
                <button onClick={() => setStep('ADDRESS')} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={16} /></button>
              </div>

              {/* Payment Methods Tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                <button onClick={() => setBillingType('CREDIT_CARD')} className={cn("flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all", billingType === 'CREDIT_CARD' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>
                  <CreditCardIcon size={14} /> Cartão
                </button>
                <button onClick={() => setBillingType('PIX')} className={cn("flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all", billingType === 'PIX' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>
                  <QrCode size={14} /> PIX
                </button>
              </div>

              {billingType === 'CREDIT_CARD' && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-4 animate-in fade-in">
                  <Input label="Número do Cartão" value={card.number} onChange={e => setCard({ ...card, number: formatCardNumber(e.target.value) })} placeholder="0000 0000 0000 0000" maxLength={19} />
                  <Input label="Nome no Cartão" value={card.holderName} onChange={e => setCard({ ...card, holderName: e.target.value.toUpperCase() })} placeholder="NOME IMPRESSO NO CARTÃO" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Validade" value={card.expiryDate} onChange={e => setCard({ ...card, expiryDate: formatExpiry(e.target.value) })} placeholder="MM/AA" maxLength={5} />
                    <Input label="CVV" value={card.ccv} onChange={e => setCard({ ...card, ccv: e.target.value.replace(/\D/g, '') })} placeholder="123" maxLength={4} type="password" />
                  </div>
                </div>
              )}

              {billingType === 'PIX' && (
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex flex-col gap-3 animate-in fade-in text-center items-center">
                  <QrCode size={32} className="text-emerald-500" />
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-black text-emerald-900 uppercase">Pague via PIX</h4>
                    <p className="text-xs text-emerald-700/80 font-bold">Liberação instantânea após o pagamento pelo QRCode.</p>
                  </div>
                </div>
              )}

              <Button disabled={!canSubmit} isLoading={isSubmitting} onClick={handleSubmit} className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                <Lock size={16} className="text-emerald-100" /> Pagar Agora
              </Button>
            </div>
          )}

          {/* STEP 4: PIX CODE */}
          {step === 'PIX_CODE' && pixData && (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 items-center text-center mt-4">
              <div className="w-16 h-16 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500">
                <QrCode size={32} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-black text-slate-900 leading-tight">Finalize seu Pagamento</h3>
                <p className="text-sm text-slate-500 font-bold">Escaneie o QRCode abaixo com o app do seu banco.</p>
              </div>

              <div className="p-2 bg-white border-2 border-slate-100 rounded-[24px] overflow-hidden shrink-0">
                <Image src={`data:image/jpeg;base64,${pixData.encodedImage}`} alt="QRCode PIX" width={200} height={200} className="w-40 h-40 md:w-48 md:h-48" />
              </div>

              <div className="w-full flex flex-col gap-3">
                <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-left px-2">Ou copie o código (Pix Copia e Cola)</p>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] text-slate-500 font-mono break-all line-clamp-2 max-h-[3.5rem] overflow-hidden text-left">
                    {pixData.payload}
                  </div>
                  <Button onClick={copyPixLine} className="w-full sm:w-auto h-12 sm:h-14 shrink-0 rounded-xl text-[11px] uppercase font-black tracking-widest px-6 bg-emerald-500 hover:bg-emerald-600 text-white">
                    Copiar Código
                  </Button>
                </div>
              </div>

              <p className="text-[10px] text-amber-500 font-bold bg-amber-50 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 w-full">
                <span className="w-2 h-2 shrink-0 rounded-full bg-amber-500 animate-pulse" />
                Aguardando verificação do pagamento...
              </p>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 items-center text-center mt-4">
              <div className="w-24 h-24 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40">
                <CheckCircle2 size={48} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Pagamento Aprovado!</h3>
                <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                  Sua demanda foi desbloqueada com sucesso e já está disponível para acesso.
                </p>
              </div>
              <div className="w-10 h-10 shrink-0 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin" />
            </div>
          )}


        </div>

        {/* Footer */}
        <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex items-center justify-center gap-2 opacity-60">
          <ShieldCheck size={14} className="text-slate-400" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Pagamento Seguro 256-bit SSL</span>
        </div>
      </Card>
    </div>
  )
}
