import React, { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useCommunity } from '@/context/CommunityContext'
import { BuilderWorld } from '@/components/world/BuilderWorld'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { generateAppearance } from '@/components/world/generateAppearance'
import type { WorldMember, WorldActivity, WorldHudStats } from '@/components/world/worldTypes'
import { getLevelProgress, timeAgo, formatNumber } from '@/utils/cn'

// ─── XP constants (match getLevelProgress in utils/cn) ────────────────────
const XP_PER_LEVEL = 500

// ─── Filter options ────────────────────────────────────────────────────────
const FILTER_OPTIONS = ['All Builders', 'Manager', 'Active', 'Needs Attention'] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]

// ─── Member profile modal ──────────────────────────────────────────────────

const MemberModal: React.FC<{ member: WorldMember }> = ({ member }) => {
  const { progress } = getLevelProgress(member.xp)
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <Avatar initials={initials} src={member.avatarUrl} size="lg" />
          <div className="flex flex-col items-center gap-1">
            <span className="level-pip">Lv.{member.level}</span>
            {member.role === 'manager' && (
              <span className="font-mono text-[8px] text-yellow-400 flex items-center gap-0.5">
                <Crown size={8} /> Manager
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-mono font-bold text-base text-text-primary">{member.name}</h3>
          <p className="font-mono text-[11px] text-accent">{member.email}</p>
          {member.institution && (
            <p className="font-mono text-[10px] text-text-muted mt-0.5">{member.institution}</p>
          )}
          {member.bio && (
            <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">{member.bio}</p>
          )}

          {/* Level progress */}
          <div className="mt-3">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-text-muted">Level progress</span>
              <span className="font-mono text-[10px] text-accent-bright">
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="xp-bar h-[4px]">
              <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total XP', value: member.xp.toLocaleString() },
          { label: 'Level', value: `Lv.${member.level}` },
          { label: 'Weekly XP', value: `+${member.weeklyXp}` },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-surface-secondary border border-border p-2 text-center"
          >
            <div className="font-mono font-bold text-sm text-text-primary">{s.value}</div>
            <div className="font-mono text-[9px] text-text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* AWS Builder alias */}
      {member.awsAlias && (
        <div className="bg-surface-secondary border border-border p-3">
          <div className="font-mono text-[9px] text-text-muted uppercase tracking-wider mb-1">
            AWS Builder ID
          </div>
          <div className="font-mono text-[12px] text-accent-bright">{member.awsAlias}</div>
        </div>
      )}

      {/* Joined */}
      <div className="font-mono text-[9px] text-text-muted">
        Member since {new Date(member.joinedAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </div>
    </div>
  )
}

// ─── HUD stat card ─────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string
  value: string | number
  icon: React.ReactNode
  sub?: string
  variant?: 'accent' | 'orange' | 'success' | 'info'
}> = ({ label, value, icon, sub, variant = 'accent' }) => (
  <div className={`stat-card ${variant}`}>
    <div className="flex items-start justify-between gap-1">
      <div className="min-w-0">
        <p className="code-label text-[9px] uppercase tracking-wider mb-1">{label}</p>
        <p className="font-mono font-bold text-lg leading-none text-text-primary">{value}</p>
        {sub && <p className="code-label text-[9px] mt-1 opacity-70">{sub}</p>}
      </div>
      <div className="text-text-muted opacity-40 flex-shrink-0">{icon}</div>
    </div>
  </div>
)

// ─── Page ──────────────────────────────────────────────────────────────────

export const BuilderWorldPage: React.FC = () => {
  const { activeCommunity } = useCommunity()

  const [members, setMembers]             = useState<WorldMember[]>([])
  const [activities, setActivities]       = useState<WorldActivity[]>([])
  const [hud, setHud]                     = useState<WorldHudStats>({
    memberCount: 0,
    projectCount: 0,
    eventCount: 0,
    activeThisWeek: 0,
  })
  const [selectedMember, setSelectedMember] = useState<WorldMember | null>(null)
  const [filter, setFilter]               = useState<FilterOption>('All Builders')
  const [search, setSearch]               = useState('')
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  // ── Data loader ─────────────────────────────────────────────────────────

  const loadWorldData = useCallback(async () => {
    if (!activeCommunity) return

    setLoading(true)
    setError(null)

    try {
      const communityId = activeCommunity.id
      const oneWeekAgo  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // 1) All community members + their profiles in one join query
      const { data: membersRaw, error: membersErr } = await supabase
        .from('community_members')
        .select(`
          user_id,
          role,
          joined_at,
          profiles (
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

      // 2) Task XP — sum of points for completed tasks per user in this community
      const { data: taskXpRaw, error: taskXpErr } = await supabase
        .from('community_task_assignments')
        .select('user_id, community_tasks(points), status, completed_at')
        .eq('community_id', communityId)

      if (taskXpErr) throw taskXpErr

      // Aggregate XP per user
      const xpMap: Record<string, number>       = {}
      const weeklyXpMap: Record<string, number> = {}

      for (const row of taskXpRaw ?? []) {
        if (row.status !== 'completed') continue
        const uid    = row.user_id
        const points = (row.community_tasks as { points?: number } | null)?.points ?? 0
        xpMap[uid]   = (xpMap[uid] ?? 0) + points

        // Weekly XP
        if (row.completed_at && row.completed_at >= oneWeekAgo) {
          weeklyXpMap[uid] = (weeklyXpMap[uid] ?? 0) + points
        }
      }

      // 3) Event attendance XP (25 XP per event attended)
      const { data: eventsRaw } = await supabase
        .from('community_events')
        .select('id')
        .eq('community_id', communityId)

      // For simplicity map each member who has attended any event gets +25 per event
      // (No attendance table in current schema — we'll skip for now and use task XP only)
      void eventsRaw

      // 4) Build WorldMember array
      const worldMembers: WorldMember[] = (membersRaw ?? []).map((row) => {
        const profile = row.profiles as {
          full_name:           string | null
          email:               string
          avatar_url:          string | null
          bio:                 string | null
          institution_name:    string | null
          aws_builder_alias:   string | null
        } | null

        const uid      = row.user_id
        const xp       = xpMap[uid] ?? 0
        const weeklyXp = weeklyXpMap[uid] ?? 0
        const level    = Math.floor(xp / XP_PER_LEVEL) + 1

        return {
          id:          uid,
          name:        profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Builder',
          email:       profile?.email ?? '',
          avatarUrl:   profile?.avatar_url ?? null,
          role:        row.role as 'manager' | 'member',
          joinedAt:    row.joined_at,
          xp,
          weeklyXp,
          level,
          appearance:  generateAppearance(uid),
          bio:         profile?.bio ?? null,
          institution: profile?.institution_name ?? null,
          awsAlias:    profile?.aws_builder_alias ?? null,
        }
      })

      setMembers(worldMembers)

      // 5) HUD stats
      const { count: projectCount } = await supabase
        .from('community_projects')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId)

      const { count: eventCount } = await supabase
        .from('community_events')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId)

      setHud({
        memberCount:    worldMembers.length,
        projectCount:   projectCount ?? 0,
        eventCount:     eventCount ?? 0,
        activeThisWeek: worldMembers.filter((m) => m.weeklyXp > 0).length,
      })

      // 6) Recent activities
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
        .limit(12)

      const acts: WorldActivity[] = (actRaw ?? []).map((a) => {
        const p = a.profiles as { full_name?: string | null; email?: string } | null
        return {
          id:           a.id,
          userId:       a.user_id,
          userName:     p?.full_name ?? p?.email?.split('@')[0] ?? 'Someone',
          activityType: a.activity_type,
          description:  a.description,
          createdAt:    a.created_at,
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

  // ── Computed for "Top Builders this week" panel ─────────────────────────
  const topBuilders = [...members]
    .sort((a, b) => b.weeklyXp - a.weeklyXp || b.xp - a.xp)
    .slice(0, 7)

  const maxWeeklyXp = topBuilders[0]?.weeklyXp || 1

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}
          >
            <Globe2 size={15} style={{ color: 'var(--accent-bright)' }} />
          </div>
          <div>
            <h1 className="font-mono font-bold text-sm text-text-primary tracking-tight">
              BUILDER WORLD
            </h1>
            <p className="font-mono text-[10px] text-text-muted">
              {activeCommunity?.name ?? 'Community'} ·{' '}
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-secondary border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-slow" />
            <span className="font-mono text-[10px] text-text-secondary">LIVE</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-surface-secondary border border-border">
            <Radio size={10} className="text-accent-secondary" />
            <span className="font-mono text-[10px] text-text-muted">
              {hud.activeThisWeek} active this week
            </span>
          </div>
          <button
            onClick={loadWorldData}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-secondary border border-border transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">

          {/* Error banner */}
          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded p-3">
              <p className="font-mono text-[11px] text-danger">{error}</p>
            </div>
          )}

          {/* HUD Stats row */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            <StatCard
              label="Total Builders"
              value={loading ? '…' : hud.memberCount}
              icon={<Users size={16} />}
              variant="accent"
              sub={`${hud.activeThisWeek} active this week`}
            />
            <StatCard
              label="Total XP"
              value={loading ? '…' : formatNumber(members.reduce((s, m) => s + m.xp, 0))}
              icon={<Zap size={16} />}
              variant="orange"
              sub="community earned"
            />
            <StatCard
              label="Projects"
              value={loading ? '…' : hud.projectCount}
              icon={<FolderOpen size={16} />}
              variant="info"
              sub="active & completed"
            />
            <StatCard
              label="Events"
              value={loading ? '…' : hud.eventCount}
              icon={<Calendar size={16} />}
              variant="success"
              sub="organized"
            />
          </motion.div>

          {/* Builder World */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <SectionHeader
              title="Builder World"
              subtitle="— hover to inspect · click to view profile"
              icon={<Globe2 size={13} />}
              action={
                <span className="font-mono text-[10px] text-text-muted">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
              }
            />

            {/* Search + Filter bar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search
                  size={11}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search builders…"
                  className="w-full bg-surface-secondary border border-border pl-7 pr-7 py-1.5 font-mono text-[11px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Filter pills */}
              <div className="flex gap-1 flex-wrap">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFilter(opt)}
                    className={`font-mono text-[10px] px-2.5 py-1.5 border transition-colors ${
                      filter === opt
                        ? 'bg-accent/15 text-accent border-accent/40 font-semibold'
                        : 'bg-surface-secondary text-text-muted border-border hover:text-text-primary hover:border-border-hover'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* World container */}
            <div
              className="border border-border overflow-hidden"
              style={{
                background: 'var(--world-bg)',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4)',
              }}
            >
              {/* World header bar */}
              <div
                className="flex items-center gap-2 px-3 py-2 border-b"
                style={{ borderColor: 'var(--border)', background: 'rgba(8,10,16,0.6)' }}
              >
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--danger)' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--warning)' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--success)' }} />
                </div>
                <span className="font-mono text-[10px] text-text-muted">
                  sbg://world/{activeCommunity?.short_name?.toLowerCase() ?? 'community'} ·{' '}
                  {members.filter((m) => m.weeklyXp > 0).length} active builder
                  {members.filter((m) => m.weeklyXp > 0).length !== 1 ? 's' : ''}
                </span>
              </div>

              {loading ? (
                <div
                  className="flex items-center justify-center"
                  style={{ height: 530 }}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="font-mono text-[10px] text-text-muted">Loading builder world…</p>
                  </div>
                </div>
              ) : (
                <BuilderWorld
                  members={members}
                  onSelectMember={setSelectedMember}
                  filter={filter}
                  search={search}
                />
              )}
            </div>
          </motion.div>

          {/* Bottom section: Activity + Top Builders */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.16 }}
          >
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <SectionHeader
                title="Recent Activity"
                subtitle="— community feed"
                icon={<Activity size={13} />}
              />
              <div className="card p-0 overflow-hidden">
                {activities.length === 0 ? (
                  <div className="px-4 py-6 text-center font-mono text-[10px] text-text-muted">
                    {loading ? 'Loading…' : 'No recent activity yet.'}
                  </div>
                ) : (
                  activities.slice(0, 8).map((act, i) => (
                    <div
                      key={act.id}
                      className="flex items-start gap-3 px-4 py-2.5 border-b border-border"
                      style={{
                        borderColor: i < activities.length - 1 ? 'var(--border-subtle)' : 'transparent',
                      }}
                    >
                      <Avatar
                        initials={act.userName.slice(0, 2).toUpperCase()}
                        size="sm"
                        className="flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-mono font-semibold text-[11px] text-text-primary">
                            {act.userName}
                          </span>
                          <span className="font-mono text-[10px] text-text-secondary truncate">
                            {act.description}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-text-muted">
                          {timeAgo(act.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Builders this week */}
            <div>
              <SectionHeader title="Top Builders" subtitle="— this week" />
              <div className="card p-0 overflow-hidden">
                {topBuilders.length === 0 ? (
                  <div className="px-4 py-6 text-center font-mono text-[10px] text-text-muted">
                    {loading ? 'Loading…' : 'No XP data yet.'}
                  </div>
                ) : (
                  topBuilders.map((m, i) => (
                    <motion.div
                      key={m.id}
                      className="flex items-center gap-3 px-3 py-2.5 border-b border-border cursor-pointer"
                      style={{ borderColor: 'var(--border-subtle)' }}
                      whileHover={{ backgroundColor: 'var(--surface-secondary)' }}
                      onClick={() => setSelectedMember(m)}
                    >
                      <span
                        className="font-mono text-[10px] font-bold flex-shrink-0"
                        style={{
                          color:
                            i === 0
                              ? 'var(--warning)'
                              : i === 1
                              ? 'var(--text-secondary)'
                              : 'var(--text-muted)',
                          width: 16,
                          textAlign: 'right',
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-medium text-text-primary truncate">
                            {m.name.split(' ')[0]}
                            {m.role === 'manager' && (
                              <Crown size={8} className="inline ml-1 text-yellow-400" />
                            )}
                          </span>
                          <span className="font-mono text-[10px] text-success flex-shrink-0">
                            {m.weeklyXp > 0 ? `+${m.weeklyXp}` : `${m.xp} XP`}
                          </span>
                        </div>
                        <div className="mt-1 xp-bar" style={{ height: 2 }}>
                          <div
                            className="xp-bar-fill"
                            style={{
                              width: `${(m.weeklyXp / maxWeeklyXp) * 100}%`,
                              background: i === 0 ? 'var(--warning)' : 'var(--accent)',
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Member Profile Modal */}
      <Modal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title={selectedMember ? `${selectedMember.name}` : ''}
        subtitle={
          selectedMember
            ? `${selectedMember.role === 'manager' ? '👑 Manager' : 'Member'} · Level ${selectedMember.level}`
            : ''
        }
        size="lg"
      >
        {selectedMember && <MemberModal member={selectedMember} />}
      </Modal>
    </div>
  )
}
