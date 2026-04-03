'use client'

import React, { useState } from 'react'
import { X, Search, Gavel, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { cn } from '@/utils/cn'

interface TrackProcessModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (processNumber: string) => Promise<void>
}

export function TrackProcessModal({ isOpen, onClose, onSuccess }: TrackProcessModalProps) {
  const [processNumber, setProcessNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFormatCNJ = (val: string) => {
    // Remove tudo que não é dígito
    const digits = val.replace(/\D/g, '')
    // Aplica a máscara NNNNNNN-DD.AAAA.J.TR.OOOO (7-2.4.1.2.4)
    let formatted = digits
    if (digits.length > 7) formatted = digits.substring(0, 7) + '-' + digits.substring(7)
    if (digits.length > 9) formatted = formatted.substring(0, 10) + '.' + formatted.substring(10)
    if (digits.length > 13) formatted = formatted.substring(0, 15) + '.' + formatted.substring(15)
    if (digits.length > 14) formatted = formatted.substring(0, 17) + '.' + formatted.substring(17)
    if (digits.length > 16) formatted = formatted.substring(0, 20) + '.' + formatted.substring(20)

    setProcessNumber(formatted.substring(0, 25)) // Limite do formato CNJ com pontuação
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = processNumber.replace(/\D/g, '')

    if (clean.length < 20) {
      setError('O número CNJ deve ter exatamente 20 dígitos.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onSuccess(processNumber)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Falha ao iniciar acompanhamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-lg bg-white shadow-2xl rounded-[20px] sm:rounded-[32px] overflow-hidden border-none animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex flex-shrink-0 items-center justify-center text-primary">
              <Gavel size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">Acompanhar Processo</h3>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider sm:tracking-widest">Base de Dados Real • DataJud</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 mb-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider">
              Número Unificado do Processo (CNJ)
            </div>

            <div className="relative group">
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                <Search size={20} />
              </div>
              <input
                type="text"
                value={processNumber}
                onChange={(e) => handleFormatCNJ(e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                className={cn(
                  "w-full h-14 sm:h-16 bg-slate-50 border-2 rounded-xl sm:rounded-2xl pl-10 sm:pl-12 pr-4 text-sm sm:text-lg font-black tracking-widest text-slate-800 placeholder:text-slate-300 outline-none transition-all",
                  error ? "border-red-500 bg-red-50" : "border-slate-100 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5"
                )}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-[11px] font-bold uppercase tracking-tight animate-in slide-in-from-top-2">
                <Info size={14} /> {error}
              </div>
            )}
          </div>

          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex gap-3">
            <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700/80 font-bold leading-relaxed">
              O iaNow irá monitorar este processo 24h por dia. Notificaremos você assim que o tribunal registrar qualquer movimentação ou decisão nova.
            </p>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl border-slate-200 text-slate-500 font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-[1.5] h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-primary text-white font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest shadow-xl shadow-primary/20"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Sincronizando...
                </div>
              ) : (
                <span className="truncate">Iniciar Acompanhamento</span>
              )}
            </Button>
          </div>
        </form>

        {/* Footer info */}
        <div className="px-5 sm:px-8 pb-5 sm:pb-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> API Criptografada
          </div>
          <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sincronizado com CNJ
          </div>
        </div>
      </Card>
    </div>
  )
}
