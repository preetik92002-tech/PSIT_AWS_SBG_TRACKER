import React from 'react'
import { BookOpen } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'

export const Learning: React.FC = () => (
  <div className="p-4">
    <SectionHeader title="Learning" subtitle="— tracks & progress" icon={<BookOpen size={13} />} />
    <div className="card p-8 text-center">
      <p className="font-mono text-sm text-text-secondary">Learning page — coming in Phase 2</p>
    </div>
  </div>
)
