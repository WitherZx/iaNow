'use client'

import React from 'react'
import { cn } from '@/utils/cn'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
  error?: boolean
  required?: boolean
  className?: string
}

export function Label({ children, error, required, className, ...props }: LabelProps) {
  return (
    <label 
      className={cn(
        "text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 inline-block mb-1.5 transition-colors",
        error && "text-red-500",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1 font-bold">*</span>}
    </label>
  )
}
