'use client'

// src/lib/providers.tsx
// Providers globais do app: TanStack Query + Sonner Toaster

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { useState } from 'react'

import { AppDataProvider } from '@/providers/AppDataProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient criado dentro do useState para evitar compartilhamento entre requests (Next.js SSR)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,    // 5 minutos de cache padrão
        gcTime: 1000 * 60 * 30,       // 30 minutos de garbage collection
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      }
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AppDataProvider>
        {children}
      </AppDataProvider>
      {/* Toast notifications do Sonner */}
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={{
          style: {
            fontFamily: 'var(--font-montserrat)',
            fontSize: '14px',
          }
        }}
      />
      {/* Devtools apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
