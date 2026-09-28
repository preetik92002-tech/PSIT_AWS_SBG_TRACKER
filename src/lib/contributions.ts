import { supabase } from './supabase'
import type {
  CommunityContribution,
  ContributionCategory,
  ContributionStatus,
} from '@/types/database'

export interface ContributionWithProfiles extends CommunityContribution {
  contributor?: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
    aws_builder_alias?: string | null
  } | null
  recipient?: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
    aws_builder_alias?: string | null
  } | null
  reviewer?: {
    id: string
    full_name: string | null
    email: string
  } | null
}

/**
 * Lists contributions for a community with contributor, recipient, and reviewer details.
 */
export async function listCommunityContributions(
  communityId: string,
  filter?: {
    status?: ContributionStatus
    userId?: string
  }
): Promise<ContributionWithProfiles[]> {
  try {
    let query = supabase
      .from('community_contributions')
      .select(`
        *,
        contributor:profiles!community_contributions_contributor_id_fkey (
          id,
          full_name,
          email,
          avatar_url,
          aws_builder_alias
        ),
        recipient:profiles!community_contributions_recipient_id_fkey (
          id,
          full_name,
          email,
          avatar_url,
          aws_builder_alias
        ),
        reviewer:profiles!community_contributions_reviewer_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })

    if (filter?.status) {
      query = query.eq('status', filter.status)
    }

    if (filter?.userId) {
      query = query.or(`contributor_id.eq.${filter.userId},recipient_id.eq.${filter.userId}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to query contributions:', error.message)
      // Fallback simple query
      const { data: fallback, error: fbErr } = await supabase
        .from('community_contributions')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })

      if (fbErr) throw fbErr
      return (fallback as unknown as ContributionWithProfiles[]) || []
    }

    return (data as unknown as ContributionWithProfiles[]) || []
  } catch (err) {
    console.error('listCommunityContributions unexpected error:', err)
    return []
  }
}

/**
 * Submits a new peer or community contribution.
 * Example: "Preeti helped Mradul with AWS deployment"
 */
export async function submitContribution(params: {
  communityId: string
  recipientId?: string | null
  category: ContributionCategory
  title: string
  description: string
  evidenceUrl?: string | null
}): Promise<CommunityContribution> {
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes?.user?.id

  if (!userId) {
    throw new Error('You must be signed in to submit a contribution.')
  }

  const { data, error } = await supabase
    .from('community_contributions')
    .insert({
      community_id: params.communityId,
      contributor_id: userId,
      recipient_id: params.recipientId || null,
      category: params.category,
      title: params.title.trim(),
      description: params.description.trim(),
      evidence_url: params.evidenceUrl?.trim() || null,
      status: 'pending',
      points_awarded: 0,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to submit contribution.')
  }

  return data
}

/**
 * Manager approves a contribution and awards points via the points_transactions ledger.
 * Triggers activity log: "X helped Y with Z" and in-app notifications.
 */
export async function approveContribution(
  contributionId: string,
  points: number = 25,
  feedback?: string | null
): Promise<void> {
  const { data, error } = await supabase.rpc('approve_community_contribution', {
    p_contribution_id: contributionId,
    p_points: points,
    p_feedback: feedback || null,
  })

  if (error) {
    throw new Error(error.message || 'Failed to approve contribution')
  }

  const res = data as any
  if (res && res.error) {
    throw new Error(res.error)
  }
}

/**
 * Manager rejects a contribution with feedback.
 */
export async function rejectContribution(
  contributionId: string,
  feedback?: string | null
): Promise<void> {
  const { data, error } = await supabase.rpc('reject_community_contribution', {
    p_contribution_id: contributionId,
    p_feedback: feedback || null,
  })

  if (error) {
    throw new Error(error.message || 'Failed to reject contribution')
  }

  const res = data as any
  if (res && res.error) {
    throw new Error(res.error)
  }
}

/**
 * Deletes a pending contribution.
 */
export async function deleteContribution(contributionId: string): Promise<void> {
  const { error } = await supabase
    .from('community_contributions')
    .delete()
    .eq('id', contributionId)

  if (error) {
    throw new Error(error.message || 'Failed to delete contribution')
  }
}

/**
 * Fetches points transactions for a community to derive authentic point totals.
 */
export async function getCommunityPointsLedger(communityId: string): Promise<Array<{
  userId: string
  totalPoints: number
  transactionCount: number
}>> {
  const { data, error } = await supabase
    .from('points_transactions')
    .select('user_id, points')
    .eq('community_id', communityId)

  if (error || !data) {
    return []
  }

  const userMap = new Map<string, { totalPoints: number; transactionCount: number }>()

  for (const tx of data) {
    const cur = userMap.get(tx.user_id) || { totalPoints: 0, transactionCount: 0 }
    cur.totalPoints += tx.points
    cur.transactionCount += 1
    userMap.set(tx.user_id, cur)
  }

  return Array.from(userMap.entries()).map(([userId, stats]) => ({
    userId,
    totalPoints: stats.totalPoints,
    transactionCount: stats.transactionCount,
  }))
}
