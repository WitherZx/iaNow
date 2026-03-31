'use client'

import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/shared/Card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface DashboardItemCardProps {
  id: string
  title: string
  description: string
  status: string
  date: string
  href: string
  isGenerating?: boolean
  isStale?: boolean
  isDeleted?: boolean
  onRestore?: () => void
  onDeletePermanent?: () => void
  className?: string
}

/**
 * A reusable card component for dashboard items like contracts, strategies, and processes.
 * Extracted from the main Dashboard page to ensure UI consistency across the platform.
 * 
 * @param id - Unique identifier for the item
 * @param title - Main title of the card
 * @param description - Short description text
 * @param status - Current status (e.g., 'ready', 'generating', 'processing')
 * @param date - Formatted date string to display
 * @param href - Target URL for navigation
 * @param isGenerating - Whether the item is currently being generated
 * @param isStale - Whether the generation process has timed out
 * @param isDeleted - Whether the item is marked as deleted
 * @param onRestore - Optional callback for restoring deleted items
 * @param onDeletePermanent - Optional callback for permanent deletion
 * @param className - Additional CSS classes for the container
 */
export function DashboardItemCard({
  id,
  title,
  description,
  status,
  date,
  href,
  isGenerating = false,
  isStale = false,
  isDeleted = false,
  onRestore,
  onDeletePermanent,
  className
}: DashboardItemCardProps) {
  const displayStatus = isStale ? 'timeout' : (isDeleted ? 'deleted' : status)

  return (
    <div className={cn("relative group/card h-full w-full", className)}>
      <Link
        href={isDeleted ? '#' : href}
        className={cn(
          "flex flex-col h-full w-full transition-all",
          isDeleted && "pointer-events-none opacity-60 grayscale-[0.5]"
        )}
      >
        <Card
          padding="sm"
          className={cn(
            "hover:border-primary/30 hover:shadow-md transition-all h-full min-h-[160px] flex flex-col",
            isDeleted ? "bg-slate-50 border-dashed border-slate-200" : "cursor-pointer group",
            isGenerating && !isStale && "opacity-80"
          )}
        >
          <div className="flex flex-col gap-y-3 h-full">
            <div className="flex items-center justify-between">
              <StatusBadge status={displayStatus as any} />
              <div className="flex items-center gap-1.5 overflow-hidden">
                {isGenerating && !isStale && <Loader2 className="w-2.5 h-2.5 text-primary animate-spin shrink-0" />}
                <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{date}</span>
              </div>
            </div>

            <h4 className={cn(
              "font-bold text-sm transition-colors line-clamp-2 leading-tight",
              isDeleted ? "text-slate-400" : "text-slate-900 group-hover:text-primary"
            )}>
              {title}
            </h4>

            <div className="flex-1 flex flex-col justify-start">
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </Card>
      </Link>

      {isDeleted && (onRestore || onDeletePermanent) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover/card:opacity-100 scale-90 group-hover/card:scale-100 transition-all z-10 w-[80%] mx-auto items-center">
          {onRestore && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRestore()
              }}
              className="w-full bg-white text-orange-600 font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-full border border-orange-200 shadow-lg hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RotateCcw size={12} strokeWidth={3} /> Restaurar
            </button>
          )}
          {onDeletePermanent && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDeletePermanent()
              }}
              className="w-full bg-white text-red-600 font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-full border border-red-200 shadow-lg hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Trash2 size={12} strokeWidth={3} /> Excluir Definitivo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
