import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Terminal, Lock, Mail, ArrowRight, ShieldCheck, Info } from 'lucide-react'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('preeti@builder.hub')
  const [password, setPassword] = useState('••••••••••••')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Frontend-only shell: redirect to dashboard
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center px-4 bg-[#080B11] text-slate-100 font-sans relative overflow-hidden">
      {/* Background ambient grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(rgba(249, 115, 22, 0.15) 1px, transparent 1px), radial-gradient(rgba(124, 58, 237, 0.1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px',
        }}
      />

      <div className="relative w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Terminal size={24} />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100">
            AWS BUILDER HUB
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Community platform for builders, developers & architects
          </p>
        </div>

        {/* Foundation Notice */}
        <div className="mb-6 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono flex items-start gap-2.5">
          <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold block">Level 1 Frontend Shell</span>
            Authentication protection is disconnected. Click &quot;Enter Dashboard&quot; below to preview the platform UI.
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold font-mono text-slate-200">
              Sign in to your account
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your AWS Builder credentials
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-md bg-slate-950 border border-slate-750 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <span className="text-[11px] font-mono text-slate-400 cursor-not-allowed">
                  Forgot? (Level 2)
                </span>
              </div>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-md bg-slate-950 border border-slate-750 text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-mono font-medium text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors shadow-sm cursor-pointer"
            >
              <span>Enter Dashboard</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-mono">
              Don&apos;t have an account?{' '}
              <span className="text-amber-400/80 cursor-not-allowed">
                Registration unlocks in Level 2
              </span>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs font-mono text-slate-400">
          <span>AWS Builder Hub · Secure Builder Portal</span>
        </div>
      </div>
    </div>
  )
}
