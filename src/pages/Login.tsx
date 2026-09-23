import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { RoleSelectionCard } from '@/components/auth/RoleSelectionCard'

type SelectedRoleIntent = 'manager' | 'member'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithPassword } = useAuth()

  // UI Intent Selection only (Never used to assign/escalate backend privileges)
  const [selectedIntent, setSelectedIntent] = useState<SelectedRoleIntent>('manager')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.')
      return
    }

    setIsSubmitting(true)
    try {
      // Authenticate via Supabase Auth
      const { error, role } = await signInWithPassword(email.trim(), password)

      if (error) {
        setErrorMessage(error)
        setIsSubmitting(false)
        return
      }

      // Store onboarding intent in sessionStorage for guiding new users without communities
      sessionStorage.setItem('aws_onboarding_role_intent', selectedIntent)

      // Check if user was attempting to reach a specific protected location
      const from = (location.state as { from?: string })?.from

      // Determine community memberships directly from Supabase (NEVER from localStorage)
      const { data: userComms } = await supabase.rpc('get_user_communities')
      const communityCount = userComms?.length ?? 0

      // Case 1 & 2: User belongs to 1 or multiple communities -> directly enter dashboard
      if (communityCount > 0) {
        if (role === 'admin') {
          navigate(from && from.startsWith('/admin') ? from : '/admin/dashboard', { replace: true })
        } else {
          navigate(from && !from.startsWith('/admin') ? from : '/dashboard', { replace: true })
        }
        return
      }

      // Case 3: User has NO community membership -> determine next onboarding step
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
          navigate('/auth/community-decision', { replace: true })
        }
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during authentication.'
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
          {/* Plinth */}
          <rect x="50" y="180" width="140" height="15" rx="1" fill="currentColor" fillOpacity="0.04" />
          {/* Central Dome Structure */}
          <rect x="75" y="110" width="90" height="70" rx="2" fill="currentColor" fillOpacity="0.04" />
          {/* Central Arch */}
          <path d="M 100 180 L 100 135 Q 120 115 140 135 L 140 180" fill="currentColor" fillOpacity="0.06" />
          {/* Grand Onion Dome */}
          <path d="M 98 110 C 95 80 112 55 120 45 C 128 55 145 80 142 110 Z" fill="currentColor" fillOpacity="0.08" />
          {/* Finial spire */}
          <line x1="120" y1="45" x2="120" y2="28" strokeWidth="1.5" />
          <circle cx="120" cy="26" r="2.5" fill="currentColor" />
          {/* Flanking Small Domes */}
          <path d="M 82 110 C 80 95 88 85 92 80 C 96 85 104 95 102 110 Z" fill="currentColor" fillOpacity="0.06" />
          <path d="M 138 110 C 136 95 144 85 148 80 C 152 85 160 95 158 110 Z" fill="currentColor" fillOpacity="0.06" />
          {/* Left Minaret */}
          <polygon points="30,195 34,70 42,70 46,195" fill="currentColor" fillOpacity="0.05" />
          <path d="M 34 70 Q 38 58 42 70 Z" fill="currentColor" fillOpacity="0.1" />
          <line x1="38" y1="58" x2="38" y2="50" />
          {/* Right Minaret */}
          <polygon points="194,195 198,70 206,70 210,195" fill="currentColor" fillOpacity="0.05" />
          <path d="M 198 70 Q 202 58 206 70 Z" fill="currentColor" fillOpacity="0.1" />
          <line x1="202" y1="58" x2="202" y2="50" />
        </svg>
      </div>

      {/* Header at Top */}
      <header className="relative z-10 w-full border-b border-slate-100 bg-white/95 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Left: AWS logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FF9900] flex items-center justify-center text-slate-950 shadow-xs font-mono font-black text-xs tracking-tighter flex-shrink-0">
            AWS
          </div>
          <span className="font-mono font-bold text-sm tracking-tight text-slate-900 truncate">
            AWS Journey Tracker
          </span>
        </div>

        {/* Right: Tagline (Simplified on Mobile) */}
        <div className="hidden md:block text-xs text-slate-500 font-normal">
          Manage your AWS community. Track progress. Build together.
        </div>
      </header>

      {/* Center Compact Authentication Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-[90%] sm:w-[350px] max-w-[360px] bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 relative transition-all">
          {/* Heading & Subtitle */}
          <div className="text-center mb-5">
            <h1 className="text-xl sm:text-[22px] font-bold font-mono tracking-tight text-slate-900 leading-tight">
              Welcome to AWS Journey Tracker
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-normal">
              Sign in to continue to your community.
            </p>
          </div>

          {/* Two Selectable Cards */}
          <div className="space-y-2.5 mb-5">
            <RoleSelectionCard
              roleId="manager"
              title="COMMUNITY MANAGER"
              description="Manage your community, track progress, organize events and more."
              icon={Users}
              isSelected={selectedIntent === 'manager'}
              onSelect={setSelectedIntent}
            />
            <RoleSelectionCard
              roleId="member"
              title="COMMUNITY MEMBER"
              description="Track your learning progress, complete tasks, join events and collaborate."
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

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Continue with email
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium text-[#FF9900] hover:text-[#EC7211] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            {/* Primary Full-Width AWS Orange Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Continue →</span>
              )}
            </button>
          </form>

          {/* Data Security Notice Below Button */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-start justify-center gap-1.5 text-center">
            <Lock size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-tight">
              Your data is secure and used only for community management and learning purposes.
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
