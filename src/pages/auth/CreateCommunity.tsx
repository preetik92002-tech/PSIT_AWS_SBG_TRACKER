import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Building2,
  MapPin,
  FileText,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'
import { AuthProgressIndicator, ProgressStep } from '@/components/auth/AuthProgressIndicator'
import { CommunityPreview } from '@/components/auth/CommunityPreview'
import { AWSLogo } from '@/components/ui/AWSLogo'

const ONBOARDING_STEPS: ProgressStep[] = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Profile' },
  { id: 3, label: 'Community' },
  { id: 4, label: 'Finish' },
]

export const CreateCommunity: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { refreshUserCommunities, switchCommunityById } = useCommunity()

  // Form Fields
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [institution, setInstitution] = useState(profile?.institution_name || '')
  const [city, setCity] = useState(profile?.institution_address?.split(',')?.[0]?.trim() || '')
  const [description, setDescription] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Success state with created community details
  const [createdCommunity, setCreatedCommunity] = useState<{
    id: string
    name: string
    shortName: string
    institution: string
    city: string
    description: string
    code: string
    memberCount: number
    createdDate: string
  } | null>(null)

  const [copiedLink, setCopiedLink] = useState(false)
  const [shared, setShared] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('User session not found. Please log in again.')
      return
    }

    // Required fields validation
    if (!name.trim()) {
      setErrorMessage('Community name is required.')
      return
    }

    if (!shortName.trim()) {
      setErrorMessage('Community short name is required.')
      return
    }

    if (!institution.trim()) {
      setErrorMessage('Institution is required.')
      return
    }

    if (!city.trim()) {
      setErrorMessage('City is required.')
      return
    }

    if (!description.trim()) {
      setErrorMessage('Community description is required.')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Insert community record into Supabase
      // NOTE: Database trigger automatically enrolls user as 'manager' in community_members
      // and generates the secure community invite code. profiles.role is NOT modified.
      const { data: newComm, error: commErr } = await supabase
        .from('communities')
        .insert({
          name: name.trim(),
          short_name: shortName.trim().toUpperCase(),
          institution: institution.trim(),
          institution_name: institution.trim(),
          city: city.trim(),
          description: description.trim(),
          manager_id: user.id,
          created_by: user.id,
        })
        .select()
        .single()

      if (commErr) {
        setErrorMessage(commErr.message)
        setIsSubmitting(false)
        return
      }

      // 2. Fetch the automatically generated secure community code from community_codes
      const { data: codeRecord } = await supabase
        .from('community_codes')
        .select('code')
        .eq('community_id', newComm.id)
        .eq('active', true)
        .maybeSingle()

      // 3. Query actual database membership count from community_members (NO FAKE COUNT)
      const { count: actualMemberCount } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', newComm.id)

      const formattedDate = new Date(newComm.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

      setCreatedCommunity({
        id: newComm.id,
        name: newComm.name,
        shortName: newComm.short_name,
        institution: newComm.institution,
        city: newComm.city,
        description: newComm.description || '',
        code: codeRecord?.code || 'ACTIVE',
        memberCount: actualMemberCount ?? 1,
        createdDate: formattedDate,
      })

      // Refresh community context and select newly created community
      await refreshUserCommunities()
      switchCommunityById(newComm.id)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while creating community.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInviteLink = () => {
    if (!createdCommunity) return ''
    return `${window.location.origin}/auth/join-community?code=${createdCommunity.code}`
  }

  const handleCopyInviteLink = () => {
    if (!createdCommunity) return
    const inviteLink = getInviteLink()
    navigator.clipboard.writeText(inviteLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleShareInvite = () => {
    if (!createdCommunity) return
    const inviteLink = getInviteLink()
    if (navigator.share) {
      navigator
        .share({
          title: `Join ${createdCommunity.name} on AWS Journey Tracker`,
          text: `Join ${createdCommunity.name} with code: ${createdCommunity.code}`,
          url: inviteLink,
        })
        .catch(() => {
          navigator.clipboard.writeText(inviteLink)
          setShared(true)
          setTimeout(() => setShared(false), 2500)
        })
    } else {
      navigator.clipboard.writeText(inviteLink)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-between text-slate-800 font-sans relative overflow-x-hidden selection:bg-orange-100 selection:text-orange-900">
      {/* Decorative India Architecture — Bottom Left Corner */}
      <div
        className="absolute bottom-0 left-0 w-36 sm:w-60 h-32 sm:h-48 opacity-[0.06] pointer-events-none select-none overflow-hidden text-slate-800 z-0"
        aria-hidden="true"
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 240 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="0" y1="195" x2="240" y2="195" strokeWidth="1.5" />
          <polygon points="40,195 48,140 82,140 90,195" fill="currentColor" fillOpacity="0.04" />
          <line x1="44" y1="140" x2="86" y2="140" strokeWidth="1.8" />
          <polygon points="50,140 55,95 75,95 80,140" fill="currentColor" fillOpacity="0.06" />
          <line x1="53" y1="95" x2="77" y2="95" strokeWidth="1.5" />
          <polygon points="56,95 60,60 70,60 74,95" fill="currentColor" fillOpacity="0.08" />
          <line x1="59" y1="60" x2="71" y2="60" strokeWidth="1.2" />
          <polygon points="61,60 63,30 67,30 69,60" fill="currentColor" fillOpacity="0.1" />
          <path d="M 62 30 Q 65 20 68 30 Z" fill="currentColor" />
          <line x1="65" y1="20" x2="65" y2="12" />
          <circle cx="65" cy="11" r="2" fill="currentColor" />
          <line x1="58" y1="195" x2="62" y2="140" strokeDasharray="3 3" />
          <line x1="72" y1="195" x2="68" y2="140" strokeDasharray="3 3" />
          <rect x="130" y="120" width="28" height="75" fill="currentColor" fillOpacity="0.04" />
          <rect x="165" y="90" width="34" height="105" fill="currentColor" fillOpacity="0.05" />
          <line x1="182" y1="90" x2="182" y2="70" />
          <rect x="205" y="135" width="25" height="60" fill="currentColor" fillOpacity="0.04" />
        </svg>
      </div>

      {/* Decorative India Architecture — Bottom Right Corner */}
      <div
        className="absolute bottom-0 right-0 w-36 sm:w-60 h-32 sm:h-48 opacity-[0.06] pointer-events-none select-none overflow-hidden text-slate-800 z-0"
        aria-hidden="true"
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 240 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="0" y1="195" x2="240" y2="195" strokeWidth="1.5" />
          <rect x="50" y="180" width="140" height="15" rx="1" fill="currentColor" fillOpacity="0.04" />
          <rect x="75" y="110" width="90" height="70" rx="2" fill="currentColor" fillOpacity="0.04" />
          <path d="M 100 180 L 100 135 Q 120 115 140 135 L 140 180" fill="currentColor" fillOpacity="0.06" />
          <path d="M 98 110 Q 120 60 142 110 Z" fill="currentColor" fillOpacity="0.08" />
          <line x1="120" y1="60" x2="120" y2="45" strokeWidth="1.5" />
          <circle cx="120" cy="43" r="2.5" fill="currentColor" />
          <path d="M 82 110 Q 88 95 94 110 Z" fill="currentColor" fillOpacity="0.06" />
          <path d="M 146 110 Q 152 95 158 110 Z" fill="currentColor" fillOpacity="0.06" />
          <polygon points="30,195 34,70 42,70 46,195" fill="currentColor" fillOpacity="0.05" />
          <path d="M 34 70 Q 38 58 42 70 Z" fill="currentColor" fillOpacity="0.1" />
          <line x1="38" y1="58" x2="38" y2="50" />
          <polygon points="194,195 198,70 206,70 210,195" fill="currentColor" fillOpacity="0.05" />
          <path d="M 198 70 Q 202 58 206 70 Z" fill="currentColor" fillOpacity="0.1" />
          <line x1="202" y1="58" x2="202" y2="50" />
        </svg>
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full border-b border-slate-200/80 bg-white/95 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AWSLogo size="xs" />
          <span className="font-mono font-bold text-sm tracking-tight text-slate-900 truncate">
            AWS Journey Tracker
          </span>
        </div>

        <div className="hidden md:block text-xs text-slate-500 font-normal">
          Manage your AWS community. Track progress. Build together.
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 relative">
          {/* Progress Indicator */}
          <AuthProgressIndicator
            currentStep={createdCommunity ? 4 : 3}
            steps={ONBOARDING_STEPS}
          />

          {/* Heading & Subtitle */}
          <div className="text-center mb-7">
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 leading-tight">
              Create your community
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-normal">
              Set up your AWS Student Builder community in a few steps.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUCCESS VIEW (When community created) */}
          {/* ============================================================== */}
          {createdCommunity ? (
            <div className="space-y-6">
              <div className="text-center py-4 px-2 max-w-lg mx-auto">
                <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-amber-50 border-2 border-[#FF9900] flex items-center justify-center text-[#FF9900] shadow-sm shadow-amber-500/10">
                  <Sparkles size={28} />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                  Your community is ready.
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                  <strong className="text-slate-800">{createdCommunity.name}</strong> has been successfully created. You are now the Community Manager.
                </p>

                {/* Generated Code Display Box */}
                <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                    Community Code
                  </span>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-[#FF9900] tracking-wider select-all">
                    {createdCommunity.code}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    <span>Role: Community Manager</span>
                  </div>
                </div>

                {/* Action Buttons: Share invite & Copy invite link */}
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center items-center">
                  <button
                    type="button"
                    onClick={handleShareInvite}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
                  >
                    {shared ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                    <span>Share community invite</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-600" /> : <LinkIcon size={14} />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy invite link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/dashboard', { replace: true })}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] shadow-sm transition-all cursor-pointer"
                  >
                    <span>Go to community</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Live Preview of Created Community (Shows actual DB count) */}
              <div className="max-w-md mx-auto pt-4 border-t border-slate-100">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 font-mono text-center">
                  Community Profile
                </span>
                <CommunityPreview
                  name={createdCommunity.name}
                  shortName={createdCommunity.shortName}
                  institution={createdCommunity.institution}
                  city={createdCommunity.city}
                  description={createdCommunity.description}
                  managerName={profile?.full_name || 'Community Manager'}
                  memberCount={createdCommunity.memberCount}
                  creationDate={createdCommunity.createdDate}
                  isVerified={true}
                />
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* TWO-COLUMN LAYOUT: FORM (LEFT) + LIVE PREVIEW (RIGHT) */
            /* ============================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Form (7 cols) */}
              <form onSubmit={handleCreate} className="lg:col-span-7 space-y-4">
                {/* Community name * */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Community name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. AWS Student Builders PSIT"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                {/* Short Name & Institution */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Community short name * */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Community short name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                      placeholder="e.g. PSIT-AWS"
                      className="w-full px-3 py-2 text-sm font-mono uppercase rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  {/* Institution * */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institution <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="e.g. PSIT Kanpur"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* City * */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Kanpur"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                {/* Community description * */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Community description <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={15} className="absolute left-3 top-3 text-slate-400" />
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of the club focus, cloud activities, workshops and certifications..."
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20 resize-none"
                    />
                  </div>
                </div>

                {/* Primary CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Creating community...</span>
                    </>
                  ) : (
                    <>
                      <span>Create community →</span>
                    </>
                  )}
                </button>
              </form>

              {/* Right Column: Live Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-2">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  Live Preview
                </span>
                <CommunityPreview
                  name={name}
                  shortName={shortName}
                  institution={institution}
                  city={city}
                  description={description}
                  managerName={profile?.full_name || 'Community Manager'}
                  memberCount={null}
                  creationDate="Today"
                  isVerified={true}
                />
                <p className="text-[11px] text-slate-400 leading-relaxed text-center pt-2">
                  Preview updates live as you type. Your community will receive an official AWS Student Chapter code upon creation.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Consistent Bottom Platform Label */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-400 font-mono">
        AWS Journey Tracker • Community platform
      </footer>
    </div>
  )
}
