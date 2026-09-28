import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckSquare,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  Shield,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  Clock,
  HeartHandshake,
  Award,
  ChevronRight,
  PieChart as PieChartIcon,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useCommunity } from '@/context/CommunityContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import {
  fetchCommunityAnalytics,
  AnalyticsDateFilter,
  CommunityAnalyticsData,
} from '@/lib/communityAnalytics'

const PIE_COLORS = ['#FF9900', '#38BDF8', '#10B981', '#A855F7', '#F59E0B', '#EC4899']

export const Analytics: React.FC = () => {
  const { activeCommunity, isManagerOfActiveCommunity, isLoading: isCommunityLoading } = useCommunity()

  const [dateFilter, setDateFilter] = useState<AnalyticsDateFilter>('30_days')
  const [data, setData] = useState<CommunityAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    if (!activeCommunity?.id) return
    if (!isManagerOfActiveCommunity) return

    setIsLoading(true)
    setError(null)

    try {
      const analyticsData = await fetchCommunityAnalytics(activeCommunity.id, dateFilter)
      setData(analyticsData)
    } catch (err: any) {
      console.error('[Analytics] Failed to fetch metrics:', err)
      setError(err?.message || 'Failed to aggregate community metrics. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [activeCommunity?.id, isManagerOfActiveCommunity, dateFilter])

  useEffect(() => {
    if (!isCommunityLoading && isManagerOfActiveCommunity && activeCommunity?.id) {
      loadAnalytics()
    }
  }, [isCommunityLoading, isManagerOfActiveCommunity, activeCommunity?.id, loadAnalytics])

  // Custom Dark Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0E141F] border border-[#1F293A] p-3 rounded-lg shadow-xl text-xs font-mono space-y-1">
          <p className="text-slate-400 font-medium pb-1 border-b border-[#1F293A]">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5" style={{ color: entry.color || entry.fill }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                {entry.name}:
              </span>
              <span className="font-bold text-white">{entry.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // 1. Loading active community check
  if (isCommunityLoading) {
    return <LoadingState message="Verifying community manager permissions..." />
  }

  // 2. Strict Permission Guard: Community Managers & Platform Admins Only
  if (!isManagerOfActiveCommunity) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Community Analytics"
          subtitle="Cohort velocity, task metrics, and member engagement."
          tag="Metrics"
          icon={<BarChart3 size={20} />}
          breadcrumbs={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Analytics' },
          ]}
        />

        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8 text-center max-w-2xl mx-auto my-12">
          <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center mx-auto mb-4 text-red-400">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Manager Access Required</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
            Detailed community analytics and cohort telemetry are restricted exclusively to authorized
            Community Managers and Platform Administrators. Community members cannot view manager analytics.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-[#FF9900] hover:bg-[#FF9900]/90 text-black font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/leaderboard"
              className="px-4 py-2 bg-[#1A2234] hover:bg-[#232F42] border border-[#2D3A50] text-slate-200 font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              View Chapter Leaderboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 3. No active community selected
  if (!activeCommunity) {
    return (
      <div className="p-8 text-center text-slate-400">
        Please select a community to view analytics.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Community Analytics"
          subtitle={`Real-time cohort performance and verified data for ${activeCommunity.name}.`}
          tag="Manager Console"
          icon={<BarChart3 size={20} />}
          breadcrumbs={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Analytics' },
          ]}
        />

        {/* Date Filter & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-[#0E141F] p-1.5 rounded-xl border border-[#1F293A]">
          <div className="flex items-center gap-1">
            {(
              [
                { id: '7_days', label: '7 days' },
                { id: '30_days', label: '30 days' },
                { id: '90_days', label: '90 days' },
                { id: 'all_time', label: 'All time' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  dateFilter === opt.id
                    ? 'bg-[#FF9900] text-black shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-[#1A2234]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#1F293A]" />

          <button
            onClick={loadAnalytics}
            disabled={isLoading}
            title="Refresh Metrics"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A2234] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 flex items-center justify-between gap-3 text-red-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span className="text-xs font-medium">{error}</span>
          </div>
          <button
            onClick={loadAnalytics}
            className="text-xs font-mono underline hover:text-white font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="py-16">
          <LoadingState message="Aggregating community metrics from database..." />
        </div>
      )}

      {/* Main Real Analytics Content */}
      {data && (
        <div className="space-y-6">
          {/* ================================================================= */}
          {/* 1. TOP METRIC CARDS (ALL REAL DATABASE AGGREGATES)               */}
          {/* ================================================================= */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Members Total */}
            <div className="p-4 rounded-xl border border-[#1F293A] bg-[#121824] shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Members</span>
                <Users size={14} className="text-[#FF9900]" />
              </div>
              <p className="text-2xl font-mono font-bold text-white tracking-tight">
                {data.members.total}
              </p>
              <div className="text-[11px] font-mono text-slate-400 mt-1 flex flex-col gap-0.5">
                <span className="text-emerald-400 font-medium">+{data.members.new_members} new</span>
                <span className="text-slate-500">{data.members.active_members} active</span>
              </div>
            </div>

            {/* Tasks Created & Completed */}
            <div className="p-4 rounded-xl border border-[#1F293A] bg-[#121824] shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Tasks</span>
                <CheckSquare size={14} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-mono font-bold text-white tracking-tight">
                {data.tasks.completed}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {data.tasks.created}</span>
              </p>
              <div className="text-[11px] font-mono text-slate-400 mt-1 flex flex-col gap-0.5">
                <span className="text-[#FF9900] font-medium">{data.tasks.completion_rate}% rate</span>
                <span className="text-rose-400 font-medium">{data.tasks.overdue} overdue</span>
              </div>
            </div>

            {/* Events Attendance & RSVP */}
            <div className="p-4 rounded-xl border border-[#1F293A] bg-[#121824] shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Events</span>
                <Calendar size={14} className="text-sky-400" />
              </div>
              <p className="text-2xl font-mono font-bold text-white tracking-tight">
                {data.events.attendance}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {data.events.rsvp}</span>
              </p>
              <div className="text-[11px] font-mono text-slate-400 mt-1 flex flex-col gap-0.5">
                <span className="text-sky-400 font-medium">{data.events.created} scheduled</span>
                <span className="text-slate-400">{data.events.participation_rate}% turnout</span>
              </div>
            </div>

            {/* Projects Active & Completed */}
            <div className="p-4 rounded-xl border border-[#1F293A] bg-[#121824] shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Projects</span>
                <Layers size={14} className="text-indigo-400" />
              </div>
              <p className="text-2xl font-mono font-bold text-white tracking-tight">
                {data.projects.active}
              </p>
              <div className="text-[11px] font-mono text-slate-400 mt-1 flex flex-col gap-0.5">
                <span className="text-emerald-400 font-medium">{data.projects.completed} completed</span>
                <span className="text-slate-500">{data.projects.members_involved} builders</span>
              </div>
            </div>

            {/* Contributions Submitted & Approved */}
            <div className="p-4 rounded-xl border border-[#1F293A] bg-[#121824] shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Peer Help</span>
                <HeartHandshake size={14} className="text-pink-400" />
              </div>
              <p className="text-2xl font-mono font-bold text-white tracking-tight">
                {data.contributions.approved}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {data.contributions.submitted}</span>
              </p>
              <div className="text-[11px] font-mono text-slate-400 mt-1 flex flex-col gap-0.5">
                <span className="text-emerald-400 font-medium">{data.contributions.approved} approved</span>
                <span className="text-slate-500">{data.contributions.rejected} rejected</span>
              </div>
            </div>

            {/* Points Earned in Period */}
            <div className="p-4 rounded-xl border border-[#1F293A] bg-[#121824] shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Points</span>
                <Award size={14} className="text-[#FF9900]" />
              </div>
              <p className="text-2xl font-mono font-bold text-[#FF9900] tracking-tight">
                {data.points.earned.toLocaleString()}
              </p>
              <div className="text-[11px] font-mono text-slate-400 mt-1 flex flex-col gap-0.5">
                <span className="text-slate-300 font-medium">Ledger verified</span>
                <span className="text-slate-500">{data.points.activity.length} active days</span>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 2. PRIMARY CHARTS (RECHARTS: AREA & BAR FLOW)                     */}
          {/* ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Points & Transaction Velocity Chart */}
            <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F293A] mb-4">
                <div>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Activity size={14} className="text-[#FF9900]" />
                    Points Velocity & Engagement
                  </h2>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Real points earned over the selected timeframe ({dateFilter.replace('_', ' ')}).
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 font-semibold">
                  Ledger Data
                </span>
              </div>

              {/* Chart State: Empty vs Real Data */}
              <div className="flex-1 min-h-[260px] flex items-center justify-center">
                {data.points.activity.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <Clock size={28} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-xs font-mono text-slate-300 font-medium">
                      No points transactions recorded in this window
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Points will appear here as members complete tasks, attend events, and receive approved peer contributions.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart
                      data={data.points.activity}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="pointsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF9900" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#FF9900" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F293A" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748B"
                        fontSize={10}
                        fontFamily="monospace"
                        tickLine={false}
                        tickFormatter={(val) => {
                          const parts = val.split('-')
                          return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val
                        }}
                      />
                      <YAxis
                        stroke="#64748B"
                        fontSize={10}
                        fontFamily="monospace"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="points"
                        name="Points Awarded"
                        stroke="#FF9900"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#pointsGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Task Execution Rhythm (Bar Chart) */}
            <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F293A] mb-4">
                <div>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <CheckSquare size={14} className="text-emerald-400" />
                    Task Deliverable Rhythm
                  </h2>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Tasks completed by chapter builders by date.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800 font-semibold">
                  Deliverables
                </span>
              </div>

              {/* Chart State: Empty vs Real Data */}
              <div className="flex-1 min-h-[260px] flex items-center justify-center">
                {data.task_timeline.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <CheckSquare size={28} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-xs font-mono text-slate-300 font-medium">
                      No task deliverables completed in this window
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Completed task assignments will automatically populate this delivery chart.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={data.task_timeline}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F293A" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748B"
                        fontSize={10}
                        fontFamily="monospace"
                        tickLine={false}
                        tickFormatter={(val) => {
                          const parts = val.split('-')
                          return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val
                        }}
                      />
                      <YAxis
                        stroke="#64748B"
                        fontSize={10}
                        fontFamily="monospace"
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="completed"
                        name="Tasks Completed"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 3. SECONDARY CHARTS (DISTRIBUTION & PEER IMPACT)                  */}
          {/* ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Points Distribution by Entity/Source */}
            <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F293A] mb-4">
                <div>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <PieChartIcon size={14} className="text-sky-400" />
                    Points Distribution by Activity Source
                  </h2>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Breakdown of community points awarded by activity channel.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/50 text-sky-400 border border-sky-800 font-semibold">
                  Channels
                </span>
              </div>

              {data.points.distribution.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <PieChartIcon size={28} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs font-mono text-slate-300 font-medium">
                    No points distributed yet in this period
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Points from tasks, events, and peer contributions will generate the distribution chart.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-6 pt-2">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.points.distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="total_points"
                          nameKey="category"
                        >
                          {data.points.distribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5">
                    {data.points.distribution.map((item, idx) => {
                      const color = PIE_COLORS[idx % PIE_COLORS.length]
                      const pct =
                        data.points.earned > 0
                          ? Math.round((item.total_points / data.points.earned) * 100)
                          : 0
                      return (
                        <div key={item.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="flex items-center gap-2 text-slate-300 capitalize">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              {item.category}
                            </span>
                            <span className="text-white font-bold">
                              {item.total_points.toLocaleString()} pts{' '}
                              <span className="text-slate-500 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="bg-[#0E141F] h-1.5 rounded-full overflow-hidden border border-[#1F293A]">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Peer Contributions Breakdown by Category */}
            <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F293A] mb-4">
                <div>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <HeartHandshake size={14} className="text-pink-400" />
                    Peer Assistance & Contributions
                  </h2>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Help requested and delivered between chapter members.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-950/50 text-pink-400 border border-pink-800 font-semibold">
                  Community Impact
                </span>
              </div>

              {data.contributions.categories.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <HeartHandshake size={28} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs font-mono text-slate-300 font-medium">
                    No peer contributions submitted in this timeframe
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    When builders record peer assistance (debugging, mentorship, AWS deployment), categories appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {data.contributions.categories.slice(0, 5).map((cat) => {
                    const approvalPct =
                      cat.total_count > 0
                        ? Math.round((cat.approved_count / cat.total_count) * 100)
                        : 0
                    return (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300 font-medium truncate max-w-[200px]">
                            {cat.category}
                          </span>
                          <span className="text-slate-400">
                            <span className="text-emerald-400 font-bold">{cat.approved_count}</span>
                            {' / '}
                            <span className="text-slate-300">{cat.total_count}</span>{' '}
                            <span className="text-slate-500 text-[10px]">({approvalPct}% approved)</span>
                          </span>
                        </div>
                        <div className="bg-[#0E141F] h-2 rounded-full overflow-hidden border border-[#1F293A]">
                          <div
                            className="bg-pink-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(8, approvalPct))}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* 4. COHORT HEALTH & DETAILED METRIC BREAKDOWN TABLE                */}
          {/* ================================================================= */}
          <div className="rounded-xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <Shield size={14} className="text-[#FF9900]" />
              Cohort Operational Summary (Verified Database Aggregates)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              {/* Task Summary */}
              <div className="p-4 rounded-lg bg-[#0E141F] border border-[#1F293A] space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-bold pb-2 border-b border-[#1F293A]">
                  <span>Task Execution</span>
                  <CheckSquare size={13} className="text-emerald-400" />
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tasks Created:</span>
                  <span className="text-white font-semibold">{data.tasks.created}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Assignments Completed:</span>
                  <span className="text-emerald-400 font-semibold">{data.tasks.completed}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Assignments Overdue:</span>
                  <span className="text-rose-400 font-semibold">{data.tasks.overdue}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-[#1F293A]/50">
                  <span>Completion Rate:</span>
                  <span className="text-[#FF9900] font-bold">{data.tasks.completion_rate}%</span>
                </div>
              </div>

              {/* Event Attendance */}
              <div className="p-4 rounded-lg bg-[#0E141F] border border-[#1F293A] space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-bold pb-2 border-b border-[#1F293A]">
                  <span>Events & Turnout</span>
                  <Calendar size={13} className="text-sky-400" />
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Events Hosted:</span>
                  <span className="text-white font-semibold">{data.events.created}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total RSVPs:</span>
                  <span className="text-white font-semibold">{data.events.rsvp}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Verified Attendance:</span>
                  <span className="text-sky-400 font-semibold">{data.events.attendance}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-[#1F293A]/50">
                  <span>Participation Rate:</span>
                  <span className="text-[#FF9900] font-bold">{data.events.participation_rate}%</span>
                </div>
              </div>

              {/* Projects & Community Growth */}
              <div className="p-4 rounded-lg bg-[#0E141F] border border-[#1F293A] space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-bold pb-2 border-b border-[#1F293A]">
                  <span>Projects & Engagement</span>
                  <Layers size={13} className="text-indigo-400" />
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Active Projects:</span>
                  <span className="text-white font-semibold">{data.projects.active}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Completed Repositories:</span>
                  <span className="text-emerald-400 font-semibold">{data.projects.completed}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Builders Involved:</span>
                  <span className="text-indigo-400 font-semibold">{data.projects.members_involved}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-[#1F293A]/50">
                  <span>Active Member Cohort:</span>
                  <span className="text-[#FF9900] font-bold">{data.members.active_members}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default Analytics
