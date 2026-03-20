import { useState } from 'react'
import { Loader2, ArrowRight, Briefcase, ShoppingCart, Cpu, Stethoscope, Factory, Coffee, Monitor } from 'lucide-react'

interface StepProps {
  step: any
  onSubmit: (data: any) => void
  loading: boolean
}

const SECTORS = [
  { id: 'tecnologia', label: 'Tecnologia / Software', icon: Cpu },
  { id: 'varejo', label: 'Varejo / E-commerce', icon: ShoppingCart },
  { id: 'saude', label: 'Saúde / Bem-estar', icon: Stethoscope },
  { id: 'industria', label: 'Indústria / Manufatura', icon: Factory },
  { id: 'servicos', label: 'Serviços B2B', icon: Briefcase },
  { id: 'alimentacao', label: 'Alimentação / Bebidas', icon: Coffee },
]

export function SectorForm({ step, onSubmit, loading }: StepProps) {
  const [selectedSector, setSelectedSector] = useState('')
  const [otherSector, setOtherSector] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const sectorValue = selectedSector === 'outros' ? otherSector : selectedSector
    onSubmit({ sector: sectorValue })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full max-w-2xl mx-auto mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 text-center md:text-left">
        <div className="mx-auto md:mx-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-2">
          <Monitor className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Setor de Atuação</h2>
        <p className="text-gray-500 text-lg">Em qual mercado a sua empresa atua principalmente?</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {SECTORS.map((sector) => {
          const Icon = sector.icon
          const isSelected = selectedSector === sector.label
          return (
            <button
              key={sector.id}
              type="button"
              onClick={() => setSelectedSector(sector.label)}
              className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
                isSelected 
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-8 h-8 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="font-medium text-sm text-center">{sector.label}</span>
            </button>
          )
        })}
        
        <button
          type="button"
          onClick={() => setSelectedSector('outros')}
          className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
            selectedSector === 'outros' 
              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <Briefcase className={`w-8 h-8 ${selectedSector === 'outros' ? 'text-blue-600' : 'text-gray-400'}`} />
          <span className="font-medium text-sm text-center">Outros</span>
        </button>
      </div>

      {selectedSector === 'outros' && (
        <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
          <label htmlFor="otherSector" className="text-sm font-semibold text-gray-700">Por favor, especifique seu setor:</label>
          <input
            id="otherSector"
            type="text"
            required
            className="rounded-lg border border-gray-300 p-3.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900"
            value={otherSector}
            onChange={(e) => setOtherSector(e.target.value)}
            placeholder="Digite o setor..."
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !selectedSector || (selectedSector === 'outros' && !otherSector.trim())}
        className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg max-w-lg mx-auto w-full"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <>Continuar <ArrowRight className="w-5 h-5" /></>
        )}
      </button>
    </form>
  )
}
