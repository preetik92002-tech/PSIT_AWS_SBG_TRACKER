import React from 'react'
import { Building2, Camera } from 'lucide-react'
import { cn } from '@/utils/cn'

export type CommunityImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface CommunityImageProps {
  src?: string | null
  name?: string
  shortName?: string
  size?: CommunityImageSize
  className?: string
  editable?: boolean
  onUploadClick?: () => void
  shape?: 'rounded' | 'square'
  alt?: string
}

const SIZE_CLASSES: Record<CommunityImageSize, { container: string; text: string; icon: number }> = {
  xs: { container: 'w-6 h-6 rounded-md', text: 'text-[9px]', icon: 12 },
  sm: { container: 'w-8 h-8 rounded-lg', text: 'text-[11px]', icon: 14 },
  md: { container: 'w-11 h-11 rounded-xl', text: 'text-xs', icon: 18 },
  lg: { container: 'w-16 h-16 rounded-xl', text: 'text-sm', icon: 24 },
  xl: { container: 'w-24 h-24 rounded-2xl', text: 'text-base', icon: 32 },
  '2xl': { container: 'w-32 h-32 rounded-2xl', text: 'text-lg', icon: 40 },
}

export const CommunityImage: React.FC<CommunityImageProps> = ({
  src,
  name = 'AWS Community',
  shortName,
  size = 'md',
  className,
  editable = false,
  onUploadClick,
  shape = 'rounded',
  alt,
}) => {
  const sizeConfig = SIZE_CLASSES[size]
  const displayLabel = shortName || name.slice(0, 4).toUpperCase()

  return (
    <div
      className={cn(
        'relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden border select-none transition-all',
        sizeConfig.container,
        shape === 'square' && 'rounded-none',
        'border-slate-800/80 bg-[#0A0E17] text-white shadow-xs',
        className
      )}
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt={alt || `${name} Community`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-br from-[#0F172A] to-[#0A0E17]">
          {/* Subtle technical grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
              backgroundSize: '8px 8px',
            }}
          />
          {size === 'xs' || size === 'sm' ? (
            <Building2 size={sizeConfig.icon} className="text-[#FF9900] relative z-10" />
          ) : (
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              <span className="text-[#FF9900] font-mono font-bold tracking-tight leading-none mb-0.5" style={{ fontSize: sizeConfig.icon * 0.7 }}>
                AWS
              </span>
              <span className={cn('font-mono font-bold text-slate-200 tracking-wider truncate max-w-full px-1', sizeConfig.text)}>
                {displayLabel}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Optional manager edit overlay */}
      {editable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onUploadClick?.()
          }}
          className="absolute inset-0 bg-slate-900/75 backdrop-blur-[2px] opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer z-20"
          title="Change official community image"
        >
          <Camera size={sizeConfig.icon * 0.7} className="text-[#FF9900] mb-0.5" />
          {size !== 'xs' && size !== 'sm' && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-200">
              Edit
            </span>
          )}
        </button>
      )}
    </div>
  )
}
