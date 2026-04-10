'use client'

import React, { useEffect, useState } from 'react'
import { conflictStore } from '@/lib/conflict/conflictStore'
import { ConflictItem } from '@/lib/conflict/types'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/shared/Button'

export function ConflictToast({ onOpenResolver }: { onOpenResolver: (id: string) => void }) {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])

  useEffect(() => {
    const unsubscribe = conflictStore.subscribe((items) => {
      setConflicts(items)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  if (conflicts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex flex-col gap-3">
        {conflicts.map((conflict) => (
          <div 
            key={conflict.id}
            className="flex items-center gap-4 bg-red-950/90 border border-red-500/30 backdrop-blur-md p-4 rounded-xl shadow-2xl max-w-md"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Conflito detectado</p>
              <p className="text-xs text-red-200/60 truncate">
                {conflict.type === 'DELETE_VS_UPDATE' ? 'O item foi deletado no servidor.' : 'Outro usuário alterou este item.'}
              </p>
            </div>

            <Button 
              size="sm" 
              className="bg-red-500 hover:bg-red-400 text-white rounded-lg flex items-center gap-2"
              onClick={() => onOpenResolver(conflict.id)}
            >
              Resolver
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
