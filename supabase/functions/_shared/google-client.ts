import { getSupabaseAdmin } from './auth.ts'

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type: string
}

export interface GoogleSpaceResponse {
  name: string
  meetingUri: string
  meetingCode: string
  config?: {
    accessType?: string
    entryPointAccess?: string
  }
  activeConference?: {
    conferenceRecord?: string
  }
}

export function getGoogleOAuthConfig() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || ''
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || ''
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || ''

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in Edge Function environment')
  }

  return { clientId, clientSecret, redirectUri }
}

export async function exchangeOAuthCodeForTokens(code: string, redirectUriOverride?: string): Promise<GoogleTokens> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig()
  const effectiveRedirectUri = redirectUriOverride || redirectUri

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: effectiveRedirectUri,
    grant_type: 'authorization_code',
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Google token exchange failed (${res.status}): ${errText}`)
  }

  return await res.json()
}

export async function getValidGoogleAccessToken(communityId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin()

  // Fetch connection record directly using service role
  const { data: conn, error } = await supabaseAdmin
    .from('google_connections')
    .select('*')
    .eq('community_id', communityId)
    .eq('status', 'connected')
    .maybeSingle()

  if (error || !conn) {
    throw new Error('Google Meet is not connected for this community. Please connect your Google account first.')
  }

  const now = new Date().getTime()
  const expiresAt = new Date(conn.token_expires_at).getTime()
  const BUFFER_MS = 5 * 60 * 1000 // 5 minute buffer

  if (now + BUFFER_MS < expiresAt) {
    return conn.access_token
  }

  // Token expired or about to expire -> refresh using refresh_token
  if (!conn.refresh_token) {
    throw new Error('Google authorization expired and no refresh token is stored. Please reconnect Google Meet.')
  }

  const { clientId, clientSecret } = getGoogleOAuthConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: conn.refresh_token,
    grant_type: 'refresh_token',
  })

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!refreshRes.ok) {
    const errText = await refreshRes.text()
    // Mark connection as expired/error
    await supabaseAdmin
      .from('google_connections')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', conn.id)

    throw new Error(`Failed to refresh Google token (${refreshRes.status}): ${errText}`)
  }

  const refreshData: GoogleTokens = await refreshRes.json()
  const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString()

  // Persist refreshed token securely
  await supabaseAdmin
    .from('google_connections')
    .update({
      access_token: refreshData.access_token,
      token_expires_at: newExpiresAt,
      status: 'connected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conn.id)

  return refreshData.access_token
}

export async function createGoogleMeetSpace(accessToken: string): Promise<GoogleSpaceResponse> {
  const res = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        accessType: 'OPEN',
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Google Meet API space creation failed (${res.status}): ${errText}`)
  }

  return await res.json()
}

export async function getGoogleMeetSpace(accessToken: string, spaceName: string): Promise<GoogleSpaceResponse> {
  const res = await fetch(`https://meet.googleapis.com/v2/${spaceName}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Failed to fetch Google Meet space (${res.status}): ${errText}`)
  }

  return await res.json()
}

export async function listConferenceRecords(accessToken: string): Promise<any[]> {
  const res = await fetch('https://meet.googleapis.com/v2/conferenceRecords', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    console.warn(`Failed to list conference records (${res.status}): ${errText}`)
    return []
  }

  const data = await res.json()
  return data.conferenceRecords || []
}

export async function listConferenceParticipants(accessToken: string, conferenceRecordName: string): Promise<any[]> {
  const res = await fetch(`https://meet.googleapis.com/v2/${conferenceRecordName}/participants`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    return []
  }

  const data = await res.json()
  return data.participants || []
}
