import React from 'react'
import { Users } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'

export const Builders: React.FC = () => (
  <div className="p-4">
    <SectionHeader title="Builders" subtitle="— 20 members" icon={<Users size={13} />} />
    <div className="card p-8 text-center">
      <p className="font-mono text-sm text-text-secondary">Builders page — coming in Phase 2</p>
    </div>
  </div>
)
