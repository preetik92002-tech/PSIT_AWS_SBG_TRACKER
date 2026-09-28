import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { verifyUserAndManagerRole } from '../_shared/auth.ts'
import { getValidGoogleAccessToken, createGoogleMeetSpace } from '../_shared/google-client.ts'

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

    const { community_id, event_id, title } = await req.json()
    if (!community_id) {
      return new Response(JSON.stringify({ error: 'Missing community_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Verify user & manager permissions
    const { user, supabaseAdmin } = await verifyUserAndManagerRole(req, community_id)

    // 2. Obtain valid Google access token (auto-refreshes if needed)
    const accessToken = await getValidGoogleAccessToken(community_id)

    // 3. Call Google Meet API to create actual space
    const googleSpace = await createGoogleMeetSpace(accessToken)

    // 4. Save space to database
    const meetingTitle = title || 'Community Live Meeting'
    const { data: spaceRecord, error: insertError } = await supabaseAdmin
      .from('google_meet_spaces')
      .insert({
        community_id,
        event_id: event_id || null,
        title: meetingTitle,
        google_space_name: googleSpace.name,
        meeting_uri: googleSpace.meetingUri,
        meeting_code: googleSpace.meetingCode,
        status: 'SCHEDULED',
        config: googleSpace.config || {},
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to persist Google Meet space record: ${insertError.message}`)
    }

    // 5. If attached to an event, optionally update event location to the real Meet URI if empty or requested
    if (event_id) {
      await supabaseAdmin
        .from('community_events')
        .update({
          location: googleSpace.meetingUri,
        })
        .eq('id', event_id)
        .eq('community_id', community_id)
    }

    return new Response(JSON.stringify({ success: true, space: spaceRecord }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('google-meet-create error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
