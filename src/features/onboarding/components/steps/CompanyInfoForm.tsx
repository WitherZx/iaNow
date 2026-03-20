import { useState } from 'react'
import { Loader2, ArrowRight, Building2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StepProps {
  step: any
  onSubmit: (data: any) => void
  loading: boolean
}

export function CompanyInfoForm({ step, onSubmit, loading }: StepProps) {
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    size: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 text-center md:text-left">
        <div className="mx-auto md:mx-0 w-14 h-14 bg-primary/10 text-primary border border-primary/20 rounded-2xl flex items-center justify-center mb-2 shadow-sm">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{step.title}</h2>
        <p className="text-slate-500 text-lg font-medium">Conte-nos o básico sobre sua empresa para calibrarmos a inteligência.</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <label htmlFor="name" className="text-sm font-bold text-slate-700 tracking-wide">NOME DA EMPRESA <span className="text-primary">*</span></label>
          <input
            id="name"
            type="text"
            required
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: iaNow Enterprise"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="website" className="text-sm font-bold text-slate-700 tracking-wide">WEBSITE <span className="text-slate-400 font-normal">(OPCIONAL)</span></label>
          <input
            id="website"
            type="text"
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 placeholder:text-slate-400 font-semibold"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://suaempresa.com.br"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="size" className="text-sm font-bold text-slate-700 tracking-wide">TAMANHO DA EQUIPE <span className="text-primary">*</span></label>
          <select
            id="size"
            required
            className="appearance-none rounded-xl border border-slate-200 bg-slate-50/50 p-4 pr-12 shadow-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 font-semibold cursor-pointer bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M6%209L12%2015L18%209%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[position:right_1rem_center] bg-no-repeat"
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
          >
            <option value="" disabled>Selecione o tamanho</option>
            <option value="1-10" className="py-2">1 a 10 funcionários</option>
            <option value="11-50" className="py-2">11 a 50 funcionários</option>
            <option value="51-200" className="py-2">51 a 200 funcionários</option>
            <option value="201+" className="py-2">201+ funcionários</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !formData.name.trim() || !formData.size}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-white font-bold text-lg hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-[0_15px_30px_-10px_rgba(37,99,235,0.4)]"
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
          <>Verificar Parâmetros <ArrowRight className="w-5 h-5" /></>
        )}
      </button>
    </form>
  )
}
