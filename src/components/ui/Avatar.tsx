import React from 'react'
import { cn } from '@/utils/cn'

interface AvatarProps {
  initials: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  className?: string
  online?: boolean
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-base',
}

// Deterministic color from initials (accessible contrast pairs)
const AVATAR_COLORS: [string, string][] = [
  ['#6D28D9', '#EDE9FE'], // violet
  ['#C2410C', '#FFEDD5'], // orange
  ['#15803D', '#DCFCE7'], // emerald
  ['#1D4ED8', '#DBEAFE'], // blue
  ['#BE185D', '#FCE7F3'], // pink
  ['#0E7490', '#CFFAFE'], // cyan
  ['#B45309', '#FEF3C7'], // amber
  ['#B91C1C', '#FEE2E2'], // red
]

function getAvatarColor(initials: string): [string, string] {
  const code = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  src,
  size = 'md',
  className,
  online,
}) => {
  const [fg, bg] = getAvatarColor(initials)

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={initials}
          className={cn(
            'flex-shrink-0 rounded-lg object-cover border border-slate-200/80 shadow-xs',
            SIZE_CLASSES[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center font-mono font-bold flex-shrink-0 rounded-lg',
            'border border-slate-200/80 shadow-xs',
            SIZE_CLASSES[size]
          )}
          style={{ background: bg, color: fg }}
        >
          {initials.slice(0, 2).toUpperCase()}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 block w-2 h-2 rounded-full border border-white bg-emerald-500"
          style={{ bottom: '-1px', right: '-1px' }}
        />
      )}
    </div>
  )
}
