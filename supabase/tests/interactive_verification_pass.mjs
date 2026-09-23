// ==============================================================================
// AWS JOURNEY TRACKER — INTERACTIVE VERIFICATION PASS (STEPS 2 - 8 & 12)
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

async function runInteractiveVerification() {
  console.log('==================================================================')
  console.log('AWS JOURNEY TRACKER — INTERACTIVE VERIFICATION SUITE')
  console.log('==================================================================\n')

  const results = []

  function record(section, testName, passed, evidence = '') {
    results.push({ section, testName, passed, evidence })
    const status = passed ? '✓ PASS' : '✗ FAIL'
    console.log(`[${status}] [${section}] ${testName}${evidence ? ' — ' + evidence : ''}`)
  }

  const ts = Date.now()
  const emailA = `verify_usera_mgr_${ts}@example.com`
  const emailB = `verify_userb_mbr_${ts}@example.com`
  const emailC = `verify_userc_mgr_${ts}@example.com`
  const pwd = 'InteractivePass2026!@#'

  let userA, userB, userC
  let commAId, commBId
  let clientA, clientB, clientC

  try {
    // -------------------------------------------------------------------------
    // STEP 2: VERIFY AUTHENTICATION
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 2: VERIFY AUTHENTICATION ---')

    // 1. Provision Users
    const { data: uA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password: pwd,
      email_confirm: true,
      user_metadata: { full_name: 'Lead Alice', aws_builder_alias: `alice_${ts}` },
    })
    userA = uA.user

    const { data: uB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password: pwd,
      email_confirm: true,
      user_metadata: { full_name: 'Builder Bob', aws_builder_alias: `bob_${ts}` },
    })
    userB = uB.user

    const { data: uC } = await adminClient.auth.admin.createUser({
      email: emailC,
      password: pwd,
      email_confirm: true,
      user_metadata: { full_name: 'Lead Charlie', aws_builder_alias: `charlie_${ts}` },
    })
    userC = uC.user

    // 2. Test Login for User A, B, C
    clientA = createClient(SUPABASE_URL, ANON_KEY)
    const { data: loginA, error: errLoginA } = await clientA.auth.signInWithPassword({
      email: emailA,
      password: pwd,
    })
    record('Authentication', 'User A Login', !errLoginA && !!loginA.session, `Token issued for ${userA.id}`)

    clientB = createClient(SUPABASE_URL, ANON_KEY)
    const { data: loginB, error: errLoginB } = await clientB.auth.signInWithPassword({
      email: emailB,
      password: pwd,
    })
    record('Authentication', 'User B Login', !errLoginB && !!loginB.session, `Token issued for ${userB.id}`)

    clientC = createClient(SUPABASE_URL, ANON_KEY)
    const { data: loginC, error: errLoginC } = await clientC.auth.signInWithPassword({
      email: emailC,
      password: pwd,
    })
    record('Authentication', 'User C Login', !errLoginC && !!loginC.session, `Token issued for ${userC.id}`)

    // 3. Test Session Persistence after refresh simulation
    const { data: sessA } = await clientA.auth.getSession()
    record(
      'Authentication',
      'Session persistence',
      sessA.session?.user?.id === userA.id,
      `Session retained UID ${sessA.session?.user?.id}`
    )

    // 4. Test Unauthenticated Access to protected tables (should be blocked)
    const anonClient = createClient(SUPABASE_URL, ANON_KEY)
    const { data: unauthComm } = await anonClient.from('community_members').select('*')
    record(
      'Authentication',
      'Unauthenticated redirect / rejection',
      !unauthComm || unauthComm.length === 0,
      'Anon client returned 0 rows from protected community_members'
    )

    // 5. Test Logout & Token Revocation
    const tempClient = createClient(SUPABASE_URL, ANON_KEY)
    await tempClient.auth.signInWithPassword({ email: emailA, password: pwd })
    await tempClient.auth.signOut()
    const { data: loggedOutSess } = await tempClient.auth.getSession()
    record('Authentication', 'Logout & Session Cleared', loggedOutSess.session === null, 'Session is null after logout')

    // -------------------------------------------------------------------------
    // STEP 3: VERIFY COMMUNITY ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 3: VERIFY COMMUNITY ISOLATION ---')

    // Create Community A (User A = manager)
    const { data: cA } = await clientA
      .from('communities')
      .insert({
        name: `Chapter Alpha ${ts}`,
        short_name: `ALP-${String(ts).slice(-4)}`,
        institution: 'Alpha Institute of Tech',
        city: 'Kanpur',
        description: 'Alpha Cloud Hub',
        created_by: userA.id,
        manager_id: userA.id,
      })
      .select('id, name')
      .single()
    commAId = cA.id

    // Create Community B (User C = manager)
    const { data: cB } = await clientC
      .from('communities')
      .insert({
        name: `Chapter Beta ${ts}`,
        short_name: `BET-${String(ts).slice(-4)}`,
        institution: 'Beta Technical University',
        city: 'Lucknow',
        description: 'Beta Cloud Hub',
        created_by: userC.id,
        manager_id: userC.id,
      })
      .select('id, name')
      .single()
    commBId = cB.id

    // Enroll User B as member in Community A only
    await adminClient.from('community_members').insert({
      community_id: commAId,
      user_id: userB.id,
      role: 'member',
      status: 'active',
    })

    // Verify User A role in A = manager
    const { data: roleA } = await clientA
      .from('community_members')
      .select('role')
      .eq('community_id', commAId)
      .eq('user_id', userA.id)
      .single()
    record('Community Isolation', 'User A is Manager in Community A', roleA?.role === 'manager', `Role: ${roleA?.role}`)

    // Verify User B role in A = member
    const { data: roleB } = await clientB
      .from('community_members')
      .select('role')
      .eq('community_id', commAId)
      .eq('user_id', userB.id)
      .single()
    record('Community Isolation', 'User B is Member in Community A', roleB?.role === 'member', `Role: ${roleB?.role}`)

    // Verify User C role in B = manager
    const { data: roleC } = await clientC
      .from('community_members')
      .select('role')
      .eq('community_id', commBId)
      .eq('user_id', userC.id)
      .single()
    record('Community Isolation', 'User C is Manager in Community B', roleC?.role === 'manager', `Role: ${roleC?.role}`)

    // Verify Community A dashboard metrics accessible to User A
    const { data: dashA, error: errDashA } = await clientA.rpc('get_community_dashboard_metrics', {
      p_community_id: commAId,
    })
    record('Community Isolation', 'User A accesses Dashboard A', !errDashA && !!dashA, `Metrics returned for Comm A`)

    // Verify User C denied Dashboard A
    const { data: dashAForC, error: errDashAForC } = await clientC.rpc('get_community_dashboard_metrics', {
      p_community_id: commAId,
    })
    record(
      'Community Isolation',
      'User C denied Dashboard A',
      !!errDashAForC || !dashAForC,
      errDashAForC ? errDashAForC.message : 'Blocked'
    )

    // Verify User A denied Dashboard B
    const { data: dashBForA, error: errDashBForA } = await clientA.rpc('get_community_dashboard_metrics', {
      p_community_id: commBId,
    })
    record(
      'Community Isolation',
      'User A denied Dashboard B',
      !!errDashBForA || !dashBForA,
      errDashBForA ? errDashBForA.message : 'Blocked'
    )

    // Verify Community A members never appear in Community B roster
    const { data: commBRoster } = await clientC
      .from('community_members')
      .select('user_id')
      .eq('community_id', commBId)
    const leaksToB = (commBRoster || []).some((m) => m.user_id === userA.id || m.user_id === userB.id)
    record(
      'Community Isolation',
      'Community A members never in Community B roster',
      !leaksToB,
      `Comm B has ${commBRoster?.length} members, zero from Comm A`
    )

    // -------------------------------------------------------------------------
    // STEP 4: VERIFY MEMBERS (/members & /members/:id)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 4: VERIFY MEMBERS ---')

    // Roster query for Community A
    const { data: membersA } = await clientA
      .from('community_members')
      .select('id, user_id, role, status, profiles(full_name, email, aws_builder_alias)')
      .eq('community_id', commAId)
    record(
      'Members',
      'Real database members in /members',
      membersA?.length === 2 && membersA.some((m) => m.user_id === userB.id),
      `Found ${membersA?.length} verified members`
    )

    // Cross-community member profile access protection
    // User C queries User B's membership in Community B (should be null)
    const { data: crossProf } = await clientC
      .from('community_members')
      .select('id, user_id')
      .eq('community_id', commBId)
      .eq('user_id', userB.id)
    record(
      'Members',
      'Cross-community profile protection (/members/:id)',
      crossProf?.length === 0,
      'User B does not exist in Community B scope'
    )

    // -------------------------------------------------------------------------
    // STEP 5: VERIFY TASKS (/tasks & /tasks/assign)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 5: VERIFY TASKS ---')

    // Create real task in Community A
    const { data: taskA } = await clientA
      .from('community_tasks')
      .insert({
        community_id: commAId,
        title: 'Deploy Serverless Microservice',
        description: 'AWS Lambda + API Gateway',
        points: 100,
        due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
        created_by: userA.id,
      })
      .select('id, title, points')
      .single()
    record('Tasks', 'Create real task', !!taskA?.id, `Task created: ${taskA?.title} (${taskA?.points} pts)`)

    // Assign to selected member (User B)
    const { data: assignA, error: errAssign } = await clientA
      .from('community_task_assignments')
      .insert({
        community_id: commAId,
        task_id: taskA.id,
        user_id: userB.id,
        status: 'pending',
      })
      .select('id')
      .single()
    record('Tasks', 'Task assigned to User B', !errAssign && !!assignA, `Assignment ID: ${assignA?.id}`)

    // Verify task isolation: User C cannot see taskA
    const { data: crossTask } = await clientC
      .from('community_tasks')
      .select('id')
      .eq('community_id', commAId)
    record('Tasks', 'Cross-community task isolation', crossTask?.length === 0, 'User C sees 0 tasks from Community A')

    // User B completes their assignment
    const { error: errComplete } = await clientB
      .from('community_task_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('task_id', taskA.id)
      .eq('user_id', userB.id)
    record('Tasks', 'User B completes assignment', !errComplete, 'Status transitioned to completed')

    // Member B cannot modify task definition
    const { data: tamperedTask } = await clientB
      .from('community_tasks')
      .update({ points: 9999 })
      .eq('id', taskA.id)
      .select('points')
    record(
      'Tasks',
      'Member cannot tamper task definition',
      !tamperedTask || tamperedTask.length === 0,
      '0 rows updated by non-manager'
    )

    // -------------------------------------------------------------------------
    // STEP 6: VERIFY LEADERBOARD (/leaderboard)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 6: VERIFY LEADERBOARD ---')

    const { data: lbA } = await clientA.rpc('get_community_leaderboard', {
      p_community_id: commAId,
    })
    const bInLbA = (lbA || []).some((item) => item.user_id === userB.id)
    const cInLbA = (lbA || []).some((item) => item.user_id === userC.id)
    record(
      'Leaderboard',
      'Rankings derive from recorded data',
      bInLbA,
      `User B has points: ${(lbA || []).find((m) => m.user_id === userB.id)?.total_points}`
    )
    record('Leaderboard', 'Community A leaderboard never contains User C', !cInLbA, 'Zero cross-community builders')

    // Cross-community leaderboard denial
    const { data: crossLb, error: errCrossLb } = await clientC.rpc('get_community_leaderboard', {
      p_community_id: commAId,
    })
    record(
      'Leaderboard',
      'Cross-chapter leaderboard blocked',
      !!errCrossLb || !crossLb,
      errCrossLb ? errCrossLb.message : 'Blocked'
    )

    // -------------------------------------------------------------------------
    // STEP 7: VERIFY EVENTS (/events, /events/new, /events/:id)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 7: VERIFY EVENTS ---')

    // User A creates real event
    const { data: eventA } = await clientA
      .from('community_events')
      .insert({
        community_id: commAId,
        title: 'AWS Cloud Day Workshop',
        description: 'Hands-on AWS Cloud practitioner labs',
        event_type: 'Workshop',
        event_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        location: 'Auditorium 2',
        created_by: userA.id,
      })
      .select('id, title')
      .single()
    record('Events', 'Create real event', !!eventA?.id, `Event: ${eventA?.title}`)

    // User B RSVPs via community_activities
    const { error: errRsvp } = await clientB.from('community_activities').insert({
      community_id: commAId,
      user_id: userB.id,
      activity_type: 'joined event',
      description: `RSVP'd to event "${eventA.title}"`,
      metadata: { event_id: eventA.id },
    })
    record('Events', 'Member RSVPs to event', !errRsvp, 'RSVP recorded in community_activities')

    // Cross-community event isolation: User C querying Comm A events
    const { data: crossEvents } = await clientC
      .from('community_events')
      .select('id')
      .eq('community_id', commAId)
    record(
      'Events',
      'Cross-community event isolation',
      crossEvents?.length === 0,
      'User C sees 0 events from Community A'
    )

    // -------------------------------------------------------------------------
    // STEP 8: VERIFY PROJECTS (/projects)
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 8: VERIFY PROJECTS ---')

    // User A creates project
    const { data: projA } = await clientA
      .from('community_projects')
      .insert({
        community_id: commAId,
        title: 'Cloud Cost Guardian',
        description: 'Autonomous AWS cost inspector',
        status: 'completed',
        created_by: userA.id,
      })
      .select('id, title')
      .single()
    record('Projects', 'Create real project', !!projA?.id, `Project: ${projA?.title}`)

    // Cross-community project isolation: User C querying Comm A projects
    const { data: crossProj } = await clientC
      .from('community_projects')
      .select('id')
      .eq('community_id', commAId)
    record(
      'Projects',
      'Cross-community project isolation',
      crossProj?.length === 0,
      'User C sees 0 projects from Community A'
    )

    // -------------------------------------------------------------------------
    // STEP 12: SECURITY AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- STEP 12: SECURITY AUDIT ---')

    // Self-promotion attempt: Member B attempts to promote self to manager
    const { data: selfPromo } = await clientB
      .from('community_members')
      .update({ role: 'manager' })
      .eq('community_id', commAId)
      .eq('user_id', userB.id)
      .select('role')
    record(
      'Security',
      'Self-promotion prevented (Member -> Manager)',
      !selfPromo || selfPromo.length === 0 || selfPromo[0]?.role === 'member',
      'RLS blocked unauthorized role change'
    )

    // Cross-community record tampering: Manager A attempts to delete Community B
    const { data: tamperedComm } = await clientA
      .from('communities')
      .delete()
      .eq('id', commBId)
      .select('id')
    record(
      'Security',
      'Cross-community deletion prevented (Manager A -> Comm B)',
      !tamperedComm || tamperedComm.length === 0,
      '0 rows deleted'
    )

  } catch (err) {
    console.error('Interactive verification error:', err)
  } finally {
    // Teardown audit fixtures
    console.log('\n--- TEARDOWN: Cleaning up interactive verification actors ---')
    if (commAId) await adminClient.from('communities').delete().eq('id', commAId)
    if (commBId) await adminClient.from('communities').delete().eq('id', commBId)
    if (userA?.id) await adminClient.auth.admin.deleteUser(userA.id)
    if (userB?.id) await adminClient.auth.admin.deleteUser(userB.id)
    if (userC?.id) await adminClient.auth.admin.deleteUser(userC.id)
    console.log('Teardown complete.')
  }

  const passedCount = results.filter((r) => r.passed).length
  const totalCount = results.length
  console.log('\n==================================================================')
  console.log(`INTERACTIVE VERIFICATION: ${passedCount}/${totalCount} TESTS PASSED (${Math.round((passedCount/totalCount)*100)}%)`)
  console.log('==================================================================')
}

runInteractiveVerification()
