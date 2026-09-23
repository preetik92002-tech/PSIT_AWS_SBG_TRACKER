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
  Calendar,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthProgressIndicator } from '@/components/auth/AuthProgressIndicator'
import { CommunityPreview } from '@/components/auth/CommunityPreview'

export const CreateCommunity: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { refreshUserCommunities, switchCommunityById } = useCommunity()

  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [institution, setInstitution] = useState(profile?.institution_name || '')
  const [city, setCity] = useState('')
  const [stateVal, setStateVal] = useState('')
  const [description, setDescription] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Success state with generated code
  const [createdCommunity, setCreatedCommunity] = useState<{
    id: string
    name: string
    code: string
  } | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [shared, setShared] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('User session not found.')
      return
    }

    if (!name.trim() || !shortName.trim() || !institution.trim() || !city.trim()) {
      setErrorMessage('Please fill in all required fields.')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Insert community with manager_id derived from auth.uid()
      const { data: newComm, error: commErr } = await supabase
        .from('communities')
        .insert({
          name: name.trim(),
          short_name: shortName.trim().toUpperCase(),
          institution: institution.trim(),
          institution_name: institution.trim(),
          city: city.trim(),
          state: stateVal.trim() || null,
          description: description.trim() || null,
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

      // 2. Fetch the automatically generated community code from community_codes
      const { data: codeRecord } = await supabase
        .from('community_codes')
        .select('code')
        .eq('community_id', newComm.id)
        .eq('active', true)
        .maybeSingle()

      setCreatedCommunity({
        id: newComm.id,
        name: newComm.name,
        code: codeRecord?.code || 'ACTIVE',
      })

      // Refresh community list so selector and context update immediately
      await refreshUserCommunities()
      switchCommunityById(newComm.id)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred while creating the community.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyCode = () => {
    if (!createdCommunity) return
    navigator.clipboard.writeText(createdCommunity.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2500)
  }

  const handleShareInvite = () => {
    if (!createdCommunity) return
    const inviteLink = `${window.location.origin}/auth/join-community?code=${createdCommunity.code}`
    if (navigator.share) {
      navigator.share({
        title: `Join ${createdCommunity.name}`,
        text: `Join ${createdCommunity.name} on AWS Journey Tracker with code: ${createdCommunity.code}`,
        url: inviteLink,
      }).catch(() => {
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
    <AuthLayout maxWidthClass="max-w-4xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-9 relative">
        {/* Progress Indicator (Step 4: Community) */}
        <AuthProgressIndicator currentStep={4} />

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
            Create your community
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Build a space for your AWS Student Builders to learn, collaborate and grow together.
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Success View if Created */}
        {createdCommunity ? (
          <div className="text-center py-6 px-4 max-w-lg mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border-2 border-[#FF9900] flex items-center justify-center text-[#FF9900] shadow-md shadow-amber-500/10">
              <Sparkles size={32} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
              Your community is ready.
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              <strong className="text-slate-800">{createdCommunity.name}</strong> has been successfully registered. Share the community code with your students and members.
            </p>

            {/* Generated Code Display Box */}
            <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Community Invite Code
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#FF9900] tracking-wider">
                {createdCommunity.code}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>Manager status: Community Manager</span>
              </div>
            </div>

            {/* Action Buttons: Copy code, Share invite, Go to community */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
              >
                {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy community code'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareInvite}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
              >
                {shared ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                <span>{shared ? 'Link Copied!' : 'Share invite'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard', { replace: true })}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <span>Go to community</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Form & Live Preview Two-Column Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form (7 cols) */}
            <form onSubmit={handleCreate} className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Community Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. PSIT AWS Cloud Club"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Name (Tag) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="e.g. PSIT-AWS"
                    className="w-full px-3 py-2 text-sm font-mono uppercase rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                    placeholder="e.g. Uttar Pradesh"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Community Description
                </label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-3 text-slate-400" />
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the club focus, events, and cloud learning goals..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Registering community...</span>
                  </>
                ) : (
                  <>
                    <span>Create community</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Right Column: Live Community Preview Card (5 cols) */}
            <div className="lg:col-span-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Community preview
              </label>
              <CommunityPreview
                name={name}
                shortName={shortName}
                institution={institution}
                city={stateVal.trim() ? `${city.trim()}, ${stateVal.trim()}` : city}
                description={description}
                managerName={profile?.full_name || 'Community Manager'}
                memberCount={1}
                isVerified={true}
              />
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
