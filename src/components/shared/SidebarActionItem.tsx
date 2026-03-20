'use client'

import React from 'react'
import { Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { cn } from '@/utils/cn'

interface SidebarActionItemProps {
  icon: React.ReactNode
  text: string
  onAction: () => void
  isLoading?: boolean
  variant?: 'primary' | 'amber' | 'emerald'
  className?: string
}

export function SidebarActionItem({
  icon,
  text,
  onAction,
  isLoading = false,
  variant = 'primary',
  className
}: SidebarActionItemProps) {
  const variantStyles = {
    primary: 'hover:border-primary/20 hover:bg-primary/5 group',
    amber: 'hover:border-amber-200 hover:bg-amber-50 group',
    emerald: 'hover:border-emerald-200 hover:bg-emerald-50 group'
  }

  const buttonStyles = {
    primary: 'border-primary/10 text-primary hover:bg-primary hover:text-white',
    amber: 'border-amber-200 text-amber-600 hover:bg-amber-600 hover:text-white',
    emerald: 'border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'
  }

  return (
    <div className={cn(
      "p-3.5 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 shadow-sm transition-all cursor-default",
      variantStyles[variant],
      className
    )}>
      <div className="shrink-0">
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-600 leading-tight group-hover:text-slate-900 line-clamp-2">
          {text}
        </p>
      </div>

      <Button
        onClick={onAction}
        disabled={isLoading}
        variant="outline"
        size="icon"
        className={cn(
          "h-8 w-8 shrink-0 rounded-xl transition-all hover:scale-105 active:scale-95",
          buttonStyles[variant]
        )}
        title="Resolver com IA"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Zap className="w-3.5 h-3.5 fill-current" />
        )}
      </Button>
    </div>
  )
}
