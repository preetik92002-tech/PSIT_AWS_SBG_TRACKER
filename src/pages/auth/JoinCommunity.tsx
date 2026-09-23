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
  Search,
  Check,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthProgressIndicator } from '@/components/auth/AuthProgressIndicator'
import { CommunityPreview } from '@/components/auth/CommunityPreview'

interface CommunityPreviewData {
  id: string
  name: string
  short_name: string
  institution: string
  city: string
  description: string | null
  member_count: number
  manager_name: string
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
  const [successData, setSuccessData] = useState<{ name: string; alreadyMember: boolean } | null>(null)

  const [showQrModal, setShowQrModal] = useState(false)

  // Auto-fetch community preview when code length reaches format threshold
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
      // Atomic database-side validation and membership creation
      const { data, error } = await supabase.rpc('join_community_by_code', {
        p_code: cleanCode,
      })

      if (error) {
        setErrorMessage(error.message)
        setIsJoining(false)
        return
      }

      const res = data as { success: boolean; already_member: boolean; name: string; community_id?: string }
      setSuccessData({
        name: res.name,
        alreadyMember: res.already_member,
      })

      await refreshUserCommunities()
      if (res.community_id) {
        switchCommunityById(res.community_id)
      }

      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 1200)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred while joining the community.'
      )
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <AuthLayout maxWidthClass="max-w-xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-9 relative">
        {/* Progress Indicator (Step 4: Community) */}
        <AuthProgressIndicator currentStep={4} />

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
            Join your community
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Enter the community code shared by your Community Manager.
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Success Banner */}
        {successData ? (
          <div className="text-center py-6 px-4">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-sm">
              <Check size={28} strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              {successData.alreadyMember ? 'Already a member!' : 'Welcome to the Community!'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              You are enrolled in <strong className="text-slate-800">{successData.name}</strong>. Entering dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-6">
            {/* Community Code Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Community Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PSIT-KNP-4821"
                  className="w-full px-4 py-3 text-base sm:text-lg font-mono font-bold tracking-wider rounded-xl bg-white border-2 border-slate-300 text-[#0F172A] placeholder:text-slate-300 focus:outline-none focus:border-[#FF9900] focus:ring-4 focus:ring-amber-500/10 transition-all uppercase"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {isLoadingPreview && <Loader2 size={16} className="animate-spin text-[#FF9900]" />}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Ask your chapter lead or student community manager for the invite code.
              </p>
            </div>

            {/* Live Community Preview Card if found */}
            {previewData && (
              <div className="animate-in fade-in duration-300">
                <CommunityPreview
                  name={previewData.name}
                  shortName={previewData.short_name}
                  institution={previewData.institution}
                  city={previewData.city}
                  description={previewData.description}
                  managerName={previewData.manager_name}
                  memberCount={previewData.member_count}
                  isVerified={true}
                />
              </div>
            )}

            {/* Primary CTA Button */}
            <button
              type="submit"
              disabled={isJoining || !code.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Validating & joining...</span>
                </>
              ) : previewData ? (
                <>
                  <span>Join this community</span>
                  <ArrowRight size={16} />
                </>
              ) : (
                <>
                  <span>Join community</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                or
              </span>
            </div>

            {/* Secondary CTA: QR Code */}
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
            >
              <QrCode size={15} />
              <span>Scan QR code</span>
            </button>
          </form>
        )}

        {/* QR Code Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-50 flex items-center justify-center text-[#FF9900]">
                <QrCode size={24} />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Scan Community QR</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Position your camera over the QR code presented at your AWS campus meetup.
              </p>
              <div className="w-48 h-48 mx-auto rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
                Camera Scanner Ready
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="mt-5 w-full py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
