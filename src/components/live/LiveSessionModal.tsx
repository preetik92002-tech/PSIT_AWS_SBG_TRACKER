import React, { useState } from 'react'
import {
  Video,
  X,
  Wifi,
  WifiOff,
  Loader2,
  Calendar,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import type {
  LiveSession,
  CreateLiveSessionInput,
  LiveSessionProvider,
} from '@/types/live'
import { trackEvent } from '@/utils/analytics'

interface LiveSessionModalProps {
  eventTitle: string
  eventDate?: string
  eventTime?: string
  onClose: () => void
  onCreated: (session: LiveSession) => void
}

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({
  eventTitle,
  eventDate = 'Saturday',
  eventTime = '6:00 PM',
  onClose,
  onCreated: _onCreated,
}) => {
  const [showConfigNotice, setShowConfigNotice] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnectClick = () => {
    trackEvent('google_meet_connect_clicked', { event: eventTitle })
    setIsConnecting(true)
    setTimeout(() => {
      setIsConnecting(false)
      setShowConfigNotice(true)
    }, 400)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-live-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#131924] border border-[#232F40] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-live-modal-in text-slate-100">
        {/* ============================================================== */}
        {/* STATE A: GOOGLE MEET CONNECTION REQUIRED NOTICE                */}
        {/* ============================================================== */}
        {showConfigNotice ? (
          <div className="p-6 sm:p-7 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-xs">
              <WifiOff size={26} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF9900] font-bold">
                INTEGRATION PENDING
              </span>
              <h3 className="text-base sm:text-lg font-mono font-bold text-white uppercase tracking-tight">
                GOOGLE MEET CONNECTION REQUIRED
              </h3>
              <p className="text-xs font-sans text-slate-300 leading-relaxed max-w-sm mx-auto">
                Google Meet will become available after Google OAuth is configured in your Supabase project.
              </p>
            </div>

            <div className="p-3.5 bg-[#18202E] border border-[#232F40] rounded-xl text-left text-[11px] font-mono text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
                <span>Backend Configuration Status</span>
              </div>
              <p className="text-slate-400 font-sans">
                Google Cloud Project client ID and redirect URI will be provisioned in the next deployment phase.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-xs font-mono font-bold text-slate-200 bg-[#18202E] hover:bg-[#202B3D] border border-slate-700/60 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* STATE B: CREATE COMMUNITY LIVE MODAL                           */
          /* ============================================================== */
          <div>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2736] bg-[#0A0E17] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                  <Video size={14} className="text-[#FF9900]" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold tracking-tight">
                    CREATE COMMUNITY LIVE
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Google Meet Live Video Session
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Provider Presentation */}
              <div className="p-4 rounded-xl border border-[#232F40] bg-[#18202E] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Provider
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#131923] border border-[#232F40] text-[10px] font-mono font-bold text-slate-200 shadow-2xs">
                    <span className="flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                    </span>
                    Google Meet
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white">
                    Google Meet
                  </h4>
                  <p className="text-[11px] font-sans text-slate-300 mt-0.5">
                    Live video meeting • Join directly from the event
                  </p>
                </div>
              </div>

              {/* Event Details Specifications */}
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Event
                  </span>
                  <div className="px-3 py-2 rounded-xl bg-[#131923] border border-[#232F40] text-slate-100 font-semibold truncate">
                    {eventTitle}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                      Date
                    </span>
                    <div className="px-3 py-2 rounded-xl bg-[#131923] border border-[#232F40] text-slate-200">
                      {eventDate}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                      Time
                    </span>
                    <div className="px-3 py-2 rounded-xl bg-[#131923] border border-[#232F40] text-slate-200">
                      {eventTime}
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Account Connection Status Section */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                    GOOGLE ACCOUNT
                  </span>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 font-semibold">
                    Not connected
                  </span>
                </div>
                <p className="text-xs font-sans text-amber-200/90 leading-snug">
                  Connect your Google account to create a real Google Meet session.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#1E2736]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-mono font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConnectClick}
                  disabled={isConnecting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-xs transition-all cursor-pointer hover:scale-[1.01]"
                >
                  {isConnecting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Video size={13} />
                  )}
                  <span>Connect Google Meet</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
