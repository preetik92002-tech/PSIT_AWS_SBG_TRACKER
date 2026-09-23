import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowRight, AlertCircle, Loader2, CheckCircle2, Lock, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthProgressIndicator } from '@/components/auth/AuthProgressIndicator'
import { OtpInput } from '@/components/auth/OtpInput'

export const VerifyEmail: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Get email from router state or fallback
  const passedEmail = (location.state as { email?: string })?.email || 'mradul@example.com'
  const [email] = useState(passedEmail)

  // 6 individual input boxes state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])

  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Resend countdown timer (starts at 42s as in mockup)
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

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage(null)

    const code = otp.join('')
    if (code.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.')
      return
    }

    setIsVerifying(true)
    try {
      // Real Supabase verifyOtp authentication
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })

      if (error) {
        setErrorMessage(error.message)
        setIsVerifying(false)
        return
      }

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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

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
    <AuthLayout maxWidthClass="max-w-xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-9 relative">
        {/* Progress Indicator (Step 2: Verification) */}
        <AuthProgressIndicator currentStep={2} />

        {/* Heading & Subtitle */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
            Verify your email
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            We sent a verification code to
          </p>
          <p className="text-sm font-semibold text-[#0F172A] mt-0.5 font-mono">
            {email}
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
        {successMessage && (
          <div className="mb-6 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* 6-Digit OTP Form */}
        <form onSubmit={handleVerify} className="space-y-6">
          <OtpInput
            value={otp}
            onChange={setOtp}
            disabled={isVerifying}
            hasError={Boolean(errorMessage)}
          />

          {/* Resend Code Section */}
          <div className="text-center text-xs text-slate-500">
            <span className="text-slate-500 mr-1.5">Didn't receive the code?</span>
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-1 font-semibold text-[#FF9900] hover:text-[#EC7211] transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={isResending ? 'animate-spin' : ''} />
                <span>Resend code</span>
              </button>
            ) : (
              <span className="text-slate-500">
                Resend available in{' '}
                <span className="font-semibold text-slate-700 font-mono">
                  {formattedTimer}
                </span>
              </span>
            )}
          </div>

          {/* Primary CTA Button */}
          <button
            type="submit"
            disabled={isVerifying || otp.join('').length < 6}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verifying code...</span>
              </>
            ) : (
              <>
                <span>Verify and continue</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Secondary: Change Email */}
        <div className="mt-5 text-center">
          <Link
            to="/login"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Change email address
          </Link>
        </div>

        {/* Security Note with Lock Icon */}
        <div className="mt-7 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Lock size={13} className="text-slate-400" />
          <span>Your account is protected with email verification.</span>
        </div>
      </div>
    </AuthLayout>
  )
}
