'use client'

import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'bordered' | 'elevated' | 'accent' | 'ghost'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  style?: React.CSSProperties
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
}

const variants = {
  default:  'bg-white border border-[#E5E5E5] shadow-sm',
  bordered: 'bg-white border-2 border-primary',
  elevated: 'bg-white shadow-lg border-transparent',
  accent:   'bg-gradient-to-br from-slate-900 via-slate-900 to-primary text-white border-transparent',
  ghost:    'bg-transparent border-transparent shadow-none'
}

export function Card({ children, variant = 'default', padding = 'md', className, style }: CardProps) {
  return (
    <div className={cn(
      "rounded-xl flex flex-col transition-all duration-200",
      variants[variant],
      paddings[padding],
      className
    )} style={style}>
      {children}
    </div>
  )
}
