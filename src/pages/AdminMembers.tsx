import React from 'react'
import { Users, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { MemberTable } from '@/components/admin/MemberTable'

export const AdminMembers: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Community Members"
        subtitle="Manage member identities, assign administrative privileges, and inspect AWS Builder profiles."
        tag="Directory"
        icon={<Users size={20} className="text-purple-400" />}
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Members' },
        ]}
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium text-slate-400 bg-slate-800/80 border border-slate-700/60 cursor-not-allowed opacity-70"
            title="Invite feature unlocks in Level 2 with Supabase Auth"
          >
            <UserPlus size={13} />
            <span>Invite Member (Soon)</span>
          </button>
        }
      />

      {/* Member Table with empty members list (no fake users created) */}
      <MemberTable members={[]} />
    </div>
  )
}
