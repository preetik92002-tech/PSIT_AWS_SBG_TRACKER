import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getSupabaseAdmin } from '../_shared/auth.ts'
import { exchangeOAuthCodeForTokens } from '../_shared/google-client.ts'

serve(async (req: Request) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateToken = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')

  const appBaseUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'

  if (errorParam) {
    console.error('Google OAuth returned error:', errorParam)
    return Response.redirect(`${appBaseUrl}/events?google_auth=error&reason=${encodeURIComponent(errorParam)}`, 302)
  }

  if (!code || !stateToken) {
    return Response.redirect(`${appBaseUrl}/events?google_auth=error&reason=missing_code_or_state`, 302)
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    // 1. Verify cryptographic state token
    const { data: stateRecord, error: stateError } = await supabaseAdmin
      .from('google_oauth_states')
      .select('*')
      .eq('state_token', stateToken)
      .eq('used', false)
      .maybeSingle()

    if (stateError || !stateRecord) {
      console.error('OAuth state token verification failed:', stateError?.message || 'Not found or already used')
      return Response.redirect(`${appBaseUrl}/events?google_auth=error&reason=invalid_or_expired_state`, 302)
    }

    const now = new Date().getTime()
    const expiresAt = new Date(stateRecord.expires_at).getTime()
    if (now > expiresAt) {
      return Response.redirect(`${appBaseUrl}/events?google_auth=error&reason=state_expired`, 302)
    }

    // Invalidate state to prevent replay
    await supabaseAdmin
      .from('google_oauth_states')
      .update({ used: true })
      .eq('id', stateRecord.id)

    // 2. Exchange authorization code for tokens
    const tokens = await exchangeOAuthCodeForTokens(code)

    // 3. Fetch Google User Profile for email verification
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    let googleEmail = 'unknown@gmail.com'
    let googleUserId = ''
    if (userRes.ok) {
      const gUser = await userRes.json()
      googleEmail = gUser.email || googleEmail
      googleUserId = gUser.id || ''
    }

    const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()
    const scopesList = tokens.scope ? tokens.scope.split(' ') : []

    // 4. Upsert secure connection in google_connections (SERVICE ROLE ONLY)
    const { error: upsertError } = await supabaseAdmin
      .from('google_connections')
      .upsert(
        {
          community_id: stateRecord.community_id,
          user_id: stateRecord.user_id,
          google_email: googleEmail,
          google_user_id: googleUserId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: tokenExpiresAt,
          scopes: scopesList,
          status: 'connected',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'community_id' }
      )

    if (upsertError) {
      throw upsertError
    }

    // 5. Redirect back to application with success message
    const targetPath = stateRecord.redirect_path || '/events'
    const redirectUrl = new URL(targetPath, appBaseUrl)
    redirectUrl.searchParams.set('google_auth', 'success')
    redirectUrl.searchParams.set('google_email', googleEmail)

    return Response.redirect(redirectUrl.toString(), 302)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown OAuth callback error'
    console.error('OAuth Callback processing failure:', message)
    return Response.redirect(`${appBaseUrl}/events?google_auth=error&reason=${encodeURIComponent(message)}`, 302)
  }
})
