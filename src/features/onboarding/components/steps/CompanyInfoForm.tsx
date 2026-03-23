import { useState } from 'react'
import { Loader2, ArrowRight, Building2, User, CheckCircle2 } from 'lucide-react'
import { Label } from '@/components/shared/Label'
import { cn } from '@/utils/cn'

interface StepProps {
  step: any
  onSubmit: (data: any) => void
  loading: boolean
}

export function CompanyInfoForm({ step, onSubmit, loading }: StepProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'pj' as 'pf' | 'pj',
    document: '',
    email: '',
    phone: '',
    website: '',
  })

  const formatDocument = (val: string, type: 'pf' | 'pj') => {
    const digits = val.replace(/\D/g, '')
    if (type === 'pf') {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14)
    }
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
      .slice(0, 18)
  }

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '')
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 14)
    }
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const isFormValid = formData.name.trim() && formData.document.trim() && formData.email.trim()

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 text-center md:text-left">
        <div className="mx-auto md:mx-0 w-14 h-14 bg-primary/10 text-primary border border-primary/20 rounded-2xl flex items-center justify-center mb-2 shadow-sm">
          {formData.type === 'pj' ? <Building2 className="w-7 h-7" /> : <User className="w-7 h-7" />}
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          {formData.type === 'pj' ? 'Dados da Empresa' : 'Seu Perfil'}
        </h2>
        <p className="text-slate-500 text-lg font-medium">
          {formData.type === 'pj' 
            ? 'Dados fundamentais da sua organização.' 
            : 'Suas informações básicas de identificação.'}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Type Selector */}
        <div className="grid grid-cols-2 gap-4 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
          <button 
            type="button"
            onClick={() => setFormData({...formData, type: 'pj'})}
            className={cn(
              "flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
              formData.type === 'pj' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Building2 size={16} /> Pessoa Jurídica
          </button>
          <button 
            type="button"
            onClick={() => setFormData({...formData, type: 'pf'})}
            className={cn(
              "flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
              formData.type === 'pf' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <User size={16} /> Pessoa Física
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2.5 md:col-span-2">
            <Label htmlFor="name" required tooltip={formData.type === 'pj' ? "Nome da empresa ou Razão Social conforme consta no registro legal." : "Seu nome completo."}>
              {formData.type === 'pj' ? 'Nome / Razão Social' : 'Nome Completo'}
            </Label>
            <input
              id="name"
              required
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={formData.type === 'pj' ? "Ex: Minha Empresa Ltda" : "Ex: João Silva"}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label htmlFor="document" required tooltip={formData.type === 'pj' ? "CNPJ para empresas." : "Seu CPF."}>
              {formData.type === 'pj' ? 'CNPJ' : 'CPF'}
            </Label>
            <input
              id="document"
              required
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
              value={formData.document}
              onChange={(e) => setFormData({ ...formData, document: formatDocument(e.target.value, formData.type) })}
              placeholder={formData.type === 'pj' ? "00.000.000/0001-00" : "000.000.000-00"}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label htmlFor="email" required tooltip="E-mail principal para contato e notificações do sistema.">
              E-mail Institucional
            </Label>
            <input
              id="email"
              type="email"
              required
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contato@empresa.com"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label htmlFor="phone" tooltip={formData.type === 'pj' ? "Telefone de contato da empresa." : "Seu telefone de contato."}>
              Telefone
            </Label>
            <input
              id="phone"
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label htmlFor="website" tooltip={formData.type === 'pj' ? "Site oficial da sua empresa." : "Seu site ou perfil profissional."}>
              Website <span className="text-slate-400 font-normal">(Opcional)</span>
            </Label>
            <input
              id="website"
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder={formData.type === 'pj' ? "www.empresa.com.br" : "www.linkedin.com/in/voce"}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !isFormValid}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-white font-bold text-lg hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)]"
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
          <>Próxima Etapa <ArrowRight className="w-5 h-5" /></>
        )}
      </button>
    </form>
  )
}
