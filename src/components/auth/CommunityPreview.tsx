import React from 'react'
import { Building2, MapPin, ShieldCheck, Users, Calendar } from 'lucide-react'
import { AWSLogo } from '@/components/ui/AWSLogo'

interface CommunityPreviewProps {
  name: string
  shortName: string
  institution: string
  city: string
  description?: string | null
  managerName?: string
  memberCount?: number | null
  creationDate?: string | null
  isVerified?: boolean
  bannerUrl?: string | null
}

export const CommunityPreview: React.FC<CommunityPreviewProps> = ({
  name,
  shortName,
  institution,
  city,
  description,
  managerName = 'Community Manager',
  memberCount = null,
  creationDate = null,
  isVerified = true,
  bannerUrl,
}) => {
  return (
    <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-sm relative overflow-hidden transition-all text-slate-100">
      {/* Community Banner with AWS Logo */}
      <div className="h-20 -mx-5 -mt-5 bg-gradient-to-r from-[#0E141F] via-[#161E28] to-[#0E141F] border-b border-[#1F293A] p-4 flex items-center justify-between text-white relative overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#FF9900]/20 rounded-full blur-xl pointer-events-none" />

        {/* Banner Left: AWS Logo & Short Name */}
        <div className="flex items-center gap-2.5 z-10">
          <AWSLogo size="xs" variant="inverted" />
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-[#FF9900] font-semibold">
              AWS Student Chapter
            </div>
            <div className="text-xs font-mono font-bold text-white tracking-wider uppercase">
              {shortName.trim() || 'TAG'}
            </div>
          </div>
        </div>

        {/* Banner Right: Chapter Badge */}
        {isVerified && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/10 text-white text-[10px] font-semibold z-10">
            <ShieldCheck size={12} className="text-[#FF9900]" />
            <span>Official Community</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="pt-4">
        {/* Community Name */}
        <h3 className="text-base font-bold text-white leading-snug line-clamp-1 font-mono">
          {name.trim() || 'Community Name'}
        </h3>

        {/* Institution & City */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1.5">
          <Building2 size={13} className="text-[#FF9900] flex-shrink-0" />
          <span className="line-clamp-1 font-medium">{institution.trim() || 'Institution'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
          <span>{city.trim() || 'City'}</span>
        </div>

        {/* Community Description */}
        <p className="text-xs text-slate-300 mt-3 line-clamp-3 leading-relaxed bg-[#0E141F] p-2.5 rounded-xl border border-[#1F293A]">
          {description?.trim() ||
            'Community description will appear here for student builders.'}
        </p>

        {/* Metadata Grid: Manager, Member Count, Creation Date */}
        <div className="mt-4 pt-3.5 border-t border-[#1F293A] grid grid-cols-3 gap-2 text-[11px]">
          {/* Community Manager */}
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">
              Manager
            </span>
            <span className="font-semibold text-white line-clamp-1">
              {managerName}
            </span>
          </div>

          {/* Member Count (Actual or Draft, NO FAKE COUNT) */}
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">
              Members
            </span>
            <div className="flex items-center gap-1 font-semibold text-white">
              <Users size={12} className="text-[#FF9900]" />
              {memberCount !== null && memberCount !== undefined ? (
                <span>
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </span>
              ) : (
                <span className="text-slate-500 font-normal italic">—</span>
              )}
            </div>
          </div>

          {/* Creation Date */}
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">
              Created
            </span>
            <div className="flex items-center gap-1 font-semibold text-white">
              <Calendar size={12} className="text-slate-400" />
              <span>{creationDate || 'Today'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
