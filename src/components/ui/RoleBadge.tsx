import React from 'react'

export interface RoleBadgeProps {
  role: 'admin' | 'member' | 'builder' | 'leader' | string
  size?: 'sm' | 'md'
  className?: string
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'md',
  className = '',
}) => {
  const normalizedRole = role.toLowerCase()

  let style = 'bg-slate-800/80 text-slate-300 border-slate-700/60'
  let dotColor = 'bg-slate-400'

  if (normalizedRole === 'admin') {
    style = 'bg-purple-950/40 text-purple-300 border-purple-800/50'
    dotColor = 'bg-purple-400'
  } else if (normalizedRole === 'builder') {
    style = 'bg-amber-950/40 text-amber-300 border-amber-800/50'
    dotColor = 'bg-amber-400'
  } else if (normalizedRole === 'leader') {
    style = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
    dotColor = 'bg-emerald-400'
  } else if (normalizedRole === 'member') {
    style = 'bg-blue-950/40 text-blue-300 border-blue-800/50'
    dotColor = 'bg-blue-400'
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5'

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded-full border tracking-wide uppercase ${sizeClasses} ${style} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{role}</span>
    </span>
  )
}
