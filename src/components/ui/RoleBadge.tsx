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

  let style = 'bg-slate-100 text-slate-700 border-slate-200 font-semibold'
  let dotColor = 'bg-slate-500'

  if (normalizedRole === 'manager') {
    style = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
    dotColor = 'bg-[#FF9900]'
  } else if (normalizedRole === 'admin') {
    style = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'
    dotColor = 'bg-purple-600'
  } else if (normalizedRole === 'builder') {
    style = 'bg-orange-50 text-orange-700 border-orange-200 font-semibold'
    dotColor = 'bg-[#FF9900]'
  } else if (normalizedRole === 'leader') {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
    dotColor = 'bg-emerald-500'
  } else if (normalizedRole === 'member') {
    style = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
    dotColor = 'bg-blue-500'
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
