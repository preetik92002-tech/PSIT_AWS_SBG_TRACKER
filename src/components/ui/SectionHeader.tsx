import React from 'react'
import { cn } from '@/utils/cn'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
  mono?: boolean
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  className,
  mono = true,
}) => {
  return (
    <div className={cn('section-header', className)}>
      {icon && <span className="text-[var(--accent)] opacity-80">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h3
            className={cn(
              'text-sm font-semibold text-text-primary tracking-tight whitespace-nowrap',
              mono && 'font-mono'
            )}
          >
            {title}
          </h3>
          {subtitle && (
            <span className="code-label hidden sm:block">{subtitle}</span>
          )}
          <div className="section-header-line" />
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
