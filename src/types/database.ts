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

export interface Profile {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: UserRole
  aws_builder_alias: string | null
  aws_builder_profile_url: string | null
  bio: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  full_name?: string | null
  email: string
  avatar_url?: string | null
  role?: UserRole
  aws_builder_alias?: string | null
  aws_builder_profile_url?: string | null
  bio?: string | null
  joined_at?: string
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  id?: string
  full_name?: string | null
  email?: string
  avatar_url?: string | null
  role?: UserRole
  aws_builder_alias?: string | null
  aws_builder_profile_url?: string | null
  bio?: string | null
  joined_at?: string
  created_at?: string
  updated_at?: string
}

export interface Database {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
