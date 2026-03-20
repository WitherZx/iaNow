'use client'

import React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/utils/cn'

interface DocumentHeroProps {
  category: string
  date: string
  title: string
  description: string
  className?: string
}

export function DocumentHero({ category, date, title, description, className }: DocumentHeroProps) {
  return (
    <div className={cn(
      "relative overflow-hidden bg-slate-900 rounded-2xl p-10 text-white shadow-xl shadow-slate-200/50 print:bg-white print:text-black print:p-0 print:shadow-none",
      className
    )}>
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/20 blur-[100px] pointer-events-none print:hidden" />

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-white/10 text-white print:text-black print:border print:border-slate-200 text-[10px] font-black uppercase tracking-widest rounded-full">
            {category}
          </span>
          <div className="flex items-center gap-2 text-white/40 print:text-slate-400 text-xs font-bold uppercase">
            <Clock className="w-3.5 h-3.5" />
            {date}
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1] font-montserrat uppercase">
            {title}
          </h1>
          <p className="text-slate-400 print:text-slate-600 text-lg md:text-xl leading-relaxed max-w-3xl">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
