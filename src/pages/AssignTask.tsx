import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckSquare,
  Users,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  Paperclip,
  Check,
  Shield,
  Loader2,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'

interface ChapterMemberOption {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  role: string
}

export const AssignTask: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const preselectedMemberId = searchParams.get('memberId')

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignTarget, setAssignTarget] = useState<'all' | 'head' | 'selected'>('all')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    preselectedMemberId ? [preselectedMemberId] : []
  )
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal')
  const [checklist, setChecklist] = useState<string[]>([
    'Review task requirements and architectural guidelines',
    'Implement solution with AWS services',
    'Submit verification evidence or repository link',
  ])
  const [newChecklistInput, setNewChecklistInput] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')

  // Roster options strictly queried from current active community
  const [communityMembers, setCommunityMembers] = useState<ChapterMemberOption[]>([])
  const [isLoadingRoster, setIsLoadingRoster] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isManager = userRoleInActiveCommunity === 'manager'

  // Fetch only active members of current community
  useEffect(() => {
    const fetchRoster = async () => {
      if (!activeCommunity?.id) return
      setIsLoadingRoster(true)
      try {
        const { data, error } = await supabase
          .from('community_members')
          .select(`
            user_id,
            role,
            profiles!community_members_user_id_fkey (
              id,
              full_name,
              email,
              avatar_url
            )
          `)
          .eq('community_id', activeCommunity.id)
          .eq('status', 'active')

        if (error) throw error

        const list: ChapterMemberOption[] = (data || []).map((m: any) => ({
          userId: m.user_id,
          fullName: m.profiles?.full_name || m.profiles?.email?.split('@')[0] || 'Builder',
          email: m.profiles?.email || '',
          avatarUrl: m.profiles?.avatar_url || null,
          role: m.role,
        }))

        setCommunityMembers(list)

        if (preselectedMemberId && list.some((m) => m.userId === preselectedMemberId)) {
          setAssignTarget('selected')
          setSelectedMemberIds([preselectedMemberId])
        }
      } catch (err) {
        console.error('Failed to query roster', err)
      } finally {
        setIsLoadingRoster(false)
      }
    }

    fetchRoster()
  }, [activeCommunity?.id, preselectedMemberId])

  const handleAddChecklistItem = () => {
    if (!newChecklistInput.trim()) return
    setChecklist([...checklist, newChecklistInput.trim()])
    setNewChecklistInput('')
  }

  const handleRemoveChecklistItem = (idx: number) => {
    setChecklist(checklist.filter((_, i) => i !== idx))
  }

  const handleToggleMemberSelection = (userId: string) => {
    if (selectedMemberIds.includes(userId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId))
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId])
    }
  }

  const handleSubmit = async (isDraft: boolean) => {
    if (!activeCommunity?.id || !user) return
    if (!title.trim()) {
      setErrorMessage('Please enter a task title.')
      return
    }

    if (assignTarget === 'selected' && selectedMemberIds.length === 0 && !isDraft) {
      setErrorMessage('Please select at least one community member to assign this task to.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const points = priority === 'urgent' ? 100 : priority === 'important' ? 75 : 50

      // 1. Insert into community_tasks
      const { data: taskRecord, error: taskErr } = await supabase
        .from('community_tasks')
        .insert({
          community_id: activeCommunity.id,
          title: title.trim(),
          description: description.trim() || null,
          points,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (taskErr) throw taskErr

      // 2. If not draft, create assignment records
      if (!isDraft && taskRecord?.id) {
        let recipientIds: string[] = []
        if (assignTarget === 'all') {
          recipientIds = communityMembers.map((m) => m.userId)
        } else if (assignTarget === 'head') {
          recipientIds = communityMembers.filter((m) => m.role === 'manager').map((m) => m.userId)
        } else {
          // Strictly validate that each selected id is present in communityMembers
          recipientIds = selectedMemberIds.filter((sid) =>
            communityMembers.some((cm) => cm.userId === sid)
          )
        }

        if (recipientIds.length > 0) {
          const assignments = recipientIds.map((uid) => ({
            community_id: activeCommunity.id,
            task_id: taskRecord.id,
            user_id: uid,
            status: 'pending',
          }))

          const { error: assignErr } = await supabase
            .from('community_task_assignments')
            .insert(assignments)

          if (assignErr) throw assignErr
        }

        // 3. Log activity
        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: 'assigned task',
          description: `Assigned task "${title.trim()}" (${points} XP) to ${recipientIds.length} builder(s)`,
        })
      }

      setSuccessMessage(
        isDraft
          ? 'Task draft saved successfully!'
          : 'Task successfully assigned to your community builders!'
      )

      setTimeout(() => {
        navigate('/tasks')
      }, 1500)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to assign task.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
        <div>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Tasks</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-sans tracking-tight">
            Assign a task
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Distribute tasks and learning challenges to your <strong className="text-slate-700">{activeCommunity?.name}</strong> builders.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 font-mono">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-mono">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 2-Column Split: Form (Left 65%) vs Live Preview (Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Container (70% on desktop) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          {/* Task Title */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deploy Serverless REST API with AWS Lambda & API Gateway"
              className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the objectives, expected AWS resources, and architectural deliverables..."
              className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
            />
          </div>

          {/* Assign To (Entire community, Community Head, Selected members) */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assign To *
            </label>
            <div className="grid grid-cols-3 gap-3 font-mono">
              <label className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                assignTarget === 'all'
                  ? 'border-[#FF9900] bg-orange-50/40 text-[#EA580C] font-bold'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Entire Community</span>
                  <input
                    type="radio"
                    name="assignTarget"
                    checked={assignTarget === 'all'}
                    onChange={() => setAssignTarget('all')}
                    className="accent-[#FF9900]"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-normal mt-1">All {communityMembers.length} active builders</span>
              </label>

              <label className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                assignTarget === 'head'
                  ? 'border-[#FF9900] bg-orange-50/40 text-[#EA580C] font-bold'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Community Head</span>
                  <input
                    type="radio"
                    name="assignTarget"
                    checked={assignTarget === 'head'}
                    onChange={() => setAssignTarget('head')}
                    className="accent-[#FF9900]"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-normal mt-1">Chapter managers</span>
              </label>

              <label className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                assignTarget === 'selected'
                  ? 'border-[#FF9900] bg-orange-50/40 text-[#EA580C] font-bold'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Selected Members</span>
                  <input
                    type="radio"
                    name="assignTarget"
                    checked={assignTarget === 'selected'}
                    onChange={() => setAssignTarget('selected')}
                    className="accent-[#FF9900]"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-normal mt-1">
                  {selectedMemberIds.length} chosen
                </span>
              </label>
            </div>

            {/* Member Picker for 'Selected members' (Strictly from current chapter) */}
            {assignTarget === 'selected' && (
              <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <span className="text-[11px] font-mono text-slate-500 font-semibold block">
                  Select builders from {activeCommunity?.name}:
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                  {communityMembers.map((m) => {
                    const isChecked = selectedMemberIds.includes(m.userId)
                    return (
                      <label
                        key={m.userId}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-orange-50/60 border-orange-200 text-slate-900 font-medium'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar
                            initials={m.fullName.slice(0, 2).toUpperCase()}
                            src={m.avatarUrl || undefined}
                            size="sm"
                          />
                          <div>
                            <span className="block font-sans text-xs font-semibold">{m.fullName}</span>
                            <span className="block text-[10px] text-slate-400">{m.email}</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMemberSelection(m.userId)}
                          className="accent-[#FF9900] w-4 h-4 rounded"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Due Date & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                {(['normal', 'important', 'urgent'] as const).map((p) => {
                  const isSelected = priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 rounded-xl border text-center capitalize transition-all cursor-pointer ${
                        isSelected
                          ? p === 'urgent'
                            ? 'border-red-500 bg-red-50 text-red-700 font-bold'
                            : p === 'important'
                            ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold'
                            : 'border-blue-500 bg-blue-50 text-blue-800 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Checklist Items */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Checklist Items
            </label>
            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-sans text-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-500 text-[10px] font-mono flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(idx)}
                    className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newChecklistInput}
                  onChange={(e) => setNewChecklistInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                  placeholder="Add a milestone checklist item..."
                  className="flex-1 px-3 py-2 text-xs font-sans rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900]"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <Plus size={13} />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Optional Attachment */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Optional Attachment / Resource Link
            </label>
            <div className="relative">
              <Paperclip size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://github.com/aws-samples/your-lab-starter"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF9900]"
              />
            </div>
          </div>

          {/* Action Buttons: Save draft + Assign task */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Save Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting || !title.trim()}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-white bg-[#FF9900] hover:bg-[#EA580C] disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Assigning Task...</span>
                </>
              ) : (
                <>
                  <CheckSquare size={14} />
                  <span>Assign Task</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Preview Panel (Right 30% on desktop, below form on mobile) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#FF9900]" />
                <span>Task Preview</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Live</span>
            </div>

            {/* Task Card Preview */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-900 font-sans text-xs">
                  {title.trim() || 'Untitled Task'}
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                  priority === 'urgent'
                    ? 'bg-red-100 text-red-700'
                    : priority === 'important'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-orange-100 text-[#EA580C]'
                }`}>
                  +{priority === 'urgent' ? 100 : priority === 'important' ? 75 : 50} XP
                </span>
              </div>

              {description.trim() ? (
                <p className="text-[11px] text-slate-500 font-sans leading-relaxed line-clamp-3">
                  {description.trim()}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No description provided.</p>
              )}

              {/* Due Date & Assignment Scope */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar size={12} className="text-slate-400" />
                  <span>Due {dueDate || 'No date'}</span>
                </div>
                <div className="flex items-center gap-1 text-[#EA580C] font-semibold">
                  <Users size={12} />
                  <span>
                    {assignTarget === 'all'
                      ? 'Entire Community'
                      : assignTarget === 'head'
                      ? 'Chapter Head'
                      : `${selectedMemberIds.length} Builders`}
                  </span>
                </div>
              </div>

              {/* Checklist count */}
              {checklist.length > 0 && (
                <div className="pt-1 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  <span>{checklist.length} checklist milestones attached</span>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-orange-50/70 border border-orange-100 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
              <Shield size={14} className="text-[#EA580C] shrink-0 mt-0.5" />
              <span>
                Task assignments are validated strictly for <strong className="text-slate-900">{activeCommunity?.name}</strong>. Members from other chapters cannot receive this assignment.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
