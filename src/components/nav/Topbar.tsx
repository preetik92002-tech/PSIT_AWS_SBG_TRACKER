import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, ChevronRight, ShieldAlert, User, Terminal } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

const ROUTE_INFO: Record<string, { label: string; group: string }> = {
  '/dashboard': { label: 'Dashboard', group: 'Member' },
  '/profile': { label: 'Profile', group: 'Member' },
  '/admin/dashboard': { label: 'Admin Dashboard', group: 'Admin' },
  '/admin/members': { label: 'Community Members', group: 'Admin' },
  '/login': { label: 'Sign In', group: 'Auth' },
}

export interface TopbarProps {
  onOpenMobileNav?: () => void
  className?: string
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileNav, className = '' }) => {
  const location = useLocation()
  const info = ROUTE_INFO[location.pathname] ?? {
    label: location.pathname.replace('/', ''),
    group: 'App',
  }

  return (
    <header
      className={`h-14 border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md px-4 flex items-center justify-between z-20 flex-shrink-0 ${className}`}
    >
      {/* Left side: Mobile Toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-md bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 transition-colors"
          aria-label="Open mobile navigation"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 min-w-0">
          <span className="hidden sm:inline-block text-slate-400">
            {info.group}
          </span>
          <ChevronRight size={11} className="hidden sm:inline-block text-slate-400 flex-shrink-0" />
          <span className="text-slate-200 font-medium truncate">
            {info.label}
          </span>
        </div>
      </div>

      {/* Right side: Environment Pill + Profile Shortcut */}
      <div className="flex items-center gap-3">
        {/* Offline / Foundation Pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[10px]"
          title="Level 1 Frontend Shell - Supabase & Auth integration will be wired in Level 2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Frontend Shell · Offline</span>
        </div>

        {/* Profile Link */}
        <Link
          to="/profile"
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-800/60 border border-transparent hover:border-slate-800 transition-colors group"
        >
          <Avatar initials="PR" size="sm" />
          <div className="hidden lg:block text-left">
            <span className="block text-xs font-mono font-medium text-slate-200 group-hover:text-amber-400 transition-colors">
              Preeti
            </span>
            <span className="block text-[10px] font-mono text-slate-400">
              Member
            </span>
          </div>
        </Link>
      </div>
    </header>
  )
}
