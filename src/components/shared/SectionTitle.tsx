'use client'

import { cn } from '@/utils/cn'

interface SectionTitleProps {
  title: string
  subtitle?: string
  variant?: 'default' | 'large' | 'small'
  action?: React.ReactNode
  className?: string
}

const titleSizes = {
  large:   'text-xl',
  default: 'text-base',
  small:   'text-[13px]',
}

const subtitleSizes = {
  large:   'text-sm',
  default: 'text-[13px]',
  small:   'text-[12px]',
}

export function SectionTitle({ title, subtitle, variant = 'default', action, className }: SectionTitleProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex flex-col gap-y-1">
        <h2 className={cn(
          "font-montserrat font-bold text-[#171717] m-0",
          titleSizes[variant]
        )}>
          {title}
        </h2>
        {subtitle && (
          <p className={cn(
            "font-montserrat font-normal text-[#737373] m-0",
            subtitleSizes[variant]
          )}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
