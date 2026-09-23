// ==============================================================================
// AWS JOURNEY TRACKER - COMMUNITY SUITE COMPREHENSIVE E2E VERIFICATION SCRIPT
// ==============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8')
const env = Object.fromEntries(
  envContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function runSuiteVerification() {
  console.log('==================================================================')
  console.log('AWS JOURNEY TRACKER — COMMUNITY SUITE E2E VERIFICATION TEST')
  console.log('==================================================================\n')

  let passed = 0
  let total = 0
  function record(testName, ok, detail = '') {
    total++
    if (ok) passed++
    console.log(`[${ok ? '✓ PASS' : '✗ FAIL'}] ${testName}${detail ? ' — ' + detail : ''}`)
  }

  const ts = Date.now()
  const emailA = `suite_lead_a_${ts}@example.com`
  const emailB = `suite_lead_b_${ts}@example.com`
  const emailMemberA = `suite_mbr_a_${ts}@example.com`
  const pwd = 'SuitePassword123!@#'

  let userA, userB, memberA
  let commAId, commBId

  try {
    // 1. Provision Test Users
    const { data: uA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password: pwd,
      email_confirm: true,
      user_metadata: { full_name: 'Lead Alpha', aws_builder_alias: `lead_a_${ts}` },
    })
    userA = uA.user

    const { data: uB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password: pwd,
      email_confirm: true,
      user_metadata: { full_name: 'Lead Beta', aws_builder_alias: `lead_b_${ts}` },
    })
    userB = uB.user

    const { data: uM } = await adminClient.auth.admin.createUser({
      email: emailMemberA,
      password: pwd,
      email_confirm: true,
      user_metadata: { full_name: 'Builder Alpha', aws_builder_alias: `builder_a_${ts}` },
    })
    memberA = uM.user

    // 2. Client instances
    const clientA = createClient(SUPABASE_URL, ANON_KEY)
    await clientA.auth.signInWithPassword({ email: emailA, password: pwd })

    const clientB = createClient(SUPABASE_URL, ANON_KEY)
    await clientB.auth.signInWithPassword({ email: emailB, password: pwd })

    const clientMemberA = createClient(SUPABASE_URL, ANON_KEY)
    await clientMemberA.auth.signInWithPassword({ email: emailMemberA, password: pwd })

    // 3. Create Chapters A & B
    const { data: commA } = await clientA
      .from('communities')
      .insert({
        name: `Chapter Alpha ${ts}`,
        short_name: `ALP-${String(ts).slice(-4)}`,
        institution: 'Alpha Engineering Institute',
        city: 'Kanpur',
        description: 'Alpha Cloud Builder Hub',
        created_by: userA.id,
        manager_id: userA.id,
      })
      .select('id')
      .single()
    commAId = commA.id

    const { data: commB } = await clientB
      .from('communities')
      .insert({
        name: `Chapter Beta ${ts}`,
        short_name: `BET-${String(ts).slice(-4)}`,
        institution: 'Beta Technical University',
        city: 'Lucknow',
        description: 'Beta Cloud Builder Hub',
        created_by: userB.id,
        manager_id: userB.id,
      })
      .select('id')
      .single()
    commBId = commB.id

    // 4. Enroll memberA into Chapter A
    await adminClient.from('community_members').insert({
      community_id: commAId,
      user_id: memberA.id,
      role: 'member',
      status: 'active',
    })

    // TEST 1: Members Roster Scoping
    const { data: rosterA } = await clientMemberA
      .from('community_members')
      .select('user_id, role, status')
      .eq('community_id', commAId)

    record(
      'Members Roster Query (Community A)',
      rosterA?.length === 2 && rosterA.some((m) => m.user_id === memberA.id),
      `Found ${rosterA?.length} members in Chapter A`
    )

    // TEST 2: Cross-Community Roster Isolation
    const { data: rosterBAttempt } = await clientMemberA
      .from('community_members')
      .select('user_id')
      .eq('community_id', commBId)

    record(
      'Cross-Community Roster Denial (Member A in Chapter B)',
      rosterBAttempt?.length === 0,
      '0 rows returned across chapters'
    )

    // TEST 3: Create Task in Chapter A
    const { data: taskA } = await clientA
      .from('community_tasks')
      .insert({
        community_id: commAId,
        title: 'Deploy Serverless Backend',
        description: 'Use AWS CDK and Lambda',
        points: 75,
        created_by: userA.id,
      })
      .select('id')
      .single()

    record('Create Community Task', !!taskA?.id, `Created task ${taskA?.id}`)

    // TEST 4: Assign Task to Member A
    const { error: assignErr } = await clientA
      .from('community_task_assignments')
      .insert({
        community_id: commAId,
        task_id: taskA.id,
        user_id: memberA.id,
        status: 'pending',
      })

    record('Assign Task to Chapter Member', !assignErr, 'Assignment record created')

    // TEST 5: Member A completes their assigned task
    const { error: completeErr } = await clientMemberA
      .from('community_task_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('task_id', taskA.id)
      .eq('user_id', memberA.id)

    record('Member Can Complete Own Assignment', !completeErr, 'Status transitioned to completed')

    // TEST 6: Create Community Event
    const { data: eventA } = await clientA
      .from('community_events')
      .insert({
        community_id: commAId,
        title: 'AWS GenAI Bootcamp',
        description: 'Hands-on Bedrock foundations',
        event_type: 'Workshop',
        event_date: new Date().toISOString(),
        location: 'Lab 4',
        created_by: userA.id,
      })
      .select('id')
      .single()

    record('Create Community Event', !!eventA?.id, `Event ${eventA?.id} created`)

    // TEST 7: Member A RSVPs to Event A
    const { error: rsvpErr } = await clientMemberA
      .from('community_activities')
      .insert({
        community_id: commAId,
        user_id: memberA.id,
        activity_type: 'joined event',
        description: `RSVP'd to event "${eventA.title}"`,
        metadata: { event_id: eventA.id },
      })

    record('Member RSVPs to Community Event', !rsvpErr, 'RSVP recorded')

    // TEST 8: Register Community Project
    const { data: projA } = await clientA
      .from('community_projects')
      .insert({
        community_id: commAId,
        title: 'Cloud Cost Guardian',
        description: 'Autonomous AWS cost inspector',
        status: 'completed',
        created_by: userA.id,
      })
      .select('id')
      .single()

    record('Register Community Project', !!projA?.id, `Project ${projA?.id} registered`)

    // TEST 9: Community Leaderboard Execution
    const { data: lbA } = await clientMemberA.rpc('get_community_leaderboard', {
      p_community_id: commAId,
    })

    const memberInLbA = (lbA || []).some((item) => item.user_id === memberA.id)
    record(
      'Community Leaderboard Execution',
      memberInLbA,
      `Member A earned points and appears on Chapter A leaderboard`
    )

    // TEST 10: Cross-Chapter Leaderboard Denial
    const { data: crossLbData, error: crossLbErr } = await clientMemberA.rpc('get_community_leaderboard', {
      p_community_id: commBId,
    })
    const crossLbDenied = !!crossLbErr || !crossLbData || crossLbData.length === 0
    record('Cross-Chapter Leaderboard Blocked', crossLbDenied, crossLbErr ? crossLbErr.message : 'Boundary strictly enforced')

  } catch (err) {
    console.error('Test execution error:', err)
  } finally {
    // Cleanup fixtures
    if (commAId) await adminClient.from('communities').delete().eq('id', commAId)
    if (commBId) await adminClient.from('communities').delete().eq('id', commBId)
    if (userA?.id) await adminClient.auth.admin.deleteUser(userA.id)
    if (userB?.id) await adminClient.auth.admin.deleteUser(userB.id)
    if (memberA?.id) await adminClient.auth.admin.deleteUser(memberA.id)
  }

  console.log('\n==================================================================')
  console.log(`SUITE VERIFICATION: ${passed}/${total} TESTS PASSED (${Math.round((passed/total)*100)}%)`)
  console.log('==================================================================')
}

runSuiteVerification()
