import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  AtSign,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Camera,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthProgressIndicator } from '@/components/auth/AuthProgressIndicator'

export const SetupProfile: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile, role, refreshProfile } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [alias, setAlias] = useState(profile?.aws_builder_alias || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [institutionName, setInstitutionName] = useState(profile?.institution_name || '')
  const [institutionAddress, setInstitutionAddress] = useState(profile?.institution_address || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')

  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Populate initial values once profile is loaded
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name)
      if (profile.aws_builder_alias) setAlias(profile.aws_builder_alias)
      if (profile.phone) setPhone(profile.phone)
      if (profile.institution_name) setInstitutionName(profile.institution_name)
      if (profile.institution_address) setInstitutionAddress(profile.institution_address)
      if (profile.bio) setBio(profile.bio)
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url)
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('User session not found. Please log in again.')
      return
    }

    if (!fullName.trim()) {
      setErrorMessage('Full name is required.')
      return
    }

    if (!alias.trim()) {
      setErrorMessage('Community member tag (alias) is required.')
      return
    }

    setIsSaving(true)
    try {
      // Update public.profiles in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          aws_builder_alias: alias.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
          phone: phone.trim() || null,
          institution_name: institutionName.trim() || null,
          institution_address: institutionAddress.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        })
        .eq('id', user.id)

      if (updateError) {
        setErrorMessage(updateError.message)
        setIsSaving(false)
        return
      }

      await refreshProfile()

      setSuccessMessage('Profile saved successfully! Proceeding...')

      setTimeout(() => {
        // Direct to community decision step: create community vs join community
        navigate('/auth/community-decision', { replace: true })
      }, 800)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while saving.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AuthLayout maxWidthClass="max-w-2xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-9 relative">
        {/* Progress Indicator (Step 3: Profile) */}
        <AuthProgressIndicator currentStep={3} />

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
            Set up your profile
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Tell your community a little about yourself.
          </p>
        </div>

        {/* Error / Success Banners */}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo Row */}
          <div className="flex items-center gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden text-slate-400">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarUrl('')}
                  />
                ) : (
                  <User size={30} />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FF9900] text-white flex items-center justify-center shadow-sm">
                <Camera size={13} />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Profile Photo URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3 py-1.5 text-xs rounded-md bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Provide an image URL or leave empty for default avatar.
              </p>
            </div>
          </div>

          {/* Two-Column Grid for Primary Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Preeti Sharma"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Community Member Tag (Alias) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Community Member Tag <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="e.g. preeti-cloud"
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Email (Read-only from Auth) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-slate-400 font-normal">(Verified)</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  readOnly
                  disabled
                  value={user?.email || profile?.email || ''}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed select-none font-mono"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>
          </div>

          {/* Institution Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institution Name <span className="text-slate-400 font-normal">(College / Uni)</span>
              </label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. Pranveer Singh Institute of Technology"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institution Address <span className="text-slate-400 font-normal">(City, State)</span>
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={institutionAddress}
                  onChange={(e) => setInstitutionAddress(e.target.value)}
                  placeholder="e.g. Kanpur, Uttar Pradesh, India"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Bio & Cloud Interests
              </label>
              <span className="text-[11px] text-slate-400">{bio.length} / 250</span>
            </div>
            <div className="relative">
              <FileText size={15} className="absolute left-3 top-3 text-slate-400" />
              <textarea
                rows={3}
                maxLength={250}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your cloud builder interests (e.g. Serverless, AI/ML, Cloud Security, DevOps)..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20 resize-none"
              />
            </div>
          </div>

          {/* Primary CTA */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving profile...</span>
              </>
            ) : (
              <>
                <span>Save and continue</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}
