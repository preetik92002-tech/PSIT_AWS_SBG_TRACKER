import React from 'react'
import {
  ShieldCheck,
  Users,
  Shield,
  Activity,
  UserPlus,
  Clock,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Link } from 'react-router-dom'

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Admin Dashboard"
        subtitle="Platform administration, system metrics, and community member governance."
        tag="Admin Console"
        icon={<ShieldCheck size={20} className="text-purple-400" />}
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Overview' },
        ]}
        actions={
          <Link
            to="/admin/members"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium text-purple-200 bg-purple-950/50 hover:bg-purple-900/50 border border-purple-800/60 transition-colors shadow-sm"
          >
            <span>View Member Directory</span>
            <ArrowRight size={13} />
          </Link>
        }
      />

      {/* Disconnected Notice */}
      <div className="p-3.5 rounded-lg border border-purple-900/40 bg-purple-950/20 text-purple-250 text-xs font-mono flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Database size={15} className="text-purple-400 flex-shrink-0" />
          <span>
            Database Connection: <strong className="text-purple-300 font-semibold">Not Connected (Level 1 Shell)</strong>. Metrics will populate dynamically when Supabase tables are wired.
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-purple-400 px-2 py-0.5 rounded border border-purple-800/50 bg-purple-950/60">
          Zero Synthetic Metrics
        </span>
      </div>

      {/* Stat Cards (No invented numbers) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Registry Metrics
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Awaiting Supabase
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Members"
            value="Unavailable"
            subtitle="Requires active database client"
            icon={<Users size={16} className="text-slate-400" />}
            status="disconnected"
            statusLabel="Not Connected"
          />

          <StatCard
            title="Admins"
            value="Unavailable"
            subtitle="Requires role permission sync"
            icon={<Shield size={16} className="text-purple-400" />}
            status="disconnected"
            statusLabel="Not Connected"
          />

          <StatCard
            title="Active Members"
            value="Unavailable"
            subtitle="Requires session telemetry"
            icon={<Activity size={16} className="text-slate-400" />}
            status="disconnected"
            statusLabel="Not Connected"
          />
        </div>
      </section>

      {/* Recent Members & Activity Streams (Empty States) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserPlus size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold font-mono text-slate-200">
                Recent Members
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              0 records
            </span>
          </div>

          <EmptyState
            title="No recent members recorded"
            description="New registrations and verified community members will show up here as they join."
            badge="Empty Registry"
            className="py-10 bg-slate-950/40 border-slate-850"
          />
        </div>

        {/* Community Activity */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold font-mono text-slate-200">
                Community Activity
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              0 events
            </span>
          </div>

          <EmptyState
            title="No activity events logged"
            description="Member check-ins, profile updates, and admin audit logs will stream here once real-time listeners are active."
            badge="No Logs"
            className="py-10 bg-slate-950/40 border-slate-850"
          />
        </div>
      </section>

      {/* Admin Future Modules */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold font-mono tracking-tight text-slate-200">
              Admin Governance Modules
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Extended administrative modules scheduled for development across subsequent levels.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400">
            Roadmap
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
              Admin Module
            </span>
            <h4 className="text-xs font-mono font-semibold text-slate-200 mb-1">
              Task Administration
            </h4>
            <p className="text-[11px] text-slate-400">
              Create, review, and evaluate builder assignments and submissions.
            </p>
            <span className="inline-block mt-3 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              Coming in Level 2+
            </span>
          </div>

          <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
              Admin Module
            </span>
            <h4 className="text-xs font-mono font-semibold text-slate-200 mb-1">
              Community Contributions
            </h4>
            <p className="text-[11px] text-slate-400">
              Moderate shared architectures, AWS templates, and code repositories.
            </p>
            <span className="inline-block mt-3 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              Coming in Level 2+
            </span>
          </div>

          <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 p-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
              Admin Module
            </span>
            <h4 className="text-xs font-mono font-semibold text-slate-200 mb-1">
              Platform Analytics
            </h4>
            <p className="text-[11px] text-slate-400">
              Cohort retention, certification completion rates, and AWS service coverage.
            </p>
            <span className="inline-block mt-3 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              Coming in Level 2+
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
