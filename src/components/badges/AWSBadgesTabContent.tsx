import React, { useState } from 'react'
import {
  Award,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Lock,
  Filter,
} from 'lucide-react'
import { AWSBuilderBadge, AWSBuilderProfile } from '@/types/awsBadges'
import { AWSBuilderBadgeCard } from './AWSBuilderBadgeCard'
import { AWSBuilderBadgeModal } from './AWSBuilderBadgeModal'
import { AWSSyncBadgesModal } from './AWSSyncBadgesModal'

interface AWSBadgesTabContentProps {
  builderProfile: AWSBuilderProfile
  onSyncClick?: () => void
}

export const AWSBadgesTabContent: React.FC<AWSBadgesTabContentProps> = ({
  builderProfile,
  onSyncClick,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<AWSBuilderBadge | null>(null)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'earned' | 'in_progress' | 'locked'>('all')

  const earnedBadges = builderProfile.badges.filter((b) => b.status === 'earned')
  const inProgressBadges = builderProfile.badges.filter((b) => b.status === 'in_progress')
  const lockedBadges = builderProfile.badges.filter((b) => b.status === 'locked')

  const filteredBadges = builderProfile.badges.filter((b) => {
    if (filter === 'earned') return b.status === 'earned'
    if (filter === 'in_progress') return b.status === 'in_progress'
    if (filter === 'locked') return b.status === 'locked'
    return true
  })

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* TAB HEADER & CONNECTION STATUS BAR                           */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-[#FF9900]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF9900]">
                AWS BUILDER CENTER BADGES
              </span>
              <span className="text-slate-600">•</span>
              {builderProfile.connected ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 size={11} /> CONNECTED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  NOT CONNECTED
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold font-mono tracking-tight text-white">
              Recognition from your AWS Builder journey.
            </h2>

            <p className="text-xs text-slate-400 font-sans mt-1 max-w-xl">
              Authentic credentials earned on builder.aws.com across foundational architectures, serverless implementations, and community contributions.
            </p>
          </div>

          {/* Sync & View Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (onSyncClick) onSyncClick()
                else setIsSyncModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-[#18202E] hover:bg-[#202B3D] border border-[#1F293A] transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} className="text-[#FF9900]" />
              <span>Sync Badges</span>
            </button>

            {builderProfile.profileUrl && (
              <a
                href={builderProfile.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs"
              >
                <span>View AWS Builder Profile</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>

        {/* Badge Metric Counters Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#1F293A] font-mono">
          <div className="p-3 rounded-xl bg-[#18202E]/60 border border-[#1F293A]">
            <span className="text-[10px] text-slate-400 block">TOTAL BADGES</span>
            <span className="text-lg font-bold text-white mt-0.5 block">
              {builderProfile.badges.length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#18202E]/60 border border-[#1F293A]">
            <span className="text-[10px] text-slate-400 block">EARNED</span>
            <span className="text-lg font-bold text-[#FF9900] mt-0.5 block">
              {earnedBadges.length} earned
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#18202E]/60 border border-[#1F293A]">
            <span className="text-[10px] text-slate-400 block">IN PROGRESS</span>
            <span className="text-lg font-bold text-blue-400 mt-0.5 block">
              {inProgressBadges.length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#18202E]/60 border border-[#1F293A]">
            <span className="text-[10px] text-slate-400 block">LOCKED</span>
            <span className="text-lg font-bold text-slate-400 mt-0.5 block">
              {lockedBadges.length}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTER PILLS                                                 */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-[#0E141F] border border-[#1F293A] p-1 rounded-xl font-mono text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#FF9900] text-slate-950 font-bold shadow-2xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({builderProfile.badges.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('earned')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'earned'
                ? 'bg-[#FF9900] text-slate-950 font-bold shadow-2xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Earned ({earnedBadges.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'in_progress'
                ? 'bg-[#FF9900] text-slate-950 font-bold shadow-2xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            In Progress ({inProgressBadges.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('locked')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'locked'
                ? 'bg-[#FF9900] text-slate-950 font-bold shadow-2xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Locked ({lockedBadges.length})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Independent from internal Community XP</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* BADGES GRID                                                  */}
      {/* ============================================================ */}
      {filteredBadges.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-dashed border-[#1F293A] bg-[#0E141F] p-8">
          <Award size={36} className="text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white font-mono">No Badges in This Category</h3>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Switch filter tabs to explore earned, in-progress, or locked AWS Builder Center badges.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredBadges.map((badge) => (
            <AWSBuilderBadgeCard
              key={badge.id}
              badge={badge}
              onClick={() => setSelectedBadge(badge)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AWSBuilderBadgeModal
        badge={selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />

      {/* Sync Badges Modal */}
      <AWSSyncBadgesModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        alias={builderProfile.alias}
        profileUrl={builderProfile.profileUrl}
        isConnected={builderProfile.connected}
      />
    </div>
  )
}
