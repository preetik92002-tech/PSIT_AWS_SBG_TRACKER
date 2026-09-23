import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LucideIcon,
  LayoutDashboard,
  User,
  CheckSquare,
  FolderGit2,
  Trophy,
  Users,
  BarChart3,
  Calendar,
  Building2,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  badge?: string
}

// 10 Core Application Navigation Items as specified:
// Dashboard, Members, Tasks, Leaderboard, Events, Projects, Analytics, Community, Notifications, Profile
const SIDEBAR_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Members', to: '/members', icon: Users },
  { label: 'Tasks', to: '/tasks', icon: CheckSquare },
  { label: 'Leaderboard', to: '/leaderboard', icon: Trophy },
  { label: 'Events', to: '/events', icon: Calendar },
  { label: 'Projects', to: '/projects', icon: FolderGit2 },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Community', to: '/community', icon: Building2 },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Profile', to: '/profile', icon: User },
]

export interface AppSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onItemClick?: () => void
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  onItemClick,
}) => {
  const { user, profile, signOut } = useAuth()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    onItemClick?.()
    await signOut()
    navigate('/login', { replace: true })
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Builder'
  const displayEmail = profile?.email || user?.email || 'builder@domain.com'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AB'

  const isManager = userRoleInActiveCommunity === 'manager'

  return (
    <aside
      className={`relative flex flex-col h-full bg-[#0B0F17] border-r border-slate-800/80 transition-all duration-200 select-none z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 border-b border-slate-800/80 flex items-center justify-between px-3.5">
        <NavLink
          to="/dashboard"
          onClick={onItemClick}
          className="flex items-center gap-2.5 overflow-hidden group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#FF9900] flex items-center justify-center text-slate-950 shadow-sm flex-shrink-0 font-black text-xs font-mono tracking-tighter">
            AWS
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-mono font-bold text-xs tracking-tight text-white block truncate group-hover:text-[#FF9900] transition-colors">
                AWS Journey Tracker
              </span>
              <span className="text-[10px] font-mono text-slate-400 block -mt-0.5 truncate">
                {activeCommunity ? activeCommunity.name : 'Community Platform'}
              </span>
            </div>
          )}
        </NavLink>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex w-6 h-6 items-center justify-center rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 scrollbar-thin">
        {!collapsed && (
          <div className="px-2.5 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Navigation
            </span>
            {isManager && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase bg-amber-500/20 text-[#FF9900] border border-amber-500/30 flex items-center gap-1">
                <ShieldCheck size={10} />
                Manager
              </span>
            )}
          </div>
        )}

        <nav className="space-y-0.5">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-mono transition-colors ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 font-medium shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon size={16} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* User Footer Card */}
      <div className="border-t border-slate-800/80 p-2.5 bg-[#080B11]/60">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar initials={initials} size="sm" />
            {!collapsed && (
              <div className="min-w-0">
                <span className="block text-xs font-mono font-medium text-slate-200 truncate leading-snug">
                  {displayName}
                </span>
                <span className="block text-[10px] font-mono text-slate-500 truncate">
                  {isManager ? 'Community Manager' : 'Community Member'}
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
