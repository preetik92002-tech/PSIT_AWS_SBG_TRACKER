import { supabase } from './supabase'
import type {
  GoogleConnectionInfo,
  GoogleMeetSpace,
  GoogleMeetConference,
  GoogleMeetParticipant,
  GoogleMeetStatus,
} from '@/types/database'

export interface SpaceWithDetails extends GoogleMeetSpace {
  google_meet_conferences?: Array<
    GoogleMeetConference & {
      google_meet_participants?: GoogleMeetParticipant[]
    }
  >
}

/**
 * Checks whether Google Meet OAuth is connected for a community.
 * Securely uses the SECURITY DEFINER RPC get_community_google_connection.
 * Raw OAuth tokens are never returned or accessible on the frontend.
 */
export async function getGoogleConnectionStatus(communityId: string): Promise<GoogleConnectionInfo> {
  try {
    const { data, error } = await supabase.rpc('get_community_google_connection', {
      p_community_id: communityId,
    })

    if (error) {
      console.warn('get_community_google_connection error:', error.message)
      return {
        is_connected: false,
        google_email: null,
        status: 'NOT_CONNECTED',
      }
    }

    const res = data as any
    return {
      is_connected: Boolean(res?.is_connected),
      google_email: res?.google_email || null,
      status: res?.status || 'NOT_CONNECTED',
      expires_at: res?.expires_at || null,
      updated_at: res?.updated_at || null,
    }
  } catch (err: any) {
    console.error('Failed to get Google connection status:', err)
    return {
      is_connected: false,
      google_email: null,
      status: 'NOT_CONNECTED',
    }
  }
}

/**
 * Disconnects the Google Meet connection for the community.
 */
export async function disconnectGoogleMeet(communityId: string): Promise<void> {
  const { data, error } = await supabase.rpc('disconnect_community_google', {
    p_community_id: communityId,
  })

  if (error) {
    throw new Error(error.message || 'Failed to disconnect Google Meet')
  }

  const res = data as any
  if (!res?.success) {
    throw new Error(res?.error || 'Failed to disconnect Google Meet')
  }
}

/**
 * Initiates Google OAuth flow via Edge Function google-oauth-start.
 * Generates an unpredictable, cryptographically secure nonce state token.
 */
export async function startGoogleOAuth(
  communityId: string,
  redirectPath: string = '/events'
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('google-oauth-start', {
    body: {
      community_id: communityId,
      redirect_path: redirectPath,
    },
  })

  if (error) {
    throw new Error(
      error.message ||
        'Failed to initiate Google OAuth. Verify Supabase Edge Functions and Google Cloud credentials.'
    )
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.authUrl) {
    throw new Error('No authorization URL returned by Google OAuth service')
  }

  return data.authUrl
}

/**
 * Calls Google Meet API via Edge Function google-meet-create to create a real space.
 */
export async function createGoogleMeet(params: {
  communityId: string
  title: string
  eventId?: string
}): Promise<GoogleMeetSpace> {
  const { data, error } = await supabase.functions.invoke('google-meet-create', {
    body: {
      community_id: params.communityId,
      event_id: params.eventId || null,
      title: params.title,
    },
  })

  if (error) {
    throw new Error(
      error.message ||
        'Failed to create Google Meet space. Ensure Google Meet is connected and Edge Functions are deployed.'
    )
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data.space
}

/**
 * Synchronizes conference records, active meeting state, and participants via Edge Function google-meet-sync.
 */
export async function syncGoogleMeet(params: {
  communityId: string
  spaceId: string
}): Promise<SpaceWithDetails> {
  const { data, error } = await supabase.functions.invoke('google-meet-sync', {
    body: {
      community_id: params.communityId,
      space_id: params.spaceId,
    },
  })

  if (error) {
    throw new Error(
      error.message || 'Failed to sync Google Meet space with Google Meet API'
    )
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data.space
}

/**
 * Ends a Google Meet space and active conference via Edge Function google-meet-end.
 */
export async function endGoogleMeet(params: {
  communityId: string
  spaceId: string
}): Promise<GoogleMeetSpace> {
  const { data, error } = await supabase.functions.invoke('google-meet-end', {
    body: {
      community_id: params.communityId,
      space_id: params.spaceId,
    },
  })

  if (error) {
    throw new Error(error.message || 'Failed to end Google Meet conference')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data.space
}

/**
 * Fetches all Google Meet spaces for a community.
 */
export async function listCommunityMeetSpaces(communityId: string): Promise<GoogleMeetSpace[]> {
  const { data, error } = await supabase
    .from('google_meet_spaces')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to list Google Meet spaces:', error)
    return []
  }

  return (data as GoogleMeetSpace[]) || []
}

/**
 * Fetches Google Meet space associated with a specific event.
 */
export async function getEventMeetSpace(eventId: string): Promise<GoogleMeetSpace | null> {
  const { data, error } = await supabase
    .from('google_meet_spaces')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to get event meet space:', error)
    return null
  }

  return (data as GoogleMeetSpace) || null
}

/**
 * Fetches full space details including conferences and participant records.
 */
export async function getSpaceWithConferences(spaceId: string): Promise<SpaceWithDetails | null> {
  const { data, error } = await supabase
    .from('google_meet_spaces')
    .select(
      `
      *,
      google_meet_conferences (
        *,
        google_meet_participants (*)
      )
    `
    )
    .eq('id', spaceId)
    .maybeSingle()

  if (error) {
    console.error('Failed to get space conferences:', error)
    return null
  }

  return (data as unknown as SpaceWithDetails) || null
}

/**
 * Awards attendance to an event for an eligible participant.
 * Attendance and points remain strictly decoupled: attendance recording does not automatically
 * grant points unless the manager explicitly triggers a point award.
 */
export async function awardEventAttendanceForParticipant(params: {
  eventId: string
  targetUserId: string
  attended: boolean
}): Promise<void> {
  const { error } = await supabase.rpc('mark_event_attendance', {
    p_event_id: params.eventId,
    p_target_user_id: params.targetUserId,
    p_attended: params.attended,
  })

  if (error) {
    throw new Error(error.message || 'Failed to mark event attendance')
  }
}
