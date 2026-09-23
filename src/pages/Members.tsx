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
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  Building2,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddMemberModal } from '@/components/members/AddMemberModal'

export interface CommunityMemberRow {
  membershipId: string
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  memberTag: string
  role: 'manager' | 'member'
  status: 'active' | 'inactive'
  joinedDate: string
  joinedDateRaw: string
  lastActive: string
  tasksTotal: number
  tasksCompleted: number
  badgesCount: number
  awsProgressPct: number
  isNeedsAttention: boolean
}

type FilterType = 'All' | 'Active' | 'Needs Attention' | 'Inactive' | 'Community Head' | 'Member'
type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'progress-high' | 'tasks-completed'

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

  const isManager = userRoleInActiveCommunity === 'manager'

  // Fetch real community_members data strictly scoped to activeCommunity.id
  const fetchCommunityMembers = async () => {
    if (!activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // 1. Query community_members joined with profiles strictly by activeCommunity.id
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

      // 2. Query community task assignments for progress calculation
      const { data: taskData } = await supabase
        .from('community_task_assignments')
        .select('user_id, status, completed_at')
        .eq('community_id', activeCommunity.id)

      // 3. Query community activities to determine last active timestamp
      const { data: actData } = await supabase
        .from('community_activities')
        .select('user_id, created_at')
        .eq('community_id', activeCommunity.id)
        .order('created_at', { ascending: false })

      // Aggregate task stats per user
      const userTasksMap = new Map<string, { total: number; completed: number; overdue: number }>()
      if (taskData) {
        for (const t of taskData) {
          const cur = userTasksMap.get(t.user_id) || { total: 0, completed: 0, overdue: 0 }
          cur.total += 1
          if (t.status === 'completed') cur.completed += 1
          if (t.status === 'overdue') cur.overdue += 1
          userTasksMap.set(t.user_id, cur)
        }
      }

      // Map last active activity per user
      const userLastActiveMap = new Map<string, string>()
      if (actData) {
        for (const a of actData) {
          if (a.user_id && !userLastActiveMap.has(a.user_id)) {
            userLastActiveMap.set(a.user_id, a.created_at)
          }
        }
      }

      // Format records into CommunityMemberRow
      const formatted: CommunityMemberRow[] = (cmData || []).map((cm: any) => {
        const p = cm.profiles || {}
        const name = p.full_name || p.email?.split('@')[0] || 'Community Builder'
        const tasks = userTasksMap.get(cm.user_id) || { total: 0, completed: 0, overdue: 0 }

        // AWS Progress formula: based on completed tasks, or baseline 20%
        let progress = 20
        if (tasks.total > 0) {
          progress = Math.round((tasks.completed / tasks.total) * 100)
        }

        // Badges calculation
        let badges = 1
        if (tasks.completed >= 5) badges = 3
        else if (tasks.completed >= 2) badges = 2

        // Needs Attention condition: overdue tasks OR active with total tasks > 0 and 0 completed
        const isNeedsAttn = tasks.overdue > 0 || (tasks.total > 2 && tasks.completed === 0)

        // Last active time
        const rawLastActive = userLastActiveMap.get(cm.user_id) || cm.updated_at || cm.joined_at
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

        // Member ID / Alias
        const memberTag = p.aws_builder_alias
          ? `@${p.aws_builder_alias}`
          : `MEM-${cm.user_id.slice(0, 4).toUpperCase()}`

        return {
          membershipId: cm.id,
          userId: cm.user_id,
          fullName: name,
          email: p.email || '',
          avatarUrl: p.avatar_url || null,
          memberTag,
          role: cm.role as 'manager' | 'member',
          status: cm.status as 'active' | 'inactive',
          joinedDate: new Date(cm.joined_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          joinedDateRaw: cm.joined_at,
          lastActive: lastActiveStr,
          tasksTotal: tasks.total,
          tasksCompleted: tasks.completed,
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

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      result = result.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.memberTag.toLowerCase().includes(q)
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
      case 'Community Head':
        result = result.filter((m) => m.role === 'manager')
        break
      case 'Member':
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
      case 'progress-high':
        result.sort((a, b) => b.awsProgressPct - a.awsProgressPct)
        break
      case 'tasks-completed':
        result.sort((a, b) => b.tasksCompleted - a.tasksCompleted)
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
      'Community Head': members.filter((m) => m.role === 'manager').length,
      Member: members.filter((m) => m.role === 'member').length,
    }
  }, [members])

  // Export to CSV functionality
  const handleExportCSV = () => {
    if (filteredMembers.length === 0) return

    const headers = [
      'Name',
      'Email',
      'Member ID',
      'Community Role',
      'Status',
      'AWS Progress (%)',
      'Tasks Completed',
      'Total Tasks',
      'Badges',
      'Joined Date',
      'Last Active',
    ]

    const csvRows = [headers.join(',')]
    for (const m of filteredMembers) {
      const row = [
        `"${m.fullName.replace(/"/g, '""')}"`,
        `"${m.email}"`,
        `"${m.memberTag}"`,
        `"${m.role === 'manager' ? 'Community Head' : 'Member'}"`,
        `"${m.status}"`,
        `"${m.awsProgressPct}%"`,
        m.tasksCompleted,
        m.tasksTotal,
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

  // Toggle member status (manager action)
  const handleToggleStatus = async (m: CommunityMemberRow) => {
    if (!isManager) return
    const newStatus = m.status === 'active' ? 'inactive' : 'active'
    try {
      await supabase
        .from('community_members')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', m.membershipId)

      setMembers((prev) =>
        prev.map((item) => (item.membershipId === m.membershipId ? { ...item, status: newStatus } : item))
      )
      setActionMenuOpenId(null)
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  // Toggle member role (manager action)
  const handleToggleRole = async (m: CommunityMemberRow) => {
    if (!isManager) return
    const newRole = m.role === 'manager' ? 'member' : 'manager'
    try {
      await supabase
        .from('community_members')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', m.membershipId)

      setMembers((prev) =>
        prev.map((item) => (item.membershipId === m.membershipId ? { ...item, role: newRole } : item))
      )
      setActionMenuOpenId(null)
    } catch (err) {
      console.error('Failed to update role', err)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Members
            </h1>
            {activeCommunity && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-orange-50 text-[#EA580C] border border-orange-200">
                <Building2 size={12} />
                {activeCommunity.name}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage and monitor everyone in your community.
          </p>
        </div>

        {/* Top Actions: Add Member + Export */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredMembers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Export filtered roster to CSV"
          >
            <Download size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-white bg-[#FF9900] hover:bg-[#EA580C] transition-all shadow-xs cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Controls Bar: Search + Filters + Sort + View Toggle */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or member tag..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors shadow-2xs"
            />
          </div>

          {/* Sort & View Toggle Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortType)}
                className="appearance-none pl-8 pr-8 py-2 text-xs font-mono rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-[#FF9900] cursor-pointer shadow-2xs"
              >
                <option value="newest">Sort: Newest Joined</option>
                <option value="oldest">Sort: Oldest Joined</option>
                <option value="name-asc">Sort: Name (A-Z)</option>
                <option value="name-desc">Sort: Name (Z-A)</option>
                <option value="progress-high">Sort: Highest Progress</option>
                <option value="tasks-completed">Sort: Most Tasks</option>
              </select>
              <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Responsive View Toggle (Table vs Cards) */}
            <div className="hidden sm:flex items-center p-0.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-orange-50 text-[#EA580C]' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table view"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'cards' ? 'bg-orange-50 text-[#EA580C]' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Cards view"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills (All, Active, Needs Attention, Inactive, Community Head, Member) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(['All', 'Active', 'Needs Attention', 'Inactive', 'Community Head', 'Member'] as FilterType[]).map(
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
                      ? 'bg-[#FF9900] text-white font-bold shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/90'
                  }`}
                >
                  <span>{f}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
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
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center">
          <p className="text-sm font-mono text-red-700 font-semibold">{errorMessage}</p>
          <button
            type="button"
            onClick={fetchCommunityMembers}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
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
          {/* DESKTOP TABLE VIEW (Visible on desktop or when table mode)   */}
          {/* ============================================================ */}
          <div className={`${viewMode === 'table' ? 'hidden md:block' : 'hidden'} rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    <th scope="col" className="py-3.5 px-4 w-12 text-center">Avatar</th>
                    <th scope="col" className="py-3.5 px-4">Name</th>
                    <th scope="col" className="py-3.5 px-4">Member ID</th>
                    <th scope="col" className="py-3.5 px-4">AWS Progress</th>
                    <th scope="col" className="py-3.5 px-4">Tasks</th>
                    <th scope="col" className="py-3.5 px-4">Badges</th>
                    <th scope="col" className="py-3.5 px-4">Last Active</th>
                    <th scope="col" className="py-3.5 px-4">Status</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredMembers.map((m) => (
                    <tr
                      key={m.membershipId}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/members/${m.userId}`)}
                    >
                      {/* Avatar */}
                      <td className="py-3.5 px-4 text-center">
                        <Avatar
                          initials={m.fullName.slice(0, 2).toUpperCase()}
                          src={m.avatarUrl || undefined}
                          size="sm"
                        />
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-[#EA580C] transition-colors flex items-center gap-1.5">
                          <span>{m.fullName}</span>
                          {m.role === 'manager' && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-100 text-[#EA580C] font-bold">
                              HEAD
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">{m.email}</div>
                      </td>

                      {/* Member ID */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                        {m.memberTag}
                      </td>

                      {/* AWS progress */}
                      <td className="py-3.5 px-4">
                        <div className="w-28">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="font-medium text-slate-700">{m.awsProgressPct}%</span>
                            <span className="text-slate-400">Level {Math.max(1, Math.floor(m.awsProgressPct / 25))}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#FF9900] to-[#EA580C] h-full rounded-full transition-all duration-500"
                              style={{ width: `${m.awsProgressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Tasks */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">
                          {m.tasksCompleted}
                        </span>
                        <span className="text-slate-400 text-[11px]"> / {m.tasksTotal}</span>
                      </td>

                      {/* Badges */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-purple-50 text-purple-700 border border-purple-200">
                          <Sparkles size={11} />
                          {m.badgesCount}
                        </span>
                      </td>

                      {/* Last active */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {m.lastActive}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {m.isNeedsAttention ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                            <AlertTriangle size={10} />
                            Needs Attention
                          </span>
                        ) : m.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            <CheckCircle2 size={10} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                            <Clock size={10} />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setActionMenuOpenId(actionMenuOpenId === m.membershipId ? null : m.membershipId)
                            }
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <MoreHorizontal size={15} />
                          </button>

                          {actionMenuOpenId === m.membershipId && (
                            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 z-30 font-sans animate-fade-in">
                              <Link
                                to={`/members/${m.userId}`}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                              >
                                <span>View Profile</span>
                                <ExternalLink size={12} className="text-slate-400" />
                              </Link>

                              {isManager && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRole(m)}
                                    className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 block"
                                  >
                                    {m.role === 'manager' ? 'Demote to Member' : 'Promote to Head'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(m)}
                                    className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 block"
                                  >
                                    {m.status === 'active' ? 'Set Inactive' : 'Set Active'}
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(m.email)
                                  setActionMenuOpenId(null)
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 block"
                              >
                                Copy Email
                              </button>
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
          {/* MOBILE STACKED BUILDER CARDS (Default on mobile)             */}
          {/* ============================================================ */}
          <div className={`${viewMode === 'cards' ? 'block' : 'block md:hidden'} space-y-3`}>
            {filteredMembers.map((m) => (
              <div
                key={m.membershipId}
                onClick={() => navigate(`/members/${m.userId}`)}
                className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:border-orange-300 hover:shadow-xs transition-all cursor-pointer space-y-3"
              >
                {/* Top Row: Avatar + Name + Role + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      initials={m.fullName.slice(0, 2).toUpperCase()}
                      src={m.avatarUrl || undefined}
                      size="md"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-900 font-sans flex items-center gap-1.5">
                        <span>{m.fullName}</span>
                        {m.role === 'manager' && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-100 text-[#EA580C] font-bold">
                            HEAD
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{m.memberTag}</div>
                    </div>
                  </div>

                  <div>
                    {m.isNeedsAttention ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                        <AlertTriangle size={10} />
                        Needs Attn
                      </span>
                    ) : m.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        <CheckCircle2 size={10} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-600 font-semibold">AWS Progress</span>
                    <span className="text-[#EA580C] font-bold">{m.awsProgressPct}% (Level {Math.max(1, Math.floor(m.awsProgressPct / 25))})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#FF9900] to-[#EA580C] h-full rounded-full"
                      style={{ width: `${m.awsProgressPct}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center font-mono">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase">Tasks</div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">
                      {m.tasksCompleted} / {m.tasksTotal}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase">Badges</div>
                    <div className="text-xs font-bold text-purple-700 mt-0.5 flex items-center justify-center gap-1">
                      <Sparkles size={11} />
                      {m.badgesCount}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase">Active</div>
                    <div className="text-xs font-medium text-slate-600 mt-0.5">
                      {m.lastActive}
                    </div>
                  </div>
                </div>

                {/* Action Link */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">Joined {m.joinedDate}</span>
                  <span className="text-xs font-mono font-semibold text-[#EA580C] flex items-center gap-1 hover:underline">
                    View Profile →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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
