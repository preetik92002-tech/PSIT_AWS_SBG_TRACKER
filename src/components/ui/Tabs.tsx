import React, { useState, useRef } from 'react'
import { cn } from '@/utils/cn'

interface TabItem {
  key: string
  label: string
  icon?: React.ReactNode
  count?: number
}

interface TabsProps {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({ items, active, onChange, className }) => {
  return (
    <div className={cn('flex gap-0 border-b border-[var(--border)]', className)}>
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono font-medium',
              'border-b-2 -mb-px transition-all duration-150',
              isActive
                ? 'border-[var(--accent)] text-[var(--accent-bright)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-bright)]'
            )}
          >
            {item.icon && <span className="opacity-70">{item.icon}</span>}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[9px] font-bold min-w-[18px] text-center',
                  isActive
                    ? 'bg-[var(--accent-dim)] text-[var(--accent-bright)]'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Simple inline tooltip ────────────────────────────────────────────────
interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top' }) => {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 whitespace-nowrap',
            'bg-[var(--surface-raised)] border border-[var(--border-bright)]',
            'text-[10px] font-mono text-[var(--text-primary)]',
            'pointer-events-none',
            positions[side]
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
