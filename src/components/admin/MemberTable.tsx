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
            className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg bg-[#121824] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors shadow-xs"
          />
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-8 pr-8 py-2 text-xs font-mono rounded-lg bg-[#121824] border border-[#1F293A] text-slate-200 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] cursor-pointer shadow-xs"
            >
              <option value="all" className="bg-[#121824] text-white">All Roles</option>
              <option value="member" className="bg-[#121824] text-white">Members</option>
              <option value="builder" className="bg-[#121824] text-white">Builders</option>
              <option value="admin" className="bg-[#121824] text-white">Admins</option>
            </select>
            <Filter
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          <span className="text-[11px] font-mono text-slate-400 px-2.5 py-1.5 bg-[#18202E] border border-[#1F293A] rounded-lg shadow-xs font-medium">
            {members.length} members
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-[#1F293A] bg-[#121824] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-[#1F293A] bg-[#0E141F] font-mono text-[11px] uppercase tracking-wider text-slate-400">
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

            <tbody className="divide-y divide-[#1F293A]/60 font-mono">
              {members.length > 0 ? (
                members.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-[#18202E]/60 transition-colors"
                  >
                    <td className="py-3 px-4 text-center">
                      <Avatar initials={m.name.slice(0, 2).toUpperCase()} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {m.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {m.email}
                    </td>
                    <td className="py-3 px-4">
                      <RoleBadge role={m.role} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-[#FF9900]">
                      {m.awsBuilderAlias ? `@${m.awsBuilderAlias}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {m.joinedDate}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
                      description="No registered members were found for this chapter yet."
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
