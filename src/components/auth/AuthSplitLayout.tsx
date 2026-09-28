import React from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Building2,
  BookOpen,
  Code2,
  GitPullRequest,
  Video,
  Trophy,
  Globe2,
  CheckCircle2,
  Terminal,
  ShieldCheck,
} from 'lucide-react'
import { AWSLogo } from '@/components/ui/AWSLogo'

interface AuthSplitLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  currentMode: 'login' | 'signup'
}

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({
  children,
  title,
  subtitle,
  currentMode,
}) => {
  return (
    <div className="min-h-screen w-full bg-[#080A0F] text-slate-100 font-sans relative overflow-x-hidden selection:bg-[#FF9900]/20 selection:text-[#FF9900] flex flex-col justify-between">
      {/* Background Technical Coordinate Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top Header */}
      <header className="relative z-20 w-full border-b border-slate-800/80 bg-[#0A0E17]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <AWSLogo size="xs" variant="inverted" />
          <span className="font-mono font-bold text-sm tracking-tight text-white flex items-center gap-2">
            <span>Community Manager</span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-[#FF9900] border border-orange-500/30 font-semibold">
              BUILDER CENTER
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3 font-mono text-xs">
          {currentMode === 'login' ? (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="hidden sm:inline">New to Community Manager?</span>
              <Link
                to="/signup"
                className="px-3 py-1.5 rounded-lg bg-[#FF9900] text-slate-950 font-bold hover:bg-[#EC7211] transition-colors"
              >
                Create Account
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="hidden sm:inline">Already have an account?</span>
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Centered Panel (Split Layout on Desktop, Stacked on Mobile) */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-[#0D121D] border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 backdrop-blur-sm">
          {/* ============================================================== */}
          {/* LEFT: PRODUCT STORY (Visible on Desktop, Compact on Mobile)   */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 bg-[#0A0E17]/95 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono font-bold text-[#FF9900]">
                <Terminal size={12} />
                <span>AWS BUILDER ECOSYSTEM</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-mono font-extrabold tracking-tight text-white leading-tight uppercase">
                BUILD. LEARN. GROW. <span className="text-[#FF9900]">TOGETHER.</span>
              </h2>

              <p className="text-xs sm:text-sm font-mono text-slate-300 font-semibold leading-relaxed">
                Track what you learn. Track what you build. Track how you contribute. See how you grow.
              </p>

              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Join verified AWS student builder chapters across campuses. Deploy hands-on cloud architectures, collaborate in live labs, and earn recognized AWS Builder Center credentials.
              </p>
            </div>

            {/* 8-Stage Builder Lifecycle Roadmap */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                The Builder Journey
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#FF9900] shrink-0" />
                  <span>01. Create Profile</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#FF9900] shrink-0" />
                  <span>02. Join Community</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#FF9900] shrink-0" />
                  <span>03. Learn Roadmap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#FF9900] shrink-0" />
                  <span>04. Build Projects</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#FF9900] shrink-0" />
                  <span>05. Peer Mentorship</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#FF9900] shrink-0" />
                  <span>06. Community Live</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#FF9900] shrink-0" />
                  <span>07. Track Growth</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#FF9900] shrink-0" />
                  <span>08. Builder World</span>
                </div>
              </div>
            </div>

            {/* Bottom Security / Telemetry Badge */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Verified Supabase Auth</span>
              </div>
              <span className="text-emerald-400 font-semibold">Protected</span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT: AUTHENTICATION FORM                                     */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-5">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full border-t border-slate-900 bg-[#060810] px-4 py-4 text-center text-[11px] font-mono text-slate-500">
        <span>AWS Community Manager • Built for AWS Student Builder Community Chapters</span>
      </footer>
    </div>
  )
}
