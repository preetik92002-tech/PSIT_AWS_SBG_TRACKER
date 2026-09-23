import React from 'react'
import { FolderOpen } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'

export const Projects: React.FC = () => (
  <div className="p-4">
    <SectionHeader title="Projects" subtitle="— all team projects" icon={<FolderOpen size={13} />} />
    <div className="card p-8 text-center">
      <p className="font-mono text-sm text-text-secondary">Projects page — coming in Phase 2</p>
    </div>
  </div>
)
