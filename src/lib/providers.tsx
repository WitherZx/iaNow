'use client'

// src/lib/providers.tsx
// Providers globais do app: TanStack Query (Persistente) + Sonner Toaster

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { useState, useMemo } from 'react'

import { AppDataProvider } from '@/providers/AppDataProvider'
import { createDexiePersister } from './storage/persister'
import { useAuth } from '@/hooks/useAuth'

export function Providers({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()

  // 1. Instância do QueryClient com políticas agressivas para local-first
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,     // 5 minutos: Cache primário seguro.
        gcTime: 1000 * 60 * 60 * 24,  // 24 horas de sobrevivência no IndexedDB
        retry: 1,
        refetchOnWindowFocus: false,  // Sem interrupções ao trocar de abas
        refetchOnMount: true,         // Re-valida em background ao abrir a página
      },
      mutations: {
        retry: 0,
      }
    }
  }))

  // 2. Cache Buster: Garante isolamento entre usuários e organizações
  // Se o usuário logar/deslogar ou trocar empresa, o buster muda e o cache IDB é invalidado.
  const cacheBuster = useMemo(() => {
    if (!isAuthenticated || !user) return 'guest'
    const orgId = user.user_metadata?.org_id || 'no-org'
    return `${user.id}-${orgId}-v3`
  }, [user, isAuthenticated])

  const persister = useMemo(() => createDexiePersister(), [])

  return (
    <PersistQueryClientProvider 
      client={queryClient}
      persistOptions={{
        persister,
        buster: cacheBuster,
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
      }}
      onSuccess={() => {
        // Callback opcional para quando o cache for totalmente restaurado
        console.debug('[iaNow] Cache Local Restaurado com sucesso.')
      }}
    >
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
    </PersistQueryClientProvider>
  )
}
