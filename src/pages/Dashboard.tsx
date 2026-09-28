import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Shield,
  Calendar,
  ExternalLink,
  CheckSquare,
  FolderGit2,
  Trophy,
  AlertCircle,
  Clock,
  Sparkles,
  TrendingUp,
  Activity,
  Plus,
  ArrowRight,
  RefreshCw,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Building2,
  Share2,
  Settings,
  X,
  Loader2,
  Check,
  Award,
  Radio,
  Video,
  BarChart3,
  UserPlus,
  Send,
  Zap,
  Compass,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'
import type { CommunityDashboardMetrics } from '@/types/database'
import { LiveSessionStatus, type GoogleMeetStatusState } from '@/components/live/LiveSessionStatus'
import type { LiveSession } from '@/types/live'
import { CommunityImage, BuilderAvatar } from '@/components/ui'
import { AddMemberModal } from '@/components/members/AddMemberModal'
import { AddProjectModal } from '@/components/projects/AddProjectModal'
import { getGoogleConnectionStatus, listCommunityMeetSpaces } from '@/lib/googleMeet'
import { MemberDashboard } from '@/components/dashboard/MemberDashboard'

interface TaskOverviewStats {
  pendingReview: number
  completed: number
  overdue: number
  upcoming: number
  totalTasks: number
}

interface EventOverviewItem {
  id: string
  title: string
  description: string | null
  eventDate: string
  location: string | null
  eventType: string
  participantCount: number
  googleMeetStatus: GoogleMeetStatusState
  meetingUrl: string | null
}

interface RecentMemberItem {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  role: 'manager' | 'member'
  joinedAt: string
  awsBuilderAlias: string | null
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const {
    activeCommunity,
    userRoleInActiveCommunity,
    isManagerOfActiveCommunity,
  } = useCommunity()

  const liveCardRef = useRef<HTMLDivElement>(null)

  // Primary Metrics state
  const [metrics, setMetrics] = useState<CommunityDashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Secondary Real DB Metrics
  const [communityPoints, setCommunityPoints] = useState<number>(0)
  const [awsBadgeActivityCount, setAwsBadgeActivityCount] = useState<number>(0)
  const [taskOverview, setTaskOverview] = useState<TaskOverviewStats>({
    pendingReview: 0,
    completed: 0,
    overdue: 0,
    upcoming: 0,
    totalTasks: 0,
  })
  const [detailedEvents, setDetailedEvents] = useState<EventOverviewItem[]>([])
  const [recentMembers, setRecentMembers] = useState<RecentMemberItem[]>([])
  const [liveSessionState, setLiveSessionState] = useState<{
    session: LiveSession | null
    status: GoogleMeetStatusState
  }>({
    session: null,
    status: 'Not connected',
  })

  // Quick Action Modals state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'manager' | 'member'>('manager')

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Builder'

  // Dynamic greeting based on current local hour
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  // ==========================================================================
  // FETCH ALL REAL DATABASE DATA (Zero hardcoded statistics)
  // ==========================================================================
  const fetchDashboardData = useCallback(async (communityId: string) => {
    try {
      setErrorMessage(null)
      const now = new Date()
      const nowMs = now.getTime()

      // 1. Fetch RPC Dashboard Metrics
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_community_dashboard_metrics', {
        p_community_id: communityId,
      })

      if (rpcError) {
        console.error('[Dashboard] Error fetching metrics RPC:', rpcError.message)
        setErrorMessage(rpcError.message)
      } else {
        setMetrics(rpcData as unknown as CommunityDashboardMetrics)
      }

      // 2. Fetch Tasks and Task Assignments for Real Task Overview & Community Points
      const [tasksRes, assignmentsRes] = await Promise.all([
        supabase
          .from('community_tasks')
          .select('id, title, due_date, points')
          .eq('community_id', communityId),
        supabase
          .from('community_task_assignments')
          .select('id, task_id, user_id, status, completed_at')
          .eq('community_id', communityId),
      ])

      const tasksList = tasksRes.data || []
      const assignmentsList = assignmentsRes.data || []

      // Map task id to task info
      const taskMap = new Map<string, { points: number; dueDate: string | null }>()
      for (const t of tasksList) {
        taskMap.set(t.id, { points: t.points || 50, dueDate: t.due_date })
      }

      let completedTasksCount = 0
      let pendingReviewCount = 0
      let overdueCount = 0
      let taskPointsSum = 0

      for (const a of assignmentsList) {
        const tInfo = taskMap.get(a.task_id)
        const dueMs = tInfo?.dueDate ? new Date(tInfo.dueDate).getTime() : null

        if (a.status === 'completed') {
          completedTasksCount += 1
          taskPointsSum += tInfo?.points || 50
        } else if (a.status === 'submitted') {
          pendingReviewCount += 1
        } else if (a.status === 'overdue' || (dueMs !== null && dueMs < nowMs && a.status !== 'completed')) {
          overdueCount += 1
        } else {
          pendingReviewCount += 1
        }
      }

      // Upcoming tasks scheduled in the future
      const upcomingTasksCount = tasksList.filter((t) => {
        if (!t.due_date) return false
        return new Date(t.due_date).getTime() > nowMs
      }).length

      setTaskOverview({
        pendingReview: pendingReviewCount,
        completed: completedTasksCount,
        overdue: overdueCount,
        upcoming: upcomingTasksCount,
        totalTasks: tasksList.length,
      })

      // 3. Fetch Event RSVPs & Points from Activities
      const { data: activitiesData } = await supabase
        .from('community_activities')
        .select('id, activity_type, metadata')
        .eq('community_id', communityId)

      let rsvpPoints = 0
      const rsvpCountMap = new Map<string, number>()

      if (activitiesData) {
        for (const act of activitiesData) {
          if (act.activity_type === 'joined event') {
            rsvpPoints += 25
            const evId = (act.metadata as Record<string, unknown>)?.event_id as string
            if (evId) {
              rsvpCountMap.set(evId, (rsvpCountMap.get(evId) || 0) + 1)
            }
          }
        }
      }

      setCommunityPoints(taskPointsSum + rsvpPoints)

      // 4. Fetch AWS Badge Activity & Connected Builders
      const { data: membersProfilesData } = await supabase
        .from('community_members')
        .select(`
          user_id,
          role,
          joined_at,
          profiles!community_members_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            aws_builder_alias,
            aws_builder_profile_url
          )
        `)
        .eq('community_id', communityId)
        .order('joined_at', { ascending: false })

      if (membersProfilesData) {
        // Count legitimate verified AWS Builder aliases
        const connectedCount = membersProfilesData.filter((m) => {
          const p = m.profiles as Record<string, unknown> | null
          const alias = p?.aws_builder_alias
          return typeof alias === 'string' && alias.trim().length > 0
        }).length

        setAwsBadgeActivityCount(connectedCount)

        // Set Recent Members (limit 6)
        const recentList: RecentMemberItem[] = membersProfilesData.slice(0, 6).map((m) => {
          const p = (m.profiles || {}) as Record<string, unknown>
          return {
            userId: m.user_id,
            fullName: (p.full_name as string) || (p.email as string)?.split('@')[0] || 'Community Builder',
            email: (p.email as string) || '',
            avatarUrl: (p.avatar_url as string) || null,
            role: m.role as 'manager' | 'member',
            joinedAt: m.joined_at,
            awsBuilderAlias: (p.aws_builder_alias as string) || null,
          }
        })
        setRecentMembers(recentList)
      }

      // 5. Fetch Events Overview & Google Meet Status
      const oneDayAgo = new Date(nowMs - 86400000).toISOString()
      const { data: eventsData } = await supabase
        .from('community_events')
        .select('id, title, description, event_date, location, event_type')
        .eq('community_id', communityId)
        .gte('event_date', oneDayAgo)
        .order('event_date', { ascending: true })
        .limit(4)

      let determinedLiveSession: LiveSession | null = null
      let determinedLiveStatus: GoogleMeetStatusState = 'Not connected'

      if (eventsData && eventsData.length > 0) {
        const eventsList: EventOverviewItem[] = eventsData.map((ev) => {
          const rsvpCount = rsvpCountMap.get(ev.id) || 0
          const eventTime = new Date(ev.event_date).getTime()
          const eventEndTime = eventTime + 2 * 3600000 // 2-hour window
          const loc = ev.location || ''
          const hasMeet = loc.toLowerCase().includes('meet.google.com') || loc.toLowerCase().includes('google meet')

          // Derive exact status without fake claiming
          let evStatus: GoogleMeetStatusState = 'Not connected'
          if (hasMeet) {
            if (nowMs >= eventTime && nowMs <= eventEndTime) {
              evStatus = 'Live'
            } else if (nowMs < eventTime) {
              evStatus = 'Scheduled'
            } else {
              evStatus = 'Ended'
            }
          }

          return {
            id: ev.id,
            title: ev.title,
            description: ev.description,
            eventDate: ev.event_date,
            location: ev.location,
            eventType: ev.event_type || 'meetup',
            participantCount: rsvpCount,
            googleMeetStatus: evStatus,
            meetingUrl: hasMeet ? (loc.startsWith('http') ? loc : `https://${loc}`) : null,
          }
        })

        setDetailedEvents(eventsList)

        // Fetch Google Connection status and official meet spaces
        const [connStatus, meetSpaces] = await Promise.all([
          getGoogleConnectionStatus(communityId),
          listCommunityMeetSpaces(communityId),
        ])

        const liveSpace = meetSpaces.find((s) => s.status === 'LIVE')
        const scheduledSpace = meetSpaces.find((s) => s.status === 'SCHEDULED')
        const endedSpace = meetSpaces.find((s) => s.status === 'ENDED')

        if (liveSpace) {
          determinedLiveStatus = 'Live'
          determinedLiveSession = {
            id: liveSpace.id,
            provider: 'google_meet',
            title: liveSpace.title,
            description: null,
            scheduledAt: liveSpace.scheduled_start,
            meetingUrl: liveSpace.meeting_uri,
            status: 'live',
            createdBy: liveSpace.created_by,
            createdAt: liveSpace.created_at,
          }
        } else if (scheduledSpace) {
          determinedLiveStatus = 'Scheduled'
          determinedLiveSession = {
            id: scheduledSpace.id,
            provider: 'google_meet',
            title: scheduledSpace.title,
            description: null,
            scheduledAt: scheduledSpace.scheduled_start,
            meetingUrl: scheduledSpace.meeting_uri,
            status: 'scheduled',
            createdBy: scheduledSpace.created_by,
            createdAt: scheduledSpace.created_at,
          }
        } else if (connStatus.is_connected) {
          determinedLiveStatus = endedSpace ? 'Ended' : 'Connected'
          if (endedSpace) {
            determinedLiveSession = {
              id: endedSpace.id,
              provider: 'google_meet',
              title: endedSpace.title,
              description: null,
              scheduledAt: endedSpace.scheduled_start,
              meetingUrl: endedSpace.meeting_uri,
              status: 'ended',
              createdBy: endedSpace.created_by,
              createdAt: endedSpace.created_at,
            }
          }
        } else {
          determinedLiveStatus = 'Not connected'
        }
      } else {
        setDetailedEvents([])
        determinedLiveStatus = 'Not connected'
      }

      setLiveSessionState({
        session: determinedLiveSession,
        status: determinedLiveStatus,
      })
    } catch (err) {
      console.error('[Dashboard] Unexpected error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch community data')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Re-fetch whenever active community changes (guarantees zero data leak)
  useEffect(() => {
    if (!activeCommunity?.id) {
      setMetrics(null)
      setIsLoading(false)
      return
    }

    setMetrics(null)
    setIsLoading(true)
    fetchDashboardData(activeCommunity.id)
  }, [activeCommunity?.id, fetchDashboardData])

  const handleRefresh = () => {
    if (!activeCommunity?.id) return
    setRefreshing(true)
    fetchDashboardData(activeCommunity.id)
  }

  // Scroll to Community Live Card
  const handleScrollToLive = () => {
    if (liveCardRef.current) {
      liveCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      liveCardRef.current.classList.add('ring-2', 'ring-[#FF9900]')
      setTimeout(() => {
        liveCardRef.current?.classList.remove('ring-2', 'ring-[#FF9900]')
      }, 2000)
    } else {
      navigate('/events')
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  // Helper to format activity type cleanly
  const getActivityTag = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('joined community') || t.includes('member joined')) return 'Member joined'
    if (t.includes('completed task') || t.includes('task completed')) return 'Task completed'
    if (t.includes('submitted task') || t.includes('task submitted')) return 'Task submitted'
    if (t.includes('joined event') || t.includes('event rsvp')) return 'Event RSVP'
    if (t.includes('project') || t.includes('updated project')) return 'Project updated'
    return 'Contribution recorded'
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-7xl mx-auto overflow-x-hidden">
      {/* ============================================================== */}
      {/* 1. PAGE HEADER                                                */}
      {/* ============================================================== */}
      <PageHeader
        title={`${greeting}, ${displayName}`}
        subtitle="A quick overview of your community."
        tag={
          activeCommunity
            ? `${activeCommunity.short_name} · ${userRoleInActiveCommunity === 'manager' ? 'COMMUNITY MANAGER' : 'MEMBER'}`
            : 'Multi-Community'
        }
        icon={
          activeCommunity ? (
            <CommunityImage
              src={activeCommunity.logo_url}
              name={activeCommunity.name}
              shortName={activeCommunity.short_name}
              size="xs"
            />
          ) : (
            <Building2 size={20} />
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-200 bg-[#18202E] hover:bg-[#202B3D] border border-[#232F40] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Metrics"
            >
              <RefreshCw
                size={13}
                className={refreshing ? 'animate-spin text-[#FF9900]' : 'text-slate-400'}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {isManagerOfActiveCommunity && activeCommunity && (
              <>
                <button
                  type="button"
                  onClick={() => setViewMode((prev) => (prev === 'manager' ? 'member' : 'manager'))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-200 bg-[#18202E] hover:bg-[#202B3D] border border-[#232F40] shadow-xs transition-colors cursor-pointer"
                  title="Switch between Manager and Member dashboard views"
                >
                  <Compass size={13} className="text-[#FF9900]" />
                  <span className="hidden sm:inline">{viewMode === 'manager' ? 'Member View' : 'Manager View'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-xs transition-all cursor-pointer font-mono"
                >
                  <UserPlus size={13} />
                  <span>Add Member</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* ============================================================== */}
      {/* 2. NO COMMUNITY FALLBACK                                      */}
      {/* ============================================================== */}
      {!activeCommunity && !isLoading && (
        <div className="p-6 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-xs flex items-center justify-between flex-wrap gap-4 text-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#18202E] border border-[#232F40] text-[#FF9900] flex items-center justify-center flex-shrink-0">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                No Community Selected
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                You are not enrolled in an AWS Student Builder community yet. Start your own chapter or join using an invite code.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/auth/create-community"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs font-mono"
            >
              Create Community
            </Link>
            <Link
              to="/auth/join-community"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-[#18202E] hover:bg-[#202B3D] border border-slate-700/60 transition-all shadow-xs font-mono"
            >
              Join with Code
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. LOADING SKELETON                                           */}
      {/* ============================================================== */}
      {isLoading && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-[#1F293A] bg-[#121824] flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-[#FF9900]" />
            <span className="text-xs font-mono text-slate-400 font-medium">
              Loading scoped data for {activeCommunity?.name || 'community'}...
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-24 bg-[#121824] rounded-xl border border-[#1F293A] animate-pulse p-4" />
            ))}
          </div>
          <div className="h-32 bg-[#121824] rounded-xl border border-[#1F293A] animate-pulse" />
        </div>
      )}

      {/* Database Error Banner if any */}
      {errorMessage && !isLoading && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center gap-2.5 shadow-xs">
          <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
          <span>Error loading community metrics: {errorMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. DASHBOARD CONTENT (Rendered with real data)                */}
      {/* ============================================================== */}
      {!isLoading && activeCommunity && (!isManagerOfActiveCommunity || viewMode === 'member') && (
        <MemberDashboard />
      )}

      {!isLoading && activeCommunity && isManagerOfActiveCommunity && viewMode === 'manager' && metrics && (
        <>
          {/* ========================================================== */}
          {/* A. TOP SUMMARY (7 Scoped Real Database Metrics)            */}
          {/* Total Members, Active Members, Tasks, Upcoming Events,     */}
          {/* Projects, Community Points, AWS Badge Activity             */}
          {/* ========================================================== */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                <Activity size={14} className="text-[#FF9900]" />
                <span>Top Summary</span>
              </h2>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Database Scoped
              </span>
            </div>

            {/* Desktop: 7-Col, Tablet: 4-Col, Mobile: 2-Col */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* 1. Total Members */}
              <StatCard
                title="Total Members"
                value={metrics.total_members.toString()}
                subtitle={activeCommunity.short_name}
                icon={<Users size={16} className="text-[#FF9900]" />}
              />

              {/* 2. Active Members */}
              <StatCard
                title="Active Members"
                value={metrics.active_members.toString()}
                subtitle={
                  metrics.total_members > 0
                    ? `${Math.round((metrics.active_members / metrics.total_members) * 100)}% active`
                    : 'Active rate'
                }
                icon={<UserCheck size={16} className="text-emerald-400" />}
              />

              {/* 3. Tasks */}
              <StatCard
                title="Tasks"
                value={taskOverview.totalTasks.toString()}
                subtitle={`${taskOverview.completed} completed`}
                icon={<CheckSquare size={16} className="text-blue-400" />}
              />

              {/* 4. Upcoming Events */}
              <StatCard
                title="Upcoming Events"
                value={metrics.events_count.toString()}
                subtitle="Chapter meetups"
                icon={<Calendar size={16} className="text-amber-400" />}
              />

              {/* 5. Projects */}
              <StatCard
                title="Projects"
                value={metrics.projects_count.toString()}
                subtitle="Cloud repositories"
                icon={<FolderGit2 size={16} className="text-purple-400" />}
              />

              {/* 6. Community Points */}
              <StatCard
                title="Community Points"
                value={`${communityPoints.toLocaleString()}`}
                subtitle="XP accumulated"
                icon={<Trophy size={16} className="text-amber-400" />}
              />

              {/* 7. AWS Badge Activity */}
              <StatCard
                title="AWS Badge Activity"
                value={awsBadgeActivityCount.toString()}
                subtitle="Builders connected"
                icon={<Award size={16} className="text-[#FF9900]" />}
              />
            </div>
          </section>

          {/* ========================================================== */}
          {/* B. QUICK ACTIONS (Functional buttons only, zero dead links) */}
          {/* [ ADD MEMBER ] [ CREATE TASK ] [ CREATE EVENT ]            */}
          {/* [ CREATE PROJECT ] [ COMMUNITY LIVE ] [ VIEW ANALYTICS ]   */}
          {/* ========================================================== */}
          <section className="bg-[#121824] rounded-2xl border border-[#1F293A] p-4 sm:p-5 shadow-xs text-slate-100">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#FF9900]" />
                <span>Quick Actions</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                {isManagerOfActiveCommunity ? 'Manager Quick Tools' : 'Member Shortcuts'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono">
              {/* 1. ADD MEMBER */}
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="p-3.5 rounded-xl border border-[#1F293A] hover:border-[#FF9900]/40 bg-[#18202E] hover:bg-[#1E283A] transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 text-[#FF9900] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <UserPlus size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-white tracking-wide">
                    ADD MEMBER
                  </span>
                  <span className="block text-[10px] text-slate-400 font-sans mt-0.5">
                    Invite or enroll
                  </span>
                </div>
              </button>

              {/* 2. CREATE TASK */}
              <button
                type="button"
                onClick={() => navigate('/tasks/assign')}
                className="p-3.5 rounded-xl border border-[#1F293A] hover:border-[#FF9900]/40 bg-[#18202E] hover:bg-[#1E283A] transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <CheckSquare size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-white tracking-wide">
                    CREATE TASK
                  </span>
                  <span className="block text-[10px] text-slate-400 font-sans mt-0.5">
                    Assign challenge
                  </span>
                </div>
              </button>

              {/* 3. CREATE EVENT */}
              <button
                type="button"
                onClick={() => navigate('/events/new')}
                className="p-3.5 rounded-xl border border-[#1F293A] hover:border-[#FF9900]/40 bg-[#18202E] hover:bg-[#1E283A] transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Calendar size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-white tracking-wide">
                    CREATE EVENT
                  </span>
                  <span className="block text-[10px] text-slate-400 font-sans mt-0.5">
                    Schedule session
                  </span>
                </div>
              </button>

              {/* 4. CREATE PROJECT */}
              <button
                type="button"
                onClick={() => setIsAddProjectOpen(true)}
                className="p-3.5 rounded-xl border border-[#1F293A] hover:border-[#FF9900]/40 bg-[#18202E] hover:bg-[#1E283A] transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <FolderGit2 size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-white tracking-wide">
                    CREATE PROJECT
                  </span>
                  <span className="block text-[10px] text-slate-400 font-sans mt-0.5">
                    Register initiative
                  </span>
                </div>
              </button>

              {/* 5. COMMUNITY LIVE */}
              <button
                type="button"
                onClick={handleScrollToLive}
                className="p-3.5 rounded-xl border border-[#1F293A] hover:border-[#FF9900]/40 bg-[#18202E] hover:bg-[#1E283A] transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Radio size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-white tracking-wide">
                    COMMUNITY LIVE
                  </span>
                  <span className="block text-[10px] text-slate-400 font-sans mt-0.5">
                    Google Meet status
                  </span>
                </div>
              </button>

              {/* 6. VIEW ANALYTICS */}
              <button
                type="button"
                onClick={() => navigate('/analytics')}
                className="p-3.5 rounded-xl border border-[#1F293A] hover:border-[#FF9900]/40 bg-[#18202E] hover:bg-[#1E283A] transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-white tracking-wide">
                    VIEW ANALYTICS
                  </span>
                  <span className="block text-[10px] text-slate-400 font-sans mt-0.5">
                    Inspect metrics
                  </span>
                </div>
              </button>
            </div>
          </section>

          {/* ========================================================== */}
          {/* C. TASK OVERVIEW (Clicking navigates to filtered /tasks)   */}
          {/* pending review | completed | overdue | upcoming           */}
          {/* ========================================================== */}
          <section className="bg-[#121824] rounded-2xl border border-[#1F293A] p-5 shadow-xs text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <CheckSquare size={16} className="text-[#FF9900]" />
                  <span>Task Overview</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any status card to view the matching filtered tasks list.
                </p>
              </div>
              <Link
                to="/tasks"
                className="text-xs font-mono text-[#FF9900] hover:text-[#EC7211] font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <span>View All Tasks</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Pending Review */}
              <button
                type="button"
                onClick={() => navigate('/tasks?filter=pending')}
                className="p-4 rounded-xl bg-[#18202E] hover:bg-[#1E283A] border border-[#1F293A] hover:border-amber-500/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-mono text-amber-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Pending Review</span>
                  <Clock size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {taskOverview.pendingReview}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Awaiting completion or review
                </p>
              </button>

              {/* 2. Completed */}
              <button
                type="button"
                onClick={() => navigate('/tasks?filter=completed')}
                className="p-4 rounded-xl bg-[#18202E] hover:bg-[#1E283A] border border-[#1F293A] hover:border-emerald-500/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Completed</span>
                  <CheckCircle2 size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {taskOverview.completed}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Verified completed challenges
                </p>
              </button>

              {/* 3. Overdue */}
              <button
                type="button"
                onClick={() => navigate('/tasks?filter=overdue')}
                className="p-4 rounded-xl bg-[#18202E] hover:bg-[#1E283A] border border-[#1F293A] hover:border-rose-500/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-mono text-rose-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Overdue</span>
                  <AlertTriangle size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-2xl font-bold font-mono text-rose-300">
                  {taskOverview.overdue}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Passed assignment deadline
                </p>
              </button>

              {/* 4. Upcoming */}
              <button
                type="button"
                onClick={() => navigate('/tasks?filter=upcoming')}
                className="p-4 rounded-xl bg-[#18202E] hover:bg-[#1E283A] border border-[#1F293A] hover:border-blue-500/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-mono text-blue-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider">Upcoming</span>
                  <Calendar size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {taskOverview.upcoming}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Scheduled on chapter roadmap
                </p>
              </button>
            </div>
          </section>

          {/* ========================================================== */}
          {/* D. COMMUNITY LIVE CARD (Google Meet status: 5 States)      */}
          {/* Not connected | Connected | Scheduled | Live | Ended       */}
          {/* Do NOT claim live merely because a meeting exists          */}
          {/* ========================================================== */}
          <div ref={liveCardRef}>
            <LiveSessionStatus
              session={liveSessionState.session}
              googleMeetStatus={liveSessionState.status}
              variant="dashboard"
              onActionClick={() => navigate('/events')}
            />
          </div>

          {/* ========================================================== */}
          {/* E. EVENT OVERVIEW (Upcoming events, participant count,      */}
          {/* community identity, google meet status)                    */}
          {/* ========================================================== */}
          <section className="bg-[#121824] rounded-2xl border border-[#1F293A] p-5 shadow-xs text-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <Calendar size={16} className="text-[#FF9900]" />
                  <span>Event Overview</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scheduled workshops and live sessions for {activeCommunity.name}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isManagerOfActiveCommunity && (
                  <button
                    type="button"
                    onClick={() => navigate('/events/new')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#FF9900] bg-[#FF9900]/10 hover:bg-[#FF9900]/20 border border-[#FF9900]/30 transition-all cursor-pointer font-mono"
                  >
                    <Plus size={12} />
                    <span>Create Event</span>
                  </button>
                )}
                <Link
                  to="/events"
                  className="text-xs font-mono text-slate-400 hover:text-white font-semibold inline-flex items-center gap-1 transition-colors ml-2"
                >
                  <span>All Events</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {detailedEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {detailedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl border border-[#1F293A] bg-[#18202E] hover:border-slate-700 transition-all flex flex-col justify-between gap-3 text-xs"
                  >
                    <div>
                      {/* Community Identity & Meet Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CommunityImage
                            src={activeCommunity.logo_url}
                            name={activeCommunity.name}
                            shortName={activeCommunity.short_name}
                            size="xs"
                          />
                          <span className="font-mono text-[11px] font-bold text-slate-300 truncate">
                            {activeCommunity.short_name}
                          </span>
                        </div>

                        {/* Google Meet Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            ev.googleMeetStatus === 'Live'
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                              : ev.googleMeetStatus === 'Scheduled'
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                              : ev.googleMeetStatus === 'Ended'
                              ? 'bg-slate-800 border border-slate-700 text-slate-400'
                              : 'bg-slate-800/60 border border-slate-700/60 text-slate-500'
                          }`}
                        >
                          {ev.googleMeetStatus === 'Live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                          <span>Google Meet: {ev.googleMeetStatus}</span>
                        </span>
                      </div>

                      {/* Event Title */}
                      <h4 className="font-mono font-bold text-sm text-white leading-snug">
                        {ev.title}
                      </h4>
                      {ev.description && (
                        <p className="text-slate-400 font-sans text-xs line-clamp-2 mt-1">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="pt-2 border-t border-[#1F293A]/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-300 flex items-center gap-1">
                          <Calendar size={12} className="text-[#FF9900]" />
                          <span>
                            {new Date(ev.eventDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Users size={12} />
                          <span>{ev.participantCount} participant{ev.participantCount === 1 ? '' : 's'}</span>
                        </span>
                      </div>

                      <Link
                        to={`/events/${ev.id}`}
                        className="text-[#FF9900] hover:text-[#EC7211] font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Details</span>
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center rounded-xl border border-dashed border-[#1F293A] bg-[#18202E]/40 font-mono">
                <Calendar size={22} className="mx-auto mb-2 text-slate-500" />
                <h4 className="text-xs font-bold text-white">
                  No upcoming community events scheduled
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-sans">
                  Host cloud sessions, certification sprints, and live Google Meet workshops.
                </p>
                {isManagerOfActiveCommunity && (
                  <button
                    type="button"
                    onClick={() => navigate('/events/new')}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer font-mono"
                  >
                    <Plus size={13} />
                    <span>Create Event</span>
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ========================================================== */}
          {/* F. TWO-COLUMN SPLIT: MEMBER ACTIVITY & RECENT MEMBERS     */}
          {/* Left: Member Activity (6 Types)                           */}
          {/* Right: Recent Members (Avatar, Name, Role -> /members/:id) */}
          {/* ========================================================== */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-slate-100">
            {/* 1. Member Activity (7 Cols on Desktop) */}
            <div className="lg:col-span-7 rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                      <Activity size={16} className="text-[#FF9900]" />
                      <span>Member Activity</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Recent chapter milestones, submissions, and contributions.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#1F293A] text-slate-400 bg-[#18202E] font-medium">
                    Live Feed
                  </span>
                </div>

                {metrics.recent_activities.length > 0 ? (
                  <div className="divide-y divide-[#1F293A]">
                    {metrics.recent_activities.map((act) => {
                      const tag = getActivityTag(act.activity_type)
                      return (
                        <div key={act.id} className="py-3 flex items-start gap-3">
                          <BuilderAvatar
                            name={act.user_name || 'Builder'}
                            src={act.user_avatar}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-200 leading-snug">
                              {act.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                              <span
                                className={`font-semibold px-1.5 py-0.5 rounded border text-[9px] ${
                                  tag === 'Member joined'
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                    : tag === 'Task completed'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : tag === 'Task submitted'
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : tag === 'Event RSVP'
                                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                    : tag === 'Project updated'
                                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                                    : 'bg-[#FF9900]/10 border-[#FF9900]/30 text-[#FF9900]'
                                }`}
                              >
                                {tag}
                              </span>
                              <span>·</span>
                              <span>{formatTimeAgo(act.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center rounded-xl border border-dashed border-[#1F293A] bg-[#18202E]/40 font-mono">
                    <Activity size={22} className="mx-auto mb-2 text-slate-500" />
                    <h4 className="text-xs font-bold text-white">
                      No recent activities recorded yet
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-sans">
                      Logs populate as builders join your chapter, complete tasks, and RSVP to sessions.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Recent Members (5 Cols on Desktop) */}
            <div className="lg:col-span-5 rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                      <Users size={16} className="text-blue-400" />
                      <span>Recent Members</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Newest builders in {activeCommunity.short_name}.
                    </p>
                  </div>
                  <Link
                    to="/members"
                    className="text-xs font-mono text-[#FF9900] hover:text-[#EC7211] font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    <span>View Roster</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>

                {recentMembers.length > 0 ? (
                  <div className="space-y-2">
                    {recentMembers.map((m) => (
                      <Link
                        key={m.userId}
                        to={`/members/${m.userId}`}
                        className="p-2.5 rounded-xl border border-[#1F293A] bg-[#18202E] hover:bg-[#1E283A] hover:border-slate-600 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <BuilderAvatar
                            name={m.fullName}
                            src={m.avatarUrl}
                            alias={m.awsBuilderAlias}
                            isManager={m.role === 'manager'}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-white truncate group-hover:text-[#FF9900] transition-colors">
                              {m.fullName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-400 truncate">
                              {m.awsBuilderAlias ? (
                                <span className="text-[#FF9900] font-semibold">
                                  @{m.awsBuilderAlias}
                                </span>
                              ) : (
                                <span>{m.email}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                              m.role === 'manager'
                                ? 'bg-orange-500/15 border border-orange-500/30 text-[#FF9900]'
                                : 'bg-slate-800 border border-slate-700 text-slate-300'
                            }`}
                          >
                            {m.role}
                          </span>
                          <ArrowRight size={12} className="text-slate-500 group-hover:text-white transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center rounded-xl border border-dashed border-[#1F293A] bg-[#18202E]/40 font-mono">
                    <Users size={22} className="mx-auto mb-2 text-slate-500" />
                    <h4 className="text-xs font-bold text-white">
                      No members joined yet
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-sans">
                      Share your community invite code with campus peers to grow your chapter.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ========================================================== */}
          {/* G. COMMUNITY HEALTH & WEEKLY PROGRESS                     */}
          {/* ========================================================== */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 text-slate-100">
            {/* Left: Community Health */}
            <div className="lg:col-span-6 rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                      <Shield size={16} className="text-blue-400" />
                      <span>Community Health</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Scoped health indicators calculated from member engagement.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#1F293A] text-slate-400 bg-[#18202E] font-medium">
                    Health Status
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 my-4 font-mono">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <span className="block text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                      Active
                    </span>
                    <span className="text-xl font-bold text-emerald-300">
                      {metrics.community_health.active}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                    <span className="block text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                      Needs Attention
                    </span>
                    <span className="text-xl font-bold text-amber-300">
                      {metrics.community_health.needs_attention}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#18202E] border border-[#1F293A] text-center">
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      Inactive
                    </span>
                    <span className="text-xl font-bold text-slate-300">
                      {metrics.community_health.inactive}
                    </span>
                  </div>
                </div>

                {metrics.total_members > 0 && (
                  <div className="space-y-1.5 mt-4 font-mono">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Roster Distribution</span>
                      <span>{metrics.total_members} Members</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
                      <div
                        style={{
                          width: `${(metrics.community_health.active / metrics.total_members) * 100}%`,
                        }}
                        className="bg-emerald-500 transition-all duration-300"
                        title={`Active: ${metrics.community_health.active}`}
                      />
                      <div
                        style={{
                          width: `${(metrics.community_health.needs_attention / metrics.total_members) * 100}%`,
                        }}
                        className="bg-amber-500 transition-all duration-300"
                        title={`Needs Attention: ${metrics.community_health.needs_attention}`}
                      />
                      <div
                        style={{
                          width: `${(metrics.community_health.inactive / metrics.total_members) * 100}%`,
                        }}
                        className="bg-slate-600 transition-all duration-300"
                        title={`Inactive: ${metrics.community_health.inactive}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Weekly Progress */}
            <div className="lg:col-span-6 rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                      <TrendingUp size={16} className="text-teal-400" />
                      <span>This Week&apos;s Progress</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Task assignments and completions over the past 7 days.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#1F293A] text-slate-400 bg-[#18202E] font-medium">
                    Weekly
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5 my-4 font-mono">
                  <div className="p-2.5 rounded-xl bg-[#18202E] border border-[#1F293A] text-center">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                      Assigned
                    </span>
                    <span className="text-lg font-bold text-slate-200">
                      {metrics.weekly_progress.assigned}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <span className="block text-[9px] uppercase tracking-wider text-emerald-400 font-semibold">
                      Completed
                    </span>
                    <span className="text-lg font-bold text-emerald-300">
                      {metrics.weekly_progress.completed}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                    <span className="block text-[9px] uppercase tracking-wider text-amber-400 font-semibold">
                      Pending
                    </span>
                    <span className="text-lg font-bold text-amber-300">
                      {metrics.weekly_progress.pending}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-center">
                    <span className="block text-[9px] uppercase tracking-wider text-[#FF9900] font-semibold">
                      Rate
                    </span>
                    <span className="text-lg font-bold text-[#FF9900]">
                      {metrics.weekly_progress.completion_percentage}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mt-4 font-mono">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Task Velocity</span>
                    <span>{metrics.weekly_progress.completion_percentage}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{
                        width: `${metrics.weekly_progress.completion_percentage}%`,
                      }}
                      className="h-full bg-[#FF9900] transition-all duration-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ============================================================== */}
      {/* 5. MODALS (Integrated Functional Features)                    */}
      {/* ============================================================== */}
      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onMemberAdded={handleRefresh}
        isManager={isManagerOfActiveCommunity}
      />

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onProjectAdded={handleRefresh}
      />
    </div>
  )
}
