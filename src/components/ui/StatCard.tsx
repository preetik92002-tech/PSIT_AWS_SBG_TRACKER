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
      className={`rounded-lg border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm transition-all hover:border-slate-700/80 ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.75) 0%, rgba(15, 23, 42, 0.65) 100%)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight font-mono ${
                isDisconnected ? 'text-slate-400 text-lg' : 'text-slate-100'
              }`}
            >
              {value}
            </span>
            {statusLabel && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  status === 'disconnected'
                    ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                    : status === 'coming-soon'
                    ? 'border-slate-700 text-slate-400 bg-slate-800/50'
                    : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                }`}
              >
                {statusLabel}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className="p-2.5 rounded-md bg-slate-800/60 border border-slate-700/40 text-slate-300">
            {icon}
          </div>
        )}
      </div>

      {subtitle && (
        <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5 font-sans">
          {subtitle}
        </p>
      )}
    </div>
  )
}
