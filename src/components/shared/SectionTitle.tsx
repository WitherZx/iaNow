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
  large:   'text-3xl md:text-2xl',
  default: 'text-2xl md:text-xl',
  small:   'text-lg md:text-base',
}

const subtitleSizes = {
  large:   'text-lg md:text-base',
  default: 'text-[15px] md:text-sm',
  small:   'text-sm md:text-[13px]',
}

export function SectionTitle({ title, subtitle, variant = 'default', action, className }: SectionTitleProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row items-center sm:items-center justify-between gap-y-2 text-center sm:text-left", className)}>
      <div className="flex flex-col gap-y-1 items-center sm:items-start">
        <h2 className={cn(
          "font-montserrat font-bold text-[#171717] m-0",
          titleSizes[variant]
        )}>
          {title}
        </h2>
        {subtitle && (
          <p className={cn(
            "font-montserrat font-normal text-[#737373] m-0 max-w-sm sm:max-w-none",
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
