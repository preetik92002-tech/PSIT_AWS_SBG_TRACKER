import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FolderGit2,
  Menu,
  Trophy,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'

export interface MobileBottomNavProps {
  onOpenDrawer: () => void
  onOpenSearch: () => void
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenDrawer,
}) => {
  const { isManagerOfActiveCommunity } = useCommunity()

  const NAV_ITEMS = [
    { label: 'Home', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Tasks', to: '/tasks', icon: CheckSquare },
    { label: 'Events', to: '/events', icon: Calendar },
    { label: 'Projects', to: '/projects', icon: FolderGit2 },
    { label: 'Ranks', to: '/leaderboard', icon: Trophy },
  ]

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B0F17]/95 backdrop-blur-lg border-t border-[#1F293A] py-1.5 px-3 flex items-center justify-around shadow-2xl font-mono">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'text-[#FF9900] font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon size={18} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </NavLink>
        )
      })}

      {/* Menu / Drawer Toggle */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Open navigation drawer"
      >
        <div className="relative">
          <Menu size={18} />
          {isManagerOfActiveCommunity && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF9900]" />
          )}
        </div>
        <span className="text-[10px] tracking-tight">More</span>
      </button>
    </div>
  )
}
