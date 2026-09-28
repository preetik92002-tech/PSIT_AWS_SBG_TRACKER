import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Trophy,
  CheckSquare,
  Calendar,
  FolderGit2,
  Award,
  Video,
  ExternalLink,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building2,
  Github,
  Globe,
  Radio,
  Compass,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCommunity } from '@/context/CommunityContext'
import { supabase } from '@/lib/supabase/client'
import { BuilderAvatar, CommunityImage } from '@/components/ui'
import { getMemberAWSBuilderProfile } from '@/types/awsBadges'
import { AWSBuilderCenterSection } from '@/components/badges'
import { timeAgo } from '@/utils/cn'

type TaskTab = 'all' | 'overdue' | 'due_soon' | 'in_progress' | 'submitted' | 'completed'

interface MemberTaskRecord {
  id: string
  taskId: string
  title: string
  description: string | null
  points: number
  status: string
  dueDate: string | null
  priority: string
  isOverdue: boolean
  isDueSoon: boolean
}

interface MemberEventRecord {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  startTime: string
  endTime: string | null
  location: string | null
  meetingUrl: string | null
}

interface MemberProjectRecord {
  id: string
  name: string
  description: string | null
  coverImageUrl: string | null
  status: string
  techTags: string[]
  githubUrl: string | null
  demoUrl: string | null
  teamCount: number
}

interface RecentActivityItem {
  id: string
  activityType: string
  description: string
  createdAt: string
  userProfile?: {
    fullName: string
    avatarUrl: string | null
  }
}

export const MemberDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { activeCommunity } = useCommunity()

  const [isLoading, setIsLoading] = useState(true)
  const [taskTab, setTaskTab] = useState<TaskTab>('all')

  // Progress stats
  const [tasksCompleted, setTasksCompleted] = useState(0)
  const [eventsAttended, setEventsAttended] = useState(0)
  const [projectsCount, setProjectsCount] = useState(0)
  const [contributionsCount, setContributionsCount] = useState(0)
  const [communityPoints, setCommunityPoints] = useState(0)

  // Real collections
  const [tasks, setTasks] = useState<MemberTaskRecord[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<MemberEventRecord[]>([])
  const [projects, setProjects] = useState<MemberProjectRecord[]>([])
  const [activities, setActivities] = useState<RecentActivityItem[]>([])

  // AWS Builder Profile & badges
  const builderProfile = useMemo(() => {
    return getMemberAWSBuilderProfile(
      profile?.aws_builder_alias,
      profile?.aws_builder_profile_url
    )
  }, [profile?.aws_builder_alias, profile?.aws_builder_profile_url])

  useEffect(() => {
    async function loadMemberData() {
      if (!user || !activeCommunity?.id) return
      setIsLoading(true)

      try {
        const now = new Date()
        const threeDaysFromNow = new Date()
        threeDaysFromNow.setDate(now.getDate() + 3)

        // 1. Fetch user tasks in this community
        const { data: userAssignments } = await supabase
          .from('community_task_assignments')
          .select(`
            id,
            status,
            community_tasks (
              id,
              title,
              description,
              points,
              due_date,
              priority
            )
          `)
          .eq('community_id', activeCommunity.id)
          .eq('user_id', user.id)

        const taskList: MemberTaskRecord[] = (userAssignments || []).map((a: any) => {
          const t = a.community_tasks || {}
          const due = t.due_date ? new Date(t.due_date) : null
          const isCompleted = a.status === 'completed'
          const isOverdue = !isCompleted && due ? due < now : false
          const isDueSoon = !isCompleted && due ? due >= now && due <= threeDaysFromNow : false

          return {
            id: a.id,
            taskId: t.id,
            title: t.title || 'Untitled Sprint Task',
            description: t.description || null,
            points: t.points || 50,
            status: a.status,
            dueDate: t.due_date,
            priority: t.priority || 'medium',
            isOverdue,
            isDueSoon,
          }
        })
        setTasks(taskList)
        setTasksCompleted(taskList.filter((t) => t.status === 'completed').length)

        // 2. Fetch events attended (RSVPs)
        const { data: rsvps } = await supabase
          .from('community_activities')
          .select('id')
          .eq('community_id', activeCommunity.id)
          .eq('user_id', user.id)
          .eq('activity_type', 'joined event')
        setEventsAttended(rsvps?.length || 0)

        // 3. Fetch verified points from ledger
        const { data: txs } = await supabase
          .from('points_transactions')
          .select('points')
          .eq('community_id', activeCommunity.id)
          .eq('user_id', user.id)
        const totalPts = (txs || []).reduce((sum, item) => sum + item.points, 0)
        setCommunityPoints(totalPts)

        // 4. Fetch approved contributions
        const { data: contribs } = await supabase
          .from('community_contributions')
          .select('id')
          .eq('community_id', activeCommunity.id)
          .eq('contributor_id', user.id)
          .eq('status', 'approved')
        setContributionsCount(contribs?.length || 0)

        // 5. Fetch upcoming events (with Google Meet check)
        const { data: eventsData } = await supabase
          .from('community_events')
          .select(`
            id,
            title,
            description,
            image_url,
            start_time,
            end_time,
            location,
            google_meet_spaces (
              meeting_uri,
              status
            )
          `)
          .eq('community_id', activeCommunity.id)
          .order('start_time', { ascending: true })
          .limit(3)

        const eventList: MemberEventRecord[] = (eventsData || []).map((e: any) => {
          const meetSpace = Array.isArray(e.google_meet_spaces)
            ? e.google_meet_spaces[0]
            : e.google_meet_spaces
          return {
            id: e.id,
            title: e.title,
            description: e.description,
            imageUrl: e.image_url,
            startTime: e.start_time,
            endTime: e.end_time,
            location: e.location,
            meetingUrl: meetSpace?.meeting_uri || (e.location?.includes('meet.google.com') ? e.location : null),
          }
        })
        setUpcomingEvents(eventList)

        // 6. Fetch user projects (member of team or creator)
        const { data: teamMemberships } = await supabase
          .from('community_project_members')
          .select('project_id')
          .eq('user_id', user.id)

        const projectIds = Array.from(
          new Set((teamMemberships || []).map((m: any) => m.project_id))
        )

        let projectQuery = supabase
          .from('community_projects')
          .select(`
            id,
            title,
            description,
            cover_image_url,
            status,
            tech_tags,
            github_url,
            live_demo_url,
            created_by
          `)
          .eq('community_id', activeCommunity.id)

        if (projectIds.length > 0) {
          projectQuery = projectQuery.or(`id.in.(${projectIds.join(',')}),created_by.eq.${user.id}`)
        } else {
          projectQuery = projectQuery.eq('created_by', user.id)
        }

        const { data: projData } = await projectQuery.limit(4)
        const projList: MemberProjectRecord[] = (projData || []).map((p: any) => ({
          id: p.id,
          name: p.title || 'Untitled Project',
          description: p.description,
          coverImageUrl: p.cover_image_url,
          status: p.status,
          techTags: p.tech_tags || [],
          githubUrl: p.github_url,
          demoUrl: p.live_demo_url,
          teamCount: 1,
        }))
        setProjects(projList)
        setProjectsCount(projList.length)

        // 7. Recent community activity
        const { data: activityData } = await supabase
          .from('community_activities')
          .select(`
            id,
            activity_type,
            description,
            created_at,
            profiles!community_activities_user_id_fkey (
              full_name,
              avatar_url
            )
          `)
          .eq('community_id', activeCommunity.id)
          .order('created_at', { ascending: false })
          .limit(5)

        const actList: RecentActivityItem[] = (activityData || []).map((a: any) => ({
          id: a.id,
          activityType: a.activity_type,
          description: a.description,
          createdAt: a.created_at,
          userProfile: {
            fullName: a.profiles?.full_name || 'Builder',
            avatarUrl: a.profiles?.avatar_url || null,
          },
        }))
        setActivities(actList)
      } catch (err) {
        console.error('Error loading member dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadMemberData()
  }, [user, activeCommunity?.id])

  // Filter tasks based on selected tab
  const filteredTasks = useMemo(() => {
    switch (taskTab) {
      case 'overdue':
        return tasks.filter((t) => t.isOverdue)
      case 'due_soon':
        return tasks.filter((t) => t.isDueSoon)
      case 'in_progress':
        return tasks.filter((t) => t.status === 'in_progress' || t.status === 'pending')
      case 'submitted':
        return tasks.filter((t) => t.status === 'submitted')
      case 'completed':
        return tasks.filter((t) => t.status === 'completed')
      case 'all':
      default:
        return tasks
    }
  }, [tasks, taskTab])

  const overdueCount = tasks.filter((t) => t.isOverdue).length
  const dueSoonCount = tasks.filter((t) => t.isDueSoon).length

  // Builder Journey Steps calculation
  const journeySteps = [
    {
      title: 'Learn',
      description: 'Explore AWS Foundations and enroll in chapter tracks',
      isCompleted: true,
      current: false,
    },
    {
      title: 'Build',
      description: 'Collaborate on chapter projects & deploy workloads',
      isCompleted: projectsCount > 0,
      current: projectsCount === 0,
    },
    {
      title: 'Contribute',
      description: 'Help peers with deployment & share troubleshooting solutions',
      isCompleted: contributionsCount > 0,
      current: projectsCount > 0 && contributionsCount === 0,
    },
    {
      title: 'Participate',
      description: 'Join chapter workshops and attend live Google Meet sessions',
      isCompleted: eventsAttended > 0,
      current: contributionsCount > 0 && eventsAttended === 0,
    },
    {
      title: 'Grow',
      description: 'Accumulate AWS Builder badges & ascend community leaderboard',
      isCompleted: builderProfile.badgeCount > 0 && communityPoints > 100,
      current: eventsAttended > 0,
    },
  ]

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Community Builder'
  const builderAlias = profile?.aws_builder_alias ? `@${profile.aws_builder_alias}` : null

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* ========================================================================= */}
      {/* 1. HEADER: Profile photo, Name, AWS Builder Alias, Community Identity     */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <BuilderAvatar
              name={displayName}
              src={profile?.avatar_url}
              alias={profile?.aws_builder_alias}
              isManager={false}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {displayName}
                </h1>
                {builderAlias && (
                  <span className="font-mono text-xs text-[#FF9900] bg-[#FF9900]/10 px-2 py-0.5 rounded-full border border-[#FF9900]/30 font-semibold">
                    {builderAlias}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 font-mono">
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <CommunityImage
                    src={activeCommunity?.logo_url}
                    name={activeCommunity?.name || 'AWS Community'}
                    shortName={activeCommunity?.short_name || 'AWS'}
                    size="xs"
                  />
                  <strong>{activeCommunity?.name}</strong>
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">Active Member</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium text-slate-300 hover:text-white bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] transition-all cursor-pointer shadow-2xs"
            >
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer"
            >
              <CheckSquare size={13} />
              <span>Sprint Tasks</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROGRESS: Real Database Progress Metrics                               */}
      {/* Tasks, Events, Projects, Contributions, Points, AWS Badges                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        {/* Metric 1: Tasks completed */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Tasks Done</span>
            <CheckSquare size={13} className="text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {tasksCompleted} <span className="text-[11px] text-slate-500 font-normal">/ {tasks.length}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Completed</div>
        </div>

        {/* Metric 2: Events attended */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Events</span>
            <Calendar size={13} className="text-blue-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">{eventsAttended}</div>
          <div className="text-[10px] text-slate-500 mt-1">Attended</div>
        </div>

        {/* Metric 3: Projects */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Projects</span>
            <FolderGit2 size={13} className="text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">{projectsCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Initiatives</div>
        </div>

        {/* Metric 4: Peer Contributions */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Contributions</span>
            <Sparkles size={13} className="text-teal-400" />
          </div>
          <div className="text-lg font-bold text-teal-300 mt-1">{contributionsCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Peer Help Milestones</div>
        </div>

        {/* Metric 5: Community Points (Derived strictly from ledger) */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Community Points</span>
            <Trophy size={13} className="text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-300 mt-1">
            {communityPoints.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">XP</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Points Ledger</div>
        </div>

        {/* Metric 6: AWS Builder Badges (Distinct from Points) */}
        <div
          onClick={() => navigate('/profile?tab=aws_badges')}
          className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] hover:border-[#FF9900]/40 transition-colors shadow-2xs cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>AWS Badges</span>
            <Award size={13} className="text-[#FF9900]" />
          </div>
          <div className="text-lg font-bold text-white mt-1">{builderProfile.badgeCount}</div>
          <div className="text-[10px] text-[#FF9900] mt-1 flex items-center gap-1">
            <span>View Badges →</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL BUILDER JOURNEY: Learn -> Build -> Contribute -> Part -> Grow  */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 md:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-[#FF9900]" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              AWS Builder Journey
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {journeySteps.filter((s) => s.isCompleted).length} of 5 milestones achieved
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono">
          {journeySteps.map((step, idx) => {
            return (
              <div
                key={step.title}
                className={`p-3.5 rounded-xl border relative transition-all ${
                  step.isCompleted
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                    : step.current
                    ? 'border-[#FF9900] bg-[#FF9900]/10 text-white shadow-xs'
                    : 'border-[#1F293A] bg-[#0E141F] text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold">0{idx + 1}. {step.title}</span>
                  {step.isCompleted ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : step.current ? (
                    <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
                  ) : (
                    <span className="text-[10px] text-slate-600">Locked</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-sans line-clamp-2 mt-1">
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TWO-COLUMN SPLIT: My Tasks (Left) vs Upcoming Events & Live (Right)    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: MY TASKS (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F293A]">
              <div>
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare size={15} className="text-[#FF9900]" />
                  <span>My Tasks</span>
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Track deadlines, sprint checklists, and submission states.
                </p>
              </div>

              <Link
                to="/tasks"
                className="inline-flex items-center gap-1 text-xs font-mono text-[#FF9900] hover:text-[#EC7211] font-semibold"
              >
                <span>VIEW ALL TASKS</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            {/* Task Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-3 scrollbar-none font-mono text-[11px]">
              {[
                { id: 'all' as const, label: 'All', count: tasks.length },
                { id: 'overdue' as const, label: 'Overdue', count: overdueCount, highlight: overdueCount > 0 },
                { id: 'due_soon' as const, label: 'Due soon', count: dueSoonCount },
                { id: 'in_progress' as const, label: 'In progress', count: tasks.filter((t) => t.status === 'in_progress' || t.status === 'pending').length },
                { id: 'submitted' as const, label: 'Submitted', count: tasks.filter((t) => t.status === 'submitted').length },
                { id: 'completed' as const, label: 'Completed', count: tasksCompleted },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTaskTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                    taskTab === tab.id
                      ? 'bg-[#FF9900] text-slate-950 font-bold border-[#FF9900]'
                      : tab.highlight
                      ? 'bg-rose-950/40 text-rose-300 border-rose-800'
                      : 'bg-[#18202E] text-slate-400 border-[#1F293A] hover:text-white'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Task List */}
            <div className="space-y-2 mt-1">
              {filteredTasks.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-500">
                  No tasks found in this view.
                </div>
              ) : (
                filteredTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="p-3.5 rounded-xl border border-[#1F293A] bg-[#0E141F] hover:border-slate-600 transition-all cursor-pointer flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-white truncate">
                          {task.title}
                        </span>
                        {task.isOverdue && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                            OVERDUE
                          </span>
                        )}
                        {task.isDueSoon && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                            DUE SOON
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-slate-400 font-sans line-clamp-1 mt-0.5">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-slate-400">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-slate-500" />
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-[#FF9900] font-bold">+{task.points} XP</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                      task.status === 'completed'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : task.status === 'submitted'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Enrolled Projects */}
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F293A] mb-3">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <FolderGit2 size={15} className="text-purple-400" />
                <span>My Active Projects</span>
              </h2>
              <Link
                to="/projects"
                className="text-xs font-mono text-[#FF9900] hover:underline"
              >
                View all →
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-slate-500">
                You are not enrolled in any projects yet.{' '}
                <Link to="/projects" className="text-[#FF9900] underline">
                  Explore projects
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => navigate('/projects')}
                    className="p-3.5 rounded-xl border border-[#1F293A] bg-[#0E141F] hover:border-slate-600 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white truncate">{proj.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase">
                          {proj.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-2">
                        {proj.description || 'Community architectural initiative.'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#1F293A] flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {proj.techTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-[#18202E] text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-slate-400">
                        {proj.githubUrl && <Github size={13} />}
                        {proj.demoUrl && <Globe size={13} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: UPCOMING EVENTS + GOOGLE MEET CTA + ACTIVITY (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Upcoming Events with Google Meet */}
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F293A] mb-3">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Calendar size={15} className="text-blue-400" />
                <span>Upcoming Events</span>
              </h2>
              <Link to="/events" className="text-xs font-mono text-[#FF9900] hover:underline">
                View all →
              </Link>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-slate-500">
                No upcoming chapter events scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-xl border border-[#1F293A] bg-[#0E141F] flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-white line-clamp-1">{evt.title}</span>
                        <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded shrink-0">
                          {new Date(evt.startTime).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-1 mt-0.5">
                        {evt.description || 'Community workshop and builder discussion.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#1F293A] flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                        {evt.location || 'Online Session'}
                      </span>

                      {evt.meetingUrl ? (
                        <a
                          href={evt.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#FF9900] text-slate-950 hover:bg-[#EC7211] transition-all shadow-xs shrink-0"
                        >
                          <Video size={12} />
                          <span>JOIN GOOGLE MEET</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/events/${evt.id}`)}
                          className="text-xs font-mono text-slate-400 hover:text-white"
                        >
                          Details →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Community Activity */}
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F293A] mb-3">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={15} className="text-teal-400" />
                <span>Recent Community Activity</span>
              </h2>
            </div>

            {activities.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-slate-500">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5">
                    <BuilderAvatar
                      name={act.userProfile?.fullName || 'Builder'}
                      src={act.userProfile?.avatarUrl}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        {act.description}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {timeAgo(act.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
