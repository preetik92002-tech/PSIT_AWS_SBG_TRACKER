import React from 'react'
import { Building2, MapPin, ShieldCheck, Users } from 'lucide-react'

interface CommunityPreviewProps {
  name: string
  shortName: string
  institution: string
  city: string
  description?: string | null
  managerName?: string
  memberCount?: number
  isVerified?: boolean
}

export const CommunityPreview: React.FC<CommunityPreviewProps> = ({
  name,
  shortName,
  institution,
  city,
  description,
  managerName = 'Community Lead',
  memberCount = 1,
  isVerified = true,
}) => {
  return (
    <div className="rounded-2xl border-2 border-slate-200/90 bg-gradient-to-b from-slate-50 to-white p-5 shadow-lg relative overflow-hidden transition-all">
      {/* Banner header motif */}
      <div className="h-16 -mx-5 -mt-5 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] p-4 flex items-center justify-between text-white relative">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
          <span className="text-[11px] font-mono tracking-wider text-amber-400 uppercase font-bold">
            {shortName.trim() || 'AWS-CLUB'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isVerified && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
              <ShieldCheck size={11} className="text-[#FF9900]" />
              <span>Official Chapter</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="pt-4">
        <h3 className="text-base font-bold text-[#0F172A] leading-snug line-clamp-1">
          {name.trim() || 'Community Name'}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
          <Building2 size={13} className="text-[#FF9900] flex-shrink-0" />
          <span className="line-clamp-1">{institution.trim() || 'Institution Name'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
          <span>{city.trim() || 'City, India'}</span>
        </div>

        <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-slate-100">
          {description?.trim() ||
            'Community description will be displayed here for joining student builders.'}
        </p>

        {/* Metadata Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200/70 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">
              Manager
            </span>
            <span className="font-semibold text-slate-800 line-clamp-1">
              {managerName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">
              Active Members
            </span>
            <div className="flex items-center gap-1 font-semibold text-slate-800">
              <Users size={12} className="text-[#FF9900]" />
              <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
