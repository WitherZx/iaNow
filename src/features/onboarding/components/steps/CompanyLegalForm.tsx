import { useState } from 'react'
import { Loader2, ArrowRight, Gavel, CheckCircle2 } from 'lucide-react'
import { Label } from '@/components/shared/Label'

interface StepProps {
  step: any
  onSubmit: (data: any) => void
  loading: boolean
}

export function CompanyLegalForm({ step, onSubmit, loading }: StepProps) {
  const [formData, setFormData] = useState({
    address: '',
    representative: {
      nome: '',
      cpf: '',
      cargo: '',
    }
  })

  const formatCPF = (val: string) => {
    const digits = val.replace(/\D/g, '')
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const isFormValid = formData.address.trim() && formData.representative.nome.trim() && formData.representative.cpf.trim()

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 text-center md:text-left">
        <div className="mx-auto md:mx-0 w-14 h-14 bg-primary/10 text-primary border border-primary/20 rounded-2xl flex items-center justify-center mb-2 shadow-sm">
          <Gavel className="w-7 h-7" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Identificação e Endereço</h2>
        <p className="text-slate-500 text-lg font-medium">Finalize com seu endereço e dados de identificação legal.</p>
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="address" required tooltip="Seu endereço completo ou sede da empresa. Rua, número, complemento, bairro, cidade e estado.">
            Endereço Completo
          </Label>
          <input
            id="address"
            required
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Ex: Av. Paulista, 1000 - Cj 12, São Paulo - SP"
          />
        </div>

        <div className="p-6 md:p-8 bg-slate-100 border border-slate-200 rounded-[28px] space-y-6 shadow-inner-sm">
          <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 size={16} className="text-primary" /> Titular / Representante Legal
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2.5 md:col-span-2">
              <Label htmlFor="rep_name" required tooltip="Nome completo do titular ou representante legal.">
                Nome Completo
              </Label>
              <input
                id="rep_name"
                required
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
                value={formData.representative.nome}
                onChange={(e) => setFormData({ ...formData, representative: { ...formData.representative, nome: e.target.value }})}
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="rep_cpf" required tooltip="CPF para fins de assinatura e validade jurídica.">
                CPF
              </Label>
              <input
                id="rep_cpf"
                required
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
                value={formData.representative.cpf}
                onChange={(e) => setFormData({ ...formData, representative: { ...formData.representative, cpf: formatCPF(e.target.value) }})}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="rep_cargo" tooltip="Cargo ou função exercida (Ex: Proprietário, CEO, Autônomo).">
                Cargo / Função
              </Label>
              <input
                id="rep_cargo"
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
                value={formData.representative.cargo}
                onChange={(e) => setFormData({ ...formData, representative: { ...formData.representative, cargo: e.target.value }})}
                placeholder="Ex: Sócio-Administrador"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !isFormValid}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-white font-bold text-lg hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)]"
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
          <>Concluir Configuração <ArrowRight className="w-5 h-5" /></>
        )}
      </button>
    </form>
  )
}
