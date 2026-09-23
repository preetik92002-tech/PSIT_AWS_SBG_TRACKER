import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { AWSLogo } from '@/components/ui/AWSLogo'

interface AuthLayoutProps {
  children: React.ReactNode
  tagline?: string
  maxWidthClass?: string
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  tagline = 'Manage your AWS community. Track progress. Build together.',
  maxWidthClass = 'max-w-xl',
}) => {
  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-[#F8FAFC] text-slate-800 font-sans relative overflow-x-hidden selection:bg-amber-100 selection:text-amber-900">
      {/* Subtle India Architectural Line-Art & Grid Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle geometric dot grid */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient warm gradient glows */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-100/40 via-orange-50/20 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-0 w-[500px] h-[300px] bg-gradient-to-t from-sky-100/30 to-transparent blur-3xl pointer-events-none" />

        {/* India Architectural Line-Art Watermark (India Gate & Heritage silhouettes) */}
        <div className="absolute bottom-0 inset-x-0 h-44 opacity-[0.14] flex justify-center items-end text-slate-600 select-none">
          <svg
            className="w-full max-w-6xl h-40"
            viewBox="0 0 1200 240"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Ground Horizon */}
            <line x1="0" y1="230" x2="1200" y2="230" strokeWidth="1.5" />

            {/* Left Landmark - Qutub Minar Tower Silhouette */}
            {/* Base Tier */}
            <polygon points="170,230 180,175 220,175 230,230" fill="currentColor" fillOpacity="0.05" />
            <line x1="175" y1="175" x2="225" y2="175" strokeWidth="2" />
            {/* Balcony 1 brackets */}
            <line x1="175" y1="178" x2="225" y2="178" strokeDasharray="2 2" />
            {/* Tier 2 */}
            <polygon points="182,175 189,125 211,125 218,175" fill="currentColor" fillOpacity="0.07" />
            <line x1="187" y1="125" x2="213" y2="125" strokeWidth="2" />
            {/* Tier 3 */}
            <polygon points="190,125 195,80 205,80 210,125" fill="currentColor" fillOpacity="0.09" />
            <line x1="194" y1="80" x2="206" y2="80" strokeWidth="1.5" />
            {/* Top Tier & Cupola */}
            <polygon points="196,80 198,45 202,45 204,80" fill="currentColor" fillOpacity="0.12" />
            <path d="M 197 45 Q 200 35 203 45 Z" fill="currentColor" />
            <line x1="200" y1="35" x2="200" y2="25" strokeWidth="1.5" />
            <circle cx="200" cy="24" r="2" fill="currentColor" />
            {/* Fluting lines on Qutub Minar */}
            <line x1="190" y1="230" x2="197" y2="175" strokeDasharray="4 2" />
            <line x1="210" y1="230" x2="203" y2="175" strokeDasharray="4 2" />

            {/* Central Landmark - Grand India Gate Monument Silhouette */}
            <rect x="520" y="70" width="160" height="160" rx="3" fill="none" />
            {/* Top Attic & Cornice */}
            <rect x="510" y="55" width="180" height="16" rx="2" fill="currentColor" fillOpacity="0.06" />
            <rect x="528" y="42" width="144" height="14" rx="1" />
            <rect x="548" y="30" width="104" height="12" rx="1" fill="currentColor" fillOpacity="0.1" />
            {/* Main Archway */}
            <path
              d="M 565 230 L 565 140 Q 600 100 635 140 L 635 230"
              fill="currentColor"
              fillOpacity="0.04"
            />
            {/* Pillar Details */}
            <line x1="535" y1="70" x2="535" y2="230" />
            <line x1="665" y1="70" x2="665" y2="230" />
            <line x1="520" y1="120" x2="680" y2="120" strokeDasharray="3 3" />

            {/* Lotus Motif in Central Arch Top */}
            <path d="M 600 115 C 596 105 590 108 590 115 C 590 120 600 125 600 125 C 600 125 610 120 610 115 C 610 108 604 105 600 115 Z" fill="currentColor" fillOpacity="0.2" />

            {/* Right Heritage Minaret & Dome silhouette */}
            <path d="M 1020 230 L 1025 150 L 1055 150 L 1060 230" />
            <path d="M 1020 150 Q 1040 120 1060 150 Z" fill="currentColor" fillOpacity="0.08" />
            <path d="M 1040 120 L 1040 108" />
            <circle cx="1040" cy="106" r="2" fill="currentColor" />

            {/* Subtle Geometric Line-Art Accents (Mandala / Sun Rays) */}
            <circle cx="600" cy="30" r="18" strokeDasharray="2 3" opacity="0.6" />
            <circle cx="600" cy="30" r="30" strokeDasharray="4 4" opacity="0.4" />
            <path d="M 570 30 L 550 30 M 630 30 L 650 30 M 600 0 L 600 10" strokeDasharray="2 2" opacity="0.5" />

            {/* Distant trees and hills */}
            <path d="M 280 230 Q 300 200 320 230" />
            <path d="M 330 230 Q 355 210 380 230" />
            <path d="M 820 230 Q 840 205 860 230" />
            <path d="M 880 230 Q 900 215 920 230" />
          </svg>
        </div>
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <AWSLogo size="sm" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF9900] leading-tight">
                Amazon Web Services
              </span>
              <span className="text-base font-bold text-[#0F172A] tracking-tight group-hover:text-[#FF9900] transition-colors leading-snug">
                AWS Journey Tracker
              </span>
            </div>
          </Link>

          {/* Right Supporting Text */}
          <div className="hidden md:flex items-center text-xs font-medium text-slate-500 max-w-sm text-right leading-relaxed">
            {tagline}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className={`w-full ${maxWidthClass} transition-all duration-300`}>
          {children}
        </div>
      </main>

      {/* Consistent Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 bg-white/60 backdrop-blur-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-normal">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Enterprise-grade secure platform · Built for Indian Student Builders</span>
          </div>
          <div>
            <span>AWS Journey Tracker © {new Date().getFullYear()} · All rights reserved</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
