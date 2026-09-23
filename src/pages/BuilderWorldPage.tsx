import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe2, Activity, Radio } from 'lucide-react'
import { BuilderWorld, MemberProfileContent } from '@/components/world/BuilderWorld'
import { WorldStats } from '@/components/dashboard/WorldStats'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Modal } from '@/components/ui/Modal'
import { MEMBERS } from '@/data/members'
import { RECENT_ACTIVITY } from '@/data/activity'
import type { Member } from '@/types'

export const BuilderWorldPage: React.FC = () => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}
          >
            <Globe2 size={15} style={{ color: 'var(--accent-bright)' }} />
          </div>
          <div>
            <h1 className="font-mono font-bold text-sm text-text-primary tracking-tight">
              BUILDER WORLD
            </h1>
            <p className="font-mono text-[10px] text-text-muted">
              AWS SBG · Season 1 · {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-secondary border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-slow" />
            <span className="font-mono text-[10px] text-text-secondary">LIVE</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-surface-secondary border border-border">
            <Radio size={10} className="text-accent-secondary" />
            <span className="font-mono text-[10px] text-text-muted">Week 12 Active</span>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <WorldStats members={MEMBERS} />
          </motion.div>

          {/* Builder World */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <SectionHeader
              title="Builder World"
              subtitle="— hover to inspect · click to view profile"
              icon={<Globe2 size={13} />}
              action={
                <span className="font-mono text-[10px] text-text-muted">
                  {MEMBERS.length} members
                </span>
              }
            />

            {/* World container */}
            <div
              className="border border-border overflow-hidden"
              style={{
                background: 'var(--world-bg)',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4)',
              }}
            >
              {/* World header bar */}
              <div
                className="flex items-center gap-2 px-3 py-2 border-b"
                style={{ borderColor: 'var(--border)', background: 'rgba(8,10,16,0.6)' }}
              >
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--danger)' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--warning)' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--success)' }} />
                </div>
                <span className="font-mono text-[10px] text-text-muted">
                  sbg://world/season-1 · {MEMBERS.filter(m => m.weeklyXp > 0).length} active builders
                </span>
              </div>

              <BuilderWorld
                members={MEMBERS}
                onSelectMember={setSelectedMember}
              />
            </div>
          </motion.div>

          {/* Bottom section: Activity + Top Builders */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.16 }}
          >
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <SectionHeader
                title="Recent Activity"
                subtitle="— real-time updates"
                icon={<Activity size={13} />}
              />
              <div className="card p-0 px-4">
                <RecentActivity items={RECENT_ACTIVITY} />
              </div>
            </div>

            {/* Top Builders this week */}
            <div>
              <SectionHeader title="Top Builders" subtitle="— this week" />
              <div className="card p-0 overflow-hidden">
                {[...MEMBERS]
                  .sort((a, b) => b.weeklyXp - a.weeklyXp)
                  .slice(0, 7)
                  .map((m, i) => (
                    <motion.div
                      key={m.id}
                      className="flex items-center gap-3 px-3 py-2.5 border-b border-border cursor-pointer"
                      style={{ borderColor: 'var(--border-subtle)' }}
                      whileHover={{ backgroundColor: 'var(--surface-secondary)' }}
                      onClick={() => setSelectedMember(m)}
                    >
                      <span
                        className="font-mono text-[10px] font-bold flex-shrink-0"
                        style={{
                          color: i === 0 ? 'var(--warning)' : i === 1 ? 'var(--text-secondary)' : 'var(--text-muted)',
                          width: 16,
                          textAlign: 'right',
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-medium text-text-primary">
                            {m.name}
                          </span>
                          <span className="font-mono text-[10px] text-success">
                            +{m.weeklyXp}
                          </span>
                        </div>
                        <div
                          className="mt-1 xp-bar"
                          style={{ height: 2 }}
                        >
                          <div
                            className="xp-bar-fill"
                            style={{
                              width: `${(m.weeklyXp / MEMBERS[0].weeklyXp) * 100}%`,
                              background: i === 0 ? 'var(--warning)' : 'var(--accent)',
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Member Profile Modal */}
      <Modal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title={selectedMember ? `${selectedMember.name}'s Profile` : ''}
        subtitle={selectedMember ? `@${selectedMember.username} · Level ${selectedMember.level}` : ''}
        size="lg"
      >
        {selectedMember && <MemberProfileContent member={selectedMember} />}
      </Modal>
    </div>
  )
}
