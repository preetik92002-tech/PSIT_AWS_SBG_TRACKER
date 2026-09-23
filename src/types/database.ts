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
  city: string
  state: string | null
  description: string | null
  logo_url: string | null
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

export type CommunityEvent = {
  id: string
  community_id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  event_type: string
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
  location?: string | null
  event_type?: string
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type CommunityProject = {
  id: string
  community_id: string
  title: string
  description: string | null
  status: string
  github_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CommunityProjectInsert = {
  id?: string
  community_id: string
  title: string
  description?: string | null
  status?: string
  github_url?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type CommunityTask = {
  id: string
  community_id: string
  title: string
  description: string | null
  points: number
  due_date: string | null
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
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type CommunityTaskAssignment = {
  id: string
  community_id: string
  task_id: string
  user_id: string
  status: string
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
  completed_at?: string | null
  created_at?: string
  updated_at?: string
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
    }
    Enums: {
      user_role: UserRole
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

