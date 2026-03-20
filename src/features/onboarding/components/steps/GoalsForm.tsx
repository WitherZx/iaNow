import { useState } from 'react'
import { Loader2, ArrowRight, Target, Sparkles } from 'lucide-react'

interface StepProps {
  step: any
  onSubmit: (data: any) => void
  loading: boolean
}

export function GoalsForm({ step, onSubmit, loading }: StepProps) {
  const [goals, setGoals] = useState({
    primary: '',
    timeline: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(goals)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full max-w-xl mx-auto mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 text-center md:text-left">
        <div className="mx-auto md:mx-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-2">
          <Target className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Seus Objetivos</h2>
        <p className="text-gray-500 text-lg">O que você espera alcançar usando o iaNow?</p>
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="primary" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            Descreva seu principal objetivo de negócio <Sparkles className="w-4 h-4 text-amber-500" />
          </label>
          <textarea
            id="primary"
            required
            rows={4}
            className="rounded-lg border border-gray-300 p-4 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 resize-none"
            value={goals.primary}
            onChange={(e) => setGoals({ ...goals, primary: e.target.value })}
            placeholder="Ex: Queremos estruturar nossos processos operacionais e dobrar nossa captação de clientes nos próximos meses..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="timeline" className="text-sm font-semibold text-gray-700">Qual é a sua urgência para esses resultados?</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'imediato', label: 'Imediato (1-3 meses)' },
              { id: 'medio_prazo', label: 'Médio Prazo (6 meses)' },
              { id: 'longo_prazo', label: 'Longo Prazo (1 ano+)' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setGoals({ ...goals, timeline: option.id })}
                className={`flex items-center justify-center p-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  goals.timeline === option.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !goals.primary.trim() || !goals.timeline}
        className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg w-full"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <>Ver Diagnóstico <Sparkles className="w-5 h-5 ml-1" /></>
        )}
      </button>
    </form>
  )
}
