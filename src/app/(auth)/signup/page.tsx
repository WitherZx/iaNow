'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { User, Mail, Lock, UserPlus, Sparkles, Eye, EyeOff, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface PasswordRequirement {
  label: string
  met: boolean
}

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  })
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirement[]>([
    { label: 'Pelo menos 8 caracteres', met: false },
    { label: 'Uma letra maiúscula', met: false },
    { label: 'Uma letra minúscula', met: false },
    { label: 'Um número', met: false },
    { label: 'Um caractere especial', met: false },
  ])

  const validatePassword = (password: string) => {
    const requirements = [
      { label: 'Pelo menos 8 caracteres', met: password.length >= 8 },
      { label: 'Uma letra maiúscula', met: /[A-Z]/.test(password) },
      { label: 'Uma letra minúscula', met: /[a-z]/.test(password) },
      { label: 'Um número', met: /[0-9]/.test(password) },
      { label: 'Um caractere especial', met: /[^A-Za-z0-9]/.test(password) },
    ]
    setPasswordRequirements(requirements)
    return requirements.every(req => req.met)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value
    setFormData({ ...formData, password: newPassword })
    validatePassword(newPassword)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePassword(formData.password)) {
      toast.error('Senha muito fraca', {
        description: 'Por favor, atenda a todos os requisitos de segurança da senha.'
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          }
        }
      })

      if (error) {
        toast.error('Erro ao cadastrar', {
          description: error.message
        })
        return
      }

      toast.success('Conta criada com sucesso!', {
        description: 'Verifique o seu e-mail para confirmar o cadastro.'
      })
      router.push('/login')
    } catch (error) {
      toast.error('Ocorreu um erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden font-montserrat">
      {/* Lado Esquerdo - Ilustrativo */}
      <div className="hidden lg:flex w-1/2 h-screen relative bg-slate-950 items-center justify-center border-r border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tl from-primary/30 via-transparent to-transparent opacity-50" />
        
        <div className="z-10 p-12 max-w-lg space-y-6 flex flex-col justify-center h-full">
          <div className="w-16 h-16 rounded-2xl bg-primary shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center mb-4">
             <UserPlus className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold text-white leading-tight animate-in fade-in slide-in-from-right duration-700">
              Comece a sua jornada de transformação hoje.
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed animate-in fade-in slide-in-from-right duration-1000 delay-200">
              Crie sua conta em segundos e tenha acesso imediato a todas as ferramentas de IA estratégica que vão acelerar seu negócio.
            </p>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#ffffff05,transparent)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10 bg-white">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Crie sua conta</h1>
            <p className="text-muted-foreground text-lg">
              Junte-se a centenas de empresas que já escalam com inteligência estratégica.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Input
              label="Nome completo"
              placeholder="Ex: João Silva"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              leftIcon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="E-mail"
              placeholder="seu@email.com"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
            <Input
              label="Senha"
              placeholder="Crie uma senha forte"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handlePasswordChange}
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
            
            {formData.password && (
              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requisitos de Segurança</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2">
                       {req.met ? (
                         <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                           <Check className="w-2.5 h-2.5" />
                         </div>
                       ) : (
                         <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                           <X className="w-2.5 h-2.5" />
                         </div>
                       )}
                       <span className={`text-[11px] font-medium transition-colors ${req.met ? 'text-emerald-600' : 'text-slate-500'}`}>
                         {req.label}
                       </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full !mt-6 shadow-lg shadow-primary/20"
              size="lg"
              isLoading={loading}
            >
              {!loading && <UserPlus className="w-4 h-4 mr-2" />}
              Começar agora
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 animate-in fade-in slide-in-from-bottom-5 duration-1000">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
