'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Mail, ArrowLeft, Sparkles, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error('Erro ao enviar e-mail', {
          description: error.message
        })
        return
      }

      setSubmitted(true)
      toast.success('E-mail enviado!', {
        description: 'Verifique sua caixa de entrada para redefinir sua senha.'
      })
    } catch (error) {
      toast.error('Ocorreu um erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden font-montserrat">
      {/* Lado Esquerdo - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10 bg-white">
        <div className="w-full max-w-[400px] space-y-8">
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Voltar para o login
          </Link>

          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Recuperar senha</h1>
            <p className="text-muted-foreground text-lg">
              Insira seu e-mail e enviaremos as instruções para você voltar ao comando.
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Input
                label="E-mail"
                placeholder="seu@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
              
              <Button
                type="submit"
                className="w-full !mt-6 shadow-lg shadow-primary/20"
                size="lg"
                isLoading={loading}
              >
                {!loading && <Send className="w-4 h-4 mr-2" />}
                Enviar instruções
              </Button>
            </form>
          ) : (
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl space-y-4 animate-in zoom-in-95 duration-500">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-2">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-blue-900 text-lg">E-mail Enviado</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Enviamos um link de recuperação para <strong>{email}</strong>.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-100"
                onClick={() => setSubmitted(false)}
              >
                Tentar outro e-mail
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Lado Direito - Ilustrativo */}
      <div className="hidden lg:flex w-1/2 h-screen relative bg-slate-950 items-center justify-center border-l border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent opacity-50" />
        
        <div className="z-10 p-12 max-w-lg space-y-8 flex flex-col justify-center h-full">
          <div className="w-16 h-16 rounded-2xl bg-primary shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold text-white leading-tight animate-in fade-in slide-in-from-left duration-700">
              Não pare por causa de uma senha.
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed animate-in fade-in slide-in-from-left duration-1000 delay-200">
              Nossa plataforma garante que você recupere o acesso rapidamente para continuar transformando seu negócio com IA.
            </p>
          </div>
        </div>

        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
      </div>
    </div>
  )
}
