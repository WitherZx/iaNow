'use client'

import React from 'react'
import { Button, ButtonProps } from '@/components/shared/Button'
import { cn } from '@/utils/cn'
import { LucideIcon } from 'lucide-react'

interface CTAButtonProps extends ButtonProps {
  icon?: LucideIcon
}

export function CTAButton({ 
  children, 
  icon: Icon, 
  className, 
  ...props 
}: CTAButtonProps) {
  return (
    <Button 
      className={cn(
        "h-12 px-6 md:px-10 font-bold bg-primary hover:bg-blue-700 text-white rounded-xl shadow-[0_10px_20px_-10px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 w-full lg:w-auto",
        className
      )}
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </Button>
  )
}
