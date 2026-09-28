import React, { useState, useEffect, useMemo } from 'react'
import {
  Award,
  Users,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Trash2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import {
  listCommunityContributions,
  deleteContribution,
  type ContributionWithProfiles,
} from '@/lib/contributions'
import { CreateContributionModal } from '@/components/contributions/CreateContributionModal'
import { ReviewContributionModal } from '@/components/contributions/ReviewContributionModal'

interface ContributionsListProps {
  communityId: string
  isManager: boolean
  currentUserId?: string
  initialCreateTitle?: string
}

export const ContributionsList: React.FC<ContributionsListProps> = ({
  communityId,
  isManager,
  currentUserId,
  initialCreateTitle,
}) => {
  const [contributions, setContributions] = useState<ContributionWithProfiles[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'All' | 'pending' | 'approved' | 'my'>('All')

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createInitialTitle, setCreateInitialTitle] = useState(initialCreateTitle || '')
  const [reviewingContribution, setReviewingContribution] = useState<ContributionWithProfiles | null>(null)

  const loadContributions = async () => {
    try {
      setLoading(true)
      const data = await listCommunityContributions(communityId)
      setContributions(data)
    } catch (err) {
      console.error('Failed to load contributions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (communityId) {
      loadContributions()
    }
  }, [communityId])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this pending contribution submission?')) return
    try {
      await deleteContribution(id)
      loadContributions()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const filteredList = useMemo(() => {
    return contributions.filter((c) => {
      // Tab filter
      if (activeTab === 'pending' && c.status !== 'pending') return false
      if (activeTab === 'approved' && c.status !== 'approved') return false
      if (activeTab === 'my') {
        const isMine = c.contributor_id === currentUserId || c.recipient_id === currentUserId
        if (!isMine) return false
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchTitle = c.title.toLowerCase().includes(q)
        const matchDesc = c.description.toLowerCase().includes(q)
        const matchCat = c.category.toLowerCase().includes(q)
        const matchContributor = (c.contributor?.full_name || c.contributor?.email || '').toLowerCase().includes(q)
        const matchRecipient = (c.recipient?.full_name || c.recipient?.email || '').toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchCat && !matchContributor && !matchRecipient) {
          return false
        }
      }

      return true
    })
  }, [contributions, activeTab, searchTerm, currentUserId])

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-mono font-bold text-white flex items-center gap-2">
            <Award size={18} className="text-[#FF9900]" />
            <span>Community Contributions &amp; Peer Help</span>
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Peer assistance records where builders help fellow community members solve problems and build on AWS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateInitialTitle('')
            setIsCreateOpen(true)
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-xs shrink-0"
        >
          <Plus size={14} />
          <span>Record Contribution</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search contributions by builder, category, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-sans rounded-xl bg-[#121824] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] transition-colors"
            />
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={loadContributions}
            className="p-2 rounded-xl border border-[#1F293A] bg-[#121824] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs">
          {[
            { id: 'All', label: 'All Contributions' },
            { id: 'approved', label: 'Approved Impact' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'my', label: 'My Submissions' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#FF9900]/15 border-[#FF9900] text-[#FF9900] font-bold'
                  : 'bg-[#18202E] border-[#1F293A] text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="py-20">
          <LoadingState message="Loading community contribution ledger..." />
        </div>
      ) : filteredList.length === 0 ? (
        <EmptyState
          title="No contributions found"
          description={
            activeTab === 'pending'
              ? 'No contributions are currently awaiting manager approval.'
              : 'Be the first to record a peer assistance contribution for your community!'
          }
          icon={<Award size={24} className="text-slate-400" />}
          badge="Contributions"
          action={{
            label: 'Record New Contribution',
            onClick: () => setIsCreateOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item) => {
            const contributorName =
              item.contributor?.full_name ||
              item.contributor?.email.split('@')[0] ||
              'Builder'

            const recipientName = item.recipient
              ? item.recipient.full_name ||
                item.recipient.email.split('@')[0] ||
                'Peer'
              : 'the Community'

            const isPending = item.status === 'pending'
            const isApproved = item.status === 'approved'

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 flex flex-col justify-between gap-4 shadow-xs text-slate-100"
              >
                <div className="space-y-3">
                  {/* Category & Status Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#18202E] border border-[#232F40] text-slate-300">
                      {item.category}
                    </span>

                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 size={11} />
                        <span>Approved (+{item.points_awarded} XP)</span>
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        <Clock size={11} />
                        <span>Pending Review</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                        <XCircle size={11} />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>

                  {/* Public Contribution Story Sentence */}
                  <div className="p-3 rounded-xl bg-[#0D121B] border border-[#1E2736] flex items-center gap-2.5">
                    <Avatar
                      initials={contributorName.slice(0, 2).toUpperCase()}
                      src={item.contributor?.avatar_url || undefined}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-slate-200 leading-snug">
                        <strong className="text-white font-bold">{contributorName}</strong>{' '}
                        helped{' '}
                        <strong className="text-[#FF9900] font-bold">{recipientName}</strong>{' '}
                        with{' '}
                        <span className="text-slate-300">{item.title}</span>
                      </p>
                    </div>
                  </div>

                  {/* Description Context */}
                  <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-3">
                    {item.description}
                  </p>

                  {/* Attached Evidence */}
                  {item.evidence_url && (
                    <a
                      href={item.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink size={12} />
                      <span className="truncate max-w-xs">View Evidence / PR Link</span>
                    </a>
                  )}

                  {/* Reviewer Feedback if present */}
                  {item.reviewer_feedback && (
                    <div className="p-2.5 rounded-lg bg-[#0E141F] border border-slate-800 text-[11px] font-mono text-slate-400">
                      <strong className="text-slate-300">Lead Feedback:</strong> {item.reviewer_feedback}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-[#1E2736] flex items-center justify-between gap-2 font-mono text-[11px]">
                  <span className="text-slate-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Manager Review Action */}
                    {isManager && isPending && (
                      <button
                        type="button"
                        onClick={() => setReviewingContribution(item)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
                      >
                        <ShieldCheck size={13} />
                        <span>Review</span>
                      </button>
                    )}

                    {/* Contributor Delete Pending Action */}
                    {item.contributor_id === currentUserId && isPending && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete pending submission"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateContributionModal
          isOpen={isCreateOpen}
          initialTitle={createInitialTitle}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={loadContributions}
        />
      )}

      {/* Review Modal */}
      {reviewingContribution && (
        <ReviewContributionModal
          contribution={reviewingContribution}
          onClose={() => setReviewingContribution(null)}
          onReviewed={loadContributions}
        />
      )}
    </div>
  )
}
