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
      "flex flex-col items-center justify-center p-16 text-center border-dashed border-2 bg-slate-50/50 rounded-[40px] animate-in fade-in zoom-in-95 duration-500",
      className
    )}>
      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 mb-6 transition-transform hover:scale-105 duration-300">
        <Icon size={32} />
      </div>
      
      <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">
        {title}
      </h3>
      
      <p className="text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
        {description}
      </p>

      {actionText && actionHref && (
        <Link href={actionHref}>
          <CTAButton icon={PlusCircle}>
            {actionText}
          </CTAButton>
        </Link>
      )}
    </Card>
  )
}
