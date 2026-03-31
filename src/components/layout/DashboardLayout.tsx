'use client'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'
import { useState } from 'react'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50" suppressHydrationWarning>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" suppressHydrationWarning />
      </div>
    )
  }

  return (
    <div className="flex h-screen print:h-auto overflow-hidden print:overflow-visible bg-slate-200" suppressHydrationWarning>
      {/* Sidebar - Controlada internamente para mobile e desktop */}
      <div className="print:hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:overflow-visible relative">
        {/* Topbar com trigger do menu mobile */}
        <div className="print:hidden">
          <Topbar onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
        </div>

        <main className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible font-montserrat px-6 py-8 md:px-8 md:py-10 print:p-0"
        )}>
          {children}
        </main>

        {/* Overlay para fechar menu mobile ao clicar fora */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
