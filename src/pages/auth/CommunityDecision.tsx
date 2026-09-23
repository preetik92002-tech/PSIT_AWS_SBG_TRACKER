import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  ArrowRight,
  Lock,
  Info,
} from 'lucide-react'
import { AuthProgressIndicator } from '@/components/auth/AuthProgressIndicator'
import { AWSLogo } from '@/components/ui/AWSLogo'

type RoleSelection = 'manager' | 'member'

export const CommunityDecision: React.FC = () => {
  const navigate = useNavigate()

  // Initialize from previous login intent if available, defaulting to 'manager'
  const savedIntent = (sessionStorage.getItem('aws_onboarding_role_intent') as RoleSelection) || 'manager'
  const [selectedRole, setSelectedRole] = useState<RoleSelection>(savedIntent)

  const handleContinue = () => {
    // IMPORTANT: This selection MUST NOT modify profiles.role.
    // It strictly dictates onboarding navigation towards creation or joining.
    sessionStorage.setItem('aws_onboarding_role_intent', selectedRole)

    if (selectedRole === 'manager') {
      navigate('/auth/create-community')
    } else {
      navigate('/auth/join-community')
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
          {/* Main Dome */}
          <path d="M 98 110 Q 120 60 142 110 Z" fill="currentColor" fillOpacity="0.08" />
          <line x1="120" y1="60" x2="120" y2="45" strokeWidth="1.5" />
          <circle cx="120" cy="43" r="2.5" fill="currentColor" />
          {/* Side kiosks (Chhatris) */}
          <path d="M 82 110 Q 88 95 94 110 Z" fill="currentColor" fillOpacity="0.06" />
          <path d="M 146 110 Q 152 95 158 110 Z" fill="currentColor" fillOpacity="0.06" />
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

      {/* Header at Top (Consistent with Login and Verify-Email) */}
      <header className="relative z-10 w-full border-b border-slate-100 bg-white/95 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Left: AWS Logo & Title */}
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

      {/* Main Centered Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-[90%] sm:w-[420px] max-w-[460px] bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 relative transition-all">
          {/* Progress Indicator (Step 4: Community) */}
          <AuthProgressIndicator currentStep={4} />

          {/* Heading & Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-[22px] font-bold font-mono tracking-tight text-slate-900 leading-tight">
              How will you use AWS Journey Tracker?
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-normal">
              Choose the option that best describes you.
            </p>
          </div>

          {/* Two Selectable Cards */}
          <div className="space-y-3.5 mb-6">
            {/* Card 1: COMMUNITY MANAGER */}
            <div
              role="radio"
              aria-checked={selectedRole === 'manager'}
              tabIndex={0}
              onClick={() => setSelectedRole('manager')}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setSelectedRole('manager')
                }
              }}
              className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 focus:outline-none focus:ring-2 focus:ring-[#FF9900]/40 ${
                selectedRole === 'manager'
                  ? 'border-[#FF9900] bg-[#FFFBF5] shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedRole === 'manager'
                    ? 'bg-[#FF9900]/10 text-[#FF9900]'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Users size={20} />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono font-bold tracking-wider text-slate-900 uppercase">
                    COMMUNITY MANAGER
                  </div>
                  {/* Orange radio indicator */}
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedRole === 'manager'
                        ? 'border-[#FF9900]'
                        : 'border-slate-300'
                    }`}
                  >
                    {selectedRole === 'manager' && (
                      <div className="w-2 h-2 rounded-full bg-[#FF9900]" />
                    )}
                  </div>
                </div>

                <div className="text-sm font-semibold text-slate-900 mt-1">
                  Create and manage your community
                </div>

                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Manage members, tasks, events, projects and community progress.
                </p>
              </div>
            </div>

            {/* Card 2: COMMUNITY MEMBER */}
            <div
              role="radio"
              aria-checked={selectedRole === 'member'}
              tabIndex={0}
              onClick={() => setSelectedRole('member')}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setSelectedRole('member')
                }
              }}
              className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 focus:outline-none focus:ring-2 focus:ring-[#FF9900]/40 ${
                selectedRole === 'member'
                  ? 'border-[#FF9900] bg-[#FFFBF5] shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedRole === 'member'
                    ? 'bg-[#FF9900]/10 text-[#FF9900]'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <GraduationCap size={20} />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono font-bold tracking-wider text-slate-900 uppercase">
                    COMMUNITY MEMBER
                  </div>
                  {/* Orange radio indicator */}
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedRole === 'member'
                        ? 'border-[#FF9900]'
                        : 'border-slate-300'
                    }`}
                  >
                    {selectedRole === 'member' && (
                      <div className="w-2 h-2 rounded-full bg-[#FF9900]" />
                    )}
                  </div>
                </div>

                <div className="text-sm font-semibold text-slate-900 mt-1">
                  Join an existing community
                </div>

                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Track your AWS journey, complete tasks and participate in community activities.
                </p>
              </div>
            </div>
          </div>

          {/* Multi-Community Context Note */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5 mb-5">
            <Info size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              A user can later belong to multiple communities — becoming a manager of one community and a member of another.
            </p>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={handleContinue}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:ring-offset-2"
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </button>

          {/* Security Notice */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
            <Lock size={12} className="flex-shrink-0 text-slate-400" />
            <span>Your data is secure and used only for community management and learning purposes.</span>
          </div>
        </div>
      </main>

      {/* Consistent Bottom Platform Label */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-400 font-mono">
        AWS Journey Tracker • Community platform
      </footer>
    </div>
  )
}
