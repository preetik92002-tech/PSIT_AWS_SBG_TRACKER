import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Globe2,
  Activity,
  Radio,
  Users,
  FolderOpen,
  Calendar,
  Zap,
  Crown,
  RefreshCw,
  Search,
  X,
  LayoutGrid,
  ExternalLink,
  Building2,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useCommunity } from '@/context/CommunityContext'
import { BuilderWorld } from '@/components/world/BuilderWorld'
import { BuilderAvatar, CommunityImage } from '@/components/ui'
import { generateAppearance } from '@/components/world/generateAppearance'
import type { WorldMember, WorldActivity, WorldHudStats } from '@/components/world/worldTypes'
import { getLevelProgress, timeAgo, formatNumber } from '@/utils/cn'

const XP_PER_LEVEL = 500

const FILTER_OPTIONS = ['All Builders', 'Manager', 'Active', 'Needs Attention'] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]

type ViewMode = 'canvas' | 'grid'

// ─── Stat Card ─────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string
  value: string | number
  icon: React.ReactNode
  sub?: string
  color?: string
}> = ({ label, value, icon, sub, color = '#FF9900' }) => (
  <div className="p-4 rounded-xl border border-[#1F293A] bg-[#121824] shadow-2xs hover:border-slate-600 transition-colors">
    <div className="flex items-start justify-between gap-1 mb-1.5">
      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{label}</p>
      <div className="text-slate-400 shrink-0" style={{ color }}>{icon}</div>
    </div>
    <p className="font-mono font-bold text-xl text-white tracking-tight leading-none mb-1">
      {value}
    </p>
    {sub && <p className="text-[11px] font-mono text-slate-400">{sub}</p>}
  </div>
)

// ─── Main Builder World Page ────────────────────────────────────────────────

export const BuilderWorldPage: React.FC = () => {
  const navigate = useNavigate()
  const { activeCommunity } = useCommunity()

  const [members, setMembers] = useState<WorldMember[]>([])
  const [activities, setActivities] = useState<WorldActivity[]>([])
  const [hud, setHud] = useState<WorldHudStats>({
    memberCount: 0,
    projectCount: 0,
    eventCount: 0,
    activeThisWeek: 0,
  })

  // Detect mobile screen for accessible grid view representation
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'canvas'
  )

  const [filter, setFilter] = useState<FilterOption>('All Builders')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Real Data Loader ───────────────────────────────────────────────────────
  const loadWorldData = useCallback(async () => {
    if (!activeCommunity?.id) return

    setLoading(true)
    setError(null)

    try {
      const communityId = activeCommunity.id
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // 1) All real community members + profiles joined directly
      const { data: membersRaw, error: membersErr } = await supabase
        .from('community_members')
        .select(`
          user_id,
          role,
          joined_at,
          profiles (
            id,
            full_name,
            email,
            avatar_url,
            bio,
            institution_name,
            aws_builder_alias
          )
        `)
        .eq('community_id', communityId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true })

      if (membersErr) throw membersErr

      // 2) Real points from points_transactions ledger
      const { data: pointsRaw } = await supabase
        .from('points_transactions')
        .select('user_id, points, created_at')
        .eq('community_id', communityId)
        .gt('points', 0)

      const xpMap: Record<string, number> = {}
      const weeklyXpMap: Record<string, number> = {}

      for (const row of pointsRaw ?? []) {
        const uid = row.user_id
        const pts = Number(row.points) || 0
        xpMap[uid] = (xpMap[uid] ?? 0) + pts

        if (row.created_at && row.created_at >= oneWeekAgo) {
          weeklyXpMap[uid] = (weeklyXpMap[uid] ?? 0) + pts
        }
      }

      // 3) Fallback / supplement with completed task assignments
      const { data: taskXpRaw } = await supabase
        .from('community_task_assignments')
        .select('user_id, community_tasks(points), status, completed_at, updated_at')
        .eq('community_id', communityId)
        .eq('status', 'completed')

      for (const row of taskXpRaw ?? []) {
        const uid = row.user_id
        const pts = (row.community_tasks as { points?: number } | null)?.points ?? 50
        if (!xpMap[uid] || xpMap[uid] === 0) {
          xpMap[uid] = (xpMap[uid] ?? 0) + pts
        }
        const taskDate = row.completed_at || row.updated_at
        if (taskDate && taskDate >= oneWeekAgo && (!weeklyXpMap[uid] || weeklyXpMap[uid] === 0)) {
          weeklyXpMap[uid] = (weeklyXpMap[uid] ?? 0) + pts
        }
      }

      // 4) Build real WorldMember list
      const worldMembers: WorldMember[] = (membersRaw ?? []).map((row) => {
        const profile = row.profiles as {
          id?: string
          full_name: string | null
          email: string
          avatar_url: string | null
          bio: string | null
          institution_name: string | null
          aws_builder_alias: string | null
        } | null

        const uid = row.user_id
        const xp = xpMap[uid] ?? 0
        const weeklyXp = weeklyXpMap[uid] ?? 0
        const level = Math.floor(xp / XP_PER_LEVEL) + 1

        return {
          id: uid,
          name: profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Builder',
          email: profile?.email ?? '',
          avatarUrl: profile?.avatar_url ?? null,
          role: row.role as 'manager' | 'member',
          joinedAt: row.joined_at,
          xp,
          weeklyXp,
          level,
          appearance: generateAppearance(uid),
          bio: profile?.bio ?? null,
          institution: profile?.institution_name ?? activeCommunity.institution_name ?? null,
          awsAlias: profile?.aws_builder_alias ?? null,
        }
      })

      setMembers(worldMembers)

      // 5) HUD Stats from real database aggregates
      const { count: projectCount } = await supabase
        .from('community_projects')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId)

      const { count: eventCount } = await supabase
        .from('community_events')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId)

      setHud({
        memberCount: worldMembers.length,
        projectCount: projectCount ?? 0,
        eventCount: eventCount ?? 0,
        activeThisWeek: worldMembers.filter((m) => m.weeklyXp > 0).length,
      })

      // 6) Real activity log
      const { data: actRaw } = await supabase
        .from('community_activities')
        .select(`
          id,
          user_id,
          activity_type,
          description,
          created_at,
          profiles (full_name, email)
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(10)

      const acts: WorldActivity[] = (actRaw ?? []).map((a) => {
        const p = a.profiles as { full_name?: string | null; email?: string } | null
        return {
          id: a.id,
          userId: a.user_id,
          userName: p?.full_name ?? p?.email?.split('@')[0] ?? 'Builder',
          activityType: a.activity_type,
          description: a.description,
          createdAt: a.created_at,
        }
      })

      setActivities(acts)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load world data'
      console.error('[BuilderWorldPage]', err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [activeCommunity])

  useEffect(() => {
    loadWorldData()
  }, [loadWorldData])

  // Open member profile directly upon click
  const handleSelectMember = useCallback(
    (member: WorldMember) => {
      navigate(`/members/${member.id}`)
    },
    [navigate]
  )

  // Filtered members for both Canvas and Accessible Grid
  const visibleMembers = useMemo(() => {
    let list = members

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.institution ?? '').toLowerCase().includes(q) ||
          (m.awsAlias ?? '').toLowerCase().includes(q)
      )
    }

    if (filter === 'Manager') {
      list = list.filter((m) => m.role === 'manager')
    } else if (filter === 'Active') {
      list = list.filter((m) => m.weeklyXp > 0)
    } else if (filter === 'Needs Attention') {
      list = list.filter((m) => m.weeklyXp === 0)
    }

    return list
  }, [members, filter, search])

  // Top builders calculation
  const topBuilders = useMemo(() => {
    return [...members]
      .sort((a, b) => b.weeklyXp - a.weeklyXp || b.xp - a.xp)
      .slice(0, 6)
  }, [members])

  const maxWeeklyXp = topBuilders[0]?.weeklyXp || 1

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. COMMUNITY HERO HEADER (IMAGE, NAME, INSTITUTION)                 */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <CommunityImage
            src={activeCommunity?.logo_url || activeCommunity?.image_url}
            name={activeCommunity?.name}
            shortName={activeCommunity?.short_name}
            size="lg"
            className="ring-2 ring-[#FF9900]/40 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 font-semibold uppercase tracking-wider">
                Builder World
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 font-mono text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE COMMUNITY
              </div>
            </div>

            <h1 className="font-mono font-bold text-lg md:text-xl text-white tracking-tight truncate">
              {activeCommunity?.name || 'Community World'}
            </h1>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5 truncate">
              <Building2 size={13} className="text-[#FF9900] shrink-0" />
              <span className="truncate">
                {activeCommunity?.institution_name || activeCommunity?.institution || 'Academic & Cloud Chapter'}
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* View mode toggle: Canvas vs Accessible Grid */}
          <div className="bg-[#0E141F] p-1 rounded-lg border border-[#1F293A] flex items-center gap-1">
            <button
              onClick={() => setViewMode('canvas')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'canvas'
                  ? 'bg-[#FF9900] text-black font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Interactive 2.5D Builder Canvas"
            >
              <Globe2 size={13} />
              <span className="hidden sm:inline">World Canvas</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-[#FF9900] text-black font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Accessible Member Roster Grid"
            >
              <LayoutGrid size={13} />
              <span>Roster Grid</span>
            </button>
          </div>

          <button
            onClick={loadWorldData}
            disabled={loading}
            className="p-2 rounded-lg bg-[#0E141F] border border-[#1F293A] text-slate-400 hover:text-white hover:bg-[#1A2234] transition-colors disabled:opacity-50"
            title="Refresh World"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-xs font-mono text-red-300">
          {error}
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. REAL DATABASE HUD STATS                                          */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Builders"
          value={loading ? '…' : hud.memberCount}
          icon={<Users size={16} />}
          sub={`${hud.activeThisWeek} active this week`}
          color="#FF9900"
        />
        <StatCard
          label="Community XP"
          value={loading ? '…' : formatNumber(members.reduce((s, m) => s + m.xp, 0))}
          icon={<Zap size={16} />}
          sub="Ledger verified points"
          color="#38BDF8"
        />
        <StatCard
          label="Cloud Projects"
          value={loading ? '…' : hud.projectCount}
          icon={<FolderOpen size={16} />}
          sub="Active & delivered"
          color="#10B981"
        />
        <StatCard
          label="Chapter Events"
          value={loading ? '…' : hud.eventCount}
          icon={<Calendar size={16} />}
          sub="Workshops & live streams"
          color="#A855F7"
        />
      </div>

      {/* =================================================================== */}
      {/* 3. SEARCH & FILTER CONTROLS                                         */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or @alias…"
            className="w-full bg-[#121824] border border-[#1F293A] pl-9 pr-8 py-2 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#FF9900]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                filter === opt
                  ? 'bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/40 font-semibold'
                  : 'bg-[#121824] text-slate-400 border border-[#1F293A] hover:text-white hover:border-slate-600'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. VISUAL BUILDER WORLD (CANVAS OR ACCESSIBLE GRID)                 */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-[#1F293A] bg-[#121824] overflow-hidden shadow-xs">
        {/* World Header Tab */}
        <div className="px-4 py-3 border-b border-[#1F293A] bg-[#0E141F] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs text-white font-bold tracking-wider uppercase">
              {viewMode === 'canvas' ? 'Interactive 2.5D World' : 'Accessible Roster Grid'}
            </span>
            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
              · {visibleMembers.length} builder{visibleMembers.length !== 1 ? 's' : ''} in cohort
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {viewMode === 'canvas' ? (
              <span className="hidden sm:inline">Hover to inspect · Click to open profile</span>
            ) : (
              <span>Click any card to open profile</span>
            )}
          </div>
        </div>

        {/* Mode A: Canvas World */}
        {viewMode === 'canvas' && (
          <div>
            {loading ? (
              <div className="h-[540px] flex items-center justify-center bg-[#080B11]">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-2 border-[#FF9900] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-mono text-xs text-slate-400">Loading Builder World…</p>
                </div>
              </div>
            ) : (
              <BuilderWorld
                members={visibleMembers}
                onSelectMember={handleSelectMember}
                filter={filter}
                search={search}
              />
            )}
          </div>
        )}

        {/* Mode B: Accessible Grid Representation (Responsive & Mobile-First) */}
        {viewMode === 'grid' && (
          <div className="p-4 sm:p-6 bg-[#0B0F17]">
            {visibleMembers.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-mono text-xs">
                No builders found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleMembers.map((member) => {
                  const isManager = member.role === 'manager'
                  const { progress } = getLevelProgress(member.xp)

                  return (
                    <div
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleSelectMember(member)
                        }
                      }}
                      className="p-4 rounded-xl border border-[#1F293A] bg-[#121824] hover:border-[#FF9900]/60 hover:bg-[#161F2E] transition-all cursor-pointer group flex flex-col justify-between space-y-3 focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                    >
                      {/* Top: Avatar & Manager marker */}
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <BuilderAvatar
                            src={member.avatarUrl}
                            name={member.name}
                            alias={member.awsAlias}
                            isManager={isManager}
                            size="lg"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm text-white group-hover:text-[#FF9900] transition-colors truncate">
                              {member.name}
                            </span>
                          </div>

                          {/* AWS Builder Alias */}
                          {member.awsAlias ? (
                            <span className="font-mono text-xs text-[#FF9900] font-medium block truncate">
                              @{member.awsAlias}
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-400 block truncate">
                              {member.email}
                            </span>
                          )}

                          {/* Role Tag */}
                          <div className="mt-1">
                            {isManager ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-amber-500/20 text-[#FF9900] border border-amber-500/40">
                                👑 Manager
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded text-slate-400 bg-slate-800">
                                Lv.{member.level} Builder
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Institution */}
                      <div className="text-[10px] font-mono text-slate-400 truncate pt-2 border-t border-[#1F293A]">
                        {member.institution || 'Cloud Community'}
                      </div>

                      {/* Bottom XP & Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Total XP</span>
                          <span className="text-white font-bold">{member.xp.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-[#0E141F] h-1.5 rounded-full overflow-hidden border border-[#1F293A]">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(5, progress)}%`,
                              backgroundColor: isManager ? '#FF9900' : '#38BDF8',
                            }}
                          />
                        </div>
                      </div>

                      {/* View Profile Action Link */}
                      <div className="text-[10px] font-mono text-sky-400 group-hover:text-sky-300 flex items-center justify-end gap-1 pt-1 font-medium">
                        <span>View Profile</span>
                        <ExternalLink size={10} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 5. RECENT ACTIVITY & TOP BUILDERS SUMMARY                           */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Activity Stream */}
        <div className="lg:col-span-2 rounded-xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F293A]">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Activity size={14} className="text-[#FF9900]" />
              Recent Chapter Activity
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Real-time</span>
          </div>

          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-xs font-mono text-slate-400 py-6 text-center">
                No recent chapter activity recorded.
              </p>
            ) : (
              activities.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#0E141F] border border-[#1F293A]/60 text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BuilderAvatar name={act.userName} size="xs" />
                    <span className="text-white font-medium truncate">{act.userName}</span>
                    <span className="text-slate-400 truncate">{act.description}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {timeAgo(act.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Weekly Builders */}
        <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#1F293A]">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Crown size={14} className="text-amber-400" />
              Weekly Top Builders
            </h2>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">Velocity</span>
          </div>

          <div className="space-y-2.5">
            {topBuilders.length === 0 ? (
              <p className="text-xs font-mono text-slate-400 py-6 text-center">
                No points recorded this week.
              </p>
            ) : (
              topBuilders.map((b, idx) => (
                <div
                  key={b.id}
                  onClick={() => handleSelectMember(b)}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[#0E141F] border border-[#1F293A]/60 hover:border-slate-600 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center font-mono font-bold text-xs text-slate-400">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                    </span>
                    <BuilderAvatar
                      src={b.avatarUrl}
                      name={b.name}
                      alias={b.awsAlias}
                      isManager={b.role === 'manager'}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <span className="block font-mono text-xs font-semibold text-white group-hover:text-[#FF9900] truncate">
                        {b.name}
                      </span>
                      {b.awsAlias && (
                        <span className="block font-mono text-[9px] text-[#FF9900] truncate">
                          @{b.awsAlias}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">
                    +{b.weeklyXp > 0 ? b.weeklyXp : b.xp} XP
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuilderWorldPage
