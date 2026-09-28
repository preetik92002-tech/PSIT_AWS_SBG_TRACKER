import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { verifyUserAndManagerRole } from '../_shared/auth.ts'

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

    const { space_id, community_id } = await req.json()
    if (!space_id || !community_id) {
      return new Response(JSON.stringify({ error: 'Missing space_id or community_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user is manager
    const { supabaseAdmin } = await verifyUserAndManagerRole(req, community_id)

    const now = new Date().toISOString()

    // 1. Update space status to ENDED
    const { data: space, error: spaceErr } = await supabaseAdmin
      .from('google_meet_spaces')
      .update({
        status: 'ENDED',
        ended_at: now,
        updated_at: now,
      })
      .eq('id', space_id)
      .eq('community_id', community_id)
      .select()
      .single()

    if (spaceErr) {
      throw new Error(`Failed to end Google Meet space: ${spaceErr.message}`)
    }

    // 2. Mark active conferences under this space as ENDED
    await supabaseAdmin
      .from('google_meet_conferences')
      .update({
        status: 'ENDED',
        end_time: now,
        updated_at: now,
      })
      .eq('space_id', space_id)
      .eq('status', 'ACTIVE')

    return new Response(JSON.stringify({ success: true, space }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('google-meet-end error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
