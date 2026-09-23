import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  tag?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  tag,
  icon,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <div className={`border-b border-slate-200/90 pb-5 mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mb-2.5">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <React.Fragment key={crumb.label}>
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="hover:text-slate-900 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-slate-800 font-semibold' : ''}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && (
                  <ChevronRight size={12} className="text-slate-400" />
                )}
              </React.Fragment>
            )
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#FF9900] shadow-xs flex-shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900">
                {title}
              </h1>
              {tag && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
                  {tag}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
