import React from 'react'
import { cn } from '@/utils/cn'

interface AvatarProps {
  initials: string
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

// Deterministic color from initials
const AVATAR_COLORS: [string, string][] = [
  ['#7c3aed', '#4c1d95'],
  ['#f97316', '#7c2d12'],
  ['#22c55e', '#14532d'],
  ['#3b82f6', '#1e3a8a'],
  ['#ec4899', '#831843'],
  ['#06b6d4', '#164e63'],
  ['#eab308', '#713f12'],
  ['#ef4444', '#7f1d1d'],
]

function getAvatarColor(initials: string): [string, string] {
  const code = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  size = 'md',
  className,
  online,
}) => {
  const [fg, bg] = getAvatarColor(initials)

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      <div
        className={cn(
          'flex items-center justify-center font-mono font-bold flex-shrink-0',
          'border border-white/10',
          SIZE_CLASSES[size]
        )}
        style={{ background: bg, color: fg }}
      >
        {initials.slice(0, 2).toUpperCase()}
      </div>
      {online && (
        <span
          className="absolute bottom-0 right-0 block w-2 h-2 rounded-full border border-[var(--surface)] bg-[var(--success)]"
          style={{ bottom: '-1px', right: '-1px' }}
        />
      )}
    </div>
  )
}
