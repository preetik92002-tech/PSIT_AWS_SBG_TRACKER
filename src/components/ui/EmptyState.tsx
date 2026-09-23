import React from 'react'
import { FolderGit2 } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  badge?: string
  action?: {
    label: string
    onClick?: () => void
  }
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  badge,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-slate-800 bg-slate-900/30 ${className}`}
    >
      <div className="w-12 h-12 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 mb-4 shadow-sm">
        {icon || <FolderGit2 size={22} className="text-slate-400" />}
      </div>

      {badge && (
        <span className="mb-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700/60">
          {badge}
        </span>
      )}

      <h3 className="text-base font-semibold text-slate-200 tracking-tight mb-1 font-mono">
        {title}
      </h3>

      <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium font-mono text-slate-200 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-md transition-colors shadow-sm cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
