import { supabase } from '@/lib/supabase/client'
import type { AuditLogWithActor, AuditAction, AuditEntityType } from '@/types/database'

// ==============================================================================
// AWS COMMUNITY MANAGER - FEATURE 21: AUDIT LOG SERVICE
// ==============================================================================

export interface AuditLogFilters {
  action?: string
  actorId?: string
  entityType?: string
  dateFilter?: 'all' | 'today' | '7d' | '30d' | 'custom'
  startDate?: string
  endDate?: string
  searchTerm?: string
}

export interface ActionConfig {
  label: string
  category: 'community' | 'member' | 'task' | 'event' | 'project' | 'meet' | 'settings' | 'points'
  color: string // Tailwind color badge styling
  iconName: string
}

export const ACTION_CONFIGS: Record<string, ActionConfig> = {
  community_created: {
    label: 'Community Created',
    category: 'community',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    iconName: 'Building2',
  },
  community_edited: {
    label: 'Community Edited',
    category: 'community',
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    iconName: 'Edit3',
  },
  manager_promoted: {
    label: 'Manager Promoted',
    category: 'member',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    iconName: 'Crown',
  },
  member_removed: {
    label: 'Member Removed',
    category: 'member',
    color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    iconName: 'UserX',
  },
  task_approved: {
    label: 'Task Approved',
    category: 'task',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconName: 'CheckSquare',
  },
  task_rejected: {
    label: 'Task Rejected',
    category: 'task',
    color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    iconName: 'XSquare',
  },
  points_awarded: {
    label: 'Points Awarded',
    category: 'points',
    color: 'bg-[#FF9900]/15 text-[#FF9900] border-[#FF9900]/30',
    iconName: 'Award',
  },
  event_published: {
    label: 'Event Published',
    category: 'event',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconName: 'Calendar',
  },
  event_deleted: {
    label: 'Event Deleted',
    category: 'event',
    color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    iconName: 'Trash2',
  },
  project_modified: {
    label: 'Project Modified',
    category: 'project',
    color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    iconName: 'FolderGit2',
  },
  google_account_connected: {
    label: 'Google Account Connected',
    category: 'meet',
    color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    iconName: 'Key',
  },
  google_meet_created: {
    label: 'Google Meet Created',
    category: 'meet',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconName: 'Video',
  },
  google_meet_ended: {
    label: 'Google Meet Ended',
    category: 'meet',
    color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    iconName: 'VideoOff',
  },
  community_settings_changed: {
    label: 'Community Settings Changed',
    category: 'settings',
    color: 'bg-[#FF9900]/15 text-[#FF9900] border-[#FF9900]/30',
    iconName: 'Settings',
  },
}

/**
 * Strips any sensitive credentials, tokens, or passwords before logging.
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = { ...metadata }
  const sensitiveKeys = [
    'password',
    'secret',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'client_secret',
    'auth_header',
    'authorization',
  ]

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      delete sanitized[key]
    }
  }

  return sanitized
}

/**
 * Record a privileged administrative action to the audit trail.
 */
export async function recordAuditLog(params: {
  communityId: string
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string | null
  metadata?: Record<string, any>
  actorId?: string
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const cleanMetadata = sanitizeMetadata(params.metadata || {})

    // Call stored procedure to enforce sanitization and manager authorization
    const { data, error } = await supabase.rpc('record_audit_log', {
      p_community_id: params.communityId,
      p_action: params.action,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId || null,
      p_metadata: cleanMetadata,
      p_actor_id: params.actorId || null,
    })

    if (error) {
      console.warn('[AuditLog] Notice recording audit log:', error.message)
      return { id: null, error: error.message }
    }

    return { id: data as string, error: null }
  } catch (err) {
    console.error('[AuditLog] Unexpected error:', err)
    return {
      id: null,
      error: err instanceof Error ? err.message : 'Failed to record audit entry',
    }
  }
}

/**
 * Fetch audit logs for an active community with actor profiles joined and comprehensive filters.
 */
export async function fetchCommunityAuditLogs(
  communityId: string,
  filters: AuditLogFilters = {},
  limit: number = 100
): Promise<AuditLogWithActor[]> {
  try {
    // 1. First attempt to fetch using the manager-gated RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_community_audit_logs',
      {
        p_community_id: communityId,
        p_action: filters.action || null,
        p_actor_id: filters.actorId || null,
        p_entity_type: filters.entityType || null,
        p_limit: limit,
        p_offset: 0,
      }
    )

    if (!rpcError && Array.isArray(rpcData)) {
      let results: AuditLogWithActor[] = rpcData.map((row: any) => ({
        id: row.id,
        community_id: row.community_id,
        actor_user_id: row.actor_id,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        metadata: row.metadata || {},
        created_at: row.created_at,
        actor: {
          id: row.actor_id,
          full_name: row.actor_name,
          email: row.actor_email,
          avatar_url: row.actor_avatar_url,
          aws_builder_alias: row.actor_alias,
        },
      }))

      // Apply client-side date & search filters if specified
      results = applyClientFilters(results, filters)
      return results
    }

    // 2. Direct table fallback if RPC is warming up
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        community_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at,
        actor:profiles!actor_user_id (
          id,
          full_name,
          email,
          avatar_url,
          aws_builder_alias
        )
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters.action) {
      query = query.eq('action', filters.action)
    }
    if (filters.actorId) {
      query = query.eq('actor_user_id', filters.actorId)
    }
    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }

    const { data, error } = await query

    if (error) {
      console.warn('[AuditLog] Table query notice:', error.message)
      return []
    }

    let results: AuditLogWithActor[] = (data || []).map((row: any) => ({
      id: row.id,
      community_id: row.community_id,
      actor_user_id: row.actor_user_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      metadata: row.metadata || {},
      created_at: row.created_at,
      actor: row.actor || undefined,
    }))

    results = applyClientFilters(results, filters)
    return results
  } catch (err) {
    console.error('[AuditLog] Fetch error:', err)
    return []
  }
}

/**
 * Applies date range and search term filters in memory.
 */
function applyClientFilters(
  logs: AuditLogWithActor[],
  filters: AuditLogFilters
): AuditLogWithActor[] {
  let filtered = [...logs]

  // Date filtering
  if (filters.dateFilter && filters.dateFilter !== 'all') {
    const now = new Date()
    let cutoff: Date | null = null

    if (filters.dateFilter === 'today') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (filters.dateFilter === '7d') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (filters.dateFilter === '30d') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    if (cutoff) {
      filtered = filtered.filter((log) => new Date(log.created_at) >= cutoff!)
    }
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime()
    filtered = filtered.filter((log) => new Date(log.created_at).getTime() >= start)
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime() + 24 * 60 * 60 * 1000
    filtered = filtered.filter((log) => new Date(log.created_at).getTime() <= end)
  }

  // Keyword search filter (actor name, action name, entity ID, metadata title)
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim().toLowerCase()
    filtered = filtered.filter((log) => {
      const actorName = log.actor?.full_name?.toLowerCase() || ''
      const actorAlias = log.actor?.aws_builder_alias?.toLowerCase() || ''
      const actionName = (ACTION_CONFIGS[log.action]?.label || log.action).toLowerCase()
      const entityId = (log.entity_id || '').toLowerCase()
      const metaTitle = (log.metadata?.title || log.metadata?.name || log.metadata?.description || '').toLowerCase()

      return (
        actorName.includes(term) ||
        actorAlias.includes(term) ||
        actionName.includes(term) ||
        entityId.includes(term) ||
        metaTitle.includes(term)
      )
    })
  }

  return filtered
}

/**
 * Generates and triggers download of audit logs in CSV format for compliance.
 */
export function exportAuditLogsToCSV(logs: AuditLogWithActor[], communityName: string) {
  const headers = ['Timestamp (UTC)', 'Actor Name', 'Actor Email', 'Action', 'Entity Type', 'Entity ID', 'Metadata Details']

  const rows = logs.map((log) => {
    const timestamp = new Date(log.created_at).toISOString()
    const actorName = `"${(log.actor?.full_name || 'System / Manager').replace(/"/g, '""')}"`
    const actorEmail = `"${(log.actor?.email || '').replace(/"/g, '""')}"`
    const actionLabel = `"${(ACTION_CONFIGS[log.action]?.label || log.action).replace(/"/g, '""')}"`
    const entityType = `"${log.entity_type.replace(/"/g, '""')}"`
    const entityId = `"${(log.entity_id || '').replace(/"/g, '""')}"`
    const metadataStr = `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`

    return [timestamp, actorName, actorEmail, actionLabel, entityType, entityId, metadataStr].join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `Audit_Trail_${communityName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
