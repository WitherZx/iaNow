'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { PageContainer } from '@/components/layout/PageContainer'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { cn } from '@/utils/cn'

interface DocumentAuditLayoutProps {
  backLink: string
  backLabel?: string
  actions: React.ReactNode
  hero: React.ReactNode
  sidebar: React.ReactNode
  children: React.ReactNode
  className?: string
  sidebarGridCols?: string
}

export function DocumentAuditLayout({
  backLink,
  backLabel = 'Voltar',
  actions,
  hero,
  sidebar,
  children,
  className,
  sidebarGridCols = 'lg:grid-cols-[3fr_1fr]'
}: DocumentAuditLayoutProps) {
  return (
    <DashboardLayout>
      <PageContainer>
        <div className={cn(
          "flex flex-col gap-y-12 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-full overflow-x-hidden",
          className
        )}>
          {/* HEADER TOP ROW (Buttons) */}
          <div className="flex items-center justify-between print:hidden">
            <Link href={backLink}>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4 mr-2" /> {backLabel}
              </Button>
            </Link>

            {actions}
          </div>

          {/* HERO SECTION */}
          <div className="print:hidden">
            {hero}
          </div>

          {/* MAIN GRID */}
          <div className={cn("grid grid-cols-1 gap-6 w-full max-w-full overflow-hidden", sidebarGridCols)}>
            {/* CONTENT AREA */}
            <div className="min-w-0 flex flex-col print:w-full print:max-w-none">
              {children}
            </div>

            {/* SIDEBAR AREA */}
            <div className="flex flex-col gap-6 sticky h-fit print:hidden min-w-0">
              {sidebar}
            </div>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
