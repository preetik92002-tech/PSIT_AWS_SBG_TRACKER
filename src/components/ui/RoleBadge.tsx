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

  let style = 'bg-slate-800 text-slate-300 border-slate-700 font-semibold'
  let dotColor = 'bg-slate-400'

  if (normalizedRole === 'manager') {
    style = 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold'
    dotColor = 'bg-[#FF9900]'
  } else if (normalizedRole === 'admin') {
    style = 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-semibold'
    dotColor = 'bg-purple-400'
  } else if (normalizedRole === 'builder') {
    style = 'bg-orange-500/15 text-[#FF9900] border-orange-500/30 font-semibold'
    dotColor = 'bg-[#FF9900]'
  } else if (normalizedRole === 'leader') {
    style = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold'
    dotColor = 'bg-emerald-400'
  } else if (normalizedRole === 'member') {
    style = 'bg-blue-500/15 text-blue-300 border-blue-500/30 font-semibold'
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
