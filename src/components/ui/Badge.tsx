import React from 'react'
import { cn } from '@/utils/cn'

interface BadgeProps {
  variant?: 'accent' | 'orange' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'
  size?: 'sm' | 'md'
  dot?: boolean
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot,
  children,
  className,
}) => {
  const variants = {
    accent:  'bg-[var(--accent-dim)] text-[var(--accent-bright)] border border-[var(--accent)]/40',
    orange:  'bg-[var(--accent-secondary-dim)] text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30',
    success: 'bg-[var(--success-dim)] text-[var(--success)] border border-[var(--success)]/30',
    warning: 'bg-[var(--warning-dim)] text-[var(--warning)] border border-[var(--warning)]/30',
    danger:  'bg-[var(--danger-dim)] text-[var(--danger)] border border-[var(--danger)]/30',
    neutral: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]',
    info:    'bg-[var(--info-dim)] text-[var(--info)] border border-[var(--info)]/30',
  }

  const sizes = {
    sm: 'px-1.5 py-0.5 text-[9px]',
    md: 'px-2 py-0.5 text-[10px]',
  }

  return (
    <span className={cn('badge', variants[variant], sizes[size], className)}>
      {dot && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  )
}
