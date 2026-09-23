import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Calendar,
  CheckSquare,
  FolderGit2,
  Users,
  Building2,
  ArrowUp,
  RefreshCw,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

type TimeFilter = 'This Week' | 'This Month' | 'All Time'
type CategoryFilter = 'Overall' | 'AWS Badges' | 'Tasks' | 'Events' | 'Projects'

interface LeaderboardBuilderRow {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  memberTag: string
  role: string
  points: number
  progressPct: number
  tasksCompleted: number
  badgesCount: number
  eventsAttended: number
  projectsCount: number
}

export const Leaderboard: React.FC = () => {
  const navigate = useNavigate()
  const { activeCommunity } = useCommunity()
  const { user } = useAuth()

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('All Time')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('Overall')
  const [builders, setBuilders] = useState<LeaderboardBuilderRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch strictly community-scoped activity & rankings
  const fetchLeaderboard = async () => {
    if (!activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // 1. Fetch active community members
      const { data: membersData, error: memErr } = await supabase
        .from('community_members')
        .select(`
          user_id,
          role,
          status,
          profiles!community_members_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            aws_builder_alias
          )
        `)
        .eq('community_id', activeCommunity.id)
        .eq('status', 'active')

      if (memErr) throw memErr

      // Calculate time boundary
      let sinceDate: Date | null = null
      if (timeFilter === 'This Week') {
        sinceDate = new Date()
        sinceDate.setDate(sinceDate.getDate() - 7)
      } else if (timeFilter === 'This Month') {
        sinceDate = new Date()
        sinceDate.setMonth(sinceDate.getMonth() - 1)
      }

      // 2. Fetch completed task assignments in this community
      let tasksQuery = supabase
        .from('community_task_assignments')
        .select(`
          user_id,
          status,
          completed_at,
          community_tasks (
            points
          )
        `)
        .eq('community_id', activeCommunity.id)
        .eq('status', 'completed')

      if (sinceDate) {
        tasksQuery = tasksQuery.gte('completed_at', sinceDate.toISOString())
      }

      const { data: tasksData } = await tasksQuery

      // 3. Fetch event RSVPs in this community
      let rsvpQuery = supabase
        .from('community_activities')
        .select('user_id, created_at')
        .eq('community_id', activeCommunity.id)
        .eq('activity_type', 'joined event')

      if (sinceDate) {
        rsvpQuery = rsvpQuery.gte('created_at', sinceDate.toISOString())
      }

      const { data: rsvpData } = await rsvpQuery

      // 4. Fetch projects in this community
      const { data: projectsData } = await supabase
        .from('community_projects')
        .select('created_by')
        .eq('community_id', activeCommunity.id)

      // Map metrics per user
      const userTasksMap = new Map<string, { count: number; points: number }>()
      if (tasksData) {
        for (const t of tasksData) {
          const cur = userTasksMap.get(t.user_id) || { count: 0, points: 0 }
          const pts = (t.community_tasks as any)?.points || 50
          cur.count += 1
          cur.points += pts
          userTasksMap.set(t.user_id, cur)
        }
      }

      const userRsvpsMap = new Map<string, number>()
      if (rsvpData) {
        for (const r of (rsvpData as any[])) {
          userRsvpsMap.set(r.user_id, (userRsvpsMap.get(r.user_id) || 0) + 1)
        }
      }

      const userProjectsMap = new Map<string, number>()
      if (projectsData) {
        for (const p of projectsData) {
          if (p.created_by) {
            userProjectsMap.set(p.created_by, (userProjectsMap.get(p.created_by) || 0) + 1)
          }
        }
      }

      // Compile rows
      const list: LeaderboardBuilderRow[] = (membersData || []).map((m: any) => {
        const p = m.profiles || {}
        const uid = m.user_id
        const tInfo = userTasksMap.get(uid) || { count: 0, points: 0 }
        const rsvpCount = userRsvpsMap.get(uid) || 0
        const projCount = userProjectsMap.get(uid) || 0

        // Badges calculation
        let badges = 1
        if (tInfo.count >= 5) badges = 4
        else if (tInfo.count >= 2) badges = 2

        // Total points = task points + event attendance points (25 XP each)
        const totalPoints = tInfo.points + rsvpCount * 25

        // Progress percentage
        const progress = Math.min(100, Math.max(15, tInfo.count * 20))

        const name = p.full_name || p.email?.split('@')[0] || 'Community Builder'
        const memberTag = p.aws_builder_alias
          ? `@${p.aws_builder_alias}`
          : `MEM-${uid.slice(0, 4).toUpperCase()}`

        return {
          userId: uid,
          fullName: name,
          email: p.email || '',
          avatarUrl: p.avatar_url || null,
          memberTag,
          role: m.role,
          points: totalPoints,
          progressPct: progress,
          tasksCompleted: tInfo.count,
          badgesCount: badges,
          eventsAttended: rsvpCount,
          projectsCount: projCount,
        }
      })

      setBuilders(list)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to query community leaderboard.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [activeCommunity?.id, timeFilter])

  // Sorting according to selected CategoryFilter
  const sortedBuilders = useMemo(() => {
    const list = [...builders]

    switch (categoryFilter) {
      case 'AWS Badges':
        list.sort((a, b) => b.badgesCount - a.badgesCount || b.points - a.points)
        break
      case 'Tasks':
        list.sort((a, b) => b.tasksCompleted - a.tasksCompleted || b.points - a.points)
        break
      case 'Events':
        list.sort((a, b) => b.eventsAttended - a.eventsAttended || b.points - a.points)
        break
      case 'Projects':
        list.sort((a, b) => b.projectsCount - a.projectsCount || b.points - a.points)
        break
      case 'Overall':
      default:
        list.sort((a, b) => b.points - a.points || b.tasksCompleted - a.tasksCompleted)
        break
    }

    return list
  }, [builders, categoryFilter])

  const topThree = sortedBuilders.slice(0, 3)

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Community Leaderboard
            </h1>
            {activeCommunity && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-orange-50 text-[#EA580C] border border-orange-200">
                <Building2 size={12} />
                {activeCommunity.name}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-sans">
            Celebrate learning, consistency and contribution.
          </p>
        </div>

        {/* Timeframe Filters (This Week, This Month, All Time) */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs font-mono text-xs">
          {(['This Week', 'This Month', 'All Time'] as TimeFilter[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeFilter(tf)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeFilter === tf
                  ? 'bg-[#FF9900] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs (Overall, AWS Badges, Tasks, Events, Projects) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
        {(['Overall', 'AWS Badges', 'Tasks', 'Events', 'Projects'] as CategoryFilter[]).map((cat) => {
          const isSelected = categoryFilter === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="py-24">
          <LoadingState message="Calculating community rankings..." />
        </div>
      ) : errorMessage ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center font-mono">
          <p className="text-xs text-red-700">{errorMessage}</p>
          <button
            type="button"
            onClick={fetchLeaderboard}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-100 text-red-800 hover:bg-red-200"
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      ) : sortedBuilders.length === 0 ? (
        <EmptyState
          title="No leaderboard activity yet"
          description="Complete tasks or participate in community activities to earn XP and appear on the leaderboard."
          icon={<Trophy size={26} className="text-slate-400" />}
          badge="Leaderboard"
        />
      ) : (
        <>
          {/* ============================================================ */}
          {/* TOP THREE VISUAL CARDS (PODIUM)                             */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 2nd Place (Silver) */}
            {topThree[1] && (
              <div
                onClick={() => navigate(`/members/${topThree[1].userId}`)}
                className="order-2 md:order-1 p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs text-center cursor-pointer flex flex-col items-center justify-between"
              >
                <div className="w-full flex justify-between items-start text-xs font-mono text-slate-400">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center">
                    2
                  </span>
                  <Medal size={16} className="text-slate-400" />
                </div>
                <div className="my-2">
                  <Avatar
                    initials={topThree[1].fullName.slice(0, 2).toUpperCase()}
                    src={topThree[1].avatarUrl || undefined}
                    size="lg"
                  />
                  <div className="font-bold text-slate-900 text-sm font-sans mt-2">
                    {topThree[1].fullName}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{topThree[1].memberTag}</div>
                </div>
                <div className="w-full pt-3 border-t border-slate-100">
                  <span className="text-base font-bold text-slate-800 font-mono">
                    {topThree[1].points} XP
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {topThree[1].tasksCompleted} tasks • {topThree[1].badgesCount} badges
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place (Gold Podium) */}
            {topThree[0] && (
              <div
                onClick={() => navigate(`/members/${topThree[0].userId}`)}
                className="order-1 md:order-2 p-6 rounded-2xl border-2 border-[#FF9900] bg-gradient-to-b from-orange-50/50 to-white hover:shadow-md transition-all shadow-sm text-center cursor-pointer flex flex-col items-center justify-between relative"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#FF9900] text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow-xs">
                  <Crown size={12} />
                  <span>1ST PLACE</span>
                </div>
                <div className="w-full flex justify-between items-start text-xs font-mono text-[#EA580C] pt-1">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-[#EA580C] font-bold flex items-center justify-center">
                    1
                  </span>
                  <Trophy size={18} className="text-[#FF9900]" />
                </div>
                <div className="my-3">
                  <div className="relative inline-block">
                    <Avatar
                      initials={topThree[0].fullName.slice(0, 2).toUpperCase()}
                      src={topThree[0].avatarUrl || undefined}
                      size="lg"
                    />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FF9900] text-white flex items-center justify-center text-[10px]">
                      👑
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-base font-sans mt-2">
                    {topThree[0].fullName}
                  </div>
                  <div className="text-xs text-[#EA580C] font-mono font-semibold">{topThree[0].memberTag}</div>
                </div>
                <div className="w-full pt-3 border-t border-orange-100">
                  <span className="text-xl font-bold text-[#EA580C] font-mono">
                    {topThree[0].points} XP
                  </span>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {topThree[0].tasksCompleted} tasks • {topThree[0].badgesCount} badges • {topThree[0].eventsAttended} events
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {topThree[2] && (
              <div
                onClick={() => navigate(`/members/${topThree[2].userId}`)}
                className="order-3 p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs text-center cursor-pointer flex flex-col items-center justify-between"
              >
                <div className="w-full flex justify-between items-start text-xs font-mono text-slate-400">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center">
                    3
                  </span>
                  <Medal size={16} className="text-amber-700" />
                </div>
                <div className="my-2">
                  <Avatar
                    initials={topThree[2].fullName.slice(0, 2).toUpperCase()}
                    src={topThree[2].avatarUrl || undefined}
                    size="lg"
                  />
                  <div className="font-bold text-slate-900 text-sm font-sans mt-2">
                    {topThree[2].fullName}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{topThree[2].memberTag}</div>
                </div>
                <div className="w-full pt-3 border-t border-slate-100">
                  <span className="text-base font-bold text-slate-800 font-mono">
                    {topThree[2].points} XP
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {topThree[2].tasksCompleted} tasks • {topThree[2].badgesCount} badges
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* LEADERBOARD TABLE (Logged-in user highlighted)              */}
          {/* ============================================================ */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    <th scope="col" className="py-3.5 px-4 w-14 text-center">Rank</th>
                    <th scope="col" className="py-3.5 px-4">Member</th>
                    <th scope="col" className="py-3.5 px-4">Progress</th>
                    <th scope="col" className="py-3.5 px-4 text-center">Badges</th>
                    <th scope="col" className="py-3.5 px-4 text-center">Tasks</th>
                    <th scope="col" className="py-3.5 px-4 text-center">Events</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Points</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-mono">
                  {sortedBuilders.map((b, index) => {
                    const rank = index + 1
                    const isCurrentUser = b.userId === user?.id

                    return (
                      <tr
                        key={b.userId}
                        onClick={() => navigate(`/members/${b.userId}`)}
                        className={`transition-colors cursor-pointer ${
                          isCurrentUser
                            ? 'bg-orange-50/70 border-l-4 border-l-[#FF9900] font-semibold'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center">
                          {rank === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-[#FF9900] text-white font-bold inline-flex items-center justify-center text-xs">
                              1
                            </span>
                          ) : rank === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold inline-flex items-center justify-center text-xs">
                              2
                            </span>
                          ) : rank === 3 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold inline-flex items-center justify-center text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">{rank}</span>
                          )}
                        </td>

                        {/* Member */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              initials={b.fullName.slice(0, 2).toUpperCase()}
                              src={b.avatarUrl || undefined}
                              size="sm"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${isCurrentUser ? 'text-[#EA580C]' : 'text-slate-900'}`}>
                                  {b.fullName}
                                </span>
                                {isCurrentUser && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#EA580C] text-white font-bold">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">{b.memberTag}</span>
                            </div>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-3.5 px-4">
                          <div className="w-24">
                            <div className="text-[10px] text-slate-400 text-right mb-0.5">{b.progressPct}%</div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-[#FF9900] to-[#EA580C] h-full rounded-full"
                                style={{ width: `${b.progressPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Badges */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 font-semibold">
                            <Sparkles size={11} />
                            {b.badgesCount}
                          </span>
                        </td>

                        {/* Tasks */}
                        <td className="py-3.5 px-4 text-center text-slate-700">
                          {b.tasksCompleted}
                        </td>

                        {/* Events */}
                        <td className="py-3.5 px-4 text-center text-slate-700">
                          {b.eventsAttended}
                        </td>

                        {/* Points */}
                        <td className="py-3.5 px-4 text-right">
                          <span className={`text-sm font-bold ${isCurrentUser ? 'text-[#EA580C]' : 'text-slate-900'}`}>
                            {b.points} <span className="text-[10px] text-slate-400 font-normal">XP</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
