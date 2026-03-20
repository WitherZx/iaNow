import { useState, useCallback } from 'react'

export interface SessionData {
  id: string
  current_step: number
  total_steps: number
  status: string
}

export interface StepData {
  id: string
  step_number: number
  step_key: string
  title: string
  status: string
}

export function useOnboarding() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [steps, setSteps] = useState<StepData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startOnboarding = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/start', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start onboarding')
      
      setSession(data.session)
      setSteps(data.steps)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const submitStep = useCallback(async (stepKey: string, answers: any) => {
    if (!session) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/submit-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          stepKey,
          answers
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit step')
      
      if (data.isLastStep) {
        // Automatically complete if last step
        await completeOnboarding()
      } else {
        // Update local session current_step to trigger UI advancement
        setSession(s => s ? { ...s, current_step: data.nextStepNum } : null)
      }

      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  const completeOnboarding = useCallback(async () => {
    if (!session) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to complete onboarding')
      
      setSession(s => s ? { ...s, status: 'completed' } : null)
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [session])

  return {
    session,
    steps,
    loading,
    error,
    startOnboarding,
    submitStep,
    completeOnboarding
  }
}
