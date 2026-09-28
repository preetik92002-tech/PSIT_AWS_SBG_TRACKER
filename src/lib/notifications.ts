import { supabase } from '@/lib/supabase/client'
import type { AppNotification, NotificationType } from '@/types/database'

export interface CreateNotificationParams {
  recipientId: string
  communityId?: string | null
  type: NotificationType
  title: string
  message: string
  entityType?: 'task' | 'event' | 'project' | 'contribution' | 'community' | 'live_session'
  entityId?: string
}

/**
 * Fetch unread notification count for the current authenticated user.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    if (error) throw error
    return count ?? 0
  } catch (err) {
    console.error('Error fetching unread notification count:', err)
    return 0
  }
}

/**
 * Fetch notifications for current user with optional limit.
 */
export async function listUserNotifications(limit = 25): Promise<AppNotification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data as AppNotification[]) || []
  } catch (err) {
    console.error('Error listing notifications:', err)
    return []
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('recipient_id', user.id)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error marking notification as read:', err)
    return false
  }
}

/**
 * Mark all notifications as read for current user.
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error marking all notifications as read:', err)
    return false
  }
}

/**
 * Create a new notification for a member.
 */
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: params.recipientId,
        community_id: params.communityId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        entity_type: params.entityType || null,
        entity_id: params.entityId || null,
        is_read: false,
      })

    if (error) {
      console.warn('Could not insert notification into notifications table:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Error creating notification:', err)
    return false
  }
}

/**
 * Helper: Notify member of a task assignment
 */
export async function notifyTaskAssigned(params: {
  recipientId: string
  communityId: string
  taskTitle: string
  taskId: string
  points?: number
}) {
  return createNotification({
    recipientId: params.recipientId,
    communityId: params.communityId,
    type: 'task',
    title: 'New Task Assigned',
    message: `You were assigned task "${params.taskTitle}" (${params.points || 50} pts).`,
    entityType: 'task',
    entityId: params.taskId,
  })
}

/**
 * Helper: Notify member of task review outcome
 */
export async function notifyTaskReviewed(params: {
  recipientId: string
  communityId: string
  taskTitle: string
  taskId: string
  approved: boolean
  pointsAwarded?: number
}) {
  return createNotification({
    recipientId: params.recipientId,
    communityId: params.communityId,
    type: 'task',
    title: params.approved ? 'Task Submission Approved' : 'Task Submission Needs Changes',
    message: params.approved
      ? `Congratulations! "${params.taskTitle}" was approved and +${params.pointsAwarded || 50} XP awarded.`
      : `Your submission for "${params.taskTitle}" was reviewed and requires updates.`,
    entityType: 'task',
    entityId: params.taskId,
  })
}

/**
 * Helper: Notify members when a project member is added
 */
export async function notifyProjectMemberAdded(params: {
  recipientId: string
  communityId: string
  projectName: string
  projectId: string
}) {
  return createNotification({
    recipientId: params.recipientId,
    communityId: params.communityId,
    type: 'project',
    title: 'Added to Project Team',
    message: `You have been added as a collaborator to the project "${params.projectName}".`,
    entityType: 'project',
    entityId: params.projectId,
  })
}

/**
 * Helper: Notify member when their contribution is reviewed
 */
export async function notifyContributionReviewed(params: {
  recipientId: string
  communityId: string
  approved: boolean
  pointsAwarded?: number
  contributionId: string
}) {
  return createNotification({
    recipientId: params.recipientId,
    communityId: params.communityId,
    type: 'contribution',
    title: params.approved ? 'Peer Contribution Verified' : 'Contribution Update',
    message: params.approved
      ? `Your peer help milestone was approved! +${params.pointsAwarded || 25} Community Points awarded.`
      : `Your submitted contribution record was reviewed by chapter managers.`,
    entityType: 'contribution',
    entityId: params.contributionId,
  })
}

/**
 * Helper: Notify members of Google Meet session
 */
export async function notifyGoogleMeetSession(params: {
  recipientIds: string[]
  communityId: string
  eventTitle: string
  eventId: string
  meetUrl?: string
  status: 'created' | 'starting' | 'ended'
}) {
  const titles = {
    created: 'Google Meet Scheduled',
    starting: 'Google Meet Session Starting Now',
    ended: 'Google Meet Session Ended',
  }
  const messages = {
    created: `A live Google Meet session was configured for "${params.eventTitle}".`,
    starting: `"${params.eventTitle}" is live now. Tap to join the Google Meet call!`,
    ended: `The live session for "${params.eventTitle}" has concluded. Attendance recorded.`,
  }

  const promises = params.recipientIds.map((uid) =>
    createNotification({
      recipientId: uid,
      communityId: params.communityId,
      type: 'live',
      title: titles[params.status],
      message: messages[params.status],
      entityType: 'event',
      entityId: params.eventId,
    })
  )

  await Promise.allSettled(promises)
}
