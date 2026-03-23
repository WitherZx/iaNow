'use client'

import React from 'react'
import { cn } from '@/utils/cn'
import { FieldTooltip } from './FieldTooltip'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
  error?: boolean
  required?: boolean
  tooltip?: string
  className?: string
}

export function Label({ children, error, required, tooltip, className, ...props }: LabelProps) {
  return (
    <label 
      className={cn(
        "text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 inline-flex items-center mb-1.5 transition-colors",
        error && "text-red-500",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1 font-bold">*</span>}
      {tooltip && <FieldTooltip text={tooltip} />}
    </label>
  )
}
