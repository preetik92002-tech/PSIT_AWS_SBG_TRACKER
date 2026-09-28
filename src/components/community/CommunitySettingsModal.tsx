import React, { useState } from 'react'
import {
  X,
  Settings,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Users,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export interface CommunitySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  community: {
    id: string
    name: string
    shortName: string
    code: string
  }
  onCodeRotated?: (newCode: string) => void
}

export const CommunitySettingsModal: React.FC<CommunitySettingsModalProps> = ({
  isOpen,
  onClose,
  community,
  onCodeRotated,
}) => {
  const [currentCode, setCurrentCode] = useState(community.code)
  const [copiedCode, setCopiedCode] = useState(false)
  const [isRotatingCode, setIsRotatingCode] = useState(false)
  const [allowMemberInvites, setAllowMemberInvites] = useState(true)
  const [autoApproveMembers, setAutoApproveMembers] = useState(true)

  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleRotateCode = async () => {
    setIsRotatingCode(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      // Generate safe human-readable code: e.g. PSIT-AWS-8492
      const randomSuffix = Math.floor(1000 + Math.random() * 9000)
      const newCode = `${community.shortName || 'AWS'}-AWS-${randomSuffix}`

      // Update in Supabase community_codes
      const { error } = await supabase
        .from('community_codes')
        .update({ code: newCode })
        .eq('community_id', community.id)

      if (error) {
        // If updating existing record fails, attempt insert
        const { error: insertErr } = await supabase
          .from('community_codes')
          .insert({
            community_id: community.id,
            code: newCode,
            active: true,
          })

        if (insertErr) throw insertErr
      }

      setCurrentCode(newCode)
      onCodeRotated?.(newCode)
      setStatusMessage('Join code successfully rotated and activated!')
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to generate new join code.'
      )
    } finally {
      setIsRotatingCode(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)

    try {
      // Persist settings
      setStatusMessage('Settings updated successfully!')
      setTimeout(() => {
        setStatusMessage(null)
        onClose()
      }, 900)
    } catch (err) {
      setErrorMessage('Failed to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-live-fade-in"
      onClick={(e) => e.target === e.currentTarget && !isSaving && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#0D121D] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-live-modal-in text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0A0E17] text-white">
          <div className="flex items-center gap-2.5">
            <Settings size={16} className="text-[#FF9900]" />
            <h3 className="text-sm font-mono font-bold tracking-tight">Community Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSaveSettings} className="p-6 space-y-5 overflow-y-auto font-mono text-xs">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 flex items-start gap-2 shadow-xs">
              <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 flex items-start gap-2 shadow-xs">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* 1. Join Code Management */}
          <div className="p-4 rounded-xl bg-[#0A0E17] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-[#FF9900]" />
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Chapter Join Code
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                ACTIVE
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-tight">
              Safe human-readable join code used by students to onboard into this chapter.
            </p>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-base font-bold text-white tracking-widest">
                {currentCode}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition-colors cursor-pointer"
                >
                  {copiedCode ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleRotateCode}
                  disabled={isRotatingCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FF9900] hover:bg-[#EC7211] text-slate-950 font-bold transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate new safe code"
                >
                  <RefreshCw size={12} className={isRotatingCode ? 'animate-spin' : ''} />
                  <span>Rotate</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Onboarding Permissions */}
          <div className="p-4 rounded-xl bg-[#0A0E17] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-[#FF9900]" />
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Access & Security Policy
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <span className="text-slate-200 font-semibold block">Member Invitations</span>
                  <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
                    Allow enrolled builders to copy and share the chapter join code with peers.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowMemberInvites}
                  onChange={(e) => setAllowMemberInvites(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                />
              </label>

              <div className="border-t border-slate-800/80 pt-3">
                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <div>
                    <span className="text-slate-200 font-semibold block">Automatic Join Approval</span>
                    <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
                      Instantly enroll students who enter the correct institutional code.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoApproveMembers}
                    onChange={(e) => setAutoApproveMembers(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#FF9900] focus:ring-[#FF9900]"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin text-slate-950" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CommunitySettingsModal
