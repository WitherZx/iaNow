'use client'

import React from 'react'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { LucideIcon, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/utils/cn'

import { CTAButton } from '@/components/shared/CTAButton'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionText?: string
  actionHref?: string
  className?: string
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionText, 
  actionHref,
  className 
}: EmptyStateProps) {
  return (
    <Card className={cn(
      "flex flex-col items-center justify-center px-8 py-16 sm:px-16 sm:py-20 md:px-20 md:py-24 text-center border-dashed border-2 bg-slate-50/50 rounded-[32px] md:rounded-[40px] animate-in fade-in zoom-in-95 duration-500",
      className
    )}>
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 mb-3 md:mb-6 transition-transform hover:scale-105 duration-300">
        <Icon size={28} className="md:size-8" />
      </div>
      
      <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">
        {title}
      </h3>
      
      <p className="text-slate-500 text-base font-medium max-w-sm mb-4 md:mb-8 leading-relaxed">
        {description}
      </p>

      {actionText && actionHref && (
        <Link href={actionHref} className="w-full flex justify-center sm:w-auto">
          <CTAButton icon={PlusCircle} className="w-full sm:w-auto">
            {actionText}
          </CTAButton>
        </Link>
      )}
    </Card>
  )
}
