import React from 'react'
import {
  Users,
  Shield,
  Calendar,
  ExternalLink,
  CheckSquare,
  FolderGit2,
  GraduationCap,
  Award,
  Terminal,
  Globe2,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { Link } from 'react-router-dom'

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Welcome back, Preeti"
        subtitle="Here is your AWS Builder Hub platform overview and membership status."
        tag="Level 1 Foundation"
        icon={<Terminal size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="px-3 py-1.5 rounded-md text-xs font-mono font-medium text-slate-200 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors shadow-sm"
            >
              View Profile
            </Link>
          </div>
        }
      />

      {/* Basic Platform Cards (No invented statistics) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Membership & Connectivity
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Frontend Shell Only
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Community"
            value="AWS Builder Hub"
            subtitle="Global builder platform"
            icon={<Globe2 size={16} className="text-amber-400" />}
            status="connected"
            statusLabel="Active Hub"
          />

          <div
            className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm transition-all hover:border-slate-700/80 flex flex-col justify-between"
            style={{
              background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.75) 0%, rgba(15, 23, 42, 0.65) 100%)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
                  Role
                </p>
                <div className="pt-1">
                  <RoleBadge role="member" size="md" />
                </div>
              </div>
              <div className="p-2.5 rounded-md bg-slate-800/60 border border-slate-700/40 text-slate-300">
                <Shield size={16} className="text-blue-400" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400 font-sans">
              Standard Community Access
            </p>
          </div>

          <StatCard
            title="Member Since"
            value="Not connected yet"
            subtitle="Pending Supabase auth link"
            icon={<Calendar size={16} className="text-slate-400" />}
            status="disconnected"
            statusLabel="Offline"
          />

          <StatCard
            title="AWS Builder Profile"
            value="Not connected"
            subtitle="Configure in Profile settings"
            icon={<ExternalLink size={16} className="text-slate-400" />}
            status="disconnected"
            statusLabel="Unlinked"
          />
        </div>
      </section>

      {/* Future Modules Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold font-mono tracking-tight text-slate-200">
              Future Modules
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              These platform modules are planned for subsequent levels once database & auth services are attached.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400">
            Roadmap
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tasks */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                <CheckSquare size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold font-mono text-slate-200">
                  Tasks Module
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  Coming in future level
                </span>
              </div>
            </div>
            <EmptyState
              title="No active tasks assigned"
              description="Assignment pipelines and builder tasks will appear here when task tracking is implemented."
              badge="Module Disabled"
              className="py-8 bg-slate-950/40 border-slate-850"
            />
          </div>

          {/* Projects */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                <FolderGit2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold font-mono text-slate-200">
                  Projects Module
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  Coming in future level
                </span>
              </div>
            </div>
            <EmptyState
              title="No projects linked"
              description="Cloud architecture repositories and collaborative builder projects will sync here in a future release."
              badge="Module Disabled"
              className="py-8 bg-slate-950/40 border-slate-850"
            />
          </div>

          {/* Learning */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                <GraduationCap size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold font-mono text-slate-200">
                  Learning & Certifications
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  Coming in future level
                </span>
              </div>
            </div>
            <EmptyState
              title="Learning tracks offline"
              description="AWS skill pathways, certification milestones, and progress logs will be tracked once database tables exist."
              badge="Module Disabled"
              className="py-8 bg-slate-950/40 border-slate-850"
            />
          </div>

          {/* Achievements */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                <Award size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold font-mono text-slate-200">
                  Achievements & Badges
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  Coming in future level
                </span>
              </div>
            </div>
            <EmptyState
              title="Zero achievements unlocked"
              description="Community badges, streak multipliers, and builder achievements will populate here upon backend activation."
              badge="Module Disabled"
              className="py-8 bg-slate-950/40 border-slate-850"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
