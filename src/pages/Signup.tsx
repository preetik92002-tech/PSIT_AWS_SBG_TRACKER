import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { RoleSelectionCard } from '@/components/auth/RoleSelectionCard'
import { AWSLogo } from '@/components/ui/AWSLogo'

type SelectedRoleIntent = 'manager' | 'member'

export const Signup: React.FC = () => {
  const navigate = useNavigate()

  // Onboarding Intent (Never used directly to set admin role in DB)
  const [selectedIntent, setSelectedIntent] = useState<SelectedRoleIntent>('manager')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    // Form Validations
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.')
      return
    }

    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address format.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter a password.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Preserving onboarding intent in sessionStorage
      sessionStorage.setItem('aws_onboarding_role_intent', selectedIntent)

      // 2. Call real Supabase Auth signUp
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            onboarding_intent: selectedIntent,
          },
        },
      })

      if (error) {
        setErrorMessage(error.message)
        setIsSubmitting(false)
        return
      }

      // 3. Handle Session or Email Confirmation
      if (data.session) {
        // Immediate session available -> Proceed directly to profile setup
        setSuccessMessage('Account created successfully! Preparing your profile...')
        setTimeout(() => {
          navigate('/auth/setup-profile', {
            replace: true,
            state: { email: email.trim(), fullName: fullName.trim() },
          })
        }, 800)
      } else if (data.user) {
        // Email verification required -> Route to verify email screen
        setSuccessMessage('Account created! Please check your email to verify your address.')
        setTimeout(() => {
          navigate('/auth/verify-email', {
            replace: true,
            state: { email: email.trim(), fullName: fullName.trim() },
          })
        }, 1000)
      } else {
        setErrorMessage('Unexpected response during registration. Please try again.')
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during signup.'
      )
    } finally {
      setIsSubmitting(false)
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
          <line x1="0" y1="195" x2="240" y2="195" strokeWidth="1.5" />
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

      {/* Header at Top */}
      <header className="relative z-10 w-full border-b border-slate-100 bg-white/95 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Left: AWS logo & Title */}
        <div className="flex items-center gap-2.5">
          <AWSLogo size="xs" />
          <span className="font-mono font-bold text-sm tracking-tight text-slate-900 truncate">
            AWS Journey Tracker
          </span>
        </div>

        {/* Right: Tagline */}
        <div className="hidden md:block text-xs text-slate-500 font-normal">
          Manage your AWS community. Track progress. Build together.
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-[90%] sm:w-[380px] max-w-[400px] bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 relative transition-all">
          {/* Heading & Subtitle */}
          <div className="text-center mb-5">
            <h1 className="text-xl sm:text-[22px] font-bold font-mono tracking-tight text-slate-900 leading-tight">
              Create your AWS Journey Tracker account
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-normal">
              Choose how you want to use the platform.
            </p>
          </div>

          {/* Two Selectable Role Intent Cards */}
          <div className="space-y-2.5 mb-5">
            <RoleSelectionCard
              roleId="manager"
              title="COMMUNITY MANAGER"
              description="Create and manage your own AWS community."
              icon={Users}
              isSelected={selectedIntent === 'manager'}
              onSelect={setSelectedIntent}
            />
            <RoleSelectionCard
              roleId="member"
              title="COMMUNITY MEMBER"
              description="Join an existing community, track your learning and participate."
              icon={GraduationCap}
              isSelected={selectedIntent === 'member'}
              onSelect={setSelectedIntent}
            />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2 shadow-xs">
              <AlertCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-start gap-2 shadow-xs">
              <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="leading-snug">{successMessage}</div>
            </div>
          )}

          {/* Account Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full name
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Preeti Sharma"
                  autoComplete="name"
                  disabled={isSubmitting}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors shadow-xs disabled:opacity-50"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  disabled={isSubmitting}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors shadow-xs disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  required
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors shadow-xs disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  required
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors shadow-xs disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create account →</span>
              )}
            </button>
          </form>

          {/* Already have an account? Sign in */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-500">Already have an account? </span>
            <Link
              to="/login"
              className="text-xs font-semibold text-[#FF9900] hover:text-[#EC7211] transition-colors"
            >
              Sign in
            </Link>
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
export default Signup
