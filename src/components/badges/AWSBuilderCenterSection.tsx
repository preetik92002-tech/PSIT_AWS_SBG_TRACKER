import React, { useState } from 'react'
import {
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Award,
  Link2,
  Shield,
  ArrowRight,
} from 'lucide-react'
import { AWSBuilderProfile } from '@/types/awsBadges'
import { AWSSyncBadgesModal } from './AWSSyncBadgesModal'

interface AWSBuilderCenterSectionProps {
  builderProfile: AWSBuilderProfile
  onViewBadgesTab?: () => void
}

export const AWSBuilderCenterSection: React.FC<AWSBuilderCenterSectionProps> = ({
  builderProfile,
  onViewBadgesTab,
}) => {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs relative overflow-hidden">
      {/* Ambient Radial Highlight */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-[#FF9900]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 flex items-center justify-center font-mono font-bold text-xs">
            AWS
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              AWS BUILDER CENTER
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              External verified developer credentials
            </p>
          </div>
        </div>

        {/* Connection Status Pill */}
        {builderProfile.connected ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={12} />
            CONNECTED
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
            NOT CONNECTED
          </span>
        )}
      </div>

      {/* Details Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] font-mono text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans block mb-0.5">
            AWS Builder Alias
          </span>
          <span className="text-white font-bold text-sm block">
            {builderProfile.alias}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans block mb-0.5">
            AWS Builder Badges
          </span>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#FF9900]">
              {builderProfile.badgeCount} earned
            </span>
            {onViewBadgesTab && (
              <button
                type="button"
                onClick={onViewBadgesTab}
                className="text-[11px] text-slate-300 hover:text-white font-sans hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
              >
                <span>View badges</span>
                <ArrowRight size={11} />
              </button>
            )}
          </div>
        </div>

        <div className="sm:col-span-2 pt-2 border-t border-[#1F293A]">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans block mb-0.5">
            AWS Builder Profile
          </span>
          <a
            href={builderProfile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#FF9900] hover:underline flex items-center gap-1.5 truncate"
          >
            <span className="truncate">{builderProfile.profileUrl}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
        <a
          href={builderProfile.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs"
        >
          <span>View AWS Builder Profile</span>
          <ExternalLink size={13} />
        </a>

        <button
          type="button"
          onClick={() => setIsSyncModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-slate-300 hover:text-white bg-[#18202E] hover:bg-[#202B3D] border border-[#1F293A] transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className="text-[#FF9900]" />
          <span>Sync Badges</span>
        </button>
      </div>

      {/* Sync Modal */}
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
