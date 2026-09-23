// ─── World-specific types (database-driven, no mock data) ─────────────────

import type { CharacterAppearance } from '@/types'

/** A member as fetched from Supabase and used in the Builder World canvas */
export interface WorldMember {
  /** community_members.user_id */
  id: string
  /** profiles.full_name */
  name: string
  /** profiles.email – used for display / username */
  email: string
  /** profiles.avatar_url */
  avatarUrl: string | null
  /** community_members.role */
  role: 'manager' | 'member'
  /** community_members.joined_at */
  joinedAt: string
  /** Computed: sum of completed community_task_assignments.points for this community */
  xp: number
  /** Computed: Math.floor(xp / XP_PER_LEVEL) + 1 */
  level: number
  /** Computed: number of tasks completed in the last 7 days * 25 XP equivalent */
  weeklyXp: number
  /** Deterministic visual appearance derived from user ID */
  appearance: CharacterAppearance
  /** profiles.bio */
  bio: string | null
  /** profiles.institution_name */
  institution: string | null
  /** profiles.aws_builder_alias */
  awsAlias: string | null
}

/** HUD stats shown above the world canvas */
export interface WorldHudStats {
  memberCount: number
  projectCount: number
  eventCount: number
  activeThisWeek: number
}

/** Activity item from community_activities for the real-time feed */
export interface WorldActivity {
  id: string
  userId: string | null
  userName: string
  activityType: string
  description: string
  createdAt: string
}
