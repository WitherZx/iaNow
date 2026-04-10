'use client'

import { useEffect } from 'react'
import { setupSWBridge } from '@/lib/sync/swBridge'

/**
 * Orquestrador PWA: Registra o Service Worker e inicializa as pontes
 * de comunicação para Background Sync.
 */
export function PWALoader() {
  useEffect(() => {
    // 1. Registro do SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado com sucesso:', reg.scope)
          
          // Opcional: Verifica atualizações do SW
          reg.onupdatefound = () => {
            const installingWorker = reg.installing
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Nova versão disponível. Por favor, recarregue.')
                }
              }
            }
          }
        })
        .catch((err) => {
          console.error('[PWA] Falha ao registrar Service Worker:', err)
        })
    }

    // 2. Setup do Bridge de Mensagens (Fase 6)
    // Permite que o SW peça dados ao cliente durante o Background Sync
    setupSWBridge()

    // 3. Captura do Evento de Instalação (Custom Install UI)
    const handleBeforeInstallPrompt = (e: any) => {
      // Impede que o browser mostre o prompt automático imediatamente
      e.preventDefault()
      // Dispara evento global para o componente InstallPrompt
      window.dispatchEvent(new CustomEvent('pwa-install-ready', { detail: e }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  return null
}
