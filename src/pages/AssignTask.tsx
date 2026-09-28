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
  Tag,
  Trophy,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { TaskPriority } from '@/types/database'

interface ChapterMemberOption {
  userId: string
  fullName: string
  email: string
  avatarUrl: string | null
  role: string
}

const DEFAULT_TOPICS = [
  'AWS Cloud Foundations & Practitioner',
  'Serverless & Lambda Architectures',
  'Containers, ECS & Kubernetes',
  'Cloud Storage & Database (S3, RDS, DynamoDB)',
  'Cloud Security, IAM & Governance',
  'Generative AI & Machine Learning / SageMaker',
  'DevOps, CI/CD & Terraform / CDK',
  'Solutions Architecture Showcase',
]

export const AssignTask: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  const preselectedMemberId = searchParams.get('memberId')
  const editTaskId = searchParams.get('editTaskId')

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState(DEFAULT_TOPICS[0])
  const [customTopic, setCustomTopic] = useState('')
  const [points, setPoints] = useState<number>(50)
  const [assignTarget, setAssignTarget] = useState<'all' | 'head' | 'selected'>('all')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    preselectedMemberId ? [preselectedMemberId] : []
  )
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [checklist, setChecklist] = useState<string[]>([
    'Review task requirements and architectural guidelines',
    'Implement solution with AWS services',
    'Submit verification evidence or repository link',
  ])
  const [newChecklistInput, setNewChecklistInput] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')

  // Roster options strictly queried from current active community
  const [communityMembers, setCommunityMembers] = useState<ChapterMemberOption[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [isLoadingRoster, setIsLoadingRoster] = useState(false)
  const [isLoadingTask, setIsLoadingTask] = useState(false)
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

  // If in edit mode, fetch existing task
  useEffect(() => {
    const fetchExistingTask = async () => {
      if (!editTaskId || !activeCommunity?.id) return
      setIsLoadingTask(true)
      try {
        const { data: taskData, error: taskErr } = await supabase
          .from('community_tasks')
          .select('*')
          .eq('id', editTaskId)
          .eq('community_id', activeCommunity.id)
          .single()

        if (taskErr) throw taskErr

        if (taskData) {
          setTitle(taskData.title || '')
          setDescription(taskData.description || '')
          setPoints(taskData.points || 50)
          if (taskData.due_date) {
            setDueDate(new Date(taskData.due_date).toISOString().slice(0, 10))
          }
          if (taskData.priority) {
            setPriority(taskData.priority as TaskPriority)
          }
          if (taskData.topic) {
            if (DEFAULT_TOPICS.includes(taskData.topic)) {
              setTopic(taskData.topic)
            } else {
              setTopic('Other')
              setCustomTopic(taskData.topic)
            }
          }
          if (Array.isArray(taskData.checklist) && taskData.checklist.length > 0) {
            setChecklist(taskData.checklist as string[])
          }

          // Fetch current assignments
          const { data: assignData } = await supabase
            .from('community_task_assignments')
            .select('user_id')
            .eq('task_id', editTaskId)

          if (assignData && assignData.length > 0) {
            setAssignTarget('selected')
            setSelectedMemberIds(assignData.map((a: any) => a.user_id))
          }
        }
      } catch (err) {
        console.error('Failed to load task for editing', err)
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load task.')
      } finally {
        setIsLoadingTask(false)
      }
    }

    fetchExistingTask()
  }, [editTaskId, activeCommunity?.id])

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

  const handleSelectAllVisible = () => {
    const visibleIds = filteredMembers.map((m) => m.userId)
    const allSelected = visibleIds.every((id) => selectedMemberIds.includes(id))
    if (allSelected) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => !visibleIds.includes(id)))
    } else {
      const combined = Array.from(new Set([...selectedMemberIds, ...visibleIds]))
      setSelectedMemberIds(combined)
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
      const finalTopic = topic === 'Other' ? (customTopic.trim() || 'General AWS') : topic

      let taskId = editTaskId

      if (editTaskId) {
        // Update existing task
        const { error: updateErr } = await supabase
          .from('community_tasks')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            points,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
            priority,
            topic: finalTopic,
            checklist: checklist as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editTaskId)
          .eq('community_id', activeCommunity.id)

        if (updateErr) throw updateErr
      } else {
        // Create new task
        const { data: taskRecord, error: taskErr } = await supabase
          .from('community_tasks')
          .insert({
            community_id: activeCommunity.id,
            title: title.trim(),
            description: description.trim() || null,
            points,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
            priority,
            topic: finalTopic,
            checklist: checklist as any,
            created_by: user.id,
          })
          .select('id')
          .single()

        if (taskErr) throw taskErr
        taskId = taskRecord.id
      }

      // Sync assignment records if not a draft
      if (!isDraft && taskId) {
        let targetUserIds: string[] = []
        if (assignTarget === 'all') {
          targetUserIds = communityMembers.map((m) => m.userId)
        } else if (assignTarget === 'head') {
          targetUserIds = communityMembers.filter((m) => m.role === 'manager').map((m) => m.userId)
        } else {
          // Strictly validate that each selected id is present in communityMembers
          targetUserIds = selectedMemberIds.filter((sid) =>
            communityMembers.some((cm) => cm.userId === sid)
          )
        }

        if (targetUserIds.length > 0) {
          // Fetch existing assignments to avoid duplicates
          const { data: existingAssignees } = await supabase
            .from('community_task_assignments')
            .select('user_id')
            .eq('task_id', taskId)

          const existingUserIds = new Set((existingAssignees || []).map((a: any) => a.user_id))
          const newUserIds = targetUserIds.filter((uid) => !existingUserIds.has(uid))

          if (newUserIds.length > 0) {
            const newAssignments = newUserIds.map((uid) => ({
              community_id: activeCommunity.id,
              task_id: taskId!,
              user_id: uid,
              status: 'pending',
            }))

            const { error: assignErr } = await supabase
              .from('community_task_assignments')
              .insert(newAssignments)

            if (assignErr) throw assignErr

            // Generate Notifications for newly assigned builders
            const notifications = newUserIds.map((uid) => ({
              recipient_id: uid,
              community_id: activeCommunity.id,
              type: 'task' as const,
              title: 'Task Assigned',
              message: `You were assigned to "${title.trim()}" (+${points} XP). Due: ${dueDate || 'No deadline'}.`,
              entity_type: 'task',
              entity_id: taskId,
            }))

            await supabase.from('notifications').insert(notifications)
          }
        }

        // Record community activity
        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: user.id,
          activity_type: editTaskId ? 'updated task' : 'assigned task',
          description: editTaskId
            ? `Updated task "${title.trim()}"`
            : `Assigned task "${title.trim()}" (${points} XP) to ${targetUserIds.length} builder(s)`,
          metadata: { task_id: taskId, points, priority },
        })
      }

      setSuccessMessage(
        editTaskId
          ? 'Task updated successfully!'
          : isDraft
          ? 'Task draft saved successfully!'
          : 'Task successfully created and assigned to your community builders!'
      )

      setTimeout(() => {
        navigate('/tasks')
      }, 1200)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save task.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter roster by search query
  const filteredMembers = communityMembers.filter((m) => {
    if (!memberSearchQuery.trim()) return true
    const q = memberSearchQuery.toLowerCase()
    return m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  })

  // Permission guard: only managers can access
  if (!isManager) {
    return (
      <div className="py-20 max-w-md mx-auto text-center space-y-4 font-mono text-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#FF9900] flex items-center justify-center mx-auto border border-[#FF9900]/30">
          <Shield size={24} />
        </div>
        <h2 className="text-base font-bold text-white font-sans">Manager Access Required</h2>
        <p className="text-slate-400">
          Only Community Managers can create and assign tasks in {activeCommunity?.name}.
        </p>
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18202E] text-white border border-[#1F293A] hover:bg-[#222E42] transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to My Tasks</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1F293A] pb-5">
        <div>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Tasks</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-white font-sans tracking-tight">
              {editTaskId ? 'Edit Task' : 'Assign a Task'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30">
              {activeCommunity?.short_name || activeCommunity?.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            {editTaskId
              ? 'Update specifications, deadlines, priority, and assignees for this task.'
              : 'Distribute tasks and learning challenges to your builders.'}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 flex items-center gap-2 text-xs text-red-300 font-mono">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 flex items-center gap-2 text-xs text-emerald-300 font-mono">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {isLoadingTask ? (
        <div className="py-20 text-center text-xs font-mono text-slate-400">
          <Loader2 className="animate-spin inline-block mr-2" size={16} />
          <span>Loading task details...</span>
        </div>
      ) : (
        /* 2-Column Split: Form (Left 65%) vs Live Preview (Right 35%) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Container */}
          <div className="lg:col-span-8 rounded-2xl border border-[#1F293A] bg-[#121824] p-6 shadow-xs space-y-5">
            {/* Task Title */}
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deploy Serverless REST API with AWS Lambda & API Gateway"
                className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the objectives, expected AWS resources, and architectural deliverables..."
                className="w-full px-3.5 py-2.5 text-xs font-sans rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
              />
            </div>

            {/* Related Chapter / Topic */}
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Related Chapter / Topic *
              </label>
              <div className="space-y-2">
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
                >
                  {DEFAULT_TOPICS.map((t) => (
                    <option key={t} value={t} className="bg-[#121824] text-white">
                      {t}
                    </option>
                  ))}
                  <option value="Other" className="bg-[#121824] text-white">
                    Other / Custom Topic...
                  </option>
                </select>

                {topic === 'Other' && (
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Enter custom topic name..."
                    className="w-full px-3.5 py-2 text-xs font-sans rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                  />
                )}
              </div>
            </div>

            {/* Points & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Points (XP Value) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={500}
                    step={5}
                    value={points}
                    onChange={(e) => setPoints(Math.max(5, parseInt(e.target.value) || 0))}
                    className="w-24 px-3 py-2 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-[#FF9900] font-bold focus:outline-none focus:border-[#FF9900]"
                  />
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    {[25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPoints(preset)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                          points === preset
                            ? 'bg-[#FF9900]/20 border-[#FF9900] text-[#FF9900]'
                            : 'bg-[#18202E] border-[#1F293A] text-slate-400 hover:text-white'
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Priority *
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
                              ? 'border-red-500 bg-red-950/50 text-red-400 font-bold'
                              : p === 'important'
                              ? 'border-amber-500 bg-amber-950/50 text-amber-400 font-bold'
                              : 'border-[#FF9900] bg-[#FF9900]/10 text-[#FF9900] font-bold'
                            : 'border-[#1F293A] bg-[#18202E] text-slate-400 hover:bg-[#1E293B] hover:text-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Deadline Date
              </label>
              <div className="relative max-w-xs">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>

            {/* Checklist Items */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                  Milestone Checklist Items ({checklist.length})
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  Builders will check these off as they complete tasks
                </span>
              </div>
              <div className="space-y-2">
                {checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#1F293A] bg-[#18202E] text-xs font-sans text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#0E141F] border border-[#1F293A] text-slate-400 text-[10px] font-mono flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(idx)}
                      className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
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
                    className="flex-1 px-3 py-2 text-xs font-sans rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#18202E] hover:bg-[#1E293B] text-slate-200 border border-[#1F293A] transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Assign To (Entire community, Chapter Managers, Selected members) */}
            <div className="pt-2 border-t border-[#1F293A]">
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Assign Members *
              </label>
              <div className="grid grid-cols-3 gap-3 font-mono">
                <label className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  assignTarget === 'all'
                    ? 'border-[#FF9900] bg-[#FF9900]/10 text-[#FF9900] font-bold'
                    : 'border-[#1F293A] bg-[#18202E] text-slate-300 hover:bg-[#1E293B] hover:text-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">All Community</span>
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
                    ? 'border-[#FF9900] bg-[#FF9900]/10 text-[#FF9900] font-bold'
                    : 'border-[#1F293A] bg-[#18202E] text-slate-300 hover:bg-[#1E293B] hover:text-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Managers Only</span>
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
                    ? 'border-[#FF9900] bg-[#FF9900]/10 text-[#FF9900] font-bold'
                    : 'border-[#1F293A] bg-[#18202E] text-slate-300 hover:bg-[#1E293B] hover:text-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Select Members</span>
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

              {/* Member Picker for 'Selected members' (Strictly isolated to current chapter) */}
              {assignTarget === 'selected' && (
                <div className="mt-3 p-3 rounded-xl border border-[#1F293A] bg-[#0E141F] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Search builders in this chapter..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="px-3 py-1.5 text-xs font-mono rounded-lg bg-[#18202E] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900] flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="text-[11px] font-mono text-[#FF9900] hover:underline cursor-pointer shrink-0"
                    >
                      Toggle All Visible
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                    {filteredMembers.length === 0 ? (
                      <div className="py-4 text-center text-slate-500 text-xs">
                        No members found matching query.
                      </div>
                    ) : (
                      filteredMembers.map((m) => {
                        const isChecked = selectedMemberIds.includes(m.userId)
                        return (
                          <label
                            key={m.userId}
                            className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-[#FF9900]/15 border-[#FF9900]/50 text-white font-medium'
                                : 'bg-[#18202E] border-[#1F293A] text-slate-300 hover:bg-[#1E293B]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar
                                initials={m.fullName.slice(0, 2).toUpperCase()}
                                src={m.avatarUrl || undefined}
                                size="sm"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-sans text-xs font-semibold">{m.fullName}</span>
                                  {m.role === 'manager' && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#FF9900]/20 text-[#FF9900] font-bold">
                                      MANAGER
                                    </span>
                                  )}
                                </div>
                                <span className="block text-[10px] text-slate-400">{m.email}</span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleMemberSelection(m.userId)}
                              className="accent-[#FF9900] w-4 h-4 rounded cursor-pointer"
                            />
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Resource Link */}
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Optional Attachment / Resource Link
              </label>
              <div className="relative">
                <Paperclip size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://github.com/aws-samples/your-lab-starter"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[#0E141F] border border-[#1F293A] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>

            {/* Action Buttons: Save draft + Assign task */}
            <div className="pt-4 border-t border-[#1F293A] flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-400 hover:text-white hover:bg-[#18202E] border border-[#1F293A] transition-colors cursor-pointer"
              >
                Save Draft
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare size={14} />
                    <span>{editTaskId ? 'Update Task' : 'Assign Task Now'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right 4 Cols: Live Task Preview */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs space-y-4 font-mono">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-[#1F293A]">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#FF9900]" />
                  <span>Card Preview</span>
                </span>
                <span className="text-[10px] text-slate-500">Live Builder View</span>
              </div>

              {/* Rendered Preview Card */}
              <div className="p-4 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {topic === 'Other' ? (customTopic || 'Topic') : topic}
                    </span>
                    <h3 className="text-sm font-bold text-white font-sans">
                      {title.trim() || 'Untitled Challenge'}
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-[#FF9900] shrink-0 bg-[#FF9900]/15 px-2 py-0.5 rounded border border-[#FF9900]/30">
                    +{points} XP
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-sans line-clamp-2">
                  {description.trim() || 'Task description will appear here for assigned builders...'}
                </p>

                <div className="pt-2 border-t border-[#1F293A] flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{dueDate || 'No deadline'}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full capitalize text-[10px] font-semibold ${
                    priority === 'urgent'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : priority === 'important'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {priority}
                  </span>
                </div>

                {checklist.length > 0 && (
                  <div className="pt-2 border-t border-[#1F293A]/50 space-y-1 text-[11px]">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Checklist ({checklist.length} milestones)
                    </span>
                    {checklist.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-slate-400 font-sans">
                        <div className="w-3 h-3 rounded border border-slate-700 shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                    {checklist.length > 3 && (
                      <span className="text-[10px] text-slate-500">+{checklist.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
