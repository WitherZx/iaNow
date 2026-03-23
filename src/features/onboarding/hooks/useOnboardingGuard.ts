'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useOnboardingGuard() {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const checkStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setNeedsOnboarding(false)
        return
      }

      // Check if there is a completed onboarding session
      const { data, error } = await supabase
        .from('onboarding_sessions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .limit(1)

      if (error) throw error

      setNeedsOnboarding(data.length === 0)
    } catch (err) {
      console.error('Error checking onboarding status:', err)
      setNeedsOnboarding(false) // Erring on the side of caution
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  return { needsOnboarding, isLoading, refresh: checkStatus }
}
