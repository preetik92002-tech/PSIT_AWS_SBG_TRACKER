import React, { useState, useEffect } from 'react'
import {
  Video,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Unlink,
  RefreshCw,
  ShieldCheck,
  Radio,
} from 'lucide-react'
import {
  getGoogleConnectionStatus,
  startGoogleOAuth,
  disconnectGoogleMeet,
} from '@/lib/googleMeet'
import type { GoogleConnectionInfo } from '@/types/database'

interface GoogleMeetConnectionCardProps {
  communityId: string
  isManager: boolean
  onStatusChange?: (status: GoogleConnectionInfo) => void
}

export const GoogleMeetConnectionCard: React.FC<GoogleMeetConnectionCardProps> = ({
  communityId,
  isManager,
  onStatusChange,
}) => {
  const [connectionInfo, setConnectionInfo] = useState<GoogleConnectionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadStatus = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const status = await getGoogleConnectionStatus(communityId)
      setConnectionInfo(status)
      onStatusChange?.(status)
    } catch (err: any) {
      console.error('Failed to load Google Meet connection status:', err)
      setErrorMsg(err.message || 'Failed to check connection status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (communityId) {
      loadStatus()
    }
  }, [communityId])

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      setErrorMsg(null)
      setSuccessMsg(null)
      const currentPath = window.location.pathname
      const authUrl = await startGoogleOAuth(communityId, currentPath)
      // Redirect to Google's real OAuth 2.0 consent screen
      window.location.href = authUrl
    } catch (err: any) {
      console.error('OAuth initiation failed:', err)
      setErrorMsg(err.message || 'Failed to start Google OAuth flow. Please check Edge Function configuration.')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Meet? Active meeting links will remain valid on Google, but automated synchronization will be halted.')) {
      return
    }

    try {
      setIsDisconnecting(true)
      setErrorMsg(null)
      await disconnectGoogleMeet(communityId)
      setSuccessMsg('Google Meet disconnected successfully.')
      await loadStatus()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect Google Meet')
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 flex items-center justify-center gap-3 text-slate-400">
        <Loader2 size={18} className="animate-spin text-[#FF9900]" />
        <span className="text-xs font-mono">Checking Google Meet status...</span>
      </div>
    )
  }

  const isConnected = Boolean(connectionInfo?.is_connected)

  return (
    <div className={`rounded-2xl border ${isConnected ? 'border-emerald-500/30 bg-[#0F1824]' : 'border-[#1F293A] bg-[#121824]'} overflow-hidden shadow-xs text-slate-100`}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#1E2736] flex items-center justify-between bg-[#0D121B]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          </div>
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Google Meet Integration
          </span>
        </div>

        {isConnected ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono font-bold text-emerald-400">
            <CheckCircle2 size={12} />
            CONNECTED
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18202E] border border-[#232F40] text-[11px] font-mono font-semibold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            NOT CONNECTED
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-start gap-2">
            <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {isConnected ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Connected Account:</span>
                <span className="text-xs font-mono font-bold text-white bg-[#18202E] px-2 py-0.5 rounded-md border border-[#232F40]">
                  {connectionInfo?.google_email}
                </span>
              </div>
              <p className="text-xs font-sans text-slate-400 max-w-lg">
                Google Meet API is authorized. Community sessions generate real <code className="text-emerald-300 font-mono text-[11px]">meet.google.com</code> spaces with conference telemetry.
              </p>
            </div>

            {isManager && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white bg-[#18202E] hover:bg-[#222D3E] border border-[#232F40] transition-colors cursor-pointer"
                  title="Refresh authorization tokens"
                >
                  {isConnecting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  <span>Reconnect</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer"
                >
                  {isDisconnecting ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <h4 className="text-sm font-mono font-bold text-white">
                Authorize Official Google Meet API
              </h4>
              <p className="text-xs font-sans text-slate-400 max-w-xl leading-relaxed">
                Connect your institutional or community Google account to automatically generate authentic Google Meet rooms, record attendance duration, and broadcast live sessions.
              </p>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-slate-300">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  OAuth 2.0 Secure
                </span>
                <span>•</span>
                <span>meet.googleapis.com/v2</span>
              </div>
            </div>

            {isManager && (
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-white hover:bg-slate-100 shadow-md transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-slate-900" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Video size={14} className="text-[#EA4335]" />
                      <span>CONNECT GOOGLE →</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
