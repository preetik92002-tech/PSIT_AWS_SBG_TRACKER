import React, { useState } from 'react'
import {
  X,
  Share2,
  Copy,
  Check,
  UserPlus,
  Mail,
  QrCode,
  Shield,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useCommunity } from '@/context/CommunityContext'

export interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onMemberAdded?: () => void
  isManager: boolean
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onMemberAdded,
  isManager,
}) => {
  const { activeCommunity } = useCommunity()
  const [tab, setTab] = useState<'invite' | 'direct'>('invite')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [directEmail, setDirectEmail] = useState('')
  const [directRole, setDirectRole] = useState<'member' | 'manager'>('member')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen || !activeCommunity) return null

  const inviteCode = activeCommunity.short_name || 'AWS-COMM'
  const inviteUrl = `${window.location.origin}/auth/join-community?code=${encodeURIComponent(inviteCode)}`

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleDirectEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!directEmail.trim()) return

    setIsLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      // 1. Lookup profile by email
      const { data: targetProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', directEmail.trim().toLowerCase())
        .maybeSingle()

      if (profileErr) throw profileErr
      if (!targetProfile) {
        setErrorMsg('No registered builder account found with this email. Have them sign in to AWS Journey Tracker first.')
        return
      }

      // 2. Check if already a member of this community
      const { data: existingMember } = await supabase
        .from('community_members')
        .select('id, status, role')
        .eq('community_id', activeCommunity.id)
        .eq('user_id', targetProfile.id)
        .maybeSingle()

      if (existingMember) {
        if (existingMember.status === 'inactive') {
          // Re-activate member
          await supabase
            .from('community_members')
            .update({ status: 'active', role: directRole, updated_at: new Date().toISOString() })
            .eq('id', existingMember.id)
          setSuccessMsg(`Re-activated ${targetProfile.full_name || targetProfile.email} as active community member!`)
          setDirectEmail('')
          onMemberAdded?.()
          return
        }
        setErrorMsg('This builder is already an active member of this community.')
        return
      }

      // 3. Insert new community member
      const { error: insertErr } = await supabase.from('community_members').insert({
        community_id: activeCommunity.id,
        user_id: targetProfile.id,
        role: directRole,
        status: 'active',
      })

      if (insertErr) throw insertErr

      // 4. Log community activity
      await supabase.from('community_activities').insert({
        community_id: activeCommunity.id,
        user_id: targetProfile.id,
        activity_type: 'joined community',
        description: `${targetProfile.full_name || targetProfile.email} was enrolled into the chapter`,
      })

      setSuccessMsg(`Successfully enrolled ${targetProfile.full_name || targetProfile.email}!`)
      setDirectEmail('')
      onMemberAdded?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to enroll member.'
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#EA580C] flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-mono">Add Member to Chapter</h2>
              <p className="text-[11px] text-slate-500">{activeCommunity.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Manager Tabs */}
        {isManager && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
            <button
              type="button"
              onClick={() => { setTab('invite'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`pb-2.5 text-xs font-mono font-medium border-b-2 px-3 transition-colors ${
                tab === 'invite'
                  ? 'border-[#FF9900] text-[#EA580C] font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Invite Code & Link
            </button>
            <button
              type="button"
              onClick={() => { setTab('direct'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`pb-2.5 text-xs font-mono font-medium border-b-2 px-3 transition-colors ${
                tab === 'direct'
                  ? 'border-[#FF9900] text-[#EA580C] font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Direct Enrollment
            </button>
          </div>
        )}

        <div className="p-6">
          {tab === 'invite' ? (
            <div className="space-y-5">
              {/* Community Code Box */}
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Official Community Code
                </label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-mono text-base font-bold text-slate-900 flex-1 tracking-wider">
                    {inviteCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all shadow-2xs"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Share this code with students or colleagues so they can enter it on the Join Community page.
                </p>
              </div>

              {/* Shareable Link Box */}
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Direct Join Link
                </label>
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 bg-transparent text-xs text-slate-600 font-mono px-2 outline-none select-all truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#FF9900] hover:bg-[#EA580C] text-white transition-all shadow-xs shrink-0"
                  >
                    {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Quick instructions */}
              <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-100 flex items-start gap-2.5">
                <Shield size={16} className="text-[#EA580C] shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Anyone who joins via this code or link is automatically added as a verified member of <strong className="text-slate-900">{activeCommunity.name}</strong>.
                </p>
              </div>
            </div>
          ) : (
            /* Direct Enrollment Tab */
            <form onSubmit={handleDirectEnroll} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-800">
                  <Check size={15} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Builder Email Address *
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    placeholder="student@institution.edu"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The user must already have registered an account on AWS Journey Tracker.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Community Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    directRole === 'member'
                      ? 'border-[#FF9900] bg-orange-50/40 text-slate-900 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="directRole"
                      checked={directRole === 'member'}
                      onChange={() => setDirectRole('member')}
                      className="accent-[#FF9900]"
                    />
                    <div className="text-xs">
                      <div>Member</div>
                      <div className="text-[10px] text-slate-400 font-normal">Standard builder</div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    directRole === 'manager'
                      ? 'border-[#FF9900] bg-orange-50/40 text-slate-900 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="directRole"
                      checked={directRole === 'manager'}
                      onChange={() => setDirectRole('manager')}
                      className="accent-[#FF9900]"
                    />
                    <div className="text-xs">
                      <div>Community Head</div>
                      <div className="text-[10px] text-slate-400 font-normal">Manager access</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !directEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold text-white bg-[#FF9900] hover:bg-[#EA580C] disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Enrolling Builder...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Direct Enroll Member</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
