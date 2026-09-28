import React, { useState, useEffect } from 'react'
import {
  Video,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Square,
  ShieldCheck,
  Award,
} from 'lucide-react'
import {
  syncGoogleMeet,
  endGoogleMeet,
  getSpaceWithConferences,
  awardEventAttendanceForParticipant,
  type SpaceWithDetails,
} from '@/lib/googleMeet'
import type { GoogleMeetSpace } from '@/types/database'
import { trackEvent } from '@/utils/analytics'

interface ManageGoogleMeetModalProps {
  communityId: string
  spaceId: string
  isManager: boolean
  onClose: () => void
  onSpaceUpdated?: (space: GoogleMeetSpace) => void
}

export const ManageGoogleMeetModal: React.FC<ManageGoogleMeetModalProps> = ({
  communityId,
  spaceId,
  isManager,
  onClose,
  onSpaceUpdated,
}) => {
  const [spaceData, setSpaceData] = useState<SpaceWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [awardingUserId, setAwardingUserId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadDetails = async () => {
    try {
      setLoading(true)
      const data = await getSpaceWithConferences(spaceId)
      setSpaceData(data)
    } catch (err: any) {
      console.error('Failed to load space details:', err)
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load details' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (spaceId) {
      loadDetails()
    }
  }, [spaceId])

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      setStatusMsg(null)
      const updated = await syncGoogleMeet({ communityId, spaceId })
      setSpaceData(updated)
      onSpaceUpdated?.(updated)
      setStatusMsg({ type: 'success', text: 'Google Meet conference status & participants synchronized.' })
    } catch (err: any) {
      console.error('Sync failed:', err)
      setStatusMsg({ type: 'error', text: err.message || 'Failed to sync with Google Meet API' })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleEndConference = async () => {
    if (!window.confirm('Are you sure you want to mark this live conference as concluded?')) {
      return
    }

    try {
      setIsEnding(true)
      setStatusMsg(null)
      const updated = await endGoogleMeet({ communityId, spaceId })
      await loadDetails()
      onSpaceUpdated?.(updated)
      setStatusMsg({ type: 'success', text: 'Live conference marked as ended.' })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to end conference' })
    } finally {
      setIsEnding(false)
    }
  }

  const handleAwardAttendance = async (userId: string, eventId: string) => {
    try {
      setAwardingUserId(userId)
      await awardEventAttendanceForParticipant({
        eventId,
        targetUserId: userId,
        attended: true,
      })
      setStatusMsg({
        type: 'success',
        text: 'Event attendance recorded. (Points are not automatically distributed; award points separately if desired.)',
      })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to record attendance' })
    } finally {
      setAwardingUserId(null)
    }
  }

  const status = spaceData?.status || 'SCHEDULED'
  const conferences = spaceData?.google_meet_conferences || []
  const allParticipants = conferences.flatMap((c) => c.google_meet_participants || [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#121824] border border-[#232F40] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2736] flex items-center justify-between bg-[#0D121B] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Video size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wide">
                  {spaceData?.title || 'Google Meet Conference'}
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    status === 'LIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : status === 'SCHEDULED'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : status === 'ENDED'
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-[11px] font-sans text-slate-400">
                Code: {spaceData?.meeting_code} • {spaceData?.google_space_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2736] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {spaceData?.meeting_uri && (
              <a
                href={spaceData.meeting_uri}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('google_meet_joined_from_manager', { space_id: spaceId })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-xs"
              >
                <Video size={14} />
                <span>Join Google Meet →</span>
              </a>
            )}

            {isManager && (
              <>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-200 bg-[#18202E] hover:bg-[#222D3E] border border-slate-700/60 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? (
                    <Loader2 size={13} className="animate-spin text-[#FF9900]" />
                  ) : (
                    <RefreshCw size={13} className="text-[#FF9900]" />
                  )}
                  <span>Sync Google API</span>
                </button>

                {status !== 'ENDED' && (
                  <button
                    type="button"
                    onClick={handleEndConference}
                    disabled={isEnding}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Square size={13} />
                    <span>Conclude Meeting</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Meeting URI card */}
          <div className="p-4 rounded-xl bg-[#0D121B] border border-[#1E2736] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              Verified Meeting URI
            </span>
            <div className="text-xs font-mono text-white font-bold break-all">
              {spaceData?.meeting_uri}
            </div>
          </div>

          {/* Participants Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#FF9900]" />
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Conference Participants ({allParticipants.length})
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Via <code className="text-slate-300">meet.googleapis.com/v2/conferenceRecords</code>
              </span>
            </div>

            {loading ? (
              <div className="py-6 flex justify-center text-slate-400">
                <Loader2 size={20} className="animate-spin text-[#FF9900]" />
              </div>
            ) : allParticipants.length === 0 ? (
              <div className="p-5 rounded-xl bg-[#0D121B] border border-[#1E2736] text-center text-xs font-mono text-slate-400">
                No participant records synchronized yet. Once members join the Google Meet call and the host conducts the meeting, click <strong>Sync Google API</strong> to retrieve verified attendance records.
              </div>
            ) : (
              <div className="rounded-xl border border-[#1E2736] overflow-hidden bg-[#0D121B]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#131924] border-b border-[#1E2736] text-[10px] uppercase text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Participant</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Eligible (&gt;=15m)</th>
                      {isManager && spaceData?.event_id && <th className="py-2.5 px-3 text-right">Event Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2736]">
                    {allParticipants.map((p) => {
                      const mins = Math.floor((p.attendance_duration_seconds || 0) / 60)
                      const isEligible = mins >= 15
                      return (
                        <tr key={p.id} className="hover:bg-[#18202E]/50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{p.display_name || 'Guest'}</div>
                            <div className="text-[10px] text-slate-400">{p.email || 'Anonymous'}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {mins} min {p.attendance_duration_seconds % 60}s
                          </td>
                          <td className="py-2.5 px-3">
                            {isEligible ? (
                              <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-bold">
                                <CheckCircle2 size={12} />
                                Eligible
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">&lt; 15 mins</span>
                            )}
                          </td>
                          {isManager && spaceData?.event_id && (
                            <td className="py-2.5 px-3 text-right">
                              {p.user_id ? (
                                <button
                                  type="button"
                                  onClick={() => handleAwardAttendance(p.user_id!, spaceData.event_id!)}
                                  disabled={awardingUserId === p.user_id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#18202E] hover:bg-[#222D3E] border border-slate-700/60 text-slate-200 transition-colors"
                                >
                                  {awardingUserId === p.user_id ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : (
                                    <Award size={10} className="text-[#FF9900]" />
                                  )}
                                  <span>Mark Attended</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500">Unlinked user</span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Attendance Separation Principle Banner */}
            <div className="p-3 rounded-xl bg-[#0D121B] border border-slate-800 text-[11px] font-sans text-slate-400 leading-relaxed flex items-start gap-2">
              <ShieldCheck size={16} className="text-[#FF9900] flex-shrink-0 mt-0.5" />
              <span>
                <strong>Attendance Policy:</strong> Google Meet attendance duration verifies presence at the session. Event attendance records do not automatically grant community points; managers review participation and award points intentionally using the points system.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
