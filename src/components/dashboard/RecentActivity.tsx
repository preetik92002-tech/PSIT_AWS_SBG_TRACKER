import React from 'react'
import { motion } from 'framer-motion'
import { Rocket, BookOpen, Trophy, Flame, Code2 } from 'lucide-react'
import type { ActivityItem } from '@/types'
import { Avatar, Badge } from '@/components/ui'
import { timeAgo } from '@/utils/cn'

interface RecentActivityProps {
  items: ActivityItem[]
  limit?: number
}

const TYPE_CONFIG = {
  learning:    { icon: BookOpen, color: 'var(--accent-bright)',     bg: 'var(--accent-dim)',              label: 'learned'   },
  project:     { icon: Code2,    color: 'var(--info)',              bg: 'rgba(59,130,246,0.15)',          label: 'built'     },
  achievement: { icon: Trophy,   color: 'var(--warning)',           bg: 'var(--warning-dim)',             label: 'earned'    },
  streak:      { icon: Flame,    color: 'var(--accent-secondary)',  bg: 'var(--accent-secondary-dim)',   label: 'streak'    },
  deployment:  { icon: Rocket,   color: 'var(--success)',           bg: 'var(--success-dim)',             label: 'deployed'  },
}

const XP_BADGE_COLOR: Record<string, string> = {
  learning:    'accent',
  project:     'info',
  achievement: 'warning',
  streak:      'orange',
  deployment:  'success',
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ items, limit = 8 }) => {
  const visible = items.slice(0, limit)

  return (
    <div>
      {visible.map((item, i) => {
        const cfg = TYPE_CONFIG[item.type]
        const Icon = cfg.icon
        const badgeVariant = XP_BADGE_COLOR[item.type] as Parameters<typeof Badge>[0]['variant']

        return (
          <motion.div
            key={item.id}
            className="activity-item"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
          >
            {/* Avatar */}
            <Avatar
              initials={item.memberName.slice(0, 2).toUpperCase()}
              size="sm"
              className="flex-shrink-0 mt-0.5"
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-mono font-semibold text-[11px] text-text-primary">
                  {item.memberName}
                </span>
                <span className="font-mono text-[10px] text-text-secondary">
                  {item.action}
                </span>
              </div>
              {item.detail && (
                <p className="font-mono text-[9px] text-text-muted mt-0.5 truncate-1">
                  {item.detail}
                </p>
              )}
              <span className="font-mono text-[9px] text-text-muted mt-0.5 block">
                {timeAgo(item.timestamp)}
              </span>
            </div>

            {/* Type icon + XP */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <div
                className="w-6 h-6 flex items-center justify-center"
                style={{ background: cfg.bg }}
              >
                <Icon size={11} style={{ color: cfg.color }} />
              </div>
              <Badge variant={badgeVariant} size="sm">
                +{item.xpGained} XP
              </Badge>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
