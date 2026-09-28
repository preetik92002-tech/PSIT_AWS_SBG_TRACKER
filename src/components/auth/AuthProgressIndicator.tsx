import React from 'react'
import { Check } from 'lucide-react'

export interface ProgressStep {
  id: number
  label: string
}

interface AuthProgressIndicatorProps {
  currentStep: number // 1-indexed
  steps?: ProgressStep[]
}

const DEFAULT_STEPS: ProgressStep[] = [
  { id: 1, label: 'Email' },
  { id: 2, label: 'Verification' },
  { id: 3, label: 'Profile' },
  { id: 4, label: 'Community' },
]

export const AuthProgressIndicator: React.FC<AuthProgressIndicatorProps> = ({
  currentStep,
  steps = DEFAULT_STEPS,
}) => {
  return (
    <div className="w-full mb-8 select-none">
      <div className="flex items-center justify-between relative">
        {/* Continuous background track line */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-[#1F293A] z-0" />

        {/* Completed active progress fill */}
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-[#FF9900] transition-all duration-500 z-0"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step) => {
          const isCompleted = step.id < currentStep
          const isCurrent = step.id === currentStep

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center group"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[#FF9900] text-slate-950 shadow-sm ring-4 ring-[#FF9900]/20'
                    : isCurrent
                    ? 'bg-[#0E141F] border-2 border-[#FF9900] text-[#FF9900] shadow-md ring-4 ring-[#FF9900]/20'
                    : 'bg-[#0E141F] border-2 border-[#1F293A] text-slate-500'
                }`}
              >
                {isCompleted ? <Check size={14} strokeWidth={3} /> : step.id}
              </div>
              <span
                className={`mt-1.5 text-[11px] tracking-tight whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'text-[#FF9900] font-bold'
                    : isCompleted
                    ? 'text-slate-300 font-medium'
                    : 'text-slate-500 font-normal'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
