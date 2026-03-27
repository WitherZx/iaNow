'use client'

import { cn } from '@/utils/cn'

interface PageContainerProps {
  children: React.ReactNode
  title?: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  centered?: boolean
  reverseMobile?: boolean
}

export function PageContainer({ 
  children, 
  title, 
  subtitle, 
  action, 
  centered = false,
  reverseMobile = false
}: PageContainerProps) {
  return (
    <div className="flex flex-col gap-y-8 md:gap-y-[50px] w-full min-w-0">
      {(title || action) && (
        <div className={cn(
          "flex",
          centered 
            ? 'flex-col items-center text-center gap-12' 
            : `${reverseMobile ? 'flex-col-reverse' : 'flex-col'} items-center text-center lg:flex-row lg:items-center lg:justify-between lg:text-left gap-12 lg:gap-6`
        )}>
          <div className={cn(
            "flex flex-col gap-y-1.5 items-center lg:items-start w-full",
            centered ? 'items-center' : ''
          )}>
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
          {!centered && action && (
            <div className="w-full lg:w-auto shrink-0 flex items-center justify-center lg:justify-start">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
