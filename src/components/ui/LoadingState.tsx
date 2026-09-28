import React from 'react'
import { Loader2 } from 'lucide-react'

export interface LoadingStateProps {
  message?: string
  className?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading platform resources...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <Loader2 size={32} className="animate-spin text-[#FF9900] mb-3" />
      <p className="text-sm font-mono text-slate-400 font-medium">{message}</p>
    </div>
  )
}

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-xl border border-[#1F293A] bg-[#121824] p-5 animate-pulse shadow-xs ${className}`}>
    <div className="h-3 w-24 bg-slate-800 rounded mb-4" />
    <div className="h-7 w-36 bg-slate-800 rounded mb-2" />
    <div className="h-3 w-48 bg-slate-700/60 rounded" />
  </div>
)

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full rounded-xl border border-[#1F293A] bg-[#121824] overflow-hidden animate-pulse shadow-xs">
    <div className="h-10 bg-[#18202E] border-b border-[#1F293A] px-4 flex items-center gap-4">
      <div className="h-3 w-16 bg-slate-800 rounded" />
      <div className="h-3 w-28 bg-slate-800 rounded" />
      <div className="h-3 w-36 bg-slate-800 rounded" />
      <div className="h-3 w-20 bg-slate-800 rounded" />
    </div>
    <div className="divide-y divide-[#1F293A]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 px-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0" />
          <div className="h-3.5 w-32 bg-slate-800 rounded" />
          <div className="h-3.5 w-44 bg-slate-700/60 rounded" />
          <div className="h-5 w-16 bg-slate-800 rounded-full" />
        </div>
      ))}
    </div>
  </div>
)
