import React, { useEffect, useState } from 'react'
import { Users, UserPlus, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { MemberTable, type MemberRecord } from '@/components/admin/MemberTable'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { supabase } from '@/lib/supabase/client'

export const AdminMembers: React.FC = () => {
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchMembers = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setErrorMessage(error.message)
        setMembers([])
        return
      }

      const formatted: MemberRecord[] = (data || []).map((p) => ({
        id: p.id,
        name: p.full_name || p.email.split('@')[0],
        email: p.email,
        role: p.role,
        awsBuilderAlias: p.aws_builder_alias || undefined,
        joinedDate: new Date(p.joined_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      }))

      setMembers(formatted)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to query community member directory.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community Members"
        subtitle="Manage member identities, inspect community roles, and monitor AWS Builder profiles."
        tag="Directory"
        icon={<Users size={20} className="text-purple-400" />}
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Members' },
        ]}
        actions={
          <button
            type="button"
            onClick={fetchMembers}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh member list"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#FF9900]' : 'text-slate-500'} />
            <span>Refresh</span>
          </button>
        }
      />

      {isLoading ? (
        <div className="py-12">
          <LoadingState message="Querying member registry from Supabase..." />
        </div>
      ) : errorMessage ? (
        <ErrorState
          title="Failed to Load Directory"
          message={errorMessage}
          onRetry={fetchMembers}
        />
      ) : (
        <MemberTable members={members} />
      )}
    </div>
  )
}
