import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { trackEvent } from '@/utils/analytics'

type AuthState = 'idle' | 'loading' | 'verification_required' | 'success' | 'error'

export const Signup: React.FC = () => {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [authState, setAuthState] = useState<AuthState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    trackEvent('signup_started')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmedEmail = email.trim()

    // Email validation
    if (!trimmedEmail) {
      setErrorMessage('Please enter a valid email address.')
      setAuthState('error')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address format.')
      setAuthState('error')
      return
    }

    // Password validation
    if (!password) {
      setErrorMessage('Please enter a password.')
      setAuthState('error')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      setAuthState('error')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.')
      setAuthState('error')
      return
    }

    setAuthState('loading')

    try {
      // Real Supabase Auth signUp
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            created_via: 'aws_community_manager',
          },
        },
      })

      if (error) {
        // Handle specific Supabase auth edge cases
        let displayError = error.message
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('user already exists')
        ) {
          displayError = 'An account with this email already exists. Please sign in instead.'
        } else if (error.message.toLowerCase().includes('network')) {
          displayError = 'Network error. Please check your internet connection and try again.'
        }
        setErrorMessage(displayError)
        setAuthState('error')
        return
      }

      // Check for immediate session vs email verification requirement
      if (data.session) {
        // Immediate active session -> proceed to Role Selection
        setAuthState('success')
        trackEvent('signup_completed', { method: 'password', immediateSession: true })
        setSuccessMessage('Account created successfully! Preparing role selection...')
        setTimeout(() => {
          navigate('/auth/role-selection', {
            replace: true,
            state: { email: trimmedEmail },
          })
        }, 800)
      } else if (data.user) {
        // Email verification required by Supabase Auth configuration
        setAuthState('verification_required')
        trackEvent('signup_completed', { method: 'password', immediateSession: false })
        setSuccessMessage('Account created! A verification code has been dispatched to your email.')
        setTimeout(() => {
          navigate('/auth/verify-email', {
            replace: true,
            state: { email: trimmedEmail },
          })
        }, 1200)
      } else {
        setErrorMessage('Unexpected response during registration. Please try again.')
        setAuthState('error')
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during signup.'
      )
      setAuthState('error')
    }
  }

  return (
    <AuthSplitLayout
      title="Create Builder Account"
      subtitle="Register with your institutional or developer email to start your AWS builder journey."
      currentMode="signup"
    >
      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs font-mono flex items-start gap-2 shadow-xs">
          <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Success Message Alert */}
      {successMessage && (
        <div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-start gap-2 shadow-xs">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-snug">{successMessage}</div>
        </div>
      )}

      {/* Verification Required Notice */}
      {authState === 'verification_required' && (
        <div className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-[#FF9900] text-xs font-mono flex items-start gap-2">
          <Info size={15} className="text-[#FF9900] shrink-0 mt-0.5" />
          <span>Verification required. Redirecting you to enter your 6-digit confirmation code...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 font-mono text-xs">
        {/* Email Address */}
        <div>
          <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px]">
            Email Address
          </label>
          <div className="relative">
            <Mail
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. builder@university.edu"
              autoComplete="email"
              disabled={authState === 'loading'}
              required
              className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-800 bg-[#0A0E17] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px]">
            Password
          </label>
          <div className="relative">
            <Lock
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              disabled={authState === 'loading'}
              required
              className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-slate-800 bg-[#0A0E17] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px]">
            Confirm Password
          </label>
          <div className="relative">
            <Lock
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              disabled={authState === 'loading'}
              required
              className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-slate-800 bg-[#0A0E17] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={authState === 'loading'}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
        >
          {authState === 'loading' ? (
            <>
              <Loader2 size={14} className="animate-spin text-slate-950" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>CREATE ACCOUNT</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      {/* Switch to Sign In */}
      <div className="pt-2 text-center text-xs font-mono text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="text-[#FF9900] hover:underline font-bold">
          Sign In →
        </Link>
      </div>
    </AuthSplitLayout>
  )
}

export default Signup
