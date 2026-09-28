import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { verifyUserAndManagerRole } from '../_shared/auth.ts'
import { getGoogleOAuthConfig } from '../_shared/google-client.ts'

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { community_id, redirect_path } = await req.json()
    if (!community_id) {
      return new Response(JSON.stringify({ error: 'Missing community_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Authenticate user & verify community manager role
    const { user, supabaseAdmin } = await verifyUserAndManagerRole(req, community_id)

    // 2. Obtain Google OAuth configuration
    const { clientId, redirectUri } = getGoogleOAuthConfig()

    // 3. Generate cryptographic unpredictable single-use state token
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const stateToken = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('')

    // 4. Store state with short expiry (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const { error: stateError } = await supabaseAdmin
      .from('google_oauth_states')
      .insert({
        state_token: stateToken,
        community_id,
        user_id: user.id,
        redirect_path: redirect_path || '/events',
        expires_at: expiresAt,
        used: false,
      })

    if (stateError) {
      throw new Error(`Failed to initialize secure OAuth state: ${stateError.message}`)
    }

    // 5. Construct Google OAuth Authorization URL
    const scopes = [
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/meetings.space.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ')

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', stateToken)

    return new Response(
      JSON.stringify({
        success: true,
        authUrl: authUrl.toString(),
        state: stateToken,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
