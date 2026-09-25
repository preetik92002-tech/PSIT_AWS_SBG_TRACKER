import React, { useState, useEffect } from 'react'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CheckSquare,
  Award,
  Sparkles,
  Check,
  Trash2,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { timeAgo } from '@/utils/cn'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'task' | 'event' | 'achievement' | 'community' | 'announcement'
  timestamp: string
  isRead: boolean
}

export const Notifications: React.FC = () => {
  const { activeCommunity } = useCommunity()
  const { user } = useAuth()

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    // Generate notification list from recent community activities and state
    async function loadNotifications() {
      if (!user || !activeCommunity) return

      try {
        const { data: acts } = await supabase
          .from('community_activities')
          .select('id, description, activity_type, created_at')
          .eq('community_id', activeCommunity.id)
          .order('created_at', { ascending: false })
          .limit(15)

        if (acts && acts.length > 0) {
          const list: NotificationItem[] = acts.map((a, i) => {
            let type: NotificationItem['type'] = 'community'
            if (a.activity_type.includes('task')) type = 'task'
            else if (a.activity_type.includes('event')) type = 'event'
            else if (a.activity_type.includes('badge') || a.activity_type.includes('xp')) type = 'achievement'

            return {
              id: a.id,
              title: type === 'task' ? 'Task Assignment Update' : type === 'event' ? 'Community Event Notice' : 'Chapter Ledger Record',
              message: a.description,
              type,
              timestamp: a.created_at,
              isRead: i > 2, // First 3 are unread
            }
          })
          setNotifications(list)
        } else {
          // Fallback welcome notification
          setNotifications([
            {
              id: 'welcome',
              title: 'Welcome to AWS Journey Tracker',
              message: `You are connected to ${activeCommunity.name}. Check your task dashboard for active sprints.`,
              type: 'community',
              timestamp: new Date().toISOString(),
              isRead: false,
            },
          ])
        }
      } catch (err) {
        console.error('Error loading notifications:', err)
      }
    }

    loadNotifications()
  }, [user, activeCommunity])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    )
  }

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.isRead : true))
  const unreadCount = notifications.filter((n) => !n.isRead).length

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

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <Check size={13} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors cursor-pointer ${
            filter === 'unread'
              ? 'bg-[#FF9900] text-slate-950'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-200 bg-white text-slate-400 font-mono text-xs">
            No notifications in this view. All caught up!
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleRead(item.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                item.isRead
                  ? 'bg-white border-slate-200/80 hover:border-slate-300'
                  : 'bg-orange-50/20 border-orange-200/80 hover:border-orange-300 shadow-2xs'
              }`}
            >
              {/* Type Icon */}
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  item.type === 'task'
                    ? 'bg-amber-500/10 text-[#EA580C] border border-amber-500/25'
                    : item.type === 'event'
                    ? 'bg-blue-500/10 text-blue-600 border border-blue-500/25'
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25'
                }`}
              >
                {item.type === 'task' ? (
                  <CheckSquare size={13} />
                ) : item.type === 'event' ? (
                  <Calendar size={13} />
                ) : (
                  <Sparkles size={13} />
                )}
              </div>

              {/* Message Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-900 truncate">
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-sans mt-1 leading-relaxed">
                  {item.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
