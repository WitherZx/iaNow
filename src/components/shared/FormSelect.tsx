'use client'

import React, { useState } from 'react'
import { Label } from './Label'
import { cn } from '@/utils/cn'
import { ChevronDown, CheckCircle2 } from 'lucide-react'

interface FormSelectProps {
  label: string
  value: string
  onChange: (val: string) => void
  options: string[] | { label: string; value: string }[]
  tooltip?: string
  required?: boolean
  error?: string
  className?: string
}

export function FormSelect({ 
  label, 
  value, 
  onChange, 
  options, 
  tooltip, 
  required, 
  error,
  className
}: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedValue = typeof options[0] === 'string' 
    ? value 
    : (options as { label: string; value: string }[]).find(o => o.value === value)?.label || value

  return (
    <div className="relative w-full flex flex-col gap-y-3">
      <Label required={required} tooltip={tooltip}>{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold flex items-center justify-between transition-all hover:bg-slate-100 group shadow-sm text-sm",
            error && "border-red-500",
            className
          )}
        >
          <span className="truncate">{selectedValue || 'Selecione...'}</span>
          <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[70] animate-in fade-in zoom-in-95 duration-200 max-h-[300px] overflow-y-auto custom-scrollbar">
              {options.map((option) => {
                const optValue = typeof option === 'string' ? option : option.value
                const optLabel = typeof option === 'string' ? option : option.label
                const isSelected = value === optValue

                return (
                  <button
                    key={optValue}
                    type="button"
                    onClick={() => {
                      onChange(optValue)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "w-full h-12 px-4 rounded-xl text-left font-bold transition-all flex items-center justify-between group text-sm",
                      isSelected ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="truncate">{optLabel}</span>
                    {isSelected && <CheckCircle2 size={16} />}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
      {error && <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest pl-1">{error}</span>}
    </div>
  )
}
