import React from 'react'
import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  accent?: 'left' | 'top' | 'none'
  accentColor?: 'accent' | 'orange' | 'success' | 'warning' | 'danger'
  hover?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  accent = 'none',
  accentColor = 'accent',
  hover,
  onClick,
  padding = 'md',
}) => {
  const accentColors = {
    accent:  'var(--accent)',
    orange:  'var(--accent-secondary)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger:  'var(--danger)',
  }

  const paddings = {
    none: '',
    sm:   'p-3',
    md:   'p-4',
    lg:   'p-6',
  }

  const style: React.CSSProperties = {}
  if (accent === 'left') {
    style.borderLeft = `2px solid ${accentColors[accentColor]}`
    style.paddingLeft = padding === 'md' ? '14px' : undefined
  }
  if (accent === 'top') {
    style.borderTop = `2px solid ${accentColors[accentColor]}`
  }

  return (
    <div
      className={cn(
        'card',
        paddings[padding],
        hover && 'cursor-pointer transition-colors duration-150 hover:bg-[var(--surface-secondary)] hover:border-[var(--border-bright)]',
        onClick && 'cursor-pointer',
        className
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
