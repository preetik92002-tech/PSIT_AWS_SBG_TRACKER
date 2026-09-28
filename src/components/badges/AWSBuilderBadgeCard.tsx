import React from 'react'
import {
  Cloud,
  Cpu,
  Shield,
  Sparkles,
  Users,
  Code2,
  Lock,
  GitBranch,
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { AWSBuilderBadge } from '@/types/awsBadges'

interface AWSBuilderBadgeCardProps {
  badge: AWSBuilderBadge
  onClick?: () => void
}

/**
 * Technical SVG Emblem for AWS Builder Center Badges
 */
export const AWSBadgeEmblem: React.FC<{
  variant: AWSBuilderBadge['iconVariant']
  status: AWSBuilderBadge['status']
  size?: 'sm' | 'md' | 'lg'
}> = ({ variant, status, size = 'md' }) => {
  const isEarned = status === 'earned'
  const isLocked = status === 'locked'

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }[size]

  const iconSizes = {
    sm: 16,
    md: 26,
    lg: 40,
  }[size]

  return (
    <div className={`relative ${sizeClasses} flex items-center justify-center select-none`}>
      {/* Outer Hexagonal Shield Background */}
      <svg
        className={`w-full h-full drop-shadow-sm transition-transform duration-300 ${
          isEarned ? 'group-hover:scale-105' : ''
        }`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          points="50,4 92,26 92,74 50,96 8,74 8,26"
          className={`${
            isEarned
              ? 'fill-[#18202E] stroke-[#FF9900] stroke-[2.5]'
              : isLocked
              ? 'fill-[#0E141F] stroke-[#1F293A] stroke-[1.5]'
              : 'fill-[#141C29] stroke-blue-500/50 stroke-[2]'
          }`}
        />
        {/* Subtle inner geometric facet */}
        <polygon
          points="50,14 82,32 82,68 50,86 18,68 18,32"
          className={`${
            isEarned
              ? 'fill-[#FF9900]/10 stroke-[#FF9900]/30 stroke-[1]'
              : 'fill-transparent stroke-[#1F293A]/50 stroke-[1]'
          }`}
        />
      </svg>

      {/* Center Technical Symbol */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          isEarned
            ? 'text-[#FF9900]'
            : isLocked
            ? 'text-slate-600'
            : 'text-blue-400'
        }`}
      >
        {isLocked ? (
          <Lock size={iconSizes} className="opacity-60" />
        ) : variant === 'cloud' ? (
          <Cloud size={iconSizes} />
        ) : variant === 'serverless' ? (
          <span className="font-mono font-bold text-xl sm:text-2xl leading-none">λ</span>
        ) : variant === 'bedrock' ? (
          <Sparkles size={iconSizes} />
        ) : variant === 'security' ? (
          <Shield size={iconSizes} />
        ) : variant === 'community' ? (
          <Users size={iconSizes} />
        ) : variant === 'devops' ? (
          <GitBranch size={iconSizes} />
        ) : variant === 'architecture' ? (
          <Layers size={iconSizes} />
        ) : (
          <Cpu size={iconSizes} />
        )}
      </div>

      {/* Small Status Glow Indicator */}
      {isEarned && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF9900] text-slate-950 flex items-center justify-center shadow-xs">
          <CheckCircle2 size={11} strokeWidth={3} />
        </div>
      )}
    </div>
  )
}

export const AWSBuilderBadgeCard: React.FC<AWSBuilderBadgeCardProps> = ({
  badge,
  onClick,
}) => {
  const isEarned = badge.status === 'earned'
  const isInProgress = badge.status === 'in_progress'
  const isLocked = badge.status === 'locked'

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      className={`group relative rounded-2xl p-5 transition-all duration-200 border flex flex-col justify-between text-left cursor-pointer select-none ${
        isEarned
          ? 'bg-[#121824] hover:bg-[#162030] border-[#1F293A] hover:border-[#FF9900]/60 shadow-sm hover:shadow-md hover:shadow-[#FF9900]/5'
          : isInProgress
          ? 'bg-[#101622] hover:bg-[#141C2B] border-[#1F293A] hover:border-slate-600'
          : 'bg-[#0D121B] opacity-75 hover:opacity-90 border-[#1F293A]/60'
      }`}
    >
      {/* Top Header Row with Status Tag */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          {badge.category.replace('_', ' ')}
        </span>

        {isEarned ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30">
            EARNED
          </span>
        ) : isInProgress ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock size={10} /> IN PROGRESS
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <Lock size={10} /> LOCKED
          </span>
        )}
      </div>

      {/* Center Emblem Visual */}
      <div className="my-3 flex flex-col items-center text-center">
        <AWSBadgeEmblem variant={badge.iconVariant} status={badge.status} size="md" />

        <h3 className="mt-3.5 text-sm font-bold font-mono tracking-tight text-white group-hover:text-[#FF9900] transition-colors leading-snug">
          {badge.name}
        </h3>

        <p className="mt-1 text-xs text-slate-400 font-sans line-clamp-2 leading-relaxed">
          {badge.description}
        </p>
      </div>

      {/* Bottom Metadata & Progress Footer */}
      <div className="pt-3 mt-2 border-t border-[#1F293A] text-[11px] font-mono">
        {isEarned ? (
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-slate-500">Earned:</span>
            <span className="text-slate-200 font-semibold">{badge.earnedAt}</span>
          </div>
        ) : isInProgress ? (
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-slate-500">Progress:</span>
              <span className="text-blue-400 font-bold">{badge.progress || 0}%</span>
            </div>
            <div className="w-full bg-[#18202E] h-1.5 rounded-full overflow-hidden border border-[#1F293A]">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${badge.progress || 0}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-center text-[10px]">
            Requires verified milestone
          </div>
        )}

        {/* Source Attribution */}
        <div className="mt-2 pt-1.5 flex items-center justify-between text-[10px] text-slate-500">
          <span>{badge.source}</span>
          {badge.isDemo && (
            <span className="text-amber-500/70 font-sans text-[9px] uppercase tracking-wide">
              Demo Model
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
