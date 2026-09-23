import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { AlertCircle, Loader2, CheckCircle2, Lock, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { AuthProgressIndicator } from '@/components/auth/AuthProgressIndicator'
import { OtpInput } from '@/components/auth/OtpInput'
import { AWSLogo } from '@/components/ui/AWSLogo'

export const VerifyEmail: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Get email from router state or fallback
  const passedEmail = (location.state as { email?: string })?.email || 'builder@domain.com'
  const [email] = useState(passedEmail)

  // 6 individual input boxes state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])

  const [isVerifying, setIsVerifying] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Resend countdown timer (starts at 42s as specified)
  const [countdown, setCountdown] = useState(42)
  const [canResend, setCanResend] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const formattedTimer = `00:${String(countdown).padStart(2, '0')}`

  const handleOtpChange = (newOtp: string[]) => {
    setOtp(newOtp)
    if (errorMessage) setErrorMessage(null)
  }

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage(null)

    const code = otp.join('').trim()
    if (code.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.')
      return
    }

    setIsVerifying(true)
    try {
      // Real Supabase verifyOtp authentication (never faked or hardcoded)
      let { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })

      // If 'email' type returns invalid token, attempt 'signup' OTP verification
      if (error && (error.message.includes('Invalid') || error.message.includes('expired'))) {
        const retry = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: 'signup',
        })
        if (!retry.error) {
          error = null
        }
      }

      if (error) {
        setErrorMessage(error.message)
        setIsVerifying(false)
        return
      }

      setIsSuccess(true)
      setSuccessMessage('Email verified successfully! Proceeding to profile setup...')
      setTimeout(() => {
        navigate('/auth/setup-profile', { replace: true, state: { email } })
      }, 1000)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred during verification.'
      )
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!canResend || isResending) return
    setIsResending(true)
    setErrorMessage(null)

    try {
      let { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) {
        const retry = await supabase.auth.resend({
          type: 'email_change',
          email,
        })
        if (!retry.error) {
          error = null
        }
      }

      if (error) {
        setErrorMessage(error.message)
      } else {
        setCountdown(42)
        setCanResend(false)
        setSuccessMessage('A fresh verification code has been sent to your email.')
        setTimeout(() => setSuccessMessage(null), 4000)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to resend code.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-between text-slate-800 font-sans relative overflow-x-hidden selection:bg-orange-100 selection:text-orange-900">
      {/* Decorative India Architecture — Bottom Left Corner */}
      <div
        className="absolute bottom-0 left-0 w-36 sm:w-60 h-32 sm:h-48 opacity-[0.07] pointer-events-none select-none overflow-hidden text-slate-800 z-0"
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
          {/* Ground Horizon line */}
          <line x1="0" y1="195" x2="240" y2="195" strokeWidth="1.5" />
          {/* Qutub Minar Silhouette */}
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
          {/* Fluting lines */}
          <line x1="58" y1="195" x2="62" y2="140" strokeDasharray="3 3" />
          <line x1="72" y1="195" x2="68" y2="140" strokeDasharray="3 3" />
          {/* Distant Cloud Computing Towers */}
          <rect x="130" y="120" width="28" height="75" fill="currentColor" fillOpacity="0.04" />
          <rect x="165" y="90" width="34" height="105" fill="currentColor" fillOpacity="0.05" />
          <line x1="182" y1="90" x2="182" y2="70" />
          <rect x="205" y="135" width="25" height="60" fill="currentColor" fillOpacity="0.04" />
        </svg>
      </div>

      {/* Decorative India Architecture — Bottom Right Corner */}
      <div
        className="absolute bottom-0 right-0 w-36 sm:w-60 h-32 sm:h-48 opacity-[0.07] pointer-events-none select-none overflow-hidden text-slate-800 z-0"
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
          {/* Ground Horizon line */}
          <line x1="0" y1="195" x2="240" y2="195" strokeWidth="1.5" />
          {/* Taj Mahal Monument Silhouette */}
          <rect x="50" y="180" width="140" height="15" rx="1" fill="currentColor" fillOpacity="0.04" />
          <rect x="75" y="110" width="90" height="70" rx="2" fill="currentColor" fillOpacity="0.04" />
          <path d="M 100 180 L 100 135 Q 120 115 140 135 L 140 180" fill="currentColor" fillOpacity="0.06" />
          <path d="M 98 110 C 95 80 112 55 120 45 C 128 55 145 80 142 110 Z" fill="currentColor" fillOpacity="0.08" />
          <line x1="120" y1="45" x2="120" y2="28" strokeWidth="1.5" />
          <circle cx="120" cy="26" r="2.5" fill="currentColor" />
          <path d="M 82 110 C 80 95 88 85 92 80 C 96 85 104 95 102 110 Z" fill="currentColor" fillOpacity="0.06" />
          <path d="M 138 110 C 136 95 144 85 148 80 C 152 85 160 95 158 110 Z" fill="currentColor" fillOpacity="0.06" />
          <polygon points="30,195 34,70 42,70 46,195" fill="currentColor" fillOpacity="0.05" />
          <path d="M 34 70 Q 38 58 42 70 Z" fill="currentColor" fillOpacity="0.1" />
          <line x1="38" y1="58" x2="38" y2="50" />
          <polygon points="194,195 198,70 206,70 210,195" fill="currentColor" fillOpacity="0.05" />
          <path d="M 198 70 Q 202 58 206 70 Z" fill="currentColor" fillOpacity="0.1" />
          <line x1="202" y1="58" x2="202" y2="50" />
        </svg>
      </div>

      {/* Header at Top (Identical to Login) */}
      <header className="relative z-10 w-full border-b border-slate-100 bg-white/95 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Left: AWS logo & Title */}
        <div className="flex items-center gap-2.5">
          <AWSLogo size="xs" />
          <span className="font-mono font-bold text-sm tracking-tight text-slate-900 truncate">
            AWS Journey Tracker
          </span>
        </div>

        {/* Right: Tagline (Simplified on Mobile) */}
        <div className="hidden md:block text-xs text-slate-500 font-normal">
          Manage your AWS community. Track progress. Build together.
        </div>
      </header>

      {/* Center Authentication Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-[90%] sm:w-[400px] max-w-[420px] bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 relative transition-all">
          {/* Progress Indicator: Step 2 Verification */}
          <AuthProgressIndicator currentStep={2} />

          {/* Heading & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-[22px] font-bold font-mono tracking-tight text-slate-900 leading-tight">
              Verify your email
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-normal">
              We sent a verification code to
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 font-mono truncate px-2">
              {email}
            </p>
          </div>

          {/* Error Banner (Invalid-code state) */}
          {errorMessage && (
            <div className="mb-4 p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2 shadow-xs">
              <AlertCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-start gap-2 shadow-xs">
              <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="leading-snug">{successMessage}</div>
            </div>
          )}

          {/* 6-Digit OTP Form */}
          <form onSubmit={handleVerify} className="space-y-5">
            <OtpInput
              value={otp}
              onChange={handleOtpChange}
              disabled={isVerifying}
              hasError={Boolean(errorMessage)}
              isSuccess={isSuccess}
            />

            {/* Resend Code Section with Countdown */}
            <div className="text-center text-xs text-slate-500 pt-1">
              <span className="text-slate-500 mr-1.5">Didn't receive the code?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="inline-flex items-center gap-1 font-semibold text-[#FF9900] hover:text-[#EC7211] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isResending ? 'animate-spin' : ''} />
                  <span>Resend code</span>
                </button>
              ) : (
                <span className="text-slate-500">
                  Resend available in{' '}
                  <span className="font-semibold text-slate-800 font-mono">
                    {formattedTimer}
                  </span>
                </span>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isVerifying || otp.join('').trim().length < 6}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Verifying code...</span>
                </>
              ) : (
                <span>Verify and continue →</span>
              )}
            </button>
          </form>

          {/* Secondary Action: Change Email */}
          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Change email address
            </Link>
          </div>

          {/* Bottom Security Message */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-center">
            <Lock size={12} className="text-slate-400 flex-shrink-0" />
            <p className="text-[10px] text-slate-400 leading-tight">
              Your account is protected with email verification.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Centered Platform Label */}
      <footer className="relative z-10 w-full text-center pb-5 pt-3">
        <p className="text-xs text-slate-400 font-mono">
          AWS Journey Tracker • Community platform
        </p>
      </footer>
    </div>
  )
}
