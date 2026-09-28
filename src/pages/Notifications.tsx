import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CheckSquare,
  Award,
  Sparkles,
  Check,
  FolderGit2,
  Video,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  listUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notifications'
import type { AppNotification } from '@/types/database'
import { timeAgo } from '@/utils/cn'

export const Notifications: React.FC = () => {
  const navigate = useNavigate()
  const { activeCommunity } = useCommunity()
  const { user } = useAuth()

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const fetchNotifications = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const data = await listUserNotifications(50)
      setNotifications(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [user, activeCommunity])

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true)
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } finally {
      setIsMarkingAll(false)
    }
  }

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.is_read) {
      await markNotificationAsRead(n.id)
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      )
    }

    if (n.entity_type === 'task') {
      navigate('/tasks')
    } else if (n.entity_type === 'event') {
      navigate(n.entity_id ? `/events/${n.entity_id}` : '/events')
    } else if (n.entity_type === 'project') {
      navigate('/projects')
    } else if (n.entity_type === 'contribution') {
      navigate('/projects?tab=contributions')
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.is_read : true))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Notifications"
          subtitle="Real-time event updates, challenge announcements, and cohort alerts."
          tag="Alerts"
          icon={<Bell size={20} />}
          breadcrumbs={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Notifications' },
          ]}
        />

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={fetchNotifications}
            className="p-2 rounded-lg text-slate-400 hover:text-white bg-[#18202E] border border-[#1F293A] transition-colors cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Check size={13} />
              <span>{isMarkingAll ? 'Marking...' : 'MARK ALL AS READ'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1F293A] pb-2 font-mono text-xs">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[#FF9900] text-slate-950 font-bold shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#121824] border border-[#1F293A]'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
            filter === 'unread'
              ? 'bg-[#FF9900] text-slate-950 font-bold shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#121824] border border-[#1F293A]'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-[#1F293A] bg-[#121824] text-slate-400 font-mono text-xs">
            {filter === 'unread'
              ? 'All caught up! No unread notifications.'
              : 'No notifications recorded yet.'}
          </div>
        ) : (
          filtered.map((item) => {
            let Icon = Bell
            let iconStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/25'
            if (item.type === 'task') {
              Icon = CheckSquare
              iconStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
            } else if (item.type === 'event') {
              Icon = Calendar
              iconStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/25'
            } else if (item.type === 'project') {
              Icon = FolderGit2
              iconStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/25'
            } else if (item.type === 'contribution') {
              Icon = Sparkles
              iconStyle = 'bg-teal-500/10 text-teal-400 border-teal-500/25'
            } else if (item.type === 'live') {
              Icon = Video
              iconStyle = 'bg-[#FF9900]/15 text-[#FF9900] border-[#FF9900]/30'
            }

            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  item.is_read
                    ? 'bg-[#121824] border-[#1F293A] hover:border-slate-600'
                    : 'bg-[#18202E] border-[#FF9900]/40 hover:border-[#FF9900] shadow-xs'
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${iconStyle}`}
                >
                  <Icon size={15} />
                </div>

                {/* Message Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white truncate">
                        {item.title}
                      </span>
                      {!item.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
