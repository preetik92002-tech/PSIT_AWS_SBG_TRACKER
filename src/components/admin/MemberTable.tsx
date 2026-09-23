import React, { useState } from 'react'
import { Search, Filter, Users, MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { RoleBadge } from '@/components/ui/RoleBadge'
import { Avatar } from '@/components/ui/Avatar'

export interface MemberRecord {
  id: string
  name: string
  email: string
  role: 'member' | 'admin' | 'builder' | 'leader'
  awsBuilderAlias?: string
  joinedDate: string
}

export interface MemberTableProps {
  members?: MemberRecord[]
}

export const MemberTable: React.FC<MemberTableProps> = ({ members = [] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or AWS alias..."
            className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-md bg-slate-900/80 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
          />
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-8 pr-8 py-2 text-xs font-mono rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="member">Members</option>
              <option value="builder">Builders</option>
              <option value="admin">Admins</option>
            </select>
            <Filter
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          <span className="text-[11px] font-mono text-slate-400 px-2 py-1 bg-slate-900 border border-slate-800 rounded">
            {members.length} members
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <th scope="col" className="py-3 px-4 w-12 text-center">
                  Avatar
                </th>
                <th scope="col" className="py-3 px-4">
                  Name
                </th>
                <th scope="col" className="py-3 px-4">
                  Email
                </th>
                <th scope="col" className="py-3 px-4">
                  Role
                </th>
                <th scope="col" className="py-3 px-4">
                  AWS Builder
                </th>
                <th scope="col" className="py-3 px-4">
                  Joined
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-mono">
              {members.length > 0 ? (
                members.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-850/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-center">
                      <Avatar initials={m.name.slice(0, 2).toUpperCase()} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {m.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {m.email}
                    </td>
                    <td className="py-3 px-4">
                      <RoleBadge role={m.role} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {m.awsBuilderAlias ? `@${m.awsBuilderAlias}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {m.joinedDate}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        aria-label="Actions"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      title="No community members yet."
                      description="The member database is not connected in Level 1. Real member records will appear here once Supabase is integrated."
                      icon={<Users size={22} className="text-slate-400" />}
                      badge="Zero Data"
                      className="border-0 rounded-none bg-transparent py-16"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
