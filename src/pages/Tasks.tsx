import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  Plus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ListTodo,
  ExternalLink,
  Shield,
  RefreshCw,
  Building2,
  X,
  FileText,
  Send,
  Check,
  AlertCircle,
  MoreHorizontal,
  Edit2,
  Trash2,
  Award,
  Layers,
  Archive,
  Link2,
  HelpCircle,
} from 'lucide-react'
import { useCommunity } from '@/context/CommunityContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { TaskPriority } from '@/types/database'

export interface CommunityTaskItem {
  id: string
  title: string
  description: string
  points: number
  priority: TaskPriority
  topic: string
  checklist: string[]
  dueDate: string | null
  dueDateFormatted: string
  isOverdue: boolean
  isThisWeek: boolean
  isUpcoming: boolean
  totalAssigned: number
  completedCount: number
  completionPct: number
  isArchived: boolean
  assignedMembers: Array<{
    userId: string
    name: string
    avatarUrl: string | null
    status: string
    assignmentId: string
    submittedAt?: string | null
    submissionComment?: string | null
    submissionUrl?: string | null
    evidenceUrl?: string | null
    reviewFeedback?: string | null
  }>
  // Current user's assignment if present
  myAssignment?: {
    id: string
    status: 'upcoming' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'completed' | 'overdue' | 'pending'
    submittedAt?: string | null
    submissionComment?: string | null
    submissionUrl?: string | null
    evidenceUrl?: string | null
    reviewFeedback?: string | null
    checklistState?: Record<string, boolean>
  }
}

export interface ReviewQueueItem {
  assignmentId: string
  taskId: string
  taskTitle: string
  taskPoints: number
  taskTopic: string
  userId: string
  builderName: string
  builderEmail: string
  builderAvatarUrl: string | null
  submittedAt: string
  submissionComment: string | null
  submissionUrl: string | null
  evidenceUrl: string | null
  checklistCount: number
}

export interface PointsTransactionFeedItem {
  id: string
  points: number
  reason: string
  createdAt: string
  builderName: string
  avatarUrl: string | null
}

export const Tasks: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterParam = searchParams.get('filter') // 'pending' | 'completed' | 'overdue' | 'upcoming'
  const { activeCommunity, userRoleInActiveCommunity } = useCommunity()
  const { user } = useAuth()

  // Navigation tab: 'my_tasks' | 'all_tasks' | 'review_queue'
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'all_tasks' | 'review_queue'>('my_tasks')

  // My Tasks state filter: 'all' | 'upcoming' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'completed' | 'overdue'
  const [myTaskFilter, setMyTaskFilter] = useState<string>('all')

  // Data states
  const [tasks, setTasks] = useState<CommunityTaskItem[]>([])
  const [pointsFeed, setPointsFeed] = useState<PointsTransactionFeedItem[]>([])
  const [communityMembersRoster, setCommunityMembersRoster] = useState<Array<{ userId: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Modals state
  const [submissionModalTask, setSubmissionModalTask] = useState<CommunityTaskItem | null>(null)
  const [submissionComment, setSubmissionComment] = useState('')
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [isSubmittingWork, setIsSubmittingWork] = useState(false)

  // Review Modals
  const [reviewApproveItem, setReviewApproveItem] = useState<ReviewQueueItem | null>(null)
  const [reviewRejectItem, setReviewRejectItem] = useState<ReviewQueueItem | null>(null)
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [isProcessingReview, setIsProcessingReview] = useState(false)

  // Task Management Modals (Manager only)
  const [deadlineModalTask, setDeadlineModalTask] = useState<CommunityTaskItem | null>(null)
  const [newDeadline, setNewDeadline] = useState('')
  const [priorityModalTask, setPriorityModalTask] = useState<CommunityTaskItem | null>(null)
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal')
  const [deleteModalTask, setDeleteModalTask] = useState<CommunityTaskItem | null>(null)
  const [awardPointsOpen, setAwardPointsOpen] = useState(false)
  const [awardTargetUserId, setAwardTargetUserId] = useState('')
  const [awardPointsAmount, setAwardPointsAmount] = useState<number>(50)
  const [awardPointsReason, setAwardPointsReason] = useState('')
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Collapsible section states for All Tasks
  const [openSections, setOpenSections] = useState<{ overdue: boolean; thisWeek: boolean; upcoming: boolean }>({
    overdue: true,
    thisWeek: true,
    upcoming: true,
  })

  const isManager = userRoleInActiveCommunity === 'manager'

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Fetch real task data and points history strictly for activeCommunity.id
  const fetchCommunityTasks = async () => {
    if (!activeCommunity?.id) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // 1. Fetch community tasks
      const { data: rawTasks, error: tasksErr } = await supabase
        .from('community_tasks')
        .select('*')
        .eq('community_id', activeCommunity.id)
        .eq('is_archived', false)
        .order('due_date', { ascending: true })

      if (tasksErr) throw tasksErr

      // 2. Fetch assignments
      const { data: assignments, error: assignErr } = await supabase
        .from('community_task_assignments')
        .select(`
          id,
          task_id,
          user_id,
          status,
          submission_comment,
          submission_url,
          evidence_url,
          submitted_at,
          review_feedback,
          checklist_state,
          completed_at,
          profiles!community_task_assignments_user_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('community_id', activeCommunity.id)

      if (assignErr) throw assignErr

      const now = new Date().getTime()
      const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000

      // Map assignments per task
      const taskAssignmentsMap = new Map<string, any[]>()
      if (assignments) {
        for (const a of assignments) {
          const list = taskAssignmentsMap.get(a.task_id) || []
          list.push(a)
          taskAssignmentsMap.set(a.task_id, list)
        }
      }

      // Format community tasks
      const formatted: CommunityTaskItem[] = (rawTasks || []).map((t: any) => {
        const assignList = taskAssignmentsMap.get(t.id) || []
        const total = assignList.length
        const completed = assignList.filter((a) => a.status === 'completed' || a.status === 'approved').length
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0

        const dueTimestamp = t.due_date ? new Date(t.due_date).getTime() : null
        const isPastDue = dueTimestamp !== null && dueTimestamp < now && pct < 100
        const isThisWk = dueTimestamp !== null && dueTimestamp >= now && dueTimestamp <= oneWeekFromNow
        const isUpcoming = dueTimestamp === null || dueTimestamp > oneWeekFromNow

        // Check if current user is assigned
        const myAssign = assignList.find((a) => a.user_id === user?.id)

        const membersInfo = assignList.map((a: any) => {
          const p = a.profiles || {}
          return {
            userId: a.user_id,
            name: p.full_name || p.email?.split('@')[0] || 'Builder',
            avatarUrl: p.avatar_url || null,
            status: a.status,
            assignmentId: a.id,
            submittedAt: a.submitted_at,
            submissionComment: a.submission_comment,
            submissionUrl: a.submission_url,
            evidenceUrl: a.evidence_url,
            reviewFeedback: a.review_feedback,
          }
        })

        return {
          id: t.id,
          title: t.title,
          description: t.description || '',
          points: t.points || 50,
          priority: (t.priority || 'normal') as TaskPriority,
          topic: t.topic || 'General AWS',
          checklist: Array.isArray(t.checklist) ? t.checklist : [],
          dueDate: t.due_date,
          dueDateFormatted: t.due_date
            ? new Date(t.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : 'No deadline',
          isOverdue: isPastDue,
          isThisWeek: isThisWk,
          isUpcoming: isUpcoming && !isPastDue,
          totalAssigned: total,
          completedCount: completed,
          completionPct: pct,
          isArchived: !!t.is_archived,
          assignedMembers: membersInfo,
          myAssignment: myAssign
            ? {
                id: myAssign.id,
                status: myAssign.status,
                submittedAt: myAssign.submitted_at,
                submissionComment: myAssign.submission_comment,
                submissionUrl: myAssign.submission_url,
                evidenceUrl: myAssign.evidence_url,
                reviewFeedback: myAssign.review_feedback,
                checklistState: myAssign.checklist_state || {},
              }
            : undefined,
        }
      })

      setTasks(formatted)

      // 3. Query points transactions feed
      try {
        const { data: pts } = await supabase
          .from('points_transactions')
          .select(`
            id,
            points,
            reason,
            created_at,
            profiles!points_transactions_user_id_fkey (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('community_id', activeCommunity.id)
          .order('created_at', { ascending: false })
          .limit(8)

        if (pts) {
          const list: PointsTransactionFeedItem[] = pts.map((p: any) => ({
            id: p.id,
            points: p.points,
            reason: p.reason,
            createdAt: p.created_at,
            builderName: p.profiles?.full_name || 'Builder',
            avatarUrl: p.profiles?.avatar_url || null,
          }))
          setPointsFeed(list)
        }
      } catch (err) {
        console.warn('Could not fetch points transactions feed', err)
      }

      // 4. Query roster for award points modal
      try {
        const { data: roster } = await supabase
          .from('community_members')
          .select(`
            user_id,
            profiles!community_members_user_id_fkey (
              full_name
            )
          `)
          .eq('community_id', activeCommunity.id)
          .eq('status', 'active')

        if (roster) {
          setCommunityMembersRoster(
            roster.map((r: any) => ({
              userId: r.user_id,
              name: r.profiles?.full_name || 'Builder',
            }))
          )
          if (roster.length > 0 && !awardTargetUserId) {
            setAwardTargetUserId(roster[0].user_id)
          }
        }
      } catch (err) {
        console.warn('Could not fetch roster', err)
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to query tasks.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCommunityTasks()
  }, [activeCommunity?.id, user?.id])

  // Derive Review Queue (Manager View of Submitted Tasks)
  const reviewQueue = useMemo<ReviewQueueItem[]>(() => {
    const list: ReviewQueueItem[] = []
    for (const t of tasks) {
      for (const m of t.assignedMembers) {
        if (m.status === 'submitted') {
          list.push({
            assignmentId: m.assignmentId,
            taskId: t.id,
            taskTitle: t.title,
            taskPoints: t.points,
            taskTopic: t.topic,
            userId: m.userId,
            builderName: m.name,
            builderEmail: '',
            builderAvatarUrl: m.avatarUrl,
            submittedAt: m.submittedAt || new Date().toISOString(),
            submissionComment: m.submissionComment || null,
            submissionUrl: m.submissionUrl || null,
            evidenceUrl: m.evidenceUrl || null,
            checklistCount: t.checklist.length,
          })
        }
      }
    }
    return list
  }, [tasks])

  // Derive My Tasks list and apply filters
  const myTasks = useMemo(() => {
    return tasks.filter((t) => !!t.myAssignment)
  }, [tasks])

  const filteredMyTasks = useMemo(() => {
    if (myTaskFilter === 'all') return myTasks

    const now = new Date().getTime()
    return myTasks.filter((t) => {
      const s = t.myAssignment?.status || 'pending'
      const isPastDue = t.dueDate ? new Date(t.dueDate).getTime() < now : false

      switch (myTaskFilter) {
        case 'upcoming':
          return s === 'upcoming' || (s === 'pending' && !isPastDue && t.isUpcoming)
        case 'in_progress':
          return s === 'in_progress' || (s === 'pending' && !isPastDue && !t.isUpcoming)
        case 'submitted':
          return s === 'submitted'
        case 'approved':
          return s === 'approved' || s === 'completed'
        case 'rejected':
          return s === 'rejected'
        case 'completed':
          return s === 'completed' || s === 'approved'
        case 'overdue':
          return (s !== 'completed' && s !== 'approved' && s !== 'submitted') && isPastDue
        default:
          return true
      }
    })
  }, [myTasks, myTaskFilter])

  // Checklist Item Toggle Handler for Member
  const handleToggleChecklistItem = async (task: CommunityTaskItem, itemIndex: number) => {
    if (!task.myAssignment) return

    const currentChecklistState = { ...(task.myAssignment.checklistState || {}) }
    const key = `item_${itemIndex}`
    currentChecklistState[key] = !currentChecklistState[key]

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === task.id && t.myAssignment) {
          return {
            ...t,
            myAssignment: {
              ...t.myAssignment,
              checklistState: currentChecklistState,
            },
          }
        }
        return t
      })
    )

    try {
      await supabase
        .from('community_task_assignments')
        .update({
          checklist_state: currentChecklistState as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.myAssignment.id)
    } catch (err) {
      console.error('Failed to update checklist state', err)
    }
  }

  // Member Action: Start Task / Mark In Progress
  const handleStartTask = async (task: CommunityTaskItem) => {
    if (!task.myAssignment) return
    try {
      await supabase
        .from('community_task_assignments')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.myAssignment.id)

      showToast(`Task "${task.title}" is now In Progress!`)
      fetchCommunityTasks()
    } catch (err) {
      console.error(err)
      showToast('Failed to update status', 'error')
    }
  }

  // Member Action: Open Submission Modal
  const handleOpenSubmitModal = (task: CommunityTaskItem) => {
    setSubmissionModalTask(task)
    setSubmissionComment(task.myAssignment?.submissionComment || '')
    setSubmissionUrl(task.myAssignment?.submissionUrl || '')
    setEvidenceUrl(task.myAssignment?.evidenceUrl || '')
  }

  // Member Action: Confirm Submit Work
  const handleConfirmSubmitWork = async () => {
    if (!submissionModalTask || !submissionModalTask.myAssignment || !activeCommunity || !user) return

    if (!submissionComment.trim() && !submissionUrl.trim() && !evidenceUrl.trim()) {
      showToast('Please provide a completion response, solution URL, or evidence.', 'error')
      return
    }

    setIsSubmittingWork(true)
    try {
      const { error: submitErr } = await supabase
        .from('community_task_assignments')
        .update({
          status: 'submitted',
          submission_comment: submissionComment.trim() || null,
          submission_url: submissionUrl.trim() || null,
          evidence_url: evidenceUrl.trim() || null,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionModalTask.myAssignment.id)

      if (submitErr) throw submitErr

      // Log community activity
      await supabase.from('community_activities').insert({
        community_id: activeCommunity.id,
        user_id: user.id,
        activity_type: 'task submitted',
        description: `Submitted solution for task "${submissionModalTask.title}"`,
        metadata: {
          task_id: submissionModalTask.id,
          assignment_id: submissionModalTask.myAssignment.id,
        },
      })

      showToast(`Work submitted for "${submissionModalTask.title}"! Pending manager review.`)
      setSubmissionModalTask(null)
      fetchCommunityTasks()
    } catch (err) {
      console.error('Failed to submit task', err)
      showToast(err instanceof Error ? err.message : 'Submission failed', 'error')
    } finally {
      setIsSubmittingWork(false)
    }
  }

  // Manager Action: Approve Submission
  const handleConfirmApproveSubmission = async () => {
    if (!reviewApproveItem || !activeCommunity || !user) return
    setIsProcessingReview(true)
    try {
      // 1. Try server RPC function
      const { error: rpcErr } = await supabase.rpc('approve_task_submission', {
        p_assignment_id: reviewApproveItem.assignmentId,
        p_review_feedback: reviewFeedback.trim() || null,
      })

      if (rpcErr) {
        console.warn('RPC approve failed, applying client fallback with points transaction:', rpcErr.message)
        // Fallback updates
        await supabase
          .from('community_task_assignments')
          .update({
            status: 'approved',
            completed_at: new Date().toISOString(),
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            review_feedback: reviewFeedback.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reviewApproveItem.assignmentId)

        // Points transaction
        await supabase.from('points_transactions').insert({
          community_id: activeCommunity.id,
          user_id: reviewApproveItem.userId,
          points: reviewApproveItem.taskPoints,
          reason: `+${reviewApproveItem.taskPoints} Task completed: ${reviewApproveItem.taskTitle}`,
          entity_type: 'task',
          entity_id: reviewApproveItem.taskId,
          created_by: user.id,
        })

        // Community activity
        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: reviewApproveItem.userId,
          activity_type: 'completed task',
          description: `Completed task "${reviewApproveItem.taskTitle}" (+${reviewApproveItem.taskPoints} XP)`,
          metadata: {
            task_id: reviewApproveItem.taskId,
            points: reviewApproveItem.taskPoints,
            approved_by: user.id,
          },
        })

        // Notification
        await supabase.from('notifications').insert({
          recipient_id: reviewApproveItem.userId,
          community_id: activeCommunity.id,
          type: 'task',
          title: `Task Approved! (+${reviewApproveItem.taskPoints} XP)`,
          message: `Your submission for "${reviewApproveItem.taskTitle}" has been approved!`,
          entity_type: 'task',
          entity_id: reviewApproveItem.taskId,
        })
      }

      showToast(`Approved submission! Awarded +${reviewApproveItem.taskPoints} XP to ${reviewApproveItem.builderName}.`)
      setReviewApproveItem(null)
      setReviewFeedback('')
      fetchCommunityTasks()
    } catch (err) {
      console.error('Approve failed', err)
      showToast(err instanceof Error ? err.message : 'Approval failed', 'error')
    } finally {
      setIsProcessingReview(false)
    }
  }

  // Manager Action: Reject Submission
  const handleConfirmRejectSubmission = async () => {
    if (!reviewRejectItem || !activeCommunity || !user) return
    if (!reviewFeedback.trim()) {
      showToast('Please provide revision feedback explaining what needs improvement.', 'error')
      return
    }

    setIsProcessingReview(true)
    try {
      const { error: rpcErr } = await supabase.rpc('reject_task_submission', {
        p_assignment_id: reviewRejectItem.assignmentId,
        p_review_feedback: reviewFeedback.trim(),
      })

      if (rpcErr) {
        console.warn('RPC reject failed, applying client fallback:', rpcErr.message)
        await supabase
          .from('community_task_assignments')
          .update({
            status: 'rejected',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            review_feedback: reviewFeedback.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', reviewRejectItem.assignmentId)

        await supabase.from('notifications').insert({
          recipient_id: reviewRejectItem.userId,
          community_id: activeCommunity.id,
          type: 'task',
          title: 'Task Needs Revision',
          message: `Your submission for "${reviewRejectItem.taskTitle}" was rejected: ${reviewFeedback.trim()}`,
          entity_type: 'task',
          entity_id: reviewRejectItem.taskId,
        })
      }

      showToast(`Submission rejected. Feedback sent to ${reviewRejectItem.builderName}.`)
      setReviewRejectItem(null)
      setReviewFeedback('')
      fetchCommunityTasks()
    } catch (err) {
      console.error('Reject failed', err)
      showToast(err instanceof Error ? err.message : 'Rejection failed', 'error')
    } finally {
      setIsProcessingReview(false)
    }
  }

  // Manager Action: Change Deadline
  const handleConfirmChangeDeadline = async () => {
    if (!deadlineModalTask || !newDeadline) return
    setIsActionLoading(true)
    try {
      const { error } = await supabase
        .from('community_tasks')
        .update({
          due_date: new Date(newDeadline).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', deadlineModalTask.id)

      if (error) throw error

      showToast(`Deadline updated for "${deadlineModalTask.title}".`)
      setDeadlineModalTask(null)
      fetchCommunityTasks()
    } catch (err) {
      console.error(err)
      showToast('Failed to update deadline', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Manager Action: Change Priority
  const handleConfirmChangePriority = async () => {
    if (!priorityModalTask) return
    setIsActionLoading(true)
    try {
      const { error } = await supabase
        .from('community_tasks')
        .update({
          priority: newPriority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', priorityModalTask.id)

      if (error) throw error

      showToast(`Priority changed to ${newPriority} for "${priorityModalTask.title}".`)
      setPriorityModalTask(null)
      fetchCommunityTasks()
    } catch (err) {
      console.error(err)
      showToast('Failed to update priority', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Manager Action: Delete or Archive Task
  const handleConfirmDeleteTask = async (archiveOnly: boolean) => {
    if (!deleteModalTask || !activeCommunity) return
    setIsActionLoading(true)
    try {
      if (archiveOnly) {
        const { error } = await supabase
          .from('community_tasks')
          .update({
            is_archived: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deleteModalTask.id)

        if (error) throw error
        showToast(`Task "${deleteModalTask.title}" archived.`)
      } else {
        const { error } = await supabase
          .from('community_tasks')
          .delete()
          .eq('id', deleteModalTask.id)

        if (error) throw error
        showToast(`Task "${deleteModalTask.title}" deleted.`)
      }

      setDeleteModalTask(null)
      fetchCommunityTasks()
    } catch (err) {
      console.error(err)
      showToast('Failed to remove task', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Manager Action: Award Custom Points
  const handleConfirmAwardPoints = async () => {
    if (!activeCommunity || !user || !awardTargetUserId || !awardPointsReason.trim()) {
      showToast('Please select a builder and specify a reason.', 'error')
      return
    }

    setIsActionLoading(true)
    try {
      const { error: rpcErr } = await supabase.rpc('award_manual_points', {
        p_community_id: activeCommunity.id,
        p_target_user_id: awardTargetUserId,
        p_points: awardPointsAmount,
        p_reason: awardPointsReason.trim(),
      })

      if (rpcErr) {
        console.warn('RPC award failed, applying fallback:', rpcErr.message)
        await supabase.from('points_transactions').insert({
          community_id: activeCommunity.id,
          user_id: awardTargetUserId,
          points: awardPointsAmount,
          reason: `+${awardPointsAmount} ${awardPointsReason.trim()}`,
          entity_type: 'manual',
          created_by: user.id,
        })

        await supabase.from('community_activities').insert({
          community_id: activeCommunity.id,
          user_id: awardTargetUserId,
          activity_type: 'earned points',
          description: `Earned ${awardPointsAmount} XP: ${awardPointsReason.trim()}`,
          metadata: { awarded_by: user.id, points: awardPointsAmount },
        })

        await supabase.from('notifications').insert({
          recipient_id: awardTargetUserId,
          community_id: activeCommunity.id,
          type: 'achievement',
          title: `Points Awarded! (+${awardPointsAmount} XP)`,
          message: `You received +${awardPointsAmount} XP from your Manager: ${awardPointsReason.trim()}`,
        })
      }

      showToast(`Successfully awarded +${awardPointsAmount} XP!`)
      setAwardPointsOpen(false)
      setAwardPointsReason('')
      fetchCommunityTasks()
    } catch (err) {
      console.error(err)
      showToast(err instanceof Error ? err.message : 'Points award failed', 'error')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Top metric computations
  const totalTasks = tasks.length
  const myCompletedCount = myTasks.filter((t) => t.myAssignment?.status === 'completed' || t.myAssignment?.status === 'approved').length
  const globalCompletionPct = totalTasks > 0 ? Math.round((tasks.filter((t) => t.completionPct === 100).length / totalTasks) * 100) : 0

  // Filter tasks based on URL filterParam if present
  const overdueTasks = useMemo(() => {
    if (filterParam === 'completed' || filterParam === 'upcoming' || filterParam === 'pending') return []
    return tasks.filter((t) => t.isOverdue)
  }, [tasks, filterParam])

  const thisWeekTasks = useMemo(() => {
    if (filterParam === 'completed') return tasks.filter((t) => t.completionPct === 100)
    if (filterParam === 'pending') return tasks.filter((t) => t.completionPct < 100 && !t.isOverdue)
    if (filterParam === 'overdue' || filterParam === 'upcoming') return []
    return tasks.filter((t) => t.isThisWeek)
  }, [tasks, filterParam])

  const thisWeekCompleted = thisWeekTasks.filter((t) => t.completionPct === 100).length
  const thisWeekCompletionPct = thisWeekTasks.length > 0 ? Math.round((thisWeekCompleted / thisWeekTasks.length) * 100) : 0

  const upcomingTasks = useMemo(() => {
    if (filterParam === 'completed' || filterParam === 'overdue' || filterParam === 'pending') return []
    return tasks.filter((t) => t.isUpcoming)
  }, [tasks, filterParam])

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border font-mono text-xs shadow-2xl flex items-center gap-2 animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-[#18202E] border-emerald-500/50 text-emerald-300'
              : 'bg-[#18202E] border-rose-500/50 text-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400" />
          ) : (
            <AlertCircle size={16} className="text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F293A] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
              Task Management
            </h1>
            {activeCommunity && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-orange-500/10 text-[#FF9900] border border-orange-500/30">
                <Building2 size={12} />
                {activeCommunity.name}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1 font-sans">
            Build, learn, complete AWS milestones, and review builder submissions.
          </p>
        </div>

        {/* Top Actions: Assign Task + Award Points */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isManager && (
            <>
              <button
                type="button"
                onClick={() => setAwardPointsOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold text-amber-300 bg-[#18202E] hover:bg-[#222E42] border border-amber-500/30 transition-all shadow-2xs cursor-pointer"
              >
                <Award size={14} className="text-[#FF9900]" />
                <span>Award Points</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/tasks/assign')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Assign Task</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs: My Tasks, All Tasks, Review Queue */}
      <div className="flex items-center justify-between border-b border-[#1F293A] pb-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('my_tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'my_tasks'
                ? 'bg-[#FF9900] text-slate-950 shadow-xs'
                : 'bg-[#18202E] text-slate-300 hover:text-white border border-[#1F293A]'
            }`}
          >
            <CheckSquare size={14} />
            <span>My Tasks ({myTasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'all_tasks'
                ? 'bg-[#FF9900] text-slate-950 shadow-xs'
                : 'bg-[#18202E] text-slate-300 hover:text-white border border-[#1F293A]'
            }`}
          >
            <Layers size={14} />
            <span>All Chapter Tasks ({tasks.length})</span>
          </button>

          {isManager && (
            <button
              type="button"
              onClick={() => setActiveTab('review_queue')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 relative ${
                activeTab === 'review_queue'
                  ? 'bg-[#FF9900] text-slate-950 shadow-xs'
                  : 'bg-[#18202E] text-slate-300 hover:text-white border border-[#1F293A]'
              }`}
            >
              <Send size={14} />
              <span>Review Queue</span>
              {reviewQueue.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'review_queue'
                    ? 'bg-slate-950 text-[#FF9900]'
                    : 'bg-amber-500 text-slate-950 animate-pulse'
                }`}>
                  {reviewQueue.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Top Metrics Row: My Done, Global Completion, Overdue, Total */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-mono">
        <div className="p-4 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>My Done</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {myCompletedCount} <span className="text-xs text-slate-400 font-normal">/ {myTasks.length}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Personal progress</div>
        </div>

        <div className="p-4 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>This Week</span>
            <Calendar size={14} className="text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {thisWeekCompletionPct}%
          </div>
          <div className="w-full bg-[#1E293B] rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#FF9900] to-[#EA580C] h-full rounded-full"
              style={{ width: `${thisWeekCompletionPct}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Overdue</span>
            <AlertTriangle size={14} className="text-red-400" />
          </div>
          <div className="text-xl font-bold text-red-400 mt-1">
            {overdueTasks.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Need attention</div>
        </div>

        <div className="p-4 rounded-2xl border border-[#1F293A] bg-[#121824] shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Tasks</span>
            <CheckSquare size={14} className="text-[#FF9900]" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {totalTasks}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Chapter backlog</div>
        </div>
      </div>

      {/* Main 2-Column Split: Tasks Content (Left 68%) vs Points & Roster Sidebar (Right 32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Tab Content */}
        <div className="lg:col-span-8 space-y-5">
          {isLoading ? (
            <div className="py-20">
              <LoadingState message="Loading community tasks and assignments..." />
            </div>
          ) : errorMessage ? (
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center font-mono">
              <p className="text-xs text-red-400 font-semibold">{errorMessage}</p>
              <button
                type="button"
                onClick={fetchCommunityTasks}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          ) : activeTab === 'my_tasks' ? (
            /* ============================================================ */
            /* TAB 1: MY TASKS (BUILDER VIEW)                               */
            /* ============================================================ */
            <div className="space-y-4">
              {/* Filter Pills for My Tasks */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs">
                {[
                  { key: 'all', label: 'All My Tasks' },
                  { key: 'upcoming', label: 'Upcoming' },
                  { key: 'in_progress', label: 'In Progress' },
                  { key: 'submitted', label: 'Submitted' },
                  { key: 'approved', label: 'Approved' },
                  { key: 'rejected', label: 'Rejected' },
                  { key: 'completed', label: 'Completed' },
                  { key: 'overdue', label: 'Overdue' },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setMyTaskFilter(f.key)}
                    className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                      myTaskFilter === f.key
                        ? 'bg-[#FF9900]/15 border-[#FF9900] text-[#FF9900] font-bold'
                        : 'bg-[#18202E] border-[#1F293A] text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredMyTasks.length === 0 ? (
                <EmptyState
                  title="No tasks match filter"
                  description={
                    myTasks.length === 0
                      ? 'You have not been assigned any tasks in this community yet.'
                      : 'No tasks found under the selected status filter.'
                  }
                  icon={<CheckSquare size={24} className="text-slate-400" />}
                  badge="My Tasks"
                />
              ) : (
                <div className="space-y-4">
                  {filteredMyTasks.map((t) => {
                    const assign = t.myAssignment!
                    const checklistState = assign.checklistState || {}
                    const isCompleted = assign.status === 'completed' || assign.status === 'approved'
                    const isSubmitted = assign.status === 'submitted'
                    const isRejected = assign.status === 'rejected'

                    return (
                      <div
                        key={t.id}
                        className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs space-y-4 font-sans"
                      >
                        {/* Top row: Topic, Priority, Status, XP */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F293A] pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              {t.topic}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded capitalize font-semibold ${
                              t.priority === 'urgent'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                : t.priority === 'important'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {t.priority}
                            </span>
                            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                              <Calendar size={12} />
                              <span>{t.dueDateFormatted}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            {/* Status badge */}
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold capitalize ${
                              isCompleted
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : isSubmitted
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30 animate-pulse'
                                : isRejected
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                : assign.status === 'in_progress'
                                ? 'bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {isCompleted
                                ? '✓ Approved'
                                : isSubmitted
                                ? '⏳ Under Review'
                                : isRejected
                                ? '⚠️ Revisions Needed'
                                : assign.status === 'in_progress'
                                ? '⚡ In Progress'
                                : 'Upcoming'}
                            </span>
                            <span className="text-xs font-mono font-bold text-[#FF9900] bg-[#FF9900]/15 px-2 py-0.5 rounded border border-[#FF9900]/30">
                              +{t.points} XP
                            </span>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-base font-bold text-white">{t.title}</h3>
                          {t.description && (
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              {t.description}
                            </p>
                          )}
                        </div>

                        {/* If Rejected: Show Feedback */}
                        {isRejected && assign.reviewFeedback && (
                          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-xs font-mono text-rose-200 space-y-1">
                            <span className="font-bold flex items-center gap-1 text-rose-400">
                              <AlertCircle size={14} />
                              <span>Manager Feedback:</span>
                            </span>
                            <p className="text-rose-100 font-sans">{assign.reviewFeedback}</p>
                          </div>
                        )}

                        {/* Interactive Checklist Items */}
                        {t.checklist.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-[#1F293A]">
                            <span className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider block">
                              Milestone Checklist ({t.checklist.filter((_, idx) => !!checklistState[`item_${idx}`]).length}/{t.checklist.length})
                            </span>
                            <div className="space-y-1.5 font-mono text-xs">
                              {t.checklist.map((item, idx) => {
                                const isItemChecked = !!checklistState[`item_${idx}`]
                                return (
                                  <label
                                    key={idx}
                                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors cursor-pointer ${
                                      isItemChecked
                                        ? 'bg-[#18202E]/60 border-emerald-500/30 text-slate-300 line-through'
                                        : 'bg-[#0E141F] border-[#1F293A] text-slate-200 hover:bg-[#18202E]'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isItemChecked}
                                      onChange={() => handleToggleChecklistItem(t, idx)}
                                      className="accent-[#FF9900] w-4 h-4 rounded cursor-pointer"
                                    />
                                    <span className="text-xs font-sans">{item}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Action Bar */}
                        <div className="pt-3 border-t border-[#1F293A] flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-[11px] font-mono text-slate-400">
                            {assign.submittedAt && (
                              <span>Submitted: {new Date(assign.submittedAt).toLocaleDateString()}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* If pending/upcoming, show "Start Task" */}
                            {assign.status !== 'in_progress' && !isSubmitted && !isCompleted && !isRejected && (
                              <button
                                type="button"
                                onClick={() => handleStartTask(t)}
                                className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-slate-300 bg-[#18202E] hover:bg-[#222E42] border border-[#1F293A] transition-colors cursor-pointer"
                              >
                                Mark In Progress
                              </button>
                            )}

                            {/* Submit / Resubmit button */}
                            {!isCompleted && (
                              <button
                                type="button"
                                onClick={() => handleOpenSubmitModal(t)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer"
                              >
                                <Send size={13} />
                                <span>{isRejected ? 'Resubmit Solution' : isSubmitted ? 'Update Submission' : 'Submit Work'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'review_queue' ? (
            /* ============================================================ */
            /* TAB 2: REVIEW QUEUE (MANAGER ONLY)                           */
            /* ============================================================ */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1F293A]">
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Send size={15} className="text-[#FF9900]" />
                  <span>Submissions Pending Review ({reviewQueue.length})</span>
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  Approve to award points and notify builder
                </span>
              </div>

              {reviewQueue.length === 0 ? (
                <EmptyState
                  title="No submissions pending"
                  description="All submitted tasks have been reviewed. Outstanding work is caught up!"
                  icon={<CheckCircle2 size={24} className="text-emerald-400" />}
                  badge="Review Queue"
                />
              ) : (
                <div className="space-y-4">
                  {reviewQueue.map((item) => (
                    <div
                      key={item.assignmentId}
                      className="rounded-2xl border border-amber-500/30 bg-[#121824] p-5 shadow-xs space-y-4 font-sans"
                    >
                      {/* Top: Member Info + Task info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F293A] pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            initials={item.builderName.slice(0, 2).toUpperCase()}
                            src={item.builderAvatarUrl || undefined}
                            size="md"
                          />
                          <div>
                            <div className="font-bold text-white text-sm">{item.builderName}</div>
                            <span className="text-[10px] font-mono text-slate-400">
                              Submitted {new Date(item.submittedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-xs font-bold text-white bg-[#18202E] px-2.5 py-1 rounded-lg border border-[#1F293A]">
                            {item.taskTopic}
                          </span>
                          <span className="text-xs font-bold text-[#FF9900] bg-[#FF9900]/15 px-2.5 py-1 rounded-lg border border-[#FF9900]/30">
                            +{item.taskPoints} XP
                          </span>
                        </div>
                      </div>

                      {/* Task Title */}
                      <div>
                        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                          Challenge:
                        </span>
                        <h4 className="text-base font-bold text-white">{item.taskTitle}</h4>
                      </div>

                      {/* Member's Submission Content */}
                      <div className="p-3.5 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-2 font-mono text-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Builder Response / Reflection:
                        </span>
                        <p className="text-slate-200 font-sans leading-relaxed">
                          {item.submissionComment || 'No commentary provided.'}
                        </p>

                        {(item.submissionUrl || item.evidenceUrl) && (
                          <div className="pt-2 border-t border-[#1F293A] flex items-center gap-3 flex-wrap">
                            {item.submissionUrl && (
                              <a
                                href={item.submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18202E] hover:bg-[#222E42] text-[#FF9900] border border-[#1F293A] transition-colors"
                              >
                                <ExternalLink size={12} />
                                <span>Solution URL</span>
                              </a>
                            )}
                            {item.evidenceUrl && (
                              <a
                                href={item.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18202E] hover:bg-[#222E42] text-blue-400 border border-[#1F293A] transition-colors"
                              >
                                <FileText size={12} />
                                <span>Verification Evidence</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Review Buttons */}
                      <div className="pt-2 flex items-center justify-end gap-3 font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewRejectItem(item)
                            setReviewFeedback('')
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-950/40 border border-rose-500/40 transition-colors cursor-pointer"
                        >
                          Request Revisions / Reject
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReviewApproveItem(item)
                            setReviewFeedback('')
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Approve (+{item.taskPoints} XP)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ============================================================ */
            /* TAB 3: ALL CHAPTER TASKS (MANAGER & ROADMAP VIEW)            */
            /* ============================================================ */
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <EmptyState
                  title="No tasks in community"
                  description="No tasks have been created in this chapter yet."
                  icon={<CheckSquare size={24} className="text-slate-400" />}
                  badge="Tasks"
                  action={
                    isManager
                      ? {
                          label: 'Assign First Task',
                          onClick: () => navigate('/tasks/assign'),
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="space-y-4">
                  {/* GROUP 1: OVERDUE */}
                  {overdueTasks.length > 0 && (
                    <div className="rounded-2xl border border-red-500/30 bg-[#121824] overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => setOpenSections((p) => ({ ...p, overdue: !p.overdue }))}
                        className="w-full flex items-center justify-between p-4 bg-red-500/10 border-b border-red-500/20 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-red-400" />
                          <span className="font-mono text-xs font-bold text-red-400 tracking-wider">
                            OVERDUE ({overdueTasks.length})
                          </span>
                        </div>
                        {openSections.overdue ? <ChevronDown size={16} className="text-red-400" /> : <ChevronRight size={16} className="text-red-400" />}
                      </button>
                      {openSections.overdue && (
                        <div className="divide-y divide-[#1F293A]/60 font-sans">
                          {overdueTasks.map((t) => renderCommunityTaskRow(t))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* GROUP 2: THIS WEEK */}
                  <div className="rounded-2xl border border-[#1F293A] bg-[#121824] overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => setOpenSections((p) => ({ ...p, thisWeek: !p.thisWeek }))}
                      className="w-full flex items-center justify-between p-4 bg-[#0E141F] border-b border-[#1F293A] text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-[#FF9900]" />
                        <span className="font-mono text-xs font-bold text-white tracking-wider uppercase">
                          THIS WEEK ({thisWeekTasks.length})
                        </span>
                      </div>
                      {openSections.thisWeek ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </button>
                    {openSections.thisWeek && (
                      <div className="divide-y divide-[#1F293A]/60 font-sans">
                        {thisWeekTasks.length === 0 ? (
                          <div className="p-6 text-center text-xs font-mono text-slate-500">
                            No tasks due this week.
                          </div>
                        ) : (
                          thisWeekTasks.map((t) => renderCommunityTaskRow(t))
                        )}
                      </div>
                    )}
                  </div>

                  {/* GROUP 3: UPCOMING */}
                  <div className="rounded-2xl border border-[#1F293A] bg-[#121824] overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => setOpenSections((p) => ({ ...p, upcoming: !p.upcoming }))}
                      className="w-full flex items-center justify-between p-4 bg-[#0E141F] border-b border-[#1F293A] text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" />
                        <span className="font-mono text-xs font-bold text-white tracking-wider uppercase">
                          UPCOMING ({upcomingTasks.length})
                        </span>
                      </div>
                      {openSections.upcoming ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </button>
                    {openSections.upcoming && (
                      <div className="divide-y divide-[#1F293A]/60 font-sans">
                        {upcomingTasks.length === 0 ? (
                          <div className="p-6 text-center text-xs font-mono text-slate-500">
                            No upcoming roadmap tasks.
                          </div>
                        ) : (
                          upcomingTasks.map((t) => renderCommunityTaskRow(t))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 4 Cols: Points Transaction History & Quick Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions Panel */}
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs space-y-3 font-mono">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-[#FF9900]" />
              <span>Chapter Operations</span>
            </h3>

            <div className="space-y-2 text-xs">
              {isManager && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/tasks/assign')}
                    className="w-full text-left p-2.5 rounded-xl bg-[#FF9900]/15 hover:bg-[#FF9900]/25 text-[#FF9900] border border-[#FF9900]/30 font-semibold transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Assign New Task</span>
                    <Plus size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setAwardPointsOpen(true)}
                    className="w-full text-left p-2.5 rounded-xl bg-[#18202E] hover:bg-[#222E42] text-amber-300 border border-amber-500/30 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Award Custom Points</span>
                    <Award size={14} className="text-[#FF9900]" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => navigate('/members')}
                className="w-full text-left p-2.5 rounded-xl bg-[#18202E] hover:bg-[#222E42] text-slate-200 border border-[#1F293A] transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>View Community Roster</span>
                <Users size={14} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Points Transaction History Feed */}
          <div className="rounded-2xl border border-[#1F293A] bg-[#121824] p-5 shadow-xs space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs text-slate-200">
              <h3 className="font-bold uppercase tracking-wider flex items-center gap-2">
                <Award size={14} className="text-[#FF9900]" />
                <span>Points Transactions</span>
              </h3>
              <span className="text-[10px] text-slate-500">Live History</span>
            </div>

            {pointsFeed.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                No points awarded in this chapter yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {pointsFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-[#1F293A] bg-[#0E141F] flex items-start gap-2.5"
                  >
                    <Avatar
                      initials={item.builderName.slice(0, 2).toUpperCase()}
                      src={item.avatarUrl || undefined}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-sans text-xs font-semibold text-white truncate">
                          {item.builderName}
                        </span>
                        <span className="text-[11px] font-bold text-[#FF9900] shrink-0">
                          +{item.points} XP
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                        {item.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: MEMBER SUBMIT WORK                                  */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!submissionModalTask}
        onClose={() => setSubmissionModalTask(null)}
        title="Submit Task Solution"
        subtitle={submissionModalTask?.title || 'Deliverable Submission'}
        size="md"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#0E141F] border border-[#1F293A] flex items-center justify-between">
            <span className="text-slate-400">Award on Approval:</span>
            <span className="text-sm font-bold text-[#FF9900]">+{submissionModalTask?.points} XP</span>
          </div>

          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Completion Response / Summary *
            </label>
            <textarea
              rows={3}
              value={submissionComment}
              onChange={(e) => setSubmissionComment(e.target.value)}
              placeholder="Describe your implementation, architectural trade-offs, and key learnings..."
              className="w-full px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white font-sans text-xs focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Solution Repository or Live Demo URL (Optional)
            </label>
            <input
              type="url"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              placeholder="https://github.com/your-username/aws-project"
              className="w-full px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white font-mono text-xs focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Evidence / Architecture Diagram URL (Optional)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://drive.google.com/... or AWS Console screenshot link"
              className="w-full px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white font-mono text-xs focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setSubmissionModalTask(null)}
              disabled={isSubmittingWork}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmitWork}
              disabled={isSubmittingWork}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
              <span>{isSubmittingWork ? 'Submitting...' : 'Submit Deliverable'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: MANAGER APPROVE SUBMISSION                          */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!reviewApproveItem}
        onClose={() => setReviewApproveItem(null)}
        title="Approve Task Submission?"
        subtitle="Verification & Points Transaction"
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
            Confirm approval for <strong className="text-white">{reviewApproveItem?.builderName}</strong> on task &ldquo;{reviewApproveItem?.taskTitle}&rdquo;.
          </div>

          <div className="p-3 rounded-xl bg-[#0E141F] border border-[#1F293A] space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Points to be Awarded:</span>
            <div className="text-base font-bold text-[#FF9900]">+{reviewApproveItem?.taskPoints} XP</div>
            <span className="text-[10px] text-slate-500 font-sans block">
              Recorded atomically in points_transactions ledger.
            </span>
          </div>

          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Commendation / Feedback (Optional)
            </label>
            <textarea
              rows={2}
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              placeholder="e.g. Excellent AWS architecture and clean documentation!"
              className="w-full px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white font-sans text-xs focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setReviewApproveItem(null)}
              disabled={isProcessingReview}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmApproveSubmission}
              disabled={isProcessingReview}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-600 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isProcessingReview ? 'Approving...' : 'Confirm & Award Points'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 3: MANAGER REJECT SUBMISSION                           */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!reviewRejectItem}
        onClose={() => setReviewRejectItem(null)}
        title="Request Revisions / Reject Submission"
        subtitle="Review Feedback Required"
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            Please provide specific guidance for <strong className="text-white">{reviewRejectItem?.builderName}</strong>.
          </div>

          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Revision Reason / Feedback *
            </label>
            <textarea
              rows={3}
              required
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              placeholder="e.g. Solution URL returned 404. Please verify public access and attach AWS CloudWatch logs..."
              className="w-full px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white font-sans text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setReviewRejectItem(null)}
              disabled={isProcessingReview}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRejectSubmission}
              disabled={isProcessingReview}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isProcessingReview ? 'Submitting...' : 'Send Revision Feedback'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 4: MANAGER CHANGE DEADLINE                             */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!deadlineModalTask}
        onClose={() => setDeadlineModalTask(null)}
        title="Change Task Deadline"
        subtitle={deadlineModalTask?.title || 'Schedule Adjustment'}
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1.5 font-bold">
              New Deadline Date
            </label>
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDeadlineModalTask(null)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmChangeDeadline}
              disabled={isActionLoading || !newDeadline}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? 'Saving...' : 'Update Deadline'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 5: MANAGER CHANGE PRIORITY                             */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!priorityModalTask}
        onClose={() => setPriorityModalTask(null)}
        title="Change Task Priority"
        subtitle={priorityModalTask?.title || 'Urgency Modification'}
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'important', 'urgent'] as const).map((p) => {
              const isSelected = newPriority === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewPriority(p)}
                  className={`py-2 rounded-xl border text-center capitalize transition-all cursor-pointer ${
                    isSelected
                      ? p === 'urgent'
                        ? 'border-red-500 bg-red-950/50 text-red-400 font-bold'
                        : p === 'important'
                        ? 'border-amber-500 bg-amber-950/50 text-amber-400 font-bold'
                        : 'border-[#FF9900] bg-[#FF9900]/10 text-[#FF9900] font-bold'
                      : 'border-[#1F293A] bg-[#18202E] text-slate-400 hover:bg-[#1E293B]'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setPriorityModalTask(null)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmChangePriority}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? 'Saving...' : 'Update Priority'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 6: MANAGER DELETE OR ARCHIVE TASK                      */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!deleteModalTask}
        onClose={() => setDeleteModalTask(null)}
        title="Delete or Archive Task?"
        subtitle={deleteModalTask?.title || 'Destructive Action'}
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            Are you sure you want to remove <strong className="text-white">{deleteModalTask?.title}</strong>?
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            Archiving preserves historical completion records, while Delete removes all assignments permanently.
          </p>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => handleConfirmDeleteTask(true)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-950/40 border border-amber-500/40 transition-colors cursor-pointer"
            >
              Archive Task
            </button>
            <button
              type="button"
              onClick={() => handleConfirmDeleteTask(false)}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 7: MANAGER AWARD CUSTOM POINTS                         */}
      {/* ============================================================ */}
      <Modal
        isOpen={awardPointsOpen}
        onClose={() => setAwardPointsOpen(false)}
        title="Award Custom XP Points"
        subtitle="Points Transaction Ledger"
        size="sm"
      >
        <div className="p-5 space-y-4 font-mono text-xs">
          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Recipient Builder *
            </label>
            <select
              value={awardTargetUserId}
              onChange={(e) => setAwardTargetUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white focus:outline-none focus:border-[#FF9900]"
            >
              {communityMembersRoster.map((m) => (
                <option key={m.userId} value={m.userId} className="bg-[#121824] text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Points to Award (XP) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={500}
                step={5}
                value={awardPointsAmount}
                onChange={(e) => setAwardPointsAmount(Math.max(5, parseInt(e.target.value) || 0))}
                className="w-24 px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-[#FF9900] font-bold focus:outline-none focus:border-[#FF9900]"
              />
              <div className="flex items-center gap-1">
                {[25, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAwardPointsAmount(preset)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${
                      awardPointsAmount === preset
                        ? 'bg-[#FF9900]/20 border-[#FF9900] text-[#FF9900]'
                        : 'bg-[#18202E] border-[#1F293A] text-slate-400'
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 uppercase tracking-wider mb-1 font-bold">
              Reason / Citation *
            </label>
            <input
              type="text"
              required
              value={awardPointsReason}
              onChange={(e) => setAwardPointsReason(e.target.value)}
              placeholder="e.g. Exceptional assistance in AWS CDK workshop"
              className="w-full px-3 py-2 rounded-xl bg-[#0E141F] border border-[#1F293A] text-white font-sans text-xs focus:outline-none focus:border-[#FF9900]"
            />
          </div>

          <div className="pt-3 border-t border-[#1F293A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setAwardPointsOpen(false)}
              disabled={isActionLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAwardPoints}
              disabled={isActionLoading || !awardPointsReason.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? 'Awarding...' : 'Award Points Now'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )

  // Helper row renderer for All Chapter Tasks view
  function renderCommunityTaskRow(t: CommunityTaskItem) {
    return (
      <div
        key={t.id}
        className="p-4 hover:bg-[#18202E]/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="pt-0.5">
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                t.completionPct === 100
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-[#18202E] border-[#1F293A] text-slate-400'
              }`}
              title={`${t.completedCount}/${t.totalAssigned} completed`}
            >
              {t.completionPct === 100 && <CheckCircle2 size={13} />}
            </div>
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white">{t.title}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                {t.topic}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FF9900]/15 text-[#FF9900] font-bold border border-[#FF9900]/30">
                +{t.points} XP
              </span>
            </div>
            {t.description && (
              <p className="text-[11px] text-slate-400 line-clamp-1 font-sans">
                {t.description}
              </p>
            )}
          </div>
        </div>

        {/* Right controls: Due date, progress, and manager menu */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-mono text-[11px] self-end sm:self-auto">
          {/* Due date */}
          <div className={`flex items-center gap-1 ${t.isOverdue ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
            <Calendar size={12} />
            <span>{t.dueDateFormatted}</span>
          </div>

          {/* Progress bar */}
          <div className="w-16 hidden md:block">
            <div className="text-[10px] text-slate-400 text-right">{t.completionPct}%</div>
            <div className="w-full bg-[#1E293B] rounded-full h-1 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full"
                style={{ width: `${t.completionPct}%` }}
              />
            </div>
          </div>

          {/* Manager Action Controls */}
          {isManager && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate(`/tasks/assign?editTaskId=${t.id}`)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#0E141F] hover:bg-[#18202E] border border-[#1F293A] transition-colors"
                title="Edit Task"
              >
                <Edit2 size={13} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeadlineModalTask(t)
                  setNewDeadline(t.dueDate ? t.dueDate.slice(0, 10) : '')
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#0E141F] hover:bg-[#18202E] border border-[#1F293A] transition-colors"
                title="Change Deadline"
              >
                <Calendar size={13} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setPriorityModalTask(t)
                  setNewPriority(t.priority)
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#0E141F] hover:bg-[#18202E] border border-[#1F293A] transition-colors"
                title="Change Priority"
              >
                <AlertTriangle size={13} />
              </button>

              <button
                type="button"
                onClick={() => setDeleteModalTask(t)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-[#0E141F] hover:bg-rose-950/30 border border-[#1F293A] transition-colors"
                title="Delete or Archive Task"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }
}
