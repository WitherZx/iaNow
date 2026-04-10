'use client'

import { Sidebar } from './Sidebar'
import { ConflictToast } from '../conflict/ConflictToast'
import { ConflictResolver } from '../conflict/ConflictResolver'
import { Topbar } from './Topbar'
import { PWALoader } from '../pwa/PWALoader'
import { InstallPrompt } from '../pwa/InstallPrompt'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'
import { useState, useEffect } from 'react'
import { useSyncEngine } from '@/lib/sync/syncEngine'
import '@/lib/sync/actions' // Registra Server Actions no Sync Engine
import { useRealtimeEngine } from '@/lib/realtime/realtimeEngine'
import { useCacheWarming } from '@/hooks/useCacheWarming'

export function DashboardLayout({
  children,
  sidebar
}: {
  children: React.ReactNode,
  sidebar?: React.ReactNode
}) {
  const { isAuthenticated, user, loading } = useAuth()
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  // Sync Engine: processa mutações pendentes do Outbox em background
  useSyncEngine()
  
  // Realtime Engine: ouve tabela(s) no Supabase passivamente
  useRealtimeEngine()

  // Cache Warming: garante que a navegação para outras telas seja "0ms"
  useCacheWarming()


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50" suppressHydrationWarning>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" suppressHydrationWarning />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen print:h-auto overflow-hidden print:overflow-visible bg-slate-200 print:bg-white" suppressHydrationWarning>
      {/* Mobile Sidebar drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Topbar - Top of everything */}
      <div className="print:hidden border-b border-slate-100 bg-white shrink-0">
        <Topbar onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
      </div>

      {/* Main Layout Body */}
      <div className="flex flex-1 min-w-0 overflow-hidden print:overflow-visible relative">

        {/* Optional Page Sidebar (Desktop) */}
        {sidebar && (
          <div className="hidden lg:block shrink-0 h-full print:hidden">
            {sidebar}
          </div>
        )}

        <main className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible font-montserrat px-6 py-8 md:px-8 md:py-10 print:p-0 print:bg-white print:border-none print:shadow-none",
          !sidebar && "xl:px-8" // Extra padding if no sidebar
        )}>
          {children}
        </main>

        {/* Camada de Resolução de Conflitos (Fase 5) */}
        <ConflictToast onOpenResolver={(id) => {
          window.dispatchEvent(new CustomEvent('open-conflict-resolver', { detail: id }))
        }} />
        <ConflictResolver />

        {/* Infraestrutura PWA (Fase 6) */}
        <PWALoader />
        <InstallPrompt />

        {/* Overlay for mobile drawer */}
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
