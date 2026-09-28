import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  UserPlus,
  Download,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  Building2,
  LayoutGrid,
  List,
  Sparkles,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserMinus,
  Check,
  X,
  Calendar,
  FolderGit2,
  Trophy,
  Award,
  ChevronRight,
  Eye,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { BuilderAvatar, CommunityImage } from '@/components/ui'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddMemberModal } from '@/components/members/AddMemberModal'
import { Modal } from '@/components/ui/Modal'

export interface CommunityMemberRow {
  membershipId: string
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  memberTag: string
  awsBuilderAlias: string | null
  role: 'manager' | 'member'
  status: 'active' | 'inactive'
  joinedDate: string
  joinedDateRaw: string
  lastActive: string
  tasksTotal: number
  tasksCompleted: number
  eventsAttended: number
  projectsCount: number
  points: number
  badgesCount: number
  awsProgressPct: number
  isNeedsAttention: boolean
}

type FilterType = 'All' | 'Active' | 'Needs Attention' | 'Inactive' | 'Managers' | 'Members'
type SortType =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'points-high'
  | 'tasks-completed'
  | 'events-attended'

export const Members: React.FC = () => {
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [members, setMembers] = useState<CommunityMemberRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Controls state
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('All')
  const [sortOption, setSortOption] = useState<SortType>('newest')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null)

  // Confirmation Modals State (PROMOTE / DEMOTE / REMOVE)
  const [memberToPromote, setMemberToPromote] = useState<CommunityMemberRow | null>(null)
  const [memberToDemote, setMemberToDemote] = useState<CommunityMemberRow | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<CommunityMemberRow | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const isManager = userRoleInActiveCommunity === 'manager'

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // ==========================================================================
  // FETCH ALL COMMUNITY MEMBERS AND ACTIVITY DATA
  // ==========================================================================
  const fetchCommunityMembers = async () => {
    if (!activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // 1. Query community_members joined with profiles
      const { data: cmData, error: cmError } = await supabase
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
            created_at
          )
        `)
        .eq('community_id', activeCommunity.id)
        .order('joined_at', { ascending: false })

      if (cmError) throw cmError

      // 2. Query community task assignments for tasks count & points
      const { data: taskData } = await supabase
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

      // 3. Query community activities for events attended (RSVPs) & last active
      const { data: actData } = await supabase
        .from('community_activities')
        .select('user_id, activity_type, created_at')
        .eq('community_id', activeCommunity.id)
        .order('created_at', { ascending: false })

      // 4. Query community projects created per user
      const { data: projData } = await supabase
        .from('community_projects')
        .select('created_by')
        .eq('community_id', activeCommunity.id)

      // Aggregate task stats & task points per user
      const userTasksMap = new Map<string, { total: number; completed: number; overdue: number; points: number }>()
      if (taskData) {
        for (const t of taskData) {
          const cur = userTasksMap.get(t.user_id) || { total: 0, completed: 0, overdue: 0, points: 0 }
          cur.total += 1
          if (t.status === 'completed') {
            cur.completed += 1
            const pts = (t.community_tasks as { points?: number } | null)?.points || 50
            cur.points += pts
          }
          if (t.status === 'overdue') cur.overdue += 1
          userTasksMap.set(t.user_id, cur)
        }
      }

      // Aggregate events attended & last active per user
      const userEventsMap = new Map<string, number>()
      const userLastActiveMap = new Map<string, string>()
      if (actData) {
        for (const a of actData) {
          if (a.user_id) {
            if (a.activity_type === 'joined event') {
              userEventsMap.set(a.user_id, (userEventsMap.get(a.user_id) || 0) + 1)
            }
            if (!userLastActiveMap.has(a.user_id)) {
              userLastActiveMap.set(a.user_id, a.created_at)
            }
          }
        }
      }

      // Aggregate projects created per user
      const userProjectsMap = new Map<string, number>()
      if (projData) {
        for (const p of projData) {
          if (p.created_by) {
            userProjectsMap.set(p.created_by, (userProjectsMap.get(p.created_by) || 0) + 1)
          }
        }
      }

      // Format records into CommunityMemberRow with all 11 required fields
      const formatted: CommunityMemberRow[] = (cmData || []).map((cm: Record<string, unknown>) => {
        const p = (cm.profiles || {}) as Record<string, unknown>
        const userId = cm.user_id as string
        const name = (p.full_name as string) || (p.email as string)?.split('@')[0] || 'Community Builder'
        const tasks = userTasksMap.get(userId) || { total: 0, completed: 0, overdue: 0, points: 0 }
        const eventsAttended = userEventsMap.get(userId) || 0
        const projectsCount = userProjectsMap.get(userId) || 0

        // Total community points = task points + event attendance points (25 XP each)
        const totalPoints = tasks.points + eventsAttended * 25

        // AWS Progress formula based on completed tasks
        let progress = 20
        if (tasks.total > 0) {
          progress = Math.round((tasks.completed / tasks.total) * 100)
        }

        // AWS Badges calculation
        let badges = 1
        if (tasks.completed >= 5) badges = 4
        else if (tasks.completed >= 2) badges = 2

        // Needs Attention condition: overdue tasks OR active with total tasks > 0 and 0 completed
        const isNeedsAttn = tasks.overdue > 0 || (tasks.total > 2 && tasks.completed === 0)

        // Last active calculation
        const rawLastActive = userLastActiveMap.get(userId) || (cm.updated_at as string) || (cm.joined_at as string)
        const lastActiveDate = new Date(rawLastActive)
        const diffHours = Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60))
        let lastActiveStr = 'Today'
        if (diffHours >= 48) {
          lastActiveStr = `${Math.floor(diffHours / 24)}d ago`
        } else if (diffHours >= 24) {
          lastActiveStr = 'Yesterday'
        } else if (diffHours >= 1) {
          lastActiveStr = `${diffHours}h ago`
        } else {
          lastActiveStr = 'Just now'
        }

        const alias = (p.aws_builder_alias as string) || null
        const memberTag = alias ? `@${alias}` : `MEM-${userId.slice(0, 4).toUpperCase()}`

        return {
          membershipId: cm.id as string,
          userId,
          fullName: name,
          email: (p.email as string) || '',
          avatarUrl: (p.avatar_url as string) || null,
          memberTag,
          awsBuilderAlias: alias,
          role: cm.role as 'manager' | 'member',
          status: (cm.status as 'active' | 'inactive') || 'active',
          joinedDate: new Date(cm.joined_at as string).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          joinedDateRaw: cm.joined_at as string,
          lastActive: lastActiveStr,
          tasksTotal: tasks.total,
          tasksCompleted: tasks.completed,
          eventsAttended,
          projectsCount,
          points: totalPoints,
          badgesCount: badges,
          awsProgressPct: progress,
          isNeedsAttention: isNeedsAttn,
        }
      })

      setMembers(formatted)
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to query community members roster.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCommunityMembers()
  }, [activeCommunity?.id])

  // Filter and Search logic
  const filteredMembers = useMemo(() => {
    let result = [...members]

    // Search query: name, email, or AWS builder alias
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      result = result.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.memberTag.toLowerCase().includes(q) ||
          (m.awsBuilderAlias && m.awsBuilderAlias.toLowerCase().includes(q))
      )
    }

    // Filter pill selection
    switch (activeFilter) {
      case 'Active':
        result = result.filter((m) => m.status === 'active')
        break
      case 'Needs Attention':
        result = result.filter((m) => m.isNeedsAttention)
        break
      case 'Inactive':
        result = result.filter((m) => m.status === 'inactive')
        break
      case 'Managers':
        result = result.filter((m) => m.role === 'manager')
        break
      case 'Members':
        result = result.filter((m) => m.role === 'member')
        break
      case 'All':
      default:
        break
    }

    // Sort order
    switch (sortOption) {
      case 'newest':
        result.sort((a, b) => new Date(b.joinedDateRaw).getTime() - new Date(a.joinedDateRaw).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.joinedDateRaw).getTime() - new Date(b.joinedDateRaw).getTime())
        break
      case 'name-asc':
        result.sort((a, b) => a.fullName.localeCompare(b.fullName))
        break
      case 'name-desc':
        result.sort((a, b) => b.fullName.localeCompare(a.fullName))
        break
      case 'points-high':
        result.sort((a, b) => b.points - a.points)
        break
      case 'tasks-completed':
        result.sort((a, b) => b.tasksCompleted - a.tasksCompleted)
        break
      case 'events-attended':
        result.sort((a, b) => b.eventsAttended - a.eventsAttended)
        break
    }

    return result
  }, [members, searchTerm, activeFilter, sortOption])

  // Filter counts
  const filterCounts = useMemo(() => {
    return {
      All: members.length,
      Active: members.filter((m) => m.status === 'active').length,
      'Needs Attention': members.filter((m) => m.isNeedsAttention).length,
      Inactive: members.filter((m) => m.status === 'inactive').length,
      Managers: members.filter((m) => m.role === 'manager').length,
      Members: members.filter((m) => m.role === 'member').length,
    }
  }, [members])

  // ==========================================================================
  // CSV EXPORT (Authorized community roster data only, no private data)
  // ==========================================================================
  const handleExportCSV = () => {
    if (filteredMembers.length === 0) return

    const headers = [
      'Name',
      'AWS Builder Alias',
      'Community Role',
      'Status',
      'Tasks Completed',
      'Total Tasks',
      'Events Attended',
      'Projects Created',
      'Community Points (XP)',
      'AWS Badges',
      'Joined Date',
      'Last Active',
    ]

    const csvRows = [headers.join(',')]
    for (const m of filteredMembers) {
      const row = [
        `"${m.fullName.replace(/"/g, '""')}"`,
        `"${m.awsBuilderAlias || '—'}"`,
        `"${m.role === 'manager' ? 'Community Manager' : 'Member'}"`,
        `"${m.status}"`,
        m.tasksCompleted,
        m.tasksTotal,
        m.eventsAttended,
        m.projectsCount,
        m.points,
        m.badgesCount,
        `"${m.joinedDate}"`,
        `"${m.lastActive}"`,
      ]
      csvRows.push(row.join(','))
    }

    const csvContent = '\uFEFF' + csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `members-${activeCommunity?.short_name || 'community'}-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ==========================================================================
  // PROMOTE MEMBER (Database controlled, audited, confirmed)
  // ==========================================================================
  const handleConfirmPromote = async () => {
    if (!memberToPromote || !activeCommunity || !isManager) return
    setIsActionLoading(true)

    try {
      // 1. Try server RPC function
      const { error: rpcErr } = await supabase.rpc('promote_community_member', {
        p_community_id: activeCommunity.id,
        p_target_user_id: memberToPromote.userId,
      })

      if (rpcErr) {
        console.warn('RPC promote failed, falling back to direct update:', rpcErr.message)
        // Direct RLS-protected update fallback
        const { error: updateErr } = await supabase
          .from('community_members')
          .update({ role: 'manager', updated_at: new Date().toISOString() })
          .eq('id', memberToPromote.membershipId)

        if (updateErr) throw updateErr

        // Write activity/audit event
        if (user?.id) {
          await supabase.from('community_activities').insert({
            community_id: activeCommunity.id,
            user_id: user.id,
            activity_type: 'role changed',
            description: `Promoted ${memberToPromote.fullName} to Community Manager`,
            metadata: {
              action: 'promote',
              target_user_id: memberToPromote.userId,
              new_role: 'manager',
              changed_by: user.id,
            },
          })
        }
      }

      // Update UI state
      setMembers((prev) =>
        prev.map((item) =>
          item.userId === memberToPromote.userId ? { ...item, role: 'manager' } : item
        )
      )
      showToast(`${memberToPromote.fullName} promoted to Community Manager`)
      setMemberToPromote(null)
      setActionMenuOpenId(null)
    } catch (err) {
      console.error('Failed to promote member:', err)
      showToast(err instanceof Error ? err.message : 'Failed to promote member', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // ==========================================================================
  // DEMOTE MANAGER (Database controlled, audited, confirmed)
  // ==========================================================================
  const handleConfirmDemote = async () => {
    if (!memberToDemote || !activeCommunity || !isManager) return
    setIsActionLoading(true)

    try {
      // 1. Try server RPC function
      const { error: rpcErr } = await supabase.rpc('demote_community_member', {
        p_community_id: activeCommunity.id,
        p_target_user_id: memberToDemote.userId,
      })

      if (rpcErr) {
        console.warn('RPC demote failed, falling back to direct update:', rpcErr.message)
        // Direct RLS-protected update fallback
        const { error: updateErr } = await supabase
          .from('community_members')
          .update({ role: 'member', updated_at: new Date().toISOString() })
          .eq('id', memberToDemote.membershipId)

        if (updateErr) throw updateErr

        // Write activity/audit event
        if (user?.id) {
          await supabase.from('community_activities').insert({
            community_id: activeCommunity.id,
            user_id: user.id,
            activity_type: 'role changed',
            description: `Demoted ${memberToDemote.fullName} to Community Member`,
            metadata: {
              action: 'demote',
              target_user_id: memberToDemote.userId,
              new_role: 'member',
              changed_by: user.id,
            },
          })
        }
      }

      // Update UI state
      setMembers((prev) =>
        prev.map((item) =>
          item.userId === memberToDemote.userId ? { ...item, role: 'member' } : item
        )
      )
      showToast(`${memberToDemote.fullName} demoted to Community Member`)
      setMemberToDemote(null)
      setActionMenuOpenId(null)
    } catch (err) {
      console.error('Failed to demote manager:', err)
      showToast(err instanceof Error ? err.message : 'Failed to demote member', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // ==========================================================================
  // REMOVE MEMBER (Database controlled, audited, confirmed)
  // Does NOT delete user Supabase Auth account!
  // ==========================================================================
  const handleConfirmRemove = async () => {
    if (!memberToRemove || !activeCommunity || !isManager) return
    setIsActionLoading(true)

    try {
      // 1. Try server RPC function
      const { error: rpcErr } = await supabase.rpc('remove_community_member', {
        p_community_id: activeCommunity.id,
        p_target_user_id: memberToRemove.userId,
      })

      if (rpcErr) {
        console.warn('RPC remove failed, falling back to delete query:', rpcErr.message)
        // Delete membership only (Leaves Auth and Profile intact!)
        const { error: delErr } = await supabase
          .from('community_members')
          .delete()
          .eq('id', memberToRemove.membershipId)

        if (delErr) {
          console.warn('Delete restricted, marking as inactive instead:', delErr.message)
          await supabase
            .from('community_members')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('id', memberToRemove.membershipId)
        }

        // Write activity/audit event
        if (user?.id) {
          await supabase.from('community_activities').insert({
            community_id: activeCommunity.id,
            user_id: user.id,
            activity_type: 'member removed',
            description: `Removed ${memberToRemove.fullName} from this community`,
            metadata: {
              action: 'remove',
              target_user_id: memberToRemove.userId,
              removed_by: user.id,
            },
          })
        }
      }

      // Update UI state
      setMembers((prev) => prev.filter((item) => item.userId !== memberToRemove.userId))
      showToast(`${memberToRemove.fullName} removed from this community`)
      setMemberToRemove(null)
      setActionMenuOpenId(null)
    } catch (err) {
      console.error('Failed to remove member:', err)
      showToast(err instanceof Error ? err.message : 'Failed to remove member', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border font-mono text-xs shadow-2xl flex items-center gap-2 animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-[#18202E] border-emerald-500/50 text-emerald-300'
              : 'bg-[#18202E] border-rose-500/50 text-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400" />
          ) : (
            <AlertCircle size={16} className="text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F293A] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
              Members Directory
            </h1>
            {activeCommunity && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-orange-500/10 text-[#FF9900] border border-orange-500/30">
                <Building2 size={12} />
                {activeCommunity.short_name}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1 font-sans">
            Manage roles, view progress, and audit chapter participation.
          </p>
        </div>

        {/* Top Actions: Add Member + Export */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredMembers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-slate-300 bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Export filtered roster to CSV"
          >
            <Download size={14} className="text-slate-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {isManager && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer"
            >
              <UserPlus size={14} />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar: Search + Filters + Sort + View Toggle */}
      <div className="space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or @alias..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#121824] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors shadow-2xs"
            />
          </div>

          {/* Sort & View Toggle Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortType)}
                className="appearance-none pl-8 pr-8 py-2 text-xs font-mono rounded-xl bg-[#121824] border border-[#1F293A] text-slate-200 focus:outline-none focus:border-[#FF9900] cursor-pointer shadow-2xs"
              >
                <option value="newest" className="bg-[#121824] text-white">Sort: Newest Joined</option>
                <option value="oldest" className="bg-[#121824] text-white">Sort: Oldest Joined</option>
                <option value="name-asc" className="bg-[#121824] text-white">Sort: Name (A-Z)</option>
                <option value="name-desc" className="bg-[#121824] text-white">Sort: Name (Z-A)</option>
                <option value="points-high" className="bg-[#121824] text-white">Sort: Highest Points</option>
                <option value="tasks-completed" className="bg-[#121824] text-white">Sort: Most Tasks</option>
                <option value="events-attended" className="bg-[#121824] text-white">Sort: Most Events</option>
              </select>
              <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* View Toggle (Table vs Cards) */}
            <div className="hidden sm:flex items-center p-0.5 rounded-xl border border-[#1F293A] bg-[#121824] shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-[#FF9900]/15 text-[#FF9900]' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table view"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-[#FF9900]/15 text-[#FF9900]' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Cards view"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(['All', 'Active', 'Needs Attention', 'Inactive', 'Managers', 'Members'] as FilterType[]).map(
            (f) => {
              const count = filterCounts[f]
              const isSelected = activeFilter === f
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all shrink-0 cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-[#FF9900] text-slate-950 font-bold shadow-xs'
                      : 'bg-[#121824] text-slate-400 hover:text-slate-200 hover:bg-[#18202E] border border-[#1F293A]'
                  }`}
                >
                  <span>{f}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-black/20 text-slate-950'
                        : 'bg-[#18202E] text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            }
          )}
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      {isLoading ? (
        <div className="py-16">
          <LoadingState message="Loading community members directory..." />
        </div>
      ) : errorMessage ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center font-mono">
          <p className="text-sm text-red-400 font-semibold">{errorMessage}</p>
          <button
            type="button"
            onClick={fetchCommunityMembers}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Retry Query</span>
          </button>
        </div>
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          title="No members found"
          description={
            searchTerm
              ? `No members matching "${searchTerm}" in this community.`
              : 'There are no members registered in this category yet.'
          }
          icon={<Users size={24} className="text-slate-400" />}
          badge="Roster"
        />
      ) : (
        <>
          {/* ============================================================ */}
          {/* 1. TABLE VIEW: ALL 11 COLUMNS                                */}
          {/* Photo | Name | Alias | Role | Tasks | Events | Projects |     */}
          {/* Points | Badges | Joined Date | Status | Actions             */}
          {/* ============================================================ */}
          <div className={`${viewMode === 'table' ? 'hidden md:block' : 'hidden'} rounded-2xl border border-[#1F293A] bg-[#121824] overflow-hidden shadow-xs`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-[#1F293A] bg-[#0E141F] font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    <th scope="col" className="py-3.5 px-3 w-10 text-center">Photo</th>
                    <th scope="col" className="py-3.5 px-3">Name</th>
                    <th scope="col" className="py-3.5 px-3">AWS Alias</th>
                    <th scope="col" className="py-3.5 px-3">Role</th>
                    <th scope="col" className="py-3.5 px-3 text-center">Tasks</th>
                    <th scope="col" className="py-3.5 px-3 text-center">Events</th>
                    <th scope="col" className="py-3.5 px-3 text-center">Projects</th>
                    <th scope="col" className="py-3.5 px-3 text-center">Points</th>
                    <th scope="col" className="py-3.5 px-3 text-center">AWS Badges</th>
                    <th scope="col" className="py-3.5 px-3">Joined Date</th>
                    <th scope="col" className="py-3.5 px-3 text-center">Status</th>
                    <th scope="col" className="py-3.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#1F293A]/60 font-mono text-xs">
                  {filteredMembers.map((m) => (
                    <tr
                      key={m.membershipId}
                      className="hover:bg-[#18202E]/60 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/members/${m.userId}`)}
                    >
                      {/* 1. Photo */}
                      <td className="py-3 px-3 text-center">
                        <BuilderAvatar
                          name={m.fullName}
                          src={m.avatarUrl}
                          alias={m.awsBuilderAlias}
                          isManager={m.role === 'manager'}
                          size="sm"
                        />
                      </td>

                      {/* 2. Name */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white group-hover:text-[#FF9900] transition-colors truncate max-w-[140px]">
                          {m.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans truncate max-w-[140px]">
                          {m.email}
                        </div>
                      </td>

                      {/* 3. AWS Builder Alias */}
                      <td className="py-3 px-3 text-slate-300">
                        {m.awsBuilderAlias ? (
                          <span className="text-[#FF9900] font-semibold">
                            @{m.awsBuilderAlias}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* 4. Role */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            m.role === 'manager'
                              ? 'bg-orange-500/15 border border-orange-500/30 text-[#FF9900]'
                              : 'bg-slate-800 border border-slate-700 text-slate-300'
                          }`}
                        >
                          {m.role === 'manager' ? '👑 Manager' : 'Member'}
                        </span>
                      </td>

                      {/* 5. Tasks */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-white">{m.tasksCompleted}</span>
                        <span className="text-slate-500 text-[11px]">/{m.tasksTotal}</span>
                      </td>

                      {/* 6. Events */}
                      <td className="py-3 px-3 text-center text-blue-400 font-semibold">
                        {m.eventsAttended}
                      </td>

                      {/* 7. Projects */}
                      <td className="py-3 px-3 text-center text-purple-400 font-semibold">
                        {m.projectsCount}
                      </td>

                      {/* 8. Points */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-amber-400 font-bold">
                          {m.points.toLocaleString()}
                        </span>
                      </td>

                      {/* 9. AWS Badges */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/members/${m.userId}?tab=aws_badges`)
                        }}
                      >
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#FF9900]/10 text-[#FF9900] hover:bg-[#FF9900]/20 border border-[#FF9900]/30 transition-colors cursor-pointer"
                          title="View AWS Builder Center Badges"
                        >
                          <Sparkles size={10} />
                          <span>{m.badgesCount} badges</span>
                        </button>
                      </td>

                      {/* 10. Joined Date */}
                      <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {m.joinedDate}
                      </td>

                      {/* 11. Status */}
                      <td className="py-3 px-3 text-center">
                        {m.isNeedsAttention ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                            <AlertTriangle size={10} />
                            Attention
                          </span>
                        ) : m.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                            <CheckCircle2 size={10} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setActionMenuOpenId(actionMenuOpenId === m.membershipId ? null : m.membershipId)
                            }
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Member Actions"
                          >
                            <MoreHorizontal size={15} />
                          </button>

                          {actionMenuOpenId === m.membershipId && (
                            <div className="absolute right-0 mt-1 w-48 rounded-xl border border-[#1F293A] bg-[#141C2B] shadow-2xl py-1.5 z-30 font-mono text-xs animate-fadeIn">
                              <Link
                                to={`/members/${m.userId}`}
                                className="w-full text-left px-3.5 py-1.5 text-slate-300 hover:bg-[#1E293B] hover:text-white flex items-center justify-between"
                              >
                                <span>VIEW PROFILE</span>
                                <Eye size={12} className="text-slate-400" />
                              </Link>

                              {isManager && (
                                <>
                                  <div className="my-1 border-t border-[#1F293A]" />
                                  {m.role === 'member' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMemberToPromote(m)
                                        setActionMenuOpenId(null)
                                      }}
                                      className="w-full text-left px-3.5 py-1.5 text-[#FF9900] hover:bg-orange-500/10 flex items-center justify-between cursor-pointer font-bold"
                                    >
                                      <span>PROMOTE TO HEAD</span>
                                      <Shield size={12} />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMemberToDemote(m)
                                        setActionMenuOpenId(null)
                                      }}
                                      className="w-full text-left px-3.5 py-1.5 text-amber-400 hover:bg-amber-500/10 flex items-center justify-between cursor-pointer font-bold"
                                    >
                                      <span>DEMOTE TO MEMBER</span>
                                      <UserMinus size={12} />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMemberToRemove(m)
                                      setActionMenuOpenId(null)
                                    }}
                                    className="w-full text-left px-3.5 py-1.5 text-rose-400 hover:bg-rose-500/10 flex items-center justify-between cursor-pointer font-bold"
                                  >
                                    <span>REMOVE MEMBER</span>
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 2. CARDS VIEW (Mobile default or desktop toggle)             */}
          {/* ============================================================ */}
          <div className={`${viewMode === 'cards' ? 'block' : 'block md:hidden'} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5`}>
            {filteredMembers.map((m) => (
              <div
                key={m.membershipId}
                onClick={() => navigate(`/members/${m.userId}`)}
                className="p-4 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs hover:border-[#FF9900]/50 hover:bg-[#151D2C] transition-all cursor-pointer flex flex-col justify-between gap-3 font-mono"
              >
                {/* Header: Photo + Name + Alias + Role */}
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <BuilderAvatar
                        name={m.fullName}
                        src={m.avatarUrl}
                        alias={m.awsBuilderAlias}
                        isManager={m.role === 'manager'}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white font-sans truncate">
                          {m.fullName}
                        </h4>
                        <div className="text-xs text-[#FF9900] truncate">
                          {m.awsBuilderAlias ? `@${m.awsBuilderAlias}` : m.memberTag}
                        </div>
                      </div>
                    </div>

                    {/* Role & Status Pill */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          m.role === 'manager'
                            ? 'bg-orange-500/15 border border-orange-500/30 text-[#FF9900]'
                            : 'bg-slate-800 border border-slate-700 text-slate-300'
                        }`}
                      >
                        {m.role === 'manager' ? '👑 Manager' : 'Member'}
                      </span>
                      {m.isNeedsAttention ? (
                        <span className="text-[10px] text-amber-300 font-semibold">
                          Needs Attn
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4 Stats Grid: Tasks, Events, Projects, Points */}
                  <div className="grid grid-cols-4 gap-2 mt-3.5 pt-3 border-t border-[#1F293A] text-center text-xs">
                    <div className="bg-[#18202E] p-2 rounded-xl border border-[#1F293A]">
                      <div className="text-[10px] text-slate-400 uppercase">Tasks</div>
                      <div className="font-bold text-white mt-0.5">
                        {m.tasksCompleted}/{m.tasksTotal}
                      </div>
                    </div>

                    <div className="bg-[#18202E] p-2 rounded-xl border border-[#1F293A]">
                      <div className="text-[10px] text-blue-400 uppercase">Events</div>
                      <div className="font-bold text-white mt-0.5">
                        {m.eventsAttended}
                      </div>
                    </div>

                    <div className="bg-[#18202E] p-2 rounded-xl border border-[#1F293A]">
                      <div className="text-[10px] text-purple-400 uppercase">Projects</div>
                      <div className="font-bold text-white mt-0.5">
                        {m.projectsCount}
                      </div>
                    </div>

                    <div className="bg-[#18202E] p-2 rounded-xl border border-[#1F293A]">
                      <div className="text-[10px] text-amber-400 uppercase">Points</div>
                      <div className="font-bold text-amber-300 mt-0.5">
                        {m.points}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer: Joined date + Action Buttons */}
                <div className="pt-2 border-t border-[#1F293A] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Joined {m.joinedDate}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/members/${m.userId}`}
                      className="px-2.5 py-1 rounded-lg bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] text-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <Eye size={12} />
                      <span>View</span>
                    </Link>

                    {isManager && (
                      <>
                        {m.role === 'member' ? (
                          <button
                            type="button"
                            onClick={() => setMemberToPromote(m)}
                            className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-[#FF9900] text-xs font-semibold cursor-pointer"
                            title="Promote to Manager"
                          >
                            Promote
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setMemberToDemote(m)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold cursor-pointer"
                            title="Demote to Member"
                          >
                            Demote
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setMemberToRemove(m)}
                          className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 cursor-pointer"
                          title="Remove from Community"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* 3. CONFIRMATION MODALS                                         */}
      {/* ============================================================== */}

      {/* A. PROMOTE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!memberToPromote}
        onClose={() => setMemberToPromote(null)}
        title="Promote to Community Manager?"
        subtitle="Chapter Authority Elevation"
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-200">
            Are you sure you want to promote <span className="font-bold text-white">{memberToPromote?.fullName}</span> to <span className="text-[#FF9900] font-bold">Community Manager</span>?
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            They will be granted authority to assign tasks, publish events, review submissions, and manage roster privileges for {activeCommunity?.name}.
          </p>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setMemberToPromote(null)}
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

      {/* B. DEMOTE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!memberToDemote}
        onClose={() => setMemberToDemote(null)}
        title="Demote to Member?"
        subtitle="Chapter Role Modification"
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            Are you sure you want to demote <span className="font-bold text-white">{memberToDemote?.fullName}</span> to <span className="text-amber-400 font-bold">Community Member</span>?
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            They will lose administrative capabilities and return to standard builder participation access in {activeCommunity?.name}.
          </p>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setMemberToDemote(null)}
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

      {/* C. REMOVE MEMBER CONFIRMATION MODAL */}
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remove Member from Community?"
        subtitle="Membership Dissociation"
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            Remove this member from this community?
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            Are you sure you want to remove <span className="font-bold text-white">{memberToRemove?.fullName}</span> from <span className="text-white font-bold">{activeCommunity?.name}</span>?
          </p>
          <div className="p-2.5 rounded-lg bg-[#18202E] border border-[#1F293A] text-slate-400 text-[11px] font-sans">
            Note: Community membership removal and account deletion are different operations. Their Supabase Auth account will NOT be deleted.
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setMemberToRemove(null)}
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

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onMemberAdded={fetchCommunityMembers}
        isManager={isManager}
      />
    </div>
  )
}
