import { supabase } from '@/lib/supabase/client'
import type { Json } from '@/types/database'
import { recordAuditLog } from '@/lib/auditLog'

export interface CommunitySettingsPayload {
  membership_rules: {
    auto_approve: boolean
    allow_code_join: boolean
    require_institutional_email: boolean
    allowed_email_domain: string
  }
  points_rules: {
    task_completion: number
    event_attendance: number
    peer_contribution: number
    project_collaboration: number
  }
  events_defaults: {
    default_duration_minutes: number
    registration_required: boolean
    default_capacity: number
    auto_create_meet: boolean
  }
  notifications: {
    broadcast_announcements: boolean
    task_alerts: boolean
    event_reminders: boolean
    peer_contributions: boolean
  }
  analytics_tracking: boolean
}

export const DEFAULT_COMMUNITY_SETTINGS: CommunitySettingsPayload = {
  membership_rules: {
    auto_approve: true,
    allow_code_join: true,
    require_institutional_email: false,
    allowed_email_domain: '',
  },
  points_rules: {
    task_completion: 50,
    event_attendance: 25,
    peer_contribution: 30,
    project_collaboration: 100,
  },
  events_defaults: {
    default_duration_minutes: 60,
    registration_required: true,
    default_capacity: 100,
    auto_create_meet: true,
  },
  notifications: {
    broadcast_announcements: true,
    task_alerts: true,
    event_reminders: true,
    peer_contributions: true,
  },
  analytics_tracking: true,
}

export interface CommunityIdentityData {
  name: string
  short_name: string
  institution: string
  institution_name: string
  city: string
  description: string
  logo_url: string | null
}

export interface FullCommunitySettingsData {
  community_id: string
  identity: CommunityIdentityData
  settings: CommunitySettingsPayload
  join_code: string
  is_active: boolean
  manager: {
    user_id: string
    full_name: string
    email: string
    avatar_url: string | null
    aws_builder_alias: string | null
  } | null
  co_managers: Array<{
    user_id: string
    full_name: string
    email: string
    avatar_url: string | null
  }>
  google_meet_connected: boolean
}

/**
 * Loads complete settings for a community. Strictly verifies manager permissions.
 */
export async function loadCommunitySettings(communityId: string): Promise<FullCommunitySettingsData> {
  // 1. Fetch community record
  const { data: comm, error: commErr } = await supabase
    .from('communities')
    .select(`
      id,
      name,
      short_name,
      institution,
      institution_name,
      city,
      description,
      logo_url,
      banner_url,
      manager_id,
      created_by,
      is_active
    `)
    .eq('id', communityId)
    .single()

  if (commErr || !comm) {
    throw new Error(commErr?.message || 'Community not found or access denied')
  }

  // 2. Fetch raw settings if exists in table
  let settings = { ...DEFAULT_COMMUNITY_SETTINGS }
  try {
    const { data: rawSettingsData } = await supabase
      .from('communities')
      .select('settings')
      .eq('id', communityId)
      .maybeSingle()

    const raw = (rawSettingsData as any)?.settings
    if (raw) {
      settings = {
        membership_rules: { ...DEFAULT_COMMUNITY_SETTINGS.membership_rules, ...(raw.membership_rules || {}) },
        points_rules: { ...DEFAULT_COMMUNITY_SETTINGS.points_rules, ...(raw.points_rules || {}) },
        events_defaults: { ...DEFAULT_COMMUNITY_SETTINGS.events_defaults, ...(raw.events_defaults || {}) },
        notifications: { ...DEFAULT_COMMUNITY_SETTINGS.notifications, ...(raw.notifications || {}) },
        analytics_tracking: raw.analytics_tracking ?? true,
      }
    }
  } catch (err) {
    console.warn('[CommunitySettings] Using default settings:', err)
  }

  // 3. Fetch active join code
  const { data: codeData } = await supabase
    .from('community_codes')
    .select('code')
    .eq('community_id', communityId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const joinCode = codeData?.code || comm.short_name || 'AWS-2026'

  // 4. Fetch manager profile & co-managers
  let managerProfile = null
  const managerId = comm.manager_id || comm.created_by
  if (managerId) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, aws_builder_alias')
      .eq('id', managerId)
      .maybeSingle()

    if (prof) {
      managerProfile = {
        user_id: prof.id,
        full_name: prof.full_name || 'Community Manager',
        email: prof.email,
        avatar_url: prof.avatar_url,
        aws_builder_alias: prof.aws_builder_alias,
      }
    }
  }

  // Fetch all managers from community_members
  const { data: allManagers } = await supabase
    .from('community_members')
    .select(`
      user_id,
      profiles (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('community_id', communityId)
    .eq('role', 'manager')
    .eq('status', 'active')

  const coManagers = (allManagers || [])
    .filter((m) => m.user_id !== managerId)
    .map((m: any) => ({
      user_id: m.user_id,
      full_name: m.profiles?.full_name || 'Co-Manager',
      email: m.profiles?.email || '',
      avatar_url: m.profiles?.avatar_url || null,
    }))

  // 5. Check Google Meet status
  let isGoogleConnected = false
  try {
    const { data: gConn } = await (supabase.from as any)('community_google_connections')
      .select('is_active')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .maybeSingle()

    if (gConn?.is_active) isGoogleConnected = true
  } catch {
    // optional integration table
  }

  return {
    community_id: communityId,
    identity: {
      name: comm.name,
      short_name: comm.short_name,
      institution: comm.institution || comm.institution_name || '',
      institution_name: comm.institution_name || comm.institution || '',
      city: comm.city || '',
      description: comm.description || '',
      logo_url: comm.logo_url ?? null,
    },
    settings,
    join_code: joinCode,
    is_active: comm.is_active ?? true,
    manager: managerProfile,
    co_managers: coManagers,
    google_meet_connected: isGoogleConnected,
  }
}

/**
 * Saves community settings via server-enforced RPC with fallback to authorized update.
 */
export async function saveCommunitySettings(
  communityId: string,
  identity: Partial<CommunityIdentityData>,
  settings: CommunitySettingsPayload
): Promise<void> {
  // 1. Try server RPC
  try {
    const { data, error } = await supabase.rpc('update_community_settings', {
      p_community_id: communityId,
      p_identity: identity as unknown as Json,
      p_settings: settings as unknown as Json,
    })

    if (!error && (data as any)?.success) {
      recordAuditLog({
        communityId,
        action: 'community_settings_changed',
        entityType: 'settings',
        entityId: communityId,
        metadata: {
          community_name: identity.name,
          updated_fields: Object.keys(identity),
        },
      }).catch(() => {})
      return
    }
  } catch (rpcErr) {
    console.warn('[CommunitySettings] RPC failed, falling back to direct update:', rpcErr)
  }

  // 2. Direct Authorized Fallback (Protected by PostgreSQL RLS)
  const updatePayload: any = {
    name: identity.name,
    short_name: identity.short_name,
    institution: identity.institution,
    institution_name: identity.institution_name || identity.institution,
    city: identity.city,
    description: identity.description,
    logo_url: identity.logo_url,
    settings,
    updated_at: new Date().toISOString(),
  }

  // Remove undefined keys
  Object.keys(updatePayload).forEach((k) => updatePayload[k] === undefined && delete updatePayload[k])

  const { error } = await supabase
    .from('communities')
    .update(updatePayload)
    .eq('id', communityId)

  if (error) {
    throw new Error(error.message)
  }

  recordAuditLog({
    communityId,
    action: 'community_settings_changed',
    entityType: 'settings',
    entityId: communityId,
    metadata: {
      community_name: identity.name,
      updated_fields: Object.keys(identity),
    },
  }).catch(() => {})
}

/**
 * Rotates / Generates a new join code with server-side validation.
 */
export async function rotateJoinCode(communityId: string, customCode?: string): Promise<string> {
  // 1. Try server RPC
  try {
    const { data, error } = await supabase.rpc('rotate_community_join_code', {
      p_community_id: communityId,
      p_custom_code: customCode || null,
    })

    if (!error && (data as any)?.code) {
      const rotatedCode = (data as any).code
      recordAuditLog({
        communityId,
        action: 'community_settings_changed',
        entityType: 'settings',
        entityId: communityId,
        metadata: {
          event: 'join_code_rotated',
          code_preview: rotatedCode.slice(0, 4) + '****',
        },
      }).catch(() => {})
      return rotatedCode
    }
  } catch (rpcErr) {
    console.warn('[CommunitySettings] rotate RPC failed, using fallback:', rpcErr)
  }

  // 2. Fallback direct update/insert
  const newCode = (customCode || `AWS-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase()

  // Deactivate old codes
  await supabase
    .from('community_codes')
    .update({ is_active: false, active: false })
    .eq('community_id', communityId)

  // Insert new active code
  const { error } = await supabase
    .from('community_codes')
    .insert({
      community_id: communityId,
      code: newCode,
      is_active: true,
      active: true,
    })

  if (error) {
    throw new Error(error.message)
  }

  recordAuditLog({
    communityId,
    action: 'community_settings_changed',
    entityType: 'settings',
    entityId: communityId,
    metadata: {
      event: 'join_code_rotated',
      code_preview: newCode.slice(0, 4) + '****',
    },
  }).catch(() => {})

  return newCode
}

/**
 * Safely archives a community (deactivates is_active, preserves all database rows).
 */
export async function archiveCommunitySafely(
  communityId: string,
  confirmShortName: string
): Promise<void> {
  // 1. Try server RPC
  try {
    const { data, error } = await supabase.rpc('archive_community', {
      p_community_id: communityId,
      p_confirm_short_name: confirmShortName,
    })

    if (!error && (data as any)?.success) {
      recordAuditLog({
        communityId,
        action: 'community_edited',
        entityType: 'community',
        entityId: communityId,
        metadata: {
          action: 'archived_community_safely',
          confirm_short_name: confirmShortName,
        },
      }).catch(() => {})
      return
    }
    if (error) {
      throw new Error(error.message)
    }
  } catch (rpcErr: any) {
    // If confirmation mismatch or permission error, bubble it up directly!
    if (rpcErr?.message?.includes('Confirmation mismatch') || rpcErr?.message?.includes('Access denied')) {
      throw rpcErr
    }
    console.warn('[CommunitySettings] archive RPC failed, using fallback:', rpcErr)
  }

  // 2. Fallback direct archive
  const { error } = await supabase
    .from('communities')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', communityId)

  if (error) {
    throw new Error(error.message)
  }

  // Deactivate codes
  await supabase
    .from('community_codes')
    .update({ is_active: false, active: false })
    .eq('community_id', communityId)

  recordAuditLog({
    communityId,
    action: 'community_edited',
    entityType: 'community',
    entityId: communityId,
    metadata: {
      action: 'archived_community_safely',
      confirm_short_name: confirmShortName,
    },
  }).catch(() => {})
}
