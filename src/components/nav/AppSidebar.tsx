import React from 'react'
import { NavLink } from 'react-router-dom'
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
  ExternalLink,
} from 'lucide-react'
import { RoleBadge } from '@/components/ui/RoleBadge'

interface NavItem {
  label: string
  to?: string
  icon: LucideIcon
  disabled?: boolean
  badge?: string
}

const MEMBER_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Profile', to: '/profile', icon: User },
  { label: 'Tasks', icon: CheckSquare, disabled: true, badge: 'Soon' },
  { label: 'Projects', icon: FolderGit2, disabled: true, badge: 'Soon' },
  { label: 'Learning', icon: GraduationCap, disabled: true, badge: 'Soon' },
  { label: 'Contributions', icon: GitPullRequest, disabled: true, badge: 'Soon' },
  { label: 'Badges', icon: Award, disabled: true, badge: 'Soon' },
  { label: 'Leaderboard', icon: Trophy, disabled: true, badge: 'Soon' },
]

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
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
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm flex-shrink-0">
            <Terminal size={16} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-mono font-bold text-xs tracking-tight text-slate-100 block truncate group-hover:text-amber-400 transition-colors">
                AWS BUILDER HUB
              </span>
              <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">
                v0.1.0 · Foundation
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
        {/* Member Navigation */}
        <div>
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
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono text-slate-400 cursor-not-allowed opacity-60 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? `${item.label} (Coming Soon)` : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className="flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900/60 text-slate-400">
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

        {/* Admin Navigation */}
        <div className="pt-2 border-t border-slate-800/60">
          {!collapsed && (
            <div className="px-2.5 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck size={11} className="text-purple-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
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
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono text-slate-400 cursor-not-allowed opacity-60 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? `Admin: ${item.label} (Coming Soon)` : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className="flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900/60 text-slate-400">
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
      </div>

      {/* Footer Profile Snippet */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/50">
        <NavLink
          to="/profile"
          onClick={onItemClick}
          className={`flex items-center gap-2.5 p-1.5 rounded-md hover:bg-slate-850 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Preeti (Member Profile)"
        >
          <div className="w-7 h-7 rounded bg-amber-950/60 border border-amber-500/40 flex items-center justify-center font-mono text-[11px] font-bold text-amber-300 flex-shrink-0">
            PR
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium font-mono text-slate-200 truncate">
                  Preeti
                </span>
                <RoleBadge role="member" size="sm" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 block truncate">
                preeti@builder.hub
              </span>
            </div>
          )}
        </NavLink>
      </div>
    </aside>
  )
}
