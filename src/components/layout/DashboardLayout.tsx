'use client'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen print:h-auto overflow-hidden print:overflow-visible bg-slate-100/50">
      {isAuthenticated && <div className="print:hidden h-full"><Sidebar /></div>}
      <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
        {isAuthenticated && <div className="print:hidden"><Topbar /></div>}
        <main className={cn(
          "flex-1 overflow-y-auto print:overflow-visible font-montserrat",
          isAuthenticated ? "px-8 py-10 print:p-0" : "px-4 py-8 md:px-12 lg:px-24 print:p-0"
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}
