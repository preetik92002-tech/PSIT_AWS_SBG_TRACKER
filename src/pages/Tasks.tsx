import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  Plus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ListTodo,
  ExternalLink,
  Shield,
  RefreshCw,
  Building2,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

interface CommunityTaskRow {
  id: string
  title: string
  description: string
  points: number
  dueDate: string | null
  dueDateFormatted: string
  isOverdue: boolean
  isThisWeek: boolean
  isUpcoming: boolean
  totalAssigned: number
  completedCount: number
  completionPct: number
  overallStatus: 'Pending' | 'In Progress' | 'Completed' | 'Overdue'
  assignedMembers: Array<{
    userId: string
    name: string
    avatarUrl: string | null
    status: string
  }>
  // Active user's assignment if present
  myAssignment?: {
    id: string
    status: 'pending' | 'submitted' | 'completed' | 'overdue'
  }
}

interface MemberAttentionItem {
  userId: string
  name: string
  avatarUrl: string | null
  overdueCount: number
}

export const Tasks: React.FC = () => {
  const navigate = useNavigate()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const [tasks, setTasks] = useState<CommunityTaskRow[]>([])
  const [membersNeedingAttention, setMembersNeedingAttention] = useState<MemberAttentionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Collapsible section states
  const [openSections, setOpenSections] = useState<{ overdue: boolean; thisWeek: boolean; upcoming: boolean }>({
    overdue: true,
    thisWeek: true,
    upcoming: true,
  })

  const isManager = userRoleInActiveCommunity === 'manager'

  // Fetch real task data strictly for activeCommunity.id
  const fetchCommunityTasks = async () => {
    if (!activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // 1. Fetch community tasks
      const { data: rawTasks, error: tasksErr } = await supabase
        .from('community_tasks')
        .select('*')
        .eq('community_id', activeCommunity.id)
        .order('due_date', { ascending: true })

      if (tasksErr) throw tasksErr

      // 2. Fetch assignments for these tasks
      const { data: assignments, error: assignErr } = await supabase
        .from('community_task_assignments')
        .select(`
          id,
          task_id,
          user_id,
          status,
          completed_at,
          profiles!community_task_assignments_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('community_id', activeCommunity.id)

      if (assignErr) throw assignErr

      const now = new Date().getTime()
      const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000

      // Map assignments per task
      const taskAssignmentsMap = new Map<string, any[]>()
      const userOverdueMap = new Map<string, { name: string; avatarUrl: string | null; count: number }>()

      if (assignments) {
        for (const a of assignments) {
          const list = taskAssignmentsMap.get(a.task_id) || []
          list.push(a)
          taskAssignmentsMap.set(a.task_id, list)

          // Check for member attention
          if (a.status === 'overdue') {
            const p: any = a.profiles || {}
            const cur = userOverdueMap.get(a.user_id) || {
              name: p.full_name || p.email?.split('@')[0] || 'Builder',
              avatarUrl: p.avatar_url || null,
              count: 0,
            }
            cur.count += 1
            userOverdueMap.set(a.user_id, cur)
          }
        }
      }

      // Format community tasks
      const formatted: CommunityTaskRow[] = (rawTasks || []).map((t: any) => {
        const assignList = taskAssignmentsMap.get(t.id) || []
        const total = assignList.length
        const completed = assignList.filter((a) => a.status === 'completed').length
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0

        const dueTimestamp = t.due_date ? new Date(t.due_date).getTime() : null
        const isPastDue = dueTimestamp !== null && dueTimestamp < now && pct < 100
        const isThisWk = dueTimestamp !== null && dueTimestamp >= now && dueTimestamp <= oneWeekFromNow
        const isUpcoming = dueTimestamp === null || dueTimestamp > oneWeekFromNow

        let overallStatus: 'Pending' | 'In Progress' | 'Completed' | 'Overdue' = 'Pending'
        if (pct === 100 && total > 0) overallStatus = 'Completed'
        else if (isPastDue) overallStatus = 'Overdue'
        else if (pct > 0) overallStatus = 'In Progress'

        // Check if current user is assigned
        const myAssign = assignList.find((a) => a.user_id === user?.id)

        const membersInfo = assignList.map((a: any) => {
          const p = a.profiles || {}
          return {
            userId: a.user_id,
            name: p.full_name || p.email?.split('@')[0] || 'Builder',
            avatarUrl: p.avatar_url || null,
            status: a.status,
          }
        })

        return {
          id: t.id,
          title: t.title,
          description: t.description || '',
          points: t.points || 50,
          dueDate: t.due_date,
          dueDateFormatted: t.due_date
            ? new Date(t.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : 'No deadline',
          isOverdue: isPastDue,
          isThisWeek: isThisWk,
          isUpcoming: isUpcoming && !isPastDue,
          totalAssigned: total,
          completedCount: completed,
          completionPct: pct,
          overallStatus,
          assignedMembers: membersInfo,
          myAssignment: myAssign
            ? {
                id: myAssign.id,
                status: myAssign.status,
              }
            : undefined,
        }
      })

      setTasks(formatted)

      // Attention list
      const attnList: MemberAttentionItem[] = []
      userOverdueMap.forEach((v, k) => {
        attnList.push({
          userId: k,
          name: v.name,
          avatarUrl: v.avatarUrl,
          overdueCount: v.count,
        })
      })
      setMembersNeedingAttention(attnList.slice(0, 5))
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to query tasks.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCommunityTasks()
  }, [activeCommunity?.id, user?.id])

  // Toggle user's own task assignment
  const handleToggleMyAssignment = async (task: CommunityTaskRow, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!task.myAssignment) return

    const newStatus = task.myAssignment.status === 'completed' ? 'pending' : 'completed'
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null

    try {
      const { error } = await supabase
        .from('community_task_assignments')
        .update({
          status: newStatus,
          completed_at: completedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.myAssignment.id)

      if (error) throw error

      // Log activity if completed
      if (newStatus === 'completed' && activeCommunity?.id && user?.id) {
        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: 'completed task',
          description: `Completed task "${task.title}" (+${task.points} XP)`,
        })
      }

      // Refresh list
      fetchCommunityTasks()
    } catch (err) {
      console.error('Failed to update task assignment', err)
    }
  }

  // Top metric computations
  const totalTasks = tasks.length
  const totalCompleted = tasks.filter((t) => t.completionPct === 100).length
  const globalCompletionPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0

  const thisWeekTasks = tasks.filter((t) => t.isThisWeek)
  const thisWeekCompleted = thisWeekTasks.filter((t) => t.completionPct === 100).length
  const thisWeekCompletionPct = thisWeekTasks.length > 0
    ? Math.round((thisWeekCompleted / thisWeekTasks.length) * 100)
    : 0

  const overdueTasks = tasks.filter((t) => t.isOverdue)
  const upcomingTasks = tasks.filter((t) => t.isUpcoming)

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Tasks
            </h1>
            {activeCommunity && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-orange-50 text-[#EA580C] border border-orange-200">
                <Building2 size={12} />
                {activeCommunity.name}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1 font-sans">
            Assign, track and complete community work.
          </p>
        </div>

        {/* Top Actions: Assign Task + Create Checklist */}
        <div className="flex items-center gap-2.5">
          {isManager && (
            <>
              <button
                type="button"
                onClick={() => navigate('/tasks/assign')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all shadow-2xs cursor-pointer"
              >
                <ListTodo size={14} className="text-slate-500" />
                <span className="hidden sm:inline">Create Checklist</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/tasks/assign')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-white bg-[#FF9900] hover:bg-[#EA580C] transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Assign Task</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Top Metrics Row: This Week & Overall Completion */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>This Week</span>
            <Calendar size={14} className="text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {thisWeekCompleted} <span className="text-xs text-slate-400 font-normal">/ {thisWeekTasks.length} tasks</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active this cycle</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Completion Rate</span>
            <Sparkles size={14} className="text-[#FF9900]" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {globalCompletionPct}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#FF9900] to-[#EA580C] h-full rounded-full"
              style={{ width: `${globalCompletionPct}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Overdue Tasks</span>
            <AlertTriangle size={14} className="text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {overdueTasks.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Past deadline</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Tasks</span>
            <CheckSquare size={14} className="text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {totalTasks}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Community challenges</div>
        </div>
      </div>

      {/* Main 2-Column Split: Task Groups (Left 65%) vs Right Panel (Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: 3 Chronological Groups (OVERDUE, THIS WEEK, UPCOMING) */}
        <div className="lg:col-span-8 space-y-6">
          {isLoading ? (
            <div className="py-20">
              <LoadingState message="Querying community tasks..." />
            </div>
          ) : errorMessage ? (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center">
              <p className="text-xs font-mono text-red-700 font-semibold">{errorMessage}</p>
              <button
                type="button"
                onClick={fetchCommunityTasks}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-red-100 text-red-800 hover:bg-red-200"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              title="No tasks found"
              description="No tasks have been assigned in this community yet."
              icon={<CheckSquare size={24} className="text-slate-400" />}
              badge="Tasks"
              action={
                isManager
                  ? {
                      label: 'Assign First Task',
                      onClick: () => navigate('/tasks/assign'),
                    }
                  : undefined
              }
            />
          ) : (
            <>
              {/* GROUP 1: OVERDUE */}
              {overdueTasks.length > 0 && (
                <div className="rounded-2xl border border-red-200/80 bg-white overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setOpenSections((p) => ({ ...p, overdue: !p.overdue }))}
                    className="w-full flex items-center justify-between p-4 bg-red-50/60 border-b border-red-100 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-600" />
                      <span className="font-mono text-xs font-bold text-red-900 tracking-wider">
                        OVERDUE ({overdueTasks.length})
                      </span>
                    </div>
                    {openSections.overdue ? <ChevronDown size={16} className="text-red-400" /> : <ChevronRight size={16} className="text-red-400" />}
                  </button>

                  {openSections.overdue && (
                    <div className="divide-y divide-slate-100 font-sans">
                      {overdueTasks.map((t) => renderTaskRow(t))}
                    </div>
                  )}
                </div>
              )}

              {/* GROUP 2: THIS WEEK */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setOpenSections((p) => ({ ...p, thisWeek: !p.thisWeek }))}
                  className="w-full flex items-center justify-between p-4 bg-slate-50/70 border-b border-slate-100 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-[#FF9900]" />
                    <span className="font-mono text-xs font-bold text-slate-800 tracking-wider uppercase">
                      THIS WEEK ({thisWeekTasks.length})
                    </span>
                  </div>
                  {openSections.thisWeek ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                {openSections.thisWeek && (
                  <div className="divide-y divide-slate-100 font-sans">
                    {thisWeekTasks.length === 0 ? (
                      <div className="p-6 text-center text-xs font-mono text-slate-400">
                        No tasks due this week.
                      </div>
                    ) : (
                      thisWeekTasks.map((t) => renderTaskRow(t))
                    )}
                  </div>
                )}
              </div>

              {/* GROUP 3: UPCOMING */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setOpenSections((p) => ({ ...p, upcoming: !p.upcoming }))}
                  className="w-full flex items-center justify-between p-4 bg-slate-50/70 border-b border-slate-100 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-500" />
                    <span className="font-mono text-xs font-bold text-slate-800 tracking-wider uppercase">
                      UPCOMING ({upcomingTasks.length})
                    </span>
                  </div>
                  {openSections.upcoming ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </button>

                {openSections.upcoming && (
                  <div className="divide-y divide-slate-100 font-sans">
                    {upcomingTasks.length === 0 ? (
                      <div className="p-6 text-center text-xs font-mono text-slate-400">
                        No upcoming roadmap tasks.
                      </div>
                    ) : (
                      upcomingTasks.map((t) => renderTaskRow(t))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right 4 Cols: Right Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* This Week Completion Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 font-mono">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-[#FF9900]" />
              <span>This Week Completion</span>
            </h3>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-2xl font-bold text-slate-900">{thisWeekCompletionPct}%</span>
              <span className="text-xs text-slate-400">{thisWeekCompleted} of {thisWeekTasks.length} done</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#FF9900] to-[#EA580C] h-full rounded-full transition-all duration-500"
                style={{ width: `${thisWeekCompletionPct}%` }}
              />
            </div>
          </div>

          {/* Members Needing Attention */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <span>Members Needing Attention</span>
            </h3>

            {membersNeedingAttention.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono py-2">
                All community builders are on track!
              </p>
            ) : (
              <div className="space-y-2.5">
                {membersNeedingAttention.map((m) => (
                  <div
                    key={m.userId}
                    onClick={() => navigate(`/members/${m.userId}`)}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-orange-200 bg-slate-50/50 hover:bg-orange-50/30 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={m.name.slice(0, 2).toUpperCase()} src={m.avatarUrl || undefined} size="sm" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">{m.name}</div>
                        <div className="text-[10px] text-amber-700 font-mono">
                          {m.overdueCount} overdue task(s)
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Quick Actions
            </h3>
            <div className="space-y-2 font-mono text-xs">
              {isManager && (
                <button
                  type="button"
                  onClick={() => navigate('/tasks/assign')}
                  className="w-full text-left p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EA580C] font-semibold transition-colors flex items-center justify-between"
                >
                  <span>Assign New Task</span>
                  <Plus size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/members')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-between"
              >
                <span>View Community Roster</span>
                <Users size={14} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Helper renderer for each task row
  function renderTaskRow(t: CommunityTaskRow) {
    const isMyTask = !!t.myAssignment
    const isChecked = t.myAssignment?.status === 'completed'

    return (
      <div
        key={t.id}
        className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      >
        {/* Left: Checkbox + Title + Description */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="pt-0.5">
            {isMyTask ? (
              <button
                type="button"
                onClick={(e) => handleToggleMyAssignment(t, e)}
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer border ${
                  isChecked
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-300 bg-white hover:border-[#FF9900]'
                }`}
                title={isChecked ? 'Mark pending' : 'Mark completed'}
              >
                {isChecked && <CheckCircle2 size={13} />}
              </button>
            ) : (
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  t.completionPct === 100
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
                title={`${t.completedCount}/${t.totalAssigned} completed`}
              >
                {t.completionPct === 100 && <CheckCircle2 size={13} />}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-slate-900 ${isChecked ? 'line-through text-slate-400' : ''}`}>
                {t.title}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-50 text-[#EA580C] font-bold border border-orange-200">
                +{t.points} XP
              </span>
            </div>
            {t.description && (
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-sans">
                {t.description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Assigned Members + Due Date + Progress + Status */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-mono text-[11px] self-end sm:self-auto">
          {/* Assigned Avatars */}
          <div className="flex items-center -space-x-1.5">
            {t.assignedMembers.slice(0, 3).map((m, idx) => (
              <Avatar
                key={idx}
                initials={m.name.slice(0, 2).toUpperCase()}
                src={m.avatarUrl || undefined}
                size="sm"
              />
            ))}
            {t.assignedMembers.length > 3 && (
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center border-2 border-white">
                +{t.assignedMembers.length - 3}
              </span>
            )}
          </div>

          {/* Due Date */}
          <div className={`flex items-center gap-1 ${t.isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
            <Calendar size={12} />
            <span>{t.dueDateFormatted}</span>
          </div>

          {/* Progress Mini Bar */}
          <div className="w-16 hidden md:block">
            <div className="text-[10px] text-slate-400 text-right">{t.completionPct}%</div>
            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${t.completionPct}%` }}
              />
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {t.isOverdue ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                Overdue
              </span>
            ) : t.completionPct === 100 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Completed
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {t.overallStatus}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }
}
