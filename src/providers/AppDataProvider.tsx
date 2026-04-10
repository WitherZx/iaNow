'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUserConfigAction } from '@/app/actions/user-config-actions'
import { useAuth } from '@/hooks/useAuth'

interface AppDataContextType {
  configs: Record<string, any>
  org: any | null
  plans: any[]
  isLoading: boolean
  refresh: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined)

/**
 * Provedor de dados essenciais para o funcionamento da aplicação.
 * Utiliza TanStack Query que, graças ao PersistQueryClientProvider, 
 * é automaticamente persistido no IndexedDB para carregamento instantâneo.
 */
export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()

  const queryClient = useQueryClient()

  // 1. Unified Bootstrap Query (Combined for performance)
  const { data: configData, isLoading, refetch } = useQuery({
    queryKey: ['user-config', user?.id],
    queryFn: async () => {
      const res = await fetchUserConfigAction()
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !!user?.id && isAuthenticated
  })

  // 2. Hybrid Distribution: Populate granular keys for individual entity consumers
  useEffect(() => {
    if (configData && user?.id) {
      const userId = user.id
      queryClient.setQueryData(['global-configs', userId], configData.configs)
      queryClient.setQueryData(['my-org', userId], configData.org)
      queryClient.setQueryData(['available-plans', userId], configData.plans)
      queryClient.setQueryData(['user-profile', userId], configData.user)
    }
  }, [configData, user?.id, queryClient])

  const configs = configData?.configs || {}
  const org = configData?.org || null
  const plans = configData?.plans || []

  const refresh = async () => {
    await refetch()
  }

  return (
    <AppDataContext.Provider 
      value={{ 
        configs, 
        org, 
        plans, 
        isLoading,
        refresh
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider')
  }
  return context
}
