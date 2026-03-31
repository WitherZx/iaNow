'use client'

import React from 'react'
import { Label } from './Label'
import { cn } from '@/utils/cn'

interface FormTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  tooltip?: string
  required?: boolean
  error?: string
}

export function FormTextArea({ 
  label, 
  tooltip, 
  required, 
  error, 
  className, 
  ...props 
}: FormTextAreaProps) {
  return (
    <div className="flex flex-col gap-y-3 w-full">
      <Label required={required} tooltip={tooltip}>{label}</Label>
      <textarea 
        {...props}
        className={cn(
          "w-full h-24 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm resize-none shadow-sm",
          error && "border-red-500 focus:ring-red-500/10 focus:border-red-500",
          className
        )}
      />
      {error && <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest pl-1">{error}</span>}
    </div>
  )
}
