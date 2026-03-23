'use client'

import { useState, useRef } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface FieldTooltipProps {
  text: string
  className?: string
}

export function FieldTooltip({ text, className }: FieldTooltipProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<'top' | 'bottom'>('top')
  const ref = useRef<HTMLSpanElement>(null)

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPosition(rect.top > 120 ? 'top' : 'bottom')
    }
    setVisible(true)
  }

  return (
    <span
      ref={ref}
      className={cn('relative inline-flex items-center ml-1.5 align-middle', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
      onFocus={handleMouseEnter}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      role="tooltip"
      aria-label={text}
    >
      <HelpCircle
        size={12}
        className="text-slate-300 hover:text-primary transition-colors cursor-help"
        strokeWidth={2.5}
      />

      {visible && (
        <span
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-[200] w-64 max-w-xs px-3 py-2.5',
            'bg-slate-900 text-white text-[11px] font-medium leading-relaxed rounded-xl shadow-2xl',
            'pointer-events-none animate-in fade-in zoom-in-95 duration-150',
            'whitespace-normal text-left normal-case',
            position === 'top'
              ? 'bottom-full mb-2'
              : 'top-full mt-2'
          )}
          style={{ minWidth: '180px' }}
        >
          {/* Arrow */}
          <span
            className={cn(
              'absolute left-1/2 -translate-x-1/2 w-0 h-0',
              'border-l-[5px] border-r-[5px] border-transparent',
              position === 'top'
                ? 'top-full border-t-[5px] border-t-slate-900'
                : 'bottom-full border-b-[5px] border-b-slate-900'
            )}
          />
          {text}
        </span>
      )}
    </span>
  )
}
