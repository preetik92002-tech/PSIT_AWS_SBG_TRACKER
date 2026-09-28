import React from 'react'
import { Radio, ChevronRight, Video, Calendar, ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LiveSession } from '@/types/live'
import { trackEvent } from '@/utils/analytics'

export type GoogleMeetStatusState = 'Not connected' | 'Connected' | 'Scheduled' | 'Live' | 'Ended'

interface LiveSessionStatusProps {
  session?: LiveSession | null
  googleMeetStatus?: GoogleMeetStatusState
  variant?: 'dashboard' | 'inline'
  onActionClick?: () => void
}

export const LiveSessionStatus: React.FC<LiveSessionStatusProps> = ({
  session,
  googleMeetStatus: explicitStatus,
  variant = 'dashboard',
  onActionClick,
}) => {
  const isDashboard = variant === 'dashboard'

  // Derive status safely if not explicitly provided
  // CRITICAL RULE: Do NOT claim live merely because a meeting exists!
  const status: GoogleMeetStatusState = explicitStatus || (() => {
    if (!session) return 'Not connected'
    if (session.status === 'live' && session.meetingUrl && session.meetingUrl.trim().length > 0) {
      return 'Live'
    }
    if (session.status === 'ended') {
      return 'Ended'
    }
    if (session.scheduledAt) {
      const scheduledTime = new Date(session.scheduledAt).getTime()
      if (scheduledTime > Date.now()) {
        return 'Scheduled'
      }
    }
    if (session.meetingUrl && session.meetingUrl.trim().length > 0) {
      return 'Connected'
    }
    return 'Not connected'
  })()

  const hasRealMeetingUrl = Boolean(session?.meetingUrl && session.meetingUrl.trim().length > 0)

  const handleJoin = () => {
    if (session?.meetingUrl) {
      trackEvent('community_live_opened', { title: session.title })
      window.open(session.meetingUrl, '_blank', 'noopener,noreferrer')
    } else if (onActionClick) {
      onActionClick()
    }
  }

  // Render Google Meet badge pill depending on exact status
  const renderStatusBadge = () => {
    switch (status) {
      case 'Live':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live</span>
          </span>
        )
      case 'Scheduled':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-mono font-bold text-amber-300">
            <Clock size={12} className="text-amber-400" />
            <span>Scheduled</span>
          </span>
        )
      case 'Connected':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-xs font-mono font-bold text-blue-300">
            <CheckCircle2 size={12} className="text-blue-400" />
            <span>Connected</span>
          </span>
        )
      case 'Ended':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-semibold text-slate-400">
            <span>Ended</span>
          </span>
        )
      case 'Not connected':
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#18202E] border border-[#232F40] text-xs font-mono font-semibold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>Not connected</span>
          </span>
        )
    }
  }

  return (
    <div className={`rounded-2xl border ${status === 'Live' ? 'border-emerald-500/40 bg-[#0F1824]' : 'border-[#1F293A] bg-[#121824]'} shadow-xs overflow-hidden animate-fadeIn text-slate-100`}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#1E2736] flex items-center justify-between bg-[#0D121B]">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Radio size={14} className={status === 'Live' ? 'text-emerald-400 animate-pulse' : 'text-[#FF9900]'} />
            <span>COMMUNITY LIVE</span>
          </span>
          {renderStatusBadge()}
        </div>

        {/* Google Meet Chip */}
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#18202E] border border-[#232F40] text-[10px] font-mono font-semibold text-slate-200 shadow-2xs">
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          </span>
          Google Meet
        </span>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-mono font-bold text-white leading-snug">
            {session?.title || (
              status === 'Live' ? 'Live Session in Progress' :
              status === 'Scheduled' ? 'Upcoming Live Community Meetup' :
              status === 'Connected' ? 'Google Meet Integration Active' :
              status === 'Ended' ? 'Previous Session Concluded' :
              'No Live Session Scheduled'
            )}
          </h3>

          <p className="text-xs font-sans text-slate-400 max-w-xl">
            {status === 'Live' && 'The community meeting is actively running. Join now to collaborate with peers and leads.'}
            {status === 'Scheduled' && (session?.scheduledAt ? `Scheduled for ${new Date(session.scheduledAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. Meeting link will activate when the host starts.` : 'An upcoming cloud architecture session is scheduled.')}
            {status === 'Connected' && 'Google Meet connection is verified. You can launch workshops, sprint reviews, and live Q&A sessions anytime.'}
            {status === 'Ended' && 'The previous live community meeting has ended. Check upcoming events for the next broadcast.'}
            {status === 'Not connected' && 'Google Meet status is currently Not connected. Meeting links can be attached to events or launched for live workshops.'}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0">
          {status === 'Live' && hasRealMeetingUrl ? (
            <button
              type="button"
              onClick={handleJoin}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-xs transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Video size={14} />
              <span>Join Google Meet →</span>
            </button>
          ) : status === 'Scheduled' ? (
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-200 bg-[#18202E] hover:bg-[#222D3E] border border-slate-700/60 transition-colors shadow-2xs"
            >
              <span>View Schedule</span>
              <ChevronRight size={13} />
            </Link>
          ) : (
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-200 bg-[#18202E] hover:bg-[#222D3E] border border-slate-700/60 transition-colors shadow-2xs"
            >
              <span>View Events</span>
              <ChevronRight size={13} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
