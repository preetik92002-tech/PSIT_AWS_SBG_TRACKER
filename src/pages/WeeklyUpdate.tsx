import React from 'react'
import { CalendarCheck } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'

export const WeeklyUpdate: React.FC = () => (
  <div className="p-4">
    <SectionHeader title="Weekly Update" subtitle="— submit your progress" icon={<CalendarCheck size={13} />} />
    <div className="card p-8 text-center">
      <p className="font-mono text-sm text-text-secondary">Weekly Update page — coming in Phase 2</p>
    </div>
  </div>
)
