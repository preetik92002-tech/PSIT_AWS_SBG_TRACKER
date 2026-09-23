import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  AtSign,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Camera,
  FileText,
  Upload,
  X,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Check,
  Award,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { AuthProgressIndicator, ProgressStep } from '@/components/auth/AuthProgressIndicator'

const ONBOARDING_STEPS: ProgressStep[] = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Profile' },
  { id: 3, label: 'Community' },
  { id: 4, label: 'Finish' },
]

export const SetupProfile: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form Fields
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [alias, setAlias] = useState(profile?.aws_builder_alias || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [institutionName, setInstitutionName] = useState(profile?.institution_name || '')
  const [institutionAddress, setInstitutionAddress] = useState(profile?.institution_address || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')

  // State Management
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Pre-fill profile attributes if existing
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

  // Profile Photo Upload to Supabase Storage
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 2MB size limit
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Profile photo must be less than 2MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, WebP).')
      return
    }

    setIsUploadingPhoto(true)
    setErrorMessage(null)

    try {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${user?.id || 'builder'}_${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload file directly to Supabase Storage bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Retrieve public URL from Supabase Storage (never raw blob in DB)
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      if (urlData?.publicUrl) {
        setAvatarUrl(urlData.publicUrl)
        setSuccessMessage('Profile photo uploaded to Supabase Storage!')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (err) {
      console.warn('Storage upload exception, creating local preview:', err)
      // Graceful fallback for local development if storage is offline
      const localUrl = URL.createObjectURL(file)
      setAvatarUrl(localUrl)
      setSuccessMessage('Photo selected.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleSkipPhoto = () => {
    setAvatarUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('User session not found. Please log in again.')
      return
    }

    // Required Field Validations
    if (!fullName.trim()) {
      setErrorMessage('Full name is required.')
      return
    }

    if (!alias.trim()) {
      setErrorMessage('Community member tag (alias) is required.')
      return
    }

    if (!phone.trim()) {
      setErrorMessage('Phone number is required.')
      return
    }

    if (!institutionName.trim()) {
      setErrorMessage('Institution name is required.')
      return
    }

    if (!institutionAddress.trim()) {
      setErrorMessage('Institution address is required.')
      return
    }

    setIsSaving(true)
    try {
      // Persist profile data to Supabase (ROLE IS NOT MODIFIED)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          aws_builder_alias: alias.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
          phone: phone.trim(),
          institution_name: institutionName.trim(),
          institution_address: institutionAddress.trim(),
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
        // Direct to community decision step
        navigate('/auth/community-decision', { replace: true })
      }, 700)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while saving.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    navigate('/login')
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
          <div className="w-8 h-8 rounded-lg bg-[#FF9900] flex items-center justify-center text-slate-950 shadow-xs font-mono font-black text-xs tracking-tighter flex-shrink-0">
            AWS
          </div>
          <span className="font-mono font-bold text-sm tracking-tight text-slate-900 truncate">
            AWS Journey Tracker
          </span>
        </div>

        <div className="hidden md:block text-xs text-slate-500 font-normal">
          Manage your AWS community. Track progress. Build together.
        </div>
      </header>

      {/* Main Enterprise Onboarding Layout (3-Column on Desktop, 1-Column on Mobile) */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ============================================================== */}
          {/* DESKTOP: LEFT INFORMATIONAL PANEL */}
          {/* ============================================================== */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4">
            {/* Identity & Journey Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#FF9900] uppercase tracking-wider mb-2 font-mono">
                <Sparkles size={14} />
                <span>Builder Onboarding</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 font-mono">
                Welcome to the Hub
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Connect your academic institution with AWS cloud resources, verified chapter badges, and peer collaborators.
              </p>

              {/* Onboarding Milestones Checklist */}
              <div className="mt-5 space-y-3 pt-4 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span>Account Authentication</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#FF9900] font-semibold">
                  <div className="w-5 h-5 rounded-full bg-orange-100 text-[#FF9900] flex items-center justify-center flex-shrink-0 text-[10px]">
                    2
                  </div>
                  <span>Profile Information</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 text-[10px]">
                    3
                  </div>
                  <span>Community Alignment</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 text-[10px]">
                    4
                  </div>
                  <span>Finish & Dashboard</span>
                </div>
              </div>
            </div>

            {/* Platform Perks Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 font-mono flex items-center gap-1.5">
                <Award size={14} className="text-[#FF9900]" />
                <span>Profile Perks</span>
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#FF9900] font-bold">•</span>
                  <span>Unique builder tag recognized across all campus hackathons.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF9900] font-bold">•</span>
                  <span>Direct association with institutional chapter rankings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF9900] font-bold">•</span>
                  <span>Milestone progress and credential tracking on community board.</span>
                </li>
              </ul>
            </div>
          </aside>

          {/* ============================================================== */}
          {/* CENTER: MAIN PROFILE SETUP FORM CARD */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 w-full max-w-xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 relative">
              {/* Progress Indicator (Step 2: Profile) */}
              <AuthProgressIndicator currentStep={2} steps={ONBOARDING_STEPS} />

              {/* Heading & Subtitle */}
              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 leading-tight">
                  Set up your profile
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-normal">
                  Tell your community a little about yourself.
                </p>
              </div>

              {/* Alert Banners */}
              {errorMessage && (
                <div className="mb-5 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{successMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* -------------------------------------------------------- */}
                {/* PROFILE PHOTO SECTION (Compact on mobile) */}
                {/* -------------------------------------------------------- */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-3.5 text-center sm:text-left">
                  {/* Hidden File Input for Avatar Upload to Supabase Storage */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />

                  {/* Circular Preview with Camera Badge */}
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden text-slate-400">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                          onError={() => setAvatarUrl('')}
                        />
                      ) : (
                        <User size={30} className="text-slate-400" />
                      )}
                    </div>
                    {/* Camera Icon Overlay */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FF9900] text-white flex items-center justify-center shadow-xs ring-2 ring-white">
                      {isUploadingPhoto ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Camera size={12} />
                      )}
                    </div>
                  </div>

                  {/* Upload Controls & Actions */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-center sm:justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800 font-mono">
                        Profile photo
                      </span>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleSkipPhoto}
                          className="text-[11px] text-rose-500 hover:text-rose-600 font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <X size={12} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:border-slate-400 text-slate-700 shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Upload size={13} />
                        <span>{avatarUrl ? 'Change photo' : 'Upload photo'}</span>
                      </button>

                      {!avatarUrl && (
                        <button
                          type="button"
                          onClick={handleSkipPhoto}
                          className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          Skip option
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                      JPG, PNG or WebP under 2MB. Stored securely in Supabase Storage.
                    </p>
                  </div>
                </div>

                {/* -------------------------------------------------------- */}
                {/* TWO-COLUMN GRID FOR FORM FIELDS (1-Col on mobile) */}
                {/* -------------------------------------------------------- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name * */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full name <span className="text-rose-500">*</span>
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

                  {/* Community Member Tag * */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Community member tag <span className="text-rose-500">*</span>
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

                  {/* Email * (Read-Only) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email <span className="text-rose-500">*</span>{' '}
                      <span className="text-[11px] text-slate-400 font-normal">(Read-only)</span>
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

                  {/* Phone Number * */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>

                  {/* Institution Name * */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institution name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        placeholder="e.g. PSIT Kanpur"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>

                  {/* Institution Address * */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institution address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={institutionAddress}
                        onChange={(e) => setInstitutionAddress(e.target.value)}
                        placeholder="e.g. Kanpur, Uttar Pradesh, India"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio & Cloud Interests (Spanning full width with Character Counter) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Bio
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {bio.length} / 250
                    </span>
                  </div>
                  <div className="relative">
                    <FileText size={15} className="absolute left-3 top-3 text-slate-400" />
                    <textarea
                      rows={3}
                      maxLength={250}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell your community a little about yourself (e.g. Cloud Security, Serverless, AI/ML)..."
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-2 focus:ring-amber-500/20 resize-none"
                    />
                  </div>
                </div>

                {/* Action Buttons: Back and Continue → */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={15} />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue →</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ============================================================== */}
          {/* DESKTOP: RIGHT CONTEXTUAL GUIDANCE PANEL */}
          {/* ============================================================== */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4">
            {/* Guidance Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2 font-mono">
                <HelpCircle size={14} className="text-[#FF9900]" />
                <span>Contextual Guidance</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 font-mono">
                Profile Best Practices
              </h3>

              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
                <div>
                  <span className="font-semibold text-slate-800">Builder Tag:</span>
                  <p className="text-slate-500 mt-0.5">
                    Your persistent username across project showcases, peer reviews, and leaderboards. Keep it memorable.
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-800">Institution:</span>
                  <p className="text-slate-500 mt-0.5">
                    Ensures your achievements contribute directly to your campus chapter ranking and community visibility.
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-800">Bio Interests:</span>
                  <p className="text-slate-500 mt-0.5">
                    Mention specific AWS services (e.g. Lambda, Bedrock, DynamoDB) to match with project collaborators.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy & Security Note */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1 font-mono">
                <ShieldCheck size={15} className="text-emerald-600" />
                <span>Data Privacy</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your email and phone are protected by Supabase RLS and used solely for authentic chapter notifications and account security.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Consistent Bottom Platform Label */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-400 font-mono">
        AWS Journey Tracker • Community platform
      </footer>
    </div>
  )
}
