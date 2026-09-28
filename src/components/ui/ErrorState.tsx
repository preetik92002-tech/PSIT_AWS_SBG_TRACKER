import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export interface ErrorStateProps {
  title?: string
  message?: string
  code?: string
  onRetry?: () => void
  className?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Service Unavailable',
  message = 'An unexpected issue occurred while fetching platform state.',
  code,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-rose-900/60 bg-rose-950/30 p-6 text-center shadow-xs ${className}`}
    >
      <div className="w-10 h-10 mx-auto rounded-xl bg-rose-900/40 border border-rose-800/60 flex items-center justify-center text-rose-400 mb-3">
        <AlertTriangle size={20} />
      </div>

      <h3 className="text-sm font-semibold font-mono text-rose-200 mb-1">
        {title}
      </h3>

      <p className="text-xs text-rose-300/80 max-w-md mx-auto mb-4 font-sans leading-relaxed">
        {message}
      </p>

      {code && (
        <div className="inline-block px-2.5 py-1 mb-4 rounded-md bg-[#0E141F] border border-rose-900/50 font-mono text-[11px] text-rose-300 shadow-xs">
          Error code: {code}
        </div>
      )}

      {onRetry && (
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FF9900] hover:bg-[#EC7211] text-slate-950 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}
    </div>
  )
}
