import React from 'react'
import { Crown } from 'lucide-react'
import { cn } from '@/utils/cn'

export type BuilderAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface BuilderAvatarProps {
  src?: string | null
  name?: string
  alias?: string | null
  initials?: string
  size?: BuilderAvatarSize
  isManager?: boolean
  online?: boolean
  className?: string
  alt?: string
}

const SIZE_STYLES: Record<BuilderAvatarSize, {
  container: string
  text: string
  crownSize: number
  crownPos: string
  onlinePos: string
}> = {
  xs: {
    container: 'w-6 h-6 rounded-md',
    text: 'text-[9px]',
    crownSize: 9,
    crownPos: '-top-1.5 -right-1',
    onlinePos: 'bottom-0 right-0 w-1.5 h-1.5',
  },
  sm: {
    container: 'w-8 h-8 rounded-lg',
    text: 'text-[11px]',
    crownSize: 11,
    crownPos: '-top-2 -right-1.5',
    onlinePos: 'bottom-0 right-0 w-2 h-2',
  },
  md: {
    container: 'w-10 h-10 rounded-xl',
    text: 'text-xs',
    crownSize: 13,
    crownPos: '-top-2 -right-2',
    onlinePos: 'bottom-0 right-0 w-2.5 h-2.5',
  },
  lg: {
    container: 'w-14 h-14 rounded-2xl',
    text: 'text-base',
    crownSize: 16,
    crownPos: '-top-2.5 -right-2.5',
    onlinePos: 'bottom-0.5 right-0.5 w-3 h-3',
  },
  xl: {
    container: 'w-20 h-20 rounded-2xl',
    text: 'text-xl',
    crownSize: 20,
    crownPos: '-top-3 -right-3',
    onlinePos: 'bottom-1 right-1 w-3.5 h-3.5',
  },
  '2xl': {
    container: 'w-28 h-28 rounded-3xl',
    text: 'text-2xl',
    crownSize: 24,
    crownPos: '-top-3.5 -right-3.5',
    onlinePos: 'bottom-1.5 right-1.5 w-4 h-4',
  },
}

// Deterministic digital builder colors
const BUILDER_PALETTES = [
  { bg: '#0F172A', border: '#334155', accent: '#FF9900', hair: '#F97316' }, // AWS Orange builder
  { bg: '#1E1B4B', border: '#4338CA', accent: '#818CF8', hair: '#6366F1' }, // Indigo builder
  { bg: '#064E3B', border: '#059669', accent: '#34D399', hair: '#10B981' }, // Emerald builder
  { bg: '#312E81', border: '#4F46E5', accent: '#A5B4FC', hair: '#818CF8' }, // Violet builder
  { bg: '#701A75', border: '#A21CAF', accent: '#F472B6', hair: '#E879F9' }, // Magenta builder
  { bg: '#164E63', border: '#0891B2', accent: '#38BDF8', hair: '#06B6D4' }, // Cyan builder
]

function getBuilderPalette(seedStr: string) {
  let hash = 0
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % BUILDER_PALETTES.length
  return BUILDER_PALETTES[idx]
}

export const BuilderAvatar: React.FC<BuilderAvatarProps> = ({
  src,
  name = 'Builder',
  alias,
  initials,
  size = 'md',
  isManager = false,
  online,
  className,
  alt,
}) => {
  const cfg = SIZE_STYLES[size]
  const seed = alias || name || 'Builder'
  const computedInitials =
    initials ||
    name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() ||
    'B'

  const palette = getBuilderPalette(seed)

  return (
    <div className={cn('relative inline-flex flex-shrink-0 select-none', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden border font-mono font-bold shadow-xs transition-transform',
          cfg.container,
          src ? 'border-slate-200/90 bg-slate-100' : 'border-slate-800'
        )}
        style={{
          backgroundColor: src ? undefined : palette.bg,
          borderColor: src ? undefined : palette.border,
          color: palette.accent,
        }}
        title={`${name}${alias ? ` (@${alias})` : ''}${isManager ? ' · Chapter Manager' : ''}`}
      >
        {src ? (
          <img
            src={src}
            alt={alt || name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* Subtle voxel pixel grid texture */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
                backgroundSize: '4px 4px',
              }}
            />

            {/* Stylized top builder visor line */}
            <div
              className="absolute top-0 inset-x-0 h-1 opacity-70"
              style={{ backgroundColor: palette.hair }}
            />

            {/* Monogram */}
            <span className={cn('relative z-10 tracking-wider', cfg.text)}>
              {computedInitials}
            </span>
          </div>
        )}
      </div>

      {/* Chapter Manager Crown Indicator */}
      {isManager && (
        <span
          className={cn(
            'absolute z-20 flex items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-xs border border-white',
            cfg.crownPos
          )}
          style={{ width: cfg.crownSize * 1.35, height: cfg.crownSize * 1.35 }}
          title="Community Manager"
        >
          <Crown size={cfg.crownSize * 0.8} className="fill-current text-amber-950" />
        </span>
      )}

      {/* Online presence dot */}
      {online && (
        <span
          className={cn(
            'absolute z-20 rounded-full bg-emerald-500 ring-2 ring-white',
            cfg.onlinePos
          )}
        />
      )}
    </div>
  )
}
