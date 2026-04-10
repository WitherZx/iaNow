'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'

export function useCacheWarming() {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const warmCache = async () => {
      
      // 1. Prefetch Global: Strategies
      // Usamos a mesma estrutura de dados que a tela consome.
      queryClient.prefetchQuery({
        queryKey: ['strategies'],
        queryFn: async () => {
          const { getStrategiesAction } = await import('@/app/actions/strategy-actions')
          const { data, error } = await getStrategiesAction()
          if (error) throw new Error(error)
          return (data || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            status: s.status === 'active' ? 'ready' : s.status === 'processing' ? 'generating' : s.status,
            created_at: new Date(s.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'short', year: 'numeric'
            }),
            raw_created_at: s.created_at,
            version: s.version || 1,
            ai_model: s.ai_model || 'Minerva'
          }))
        },
        staleTime: 1000 * 60 * 60 // 1h
      })
      
      // 2. Outras requisições core poderiam ser pré-buscadas aqui (contratos, profile, etc.)
    }

    // Atrasamos levemente o prefetch para priorizar a renderização inicial da UI principal
    const timer = setTimeout(() => {
      warmCache()
    }, 1500)

    return () => clearTimeout(timer)
  }, [isAuthenticated, user, queryClient])
}
