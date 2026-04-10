'use client'

import React, { useEffect, useState } from 'react'
import { Download, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/shared/Button'

/**
 * Componente de convite para instalação do PWA.
 * Aparece apenas se o app for instalável e ainda não estiver instalado.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleInstallReady = (e: any) => {
      setDeferredPrompt(e.detail)
      
      // Pequeno delay para não aparecer imediatamente no load
      setTimeout(() => {
        // Verifica se já não foi fechado nesta sessão
        if (!localStorage.getItem('pwa_prompt_dismissed')) {
          setIsVisible(true)
        }
      }, 3000)
    }

    window.addEventListener('pwa-install-ready', handleInstallReady)
    
    // Detecta se já está rodando standalone (instalado)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false)
    }

    return () => window.removeEventListener('pwa-install-ready', handleInstallReady)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    setIsVisible(false)
    deferredPrompt.prompt()
    
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[PWA] Usuário escolheu instalação: ${outcome}`)
    
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 left-6 z-[160] animate-in slide-in-from-left-5 duration-500">
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
        
        <div className="relative flex items-center gap-5 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-2xl max-w-sm">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-bold text-white tracking-tight">Experiência Nativa</h3>
            <p className="text-[11px] text-zinc-400 leading-normal mt-1">
              Instale a <span className="text-blue-400 font-bold italic">iaNow</span> para acesso rápido e sincronização offline superior.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg h-8 px-4 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
              onClick={handleInstall}
            >
              <Download className="w-3.5 h-3.5 mr-2" />
              Instalar
            </Button>
            <button 
              onClick={handleDismiss}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase font-bold tracking-tighter transition-colors text-center"
            >
              Agora não
            </button>
          </div>

          <button 
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            <X className="w-3 h-3 text-zinc-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
