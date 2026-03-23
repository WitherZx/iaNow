'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '../hooks/useOnboarding'
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { StepBadge } from '@/components/shared/StepBadge'

import { CompanyInfoForm } from './steps/CompanyInfoForm'
import { CompanyLegalForm } from './steps/CompanyLegalForm'

function getStepComponent(stepKey: string) {
  switch (stepKey) {
    case 'company_info':
      return CompanyInfoForm
    case 'company_legal':
      return CompanyLegalForm
    default:
      // Fallback
      return () => <div className="p-4 text-gray-500">Componente não encontrado para este passo.</div>
  }
}


export function OnboardingWizard({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter()
  const { session, steps, loading, error, startOnboarding, submitStep } = useOnboarding()
  const [localSaving, setLocalSaving] = useState(false)

  useEffect(() => {
    startOnboarding()
  }, [startOnboarding])

  if (loading && !session) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-500">Preparando seu ambiente...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-lg flex flex-col gap-2 max-w-lg mx-auto">
        <h3 className="font-bold">Erro ao iniciar Onboarding</h3>
        <p>{error}</p>
        <button 
          onClick={() => startOnboarding()}
          className="mt-4 px-4 py-2 bg-red-100 font-medium rounded hover:bg-red-200 w-fit"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  if (session?.status === 'completed') {
    return (
      <div className="w-full flex flex-col items-center justify-center text-center min-h-[500px] group animate-in zoom-in-95 duration-700 py-10">
        
        {/* Animated Icon Container */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/30 transition-all duration-700" />
          <div className="relative w-32 h-32 bg-gradient-to-br from-primary to-blue-600 text-white rounded-[40px] flex items-center justify-center shadow-2xl shadow-primary/30 transform group-hover:-translate-y-2 transition-all duration-500 border border-white/20">
            <CheckCircle2 className="w-16 h-16" strokeWidth={2.5} />
          </div>
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
          Ambiente Estratégico <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Configurado</span>
        </h2>
        
        <p className="text-slate-500 text-lg md:text-xl max-w-md mb-12 leading-relaxed font-medium">
          A Inteligência Sistêmica absorveu seus parâmetros. Seu ambiente foi completamente configurado.
        </p>
        
        <button
          onClick={() => {
            if (onComplete) {
              onComplete()
            } else {
              router.push('/dashboard')
            }
          }}
          className="relative overflow-hidden group/btn bg-primary hover:bg-blue-700 text-white font-black text-lg py-5 px-12 rounded-2xl shadow-[0_20px_40px_-15px_rgba(37,99,235,0.5)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full duration-1000 ease-in-out transition-transform" />
          <span className="relative z-10">{onComplete ? 'Continuar para o Módulo' : 'Iniciar Dashboard'}</span>
          <ArrowRight className="w-6 h-6 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    )
  }

  // Determine current active step object
  const activeStepObj = steps.find(s => s.step_number === session?.current_step) || steps[0]
  const currentStepIndex = session ? session.current_step - 1 : 0

  const handleStepSubmit = async (data: any) => {
    setLocalSaving(true)
    try {
      if (activeStepObj) {
        await submitStep(activeStepObj.step_key, data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLocalSaving(false)
    }
  }

  return (
    <div className="w-full flex flex-col relative z-20">
      {/* Badge de Etapa - Centralizado verticalmente com o ícone do formulário */}
      <div className="absolute top-[10px] right-0">
        <StepBadge current={currentStepIndex + 1} total={steps.length} />
      </div>
      
      {/* Main Content Area */}
      <div className="w-full min-h-[500px]">
        {activeStepObj ? (
          (() => {
            const CurrentFormComponent = getStepComponent(activeStepObj.step_key)
            return (
              <CurrentFormComponent 
                key={activeStepObj.id} 
                step={activeStepObj} 
                onSubmit={handleStepSubmit} 
                loading={localSaving} 
              />
            )
          })()
        ) : null}
      </div>
    </div>
  )
}
