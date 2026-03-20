'use client'

import React from 'react'
import { cn } from '@/utils/cn'

interface StepBadgeProps {
  current: number
  total: number
  className?: string
}

export function StepBadge({ current, total, className }: StepBadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20",
      className
    )}>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
        Etapa {current} de {total}
      </span>
    </div>
  )
}
