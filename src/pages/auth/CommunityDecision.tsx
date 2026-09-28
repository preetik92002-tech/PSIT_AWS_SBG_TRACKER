import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { AuthProgressIndicator, ProgressStep } from '@/components/auth/AuthProgressIndicator'
import { AWSLogo } from '@/components/ui/AWSLogo'

type RoleSelection = 'manager' | 'member'

const ONBOARDING_STEPS: ProgressStep[] = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Role' },
  { id: 3, label: 'Profile' },
  { id: 4, label: 'Community' },
]

export const CommunityDecision: React.FC = () => {
  const navigate = useNavigate()

  // Initialize from previous login intent if available, defaulting to 'manager'
  const savedIntent = (sessionStorage.getItem('aws_onboarding_role_intent') as RoleSelection) || 'manager'
  const [selectedRole, setSelectedRole] = useState<RoleSelection>(savedIntent)

  const handleContinue = () => {
    // IMPORTANT: This selection is onboarding intent ONLY.
    // It strictly dictates onboarding navigation towards creation or joining.
    // Final authorization must come from database state.
    sessionStorage.setItem('aws_onboarding_role_intent', selectedRole)
    navigate('/auth/setup-profile')
  }

  return (
    <div className="min-h-screen w-full bg-[#080A0F] text-slate-100 font-sans relative overflow-x-hidden selection:bg-[#FF9900]/20 selection:text-[#FF9900] flex flex-col justify-between">
      {/* Background Technical Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Header at Top */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-[#0A0E17]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AWSLogo size="xs" variant="inverted" />
          <span className="font-mono font-bold text-sm tracking-tight text-white truncate">
            Community Manager
          </span>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Step 2 of 4: Role Selection
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-xl mx-auto w-full">
        {/* Progress Indicator */}
        <div className="w-full mb-6">
          <AuthProgressIndicator currentStep={2} steps={ONBOARDING_STEPS} />
        </div>

        <div className="w-full bg-[#0D121D] rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Heading & Subtitle */}
          <div className="text-center space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF9900] font-bold">
              ONBOARDING INTENT
            </span>
            <h1 className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight">
              Select Your Community Role
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-md mx-auto leading-relaxed">
              Choose your primary role. This determines whether you will register a new chapter or join an existing campus workspace.
            </p>
          </div>

          {/* Two Selectable Cards */}
          <div className="space-y-3.5">
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
              className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 focus:outline-none focus:ring-1 focus:ring-[#FF9900] ${
                selectedRole === 'manager'
                  ? 'border-[#FF9900] bg-orange-500/10 shadow-xs'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  selectedRole === 'manager'
                    ? 'bg-[#FF9900] text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Users size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                    COMMUNITY MANAGER
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      selectedRole === 'manager'
                        ? 'border-[#FF9900] bg-transparent'
                        : 'border-slate-700 bg-transparent'
                    }`}
                  >
                    {selectedRole === 'manager' && (
                      <div className="w-2 h-2 rounded-full bg-[#FF9900]" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-1 font-sans leading-relaxed">
                  Create and manage an AWS Student Builder community.
                </p>
                <span className="text-[10px] font-mono text-[#FF9900] mt-1 block">
                  Lead chapter • Verify milestones • Host live sessions
                </span>
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
              className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 focus:outline-none focus:ring-1 focus:ring-[#FF9900] ${
                selectedRole === 'member'
                  ? 'border-[#FF9900] bg-orange-500/10 shadow-xs'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  selectedRole === 'member'
                    ? 'bg-[#FF9900] text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <GraduationCap size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                    COMMUNITY MEMBER
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      selectedRole === 'member'
                        ? 'border-[#FF9900] bg-transparent'
                        : 'border-slate-700 bg-transparent'
                    }`}
                  >
                    {selectedRole === 'member' && (
                      <div className="w-2 h-2 rounded-full bg-[#FF9900]" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-1 font-sans leading-relaxed">
                  Join an existing community and participate.
                </p>
                <span className="text-[10px] font-mono text-emerald-400 mt-1 block">
                  Complete tasks • Deploy projects • Earn verified XP
                </span>
              </div>
            </div>
          </div>

          {/* Security / Authorization Callout */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5 text-slate-400 text-xs font-mono">
            <ShieldCheck size={16} className="text-[#FF9900] shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-bold text-slate-300 block mb-0.5">Authorization Notice</span>
              The selected role represents onboarding intent. Final authorization and privileges are strictly verified and enforced by the database.
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={handleContinue}
            className="w-full py-3 px-4 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>CONTINUE TO PROFILE SETUP</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500 font-mono">
        AWS Community Manager • Enterprise Security Architecture
      </footer>
    </div>
  )
}

export default CommunityDecision
