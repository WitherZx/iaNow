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
  href: string
  title: string
  subtitle?: string
  date: string
  isGenerating?: boolean
  badge: BadgeInfo
  moduleLabel?: string
  icon: React.ReactNode
  generatingIcon?: React.ReactNode
  footerTags?: FooterTag[]
}

export function DocumentCard({
  id,
  href,
  title,
  subtitle,
  date,
  isGenerating = false,
  badge,
  moduleLabel,
  icon,
  generatingIcon,
  footerTags = [],
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
            isGenerating
              ? 'text-blue-500 shadow-blue-500/10'
              : 'text-primary group-hover:scale-110 group-hover:shadow-md'
          )}>
            {isGenerating && generatingIcon ? generatingIcon : icon}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 md:p-8 flex flex-col justify-center gap-y-3 min-w-0">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Mobile Icon */}
              <div className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                {isGenerating && generatingIcon ? generatingIcon : icon}
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

            {/* Date */}
            <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 whitespace-nowrap">
              <Calendar size={12} className="text-slate-400" />
              {date}
            </span>
          </div>

          {/* Title + Subtitle */}
          <div className="space-y-1 min-w-0">
            <h3 className={cn(
              'text-base md:text-xl font-black transition-colors leading-tight pr-8 md:pr-0',
              isGenerating ? 'text-slate-800' : 'text-slate-900 group-hover:text-primary'
            )}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-slate-500 text-[11px] md:text-sm font-bold uppercase tracking-widest">
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
          {isGenerating ? (
            <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-400">
              <Clock size={20} className="animate-spin" />
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
