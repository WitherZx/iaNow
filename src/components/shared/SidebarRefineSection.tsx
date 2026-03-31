'use client'

import { Loader2, Send, Zap } from 'lucide-react'
import { Button } from '@/components/shared/Button'

interface SidebarRefineSectionProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  placeholder?: string
  label?: string
  hint?: string
}

export function SidebarRefineSection({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = "Descreva o que deseja mudar ou adicionar ao documento.",
  label = "Ajustar com IA",
  hint = "Descreva o que deseja mudar ou adicionar ao documento.",
}: SidebarRefineSectionProps) {
  return (
    <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-4 shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
        <Zap className="w-4 h-4 fill-primary" /> {label}
      </div>
      <p className="text-[11px] text-slate-500 font-medium">{hint}</p>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none h-32 font-semibold text-slate-700 placeholder:text-slate-400"
        />
        <Button
          size="icon"
          onClick={onSubmit}
          disabled={!value.trim() || isLoading}
          className="absolute bottom-3 right-3 rounded-xl shadow-lg shadow-primary/20 h-10 w-10 bg-primary hover:bg-blue-700 flex items-center justify-center p-0"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-white" />
          ) : (
            <Send size={16} className="text-white" />
          )}
        </Button>
      </div>
    </div>
  )
}
