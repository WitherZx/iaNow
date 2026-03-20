import React from 'react'

interface StepperProps {
  steps: { title: string; isActive?: boolean; isCompleted?: boolean }[]
  currentStepIndex: number
}

export function Stepper({ steps, currentStepIndex }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -z-10 h-[2px] w-full -translate-y-1/2 bg-gray-200" />
        <div
          className="absolute left-0 top-1/2 -z-10 h-[2px] -translate-y-1/2 bg-blue-600 transition-all duration-300"
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex
          const isCompleted = index < currentStepIndex

          return (
            <div key={index} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors
                  ${isActive ? 'border-blue-600 bg-white text-blue-600' : 
                    isCompleted ? 'border-blue-600 bg-blue-600 text-white' : 
                    'border-gray-300 bg-white text-gray-400'}`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className={`text-xs max-w-[80px] text-center hidden md:block ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {step.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
