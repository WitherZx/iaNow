'use client'

import React from 'react'
import { Card } from '@/components/shared/Card'
import { cn } from '@/utils/cn'

interface Stat {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: 'blue' | 'emerald' | 'indigo' | 'amber' | 'primary'
}

interface ModuleStatsSidebarProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  stats: Stat[]
  action?: React.ReactNode
  className?: string
}

export function ModuleStatsSidebar({ title, subtitle, stats, action, className }: ModuleStatsSidebarProps) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary group-hover:bg-primary',
    blue: 'bg-blue-500/10 text-blue-600 group-hover:bg-blue-500',
    emerald: 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500',
    indigo: 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500',
    amber: 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500',
  }

  const borderMap = {
    primary: 'hover:border-primary/20',
    blue: 'hover:border-blue-500/20',
    emerald: 'hover:border-emerald-500/20',
    indigo: 'hover:border-indigo-500/20',
    amber: 'hover:border-amber-500/20',
  }

  return (
    <aside className={cn("flex flex-col gap-y-6 w-full lg:w-[320px] shrink-0", className)}>
      {(title || subtitle) && (
        <div className="flex flex-col gap-y-1.5 items-center lg:items-start w-full text-center lg:text-left mb-2">
          {title && (
            <div className="font-montserrat font-bold text-2xl md:text-[26px] text-[#171717] m-0 uppercase leading-tight w-full">
              {title}
            </div>
          )}
          {subtitle && (
            <div className="font-montserrat font-normal text-sm text-[#737373] m-0 max-w-2xl leading-relaxed mx-auto lg:mx-0">
              {subtitle}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-y-4">
        {stats.map((stat, idx) => (
          <Card
            key={idx}
            className={cn(
              "bg-white border-slate-100 flex flex-col items-center justify-center gap-y-4 p-8 group transition-all text-center animate-in fade-in slide-in-from-left-4 duration-500",
              borderMap[stat.color || 'primary']
            )}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:text-white",
              colorMap[stat.color || 'primary']
            )}>
              {stat.icon}
            </div>
            <div className="flex flex-col gap-y-1">
              <span className="text-3xl font-black text-slate-900 leading-none">{stat.value}</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">{stat.label}</span>
            </div>
          </Card>
        ))}
      </div>

      {action && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          {action}
        </div>
      )}
    </aside>
  )
}
