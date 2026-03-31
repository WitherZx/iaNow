'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import {
  Scale,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calculator,
  Gavel,
  Loader2,
  Play,
  User,
  MapPin,
  Building,
  Mail,
  Phone,
  Briefcase,
  Contact,
  Upload,
  X,
  FileSearch,
  BookOpen
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Label } from '@/components/shared/Label'
import { StepBadge } from '@/components/shared/StepBadge'
import { MinervaGuidedForm } from '@/features/justica/components/MinervaGuidedForm'

const STEPS = [
  { id: 'triagem', title: 'Problema', icon: AlertCircle },
  { id: 'qualificacao', title: 'Qualificação', icon: User },
  { id: 'coleta', title: 'Fatos', icon: MessageSquare },
  { id: 'calculo', title: 'Valores', icon: Calculator },
  { id: 'geracao', title: 'Petição', icon: FileText },
]

export default function NovoJusticaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Pre-fill user data if available
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({
          name: user.user_metadata?.full_name || '',
          document: user.user_metadata?.document || '',
          email: user.email || '',
          phone: user.user_metadata?.phone || ''
        })
      }
    }
    loadUser()
  }, [supabase])

  const handleComplete = async (minervaData: any) => {
    try {
      setLoading(true)
      const guestId = !localStorage.getItem('sb-auth-token') 
        ? (localStorage.getItem('ianow_guest_id') || crypto.randomUUID()) 
        : null
      
      if (guestId && !localStorage.getItem('ianow_guest_id')) {
        localStorage.setItem('ianow_guest_id', guestId)
      }

      // Merge user data if available
      const fullData = {
        ...minervaData,
        authorName: minervaData.authorName || user?.name || '',
        authorDocument: minervaData.authorDocument || user?.document || '',
        authorEmail: user?.email || '',
        authorPhone: user?.phone || '',
        description: minervaData.whatHappened,
        estimatedValue: (Number(minervaData.materialDamage) + Number(minervaData.moralDamage)).toString()
      }

      const response = await fetch('/api/justica/gerar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(guestId ? { 'X-Guest-Id': guestId } : {})
        },
        body: JSON.stringify({ diagnosticData: fullData })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao processar demanda')
      }
      
      const result = await response.json()
      toast.success('Petição redigida. Redirecionando...')
      
      setTimeout(() => {
        router.push(`/justica/${result.demandId}`)
      }, 1500)

    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <PageContainer centered>
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-y-10 pb-20">
          <div className="flex flex-col gap-y-2">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Nova Demanda</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs md:text-sm">Assistente de Protocolo Minerva AI</p>
          </div>

          {loading ? (
             <Card className="flex flex-col items-center justify-center p-20 gap-6">
                <Loader2 size={64} className="text-primary animate-spin" />
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">Minerva está redigindo...</h2>
                  <p className="text-slate-500 font-bold mt-2">Isso pode levar alguns segundos. Por favor, aguarde.</p>
                </div>
             </Card>
          ) : (
            <MinervaGuidedForm 
              onComplete={handleComplete} 
              initialUser={user} 
            />
          )}
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
