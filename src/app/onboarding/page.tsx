import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'
import { BrainCircuit } from 'lucide-react'

export default function OnboardingPage() {
  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden font-montserrat">
      {/* Lado Esquerdo - Ilustrativo */}
      <div className="hidden lg:flex w-1/2 h-screen relative bg-slate-950 items-center justify-center border-r border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tl from-primary/30 via-transparent to-transparent opacity-50" />
        
        <div className="z-10 p-12 max-w-lg space-y-6 flex flex-col justify-center h-full">
          <div className="w-16 h-16 rounded-2xl bg-primary shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center mb-4">
             <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold text-white leading-tight animate-in fade-in slide-in-from-right duration-700">
              Inicializando sua Instância Estratégica
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed animate-in fade-in slide-in-from-right duration-1000 delay-200">
              Configure seu ambiente corporativo. Respostas precisas geram inteligência altamente agressiva para o seu negócio.
            </p>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#ffffff05,transparent)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
      </div>

      {/* Lado Direito - Formulário (Wizard) */}
      <div className="w-full lg:w-1/2 z-10 bg-white h-screen overflow-y-auto flex">
        <div className="w-full max-w-xl m-auto py-16 px-8 lg:px-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <OnboardingWizard />
        </div>
      </div>
    </div>
  )
}
