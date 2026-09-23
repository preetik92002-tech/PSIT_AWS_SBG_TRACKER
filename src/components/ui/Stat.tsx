import React from 'react'
import { cn } from '@/utils/cn'

interface StatProps {
  label: string
  value: string | number
  sub?: string
  variant?: 'accent' | 'orange' | 'success' | 'warning' | 'info' | 'neutral'
  icon?: React.ReactNode
  delta?: number
  className?: string
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  sub,
  variant = 'neutral',
  icon,
  delta,
  className,
}) => {
  const variantClass = variant !== 'neutral' ? `stat-card ${variant}` : 'stat-card neutral'

  const deltaColor =
    delta === undefined ? '' : delta > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'

  return (
    <div className={cn(variantClass, className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="code-label text-[10px] uppercase tracking-wider mb-1.5">{label}</p>
          <p className="font-mono font-bold text-xl leading-none text-text-primary">
            {value}
          </p>
          {(sub || delta !== undefined) && (
            <div className="flex items-center gap-2 mt-1.5">
              {sub && <span className="code-label text-[11px]">{sub}</span>}
              {delta !== undefined && (
                <span className={cn('font-mono text-[10px] font-medium', deltaColor)}>
                  {delta > 0 ? '+' : ''}{delta}%
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-text-muted opacity-60 flex-shrink-0">{icon}</div>
        )}
      </div>
    </div>
  )
}
