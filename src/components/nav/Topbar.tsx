import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  ChevronRight,
  User,
  LogOut,
  ChevronDown,
  Share2,
  Search,
  Bell,
  Check,
  Sparkles,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { CommunitySelector } from '@/components/nav/CommunitySelector'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'

const ROUTE_INFO: Record<string, { label: string; group: string }> = {
  '/dashboard': { label: 'Dashboard', group: 'Community' },
  '/profile': { label: 'Profile', group: 'Member' },
  '/admin/dashboard': { label: 'Admin Dashboard', group: 'Admin' },
  '/admin/members': { label: 'Community Members', group: 'Admin' },
  '/login': { label: 'Sign In', group: 'Auth' },
  '/forgot-password': { label: 'Password Recovery', group: 'Auth' },
  '/reset-password': { label: 'Set Password', group: 'Auth' },
}

export interface TopbarProps {
  onOpenMobileNav?: () => void
  className?: string
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileNav, className = '' }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, role, signOut } = useAuth()
  const { activeCommunity } = useCommunity()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const info = ROUTE_INFO[location.pathname] ?? {
    label: location.pathname.replace('/', ''),
    group: 'App',
  }

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setDropdownOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  const handleShareCommunity = async () => {
    if (!activeCommunity) return
    try {
      // Fetch code for active community
      const { data } = await supabase
        .from('community_codes')
        .select('code')
        .eq('community_id', activeCommunity.id)
        .eq('is_active', true)
        .maybeSingle()

      const code = data?.code || activeCommunity.short_name
      const inviteUrl = `${window.location.origin}/auth/join-community?code=${code}`

      if (navigator.share) {
        navigator.share({
          title: `Join ${activeCommunity.name}`,
          text: `Join ${activeCommunity.name} on AWS Journey Tracker with code: ${code}`,
          url: inviteUrl,
        }).catch(() => {
          navigator.clipboard.writeText(inviteUrl)
          setCopiedShare(true)
          setTimeout(() => setCopiedShare(false), 2000)
        })
      } else {
        await navigator.clipboard.writeText(inviteUrl)
        setCopiedShare(true)
        setTimeout(() => setCopiedShare(false), 2000)
      }
    } catch {
      setCopiedShare(false)
    }
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Builder'
  const displayEmail = profile?.email || user?.email || 'authenticated@builder.hub'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AB'

  return (
    <header
      className={`h-14 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 flex items-center justify-between z-20 flex-shrink-0 text-slate-800 shadow-xs ${className}`}
    >
      {/* Left side: Mobile Toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          aria-label="Open mobile navigation"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500 min-w-0">
          <span className="hidden sm:inline-block text-slate-500">
            {info.group}
          </span>
          <ChevronRight size={11} className="hidden sm:inline-block text-slate-400 flex-shrink-0" />
          <span className="text-slate-900 font-semibold truncate">
            {info.label}
          </span>
        </div>
      </div>

      {/* Center: Community Selector */}
      <div className="flex items-center gap-2">
        <CommunitySelector />
      </div>

      {/* Right side: Share Community, Search, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Share Community Button */}
        {activeCommunity && (
          <button
            type="button"
            onClick={handleShareCommunity}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#EA580C] bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer shadow-xs"
            title="Share community invite link"
          >
            {copiedShare ? (
              <>
                <Check size={13} className="text-emerald-600" />
                <span className="text-emerald-700 font-medium">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={13} />
                <span>Share Community</span>
              </>
            )}
          </button>
        )}

        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-7 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:bg-white w-28 lg:w-36 transition-all font-mono"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-slide-up">
              <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-700 font-semibold">
                  Notifications
                </span>
                <span className="text-[10px] font-mono text-[#EA580C] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                  Live
                </span>
              </div>
              <div className="p-3 text-center text-xs text-slate-500">
                All caught up! No unread notifications.
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors group cursor-pointer"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <Avatar initials={initials} size="sm" />
            <div className="hidden lg:block text-left max-w-[140px]">
              <span className="block text-xs font-mono font-medium text-slate-800 truncate group-hover:text-[#EA580C] transition-colors">
                {displayName}
              </span>
              <span className="block text-[10px] font-mono text-slate-500 capitalize truncate">
                {role === 'admin' ? 'Administrator' : 'Member'}
              </span>
            </div>
            <ChevronDown size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* Dropdown Popover */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-slide-up">
              {/* User Identity Header */}
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-slate-900 truncate block">
                    {displayName}
                  </span>
                  <RoleBadge role={role || 'member'} size="sm" />
                </div>
                <span className="text-[11px] font-mono text-slate-500 truncate block">
                  {displayEmail}
                </span>
              </div>

              {/* Actions */}
              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <User size={13} className="text-slate-500" />
                  <span>Profile Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-mono text-rose-300 hover:text-rose-200 hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                >
                  <LogOut size={13} className="text-rose-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
