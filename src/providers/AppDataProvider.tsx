'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getGlobalConfigsAction, getMyOrgAction, getPlansAction } from '@/app/actions/billing-actions'
import { useAuth } from '@/hooks/useAuth'

interface AppDataContextType {
  configs: Record<string, any>
  org: any | null
  plans: any[]
  isLoading: boolean
  refresh: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined)

const getCacheKey = (uid?: string) => `ianow_essentials_cache_${uid || 'guest'}`

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const queryClient = useQueryClient()
  const [isBootstrapped, setIsBootstrapped] = useState(false)
  const cacheKey = getCacheKey(user?.id)

  // 1. Queries do TanStack Query com staleTime alto (1 hora)
  const { data: configs = {}, isLoading: loadingConfigs } = useQuery({
    queryKey: ['global-configs'],
    queryFn: async () => {
      const res = await getGlobalConfigsAction()
      return res.success ? res.data : {}
    },
    staleTime: 1000 * 60 * 60,
    enabled: isAuthenticated
  })

  const { data: org = null, isLoading: loadingOrg } = useQuery({
    queryKey: ['my-org', user?.id],
    queryFn: async () => {
      const res = await getMyOrgAction()
      return res.success ? res.data : null
    },
    staleTime: 1000 * 60 * 60,
    enabled: isAuthenticated
  })

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['available-plans'],
    queryFn: async () => {
      const res = await getPlansAction()
      return res.success ? res.data : []
    },
    staleTime: 1000 * 60 * 60,
    enabled: isAuthenticated
  })

  // 2. Persistência em LocalStorage para carregamento instantâneo
  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem(cacheKey)
    if (saved && !isBootstrapped) {
      try {
        const parsed = JSON.parse(saved)
        queryClient.setQueryData(['global-configs'], parsed.configs)
        if (parsed.org && user?.id) queryClient.setQueryData(['my-org', user?.id], parsed.org)
        queryClient.setQueryData(['available-plans'], parsed.plans)
        setIsBootstrapped(true)
      } catch (e) {
        console.warn('Erro ao carregar cache essencial:', e)
      }
    }
  }, [isBootstrapped, queryClient, user?.id, cacheKey])

  useEffect(() => {
    if (isAuthenticated && Object.keys(configs).length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify({ configs, org, plans, timestamp: Date.now() }))
    }
  }, [configs, org, plans, isAuthenticated, cacheKey])

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['global-configs'] }),
      queryClient.invalidateQueries({ queryKey: ['my-org'] }),
      queryClient.invalidateQueries({ queryKey: ['available-plans'] }),
    ])
  }

  return (
    <AppDataContext.Provider 
      value={{ 
        configs, 
        org, 
        plans, 
        isLoading: !isBootstrapped && (loadingConfigs || loadingOrg || loadingPlans),
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
