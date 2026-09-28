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
      className={`rounded-xl border border-[#1F293A] bg-[#121824] p-4 sm:p-5 shadow-xs transition-all hover:border-slate-700/80 hover:bg-[#151D2B] ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${
                isDisconnected ? 'text-slate-500 text-base' : 'text-white'
              }`}
            >
              {value}
            </span>
            {statusLabel && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  status === 'disconnected'
                    ? 'border-amber-500/30 text-amber-300 bg-amber-500/10'
                    : status === 'coming-soon'
                    ? 'border-slate-700 text-slate-400 bg-slate-800'
                    : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                }`}
              >
                {statusLabel}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 sm:p-2.5 rounded-lg bg-[#18202E] border border-[#232F40] text-[#FF9900] flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
