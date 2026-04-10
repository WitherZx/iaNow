'use client'

import React from 'react'
import Link from 'next/link'
import { Calendar, ChevronRight, Clock } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { cn } from '@/utils/cn'

interface BadgeInfo {
  label: string
  icon?: React.ReactNode
  className?: string
}

interface FooterTag {
  icon: React.ReactNode
  label: string
}

interface DocumentCardProps {
  id: string
  onDelete?: (id: string) => void
  href: string
  title: string
  subtitle?: string
  date: string
  isGenerating?: boolean
  isTimeout?: boolean
  badge: BadgeInfo
  moduleLabel?: string
  icon: React.ReactNode
  generatingIcon?: React.ReactNode
  footerTags?: FooterTag[]
  timeoutIcon?: React.ReactNode
}

export function DocumentCard({
  id,
  href,
  title,
  subtitle,
  date,
  isGenerating = false,
  isTimeout = false,
  badge,
  moduleLabel,
  icon,
  generatingIcon,
  timeoutIcon,
  footerTags = [],
  onDelete,
}: DocumentCardProps) {
  const cardContent = (
    <Card className={cn(
      'p-0 overflow-hidden transition-all border-slate-200 group relative',
      isGenerating ? 'opacity-90 bg-slate-50/50' : 'hover:shadow-lg cursor-pointer'
    )}>
      <div className="flex flex-col md:flex-row md:items-stretch">
        {/* Left Icon Area — hidden on mobile */}
        <div className="hidden md:flex w-32 shrink-0 items-center justify-center bg-slate-50/50 border-r border-slate-200">
          <div className={cn(
            'w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-200 transition-all duration-500',
            isGenerating && !isTimeout
              ? 'text-blue-500 shadow-blue-500/10'
              : isTimeout
              ? 'text-amber-500 border-amber-200 bg-amber-50/30 shadow-amber-500/5'
              : 'text-primary group-hover:scale-110 group-hover:shadow-md'
          )}>
            {isGenerating && !isTimeout && generatingIcon ? generatingIcon : isTimeout ? (timeoutIcon ?? icon) : icon}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 md:p-8 flex flex-col justify-center gap-y-3 min-w-0">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Mobile Icon */}
              <div className={cn(
                "md:hidden flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                isGenerating && !isTimeout ? "bg-primary/10 text-primary" : isTimeout ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
              )}>
                {isGenerating && !isTimeout && generatingIcon ? generatingIcon : isTimeout ? (timeoutIcon ?? icon) : icon}
              </div>

              {/* Badge */}
              <span className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5',
                badge.className ?? 'bg-slate-100 text-slate-600 border-slate-200'
              )}>
                {badge.icon}
                {badge.label}
              </span>

              {/* Module label — hidden on very small screens */}
              {moduleLabel && !isGenerating && (
                <span className="hidden sm:inline text-[10px] font-bold text-slate-400 uppercase">
                  <span className="w-1 h-1 rounded-full bg-slate-400 inline-block mr-1" />
                  {moduleLabel}
                </span>
              )}
            </div>

            {/* Date + Global Actions */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 whitespace-nowrap">
                <Calendar size={12} className="text-slate-400" />
                {date}
              </span>

              {onDelete && !isGenerating && (
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (confirm('Deseja realmente excluir este item?')) {
                      onDelete(id)
                    }
                  }}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Excluir"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Title + Subtitle */}
          <div className="space-y-1 min-w-0">
            <h3 className={cn(
              'text-base md:text-xl font-black transition-colors leading-tight',
              isGenerating ? 'text-slate-800' : 'text-slate-900 group-hover:text-primary'
            )}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-slate-500 text-[11px] md:text-sm font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Footer Tags */}
          {!isGenerating && footerTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 border-t border-slate-100">
              {footerTags.map((tag, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-slate-600 uppercase">
                  {tag.icon}
                  {tag.label}
                </div>
              ))}
            </div>
          )}

          {/* Mobile chevron */}
          {!isGenerating && (
            <div className="md:hidden absolute top-1/2 -translate-y-1/2 right-4 text-slate-300">
              <ChevronRight size={20} />
            </div>
          )}
        </div>

        {/* Desktop Right Action */}
        <div className="hidden md:flex w-32 shrink-0 items-center justify-center bg-slate-50/50 border-l border-slate-200">
          {isGenerating && !isTimeout ? (
            <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-400">
              <Clock size={20} className="animate-spin" />
            </div>
          ) : isTimeout ? (
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
              <Clock size={20} />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm group-hover:bg-primary group-hover:border-primary group-hover:text-white group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
              <ChevronRight size={24} />
            </div>
          )}
        </div>
      </div>
    </Card>
  )

  if (isGenerating) return <div key={id}>{cardContent}</div>

  return (
    <Link key={id} href={href} className="block">
      {cardContent}
    </Link>
  )
}
