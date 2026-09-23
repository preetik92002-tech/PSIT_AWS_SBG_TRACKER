import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LucideIcon,
  LayoutDashboard,
  User,
  CheckSquare,
  FolderGit2,
  GraduationCap,
  GitPullRequest,
  Award,
  Trophy,
  Users,
  BarChart3,
  Terminal,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Globe,
  Box,
} from 'lucide-react'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { useAuth } from '@/context/AuthContext'

interface NavItem {
  label: string
  to?: string
  icon: LucideIcon
  disabled?: boolean
  badge?: string
}

const MEMBER_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Builder World', to: '/builder-world', icon: Globe },
  { label: 'Profile', to: '/profile', icon: User },
  { label: 'Tasks', icon: CheckSquare, disabled: true, badge: 'Soon' },
  { label: 'Projects', icon: FolderGit2, disabled: true, badge: 'Soon' },
  { label: 'Learning', icon: GraduationCap, disabled: true, badge: 'Soon' },
  { label: 'Contributions', icon: GitPullRequest, disabled: true, badge: 'Soon' },
  { label: 'Badges', icon: Award, disabled: true, badge: 'Soon' },
  { label: 'Leaderboard', icon: Trophy, disabled: true, badge: 'Soon' },
]

const ADMIN_NAV: NavItem[] = [
  { label: 'Admin Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Members', to: '/admin/members', icon: Users },
  { label: 'Tasks', icon: CheckSquare, disabled: true, badge: 'Soon' },
  { label: 'Projects', icon: FolderGit2, disabled: true, badge: 'Soon' },
  { label: 'Contributions', icon: GitPullRequest, disabled: true, badge: 'Soon' },
  { label: 'Leaderboard', icon: Trophy, disabled: true, badge: 'Soon' },
  { label: 'Analytics', icon: BarChart3, disabled: true, badge: 'Soon' },
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
  const { user, profile, role, signOut } = useAuth()
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

  const isAdmin = role === 'admin'

  return (
    <aside
      className={`relative flex flex-col h-full bg-[#0B0F17] border-r border-slate-800/80 transition-all duration-200 select-none z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 border-b border-slate-800/80 flex items-center justify-between px-3.5">
        <NavLink
          to={isAdmin ? '/admin/dashboard' : '/dashboard'}
          onClick={onItemClick}
          className="flex items-center gap-2.5 overflow-hidden group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#FF9900] flex items-center justify-center text-slate-950 shadow-sm flex-shrink-0 font-black text-xs font-mono tracking-tighter">
            AWS
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-mono font-bold text-xs tracking-tight text-white block truncate group-hover:text-[#FF9900] transition-colors">
                JOURNEY TRACKER
              </span>
              <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">
                Student Builder Guild
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

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6 scrollbar-thin">
        {/* Admin Navigation (Only visible to verified Admins) */}
        {isAdmin && (
          <div>
            {!collapsed && (
              <div className="px-2.5 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-purple-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-semibold">
                  Admin Console
                </span>
              </div>
            )}
            <nav className="space-y-0.5">
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon
                if (item.disabled || !item.to) {
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono text-slate-500 cursor-not-allowed opacity-60 ${
                        collapsed ? 'justify-center' : ''
                      }`}
                      title={collapsed ? `Admin: ${item.label} (Coming Soon)` : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={15} className="flex-shrink-0 text-slate-600" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!collapsed && item.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900/60 text-slate-500">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-purple-950/40 text-purple-300 border border-purple-800/50 font-medium'
                          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
                      }`
                    }
                    title={collapsed ? `Admin: ${item.label}` : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className="flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                  </NavLink>
                )
              })}
            </nav>
          </div>
        )}

        {/* Member Navigation */}
        <div className={isAdmin ? 'pt-2 border-t border-slate-800/60' : ''}>
          {!collapsed && (
            <div className="px-2.5 mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Member Space
              </span>
            </div>
          )}
          <nav className="space-y-0.5">
            {MEMBER_NAV.map((item) => {
              const Icon = item.icon
              if (item.disabled || !item.to) {
                return (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono text-slate-500 cursor-not-allowed opacity-60 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? `${item.label} (Coming Soon)` : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className="flex-shrink-0 text-slate-600" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900/60 text-slate-500">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
                    }`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={15} className="flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Footer Profile Snippet with Sign Out */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/50">
        <div
          className={`flex items-center gap-2.5 p-1.5 rounded-md hover:bg-slate-850/60 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <NavLink
            to="/profile"
            onClick={onItemClick}
            className="flex items-center gap-2.5 min-w-0 flex-1"
            title={`${displayName} (${role || 'member'})`}
          >
            <div className="w-7 h-7 rounded bg-amber-950/60 border border-amber-500/40 flex items-center justify-center font-mono text-[11px] font-bold text-amber-300 flex-shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium font-mono text-slate-200 truncate">
                    {displayName}
                  </span>
                  <RoleBadge role={role || 'member'} size="sm" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 block truncate">
                  {displayEmail}
                </span>
              </div>
            )}
          </NavLink>

          {!collapsed && (
            <button
              type="button"
              onClick={handleSignOut}
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
