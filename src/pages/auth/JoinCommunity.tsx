import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Users,
  Building2,
  MapPin,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Check,
  Info,
  Calendar,
  X,
  Camera,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'
import { AuthProgressIndicator, ProgressStep } from '@/components/auth/AuthProgressIndicator'

const ONBOARDING_STEPS: ProgressStep[] = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Profile' },
  { id: 3, label: 'Community' },
  { id: 4, label: 'Finish' },
]

interface CommunityPreviewData {
  id: string
  name: string
  short_name: string
  institution: string
  city: string
  description: string | null
  member_count: number
  manager_name: string
  created_at?: string
}

export const JoinCommunity: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { refreshUserCommunities, switchCommunityById } = useCommunity()

  const initialCode = searchParams.get('code') || ''
  const [code, setCode] = useState(initialCode.toUpperCase())

  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewData, setPreviewData] = useState<CommunityPreviewData | null>(null)

  const [isJoining, setIsJoining] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    name: string
    alreadyMember: boolean
    communityId?: string
  } | null>(null)

  const [showQrModal, setShowQrModal] = useState(false)

  // Real-time lookup of actual community preview whenever code reaches valid threshold (>= 4 characters)
  useEffect(() => {
    const cleanCode = code.trim().toUpperCase()
    if (cleanCode.length >= 4) {
      let isCurrent = true
      setIsLoadingPreview(true)

      const fetchPreview = async () => {
        try {
          const { data, error } = await supabase.rpc('get_community_by_code', {
            p_code: cleanCode,
          })

          if (!isCurrent) return
          setIsLoadingPreview(false)

          if (!error && data) {
            setPreviewData(data as unknown as CommunityPreviewData)
            setErrorMessage(null)
          } else {
            setPreviewData(null)
          }
        } catch {
          if (isCurrent) {
            setIsLoadingPreview(false)
            setPreviewData(null)
          }
        }
      }

      fetchPreview()

      return () => {
        isCurrent = false
      }
    } else {
      setPreviewData(null)
    }
  }, [code])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('User session not found. Please log in.')
      return
    }

    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) {
      setErrorMessage('Please enter your community code.')
      return
    }

    setIsJoining(true)
    try {
      // Execute secure database function.
      // Database enforces that the caller always becomes role = 'member'.
      // profiles.role is NEVER modified.
      const { data, error } = await supabase.rpc('join_community_by_code', {
        p_code: cleanCode,
      })

      if (error) {
        setErrorMessage(error.message)
        setIsJoining(false)
        return
      }

      const res = data as {
        success: boolean
        already_member: boolean
        name: string
        community_id?: string
      }

      setSuccessData({
        name: res.name,
        alreadyMember: res.already_member,
        communityId: res.community_id,
      })

      // Refresh community context to ensure new community appears in the switcher
      await refreshUserCommunities()
      if (res.community_id) {
        switchCommunityById(res.community_id)
      }

      // Smooth transition to dashboard
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 1500)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while joining the community.'
      )
    } finally {
      setIsJoining(false)
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

      {/* Main Card */}
      <main className="relative z-10 flex-1 w-full max-w-xl mx-auto px-4 py-8 flex flex-col justify-center">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 relative">
          {/* Progress Indicator (Step 3: Community) */}
          <AuthProgressIndicator
            currentStep={successData ? 4 : 3}
            steps={ONBOARDING_STEPS}
          />

          {/* Heading & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 leading-tight">
              Join your community
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-normal">
              Enter the community code shared by your Community Manager.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Success / Already Member View */}
          {successData ? (
            <div className="text-center py-5 px-3 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-xs">
                <Check size={28} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-mono text-slate-900">
                  {successData.alreadyMember
                    ? "You're already a member of this community."
                    : 'Welcome to the Community!'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                  You are enrolled in <strong className="text-slate-800">{successData.name}</strong>. Entering dashboard...
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard', { replace: true })}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] shadow-sm transition-all cursor-pointer"
                >
                  <span>Go to community</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              {/* Large Input: Community Code */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 font-mono">
                  Community code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PSIT-KNP-4821"
                    className="w-full px-4 py-3.5 text-base sm:text-lg font-mono font-bold tracking-wider rounded-xl bg-white border-2 border-slate-300 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#FF9900] focus:ring-4 focus:ring-amber-500/10 transition-all uppercase"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isLoadingPreview && (
                      <Loader2 size={18} className="animate-spin text-[#FF9900]" />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Example: <span className="font-mono text-slate-600 font-medium">PSIT-KNP-4821</span>
                </p>
              </div>

              {/* After Valid Code: Actual Community Preview */}
              {previewData && (
                <div className="space-y-3 pt-1 animate-fadeIn">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                    {/* Header with Short Name & Green Verified Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2.5 pb-2.5 border-b border-slate-100">
                      <span className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
                        {previewData.short_name || 'CHAPTER'}
                      </span>
                      {/* Green Verified Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                        <Check size={12} strokeWidth={3} className="text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    </div>

                    {/* Community Name */}
                    <h3 className="text-base font-bold text-slate-900 font-mono leading-tight">
                      {previewData.name}
                    </h3>

                    {/* Institution & City */}
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-[#FF9900] flex-shrink-0" />
                        <span className="font-medium text-slate-700">{previewData.institution}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                        <span>{previewData.city}</span>
                      </div>
                    </div>

                    {/* Manager & Member Count */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">
                          Community Manager
                        </span>
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          {previewData.manager_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-mono tracking-wider">
                          Member count
                        </span>
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Users size={12} className="text-[#FF9900]" />
                          <span>{previewData.member_count} {previewData.member_count === 1 ? 'member' : 'members'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Note */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                    <ShieldCheck size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>Only join communities you recognize.</span>
                  </div>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isJoining || !code.trim()}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Validating & joining...</span>
                  </>
                ) : (
                  <>
                    <span>Join community →</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider font-mono font-semibold">
                  or
                </span>
              </div>

              {/* Secondary Action: Scan QR code */}
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode size={15} />
                <span>Scan QR code</span>
              </button>
            </form>
          )}
        </div>
      </main>

      {/* QR Code Scanner Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl text-center relative">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X size={16} />
            </button>
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF9900]">
              <Camera size={22} />
            </div>
            <h3 className="text-base font-bold font-mono text-slate-900">Scan Community QR</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Point your camera at the invite QR code displayed at your campus AWS meetup.
            </p>
            <div className="w-48 h-48 mx-auto rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <QrCode size={36} className="text-slate-300" />
              <span>Camera scanner active</span>
            </div>
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom Platform Label */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-400 font-mono">
        AWS Journey Tracker • Community platform
      </footer>
    </div>
  )
}
