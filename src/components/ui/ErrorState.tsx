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
      className={`rounded-lg border border-rose-900/40 bg-rose-950/20 p-6 text-center ${className}`}
    >
      <div className="w-10 h-10 mx-auto rounded-full bg-rose-900/30 border border-rose-700/50 flex items-center justify-center text-rose-400 mb-3">
        <AlertTriangle size={20} />
      </div>

      <h3 className="text-sm font-semibold font-mono text-rose-200 mb-1">
        {title}
      </h3>

      <p className="text-xs text-rose-300/80 max-w-md mx-auto mb-4 font-sans">
        {message}
      </p>

      {code && (
        <div className="inline-block px-2.5 py-1 mb-4 rounded bg-rose-950/80 border border-rose-900/60 font-mono text-[11px] text-rose-300">
          Error code: {code}
        </div>
      )}

      {onRetry && (
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-mono font-medium bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-800/60 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}
    </div>
  )
}
