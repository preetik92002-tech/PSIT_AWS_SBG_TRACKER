// ==============================================================================
// AWS BUILDER HUB - DATABASE TYPE DEFINITIONS
// ==============================================================================
// Strongly-typed definitions matching the PostgreSQL schema in supabase/migrations
// ==============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'member'

export type Profile = {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: UserRole
  aws_builder_alias: string | null
  aws_builder_profile_url: string | null
  bio: string | null
  phone: string | null
  institution_name: string | null
  institution_address: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

export type ProfileInsert = {
  id: string
  full_name?: string | null
  email: string
  avatar_url?: string | null
  role?: UserRole
  aws_builder_alias?: string | null
  aws_builder_profile_url?: string | null
  bio?: string | null
  phone?: string | null
  institution_name?: string | null
  institution_address?: string | null
  joined_at?: string
  created_at?: string
  updated_at?: string
}

export type ProfileUpdate = {
  id?: string
  full_name?: string | null
  email?: string
  avatar_url?: string | null
  role?: UserRole
  aws_builder_alias?: string | null
  aws_builder_profile_url?: string | null
  bio?: string | null
  phone?: string | null
  institution_name?: string | null
  institution_address?: string | null
  joined_at?: string
  created_at?: string
  updated_at?: string
}

export type Community = {
  id: string
  name: string
  short_name: string
  institution: string
  institution_name?: string | null
  city: string
  state?: string | null
  description: string | null
  manager_id: string
  created_by?: string | null
  logo_url?: string | null
  image_url?: string | null
  banner_url?: string | null
  is_active?: boolean
  created_at: string
  updated_at: string
}

export type CommunityInsert = {
  id?: string
  name: string
  short_name: string
  institution: string
  institution_name?: string | null
  city: string
  state?: string | null
  description?: string | null
  manager_id: string
  created_by?: string | null
  logo_url?: string | null
  image_url?: string | null
  banner_url?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export type CommunityUpdate = {
  id?: string
  name?: string
  short_name?: string
  institution?: string
  institution_name?: string | null
  city?: string
  state?: string | null
  description?: string | null
  manager_id?: string
  created_by?: string | null
  logo_url?: string | null
  image_url?: string | null
  banner_url?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export type CommunityMemberRole = 'manager' | 'member'
export type CommunityMemberStatus = 'active' | 'inactive' | 'pending'

export type CommunityMember = {
  id: string
  community_id: string
  user_id: string
  role: CommunityMemberRole
  status?: CommunityMemberStatus
  joined_at: string
  created_at?: string
  updated_at?: string
}

export type CommunityMemberInsert = {
  id?: string
  community_id: string
  user_id: string
  role?: CommunityMemberRole
  status?: CommunityMemberStatus
  joined_at?: string
  created_at?: string
  updated_at?: string
}

export type CommunityMemberUpdate = {
  id?: string
  community_id?: string
  user_id?: string
  role?: CommunityMemberRole
  status?: CommunityMemberStatus
  joined_at?: string
  created_at?: string
  updated_at?: string
}

export type CommunityCode = {
  id: string
  community_id: string
  code: string
  active?: boolean
  is_active?: boolean
  created_by?: string | null
  expires_at?: string | null
  created_at: string
}

export type CommunityCodeInsert = {
  id?: string
  community_id: string
  code: string
  active?: boolean
  is_active?: boolean
  created_by?: string | null
  expires_at?: string | null
  created_at?: string
}

export type CommunityCodeUpdate = {
  id?: string
  community_id?: string
  code?: string
  active?: boolean
  is_active?: boolean
  created_by?: string | null
  expires_at?: string | null
  created_at?: string
}

export type UserCommunityItem = {
  id: string
  name: string
  short_name: string
  institution_name: string | null
  institution?: string | null
  city: string
  state: string | null
  description: string | null
  logo_url: string | null
  image_url?: string | null
  banner_url: string | null
  role: CommunityMemberRole
  member_count: number
  created_at: string
}

export type CommunityDashboardMetrics = {
  community_id: string
  total_members: number
  active_members: number
  members_needing_attention: number
  events_count: number
  projects_count: number
  avg_task_completion: number
  community_health: {
    active: number
    needs_attention: number
    inactive: number
  }
  weekly_progress: {
    assigned: number
    completed: number
    pending: number
    completion_percentage: number
  }
  needs_attention_list: Array<{
    user_id: string
    full_name: string
    avatar_url: string | null
    email: string
    role: string
    overdue_tasks: number
    total_tasks: number
    completed_tasks: number
    reason: string
  }>
  recent_activities: Array<{
    id: string
    activity_type: string
    description: string
    created_at: string
    user_name: string | null
    user_avatar: string | null
  }>
  upcoming_events: Array<{
    id: string
    title: string
    description: string | null
    event_date: string
    location: string | null
    event_type: string
  }>
}

export type EventStatus = 'draft' | 'published' | 'live' | 'completed' | 'archived' | 'cancelled'

export type CommunityEvent = {
  id: string
  community_id: string
  title: string
  description: string | null
  event_date: string
  start_time?: string | null
  end_time?: string | null
  location: string | null
  event_type: string
  status?: EventStatus
  image_url?: string | null
  meeting_url?: string | null
  registration_required?: boolean
  max_capacity?: number | null
  participant_count?: number
  highlights?: string | null
  achievements?: string | null
  project_link?: string | null
  github_link?: string | null
  slides_link?: string | null
  recording_link?: string | null
  photos?: string[] | Json
  resources?: Array<{ title: string; url: string; type?: string }> | Json
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CommunityEventInsert = {
  id?: string
  community_id: string
  title: string
  description?: string | null
  event_date: string
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  event_type?: string
  status?: EventStatus
  image_url?: string | null
  meeting_url?: string | null
  registration_required?: boolean
  max_capacity?: number | null
  participant_count?: number
  highlights?: string | null
  achievements?: string | null
  project_link?: string | null
  github_link?: string | null
  slides_link?: string | null
  recording_link?: string | null
  photos?: string[] | Json
  resources?: Array<{ title: string; url: string; type?: string }> | Json
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type CommunityEventRsvp = {
  id: string
  community_id: string
  event_id: string
  user_id: string
  attended: boolean
  attended_at?: string | null
  feedback?: string | null
  created_at: string
}

export type CommunityEventRsvpInsert = {
  id?: string
  community_id: string
  event_id: string
  user_id: string
  attended?: boolean
  attended_at?: string | null
  feedback?: string | null
  created_at?: string
}

export type CommunityEventRsvpUpdate = {
  id?: string
  community_id?: string
  event_id?: string
  user_id?: string
  attended?: boolean
  attended_at?: string | null
  feedback?: string | null
  created_at?: string
}

export type ProjectStatus = 'Planning' | 'Active' | 'Completed' | 'Archived'

export type CommunityProject = {
  id: string
  community_id: string
  title: string
  description: string | null
  status: ProjectStatus | string
  cover_image_url: string | null
  tech_tags: string[]
  github_url: string | null
  live_demo_url: string | null
  start_date: string | null
  end_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CommunityProjectInsert = {
  id?: string
  community_id: string
  title: string
  description?: string | null
  status?: ProjectStatus | string
  cover_image_url?: string | null
  tech_tags?: string[]
  github_url?: string | null
  live_demo_url?: string | null
  start_date?: string | null
  end_date?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type CommunityProjectUpdate = Partial<CommunityProjectInsert>

export type ProjectMemberRole = 'lead' | 'collaborator' | 'contributor'

export type CommunityProjectMember = {
  id: string
  project_id: string
  community_id: string
  user_id: string
  role: ProjectMemberRole
  created_at: string
}

export type CommunityProjectMemberInsert = {
  id?: string
  project_id: string
  community_id: string
  user_id: string
  role?: ProjectMemberRole
  created_at?: string
}

export type ContributionCategory =
  | 'Mentorship'
  | 'Debugging & Troubleshooting'
  | 'Code Review'
  | 'AWS Deployment'
  | 'Workshop Support'
  | 'Architecture Guidance'
  | 'Documentation'
  | 'General Assistance'

export type ContributionStatus = 'pending' | 'approved' | 'rejected'

export type CommunityContribution = {
  id: string
  community_id: string
  contributor_id: string
  recipient_id: string | null
  category: ContributionCategory
  title: string
  description: string
  evidence_url: string | null
  status: ContributionStatus
  points_awarded: number
  reviewer_id: string | null
  reviewer_feedback: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type CommunityContributionInsert = {
  id?: string
  community_id: string
  contributor_id: string
  recipient_id?: string | null
  category: ContributionCategory
  title: string
  description: string
  evidence_url?: string | null
  status?: ContributionStatus
  points_awarded?: number
  reviewer_id?: string | null
  reviewer_feedback?: string | null
  reviewed_at?: string | null
  created_at?: string
  updated_at?: string
}

export type CommunityContributionUpdate = Partial<CommunityContributionInsert>

export type TaskPriority = 'normal' | 'important' | 'urgent'

export type CommunityTask = {
  id: string
  community_id: string
  title: string
  description: string | null
  points: number
  due_date: string | null
  priority?: TaskPriority
  checklist?: string[] | Json
  topic?: string
  is_archived?: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CommunityTaskInsert = {
  id?: string
  community_id: string
  title: string
  description?: string | null
  points?: number
  due_date?: string | null
  priority?: TaskPriority
  checklist?: string[] | Json
  topic?: string
  is_archived?: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type AuditAction =
  | 'community_created'
  | 'community_edited'
  | 'manager_promoted'
  | 'member_removed'
  | 'task_approved'
  | 'task_rejected'
  | 'points_awarded'
  | 'event_published'
  | 'event_deleted'
  | 'project_modified'
  | 'google_account_connected'
  | 'google_meet_created'
  | 'google_meet_ended'
  | 'community_settings_changed'
  | string

export type AuditEntityType =
  | 'community'
  | 'member'
  | 'task'
  | 'event'
  | 'project'
  | 'google_account'
  | 'google_meet'
  | 'settings'
  | 'points'
  | string

export type AuditLog = {
  id: string
  community_id: string
  actor_user_id: string
  action: AuditAction
  entity_type: AuditEntityType
  entity_id: string | null
  metadata: Record<string, any>
  created_at: string
}

export type AuditLogWithActor = AuditLog & {
  actor?: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    aws_builder_alias: string | null
  }
}

export type CommunityTaskAssignment = {
  id: string
  community_id: string
  task_id: string
  user_id: string
  status: string
  submission_comment?: string | null
  submission_url?: string | null
  evidence_url?: string | null
  submitted_at?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_feedback?: string | null
  checklist_state?: Record<string, boolean> | Json
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type CommunityTaskAssignmentInsert = {
  id?: string
  community_id: string
  task_id: string
  user_id: string
  status?: string
  submission_comment?: string | null
  submission_url?: string | null
  evidence_url?: string | null
  submitted_at?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_feedback?: string | null
  checklist_state?: Record<string, boolean> | Json
  completed_at?: string | null
  created_at?: string
  updated_at?: string
}

export type PointsTransaction = {
  id: string
  community_id: string
  user_id: string
  points: number
  reason: string
  entity_type: string
  entity_id: string | null
  created_by: string | null
  created_at: string
}

export type PointsTransactionInsert = {
  id?: string
  community_id: string
  user_id: string
  points: number
  reason: string
  entity_type?: string
  entity_id?: string | null
  created_by?: string | null
  created_at?: string
}

export type PointsTransactionUpdate = {
  id?: string
  community_id?: string
  user_id?: string
  points?: number
  reason?: string
  entity_type?: string
  entity_id?: string | null
  created_by?: string | null
  created_at?: string
}

export type NotificationType =
  | 'task'
  | 'event'
  | 'project'
  | 'community'
  | 'achievement'
  | 'system'
  | 'contribution'
  | 'live'

export type AppNotification = {
  id: string
  recipient_id: string
  community_id: string | null
  type: NotificationType
  title: string
  message: string
  entity_type?: string | null
  entity_id?: string | null
  is_read: boolean
  created_at: string
  read_at?: string | null
}

export type AppNotificationInsert = {
  id?: string
  recipient_id: string
  community_id?: string | null
  type: NotificationType
  title: string
  message: string
  entity_type?: string | null
  entity_id?: string | null
  is_read?: boolean
  created_at?: string
  read_at?: string | null
}

export type AppNotificationUpdate = {
  id?: string
  recipient_id?: string
  community_id?: string | null
  type?: NotificationType
  title?: string
  message?: string
  entity_type?: string | null
  entity_id?: string | null
  is_read?: boolean
  created_at?: string
  read_at?: string | null
}

export type CommunityActivity = {
  id: string
  community_id: string
  user_id: string | null
  activity_type: string
  description: string
  metadata: Json
  created_at: string
}

export type CommunityActivityInsert = {
  id?: string
  community_id: string
  user_id?: string | null
  activity_type: string
  description: string
  metadata?: Json
  created_at?: string
}

export type GoogleMeetStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'SCHEDULED' | 'LIVE' | 'ENDED' | 'FAILED'

export type GoogleConnectionInfo = {
  is_connected: boolean
  google_email: string | null
  status: string
  expires_at?: string | null
  updated_at?: string | null
}

export type GoogleMeetSpace = {
  id: string
  community_id: string
  event_id: string | null
  created_by: string | null
  title: string
  google_space_name: string
  meeting_uri: string
  meeting_code: string
  status: GoogleMeetStatus
  scheduled_start: string | null
  scheduled_end: string | null
  config: Json
  ended_at: string | null
  created_at: string
  updated_at: string
}

export type GoogleMeetSpaceInsert = {
  id?: string
  community_id: string
  event_id?: string | null
  created_by?: string | null
  title?: string
  google_space_name: string
  meeting_uri: string
  meeting_code: string
  status?: GoogleMeetStatus
  scheduled_start?: string | null
  scheduled_end?: string | null
  config?: Json
  ended_at?: string | null
  created_at?: string
  updated_at?: string
}

export type GoogleMeetSpaceUpdate = Partial<GoogleMeetSpaceInsert>

export type GoogleMeetConference = {
  id: string
  space_id: string
  google_conference_record_name: string
  start_time: string | null
  end_time: string | null
  status: 'ACTIVE' | 'ENDED'
  created_at: string
}

export type GoogleMeetConferenceInsert = {
  id?: string
  space_id: string
  google_conference_record_name: string
  start_time?: string | null
  end_time?: string | null
  status?: 'ACTIVE' | 'ENDED'
  created_at?: string
}

export type GoogleMeetConferenceUpdate = Partial<GoogleMeetConferenceInsert>

export type GoogleMeetParticipant = {
  id: string
  conference_id: string
  space_id: string
  user_id: string | null
  google_participant_name: string
  display_name: string | null
  email: string | null
  earliest_start_time: string | null
  latest_end_time: string | null
  attendance_duration_seconds: number
  created_at: string
}

export type GoogleMeetParticipantInsert = {
  id?: string
  conference_id: string
  space_id: string
  user_id?: string | null
  google_participant_name: string
  display_name?: string | null
  email?: string | null
  earliest_start_time?: string | null
  latest_end_time?: string | null
  attendance_duration_seconds?: number
  created_at?: string
}

export type GoogleMeetArtifact = {
  id: string
  conference_id: string
  artifact_type: 'recording' | 'transcript'
  google_artifact_name: string
  export_uri: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      communities: {
        Row: Community
        Insert: CommunityInsert
        Update: CommunityUpdate
        Relationships: [
          {
            foreignKeyName: 'communities_manager_id_fkey'
            columns: ['manager_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      community_members: {
        Row: CommunityMember
        Insert: CommunityMemberInsert
        Update: CommunityMemberUpdate
        Relationships: [
          {
            foreignKeyName: 'community_members_community_id_fkey'
            columns: ['community_id']
            isOneToOne: false
            referencedRelation: 'communities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'community_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      community_codes: {
        Row: CommunityCode
        Insert: CommunityCodeInsert
        Update: CommunityCodeUpdate
        Relationships: [
          {
            foreignKeyName: 'community_codes_community_id_fkey'
            columns: ['community_id']
            isOneToOne: false
            referencedRelation: 'communities'
            referencedColumns: ['id']
          }
        ]
      }
      community_events: {
        Row: CommunityEvent
        Insert: CommunityEventInsert
        Update: Partial<CommunityEventInsert>
        Relationships: []
      }
      community_projects: {
        Row: CommunityProject
        Insert: CommunityProjectInsert
        Update: Partial<CommunityProjectInsert>
        Relationships: []
      }
      community_tasks: {
        Row: CommunityTask
        Insert: CommunityTaskInsert
        Update: Partial<CommunityTaskInsert>
        Relationships: []
      }
      community_task_assignments: {
        Row: CommunityTaskAssignment
        Insert: CommunityTaskAssignmentInsert
        Update: Partial<CommunityTaskAssignmentInsert>
        Relationships: []
      }
      community_activities: {
        Row: CommunityActivity
        Insert: CommunityActivityInsert
        Update: Partial<CommunityActivityInsert>
        Relationships: []
      }
      points_transactions: {
        Row: PointsTransaction
        Insert: PointsTransactionInsert
        Update: PointsTransactionUpdate
        Relationships: []
      }
      notifications: {
        Row: AppNotification
        Insert: AppNotificationInsert
        Update: AppNotificationUpdate
        Relationships: []
      }
      community_event_rsvps: {
        Row: CommunityEventRsvp
        Insert: CommunityEventRsvpInsert
        Update: CommunityEventRsvpUpdate
        Relationships: []
      }
      google_meet_spaces: {
        Row: GoogleMeetSpace
        Insert: GoogleMeetSpaceInsert
        Update: GoogleMeetSpaceUpdate
        Relationships: []
      }
      google_meet_conferences: {
        Row: GoogleMeetConference
        Insert: GoogleMeetConferenceInsert
        Update: GoogleMeetConferenceUpdate
        Relationships: []
      }
      google_meet_participants: {
        Row: GoogleMeetParticipant
        Insert: GoogleMeetParticipantInsert
        Update: Partial<GoogleMeetParticipantInsert>
        Relationships: []
      }
      google_meet_artifacts: {
        Row: GoogleMeetArtifact
        Insert: { id?: string; conference_id: string; artifact_type: 'recording' | 'transcript'; google_artifact_name: string; export_uri?: string | null; created_at?: string }
        Update: Partial<{ id?: string; conference_id?: string; artifact_type?: 'recording' | 'transcript'; google_artifact_name?: string; export_uri?: string | null }>
        Relationships: []
      }
      community_project_members: {
        Row: CommunityProjectMember
        Insert: CommunityProjectMemberInsert
        Update: Partial<CommunityProjectMemberInsert>
        Relationships: []
      }
      community_contributions: {
        Row: CommunityContribution
        Insert: CommunityContributionInsert
        Update: CommunityContributionUpdate
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_community_manager: {
        Args: { p_community_id: string }
        Returns: boolean
      }
      is_community_member: {
        Args: { p_community_id: string }
        Returns: boolean
      }
      join_community_by_code: {
        Args: { p_code: string }
        Returns: Json
      }
      get_community_by_code: {
        Args: { p_code: string }
        Returns: Json
      }
      get_user_communities: {
        Args: Record<string, never>
        Returns: UserCommunityItem[]
      }
      get_community_dashboard_metrics: {
        Args: { p_community_id: string }
        Returns: CommunityDashboardMetrics
      }
      get_community_leaderboard: {
        Args: { p_community_id: string }
        Returns: Json
      }
      get_community_analytics: {
        Args: { p_community_id: string }
        Returns: Json
      }
      promote_community_member: {
        Args: { p_community_id: string; p_target_user_id: string }
        Returns: Json
      }
      demote_community_member: {
        Args: { p_community_id: string; p_target_user_id: string }
        Returns: Json
      }
      remove_community_member: {
        Args: { p_community_id: string; p_target_user_id: string }
        Returns: Json
      }
      approve_task_submission: {
        Args: { p_assignment_id: string; p_review_feedback?: string | null }
        Returns: Json
      }
      reject_task_submission: {
        Args: { p_assignment_id: string; p_review_feedback: string }
        Returns: Json
      }
      award_manual_points: {
        Args: { p_community_id: string; p_target_user_id: string; p_points: number; p_reason: string }
        Returns: Json
      }
      mark_event_attendance: {
        Args: { p_event_id: string; p_target_user_id: string; p_attended: boolean }
        Returns: Json
      }
      get_community_google_connection: {
        Args: { p_community_id: string }
        Returns: Json
      }
      disconnect_community_google: {
        Args: { p_community_id: string }
        Returns: Json
      }
      approve_community_contribution: {
        Args: { p_contribution_id: string; p_points?: number; p_feedback?: string | null }
        Returns: Json
      }
      reject_community_contribution: {
        Args: { p_contribution_id: string; p_feedback?: string | null }
        Returns: Json
      }
      add_project_member: {
        Args: { p_project_id: string; p_user_id: string; p_role?: string }
        Returns: Json
      }
      remove_project_member: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: Json
      }
      get_community_manager_analytics: {
        Args: { p_community_id: string; p_days?: number | null }
        Returns: Json
      }
      update_community_settings: {
        Args: { p_community_id: string; p_identity?: Json | null; p_settings?: Json | null }
        Returns: Json
      }
      rotate_community_join_code: {
        Args: { p_community_id: string; p_custom_code?: string | null }
        Returns: Json
      }
      archive_community: {
        Args: { p_community_id: string; p_confirm_short_name: string }
        Returns: Json
      }
    }
    Enums: {
      user_role: UserRole
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

