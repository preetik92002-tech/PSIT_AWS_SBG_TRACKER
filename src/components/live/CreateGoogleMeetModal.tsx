import React, { useState, useEffect } from 'react'
import {
  Video,
  X,
  Loader2,
  Calendar,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import {
  createGoogleMeet,
  getGoogleConnectionStatus,
  startGoogleOAuth,
} from '@/lib/googleMeet'
import type { GoogleMeetSpace } from '@/types/database'
import { trackEvent } from '@/utils/analytics'

interface CreateGoogleMeetModalProps {
  communityId: string
  eventId?: string
  eventTitle?: string
  onClose: () => void
  onCreated: (space: GoogleMeetSpace) => void
}

export const CreateGoogleMeetModal: React.FC<CreateGoogleMeetModalProps> = ({
  communityId,
  eventId,
  eventTitle,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState(
    eventTitle ? `${eventTitle} — Live Meetup` : 'AWS Student Community — Live Session'
  )
  const [isCheckingConn, setIsCheckingConn] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [createdSpace, setCreatedSpace] = useState<GoogleMeetSpace | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function checkConn() {
      try {
        setIsCheckingConn(true)
        const status = await getGoogleConnectionStatus(communityId)
        setIsConnected(status.is_connected)
        setConnectedEmail(status.google_email)
      } catch (err: any) {
        console.error('Failed checking Google status in modal:', err)
      } finally {
        setIsCheckingConn(false)
      }
    }
    checkConn()
  }, [communityId])

  const handleConnectOAuth = async () => {
    try {
      const authUrl = await startGoogleOAuth(communityId, window.location.pathname)
      window.location.href = authUrl
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start Google OAuth')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      setIsCreating(true)
      setErrorMsg(null)
      const space = await createGoogleMeet({
        communityId,
        eventId,
        title: title.trim(),
      })
      trackEvent('google_meet_created', { space_name: space.google_space_name })
      setCreatedSpace(space)
      onCreated(space)
    } catch (err: any) {
      console.error('Create Google Meet error:', err)
      setErrorMsg(err.message || 'Failed to create Google Meet space')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = () => {
    if (createdSpace?.meeting_uri) {
      navigator.clipboard.writeText(createdSpace.meeting_uri)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#121824] border border-[#232F40] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 animate-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2736] flex items-center justify-between bg-[#0D121B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Video size={18} />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wide">
                {createdSpace ? 'Google Meet Space Ready' : 'Create Google Meet Session'}
              </h3>
              <p className="text-[11px] font-sans text-slate-400">
                Official Google Meet REST API Integration
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isCheckingConn ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 size={24} className="animate-spin text-[#FF9900]" />
              <span className="text-xs font-mono">Checking Google connection...</span>
            </div>
          ) : !isConnected ? (
            /* Not Connected State */
            <div className="space-y-4 text-center py-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Video size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-mono font-bold text-white">
                  Google Meet Not Yet Authorized
                </h4>
                <p className="text-xs font-sans text-slate-400 max-w-sm mx-auto">
                  To generate real Google Meet rooms for your community, authorize your Google account once.
                </p>
              </div>
              <button
                type="button"
                onClick={handleConnectOAuth}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-white hover:bg-slate-100 transition-all cursor-pointer shadow-md hover:scale-[1.02]"
              >
                <Video size={14} className="text-[#EA4335]" />
                <span>CONNECT GOOGLE NOW →</span>
              </button>
            </div>
          ) : createdSpace ? (
            /* Created Success State */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 text-xs font-mono font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} />
                    Space Created Successfully
                  </span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-md bg-emerald-500/20">
                    {createdSpace.status}
                  </span>
                </div>
                <div className="text-xs font-mono text-white font-bold break-all">
                  {createdSpace.meeting_uri}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Meeting Code: <span className="text-slate-200">{createdSpace.meeting_code}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-200 bg-[#18202E] hover:bg-[#222D3E] border border-slate-700/60 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Link Copied!' : 'Copy Meeting Link'}</span>
                </button>

                <a
                  href={createdSpace.meeting_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Launch Meet →</span>
                </a>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-300">
                  Session Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AWS Cloud Architecture Workshop"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#0D121B] border border-[#232F40] rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-[#FF9900]"
                />
              </div>

              {eventTitle && (
                <div className="p-3 rounded-xl bg-[#0D121B] border border-[#1E2736] flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Calendar size={14} className="text-[#FF9900]" />
                  <span>Binding to Event: <strong className="text-white">{eventTitle}</strong></span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#0D121B] border border-[#1E2736] text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Google Account:</span>
                <span className="text-emerald-400 font-bold">{connectedEmail}</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-[#18202E] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !title.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-white hover:bg-slate-100 disabled:opacity-50 transition-all cursor-pointer shadow-md hover:scale-[1.02]"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-slate-900" />
                      <span>Creating Space via API...</span>
                    </>
                  ) : (
                    <>
                      <Video size={14} className="text-[#EA4335]" />
                      <span>Generate Google Meet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
