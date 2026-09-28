import { supabase } from '@/lib/supabase/client'

export type AnalyticsDateFilter = '7_days' | '30_days' | '90_days' | 'all_time'

export interface PointsDistributionItem {
  category: string
  total_points: number
  transaction_count: number
}

export interface PointsActivityItem {
  date: string
  points: number
  transactions: number
}

export interface TaskTimelineItem {
  date: string
  completed: number
}

export interface ContributionCategoryItem {
  category: string
  total_count: number
  approved_count: number
}

export interface CommunityAnalyticsData {
  community_id: string
  time_window_days: number | null
  generated_at: string
  members: {
    total: number
    new_members: number
    active_members: number
  }
  tasks: {
    created: number
    completed: number
    overdue: number
    completion_rate: number
    total_assignments: number
  }
  events: {
    created: number
    attendance: number
    rsvp: number
    participation_rate: number
  }
  projects: {
    active: number
    completed: number
    members_involved: number
  }
  contributions: {
    submitted: number
    approved: number
    rejected: number
    categories: ContributionCategoryItem[]
  }
  points: {
    earned: number
    distribution: PointsDistributionItem[]
    activity: PointsActivityItem[]
  }
  task_timeline: TaskTimelineItem[]
}

export function getDateFilterDays(filter: AnalyticsDateFilter): number | null {
  switch (filter) {
    case '7_days':
      return 7
    case '30_days':
      return 30
    case '90_days':
      return 90
    case 'all_time':
    default:
      return null
  }
}

/**
 * Loads manager analytics for a given community using real database records.
 * First tries the dedicated PostgreSQL RPC `get_community_manager_analytics`.
 * If unavailable, falls back to direct authorized table queries.
 */
export async function fetchCommunityAnalytics(
  communityId: string,
  filter: AnalyticsDateFilter
): Promise<CommunityAnalyticsData> {
  const days = getDateFilterDays(filter)

  // 1. Attempt RPC call
  try {
    const { data, error } = await supabase.rpc('get_community_manager_analytics', {
      p_community_id: communityId,
      p_days: days,
    })

    if (!error && data) {
      return data as unknown as CommunityAnalyticsData
    }
  } catch (rpcErr) {
    console.warn('[Analytics] RPC failed, using authorized direct database fallback:', rpcErr)
  }

  // 2. Direct Query Fallback (All queries are real database aggregates)
  const now = new Date()
  let startDateISO: string | null = null
  if (days !== null) {
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    startDateISO = startDate.toISOString()
  }

  // --- Members ---
  let totalMembersQuery = supabase
    .from('community_members')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'active')
  const { count: totalMembersCount } = await totalMembersQuery

  let newMembersQuery = supabase
    .from('community_members')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'active')
  if (startDateISO) {
    newMembersQuery = newMembersQuery.gte('joined_at', startDateISO)
  }
  const { count: newMembersCount } = await newMembersQuery

  // Active members: distinct user_ids active in this window
  const activeUserSet = new Set<string>()

  let pointsActiveQuery = supabase
    .from('points_transactions')
    .select('user_id')
    .eq('community_id', communityId)
  if (startDateISO) pointsActiveQuery = pointsActiveQuery.gte('created_at', startDateISO)
  const { data: ptUsers } = await pointsActiveQuery
  ptUsers?.forEach((u) => activeUserSet.add(u.user_id))

  let taskActiveQuery = supabase
    .from('community_task_assignments')
    .select('user_id')
    .eq('community_id', communityId)
  if (startDateISO) taskActiveQuery = taskActiveQuery.gte('updated_at', startDateISO)
  const { data: taskUsers } = await taskActiveQuery
  taskUsers?.forEach((u) => activeUserSet.add(u.user_id))

  let rsvpActiveQuery = supabase
    .from('community_event_rsvps')
    .select('user_id')
    .eq('community_id', communityId)
  if (startDateISO) rsvpActiveQuery = rsvpActiveQuery.gte('created_at', startDateISO)
  const { data: rsvpUsers } = await rsvpActiveQuery
  rsvpUsers?.forEach((u) => activeUserSet.add(u.user_id))

  let contribActiveQuery = supabase
    .from('community_contributions')
    .select('contributor_id, recipient_id')
    .eq('community_id', communityId)
  if (startDateISO) contribActiveQuery = contribActiveQuery.gte('created_at', startDateISO)
  const { data: contribUsers } = await contribActiveQuery
  contribUsers?.forEach((c) => {
    if (c.contributor_id) activeUserSet.add(c.contributor_id)
    if (c.recipient_id) activeUserSet.add(c.recipient_id)
  })

  // --- Tasks ---
  let tasksCreatedQuery = supabase
    .from('community_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
  if (startDateISO) tasksCreatedQuery = tasksCreatedQuery.gte('created_at', startDateISO)
  const { count: tasksCreatedCount } = await tasksCreatedQuery

  let tasksAssignedQuery = supabase
    .from('community_task_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
  if (startDateISO) tasksAssignedQuery = tasksAssignedQuery.gte('created_at', startDateISO)
  const { count: tasksAssignedCount } = await tasksAssignedQuery

  let tasksCompletedQuery = supabase
    .from('community_task_assignments')
    .select('id, completed_at, updated_at')
    .eq('community_id', communityId)
    .eq('status', 'completed')
  if (startDateISO) {
    tasksCompletedQuery = tasksCompletedQuery.or(`completed_at.gte.${startDateISO},updated_at.gte.${startDateISO}`)
  }
  const { data: completedAssignments } = await tasksCompletedQuery
  const completedCount = completedAssignments?.length || 0

  // Overdue tasks
  let overdueTasksQuery = supabase
    .from('community_task_assignments')
    .select('id, status, created_at, community_tasks(deadline, due_date)')
    .eq('community_id', communityId)
  if (startDateISO) overdueTasksQuery = overdueTasksQuery.gte('created_at', startDateISO)
  const { data: allAssignmentsForOverdue } = await overdueTasksQuery

  const overdueCount = (allAssignmentsForOverdue || []).filter((item: any) => {
    if (item.status === 'overdue') return true
    if (item.status === 'pending' || item.status === 'in_progress') {
      const task = item.community_tasks
      const deadline = task?.deadline || task?.due_date
      if (deadline && new Date(deadline).getTime() < now.getTime()) {
        return true
      }
    }
    return false
  }).length

  const totalAssigned = tasksAssignedCount || 0
  const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0

  // Task Timeline aggregation
  const taskTimelineMap: { [date: string]: number } = {}
  completedAssignments?.forEach((item) => {
    const rawDate = item.completed_at || item.updated_at
    if (rawDate) {
      const day = rawDate.split('T')[0]
      taskTimelineMap[day] = (taskTimelineMap[day] || 0) + 1
    }
  })
  const taskTimeline: TaskTimelineItem[] = Object.keys(taskTimelineMap)
    .sort()
    .map((date) => ({ date, completed: taskTimelineMap[date] }))

  // --- Events ---
  let eventsCreatedQuery = supabase
    .from('community_events')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
  if (startDateISO) eventsCreatedQuery = eventsCreatedQuery.gte('created_at', startDateISO)
  const { count: eventsCreatedCount } = await eventsCreatedQuery

  let eventRsvpQuery = supabase
    .from('community_event_rsvps')
    .select('id, attended')
    .eq('community_id', communityId)
  if (startDateISO) eventRsvpQuery = eventRsvpQuery.gte('created_at', startDateISO)
  const { data: eventRsvps } = await eventRsvpQuery

  const rsvpCount = eventRsvps?.length || 0
  const attendanceCount = (eventRsvps || []).filter((r) => r.attended === true).length
  const participationRate = rsvpCount > 0 ? Math.round((attendanceCount / rsvpCount) * 100) : 0

  // --- Projects ---
  let projectsQuery = supabase
    .from('community_projects')
    .select('id, status, created_at')
    .eq('community_id', communityId)
  if (startDateISO) projectsQuery = projectsQuery.gte('created_at', startDateISO)
  const { data: projectsData } = await projectsQuery

  const activeProjectsCount = (projectsData || []).filter((p) =>
    ['Active', 'Planning', 'active', 'in_progress'].includes(p.status)
  ).length
  const completedProjectsCount = (projectsData || []).filter((p) =>
    ['Completed', 'completed'].includes(p.status)
  ).length

  let projectMembersQuery = supabase
    .from('community_project_members')
    .select('user_id')
    .eq('community_id', communityId)
  if (startDateISO) projectMembersQuery = projectMembersQuery.gte('created_at', startDateISO)
  const { data: projectMembersData } = await projectMembersQuery
  const distinctProjectMembers = new Set(projectMembersData?.map((pm) => pm.user_id)).size

  // --- Contributions ---
  let contribQuery = supabase
    .from('community_contributions')
    .select('id, status, category, created_at')
    .eq('community_id', communityId)
  if (startDateISO) contribQuery = contribQuery.gte('created_at', startDateISO)
  const { data: contribData } = await contribQuery

  const totalSubmittedContributions = contribData?.length || 0
  const approvedContributions = (contribData || []).filter((c) => c.status === 'approved').length
  const rejectedContributions = (contribData || []).filter((c) => c.status === 'rejected').length

  const categoryMap: { [cat: string]: { total: number; approved: number } } = {}
  contribData?.forEach((c) => {
    const cat = c.category || 'General Assistance'
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, approved: 0 }
    categoryMap[cat].total++
    if (c.status === 'approved') categoryMap[cat].approved++
  })

  const contributionCategories: ContributionCategoryItem[] = Object.keys(categoryMap)
    .map((cat) => ({
      category: cat,
      total_count: categoryMap[cat].total,
      approved_count: categoryMap[cat].approved,
    }))
    .sort((a, b) => b.total_count - a.total_count)

  // --- Points ---
  let pointsQuery = supabase
    .from('points_transactions')
    .select('points, entity_type, created_at')
    .eq('community_id', communityId)
    .gt('points', 0)
  if (startDateISO) pointsQuery = pointsQuery.gte('created_at', startDateISO)
  const { data: pointsData } = await pointsQuery

  let totalPointsEarned = 0
  const pointsDistMap: { [entity: string]: { points: number; count: number } } = {}
  const pointsActivityMap: { [date: string]: { points: number; count: number } } = {}

  pointsData?.forEach((pt) => {
    const pts = Number(pt.points) || 0
    totalPointsEarned += pts

    const entityType = pt.entity_type || 'task'
    if (!pointsDistMap[entityType]) pointsDistMap[entityType] = { points: 0, count: 0 }
    pointsDistMap[entityType].points += pts
    pointsDistMap[entityType].count++

    if (pt.created_at) {
      const dateKey = pt.created_at.split('T')[0]
      if (!pointsActivityMap[dateKey]) pointsActivityMap[dateKey] = { points: 0, count: 0 }
      pointsActivityMap[dateKey].points += pts
      pointsActivityMap[dateKey].count++
    }
  })

  const pointsDistribution: PointsDistributionItem[] = Object.keys(pointsDistMap)
    .map((cat) => ({
      category: cat,
      total_points: pointsDistMap[cat].points,
      transaction_count: pointsDistMap[cat].count,
    }))
    .sort((a, b) => b.total_points - a.total_points)

  const pointsActivity: PointsActivityItem[] = Object.keys(pointsActivityMap)
    .sort()
    .map((date) => ({
      date,
      points: pointsActivityMap[date].points,
      transactions: pointsActivityMap[date].count,
    }))

  return {
    community_id: communityId,
    time_window_days: days,
    generated_at: now.toISOString(),
    members: {
      total: totalMembersCount || 0,
      new_members: newMembersCount || 0,
      active_members: activeUserSet.size,
    },
    tasks: {
      created: tasksCreatedCount || 0,
      completed: completedCount,
      overdue: overdueCount,
      completion_rate: completionRate,
      total_assignments: totalAssigned,
    },
    events: {
      created: eventsCreatedCount || 0,
      attendance: attendanceCount,
      rsvp: rsvpCount,
      participation_rate: participationRate,
    },
    projects: {
      active: activeProjectsCount,
      completed: completedProjectsCount,
      members_involved: distinctProjectMembers,
    },
    contributions: {
      submitted: totalSubmittedContributions,
      approved: approvedContributions,
      rejected: rejectedContributions,
      categories: contributionCategories,
    },
    points: {
      earned: totalPointsEarned,
      distribution: pointsDistribution,
      activity: pointsActivity,
    },
    task_timeline: taskTimeline,
  }
}
