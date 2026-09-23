import React from 'react'
import { Trophy } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'

export const Achievements: React.FC = () => (
  <div className="p-4">
    <SectionHeader title="Achievements" subtitle="— badges & milestones" icon={<Trophy size={13} />} />
    <div className="card p-8 text-center">
      <p className="font-mono text-sm text-text-secondary">Achievements page — coming in Phase 2</p>
    </div>
  </div>
)
