'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from './Card'
import { cn } from '@/utils/cn'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  change?: number             // percentage (e.g., 12.5 = +12.5%)
  changeLabel?: string
  accent?: boolean
  className?: string
  style?: React.CSSProperties
}

export function MetricCard({ label, value, icon, change, changeLabel, accent, className, style }: MetricCardProps) {
  const trend = change == null ? null : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  const trendColor = trend === 'up' ? 'text-[#10B981]' : trend === 'down' ? 'text-[#EF4444]' : 'text-[#737373]'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <Card variant={accent ? 'accent' : 'default'} padding="md" className={cn("flex-1", className)} style={style}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-y-2">
          <span className={cn(
            "font-montserrat font-medium text-[13px]",
            accent ? "text-white/70" : "text-[#737373]"
          )}>{label}</span>
          <span className={cn(
            "font-montserrat font-bold text-[28px]",
            accent ? "text-white" : "text-[#171717]"
          )}>{value}</span>
          {change != null && (
            <div className="flex items-center gap-x-1.5">
              <TrendIcon size={14} className={trendColor} />
              <span className={cn("font-montserrat text-xs font-semibold", trendColor)}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              {changeLabel && <span className="text-xs text-[#A3A3A3] font-montserrat">{changeLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
            accent ? "bg-white/15 text-white" : "bg-primary/10 text-primary"
          )}>{icon}</div>
        )}
      </div>
    </Card>
  )
}
