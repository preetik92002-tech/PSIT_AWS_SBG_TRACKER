import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  Users,
  Building2,
  CheckSquare,
  XSquare,
  Award,
  Video,
  VideoOff,
  Settings,
  FolderGit2,
  Trash2,
  Edit3,
  Crown,
  UserX,
  Key,
  Info,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  FileSpreadsheet,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { BuilderAvatar } from '@/components/ui/BuilderAvatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { timeAgo } from '@/utils/cn'
import {
  fetchCommunityAuditLogs,
  exportAuditLogsToCSV,
  ACTION_CONFIGS,
  AuditLogFilters,
} from '@/lib/auditLog'
import type { AuditLogWithActor, AuditAction } from '@/types/database'

export const AuditLog: React.FC = () => {
  const { user } = useAuth()
  const { activeCommunity, isManagerOfActiveCommunity, userRoleInActiveCommunity } = useCommunity()

  const isAuthorizedManager = isManagerOfActiveCommunity || userRoleInActiveCommunity === 'manager'

  const [logs, setLogs] = useState<AuditLogWithActor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters state
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedActor, setSelectedActor] = useState<string>('all')
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<'all' | 'today' | '7d' | '30d'>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Detail Modal state
  const [inspectLog, setInspectLog] = useState<AuditLogWithActor | null>(null)

  const loadLogs = useCallback(
    async (showRefreshIndicator = false) => {
      if (!activeCommunity?.id) return

      if (showRefreshIndicator) setIsRefreshing(true)
      else setIsLoading(true)

      try {
        const filters: AuditLogFilters = {
          action: selectedAction !== 'all' ? selectedAction : undefined,
          actorId: selectedActor !== 'all' ? selectedActor : undefined,
          entityType: selectedEntity !== 'all' ? selectedEntity : undefined,
          dateFilter: selectedDate,
          searchTerm: searchQuery,
        }

        const data = await fetchCommunityAuditLogs(activeCommunity.id, filters, 150)
        setLogs(data)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [activeCommunity?.id, selectedAction, selectedActor, selectedEntity, selectedDate, searchQuery]
  )

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Extract distinct actors for the Actor filter dropdown
  const uniqueActors = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    logs.forEach((log) => {
      if (log.actor?.id) {
        map.set(log.actor.id, {
          id: log.actor.id,
          name: log.actor.full_name || log.actor.email || 'Manager',
        })
      }
    })
    return Array.from(map.values())
  }, [logs])

  // Summary statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayCount = logs.filter((l) => l.created_at.startsWith(today)).length
    const uniqueActorsCount = new Set(logs.map((l) => l.actor_user_id)).size
    return {
      total: logs.length,
      today: todayCount,
      actors: uniqueActorsCount,
    }
  }, [logs])

  const handleClearFilters = () => {
    setSelectedAction('all')
    setSelectedActor('all')
    setSelectedEntity('all')
    setSelectedDate('all')
    setSearchQuery('')
  }

  const handleExportCSV = () => {
    if (!logs.length || !activeCommunity?.name) return
    exportAuditLogsToCSV(logs, activeCommunity.name)
  }

  // ------------------------------------------------------------------------------
  // SECURITY CHECK: Manager-Only View
  // ------------------------------------------------------------------------------
  if (!isAuthorizedManager) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 font-mono">
        <div className="p-8 rounded-2xl bg-[#0E141F] border border-rose-500/30 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            Restricted Administrative Surface
          </h2>
          <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
            Audit logs contain sensitive governance records and can only be inspected by authorized community managers and platform administrators.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 font-mono">
      {/* ============================================================ */}
      {/* 1. PAGE HEADER & AUDIT METRICS ROW                           */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#121824] border border-[#1F293A] shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF9900]/15 border border-[#FF9900]/30 flex items-center justify-center text-[#FF9900]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white uppercase tracking-wider">
                  Admin Audit Trail
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30">
                  Manager Only
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Immutable governance trail of privileged administrative actions across {activeCommunity?.name || 'this community'}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => loadLogs(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white bg-[#1A2332] hover:bg-[#222E42] border border-[#2B3A4F] transition-all cursor-pointer disabled:opacity-50"
            title="Refresh audit entries"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#FF9900]' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Total Logged Events
            </span>
            <span className="text-xl font-bold text-white">{stats.total}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Info size={16} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Today's Actions
            </span>
            <span className="text-xl font-bold text-emerald-400">{stats.today}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Clock size={16} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Active Actors
            </span>
            <span className="text-xl font-bold text-[#FF9900]">{stats.actors}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/20 flex items-center justify-center">
            <Users size={16} />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. FILTERS ROW (Action, Actor, Entity, Date, Search)         */}
      {/* ============================================================ */}
      <div className="p-4 rounded-2xl bg-[#0E141F] border border-[#1F293A] space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[#1A2332]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Filter size={14} className="text-[#FF9900]" />
            <span>Filter Audit Trail</span>
          </div>
          {(selectedAction !== 'all' ||
            selectedActor !== 'all' ||
            selectedEntity !== 'all' ||
            selectedDate !== 'all' ||
            searchQuery) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <X size={12} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Action Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Action Type
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full bg-[#121824] border border-[#1F293A] text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#FF9900] cursor-pointer"
            >
              <option value="all">All Actions</option>
              {Object.entries(ACTION_CONFIGS).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actor Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Actor
            </label>
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              className="w-full bg-[#121824] border border-[#1F293A] text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#FF9900] cursor-pointer"
            >
              <option value="all">All Actors</option>
              {uniqueActors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Entity
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full bg-[#121824] border border-[#1F293A] text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#FF9900] cursor-pointer"
            >
              <option value="all">All Entities</option>
              <option value="community">Community</option>
              <option value="member">Member</option>
              <option value="task">Task</option>
              <option value="event">Event</option>
              <option value="project">Project</option>
              <option value="meet">Google Meet</option>
              <option value="settings">Settings</option>
              <option value="points">Points</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Date Span
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value as any)}
              className="w-full bg-[#121824] border border-[#1F293A] text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#FF9900] cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Search Term Input */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Search Keywords
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Actor, action, ID..."
                className="w-full bg-[#121824] border border-[#1F293A] pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#FF9900]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. AUDIT TRAIL LOG TABLE                                      */}
      {/* ============================================================ */}
      {isLoading ? (
        <LoadingState message="Loading administrative audit log records..." />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Audit Entries Found"
          description="No administrative actions match your current filter criteria."
          action={{
            label: 'Reset Filters',
            onClick: handleClearFilters,
          }}
        />
      ) : (
        <div className="rounded-2xl border border-[#1F293A] bg-[#121824] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1F293A] bg-[#0E141F] text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2332]">
                {logs.map((log) => {
                  const cfg = ACTION_CONFIGS[log.action] || {
                    label: log.action.replace(/_/g, ' '),
                    color: 'bg-slate-700/20 text-slate-300 border-slate-700/40',
                  }
                  const logDate = new Date(log.created_at)

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setInspectLog(log)}
                      className="hover:bg-[#151D2A] transition-colors cursor-pointer group"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-200 block">
                            {logDate.toLocaleDateString()}
                          </span>
                          <span
                            className="text-[10px] text-slate-500 font-sans block"
                            title={logDate.toISOString()}
                          >
                            {logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {timeAgo(log.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <BuilderAvatar
                            src={log.actor?.avatar_url}
                            name={log.actor?.full_name || 'Manager'}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-200 block truncate max-w-[140px]">
                              {log.actor?.full_name || 'System / Manager'}
                            </span>
                            {log.actor?.aws_builder_alias ? (
                              <span className="text-[10px] text-[#FF9900] block truncate">
                                @{log.actor.aws_builder_alias}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 block truncate">
                                {log.actor?.email?.split('@')[0] || 'Manager'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-semibold text-slate-300 uppercase block tracking-wider">
                            {log.entity_type}
                          </span>
                          {log.entity_id && (
                            <span className="text-[10px] text-slate-500 block font-mono truncate max-w-[150px]">
                              {log.entity_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Details Trigger */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setInspectLog(log)
                          }}
                          className="p-1 rounded-lg text-slate-400 group-hover:text-[#FF9900] group-hover:bg-[#1A2332] transition-colors"
                          title="Inspect raw metadata"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. DETAIL INSPECTOR MODAL                                    */}
      {/* ============================================================ */}
      {inspectLog && (
        <Modal
          isOpen={Boolean(inspectLog)}
          onClose={() => setInspectLog(null)}
          title="Audit Entry Inspector"
          subtitle={`Audit Record ID: ${inspectLog.id}`}
          size="md"
        >
          <div className="p-5 space-y-4 font-mono text-xs">
            {/* Header info */}
            <div className="p-3 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                    ACTION_CONFIGS[inspectLog.action]?.color ||
                    'bg-slate-700/20 text-slate-300 border-slate-700/40'
                  }`}
                >
                  {ACTION_CONFIGS[inspectLog.action]?.label || inspectLog.action}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(inspectLog.created_at).toUTCString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#1A2332]">
                <div>
                  <span className="text-slate-500 block">Actor:</span>
                  <span className="text-slate-200 font-semibold">
                    {inspectLog.actor?.full_name || 'System / Manager'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Entity Type / ID:</span>
                  <span className="text-slate-200 font-semibold">
                    {inspectLog.entity_type} {inspectLog.entity_id ? `(${inspectLog.entity_id})` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata JSON Viewer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Sanitized Metadata Details
                </label>
                <span className="text-[10px] text-slate-500 font-sans">
                  Guaranteed Secret-Free
                </span>
              </div>
              <pre className="p-3 rounded-xl bg-[#070A10] border border-[#1A2332] text-emerald-400 text-[11px] overflow-x-auto max-h-60 leading-relaxed scrollbar-thin">
                {JSON.stringify(inspectLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="pt-3 border-t border-[#1F293A] flex justify-end">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#18202E] border border-[#1F293A] cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
