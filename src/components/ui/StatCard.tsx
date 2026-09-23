import React from 'react'

export interface StatCardProps {
  title: string
  value: string | number
  status?: 'connected' | 'disconnected' | 'coming-soon'
  statusLabel?: string
  subtitle?: string
  icon?: React.ReactNode
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  status = 'connected',
  statusLabel,
  subtitle,
  icon,
  className = '',
}) => {
  const isDisconnected = status === 'disconnected' || value === 'Unavailable' || value === 'Not connected'

  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${
                isDisconnected ? 'text-slate-400 text-base' : 'text-slate-900'
              }`}
            >
              {value}
            </span>
            {statusLabel && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  status === 'disconnected'
                    ? 'border-amber-200 text-amber-800 bg-amber-50'
                    : status === 'coming-soon'
                    ? 'border-slate-200 text-slate-500 bg-slate-100'
                    : 'border-emerald-200 text-emerald-800 bg-emerald-50'
                }`}
              >
                {statusLabel}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
