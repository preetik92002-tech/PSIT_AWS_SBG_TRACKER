import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { verifyUserAndManagerRole, getSupabaseAdmin } from '../_shared/auth.ts'
import {
  getValidGoogleAccessToken,
  getGoogleMeetSpace,
  listConferenceRecords,
  listConferenceParticipants,
} from '../_shared/google-client.ts'

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

    // Verify user is manager or member
    const { supabaseAdmin } = await verifyUserAndManagerRole(req, community_id)

    // Fetch space record
    const { data: space, error: spaceErr } = await supabaseAdmin
      .from('google_meet_spaces')
      .select('*')
      .eq('id', space_id)
      .eq('community_id', community_id)
      .single()

    if (spaceErr || !space) {
      throw new Error('Google Meet space not found')
    }

    const accessToken = await getValidGoogleAccessToken(community_id)
    const freshSpace = await getGoogleMeetSpace(accessToken, space.google_space_name)

    let newStatus = space.status
    const activeConferenceRecord = freshSpace.activeConference?.conferenceRecord

    if (activeConferenceRecord) {
      newStatus = 'LIVE'
    } else if (space.status === 'LIVE' && !activeConferenceRecord) {
      // It was live before, but activeConference has now finished
      newStatus = 'ENDED'
    }

    // Update space record if changed
    if (newStatus !== space.status) {
      await supabaseAdmin
        .from('google_meet_spaces')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', space.id)
    }

    // Sync conference records from Google Meet
    const records = await listConferenceRecords(accessToken)
    // Filter records matching this space (record.space matches freshSpace.name)
    const matchingRecords = records.filter((r: any) => r.space === freshSpace.name)

    const syncedConferences = []

    for (const record of matchingRecords) {
      const confStatus = record.endTime ? 'ENDED' : 'ACTIVE'
      const { data: confRow } = await supabaseAdmin
        .from('google_meet_conferences')
        .upsert(
          {
            space_id: space.id,
            google_conference_record_name: record.name,
            start_time: record.startTime,
            end_time: record.endTime || null,
            status: confStatus,
          },
          { onConflict: 'google_conference_record_name' }
        )
        .select()
        .single()

      if (confRow) {
        syncedConferences.push(confRow)

        // Sync participants for this conference
        const participants = await listConferenceParticipants(accessToken, record.name)
        for (const p of participants) {
          const earliestJoin = p.earliestStartTime || null
          const latestLeave = p.latestEndTime || null
          const displayName = p.signedinUser?.displayName || p.anonymousUser?.displayName || 'Guest'
          const email = p.signedinUser?.user || null

          // Calculate approximate duration in seconds
          let durationSeconds = 0
          if (earliestJoin && latestLeave) {
            durationSeconds = Math.round((new Date(latestLeave).getTime() - new Date(earliestJoin).getTime()) / 1000)
          }

          // Optionally match participant to community member by email
          let matchedUserId = null
          if (email) {
            const { data: matchedProfile } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .ilike('email', email)
              .maybeSingle()
            if (matchedProfile) {
              matchedUserId = matchedProfile.id
            }
          }

          await supabaseAdmin.from('google_meet_participants').upsert(
            {
              conference_id: confRow.id,
              space_id: space.id,
              user_id: matchedUserId,
              google_participant_name: p.name,
              display_name: displayName,
              email: email,
              earliest_start_time: earliestJoin,
              latest_end_time: latestLeave,
              attendance_duration_seconds: durationSeconds,
            },
            { onConflict: 'conference_id,google_participant_name' }
          )
        }
      }
    }

    // Refetch space and conferences
    const { data: updatedSpace } = await supabaseAdmin
      .from('google_meet_spaces')
      .select('*, google_meet_conferences(*, google_meet_participants(*))')
      .eq('id', space.id)
      .single()

    return new Response(JSON.stringify({ success: true, space: updatedSpace }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('google-meet-sync error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
