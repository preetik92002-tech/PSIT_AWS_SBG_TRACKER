import React from 'react'
import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number // 0-100
  variant?: 'accent' | 'orange' | 'success' | 'warning' | 'danger'
  size?: 'xs' | 'sm' | 'md'
  label?: string
  showValue?: boolean
  className?: string
  animated?: boolean
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = 'accent',
  size = 'sm',
  label,
  showValue,
  className,
  animated = true,
}) => {
  const clamped = Math.max(0, Math.min(100, value))

  const variants = {
    accent:  'from-[var(--accent)] to-[var(--accent-bright)]',
    orange:  'from-[var(--accent-secondary)] to-orange-400',
    success: 'from-[var(--success)] to-emerald-400',
    warning: 'from-[var(--warning)] to-yellow-400',
    danger:  'from-[var(--danger)] to-red-400',
  }

  const heights = {
    xs: 'h-[2px]',
    sm: 'h-[3px]',
    md: 'h-[6px]',
  }

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="code-label">{label}</span>}
          {showValue && (
            <span className="code-label text-[10px]">{clamped.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className={cn('xp-bar w-full', heights[size])}>
        <div
          className={cn('xp-bar-fill bg-gradient-to-r', variants[variant], animated && 'transition-all duration-700 ease-out')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
