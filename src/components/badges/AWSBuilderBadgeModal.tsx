import React from 'react'
import {
  X,
  ExternalLink,
  Calendar,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
} from 'lucide-react'
import { AWSBuilderBadge } from '@/types/awsBadges'
import { AWSBadgeEmblem } from './AWSBuilderBadgeCard'

interface AWSBuilderBadgeModalProps {
  badge: AWSBuilderBadge | null
  onClose: () => void
}

export const AWSBuilderBadgeModal: React.FC<AWSBuilderBadgeModalProps> = ({
  badge,
  onClose,
}) => {
  if (!badge) return null

  const isEarned = badge.status === 'earned'
  const isInProgress = badge.status === 'in_progress'
  const isLocked = badge.status === 'locked'

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xl p-6 sm:p-7 relative font-sans text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#FF9900]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button [X] */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#18202E] hover:bg-[#1F293A] border border-[#1F293A] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Top Header Badge Info */}
        <div className="flex flex-col items-center text-center pt-2 pb-4 border-b border-[#1F293A]">
          <AWSBadgeEmblem variant={badge.iconVariant} status={badge.status} size="lg" />

          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              {badge.category.replace('_', ' ')}
            </span>
            <span className="text-slate-600">•</span>
            {isEarned ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30">
                <CheckCircle2 size={12} />
                EARNED
              </span>
            ) : isInProgress ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Clock size={12} />
                IN PROGRESS ({badge.progress || 0}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
                <Lock size={12} />
                LOCKED
              </span>
            )}
          </div>

          <h2 className="mt-2 text-xl font-bold font-mono tracking-tight text-white">
            {badge.name}
          </h2>

          <p className="mt-2 text-xs text-slate-300 max-w-md leading-relaxed">
            {badge.description}
          </p>
        </div>

        {/* Details & Criteria Section */}
        <div className="py-4 space-y-3.5 text-xs font-mono divide-y divide-[#1F293A]/80">
          {/* Earned Date or Progress */}
          {isEarned && badge.earnedAt && (
            <div className="pt-2 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                <Calendar size={13} className="text-[#FF9900]" />
                Earned Date
              </span>
              <span className="text-white font-semibold">{badge.earnedAt}</span>
            </div>
          )}

          {isInProgress && (
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 font-sans">
                <span>Completion Status</span>
                <span className="text-blue-400 font-bold">{badge.progress || 0}% Complete</span>
              </div>
              <div className="w-full bg-[#18202E] h-2 rounded-full overflow-hidden border border-[#1F293A]">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${badge.progress || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Criteria Requirement */}
          {badge.criteria && (
            <div className="pt-3">
              <span className="text-slate-400 font-sans block mb-1">Badge Criteria</span>
              <p className="text-xs text-slate-200 font-sans leading-relaxed bg-[#0E141F] p-3 rounded-xl border border-[#1F293A]">
                {badge.criteria}
              </p>
            </div>
          )}

          {/* Source Attribution */}
          <div className="pt-3 flex items-center justify-between">
            <span className="text-slate-400 font-sans flex items-center gap-1.5">
              <Award size={13} className="text-purple-400" />
              Source Platform
            </span>
            <span className="text-slate-200">{badge.source}</span>
          </div>

          {/* Verification Protocol Notice */}
          <div className="pt-3 flex items-start gap-2 text-[11px] text-slate-400 font-sans leading-relaxed">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Official AWS Builder Center credentials authenticate cloud milestones. External badge syncing will be enabled upon official AWS API activation.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#1F293A] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-300 hover:text-white bg-[#18202E] hover:bg-[#1F293A] border border-[#1F293A] transition-colors cursor-pointer"
          >
            Close
          </button>

          {badge.sourceUrl ? (
            <a
              href={badge.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs"
            >
              <span>View on AWS Builder Center</span>
              <ExternalLink size={12} />
            </a>
          ) : (
            <span className="text-[11px] font-mono text-slate-500">Official catalog credential</span>
          )}
        </div>
      </div>
    </div>
  )
}
