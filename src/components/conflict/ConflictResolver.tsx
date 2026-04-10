'use client'

import React, { useEffect, useState } from 'react'
import { conflictStore } from '@/lib/conflict/conflictStore'
import { ConflictItem } from '@/lib/conflict/types'
import { isSafeToMerge, performMerge, getChangedFields } from '@/lib/conflict/conflictDetector'
import { db } from '@/lib/storage/db'
import { useSyncEngine } from '@/lib/sync/syncEngine'
import { useQueryClient } from '@tanstack/react-query'
import { X, Check, Save, RotateCcw, GitMerge, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { toast } from 'sonner'

export function ConflictResolver() {
  const [activeConflict, setActiveConflict] = useState<ConflictItem | null>(null)
  const { processOutbox } = useSyncEngine()
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = conflictStore.subscribe((items) => {
      // Abre o primeiro conflito se não houver um ativo
      if (items.length > 0 && !activeConflict) {
        // Not implemented automatic open here to follow the toast trigger
      }
    })
    return () => { unsubscribe() }
  }, [activeConflict])

  // Listen for the toast action (This is a simplified global control)
  useEffect(() => {
    const handleOpen = (e: any) => {
      const id = e.detail
      const item = conflictStore.getConflicts().find(c => c.id === id)
      if (item) setActiveConflict(item)
    }
    window.addEventListener('open-conflict-resolver', handleOpen)
    return () => window.removeEventListener('open-conflict-resolver', handleOpen)
  }, [])

  if (!activeConflict) return null

  const handleResolve = async (strategy: 'KEEP_LOCAL' | 'ACCEPT_REMOTE' | 'MERGE') => {
    try {
      const { id, clientMutationId, entityId, localData, remoteData, originalData, action } = activeConflict

      if (strategy === 'KEEP_LOCAL') {
        // Re-enfileira com flag 'force'
        await db.outbox.update(clientMutationId, {
          status: 'pending',
          payload: { 
            ...localData, 
            options: { ...localData.options, force: true } 
          }
        })
        toast.success('Sua versão será enviada como prioridade.')
      } 
      else if (strategy === 'ACCEPT_REMOTE') {
        // Descarta local, aceita o que está no servidor
        await db.outbox.delete(clientMutationId)
        
        // Atualiza cache local para refletir o servidor
        const queryKey = queryClient.getQueryCache().findAll({ 
          predicate: (q) => (q.queryKey as string[]).includes(entityId) 
        }).map(q => q.queryKey)
        
        queryKey.forEach(key => queryClient.setQueryData(key, remoteData))
        
        toast.success('Versão do servidor aceita.')
      }
      else if (strategy === 'MERGE') {
        const merged = performMerge(localData, remoteData, originalData || remoteData)
        await db.outbox.update(clientMutationId, {
          status: 'pending',
          payload: merged
        })
        toast.success('Dados mesclados com sucesso.')
      }

      // Cleanup
      conflictStore.resolveConflict(id)
      setActiveConflict(null)

      // Re-trigger Sync
      processOutbox()
    } catch (err: any) {
      toast.error('Falha ao resolver conflito: ' + err.message)
    }
  }

  const safeToMerge = isSafeToMerge(activeConflict.localData, activeConflict.remoteData, activeConflict.originalData || activeConflict.remoteData)
  const changedLocal = getChangedFields(activeConflict.originalData || activeConflict.remoteData, activeConflict.localData)
  const changedRemote = getChangedFields(activeConflict.originalData || activeConflict.remoteData, activeConflict.remoteData)

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-4xl bg-zinc-900 border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Resolver Conflito de Dados</h2>
              <p className="text-sm text-zinc-400">ID da Entidade: {activeConflict.entityId}</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveConflict(null)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lado Local */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                <span>Sua Versão (Local)</span>
                <span className="text-blue-400">{changedLocal.size} alterações</span>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm font-mono whitespace-pre-wrap overflow-x-auto max-h-60 text-blue-200/80">
                {JSON.stringify(activeConflict.localData, null, 2)}
              </div>
            </div>

            {/* Lado Servidor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                <span>Servidor (Remoto)</span>
                <span className="text-amber-400">{changedRemote.size} alterações</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm font-mono whitespace-pre-wrap overflow-x-auto max-h-60 text-amber-200/80">
                {JSON.stringify(activeConflict.remoteData, null, 2)}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-400 italic">
            Dica: Se você não salvou dados críticos, recomendamos "Aceitar Servidor" para garantir que você esteja na versão mais recente.
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/80 flex flex-wrap gap-3 justify-end">
          <Button 
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            onClick={() => handleResolve('ACCEPT_REMOTE')}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Aceitar Servidor
          </Button>

          {safeToMerge && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={() => handleResolve('MERGE')}
            >
              <GitMerge className="w-4 h-4 mr-2" />
              Mesclar Automático
            </Button>
          )}

          <Button 
            className="bg-blue-600 hover:bg-blue-500 text-white"
            onClick={() => handleResolve('KEEP_LOCAL')}
          >
            <Save className="w-4 h-4 mr-2" />
            Manter Minha Versão
          </Button>
        </div>
      </Card>
    </div>
  )
}
