'use client'

import React from 'react'
import { Pencil, Copy, Download, Trash2, Save, X, Printer } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { cn } from '@/utils/cn'

interface DocumentActionBarProps {
  onEdit?: () => void
  isEditing?: boolean
  onSave?: () => void
  isSaving?: boolean
  onCancel?: () => void
  onCopy?: () => void
  onDownload?: () => void
  onPrint?: () => void
  onDelete: () => void
  onViewHistory?: React.ReactNode
  className?: string
}

export function DocumentActionBar({
  onEdit,
  isEditing,
  onSave,
  isSaving = false,
  onCancel,
  onCopy,
  onDownload,
  onPrint,
  onDelete,
  onViewHistory,
  className
}: DocumentActionBarProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 group/actions bg-white p-2 rounded-2xl border border-slate-200 shadow-md transition-all hover:shadow-lg",
      className
    )}>
      {onEdit && !isEditing && (
        <Button 
          onClick={onEdit} 
          variant="outline" 
          size="icon" 
          title="Editar documento"
          className="h-10 w-10 rounded-xl border-slate-200 text-slate-900 hover:text-primary hover:border-primary/30 transition-all hover:scale-105"
        >
          <Pencil size={18} />
        </Button>
      )}

      {onEdit && isEditing && onCancel && onSave && (
        <div className="flex items-center gap-1.5 bg-emerald-500/10 p-1 rounded-xl border border-emerald-500/20">
          <Button 
            onClick={onCancel} 
            variant="ghost" 
            size="icon" 
            title="Cancelar edição"
            className="h-8 w-8 rounded-lg text-emerald-700 hover:bg-emerald-500/20"
          >
            <X size={16} />
          </Button>
          <Button 
            onClick={onSave} 
            isLoading={isSaving} 
            variant="ghost" 
            size="icon" 
            title="Salvar alterações"
            className="h-8 w-8 rounded-lg text-emerald-700 hover:bg-emerald-500/20"
          >
            {!isSaving && <Save size={16} />}
          </Button>
        </div>
      )}

      {onCopy && (
        <Button 
          onClick={onCopy} 
          variant="outline" 
          size="icon" 
          title="Copiar conteúdo"
          className="h-10 w-10 rounded-xl border-slate-200 text-slate-900 hover:text-primary hover:border-primary/30 transition-all hover:scale-105"
        >
          <Copy size={18} />
        </Button>
      )}

      {onDownload && (
        <Button 
          onClick={onDownload} 
          variant="outline" 
          size="icon" 
          title="Exportar PDF"
          className="h-10 w-10 rounded-xl border-slate-200 text-slate-900 hover:text-primary hover:border-primary/30 transition-all hover:scale-105"
        >
          <Download size={18} />
        </Button>
      )}

      {onPrint && (
        <Button 
          onClick={onPrint} 
          variant="outline" 
          size="icon" 
          title="Imprimir"
          className="h-10 w-10 rounded-xl border-slate-200 text-slate-900 hover:text-primary hover:border-primary/30 transition-all hover:scale-105"
        >
          <Printer size={18} />
        </Button>
      )}

      {onViewHistory}

      <Button 
        onClick={onDelete} 
        variant="outline" 
        size="icon" 
        title="Excluir documento"
        className="h-10 w-10 rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all hover:scale-105"
      >
        <Trash2 size={18} />
      </Button>
    </div>
  )
}
