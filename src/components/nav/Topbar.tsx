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
  CheckSquare,
  Calendar,
  FolderGit2,
  Video,
  Award,
  Clock,
} from 'lucide-react'
import { BuilderAvatar } from '@/components/ui/BuilderAvatar'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { AWSLogo } from '@/components/ui/AWSLogo'
import { CommunitySelector } from '@/components/nav/CommunitySelector'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'
import {
  getUnreadNotificationCount,
  listUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notifications'
import type { AppNotification } from '@/types/database'
import { timeAgo } from '@/utils/cn'
import { GlobalSearchModal } from '@/components/nav/GlobalSearchModal'

const ROUTE_INFO: Record<string, { label: string; group: string }> = {
  '/dashboard': { label: 'Dashboard', group: 'Community' },
  '/members': { label: 'Members', group: 'Community' },
  '/builder-world': { label: 'Builder World', group: 'Community' },
  '/tasks': { label: 'Tasks', group: 'Community' },
  '/tasks/assign': { label: 'Assign Task', group: 'Community' },
  '/leaderboard': { label: 'Leaderboard', group: 'Community' },
  '/events': { label: 'Events', group: 'Community' },
  '/events/new': { label: 'Add Event', group: 'Community' },
  '/projects': { label: 'Projects', group: 'Community' },
  '/community': { label: 'Community', group: 'Community' },
  '/community/settings': { label: 'Community Settings', group: 'Admin' },
  '/audit-log': { label: 'Audit Trail', group: 'Admin' },
  '/analytics': { label: 'Analytics', group: 'Community' },
  '/notifications': { label: 'Notifications', group: 'Community' },
  '/profile': { label: 'Profile', group: 'Member' },
  '/admin/dashboard': { label: 'Admin Dashboard', group: 'Admin' },
  '/admin/members': { label: 'Community Members', group: 'Admin' },
  '/login': { label: 'Sign In', group: 'Auth' },
  '/signup': { label: 'Sign Up', group: 'Auth' },
  '/forgot-password': { label: 'Password Recovery', group: 'Auth' },
  '/reset-password': { label: 'Set Password', group: 'Auth' },
}

export interface TopbarProps {
  onOpenMobileNav?: () => void
  onOpenSearch?: () => void
  className?: string
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileNav,
  onOpenSearch,
  className = '',
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, role, signOut } = useAuth()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Notifications state
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [notifTab, setNotifTab] = useState<'unread' | 'recent'>('unread')
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const refreshNotifications = async () => {
    if (!user) return
    try {
      const [count, list] = await Promise.all([
        getUnreadNotificationCount(),
        listUserNotifications(20),
      ])
      setUnreadCount(count)
      setNotifications(list)
    } catch {
      // Ignore background refresh errors
    }
  }

  useEffect(() => {
    if (user) {
      refreshNotifications()
      const timer = setInterval(refreshNotifications, 30000)
      return () => clearInterval(timer)
    }
  }, [user])

  useEffect(() => {
    if (notificationsOpen) {
      refreshNotifications()
    }
  }, [notificationsOpen])

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true)
    try {
      await markAllNotificationsAsRead()
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } finally {
      setIsMarkingAll(false)
    }
  }

  const handleClickNotification = async (n: AppNotification) => {
    if (!n.is_read) {
      await markNotificationAsRead(n.id)
      setUnreadCount((prev) => Math.max(0, prev - 1))
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      )
    }
    setNotificationsOpen(false)

    // Navigate to appropriate target entity
    if (n.entity_type === 'task') {
      navigate('/tasks')
    } else if (n.entity_type === 'event') {
      navigate(n.entity_id ? `/events/${n.entity_id}` : '/events')
    } else if (n.entity_type === 'project') {
      navigate('/projects')
    } else if (n.entity_type === 'contribution') {
      navigate('/projects?tab=contributions')
    } else {
      navigate('/notifications')
    }
  }

  const unreadList = notifications.filter((n) => !n.is_read)
  const displayNotifs = notifTab === 'unread' ? unreadList : notifications

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

  const handleOpenSearch = () => {
    if (onOpenSearch) {
      onOpenSearch()
    } else {
      setSearchModalOpen(true)
    }
  }

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        handleOpenSearch()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpenSearch])

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
      className={`h-14 border-b border-[#1E2736] bg-[#0D121B]/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-20 flex-shrink-0 text-slate-100 shadow-sm gap-2 ${className}`}
    >
      {/* Left side: Mobile Toggle + AWS Brand + Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-md bg-[#161E29] hover:bg-[#1F293A] text-slate-300 border border-[#232F40] transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Open mobile navigation"
        >
          <Menu size={16} />
        </button>

        {/* Mobile & Desktop Brand Display */}
        <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0 group">
          <AWSLogo size="xs" variant="inverted" />
          <span className="font-mono font-bold text-xs tracking-tight text-white group-hover:text-[#FF9900] transition-colors hidden xs:inline sm:hidden">
            Journey Tracker
          </span>
        </Link>

        {/* Desktop Breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 font-mono text-xs text-slate-400 min-w-0 pl-1 border-l border-[#1E2736]">
          <span className="text-slate-400">{info.group}</span>
          <ChevronRight size={11} className="text-slate-500 flex-shrink-0" />
          <span className="text-slate-100 font-semibold truncate">{info.label}</span>
        </div>
      </div>

      {/* Center: Community Selector */}
      <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial justify-center md:justify-start">
        <CommunitySelector />
      </div>

      {/* Right side: Share Community, Search, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Share Community Button */}
        {activeCommunity && (
          <button
            type="button"
            onClick={handleShareCommunity}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#FF9900] bg-[#FF9900]/10 hover:bg-[#FF9900]/20 border border-[#FF9900]/30 transition-all cursor-pointer shadow-xs"
            title="Share community invite link"
          >
            {copiedShare ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-300 font-medium">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={13} />
                <span>Share Community</span>
              </>
            )}
          </button>
        )}

        {/* Global Search Trigger (Desktop) */}
        <button
          type="button"
          onClick={handleOpenSearch}
          className="hidden md:inline-flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg bg-[#131923] hover:bg-[#161F2C] border border-[#222E3E] hover:border-[#FF9900]/50 text-slate-400 hover:text-slate-200 transition-all font-mono cursor-pointer shadow-xs group w-36 lg:w-48 justify-between"
          title="Search community resources (⌘K or Ctrl+K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search size={13} className="text-slate-500 group-hover:text-[#FF9900] transition-colors" />
            <span className="truncate">Search...</span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-[#0B0F17] rounded border border-[#222E3E]">
            <span className="text-[9px]">⌘</span>K
          </kbd>
        </button>

        {/* Global Search Trigger (Mobile) */}
        <button
          type="button"
          onClick={handleOpenSearch}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#161E29] border border-transparent hover:border-[#232F40] transition-colors cursor-pointer"
          title="Search community resources"
        >
          <Search size={16} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#161E29] border border-transparent hover:border-[#232F40] transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#FF9900] text-slate-950 text-[10px] font-mono font-bold rounded-full min-w-[16px] text-center shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-600" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#232F40] bg-[#121824] shadow-2xl py-2 z-50 animate-slide-up font-mono">
              {/* Header with Title and Mark All as Read */}
              <div className="px-4 py-2.5 border-b border-[#1E2736] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-slate-200 font-bold">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 font-bold">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAll || unreadCount === 0}
                  className="text-[11px] text-[#FF9900] hover:text-[#EC7211] hover:underline disabled:opacity-40 disabled:no-underline font-semibold cursor-pointer"
                >
                  {isMarkingAll ? 'Marking...' : 'MARK ALL AS READ'}
                </button>
              </div>

              {/* Tabs: Unread vs Recent */}
              <div className="px-4 pt-2 pb-1 flex items-center gap-2 border-b border-[#1E2736]/60 text-xs">
                <button
                  type="button"
                  onClick={() => setNotifTab('unread')}
                  className={`pb-1.5 border-b-2 transition-colors cursor-pointer ${
                    notifTab === 'unread'
                      ? 'border-[#FF9900] text-[#FF9900] font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Unread ({unreadList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifTab('recent')}
                  className={`pb-1.5 border-b-2 transition-colors cursor-pointer ${
                    notifTab === 'recent'
                      ? 'border-[#FF9900] text-[#FF9900] font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Recent ({notifications.length})
                </button>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#1E2736]/60">
                {displayNotifs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    {notifTab === 'unread' ? 'All caught up! No unread notifications.' : 'No recent notifications.'}
                  </div>
                ) : (
                  displayNotifs.map((n) => {
                    let Icon = Bell
                    if (n.type === 'task') Icon = CheckSquare
                    else if (n.type === 'event') Icon = Calendar
                    else if (n.type === 'project') Icon = FolderGit2
                    else if (n.type === 'contribution') Icon = Sparkles
                    else if (n.type === 'live') Icon = Video

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleClickNotification(n)}
                        className={`p-3 text-left transition-colors cursor-pointer flex items-start gap-2.5 hover:bg-[#18202E] ${
                          !n.is_read ? 'bg-[#FF9900]/5' : ''
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          !n.is_read ? 'bg-[#FF9900]/20 text-[#FF9900]' : 'bg-[#18202E] text-slate-400'
                        }`}>
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-xs truncate ${!n.is_read ? 'text-white font-bold' : 'text-slate-300 font-medium'}`}>
                              {n.title}
                            </span>
                            {!n.is_read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                            {n.message}
                          </p>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                            <Clock size={10} />
                            <span>{timeAgo(n.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Bottom Footer */}
              <div className="pt-2 pb-1 px-4 border-t border-[#1E2736] text-center">
                <Link
                  to="/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs text-[#FF9900] hover:text-[#EC7211] hover:underline"
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 rounded-md hover:bg-[#161E29] border border-transparent hover:border-[#232F40] transition-colors group cursor-pointer"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <BuilderAvatar
              name={displayName}
              src={profile?.avatar_url}
              isManager={userRoleInActiveCommunity === 'manager'}
              size="sm"
            />
            <div className="hidden lg:block text-left max-w-[140px]">
              <span className="block text-xs font-mono font-medium text-slate-200 truncate group-hover:text-[#FF9900] transition-colors">
                {displayName}
              </span>
              <span className="block text-[10px] font-mono text-slate-400 truncate flex items-center gap-1">
                {userRoleInActiveCommunity === 'manager' ? '👑 Manager' : 'Community Member'}
              </span>
            </div>
            <ChevronDown size={12} className="text-slate-400 group-hover:text-slate-200 transition-colors" />
          </button>

          {/* Dropdown Popover */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#232F40] bg-[#131924] shadow-2xl py-2 z-50 animate-slide-up">
              {/* User Identity Header */}
              <div className="px-4 py-2.5 border-b border-[#1E2736]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-white truncate block">
                    {displayName}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                      userRoleInActiveCommunity === 'manager'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {userRoleInActiveCommunity === 'manager' ? 'Manager' : 'Member'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 truncate block">
                  {displayEmail}
                </span>
              </div>

              {/* Actions */}
              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-slate-300 hover:text-white hover:bg-[#1A2332] transition-colors"
                >
                  <User size={13} className="text-slate-400" />
                  <span>Profile Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                >
                  <LogOut size={13} className="text-rose-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fallback search modal if not controlled by parent layout */}
      {!onOpenSearch && (
        <GlobalSearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
        />
      )}
    </header>
  )
}
