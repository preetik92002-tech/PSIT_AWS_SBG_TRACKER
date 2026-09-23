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
      className={`rounded-xl border border-rose-200 bg-rose-50/80 p-6 text-center shadow-xs ${className}`}
    >
      <div className="w-10 h-10 mx-auto rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
        <AlertTriangle size={20} />
      </div>

      <h3 className="text-sm font-semibold font-mono text-rose-900 mb-1">
        {title}
      </h3>

      <p className="text-xs text-rose-700 max-w-md mx-auto mb-4 font-sans leading-relaxed">
        {message}
      </p>

      {code && (
        <div className="inline-block px-2.5 py-1 mb-4 rounded-md bg-white border border-rose-200 font-mono text-[11px] text-rose-800 shadow-xs">
          Error code: {code}
        </div>
      )}

      {onRetry && (
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FF9900] hover:bg-[#EC7211] text-white shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}
    </div>
  )
}
