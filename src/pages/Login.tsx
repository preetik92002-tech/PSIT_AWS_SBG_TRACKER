import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'

type AuthState = 'idle' | 'loading' | 'success' | 'error'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [authState, setAuthState] = useState<AuthState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your email address and password.')
      setAuthState('error')
      return
    }

    setAuthState('loading')

    try {
      // 1. Authenticate with Supabase Auth
      const { error, role } = await signInWithPassword(trimmedEmail, password)

      if (error) {
        setErrorMessage(error)
        setAuthState('error')
        return
      }

      setAuthState('success')

      // Check if user was navigating to a specific target route
      const from = (location.state as { from?: string })?.from

      // 2. Query memberships directly from Supabase (NEVER from localStorage)
      const { data: userComms, error: commsErr } = await supabase.rpc('get_user_communities')
      const communityCount = userComms?.length ?? 0

      // Case A: User belongs to 1 or more communities -> navigate to dashboard
      if (communityCount > 0) {
        if (role === 'admin') {
          navigate(from && from.startsWith('/admin') ? from : '/admin/dashboard', { replace: true })
        } else {
          navigate(from && !from.startsWith('/admin') ? from : '/dashboard', { replace: true })
        }
        return
      }

      // Case B: User has NO community yet -> check profile completeness
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, institution_name')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (!profileData?.full_name || !profileData?.institution_name) {
          navigate('/auth/setup-profile', { replace: true })
        } else {
          navigate('/auth/role-selection', { replace: true })
        }
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during authentication.'
      )
      setAuthState('error')
    }
  }

  return (
    <AuthSplitLayout
      title="Sign In to Your Chapter"
      subtitle="Enter your builder account credentials to access your campus community workspace."
      currentMode="login"
    >
      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs font-mono flex items-start gap-2 shadow-xs">
          <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Success Alert */}
      {authState === 'success' && (
        <div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-start gap-2 shadow-xs">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-snug">Authenticated successfully! Entering workspace...</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
        {/* Email */}
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
              placeholder="e.g. builder@domain.edu"
              autoComplete="email"
              disabled={authState === 'loading'}
              required
              className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-800 bg-[#0A0E17] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password & Forgot Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[11px] text-[#FF9900] hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={authState === 'loading'}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
        >
          {authState === 'loading' ? (
            <>
              <Loader2 size={14} className="animate-spin text-slate-950" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>SIGN IN</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      {/* Switch to Sign Up */}
      <div className="pt-2 text-center text-xs font-mono text-slate-400">
        New to AWS Community Manager?{' '}
        <Link to="/signup" className="text-[#FF9900] hover:underline font-bold">
          Create Account →
        </Link>
      </div>
    </AuthSplitLayout>
  )
}

export default Login
