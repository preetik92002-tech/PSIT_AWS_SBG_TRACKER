import React, { useState } from 'react'
import {
  Video,
  Plus,
  Radio,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  WifiOff,
  Trash2,
  Settings,
} from 'lucide-react'
import type { LiveSession } from '@/types/live'
import { LiveSessionModal } from '@/components/live/LiveSessionModal'
import { trackEvent } from '@/utils/analytics'

interface LiveSessionCardProps {
  eventTitle: string
  eventDateFormatted?: string
  communityId: string
  isManager: boolean
  session: LiveSession | null
  onSessionChange: (session: LiveSession | null) => void
}

export const LiveSessionCard: React.FC<LiveSessionCardProps> = ({
  eventTitle,
  eventDateFormatted,
  communityId: _communityId,
  isManager,
  session,
  onSessionChange,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showManageNotice, setShowManageNotice] = useState(false)

  const handleCreated = (newSession: LiveSession) => {
    onSessionChange(newSession)
  }

  const handleRemove = () => {
    onSessionChange(null)
  }

  const handleJoin = () => {
    if (session?.meetingUrl) {
      trackEvent('community_live_opened', { title: session.title })
      window.open(session.meetingUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // Check if a real meeting URL actually exists (Section 14: meeting_url !== null)
  const hasRealMeetingUrl = Boolean(session?.meetingUrl && session.meetingUrl.trim().length > 0)
  const isLive = session?.status === 'live'

  return (
    <div className="rounded-2xl border border-[#1F293A] bg-[#121824] shadow-xs overflow-hidden animate-live-card-in text-slate-100">
      {/* ============================================================== */}
      {/* 1. CARD HEADER STRIP                                           */}
      {/* ============================================================== */}
      <div className="px-5 py-3.5 border-b border-[#1E2736] flex items-center justify-between bg-[#0D121B]">
        <div className="flex items-center gap-2.5">
          {session && isLive ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              ● LIVE
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
              <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest">
                COMMUNITY LIVE
              </span>
            </div>
          )}

          <span className="text-slate-600">•</span>

          {/* Google Meet Provider Chip */}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#18202E] border border-[#232F40] text-[10px] font-mono font-semibold text-slate-200 shadow-2xs">
            <span className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            </span>
            Google Meet
          </span>
        </div>

        {/* Manager Actions / Status pill */}
        {isManager && session && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowManageNotice(true)}
              className="text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              [ Manage Session ]
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
              title="Remove session"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. CARD BODY CONTENT                                           */}
      {/* ============================================================== */}
      <div className="p-5 sm:p-6 space-y-4">
        {session ? (
          /* ========================================================== */
          /* CASE A: SESSION ATTACHED (Scheduled or Live)               */
          /* ========================================================== */
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-[#FF9900] uppercase tracking-wider block mb-1">
                Google Meet Live Session
              </span>
              <h3 className="text-base sm:text-lg font-mono font-bold text-white leading-snug">
                {session.title}
              </h3>
              {session.description && (
                <p className="text-xs font-sans text-slate-300 mt-1 leading-relaxed">
                  {session.description}
                </p>
              )}
            </div>

            {/* Date and Time badge */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Calendar size={13} className="text-[#FF9900]" />
              <span>{eventDateFormatted || 'Saturday · 6:00 PM'}</span>
            </div>

            {/* Join Button (Active only when real meeting_url exists) */}
            <div className="pt-1">
              {hasRealMeetingUrl ? (
                <button
                  type="button"
                  onClick={handleJoin}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-xs transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <Video size={14} />
                  <span>Join Google Meet →</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-500 bg-[#18202E] border border-[#232F40] cursor-not-allowed select-none"
                    title="Real meeting URL will activate once Google Meet is connected"
                  >
                    <Video size={14} />
                    <span>Join Google Meet →</span>
                  </button>
                  <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    Meeting link will activate once Google Meet connection is verified.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* CASE B: NO SESSION ATTACHED YET                            */
          /* ========================================================== */
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-mono font-bold text-white">
                Host a live session for this event.
              </h3>
              <p className="text-xs font-sans text-slate-400 leading-relaxed max-w-lg">
                Members can join directly from the platform using Google Meet.
              </p>
            </div>

            {/* Connection Status Box */}
            <div className="p-3.5 rounded-xl bg-[#18202E] border border-[#232F40] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <WifiOff size={14} className="text-slate-400" />
                <span className="text-slate-300">Google Meet connection:</span>
                <span className="text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-[11px]">
                  Not connected yet
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Ready for OAuth wiring</span>
            </div>

            {/* Manager vs Member Controls */}
            {isManager ? (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-xs transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <Plus size={14} />
                  <span>+ Create Google Meet</span>
                </button>
              </div>
            ) : (
              <p className="text-xs font-sans text-slate-400 italic">
                Your community manager can create a live session for this event.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <LiveSessionModal
          eventTitle={eventTitle}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Manage Session Notice */}
      {showManageNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-live-fade-in"
          onClick={() => setShowManageNotice(false)}
        >
          <div
            className="bg-[#131924] border border-[#232F40] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-live-modal-in text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Manage Live Session
            </h4>
            <p className="text-xs font-sans text-slate-300 leading-relaxed">
              Google Meet meeting settings and attendance synchronization will be configurable here once the backend integration is live.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowManageNotice(false)}
                className="w-full py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-[#18202E] hover:bg-[#202B3D] border border-slate-700/60"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
