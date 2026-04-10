import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function useOnboardingGuard() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: onboardingStatus, isLoading, refetch } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user) return { needsOnboarding: false }

      // Check if there is a completed onboarding session
      const { data, error } = await supabase
        .from('onboarding_sessions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .limit(1)

      if (error) throw error

      return {
        needsOnboarding: data.length === 0
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (status transitions are handled manually or via invalidation)
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days in IDB
  })

  return { 
    needsOnboarding: onboardingStatus?.needsOnboarding ?? null, 
    isLoading, 
    refresh: refetch 
  }
}
