import React from 'react'
import { Users, Zap, FolderOpen, Flame, Activity } from 'lucide-react'
import type { Member } from '@/types'
import { formatNumber } from '@/utils/cn'

interface WorldStatsProps {
  members: Member[]
}

export const WorldStats: React.FC<WorldStatsProps> = ({ members }) => {
  const totalXp      = members.reduce((s, m) => s + m.totalXp, 0)
  const activeCount  = members.filter(m => m.weeklyXp > 0).length
  const projectCount = members.reduce((s, m) => s + m.projects.length, 0)
  const topStreak    = Math.max(...members.map(m => m.streak))

  const stats = [
    {
      label: 'Total Builders',
      value: members.length,
      icon: <Users size={16} />,
      variant: 'accent' as const,
      sub: '20 registered',
    },
    {
      label: 'Total XP Earned',
      value: formatNumber(totalXp),
      icon: <Zap size={16} />,
      variant: 'orange' as const,
      sub: `+${formatNumber(members.reduce((s, m) => s + m.weeklyXp, 0))} this week`,
    },
    {
      label: 'Active This Week',
      value: activeCount,
      icon: <Activity size={16} />,
      variant: 'success' as const,
      sub: `${Math.round((activeCount / members.length) * 100)}% of team`,
    },
    {
      label: 'Projects Running',
      value: projectCount,
      icon: <FolderOpen size={16} />,
      variant: 'info' as const,
      sub: 'across all builders',
    },
    {
      label: 'Top Streak',
      value: `${topStreak}d`,
      icon: <Flame size={16} />,
      variant: 'warning' as const,
      sub: 'longest active streak',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {stats.map(s => (
        <div key={s.label} className={`stat-card ${s.variant}`}>
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="code-label text-[9px] uppercase tracking-wider mb-1">{s.label}</p>
              <p className="font-mono font-bold text-lg leading-none text-text-primary">{s.value}</p>
              <p className="code-label text-[9px] mt-1 opacity-70">{s.sub}</p>
            </div>
            <div className="text-text-muted opacity-40 flex-shrink-0">{s.icon}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
