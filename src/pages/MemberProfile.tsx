import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
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
  Trash2,
  UserMinus,
  Shield,
  Award,
  Github,
  Globe,
  Video,
  Tag,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { BuilderAvatar } from '@/components/ui'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { getMemberAWSBuilderProfile } from '@/types/awsBadges'
import { AWSBuilderCenterSection, AWSBadgesTabContent } from '@/components/badges'

interface MemberProfileData {
  membershipId: string
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  memberTag: string
  awsBuilderAlias: string | null
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
  totalPoints: number
  contributionsCount: number
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

interface MemberProjectItem {
  id: string
  title: string
  description: string | null
  coverImageUrl: string | null
  status: string
  techTags: string[]
  githubUrl: string | null
  liveDemoUrl: string | null
  role?: string
}

interface MemberEventItem {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  startTime: string
  location: string | null
  meetingUrl: string | null
  attended: boolean
  attendedAt?: string | null
}

interface MemberContributionItem {
  id: string
  title: string
  description: string
  category: string
  status: string
  pointsAwarded: number
  recipientName?: string
  evidenceUrl?: string | null
  createdAt: string
}

interface MemberActivityItem {
  id: string
  activityType: string
  description: string
  createdAt: string
}

export type MemberProfileTab =
  | 'overview'
  | 'tasks'
  | 'events'
  | 'projects'
  | 'contributions'
  | 'aws_badges'
  | 'activity'

export const MemberProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
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
    totalPoints: 0,
    contributionsCount: 0,
  })
  const [tasks, setTasks] = useState<MemberTaskItem[]>([])
  const [projects, setProjects] = useState<MemberProjectItem[]>([])
  const [events, setEvents] = useState<MemberEventItem[]>([])
  const [contributions, setContributions] = useState<MemberContributionItem[]>([])
  const [activities, setActivities] = useState<MemberActivityItem[]>([])

  // Initialize mainTab from query param if available
  const queryTab = new URLSearchParams(location.search).get('tab')
  const [mainTab, setMainTab] = useState<MemberProfileTab>(
    (queryTab as MemberProfileTab) || 'overview'
  )
  const [activeTaskTab, setActiveTaskTab] = useState<'completed' | 'pending' | 'overdue'>('completed')
  const [isLoading, setIsLoading] = useState(true)
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCopiedEmail, setIsCopiedEmail] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  // Manager action modals
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false)
  const [isDemoteModalOpen, setIsDemoteModalOpen] = useState(false)
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  const activitySectionRef = useRef<HTMLDivElement>(null)
  const isManager = userRoleInActiveCommunity === 'manager'

  // Derive connected AWS Builder Profile
  const builderProfile = useMemo(() => {
    return getMemberAWSBuilderProfile(
      member?.memberTag?.startsWith('@') ? member.memberTag : member?.memberTag ? `@${member.memberTag}` : null,
      member?.awsBuilderProfileUrl
    )
  }, [member?.memberTag, member?.awsBuilderProfileUrl])

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

      // 3. Fetch Event RSVPs and attendance in this community
      const { data: rsvpsData } = await supabase
        .from('community_event_rsvps')
        .select(`
          id,
          attended,
          attended_at,
          created_at,
          community_events (
            id,
            title,
            description,
            image_url,
            start_time,
            location,
            meeting_url
          )
        `)
        .eq('community_id', activeCommunity.id)
        .eq('user_id', id)

      const eventList: MemberEventItem[] = (rsvpsData || []).map((r: any) => {
        const e = r.community_events || {}
        return {
          id: e.id || r.id,
          title: e.title || 'Chapter Event',
          description: e.description || null,
          imageUrl: e.image_url || null,
          startTime: e.start_time || r.created_at,
          location: e.location || 'Online Session',
          meetingUrl: e.meeting_url || null,
          attended: Boolean(r.attended),
          attendedAt: r.attended_at || null,
        }
      })
      setEvents(eventList)

      // 4. Fetch Projects in this community (member created or collaborated on)
      const { data: teamMemberships } = await supabase
        .from('community_project_members')
        .select('project_id, role')
        .eq('user_id', id)

      const memberProjIds = Array.from(new Set((teamMemberships || []).map((m: any) => m.project_id)))
      const roleByProjId = new Map((teamMemberships || []).map((m: any) => [m.project_id, m.role]))

      let projQuery = supabase
        .from('community_projects')
        .select('*')
        .eq('community_id', activeCommunity.id)

      if (memberProjIds.length > 0) {
        projQuery = projQuery.or(`id.in.(${memberProjIds.join(',')}),created_by.eq.${id}`)
      } else {
        projQuery = projQuery.eq('created_by', id)
      }

      const { data: projectsData } = await projQuery
      const projList: MemberProjectItem[] = (projectsData || []).map((p: any) => ({
        id: p.id,
        title: p.title || 'Untitled Project',
        description: p.description || null,
        coverImageUrl: p.cover_image_url || null,
        status: p.status || 'Active',
        techTags: p.tech_tags || [],
        githubUrl: p.github_url || null,
        liveDemoUrl: p.live_demo_url || null,
        role: roleByProjId.get(p.id) || (p.created_by === id ? 'Owner / Lead' : 'Collaborator'),
      }))
      setProjects(projList)

      // 5. Fetch peer contributions for this member
      const { data: contribsData } = await supabase
        .from('community_contributions')
        .select(`
          id,
          title,
          description,
          category,
          status,
          points_awarded,
          evidence_url,
          created_at,
          recipient_id,
          profiles!community_contributions_recipient_id_fkey (
            full_name
          )
        `)
        .eq('community_id', activeCommunity.id)
        .eq('contributor_id', id)
        .order('created_at', { ascending: false })

      const contribList: MemberContributionItem[] = (contribsData || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        status: c.status,
        pointsAwarded: c.points_awarded || 0,
        recipientName: c.profiles?.full_name || (c.recipient_id ? 'Peer Builder' : 'Community'),
        evidenceUrl: c.evidence_url,
        createdAt: c.created_at,
      }))
      setContributions(contribList)

      // 6. Fetch verified Points Ledger for this user in this community
      const { data: ptsData } = await supabase
        .from('points_transactions')
        .select('points')
        .eq('community_id', activeCommunity.id)
        .eq('user_id', id)

      const verifiedPoints = (ptsData || []).reduce((acc, row) => acc + row.points, 0)

      // 7. Fetch Community Activities for this user
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

      const alias = p.aws_builder_alias || null

      setMember({
        membershipId: cmRecord.id,
        userId: cmRecord.user_id,
        fullName: p.full_name || p.email?.split('@')[0] || 'Community Builder',
        email: p.email || '',
        avatarUrl: p.avatar_url || null,
        memberTag: alias ? `@${alias}` : `MEM-${cmRecord.user_id.slice(0, 4).toUpperCase()}`,
        awsBuilderAlias: alias,
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
        eventsAttended: eventList.length,
        projectsCount: projList.length,
        totalPoints: verifiedPoints,
        contributionsCount: contribList.length,
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

  const handleConfirmPromote = async () => {
    if (!member || !activeCommunity || !isManager) return
    setIsActionLoading(true)
    try {
      const { error: rpcErr } = await supabase.rpc('promote_community_member', {
        p_community_id: activeCommunity.id,
        p_target_user_id: member.userId,
      })
      if (rpcErr) {
        const { error: updateErr } = await supabase
          .from('community_members')
          .update({ role: 'manager', updated_at: new Date().toISOString() })
          .eq('id', member.membershipId)
        if (updateErr) throw updateErr

        if (user?.id) {
          await supabase.from('community_activities').insert({
            community_id: activeCommunity.id,
            user_id: user.id,
            activity_type: 'role changed',
            description: `Promoted ${member.fullName} to Community Manager`,
            metadata: { action: 'promote', target_user_id: member.userId, new_role: 'manager', changed_by: user.id },
          })
        }
      }
      setMember((prev) => (prev ? { ...prev, role: 'manager' } : null))
      setIsPromoteModalOpen(false)
      setActionFeedback('Member promoted to Community Manager.')
      setTimeout(() => setActionFeedback(null), 3000)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Promotion failed')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleConfirmDemote = async () => {
    if (!member || !activeCommunity || !isManager) return
    setIsActionLoading(true)
    try {
      const { error: rpcErr } = await supabase.rpc('demote_community_member', {
        p_community_id: activeCommunity.id,
        p_target_user_id: member.userId,
      })
      if (rpcErr) {
        const { error: updateErr } = await supabase
          .from('community_members')
          .update({ role: 'member', updated_at: new Date().toISOString() })
          .eq('id', member.membershipId)
        if (updateErr) throw updateErr

        if (user?.id) {
          await supabase.from('community_activities').insert({
            community_id: activeCommunity.id,
            user_id: user.id,
            activity_type: 'role changed',
            description: `Demoted ${member.fullName} to Community Member`,
            metadata: { action: 'demote', target_user_id: member.userId, new_role: 'member', changed_by: user.id },
          })
        }
      }
      setMember((prev) => (prev ? { ...prev, role: 'member' } : null))
      setIsDemoteModalOpen(false)
      setActionFeedback('Manager demoted to Community Member.')
      setTimeout(() => setActionFeedback(null), 3000)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Demotion failed')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!member || !activeCommunity || !isManager) return
    setIsActionLoading(true)
    try {
      const { error: rpcErr } = await supabase.rpc('remove_community_member', {
        p_community_id: activeCommunity.id,
        p_target_user_id: member.userId,
      })
      if (rpcErr) {
        const { error: delErr } = await supabase
          .from('community_members')
          .delete()
          .eq('id', member.membershipId)
        if (delErr) {
          await supabase
            .from('community_members')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('id', member.membershipId)
        }
        if (user?.id) {
          await supabase.from('community_activities').insert({
            community_id: activeCommunity.id,
            user_id: user.id,
            activity_type: 'member removed',
            description: `Removed ${member.fullName} from this community`,
            metadata: { action: 'remove', target_user_id: member.userId, removed_by: user.id },
          })
        }
      }
      setIsRemoveModalOpen(false)
      navigate('/members')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Removal failed')
    } finally {
      setIsActionLoading(false)
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
      {/* Toast Notification */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border border-emerald-500/50 bg-[#18202E] text-emerald-300 font-mono text-xs shadow-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

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
      <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <BuilderAvatar
              name={member.fullName}
              src={member.avatarUrl}
              alias={member.awsBuilderAlias}
              isManager={member.role === 'manager'}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-white font-sans tracking-tight">
                  {member.fullName}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                  member.role === 'manager'
                    ? 'bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {member.role === 'manager' ? '👑 Community Manager' : 'Community Member'}
                </span>
                {member.status === 'active' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                    <CheckCircle2 size={11} />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                    Inactive
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-mono flex-wrap">
                <span className="font-semibold text-slate-300">{member.memberTag}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400 font-sans">
                  <Building2 size={13} className="text-[#FF9900]" />
                  {member.institutionName}
                </span>
              </div>

              {/* Compact AWS Builder Identity & Badge Summary */}
              <div className="mt-3 flex items-center gap-2.5 p-2 rounded-xl bg-[#0E141F] border border-[#1F293A] font-mono text-xs flex-wrap">
                <span className="text-[10px] uppercase font-bold text-[#FF9900] tracking-wider px-2 py-0.5 rounded bg-[#FF9900]/15 border border-[#FF9900]/30">
                  AWS BUILDER
                </span>
                <span className="text-white font-semibold">{builderProfile.alias}</span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-300">
                  <strong className="text-[#FF9900]">{builderProfile.badgeCount}</strong> AWS Builder badges
                </span>
                <button
                  type="button"
                  onClick={() => setMainTab('aws_badges')}
                  className="text-xs text-[#FF9900] hover:text-[#EC7211] hover:underline font-sans font-medium flex items-center gap-0.5 cursor-pointer ml-auto"
                >
                  <span>View badges →</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons: Assign Task, View Activity, More */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {isManager && (
              <button
                type="button"
                onClick={() => navigate(`/tasks/assign?memberId=${member.userId}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer"
              >
                <CheckSquare size={14} />
                <span>Assign Task</span>
              </button>
            )}

            <button
              type="button"
              onClick={scrollToActivity}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] transition-all shadow-2xs cursor-pointer"
            >
              <span>View Activity</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] transition-colors cursor-pointer shadow-2xs"
                title="More actions"
              >
                <MoreHorizontal size={16} />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#1F293A] bg-[#141C2B] shadow-2xl py-1.5 z-30 font-mono text-xs animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyEmail()
                      setIsMoreMenuOpen(false)
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-300 hover:bg-[#1E293B] flex items-center justify-between cursor-pointer"
                  >
                    <span>{isCopiedEmail ? 'Email Copied!' : 'Copy Email'}</span>
                    <Mail size={13} className="text-slate-400" />
                  </button>

                  {member.awsBuilderProfileUrl && (
                    <a
                      href={member.awsBuilderProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-3.5 py-2 text-slate-300 hover:bg-[#1E293B] flex items-center justify-between"
                    >
                      <span>AWS Profile</span>
                      <ExternalLink size={13} className="text-slate-400" />
                    </a>
                  )}

                  {isManager && user?.id !== member.userId && (
                    <>
                      <div className="my-1 border-t border-[#1F293A]" />
                      {member.role === 'member' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsPromoteModalOpen(true)
                            setIsMoreMenuOpen(false)
                          }}
                          className="w-full text-left px-3.5 py-2 text-[#FF9900] hover:bg-orange-500/10 flex items-center justify-between font-bold cursor-pointer"
                        >
                          <span>PROMOTE TO MANAGER</span>
                          <Shield size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDemoteModalOpen(true)
                            setIsMoreMenuOpen(false)
                          }}
                          className="w-full text-left px-3.5 py-2 text-amber-400 hover:bg-amber-500/10 flex items-center justify-between font-bold cursor-pointer"
                        >
                          <span>DEMOTE TO MEMBER</span>
                          <UserMinus size={13} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsRemoveModalOpen(true)
                          setIsMoreMenuOpen(false)
                        }}
                        className="w-full text-left px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center justify-between font-bold cursor-pointer"
                      >
                        <span>REMOVE MEMBER</span>
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7 METRICS ROW                                                */}
      {/* AWS Progress, Points, Badges, Tasks, Events, Projects, Contrib */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 font-mono">
        {/* Metric 1: AWS Learning Progress */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>AWS Progress</span>
            <Sparkles size={13} className="text-[#FF9900]" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {metrics.learningProgressPct}%
          </div>
          <div className="w-full bg-[#1E293B] rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#FF9900] to-[#EA580C] h-full rounded-full"
              style={{ width: `${metrics.learningProgressPct}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Community Points (XP) */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Points</span>
            <Trophy size={13} className="text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-300 mt-1">
            {metrics.totalPoints.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Total XP</div>
        </div>

        {/* Metric 3: AWS Badges */}
        <div
          onClick={() => setMainTab('aws_badges')}
          className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] hover:border-[#FF9900]/40 transition-colors shadow-2xs cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>AWS Badges</span>
            <Award size={13} className="text-[#FF9900]" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {builderProfile.badgeCount}
          </div>
          <div className="text-[10px] text-[#FF9900] mt-1 flex items-center gap-1">
            <span>View →</span>
          </div>
        </div>

        {/* Metric 4: Tasks Completed */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Tasks Done</span>
            <CheckSquare size={13} className="text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {metrics.tasksCompleted} <span className="text-[11px] text-slate-500 font-normal">/ {metrics.tasksTotal}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Completed</div>
        </div>

        {/* Metric 5: Events Attended */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Events</span>
            <Calendar size={13} className="text-blue-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {metrics.eventsAttended}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">RSVPs</div>
        </div>

        {/* Metric 6: Projects */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Projects</span>
            <FolderGit2 size={13} className="text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {metrics.projectsCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Initiatives</div>
        </div>

        {/* Metric 7: Contributions */}
        <div className="p-3.5 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Contributions</span>
            <Sparkles size={13} className="text-teal-400" />
          </div>
          <div className="text-lg font-bold text-teal-300 mt-1">
            {metrics.contributionsCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Milestones</div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 7 MAIN PROFILE TABS                                          */}
      {/* Overview, Tasks, Events, Projects, Contributions, AWS Badges, Activity */}
      {/* ============================================================ */}
      <div className="border-b border-[#1F293A] flex items-center gap-2 overflow-x-auto scrollbar-none font-mono text-xs font-semibold">
        {[
          { id: 'overview' as const, label: 'Overview' },
          { id: 'tasks' as const, label: `Tasks (${tasks.length})` },
          { id: 'events' as const, label: `Events (${events.length})` },
          { id: 'projects' as const, label: `Projects (${projects.length})` },
          { id: 'contributions' as const, label: `Contributions (${contributions.length})` },
          { id: 'aws_badges' as const, label: `AWS Badges (${builderProfile.badgeCount})` },
          { id: 'activity' as const, label: `Activity (${activities.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMainTab(tab.id)}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              mainTab === tab.id
                ? 'border-[#FF9900] text-[#FF9900] bg-[#FF9900]/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TAB CONTENT: AWS BADGES TAB                                  */}
      {/* ============================================================ */}
      {mainTab === 'aws_badges' && (
        <AWSBadgesTabContent builderProfile={builderProfile} />
      )}

      {/* ============================================================ */}
      {/* TAB CONTENT: OVERVIEW TAB (2-Column Main Layout)             */}
      {/* ============================================================ */}
      {mainTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT / CENTER COLUMN (2/3): AWS Builder Center, Timeline, Tasks, Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: AWS Builder Center Official Connection */}
            <AWSBuilderCenterSection
              builderProfile={builderProfile}
              onViewBadgesTab={() => setMainTab('aws_badges')}
            />

            {/* AWS Journey Timeline */}
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF9900]" />
              <span>AWS Journey Timeline</span>
            </h2>

            <div className="relative pl-6 border-l-2 border-[#1F293A] space-y-6 font-mono text-xs">
              {/* 1. Started Journey */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#121824] shadow-xs" />
                <div className="font-bold text-slate-200">Started Journey</div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">Enrolled in {activeCommunity?.name} on {member.joinedAt}</div>
              </div>

              {/* 2. Completed Foundations */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-[#121824] shadow-xs ${
                  metrics.tasksCompleted >= 1 ? 'bg-emerald-500' : 'bg-slate-700'
                }`} />
                <div className="font-bold text-slate-200">Completed Foundations</div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">AWS Cloud Practitioner & IAM security basics</div>
              </div>

              {/* 3. Earned First Badge */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-[#121824] shadow-xs ${
                  metrics.badgesCount >= 1 ? 'bg-purple-500' : 'bg-slate-700'
                }`} />
                <div className="font-bold text-slate-200">Earned First Badge</div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">Verified Chapter Builder Milestone</div>
              </div>

              {/* 4. Completed Cloud Module */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-[#121824] shadow-xs ${
                  metrics.tasksCompleted >= 3 ? 'bg-emerald-500' : 'bg-slate-700'
                }`} />
                <div className="font-bold text-slate-200">Completed Cloud Module</div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">AWS Lambda, DynamoDB & Serverless Architecture</div>
              </div>

              {/* 5. Current Learning */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-[#FF9900] border-2 border-[#121824] animate-pulse" />
                <div className="font-bold text-[#FF9900]">Current Learning</div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">Amazon Bedrock Generative AI & Cloud Development Kit</div>
              </div>
            </div>
          </div>

          {/* Tasks Section: Completed / Pending / Overdue Tabs */}
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <CheckSquare size={16} className="text-[#FF9900]" />
                <span>Community Tasks</span>
              </h2>

              {/* Tab Pills */}
              <div className="flex items-center gap-1 bg-[#0E141F] border border-[#1F293A] p-0.5 rounded-xl font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTaskTab('completed')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTaskTab === 'completed'
                      ? 'bg-[#FF9900] text-slate-950 font-bold shadow-2xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Completed ({tasks.filter((t) => t.status === 'completed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTaskTab('pending')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTaskTab === 'pending'
                      ? 'bg-[#FF9900] text-slate-950 font-bold shadow-2xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending ({tasks.filter((t) => t.status === 'pending' || t.status === 'submitted').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTaskTab('overdue')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTaskTab === 'overdue'
                      ? 'bg-[#FF9900] text-slate-950 font-bold shadow-2xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Overdue ({tasks.filter((t) => t.status === 'overdue').length})
                </button>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-500 bg-[#0E141F] rounded-xl border border-dashed border-[#1F293A]">
                No {activeTaskTab} tasks in this community.
              </div>
            ) : (
              <div className="space-y-2.5 font-mono">
                {filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-[#1F293A] bg-[#18202E] hover:border-slate-600 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white font-sans">{t.title}</div>
                      {t.description && (
                        <div className="text-[11px] text-slate-400 font-sans line-clamp-1 mt-0.5">
                          {t.description}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-[#FF9900]/15 text-[#FF9900] font-bold border border-[#FF9900]/30 text-[10px]">
                        +{t.points} XP
                      </span>
                      {t.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 size={10} /> Done
                        </span>
                      ) : t.status === 'overdue' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                          <AlertTriangle size={10} /> Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
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
          <div ref={activitySectionRef} className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-[#FF9900]" />
              <span>Community Activity</span>
            </h2>

            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-500 bg-[#0E141F] rounded-xl border border-dashed border-[#1F293A]">
                No recorded community activity yet.
              </div>
            ) : (
              <div className="space-y-3 font-sans">
                {activities.map((act) => (
                  <div key={act.id} className="p-3 rounded-xl bg-[#18202E] border border-[#1F293A] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#FF9900]/15 text-[#FF9900] flex items-center justify-center shrink-0 mt-0.5 border border-[#FF9900]/30">
                      <Sparkles size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200">{act.description}</div>
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
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Profile Details
            </h2>

            <div className="space-y-3.5 text-xs font-mono divide-y divide-[#1F293A]">
              {/* Institution */}
              <div className="pt-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Institution</span>
                <span className="font-semibold text-slate-200 font-sans mt-0.5 block">{member.institutionName}</span>
                <span className="text-[11px] text-slate-400 font-sans">{member.institutionAddress}</span>
              </div>

              {/* Email */}
              <div className="pt-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Email Address</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-medium text-slate-300 truncate">{member.email}</span>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="text-[10px] text-[#FF9900] hover:underline font-bold shrink-0 ml-2 cursor-pointer"
                  >
                    {isCopiedEmail ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="pt-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Phone Number</span>
                <span className="font-medium text-slate-300 mt-0.5 block">{member.phone}</span>
              </div>

              {/* Member Since */}
              <div className="pt-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Member Since</span>
                <span className="font-medium text-slate-300 mt-0.5 block">{member.joinedAt}</span>
              </div>

              {/* Last Active */}
              <div className="pt-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Active</span>
                <span className="font-semibold text-emerald-400 mt-0.5 block">{member.lastActive}</span>
              </div>
            </div>

            {/* Bio */}
            {member.bio && (
              <div className="pt-3 border-t border-[#1F293A]">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">Bio</span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed mt-1">
                  {member.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ============================================================ */}
      {/* TAB CONTENT: TASKS TAB                                       */}
      {/* ============================================================ */}
      {mainTab === 'tasks' && (
        <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <CheckSquare size={18} className="text-[#FF9900]" />
                <span>Community Tasks & Assignments</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Internal community assignments, milestone verifications, and chapter XP tracking.
              </p>
            </div>

            {/* Tab Pills */}
            <div className="flex items-center gap-1 bg-[#0E141F] border border-[#1F293A] p-0.5 rounded-xl font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveTaskTab('completed')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTaskTab === 'completed'
                    ? 'bg-[#FF9900] text-slate-950 font-bold shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Completed ({tasks.filter((t) => t.status === 'completed').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTaskTab('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTaskTab === 'pending'
                    ? 'bg-[#FF9900] text-slate-950 font-bold shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending ({tasks.filter((t) => t.status === 'pending' || t.status === 'submitted').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTaskTab('overdue')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTaskTab === 'overdue'
                    ? 'bg-[#FF9900] text-slate-950 font-bold shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Overdue ({tasks.filter((t) => t.status === 'overdue').length})
              </button>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-slate-500 bg-[#0E141F] rounded-xl border border-dashed border-[#1F293A]">
              No {activeTaskTab} tasks recorded for this member.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-mono">
              {filteredTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-[#1F293A] bg-[#18202E] hover:border-slate-600 transition-colors flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white font-sans text-sm">{t.title}</div>
                    {t.description && (
                      <div className="text-xs text-slate-400 font-sans line-clamp-2 mt-1">
                        {t.description}
                      </div>
                    )}
                    {t.dueDate && (
                      <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                        <Clock size={11} />
                        <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-[#FF9900]/15 text-[#FF9900] font-bold border border-[#FF9900]/30 text-[11px]">
                      +{t.points} XP
                    </span>
                    {t.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 size={10} /> Completed
                      </span>
                    ) : t.status === 'overdue' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                        <AlertTriangle size={10} /> Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                        <Clock size={10} /> Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB CONTENT: EVENTS TAB                                      */}
      {/* ============================================================ */}
      {mainTab === 'events' && (
        <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Calendar size={18} className="text-blue-400" />
                <span>Chapter Events & Attendance</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Workshops, hackathons, and live community meetings attended by this builder.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
              Total RSVPs: <strong className="text-white">{events.length}</strong>
            </span>
          </div>

          {events.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-slate-500 bg-[#0E141F] rounded-xl border border-dashed border-[#1F293A]">
              No recorded event attendance for this member yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => navigate(`/events/${evt.id}`)}
                  className="p-4 rounded-xl border border-[#1F293A] bg-[#18202E] hover:border-slate-600 transition-all cursor-pointer flex flex-col justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-bold text-white text-sm font-sans line-clamp-1">{evt.title}</span>
                      {evt.attended ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 font-semibold">
                          <CheckCircle2 size={10} /> Attended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
                          RSVP'd
                        </span>
                      )}
                    </div>
                    {evt.description && (
                      <p className="text-slate-400 font-sans line-clamp-2 text-[11px] leading-relaxed">
                        {evt.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-[#1F293A] flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Calendar size={12} className="text-blue-400" />
                      {new Date(evt.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="truncate max-w-[140px] text-slate-500">{evt.location || 'Online'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB CONTENT: PROJECTS TAB                                    */}
      {/* ============================================================ */}
      {mainTab === 'projects' && (
        <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <FolderGit2 size={18} className="text-purple-400" />
                <span>Community Projects</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Collaborative repositories, cloud architectures, and builder portfolio solutions.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Projects: <strong className="text-white">{projects.length}</strong>
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-slate-500 bg-[#0E141F] rounded-xl border border-dashed border-[#1F293A]">
              No community projects recorded for this member yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => navigate('/projects')}
                  className="p-4 rounded-xl border border-[#1F293A] bg-[#18202E] hover:border-slate-600 transition-all cursor-pointer flex flex-col justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-bold text-white text-sm font-sans truncate">{proj.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase shrink-0 font-semibold">
                        {proj.status}
                      </span>
                    </div>
                    {proj.description && (
                      <p className="text-slate-400 font-sans line-clamp-2 text-[11px] leading-relaxed">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-[#1F293A] flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {proj.role || 'Member'}
                      </span>
                      {proj.techTags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.2 rounded bg-[#0E141F] text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2.5 text-slate-400">
                      {proj.githubUrl && (
                        <a
                          href={proj.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-white transition-colors"
                          title="GitHub Repository"
                        >
                          <Github size={14} />
                        </a>
                      )}
                      {proj.liveDemoUrl && (
                        <a
                          href={proj.liveDemoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-[#FF9900] transition-colors"
                          title="Live Demo"
                        >
                          <Globe size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB CONTENT: CONTRIBUTIONS TAB                               */}
      {/* ============================================================ */}
      {mainTab === 'contributions' && (
        <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={18} className="text-teal-400" />
                <span>Peer Contributions & Help</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Verified records of helping chapter members with AWS deployments, troubleshooting, and architectural solutions.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
              Total Contributions: <strong className="text-white">{contributions.length}</strong>
            </span>
          </div>

          {contributions.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-slate-500 bg-[#0E141F] rounded-xl border border-dashed border-[#1F293A]">
              No peer contributions logged for this member yet.
            </div>
          ) : (
            <div className="space-y-3 font-mono">
              {contributions.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-[#1F293A] bg-[#18202E] hover:border-slate-600 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-bold">
                        {c.category}
                      </span>
                      <span className="text-white font-bold font-sans text-sm">{c.title}</span>
                    </div>

                    <p className="text-slate-300 font-sans text-xs leading-relaxed mt-1">
                      {c.description}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                      <span>Recipient: <strong className="text-slate-200">{c.recipientName}</strong></span>
                      <span>•</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      {c.evidenceUrl && (
                        <>
                          <span>•</span>
                          <a
                            href={c.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FF9900] hover:underline flex items-center gap-0.5"
                          >
                            <span>Evidence</span>
                            <ExternalLink size={10} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-[#FF9900]/15 text-[#FF9900] font-bold border border-[#FF9900]/30 text-[11px]">
                      +{c.pointsAwarded} XP
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      c.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : c.status === 'rejected'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB CONTENT: ACTIVITY TAB                                    */}
      {/* ============================================================ */}
      {mainTab === 'activity' && (
        <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Clock size={18} className="text-[#FF9900]" />
                <span>Chapter Activity Timeline</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Full chronological ledger of tasks, RSVPs, peer contributions, and cohort events.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#18202E] text-slate-300 border border-[#1F293A]">
              Events: <strong className="text-white">{activities.length}</strong>
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-slate-500 bg-[#0E141F] rounded-xl border border-dashed border-[#1F293A]">
              No community activity recorded for this member yet.
            </div>
          ) : (
            <div className="space-y-3 font-sans">
              {activities.map((act) => (
                <div key={act.id} className="p-3.5 rounded-xl bg-[#18202E] border border-[#1F293A] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FF9900]/15 text-[#FF9900] flex items-center justify-center shrink-0 mt-0.5 border border-[#FF9900]/30">
                    <Sparkles size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 leading-relaxed">{act.description}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {new Date(act.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
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
      )}

      {/* ============================================================ */}
      {/* CONFIRMATION MODALS (MANAGER ONLY)                          */}
      {/* ============================================================ */}

      {/* 1. PROMOTE CONFIRMATION MODAL */}
      <Modal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        title="Promote to Community Manager?"
        subtitle="Chapter Role Elevation"
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-200">
            Are you sure you want to promote <span className="font-bold text-white">{member?.fullName}</span> to <span className="text-[#FF9900] font-bold">Community Manager</span>?
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            They will obtain full permissions to manage members, review tasks, manage chapter events, and configure {activeCommunity?.name}.
          </p>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsPromoteModalOpen(false)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmPromote}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? 'Promoting...' : 'Confirm Promotion'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. DEMOTE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDemoteModalOpen}
        onClose={() => setIsDemoteModalOpen(false)}
        title="Demote to Member?"
        subtitle="Chapter Role Modification"
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            Are you sure you want to demote <span className="font-bold text-white">{member?.fullName}</span> to <span className="text-amber-400 font-bold">Community Member</span>?
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            They will lose administrative capabilities and return to standard builder participation access in {activeCommunity?.name}.
          </p>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsDemoteModalOpen(false)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDemote}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? 'Demoting...' : 'Confirm Demotion'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. REMOVE MEMBER CONFIRMATION MODAL */}
      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        title="Remove Member from Community?"
        subtitle="Membership Dissociation"
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            Remove this member from this community?
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            Are you sure you want to remove <span className="font-bold text-white">{member?.fullName}</span> from <span className="text-white font-bold">{activeCommunity?.name}</span>?
          </p>
          <div className="p-2.5 rounded-lg bg-[#18202E] border border-[#1F293A] text-slate-400 text-[11px] font-sans">
            Note: Community membership removal and account deletion are different operations. Their Supabase Auth account will NOT be deleted.
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsRemoveModalOpen(false)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRemove}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? 'Removing...' : 'Remove Member'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
