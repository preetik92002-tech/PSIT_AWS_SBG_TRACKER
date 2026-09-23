import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  Users,
  BookOpen,
  FolderOpen,
  Trophy,
  CalendarCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from 'lucide-react'
import { cn } from '@/utils/cn'

const NAV_ITEMS = [
  { to: '/',            icon: LayoutGrid,   label: 'Dashboard',     shortLabel: 'dash' },
  { to: '/builders',   icon: Users,         label: 'Builders',      shortLabel: 'builders' },
  { to: '/learning',   icon: BookOpen,      label: 'Learning',      shortLabel: 'learn' },
  { to: '/projects',   icon: FolderOpen,    label: 'Projects',      shortLabel: 'proj' },
  { to: '/achievements', icon: Trophy,      label: 'Achievements',  shortLabel: 'achiev' },
  { to: '/weekly',     icon: CalendarCheck, label: 'Weekly Update', shortLabel: 'weekly' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation()

  return (
    <motion.aside
      className="sidebar flex flex-col h-full relative z-10 flex-shrink-0"
      animate={{ width: collapsed ? 52 : 200 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      style={{ overflow: 'hidden' }}
    >
      {/* Logo area */}
      <div
        className={cn(
          'flex items-center gap-2.5 px-3 py-3.5 border-b border-[var(--border)]',
          collapsed && 'justify-center px-0'
        )}
      >
        <div className="flex-shrink-0 w-7 h-7 bg-[var(--accent-dim)] border border-[var(--accent)]/50 flex items-center justify-center">
          <Zap size={14} className="text-[var(--accent-bright)]" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
            >
              <div className="font-mono font-bold text-[11px] text-[var(--text-primary)] tracking-tight whitespace-nowrap">
                AWS SBG
              </div>
              <div className="font-mono text-[9px] text-[var(--accent-secondary)] tracking-widest uppercase whitespace-nowrap">
                Builder World
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Version label */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5">
            <Terminal size={9} className="text-[var(--text-muted)]" />
            <span className="font-mono text-[9px] text-[var(--text-muted)] tracking-wider">
              v0.1.0 · 20 members
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-hidden">
        <div className="space-y-0.5">
          {!collapsed && (
            <div className="px-4 pb-1.5">
              <span className="font-mono text-[9px] text-[var(--text-muted)] tracking-widest uppercase">
                Navigation
              </span>
            </div>
          )}
          {NAV_ITEMS.map(({ to, icon: Icon, label, shortLabel }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <NavLink key={to} to={to}>
                <div
                  className={cn(
                    'nav-item',
                    isActive && 'active',
                    collapsed && 'justify-center px-0 mx-auto w-9 border-l-0'
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon
                    size={14}
                    className={cn(
                      'nav-icon flex-shrink-0 transition-colors',
                      isActive ? 'text-[var(--accent-bright)]' : 'text-[var(--text-muted)]'
                    )}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && !collapsed && (
                    <span className="ml-auto font-mono text-[8px] text-[var(--text-muted)] opacity-60">
                      /{shortLabel}
                    </span>
                  )}
                </div>
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-2">
        {!collapsed && (
          <div className="mb-2 px-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-[var(--text-muted)]">system</span>
              <span className="flex items-center gap-1 font-mono text-[9px] text-[var(--success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse-slow" />
                online
              </span>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded',
            'font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            'transition-colors hover:bg-[var(--surface-secondary)]',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  )
}
