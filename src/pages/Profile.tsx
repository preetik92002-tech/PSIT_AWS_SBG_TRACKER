import React from 'react'
import { User, Shield } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProfileForm } from '@/components/profile/ProfileForm'

export const Profile: React.FC = () => {
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
      />

      <ProfileForm />
    </div>
  )
}
