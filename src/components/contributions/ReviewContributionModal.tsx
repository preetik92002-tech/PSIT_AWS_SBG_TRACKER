import React, { useState } from 'react'
import {
  X,
  Award,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { ContributionWithProfiles } from '@/lib/contributions'
import { approveContribution, rejectContribution } from '@/lib/contributions'

interface ReviewContributionModalProps {
  contribution: ContributionWithProfiles
  onClose: () => void
  onReviewed: () => void
}

export const ReviewContributionModal: React.FC<ReviewContributionModalProps> = ({
  contribution,
  onClose,
  onReviewed,
}) => {
  const [points, setPoints] = useState(25)
  const [feedback, setFeedback] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const contributorName =
    contribution.contributor?.full_name ||
    contribution.contributor?.email.split('@')[0] ||
    'Builder'

  const recipientName = contribution.recipient
    ? contribution.recipient.full_name ||
      contribution.recipient.email.split('@')[0] ||
      'Peer'
    : 'Community at Large'

  const handleApprove = async () => {
    try {
      setIsProcessing(true)
      setErrorMsg(null)
      await approveContribution(contribution.id, points, feedback.trim() || undefined)
      onReviewed()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve contribution')
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    try {
      setIsProcessing(true)
      setErrorMsg(null)
      await rejectContribution(contribution.id, feedback.trim() || 'Contribution not approved at this time.')
      onReviewed()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject contribution')
      setIsProcessing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#121824] border border-[#232F40] shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2736] flex items-center justify-between bg-[#0D121B] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Manager Review: Contribution
              </h3>
              <p className="text-[11px] font-sans text-slate-400">
                Authorize points transaction and publish activity
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2736] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 font-sans text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Participant summary cards */}
          <div className="p-3.5 rounded-xl bg-[#0D121B] border border-[#1E2736] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                initials={contributorName.slice(0, 2).toUpperCase()}
                src={contribution.contributor?.avatar_url || undefined}
                size="sm"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Contributor</span>
                <span className="font-bold text-white truncate block">{contributorName}</span>
              </div>
            </div>

            <ArrowRight size={16} className="text-[#FF9900] shrink-0" />

            <div className="flex items-center gap-2 min-w-0 text-right">
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Recipient</span>
                <span className="font-bold text-white truncate block">{recipientName}</span>
              </div>
              {contribution.recipient && (
                <Avatar
                  initials={recipientName.slice(0, 2).toUpperCase()}
                  src={contribution.recipient?.avatar_url || undefined}
                  size="sm"
                />
              )}
            </div>
          </div>

          {/* Contribution Details */}
          <div className="space-y-3 p-4 rounded-xl bg-[#0D121B] border border-[#1E2736]">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#18202E] border border-[#232F40] text-[#FF9900]">
                {contribution.category}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {new Date(contribution.created_at).toLocaleDateString()}
              </span>
            </div>

            <div>
              <h4 className="font-mono text-sm font-bold text-white">{contribution.title}</h4>
              <p className="text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                {contribution.description}
              </p>
            </div>

            {contribution.evidence_url && (
              <div className="pt-2 border-t border-[#1E2736]">
                <a
                  href={contribution.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink size={13} />
                  <span className="truncate max-w-sm">View Attached Evidence / PR</span>
                </a>
              </div>
            )}
          </div>

          {/* Points Award Configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award size={14} className="text-[#FF9900]" />
                <span>Points to Award (points_transactions)</span>
              </label>
              <span className="text-xs font-mono font-bold text-[#FF9900]">+{points} XP</span>
            </div>

            {/* Preset chips */}
            <div className="flex items-center gap-2">
              {[10, 25, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPoints(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border ${
                    points === val
                      ? 'bg-[#FF9900] text-slate-950 border-[#FF9900]'
                      : 'bg-[#0D121B] text-slate-400 border-[#232F40] hover:text-white'
                  }`}
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Feedback to Contributor (Optional)
            </label>
            <textarea
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Great job mentoring peer through VPC and route table configurations!"
              className="w-full px-3.5 py-2 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] text-xs resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-[#1F293A] bg-[#0D121B] flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleReject}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <XCircle size={14} />
            <span>Reject</span>
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 size={14} className="animate-spin text-slate-950" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            <span>Approve &amp; Award +{points} XP</span>
          </button>
        </div>
      </div>
    </div>
  )
}
