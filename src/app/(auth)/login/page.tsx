'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { Mail, Lock, LogIn, Sparkles, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error('Erro ao entrar', {
          description: error.message
        })
        return
      }

      toast.success('Bem-vindo de volta!')
      router.push('/dashboard')
      router.refresh()
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
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-2 animate-in fade-in slide-in-from-bottom-3 duration-500">
              <Sparkles className="w-3 h-3" />
              Portal do Cliente
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Acessar plataforma</h1>
            <p className="text-muted-foreground text-lg">
              Entre no iaNow para transformar a gestão estratégica do seu negócio com inteligência artificial.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Input
              label="E-mail"
              placeholder="seu@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
            <Input
              label="Senha"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />
            
            <div className="flex items-center justify-between py-1">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline transition-all"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full !mt-6 shadow-lg shadow-primary/20"
              size="lg"
              isLoading={loading}
            >
              {!loading && <LogIn className="w-4 h-4 mr-2" />}
              Entrar no painel
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 animate-in fade-in slide-in-from-bottom-5 duration-1000">
            Ainda não tem conta?{' '}
            <Link href="/signup" className="text-primary font-bold hover:underline">
              Crie uma agora
            </Link>
          </p>
        </div>
      </div>

      {/* Lado Direito - Ilustrativo (Glassmorphism/Gradient) */}
      <div className="hidden lg:flex w-1/2 h-screen relative bg-slate-950 items-center justify-center border-l border-white/5 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent opacity-50" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
        
        {/* Content Container - Vertically Centered */}
        <div className="z-10 p-12 max-w-lg space-y-8 flex flex-col justify-center h-full">
          <div className="w-16 h-16 rounded-2xl bg-primary shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold text-white leading-tight animate-in fade-in slide-in-from-left duration-700">
              Impulsione seu negócio com Inteligência Estratégica.
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed animate-in fade-in slide-in-from-left duration-1000 delay-200">
              Diagnósticos jurídicos, análises financeiras e estratégias personalizadas para acelerar sua jornada de crescimento.
            </p>
          </div>
          
          <div className="pt-8 flex items-center gap-6 animate-in fade-in slide-in-from-bottom duration-1000 delay-500">
             <div className="flex -space-x-4">
               {[1,2,3,4].map(i => (
                 <div key={i} className="relative w-12 h-12 rounded-full border-4 border-slate-950 bg-slate-800 overflow-hidden ring-2 ring-primary/20">
                    <Image 
                      src={`/avatars/avatar${i}.png`} 
                      alt={`Usuário iaNow ${i}`}
                      fill
                      className="object-cover"
                    />
                 </div>
               ))}
             </div>
             <div className="flex flex-col">
               <span className="text-white font-bold text-lg">+500</span>
               <span className="text-slate-500 text-sm">Empresas confiam no iaNow</span>
             </div>
          </div>
        </div>

        {/* Global Noise Effect */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
      </div>
    </div>
  )
}
