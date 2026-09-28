import React, { useState, useEffect } from 'react'
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
  Upload,
  Camera,
  AlertTriangle,
  Eye,
  QrCode,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'
import { AuthProgressIndicator, ProgressStep } from '@/components/auth/AuthProgressIndicator'
import { AWSLogo } from '@/components/ui/AWSLogo'
import { CommunityImage } from '@/components/ui/CommunityImage'
import { ShareCommunityModal } from '@/components/community/ShareCommunityModal'
import { trackEvent } from '@/utils/analytics'

const ONBOARDING_STEPS: ProgressStep[] = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Role' },
  { id: 3, label: 'Profile' },
  { id: 4, label: 'Community' },
]

interface ExistingCommunityMatch {
  id: string
  name: string
  short_name: string
  institution: string
  city: string
  logo_url?: string | null
}

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
  const [communityImage, setCommunityImage] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Duplicate community detection state
  const [existingCommunityMatch, setExistingCommunityMatch] = useState<ExistingCommunityMatch | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

  // Success state with created community details
  const [createdCommunity, setCreatedCommunity] = useState<{
    id: string
    name: string
    shortName: string
    institution: string
    city: string
    description: string
    code: string
    imageUrl: string | null
    memberCount: number
    createdDate: string
  } | null>(null)

  const [copiedCode, setCopiedCode] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [showQrCode, setShowQrCode] = useState(false)

  // Check for duplicate institution whenever institution name changes
  useEffect(() => {
    const inst = institution.trim()
    if (inst.length < 3) {
      setExistingCommunityMatch(null)
      return
    }

    let isCurrent = true
    const checkDuplicate = async () => {
      setIsCheckingDuplicate(true)
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('id, name, short_name, institution, city, logo_url')
          .ilike('institution', `%${inst}%`)
          .limit(1)

        if (!isCurrent) return
        if (!error && data && data.length > 0) {
          setExistingCommunityMatch(data[0])
        } else {
          setExistingCommunityMatch(null)
        }
      } catch {
        if (isCurrent) setExistingCommunityMatch(null)
      } finally {
        if (isCurrent) setIsCheckingDuplicate(false)
      }
    }

    const timer = setTimeout(checkDuplicate, 400)
    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [institution])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setCommunityImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('User session not found. Please log in again.')
      return
    }

    if (!name.trim()) {
      setErrorMessage('Community name is required.')
      return
    }
    if (!shortName.trim()) {
      setErrorMessage('Community short name is required.')
      return
    }
    if (!institution.trim()) {
      setErrorMessage('Institution name is required.')
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

    // Duplicate check confirmation
    if (existingCommunityMatch) {
      setErrorMessage('An official community already exists for this institution. Please join the existing community tracker.')
      return
    }

    setIsSubmitting(true)
    trackEvent('create_community_clicked', { institution, shortName })

    try {
      // 1. Insert community record into Supabase
      const { data: newComm, error: commErr } = await supabase
        .from('communities')
        .insert({
          name: name.trim(),
          short_name: shortName.trim().toUpperCase(),
          institution: institution.trim(),
          institution_name: institution.trim(),
          city: city.trim(),
          description: description.trim(),
          logo_url: communityImage,
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

      // 2. Fetch the generated invite code from community_codes
      const { data: codeRecord } = await supabase
        .from('community_codes')
        .select('code')
        .eq('community_id', newComm.id)
        .eq('active', true)
        .maybeSingle()

      const generatedCode = codeRecord?.code || `${shortName.trim().toUpperCase()}-AWS-${new Date().getFullYear()}`

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
        code: generatedCode,
        imageUrl: communityImage,
        memberCount: 1,
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

  const handleCopyCode = async () => {
    if (!createdCommunity) return
    await navigator.clipboard.writeText(createdCommunity.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0F17] flex flex-col justify-between text-slate-100 font-sans relative overflow-x-hidden selection:bg-[#FF9900]/20 selection:text-[#FF9900]">
      {/* Header */}
      <header className="relative z-10 w-full border-b border-[#1F293A] bg-[#0E141F]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AWSLogo size="xs" />
          <span className="font-mono font-bold text-sm tracking-tight text-white">
            Journey Tracker
          </span>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Step 4 of 4: Community Creation
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-4xl mx-auto w-full">
        {/* Onboarding progress steps */}
        <div className="w-full max-w-md mb-6">
          <AuthProgressIndicator currentStep={4} steps={ONBOARDING_STEPS} />
        </div>

        {/* ============================================================== */}
        {/* STATE A: COMMUNITY CREATED SUCCESS SCREEN                       */}
        {/* ============================================================== */}
        {createdCommunity ? (
          <div className="w-full max-w-lg bg-[#121824] rounded-2xl border border-[#1F293A] shadow-md p-6 sm:p-8 space-y-6 animate-live-card-in">
            <div className="text-center space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold uppercase tracking-wider mb-1">
                <CheckCircle2 size={13} />
                <span>COMMUNITY CREATED</span>
              </span>
              <h1 className="text-2xl font-mono font-bold text-white tracking-tight">
                {createdCommunity.name}
              </h1>
              <p className="text-xs font-sans text-slate-400">
                Official chapter registered for {createdCommunity.institution}
              </p>
            </div>

            {/* Identity Card */}
            <div className="p-4 rounded-xl border border-[#1F293A] bg-[#18202E] flex items-center gap-4">
              <CommunityImage
                src={createdCommunity.imageUrl}
                name={createdCommunity.name}
                shortName={createdCommunity.shortName}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF9900] font-bold block">
                  Official AWS Chapter
                </span>
                <p className="text-xs font-mono font-semibold text-white truncate">
                  {createdCommunity.institution}
                </p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  {createdCommunity.city}, India • 1 Initial Manager
                </p>
              </div>
            </div>

            {/* Community Code Box */}
            <div className="p-4 rounded-xl bg-[#18202E] border border-[#FF9900]/40 space-y-2">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Official Community Join Code
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold text-white tracking-wider">
                  {createdCommunity.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-2xs transition-all cursor-pointer"
                >
                  {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <p className="text-[11px] font-sans text-slate-400">
                Give this code to student builders at your institution to let them join your chapter.
              </p>
            </div>

            {/* Inline QR Code Section */}
            {showQrCode && (
              <div className="p-4 rounded-xl bg-[#0E141F] border border-slate-800 text-center space-y-3 animate-live-fade-in">
                <span className="text-[10px] font-mono text-[#FF9900] uppercase font-bold tracking-wider block">
                  CHAPTER ONBOARDING QR CODE
                </span>
                <div className="w-36 h-36 mx-auto bg-white p-2.5 rounded-xl shadow-md flex items-center justify-center">
                  {/* High contrast technical QR Code SVG representation */}
                  <svg className="w-full h-full text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                    {/* Position Detection Squares */}
                    <rect x="0" y="0" width="30" height="30" rx="3" />
                    <rect x="6" y="6" width="18" height="18" fill="white" rx="1" />
                    <rect x="10" y="10" width="10" height="10" rx="1" />

                    <rect x="70" y="0" width="30" height="30" rx="3" />
                    <rect x="76" y="6" width="18" height="18" fill="white" rx="1" />
                    <rect x="80" y="10" width="10" height="10" rx="1" />

                    <rect x="0" y="70" width="30" height="30" rx="3" />
                    <rect x="6" y="76" width="18" height="18" fill="white" rx="1" />
                    <rect x="10" y="80" width="10" height="10" rx="1" />

                    {/* QR Code Pixel Matrix simulation for join code */}
                    <rect x="36" y="6" width="6" height="6" />
                    <rect x="46" y="6" width="6" height="6" />
                    <rect x="56" y="6" width="6" height="6" />
                    <rect x="36" y="18" width="6" height="6" />
                    <rect x="48" y="18" width="6" height="6" />
                    <rect x="56" y="24" width="6" height="6" />

                    <rect x="6" y="36" width="6" height="6" />
                    <rect x="18" y="36" width="6" height="6" />
                    <rect x="24" y="44" width="6" height="6" />
                    <rect x="36" y="36" width="6" height="6" />
                    <rect x="48" y="40" width="6" height="6" />
                    <rect x="60" y="36" width="6" height="6" />
                    <rect x="72" y="36" width="6" height="6" />
                    <rect x="84" y="36" width="6" height="6" />

                    <rect x="36" y="72" width="6" height="6" />
                    <rect x="48" y="72" width="6" height="6" />
                    <rect x="60" y="72" width="6" height="6" />
                    <rect x="72" y="80" width="6" height="6" />
                    <rect x="84" y="72" width="6" height="6" />
                    <rect x="60" y="88" width="6" height="6" />
                  </svg>
                </div>
                <p className="text-[11px] font-mono text-slate-400">
                  Scan with mobile camera to join <code className="text-white">{createdCommunity.code}</code>
                </p>
              </div>
            )}

            {/* Actions: Share, QR, and Continue */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-300 bg-[#18202E] hover:bg-[#1E293B] border border-[#1F293A] shadow-xs transition-all cursor-pointer"
              >
                <Share2 size={13} className="text-[#FF9900]" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrCode((prev) => !prev)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-300 bg-[#18202E] hover:bg-[#1E293B] border border-[#1F293A] shadow-xs transition-all cursor-pointer"
              >
                <QrCode size={13} className="text-[#FF9900]" />
                <span>{showQrCode ? 'Hide QR' : 'QR Code'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-xs transition-all cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* STATE B: COMMUNITY CREATION FORM                                */
          /* ============================================================== */
          <div className="w-full max-w-xl bg-[#121824] rounded-2xl border border-[#1F293A] shadow-sm p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight">
                Create AWS Student Builder Community
              </h1>
              <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
                Set up the official institutional tracker for your campus chapter.
              </p>
            </div>

            {/* Duplicate Community Alert if detected */}
            {existingCommunityMatch && (
              <div className="p-4 rounded-xl border border-amber-800 bg-amber-950/40 space-y-3 animate-live-card-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                      COMMUNITY ALREADY EXISTS
                    </h3>
                    <p className="text-xs font-sans text-amber-200/90 leading-relaxed">
                      An official AWS Student Builder community already exists for this institution. Do not create another tracker.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#0E141F] rounded-lg border border-amber-800/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CommunityImage
                      src={existingCommunityMatch.logo_url}
                      name={existingCommunityMatch.name}
                      shortName={existingCommunityMatch.short_name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold text-white truncate">
                        {existingCommunityMatch.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">
                        {existingCommunityMatch.institution} • {existingCommunityMatch.city}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      switchCommunityById(existingCommunityMatch.id)
                      navigate('/community')
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#FF9900] text-slate-950 font-bold hover:bg-[#EC7211] transition-colors shadow-2xs"
                  >
                    View Community
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/auth/join-community')}
                    className="px-3 py-1.5 rounded-lg bg-[#18202E] border border-amber-800 text-amber-300 font-semibold hover:bg-[#1E293B] transition-colors shadow-2xs"
                  >
                    Join Existing Community
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs font-mono text-rose-300 flex items-start gap-2">
                <AlertCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Community Name */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
                  Community Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AWS Student Builder Group PSIT Kanpur"
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>

              {/* Institution and Short Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
                    Institution Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. Pranveer Singh Institute of Technology"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
                    Short Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value.toUpperCase())}
                    placeholder="e.g. PSIT"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold tracking-wider rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
                  City <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Kanpur"
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-1">
                  Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Founding chapter for cloud architects, builders, and developers at PSIT Kanpur..."
                  className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] resize-none"
                />
              </div>

              {/* Official Community Image Upload Box */}
              <div className="p-4 rounded-xl border border-[#1F293A] bg-[#18202E] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono uppercase tracking-wider font-bold text-white">
                    OFFICIAL COMMUNITY / GROUP IMAGE
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">Optional</span>
                </div>
                <p className="text-[11px] font-sans text-slate-400 leading-relaxed">
                  This is <strong>NOT</strong> your personal profile photo. It represents the entire student builder chapter across the platform.
                </p>

                <div className="flex items-center gap-4 pt-1">
                  <CommunityImage
                    src={communityImage}
                    name={name || 'AWS Community'}
                    shortName={shortName || 'AWS'}
                    size="lg"
                  />
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-slate-300 bg-[#0E141F] border border-[#1F293A] hover:bg-[#1E293B] transition-colors cursor-pointer shadow-2xs">
                      <Camera size={13} className="text-[#FF9900]" />
                      <span>{communityImage ? 'Replace Image' : 'Upload Community Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    {communityImage && (
                      <button
                        type="button"
                        onClick={() => setCommunityImage(null)}
                        className="block text-[11px] font-mono text-rose-400 hover:underline mt-1.5"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !!existingCommunityMatch}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-xs transition-all disabled:opacity-50 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <Loader2 size={15} className="animate-spin text-slate-950" />
                  ) : (
                    <Building2 size={15} />
                  )}
                  <span>{isSubmitting ? 'Creating Chapter...' : 'Create Community Tracker'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Share Modal */}
      {createdCommunity && (
        <ShareCommunityModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          community={{
            id: createdCommunity.id,
            name: createdCommunity.name,
            shortName: createdCommunity.shortName,
            institutionName: createdCommunity.institution,
            city: createdCommunity.city,
            code: createdCommunity.code,
            imageUrl: createdCommunity.imageUrl,
            memberCount: createdCommunity.memberCount,
          }}
        />
      )}
    </div>
  )
}
