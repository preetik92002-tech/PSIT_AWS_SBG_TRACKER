import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  PlusCircle,
  KeyRound,
  ArrowRight,
  Check,
  Sparkles,
} from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthProgressIndicator } from '@/components/auth/AuthProgressIndicator'

type CommunityPath = 'create' | 'join'

export const CommunityDecision: React.FC = () => {
  const navigate = useNavigate()
  const [selectedPath, setSelectedPath] = useState<CommunityPath>('create')

  const handleContinue = () => {
    if (selectedPath === 'create') {
      navigate('/auth/create-community')
    } else {
      navigate('/auth/join-community')
    }
  }

  return (
    <AuthLayout maxWidthClass="max-w-xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-9 relative">
        {/* Progress Indicator (Step 4: Community) */}
        <AuthProgressIndicator currentStep={4} />

        {/* Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold mb-3">
            <Sparkles size={12} className="text-[#FF9900]" />
            <span>Community Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
            How do you want to continue?
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
            Choose whether to start your own AWS Student Builder community or join an existing campus chapter.
          </p>
        </div>

        {/* Path Decision Options */}
        <div className="space-y-4 mb-8">
          {/* Option 1: Create a community */}
          <div
            onClick={() => setSelectedPath('create')}
            className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 flex items-start gap-4 ${
              selectedPath === 'create'
                ? 'border-[#FF9900] bg-amber-50/40 shadow-sm ring-2 ring-amber-500/10'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                selectedPath === 'create'
                  ? 'bg-[#FF9900] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <PlusCircle size={22} />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">
                  Create a community
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Start and manage your own AWS Student Builder community.
              </p>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 mt-0.5 ${
                selectedPath === 'create'
                  ? 'border-[#FF9900] bg-[#FF9900] text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {selectedPath === 'create' && <Check size={12} strokeWidth={3} />}
            </div>
          </div>

          {/* Option 2: Join a community */}
          <div
            onClick={() => setSelectedPath('join')}
            className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 flex items-start gap-4 ${
              selectedPath === 'join'
                ? 'border-[#FF9900] bg-amber-50/40 shadow-sm ring-2 ring-amber-500/10'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                selectedPath === 'join'
                  ? 'bg-[#FF9900] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <KeyRound size={22} />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">
                  Join a community
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Join an existing AWS Student Builder community using an invite code.
              </p>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 mt-0.5 ${
                selectedPath === 'join'
                  ? 'border-[#FF9900] bg-[#FF9900] text-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {selectedPath === 'join' && <Check size={12} strokeWidth={3} />}
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          type="button"
          onClick={handleContinue}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] active:bg-[#D9650B] shadow-md shadow-amber-500/20 transition-all cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </AuthLayout>
  )
}
