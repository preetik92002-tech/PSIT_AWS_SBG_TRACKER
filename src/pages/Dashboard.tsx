import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
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
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'
import type { CommunityDashboardMetrics } from '@/types/database'

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth()
  const {
    activeCommunity,
    userRoleInActiveCommunity,
    isManagerOfActiveCommunity,
  } = useCommunity()

  const [metrics, setMetrics] = useState<CommunityDashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)

  // Quick Action Modal state
  const [modalType, setModalType] = useState<'event' | 'task' | 'project' | null>(null)
  const [modalTitle, setModalTitle] = useState('')
  const [modalDesc, setModalDesc] = useState('')
  const [modalExtra, setModalExtra] = useState('')
  const [isSubmittingModal, setIsSubmittingModal] = useState(false)

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Builder'

  // Dynamic greeting based on current local hour (target "Good morning, {name}")
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  const fetchDashboardMetrics = useCallback(async (communityId: string) => {
    try {
      setErrorMessage(null)
      const { data, error } = await supabase.rpc('get_community_dashboard_metrics', {
        p_community_id: communityId,
      })

      if (error) {
        console.error('[Dashboard] Error fetching metrics:', error.message)
        setErrorMessage(error.message)
        setMetrics(null)
      } else {
        setMetrics(data as unknown as CommunityDashboardMetrics)
      }
    } catch (err) {
      console.error('[Dashboard] Unexpected error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch community metrics')
      setMetrics(null)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Re-fetch whenever active community changes — NEVER leak previous community data!
  useEffect(() => {
    if (!activeCommunity?.id) {
      setMetrics(null)
      setIsLoading(false)
      return
    }

    // Immediately clear previous community data
    setMetrics(null)
    setIsLoading(true)
    fetchDashboardMetrics(activeCommunity.id)
  }, [activeCommunity?.id, fetchDashboardMetrics])

  const handleRefresh = () => {
    if (!activeCommunity?.id) return
    setRefreshing(true)
    fetchDashboardMetrics(activeCommunity.id)
  }

  const handleCopyInvite = async () => {
    if (!activeCommunity) return
    try {
      const { data } = await supabase
        .from('community_codes')
        .select('code')
        .eq('community_id', activeCommunity.id)
        .eq('active', true)
        .maybeSingle()

      const code = data?.code || activeCommunity.short_name
      const inviteUrl = `${window.location.origin}/auth/join-community?code=${code}`
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedInvite(true)
      setTimeout(() => setCopiedInvite(false), 2500)
    } catch {
      setCopiedInvite(false)
    }
  }

  // Quick item creation handler for managers
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCommunity || !user || !modalTitle.trim()) return

    setIsSubmittingModal(true)
    try {
      if (modalType === 'event') {
        const eventDate = modalExtra.trim()
          ? new Date(modalExtra).toISOString()
          : new Date(Date.now() + 86400000 * 3).toISOString()
        const { error } = await supabase.from('community_events').insert({
          community_id: activeCommunity.id,
          title: modalTitle.trim(),
          description: modalDesc.trim() || null,
          event_date: eventDate,
          created_by: user.id,
        })
        if (error) throw error

        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: 'published event',
          description: `${displayName} published event: ${modalTitle.trim()}`,
        })
      } else if (modalType === 'task') {
        const points = parseInt(modalExtra, 10) || 50
        const { error } = await supabase.from('community_tasks').insert({
          community_id: activeCommunity.id,
          title: modalTitle.trim(),
          description: modalDesc.trim() || null,
          points,
          created_by: user.id,
        })
        if (error) throw error

        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: 'created task',
          description: `${displayName} created task: ${modalTitle.trim()}`,
        })
      } else if (modalType === 'project') {
        const { error } = await supabase.from('community_projects').insert({
          community_id: activeCommunity.id,
          title: modalTitle.trim(),
          description: modalDesc.trim() || null,
          github_url: modalExtra.trim() || null,
          created_by: user.id,
        })
        if (error) throw error

        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: 'created project',
          description: `${displayName} registered project: ${modalTitle.trim()}`,
        })
      }

      setModalType(null)
      setModalTitle('')
      setModalDesc('')
      setModalExtra('')
      if (activeCommunity?.id) {
        await fetchDashboardMetrics(activeCommunity.id)
      }
    } catch (err) {
      console.error('[Dashboard] Quick create failed:', err)
      alert(err instanceof Error ? err.message : 'Creation failed')
    } finally {
      setIsSubmittingModal(false)
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* ============================================================== */}
      {/* 1. PAGE HEADER */}
      {/* ============================================================== */}
      <PageHeader
        title={`${greeting}, ${displayName}`}
        subtitle="A quick overview of your community."
        tag={
          activeCommunity
            ? `${activeCommunity.short_name} · ${userRoleInActiveCommunity === 'manager' ? 'MANAGER' : 'MEMBER'}`
            : 'Multi-Community'
        }
        icon={<Building2 size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Metrics"
            >
              <RefreshCw
                size={13}
                className={refreshing ? 'animate-spin text-[#FF9900]' : 'text-slate-500'}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {isManagerOfActiveCommunity && activeCommunity && (
              <button
                type="button"
                onClick={() => setModalType('event')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] shadow-xs transition-all cursor-pointer"
              >
                <Plus size={13} />
                <span>New Event</span>
              </button>
            )}
          </div>
        }
      />

      {/* ============================================================== */}
      {/* 2. NO COMMUNITY FALLBACK */}
      {/* ============================================================== */}
      {!activeCommunity && !isLoading && (
        <div className="p-6 rounded-2xl border border-amber-200 bg-white shadow-xs flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200/80 text-[#FF9900] flex items-center justify-center flex-shrink-0">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-mono">
                No Community Selected
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                You are not enrolled in an AWS Student Builder community yet. Start your own chapter or join using an invite code.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/auth/create-community"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs"
            >
              Create Community
            </Link>
            <Link
              to="/auth/join-community"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all shadow-xs"
            >
              Join with Code
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. LOADING SKELETON (Guarantees zero data leak during community switch) */}
      {/* ============================================================== */}
      {isLoading && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-[#FF9900]" />
            <span className="text-xs font-mono text-slate-600 font-medium">
              Loading scoped data for {activeCommunity?.name || 'community'}...
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse p-4" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 h-48 bg-white rounded-xl border border-slate-200 animate-pulse" />
            <div className="lg:col-span-6 h-48 bg-white rounded-xl border border-slate-200 animate-pulse" />
          </div>
        </div>
      )}

      {/* Database Error Banner if any */}
      {errorMessage && !isLoading && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-mono flex items-center gap-2.5 shadow-xs">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>Error loading community metrics: {errorMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. REAL DATABASE METRICS SECTION */}
      {/* ============================================================== */}
      {!isLoading && metrics && (
        <>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                <Activity size={14} className="text-[#FF9900]" />
                <span>Community Metrics</span>
              </h2>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Database Scoped
              </span>
            </div>

            {/* Responsive Metrics: Desktop (6-Col), Tablet (3-Col), Mobile (2-Col) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* Total Members */}
              <StatCard
                title="Total Members"
                value={metrics.total_members.toString()}
                subtitle={activeCommunity ? activeCommunity.short_name : 'Total Chapter'}
                icon={<Users size={16} className="text-[#FF9900]" />}
              />

              {/* Active Members */}
              <StatCard
                title="Active Members"
                value={metrics.active_members.toString()}
                subtitle={
                  metrics.total_members > 0
                    ? `${Math.round((metrics.active_members / metrics.total_members) * 100)}% active`
                    : 'Active status'
                }
                icon={<UserCheck size={16} className="text-emerald-500" />}
              />

              {/* Needs Attention */}
              <StatCard
                title="Needs Attention"
                value={metrics.members_needing_attention.toString()}
                subtitle={
                  metrics.members_needing_attention > 0 ? 'Overdue / low pace' : 'All on track'
                }
                icon={
                  <AlertTriangle
                    size={16}
                    className={metrics.members_needing_attention > 0 ? 'text-amber-500' : 'text-slate-400'}
                  />
                }
              />

              {/* Events */}
              <StatCard
                title="Events"
                value={metrics.events_count.toString()}
                subtitle="Community sessions"
                icon={<Calendar size={16} className="text-blue-500" />}
              />

              {/* Projects */}
              <StatCard
                title="Projects"
                value={metrics.projects_count.toString()}
                subtitle="Builder initiatives"
                icon={<FolderGit2 size={16} className="text-purple-500" />}
              />

              {/* Average Task Completion */}
              <StatCard
                title="Avg Completion"
                value={`${metrics.avg_task_completion}%`}
                subtitle="Task completion rate"
                icon={<TrendingUp size={16} className="text-teal-500" />}
              />
            </div>
          </section>

          {/* ============================================================== */}
          {/* 5. QUICK ACTIONS SECTION */}
          {/* ============================================================== */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#FF9900]" />
                <span>Quick Actions</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {userRoleInActiveCommunity === 'manager' ? 'Manager Actions' : 'Member Shortcuts'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {isManagerOfActiveCommunity ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModalType('event')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF9900] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Plus size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        New Event
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Schedule meetup
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType('task')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <CheckSquare size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        Assign Task
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Cloud challenge
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType('project')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <FolderGit2 size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        New Project
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Initiative showcase
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      {copiedInvite ? <Check size={16} /> : <Share2 size={16} />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        {copiedInvite ? 'Copied!' : 'Share Invite'}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Copy chapter link
                      </span>
                    </div>
                  </button>

                  <Link
                    to="/members"
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Users size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        Members
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Manage roster
                      </span>
                    </div>
                  </Link>

                  <Link
                    to="/community"
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Settings size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        Community
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Chapter settings
                      </span>
                    </div>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/events"
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF9900] flex items-center justify-center mb-2">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        View Events
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Browse meetups
                      </span>
                    </div>
                  </Link>

                  <Link
                    to="/tasks"
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                      <CheckSquare size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        Cloud Tasks
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Submit challenges
                      </span>
                    </div>
                  </Link>

                  <Link
                    to="/projects"
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                      <FolderGit2 size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        Projects
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Explore initiatives
                      </span>
                    </div>
                  </Link>

                  <Link
                    to="/leaderboard"
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                      <Trophy size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        Leaderboard
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Track ranking
                      </span>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                      {copiedInvite ? <Check size={16} /> : <Share2 size={16} />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        {copiedInvite ? 'Copied!' : 'Share Chapter'}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Invite peers
                      </span>
                    </div>
                  </button>

                  <Link
                    to="/profile"
                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left flex flex-col justify-between cursor-pointer group shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-2">
                      <Award size={16} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800 font-mono">
                        My Badges
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Profile progress
                      </span>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </section>

          {/* ============================================================== */}
          {/* 6. TWO-COLUMN MIDDLE SECTION: HEALTH & WEEKLY PROGRESS */}
          {/* ============================================================== */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Left: Community Health */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-slate-900 flex items-center gap-2">
                      <Shield size={16} className="text-blue-600" />
                      <span>Community Health</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Scoped health indicators calculated from member engagement.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 text-slate-600 bg-slate-50 font-medium">
                    Health Status
                  </span>
                </div>

                {/* Health Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-3 my-4">
                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-center">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                      Active
                    </span>
                    <span className="text-xl font-bold font-mono text-emerald-800">
                      {metrics.community_health.active}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-center">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-amber-700 font-semibold">
                      Needs Attention
                    </span>
                    <span className="text-xl font-bold font-mono text-amber-800">
                      {metrics.community_health.needs_attention}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 font-semibold">
                      Inactive
                    </span>
                    <span className="text-xl font-bold font-mono text-slate-700">
                      {metrics.community_health.inactive}
                    </span>
                  </div>
                </div>

                {/* Clean Distribution Bar (No unnecessary heavy charts) */}
                {metrics.total_members > 0 && (
                  <div className="space-y-1.5 mt-4">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 font-medium">
                      <span>Roster Distribution</span>
                      <span>{metrics.total_members} Members</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
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
                        className="bg-slate-300 transition-all duration-300"
                        title={`Inactive: ${metrics.community_health.inactive}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: This Week's Progress */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-slate-900 flex items-center gap-2">
                      <TrendingUp size={16} className="text-teal-600" />
                      <span>This Week&apos;s Progress</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Task assignments and completions over the past 7 days.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 text-slate-600 bg-slate-50 font-medium">
                    Weekly
                  </span>
                </div>

                {/* Weekly Progress Breakdown */}
                <div className="grid grid-cols-4 gap-2.5 my-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-600 font-semibold">
                      Assigned
                    </span>
                    <span className="text-lg font-bold font-mono text-slate-800">
                      {metrics.weekly_progress.assigned}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-center">
                    <span className="block text-[9px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                      Completed
                    </span>
                    <span className="text-lg font-bold font-mono text-emerald-800">
                      {metrics.weekly_progress.completed}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-center">
                    <span className="block text-[9px] font-mono uppercase tracking-wider text-amber-700 font-semibold">
                      Pending
                    </span>
                    <span className="text-lg font-bold font-mono text-amber-800">
                      {metrics.weekly_progress.pending}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-orange-50/80 border border-orange-200/80 text-center">
                    <span className="block text-[9px] font-mono uppercase tracking-wider text-orange-700 font-semibold">
                      Rate
                    </span>
                    <span className="text-lg font-bold font-mono text-orange-700">
                      {metrics.weekly_progress.completion_percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mt-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 font-medium">
                    <span>Task Velocity</span>
                    <span>{metrics.weekly_progress.completion_percentage}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
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

          {/* ============================================================== */}
          {/* 7. NEEDS YOUR ATTENTION SECTION */}
          {/* ============================================================== */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-900 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-600" />
                  <span>Needs Your Attention</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Members with overdue task submissions or low completion rates.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                {metrics.needs_attention_list.length}{' '}
                {metrics.needs_attention_list.length === 1 ? 'member' : 'members'}
              </span>
            </div>

            {metrics.needs_attention_list.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {metrics.needs_attention_list.map((mem) => (
                  <div
                    key={mem.user_id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-mono font-bold text-slate-700 flex-shrink-0">
                        {mem.full_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-900 truncate">
                          {mem.full_name}
                        </span>
                        <span className="block text-[11px] font-mono text-slate-500 truncate">
                          {mem.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                          <AlertTriangle size={11} />
                          <span>{mem.reason}</span>
                        </span>
                        {mem.overdue_tasks > 0 && (
                          <span className="block text-[10px] font-mono text-rose-600 mt-0.5">
                            {mem.overdue_tasks} overdue task(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-7 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800 font-mono">
                  All members are on track!
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No community members have overdue tasks or critical completion warnings at this time.
                </p>
              </div>
            )}
          </section>

          {/* ============================================================== */}
          {/* 8. UPCOMING EVENTS & RECENT ACTIVITY (Tablet: 2-Col, Mobile: 1-Col) */}
          {/* ============================================================== */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Upcoming Events */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-slate-900 flex items-center gap-2">
                      <Calendar size={16} className="text-blue-600" />
                      <span>Upcoming Events</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Scheduled meetups and workshops for {activeCommunity?.name}.
                    </p>
                  </div>

                  {isManagerOfActiveCommunity && (
                    <button
                      type="button"
                      onClick={() => setModalType('event')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#FF9900] bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus size={12} />
                      <span>Add Event</span>
                    </button>
                  )}
                </div>

                {metrics.upcoming_events.length > 0 ? (
                  <div className="space-y-2.5">
                    {metrics.upcoming_events.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold text-slate-900 truncate">
                            {ev.title}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500">
                            <span className="text-orange-700 font-semibold capitalize">
                              [{ev.event_type}]
                            </span>
                            {ev.location && <span>· {ev.location}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[11px] font-mono font-medium text-slate-700 block">
                            {new Date(ev.event_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {new Date(ev.event_date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-7 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
                    <Calendar size={22} className="mx-auto mb-2 text-slate-400" />
                    <h4 className="text-xs font-bold text-slate-800 font-mono">
                      No upcoming events scheduled
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Create your first community event to engage student builders and host cloud sessions.
                    </p>
                    {isManagerOfActiveCommunity && (
                      <button
                        type="button"
                        onClick={() => setModalType('event')}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Create Event</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-slate-900 flex items-center gap-2">
                      <Activity size={16} className="text-[#FF9900]" />
                      <span>Recent Activity</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Actual milestones, task submissions, and chapter interactions.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 text-slate-600 bg-slate-50 font-medium">
                    Live Feed
                  </span>
                </div>

                {metrics.recent_activities.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {metrics.recent_activities.map((act) => (
                      <div key={act.id} className="py-2.5 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-orange-50 border border-orange-200 text-[#FF9900] flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 mt-0.5">
                          ✓
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-800 leading-snug">
                            {act.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
                            <span className="text-orange-700 font-medium capitalize">
                              {act.activity_type}
                            </span>
                            <span>·</span>
                            <span>{formatTimeAgo(act.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-7 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
                    <Activity size={22} className="mx-auto mb-2 text-slate-400" />
                    <h4 className="text-xs font-bold text-slate-800 font-mono">
                      No recent activities recorded yet
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Activity logs will populate as builders join your chapter, complete tasks, and earn achievements.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ============================================================== */}
          {/* 9. COMMUNITY ACHIEVEMENTS & HIGHLIGHTS */}
          {/* ============================================================== */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold font-mono text-slate-900 flex items-center gap-2">
                <Trophy size={16} className="text-[#FF9900]" />
                <span>Community Achievements & Highlights</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                Milestones
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-1">
                  <span>Chapter Status</span>
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <div className="text-base font-bold text-slate-900 font-mono">
                  Official AWS Chapter
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Registered under {activeCommunity?.institution_name || 'Academic Institution'}.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-1">
                  <span>Active Members</span>
                  <Users size={14} className="text-[#FF9900]" />
                </div>
                <div className="text-base font-bold text-slate-900 font-mono">
                  {metrics.active_members} Verified Builders
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Participating in collaborative projects and events.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-1">
                  <span>Task Completion</span>
                  <TrendingUp size={14} className="text-teal-600" />
                </div>
                <div className="text-base font-bold text-slate-900 font-mono">
                  {metrics.avg_task_completion}% Average Rate
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Weekly progress velocity tracking on challenges.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-1">
                  <span>Initiatives Built</span>
                  <FolderGit2 size={14} className="text-purple-600" />
                </div>
                <div className="text-base font-bold text-slate-900 font-mono">
                  {metrics.projects_count} Active Project(s)
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Architected with AWS cloud technologies.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ============================================================== */}
      {/* 10. QUICK ACTION MODAL FOR MANAGERS */}
      {/* ============================================================== */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold font-mono text-slate-900 capitalize">
              Add New {modalType}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Publish to {activeCommunity?.name}
            </p>

            <form onSubmit={handleQuickCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder={
                    modalType === 'event'
                      ? 'e.g. AWS Cloud Practitioner Hands-on Workshop'
                      : modalType === 'task'
                      ? 'e.g. Deploy Static Site on Amazon S3'
                      : 'e.g. Serverless Notes App'
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  placeholder="Details and learning objectives..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {modalType === 'event'
                    ? 'Event Date & Time'
                    : modalType === 'task'
                    ? 'Points (e.g. 50)'
                    : 'GitHub URL'}
                </label>
                <input
                  type={modalType === 'event' ? 'datetime-local' : 'text'}
                  value={modalExtra}
                  onChange={(e) => setModalExtra(e.target.value)}
                  placeholder={
                    modalType === 'task'
                      ? '50'
                      : modalType === 'project'
                      ? 'https://github.com/aws/...'
                      : ''
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal || !modalTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#FF9900] hover:bg-[#EC7211] shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingModal && <Loader2 size={13} className="animate-spin" />}
                  <span>Save {modalType}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
