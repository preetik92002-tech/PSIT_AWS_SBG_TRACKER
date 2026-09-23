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
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-slate-200 bg-white/80 shadow-xs ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#FF9900] mb-4 shadow-xs">
        {icon || <FolderGit2 size={22} className="text-[#FF9900]" />}
      </div>

      {badge && (
        <span className="mb-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200/80 font-semibold">
          {badge}
        </span>
      )}

      <h3 className="text-base font-semibold text-slate-900 tracking-tight mb-1 font-mono">
        {title}
      </h3>

      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold font-mono text-white bg-[#FF9900] hover:bg-[#EC7211] rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
