import React, { useState, useEffect } from 'react'
import {
  X,
  Award,
  Users,
  Tag,
  Link2,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { submitContribution } from '@/lib/contributions'
import type { ContributionCategory } from '@/types/database'

interface CreateContributionModalProps {
  isOpen: boolean
  initialTitle?: string
  onClose: () => void
  onSuccess: () => void
}

interface ChapterMemberOption {
  userId: string
  name: string
  avatarUrl: string | null
  alias?: string | null
}

const CATEGORIES: ContributionCategory[] = [
  'Mentorship',
  'Debugging & Troubleshooting',
  'Code Review',
  'AWS Deployment',
  'Workshop Support',
  'Architecture Guidance',
  'Documentation',
  'General Assistance',
]

export const CreateContributionModal: React.FC<CreateContributionModalProps> = ({
  isOpen,
  initialTitle = '',
  onClose,
  onSuccess,
}) => {
  const { activeCommunity } = useCommunity()
  const { user } = useAuth()

  const [recipientId, setRecipientId] = useState<string>('') // empty = general community
  const [category, setCategory] = useState<ContributionCategory>('AWS Deployment')
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')

  const [members, setMembers] = useState<ChapterMemberOption[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (initialTitle) {
      setTitle(initialTitle)
    }
  }, [initialTitle])

  // Fetch active community members for recipient selection (excluding current user)
  useEffect(() => {
    if (!isOpen || !activeCommunity?.id) return

    const loadMembers = async () => {
      try {
        const { data } = await supabase
          .from('community_members')
          .select(`
            user_id,
            profiles!community_members_user_id_fkey (
              id,
              full_name,
              email,
              avatar_url,
              aws_builder_alias
            )
          `)
          .eq('community_id', activeCommunity.id)
          .eq('status', 'active')

        const list: ChapterMemberOption[] = (data || [])
          .filter((m: any) => m.user_id !== user?.id)
          .map((m: any) => ({
            userId: m.user_id,
            name: m.profiles?.full_name || m.profiles?.email?.split('@')[0] || 'Builder',
            avatarUrl: m.profiles?.avatar_url || null,
            alias: m.profiles?.aws_builder_alias || null,
          }))

        setMembers(list)
      } catch (err) {
        console.error('Failed to load roster:', err)
      }
    }

    loadMembers()
  }, [isOpen, activeCommunity?.id, user?.id])

  if (!isOpen || !activeCommunity) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return

    try {
      setIsSubmitting(true)
      setErrorMsg(null)

      await submitContribution({
        communityId: activeCommunity.id,
        recipientId: recipientId || null,
        category,
        title: title.trim(),
        description: description.trim(),
        evidenceUrl: evidenceUrl.trim() || null,
      })

      setSuccessMsg('Contribution recorded and submitted for manager review!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 900)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit contribution.')
    } finally {
      setIsSubmitting(false)
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
            <div className="p-2 rounded-xl bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Record Peer Contribution
              </h3>
              <p className="text-[11px] font-sans text-slate-400">
                Log assistance provided to a fellow builder or the community
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 font-sans text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Help Description Callout */}
          <div className="p-3 rounded-xl bg-[#0D121B] border border-[#1E2736] text-[11px] font-mono text-slate-400 flex items-start gap-2">
            <HelpCircle size={15} className="text-[#FF9900] flex-shrink-0 mt-0.5" />
            <span>
              <strong>Peer Contribution Concept:</strong> Records that you helped another builder (e.g. <em>&quot;Preeti helped Mradul with AWS deployment&quot;</em>). Once reviewed, points are credited to your community ledger.
            </span>
          </div>

          {/* Recipient Selection */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Who did you help?
            </label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
            >
              <option value="">Whole Community / Chapter Initiative</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} {m.alias ? `(@${m.alias})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Contribution Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ContributionCategory)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Contribution Summary <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AWS Lambda deployment troubleshooting"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Detailed Context / What was done <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain how you assisted the member, resolved an error, or provided architecture guidance..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] text-xs resize-none"
            />
          </div>

          {/* Evidence URL */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Evidence / Link (PR, GitHub, Documentation, Slack)
            </label>
            <div className="relative">
              <Link2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://github.com/... or https://..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0D121B] border border-[#232F40] text-white focus:outline-none focus:border-[#FF9900] font-mono text-xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin text-slate-900" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Contribution</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
