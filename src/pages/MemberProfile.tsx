import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Trophy,
  FolderGit2,
  CheckSquare,
  Share2,
  UserPlus,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  MoreHorizontal,
  Lock,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

interface MemberProfileData {
  membershipId: string
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  memberTag: string
  institutionName: string
  institutionAddress: string
  phone: string
  bio: string
  role: 'manager' | 'member'
  status: 'active' | 'inactive'
  joinedAt: string
  lastActive: string
  awsBuilderProfileUrl: string | null
}

interface MemberMetrics {
  learningProgressPct: number
  badgesCount: number
  tasksCompleted: number
  tasksTotal: number
  eventsAttended: number
  projectsCount: number
}

interface MemberTaskItem {
  id: string
  title: string
  description: string
  points: number
  status: 'pending' | 'submitted' | 'completed' | 'overdue'
  dueDate: string | null
  completedAt: string | null
}

interface MemberActivityItem {
  id: string
  activityType: string
  description: string
  createdAt: string
}

export const MemberProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const [member, setMember] = useState<MemberProfileData | null>(null)
  const [metrics, setMetrics] = useState<MemberMetrics>({
    learningProgressPct: 0,
    badgesCount: 0,
    tasksCompleted: 0,
    tasksTotal: 0,
    eventsAttended: 0,
    projectsCount: 0,
  })
  const [tasks, setTasks] = useState<MemberTaskItem[]>([])
  const [activities, setActivities] = useState<MemberActivityItem[]>([])
  const [activeTaskTab, setActiveTaskTab] = useState<'completed' | 'pending' | 'overdue'>('completed')
  const [isLoading, setIsLoading] = useState(true)
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCopiedEmail, setIsCopiedEmail] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  const activitySectionRef = useRef<HTMLDivElement>(null)
  const isManager = userRoleInActiveCommunity === 'manager'

  const fetchMemberProfile = async () => {
    if (!id || !activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)
    setIsUnauthorized(false)

    try {
      // 1. STRICT COMMUNITY DATA ISOLATION:
      // Verify that this user is indeed an enrolled member of the ACTIVE community!
      const { data: cmRecord, error: cmError } = await supabase
        .from('community_members')
        .select(`
          id,
          community_id,
          user_id,
          role,
          status,
          joined_at,
          updated_at,
          profiles!community_members_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            aws_builder_alias,
            aws_builder_profile_url,
            bio,
            institution_name,
            institution_address,
            phone,
            created_at
          )
        `)
        .eq('community_id', activeCommunity.id)
        .eq('user_id', id)
        .maybeSingle()

      if (cmError) throw cmError

      if (!cmRecord) {
        // The user is not part of this community -> Block access!
        setIsUnauthorized(true)
        setIsLoading(false)
        return
      }

      const p: any = cmRecord.profiles || {}

      // 2. Fetch Tasks assigned to this user in this community
      const { data: taskAssignments } = await supabase
        .from('community_task_assignments')
        .select(`
          id,
          status,
          completed_at,
          created_at,
          community_tasks (
            id,
            title,
            description,
            points,
            due_date
          )
        `)
        .eq('community_id', activeCommunity.id)
        .eq('user_id', id)

      // 3. Fetch Event RSVPs in this community
      const { data: rsvps } = await supabase
        .from('community_activities')
        .select('id')
        .eq('community_id', activeCommunity.id)
        .eq('user_id', id)
        .eq('activity_type', 'joined event')

      // 4. Fetch Projects in this community
      const { data: projects } = await supabase
        .from('community_projects')
        .select('id')
        .eq('community_id', activeCommunity.id)
        .eq('created_by', id)

      // 5. Fetch Community Activities for this user
      const { data: acts } = await supabase
        .from('community_activities')
        .select('id, activity_type, description, created_at')
        .eq('community_id', activeCommunity.id)
        .eq('user_id', id)
        .order('created_at', { ascending: false })

      // Process tasks
      const taskList: MemberTaskItem[] = []
      let completedCount = 0
      let overdueCount = 0
      const now = new Date().getTime()

      if (taskAssignments) {
        for (const ta of taskAssignments) {
          const t: any = ta.community_tasks || {}
          const isOverdue = ta.status !== 'completed' && t.due_date && new Date(t.due_date).getTime() < now
          const status = isOverdue ? 'overdue' : (ta.status as any)

          if (status === 'completed') completedCount++
          if (status === 'overdue') overdueCount++

          taskList.push({
            id: ta.id,
            title: t.title || 'Community Task',
            description: t.description || '',
            points: t.points || 50,
            status,
            dueDate: t.due_date,
            completedAt: ta.completed_at,
          })
        }
      }

      // Calculate progress & badges
      const totalTasks = taskList.length
      const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 25
      let badges = 1
      if (completedCount >= 5) badges = 4
      else if (completedCount >= 2) badges = 2

      // Process activities
      const actList: MemberActivityItem[] = (acts || []).map((a) => ({
        id: a.id,
        activityType: a.activity_type,
        description: a.description,
        createdAt: a.created_at,
      }))

      // Last active date
      const lastActiveRaw = actList[0]?.createdAt || cmRecord.updated_at || cmRecord.joined_at
      const diffHours = Math.floor((Date.now() - new Date(lastActiveRaw).getTime()) / (1000 * 60 * 60))
      let lastActiveStr = 'Today'
      if (diffHours >= 48) lastActiveStr = `${Math.floor(diffHours / 24)}d ago`
      else if (diffHours >= 24) lastActiveStr = 'Yesterday'
      else if (diffHours >= 1) lastActiveStr = `${diffHours}h ago`
      else lastActiveStr = 'Just now'

      setMember({
        membershipId: cmRecord.id,
        userId: cmRecord.user_id,
        fullName: p.full_name || p.email?.split('@')[0] || 'Community Builder',
        email: p.email || '',
        avatarUrl: p.avatar_url || null,
        memberTag: p.aws_builder_alias ? `@${p.aws_builder_alias}` : `MEM-${cmRecord.user_id.slice(0, 4).toUpperCase()}`,
        institutionName: p.institution_name || (activeCommunity as any).institution_name || (activeCommunity as any).institution || 'AWS Student Community',
        institutionAddress: p.institution_address || `${activeCommunity.city || 'Campus'}, Chapter`,
        phone: p.phone || '—',
        bio: p.bio || 'Active cloud builder exploring AWS serverless and cloud architectural foundations.',
        role: cmRecord.role as 'manager' | 'member',
        status: cmRecord.status as 'active' | 'inactive',
        joinedAt: new Date(cmRecord.joined_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        lastActive: lastActiveStr,
        awsBuilderProfileUrl: p.aws_builder_profile_url || null,
      })

      setMetrics({
        learningProgressPct: progress,
        badgesCount: badges,
        tasksCompleted: completedCount,
        tasksTotal: totalTasks,
        eventsAttended: rsvps?.length || 0,
        projectsCount: projects?.length || 0,
      })

      setTasks(taskList)
      setActivities(actList)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to query member profile.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMemberProfile()
  }, [id, activeCommunity?.id])

  const scrollToActivity = () => {
    activitySectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCopyEmail = () => {
    if (member?.email) {
      navigator.clipboard.writeText(member.email)
      setIsCopiedEmail(true)
      setTimeout(() => setIsCopiedEmail(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingState message="Loading community builder profile..." />
      </div>
    )
  }

  // Strict cross-community unauthorized guard
  if (isUnauthorized || !member) {
    return (
      <div className="py-16 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Lock size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-sans">Member Not Found in This Community</h2>
        <p className="text-xs text-slate-500 leading-relaxed font-sans">
          This builder does not belong to <strong className="text-slate-900">{activeCommunity?.name}</strong>. Community data and profiles are strictly isolated per chapter to preserve privacy.
        </p>
        <div className="pt-2">
          <Link
            to="/members"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold text-white bg-[#FF9900] hover:bg-[#EA580C] transition-all shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Return to Community Roster</span>
          </Link>
        </div>
      </div>
    )
  }

  const filteredTasks = tasks.filter((t) => {
    if (activeTaskTab === 'completed') return t.status === 'completed'
    if (activeTaskTab === 'overdue') return t.status === 'overdue'
    return t.status === 'pending' || t.status === 'submitted'
  })

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navigation Back Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/members"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Members</span>
        </Link>
        <span className="text-xs font-mono text-slate-400">
          Chapter: <strong className="text-slate-700">{activeCommunity?.name}</strong>
        </span>
      </div>

      {/* ============================================================ */}
      {/* HEADER HERO CARD                                            */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar
              initials={member.fullName.slice(0, 2).toUpperCase()}
              src={member.avatarUrl || undefined}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-sans tracking-tight">
                  {member.fullName}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                  member.role === 'manager'
                    ? 'bg-orange-100 text-[#EA580C] border border-orange-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {member.role === 'manager' ? 'Community Head' : 'Community Member'}
                </span>
                {member.status === 'active' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                    <CheckCircle2 size={11} />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                    Inactive
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-mono flex-wrap">
                <span className="font-semibold text-slate-700">{member.memberTag}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-600 font-sans">
                  <Building2 size={13} className="text-slate-400" />
                  {member.institutionName}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Assign Task, View Activity, More */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {isManager && (
              <button
                type="button"
                onClick={() => navigate(`/tasks/assign?memberId=${member.userId}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-white bg-[#FF9900] hover:bg-[#EA580C] transition-all shadow-xs cursor-pointer"
              >
                <CheckSquare size={14} />
                <span>Assign Task</span>
              </button>
            )}

            <button
              type="button"
              onClick={scrollToActivity}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all shadow-2xs cursor-pointer"
            >
              <span>View Activity</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                title="More actions"
              >
                <MoreHorizontal size={16} />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 z-30 font-sans animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyEmail()
                      setIsMoreMenuOpen(false)
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>{isCopiedEmail ? 'Email Copied!' : 'Copy Email'}</span>
                    <Mail size={13} className="text-slate-400" />
                  </button>

                  {member.awsBuilderProfileUrl && (
                    <a
                      href={member.awsBuilderProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>AWS Builder Profile</span>
                      <ExternalLink size={13} className="text-slate-400" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5 METRICS ROW                                                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 font-mono">
        {/* Metric 1: AWS Learning Progress */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>AWS Progress</span>
            <Sparkles size={14} className="text-[#FF9900]" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {metrics.learningProgressPct}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#FF9900] to-[#EA580C] h-full rounded-full"
              style={{ width: `${metrics.learningProgressPct}%` }}
            />
          </div>
        </div>

        {/* Metric 2: AWS Badges */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>AWS Badges</span>
            <Trophy size={14} className="text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {metrics.badgesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified achievements</div>
        </div>

        {/* Metric 3: Tasks Completed */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Tasks Done</span>
            <CheckSquare size={14} className="text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {metrics.tasksCompleted} <span className="text-xs text-slate-400 font-normal">/ {metrics.tasksTotal}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Assignments finished</div>
        </div>

        {/* Metric 4: Events Attended */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Events</span>
            <Calendar size={14} className="text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {metrics.eventsAttended}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Attended / RSVP'd</div>
        </div>

        {/* Metric 5: Projects */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Projects</span>
            <FolderGit2 size={14} className="text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {metrics.projectsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Community initiatives</div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2-COLUMN MAIN LAYOUT (DESKTOP) / STACKED (MOBILE)            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT / CENTER COLUMN (2/3): Journey Timeline, Tasks, Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* AWS Journey Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF9900]" />
              <span>AWS Journey Timeline</span>
            </h2>

            <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 font-mono text-xs">
              {/* 1. Started Journey */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                <div className="font-bold text-slate-800">Started Journey</div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">Enrolled in {activeCommunity?.name} on {member.joinedAt}</div>
              </div>

              {/* 2. Completed Foundations */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                  metrics.tasksCompleted >= 1 ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
                <div className="font-bold text-slate-800">Completed Foundations</div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">AWS Cloud Practitioner & IAM security basics</div>
              </div>

              {/* 3. Earned First Badge */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                  metrics.badgesCount >= 1 ? 'bg-purple-500' : 'bg-slate-300'
                }`} />
                <div className="font-bold text-slate-800">Earned First Badge</div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">Verified Chapter Builder Milestone</div>
              </div>

              {/* 4. Completed Cloud Module */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                  metrics.tasksCompleted >= 3 ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
                <div className="font-bold text-slate-800">Completed Cloud Module</div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">AWS Lambda, DynamoDB & Serverless Architecture</div>
              </div>

              {/* 5. Current Learning */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-[#FF9900] border-2 border-white animate-pulse" />
                <div className="font-bold text-[#EA580C]">Current Learning</div>
                <div className="text-[11px] text-slate-500 font-sans mt-0.5">Amazon Bedrock Generative AI & Cloud Development Kit</div>
              </div>
            </div>
          </div>

          {/* Tasks Section: Completed / Pending / Overdue Tabs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider flex items-center gap-2">
                <CheckSquare size={16} className="text-[#FF9900]" />
                <span>Community Tasks</span>
              </h2>

              {/* Tab Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTaskTab('completed')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTaskTab === 'completed'
                      ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Completed ({tasks.filter((t) => t.status === 'completed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTaskTab('pending')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTaskTab === 'pending'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Pending ({tasks.filter((t) => t.status === 'pending' || t.status === 'submitted').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTaskTab('overdue')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTaskTab === 'overdue'
                      ? 'bg-white text-amber-700 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Overdue ({tasks.filter((t) => t.status === 'overdue').length})
                </button>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No {activeTaskTab} tasks in this community.
              </div>
            ) : (
              <div className="space-y-2.5 font-mono">
                {filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 font-sans">{t.title}</div>
                      {t.description && (
                        <div className="text-[11px] text-slate-400 font-sans line-clamp-1 mt-0.5">
                          {t.description}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-orange-50 text-[#EA580C] font-bold border border-orange-100 text-[10px]">
                        +{t.points} XP
                      </span>
                      {t.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={10} /> Done
                        </span>
                      ) : t.status === 'overdue' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle size={10} /> Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Community Activity Feed */}
          <div ref={activitySectionRef} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-[#FF9900]" />
              <span>Community Activity</span>
            </h2>

            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No recorded community activity yet.
              </div>
            ) : (
              <div className="space-y-3 font-sans">
                {activities.map((act) => (
                  <div key={act.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-800">{act.description}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(act.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (Desktop right, mobile stacks below activity) */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
              Profile Details
            </h2>

            <div className="space-y-3.5 text-xs font-mono divide-y divide-slate-100">
              {/* Institution */}
              <div className="pt-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Institution</span>
                <span className="font-semibold text-slate-800 font-sans mt-0.5 block">{member.institutionName}</span>
                <span className="text-[11px] text-slate-400 font-sans">{member.institutionAddress}</span>
              </div>

              {/* Email */}
              <div className="pt-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Email Address</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-medium text-slate-700 truncate">{member.email}</span>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="text-[10px] text-[#EA580C] hover:underline font-bold shrink-0 ml-2"
                  >
                    {isCopiedEmail ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="pt-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Phone Number</span>
                <span className="font-medium text-slate-700 mt-0.5 block">{member.phone}</span>
              </div>

              {/* Member Since */}
              <div className="pt-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Member Since</span>
                <span className="font-medium text-slate-700 mt-0.5 block">{member.joinedAt}</span>
              </div>

              {/* Last Active */}
              <div className="pt-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Active</span>
                <span className="font-semibold text-emerald-600 mt-0.5 block">{member.lastActive}</span>
              </div>
            </div>

            {/* Bio */}
            {member.bio && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">Bio</span>
                <p className="text-xs text-slate-600 font-sans leading-relaxed mt-1">
                  {member.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
