import React from 'react'
import { Link } from 'react-router-dom'
import { User, Shield, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { useAuth } from '@/context/AuthContext'

export const Profile: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Profile"
        subtitle="Manage your community identity, AWS Builder profile connection, and personal bio."
        tag="Identity"
        icon={<User size={20} />}
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Profile' },
        ]}
        actions={
          user ? (
            <Link
              to={`/members/${user.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium text-slate-300 hover:text-white bg-[#18202E] hover:bg-[#202B3D] border border-[#1F293A] transition-all shadow-2xs"
            >
              <span>View Public Profile</span>
              <ExternalLink size={12} className="text-slate-400" />
            </Link>
          ) : undefined
        }
      />

      <ProfileForm />
    </div>
  )
}
