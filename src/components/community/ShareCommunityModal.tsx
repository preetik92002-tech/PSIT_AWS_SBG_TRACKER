import React, { useState } from 'react'
import {
  X,
  Copy,
  Check,
  QrCode,
  Share2,
  ExternalLink,
  Building2,
  MapPin,
  Users,
} from 'lucide-react'
import { CommunityImage } from '@/components/ui/CommunityImage'

export interface ShareCommunityModalProps {
  isOpen: boolean
  onClose: () => void
  community: {
    id: string
    name: string
    shortName: string
    institutionName: string
    city: string
    code: string
    imageUrl?: string | null
    memberCount?: number
  }
}

export const ShareCommunityModal: React.FC<ShareCommunityModalProps> = ({
  isOpen,
  onClose,
  community,
}) => {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showQrPreview, setShowQrPreview] = useState(false)

  if (!isOpen) return null

  const joinLink = `${window.location.origin}/auth/join-community?code=${community.code}`

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(community.code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2200)
    } catch {
      // Fallback
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2200)
    } catch {
      // Fallback
    }
  }

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join ${community.name}`,
        text: `Join ${community.name} on AWS Journey Tracker with code: ${community.code}`,
        url: joinLink,
      }).catch(() => handleCopyLink())
    } else {
      handleCopyLink()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-live-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#131924] border border-[#232F40] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-live-modal-in text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2736] bg-[#0A0E17] text-white">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-[#FF9900]" />
            <h3 className="text-sm font-mono font-bold tracking-tight">Share Community</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Identity preview card */}
          <div className="flex items-start gap-4 p-4 rounded-xl border border-[#1F293A] bg-[#18202E]">
            <CommunityImage
              src={community.imageUrl}
              name={community.name}
              shortName={community.shortName}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF9900] font-bold block mb-0.5">
                Official AWS Chapter
              </span>
              <h4 className="text-sm font-mono font-bold text-white truncate leading-snug">
                {community.name}
              </h4>
              <p className="text-xs font-sans text-slate-300 truncate mt-0.5 flex items-center gap-1">
                <Building2 size={11} className="text-slate-400 flex-shrink-0" />
                <span>{community.institutionName}</span>
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                <span>{community.city}, India</span>
                {typeof community.memberCount === 'number' && (
                  <>
                    <span>•</span>
                    <span className="text-[#FF9900] font-semibold">{community.memberCount} Builders</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Join Code Highlight Box */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
            <span className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-300">
              Official Join Code
            </span>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xl sm:text-2xl font-mono font-bold text-white tracking-wider">
                {community.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-2xs transition-all cursor-pointer"
              >
                {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Actions List */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              {copiedLink ? <Check size={13} className="text-emerald-400" /> : <ExternalLink size={13} />}
              <span>{copiedLink ? 'Copied Link' : 'Copy Join Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Share2 size={13} className="text-[#FF9900]" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQrPreview((prev) => !prev)}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <QrCode size={13} className="text-[#FF9900]" />
              <span>{showQrPreview ? 'Hide QR' : 'View QR'}</span>
            </button>
          </div>

          {/* Interactive QR Code visualization */}
          {showQrPreview && (
            <div className="p-5 rounded-xl border border-[#1F293A] bg-[#18202E] flex flex-col items-center justify-center text-center space-y-3 animate-live-card-in">
              <div className="p-3 bg-white border border-slate-300 rounded-xl shadow-xs">
                {/* SVG QR Code Illustration */}
                <svg
                  className="w-36 h-36 text-slate-900"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  {/* Outer corner squares */}
                  <rect x="5" y="5" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="6" rx="2" />
                  <rect x="12" y="12" width="14" height="14" />
                  <rect x="67" y="5" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="6" rx="2" />
                  <rect x="74" y="12" width="14" height="14" />
                  <rect x="5" y="67" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="6" rx="2" />
                  <rect x="12" y="74" width="14" height="14" />
                  {/* Data patterns */}
                  <rect x="40" y="8" width="6" height="6" />
                  <rect x="52" y="14" width="8" height="6" />
                  <rect x="42" y="24" width="16" height="6" />
                  <rect x="8" y="42" width="6" height="8" />
                  <rect x="22" y="44" width="10" height="6" />
                  <rect x="42" y="42" width="14" height="14" fill="#FF9900" />
                  <rect x="62" y="40" width="8" height="10" />
                  <rect x="78" y="44" width="14" height="6" />
                  <rect x="40" y="68" width="8" height="8" />
                  <rect x="54" y="74" width="12" height="6" />
                  <rect x="74" y="68" width="6" height="12" />
                  <rect x="86" y="84" width="8" height="8" />
                  <rect x="44" y="86" width="14" height="8" />
                </svg>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Scan to join <strong className="text-white">{community.name}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#0D121B] border-t border-[#1E2736] flex items-center justify-between text-xs font-mono">
          <span className="text-[11px] text-slate-400">AWS Journey Tracker</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-[#232F40] bg-[#18202E] hover:bg-[#202B3D] text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
