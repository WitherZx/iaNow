import { useState } from 'react'
import { Loader2, ArrowRight, Target, AlertTriangle } from 'lucide-react'

interface StepProps {
  step: any
  onSubmit: (data: any) => void
  loading: boolean
}

const CHALLENGES = [
  { id: 'sales', label: 'Aumentar Vendas e Receita' },
  { id: 'marketing', label: 'Marketing e Captação de Leads' },
  { id: 'operation', label: 'Eficiência Operacional / Processos' },
  { id: 'hr', label: 'Gestão de Pessoas / RH' },
  { id: 'financial', label: 'Controle e Planejamento Financeiro' },
  { id: 'innovation', label: 'Inovação e Tecnologia' },
  { id: 'competition', label: 'Concorrência de Mercado' },
  { id: 'compliance', label: 'Questões Legais e Compliance' },
]

export function ChallengesForm({ step, onSubmit, loading }: StepProps) {
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([])

  const toggleChallenge = (id: string) => {
    if (selectedChallenges.includes(id)) {
      setSelectedChallenges(selectedChallenges.filter(c => c !== id))
    } else {
      if (selectedChallenges.length < 3) {
        setSelectedChallenges([...selectedChallenges, id])
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ challenges: selectedChallenges })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full max-w-2xl mx-auto mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 text-center md:text-left">
        <div className="mx-auto md:mx-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-2">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Principais Desafios</h2>
        <p className="text-gray-500 text-lg">Selecione até 3 áreas onde sua empresa enfrenta as maiores dificuldades hoje.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CHALLENGES.map((challenge) => {
          const isSelected = selectedChallenges.includes(challenge.id)
          const isDisabled = !isSelected && selectedChallenges.length >= 3

          return (
            <button
              key={challenge.id}
              type="button"
              disabled={isDisabled}
              onClick={() => toggleChallenge(challenge.id)}
              className={`flex items-center text-left gap-3 px-5 py-4 rounded-xl border-2 transition-all ${
                isSelected 
                  ? 'border-blue-600 bg-blue-50 shadow-sm' 
                  : isDisabled
                  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
              }`}>
                {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
              </div>
              <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                {challenge.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {selectedChallenges.length} de 3 selecionados
        </span>
        
        <button
          type="submit"
          disabled={loading || selectedChallenges.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>Continuar <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </form>
  )
}
