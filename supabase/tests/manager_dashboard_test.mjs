// ==============================================================================
// AWS JOURNEY TRACKER - COMMUNITY MANAGER DASHBOARD VERIFICATION TEST
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

async function runManagerDashboardTests() {
  console.log('=== STARTING COMMUNITY MANAGER DASHBOARD VERIFICATION ===\n')
  let passed = 0
  let total = 0

  let userAId = null
  let userBId = null
  let memberA1Id = null
  let commAId = null
  let commBId = null

  const testPassword = 'Password123!@#'
  const emailA = `manager_a_${Date.now()}@example.com`
  const emailB = `manager_b_${Date.now()}@example.com`
  const emailA1 = `member_a1_${Date.now()}@example.com`

  const clientA = createClient(SUPABASE_URL, ANON_KEY)
  const clientB = createClient(SUPABASE_URL, ANON_KEY)
  const clientA1 = createClient(SUPABASE_URL, ANON_KEY)

  try {
    // --------------------------------------------------------------------------
    // Setup: Provision User A, User B, and Member A1
    // --------------------------------------------------------------------------
    console.log('Provisioning test users...')
    const { data: uA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Manager Alice' },
    })
    userAId = uA.user.id

    const { data: uB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Manager Bob' },
    })
    userBId = uB.user.id

    const { data: uA1 } = await adminClient.auth.admin.createUser({
      email: emailA1,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Student Alex' },
    })
    memberA1Id = uA1.user.id

    // Log them in with their respective clients
    await clientA.auth.signInWithPassword({ email: emailA, password: testPassword })
    await clientB.auth.signInWithPassword({ email: emailB, password: testPassword })
    await clientA1.auth.signInWithPassword({ email: emailA1, password: testPassword })

    // --------------------------------------------------------------------------
    // Step 1: Create Community A (Managed by Alice)
    // --------------------------------------------------------------------------
    total++
    console.log('Step 1: Alice creates Community A ("AWS SBG Alpha Campus")...')
    const { data: cA, error: errA } = await clientA
      .from('communities')
      .insert({
        name: 'AWS SBG Alpha Campus',
        short_name: 'ALPHA-AWS',
        institution: 'Alpha Institute of Tech',
        institution_name: 'Alpha Institute of Tech',
        city: 'Mumbai',
        state: 'Maharashtra',
        description: 'Alpha Chapter for cloud architects',
        manager_id: userAId,
        created_by: userAId,
      })
      .select()
      .single()

    if (errA || !cA) throw new Error(`Community A creation failed: ${errA?.message}`)
    commAId = cA.id
    console.log(`✓ Step 1 Passed: Community A created (ID: ${commAId})`)
    passed++

    // --------------------------------------------------------------------------
    // Step 2: Create Community B (Managed by Bob)
    // --------------------------------------------------------------------------
    total++
    console.log('Step 2: Bob creates Community B ("AWS SBG Beta Campus")...')
    const { data: cB, error: errB } = await clientB
      .from('communities')
      .insert({
        name: 'AWS SBG Beta Campus',
        short_name: 'BETA-AWS',
        institution: 'Beta Engineering University',
        institution_name: 'Beta Engineering University',
        city: 'Bengaluru',
        state: 'Karnataka',
        description: 'Beta Chapter for serverless builders',
        manager_id: userBId,
        created_by: userBId,
      })
      .select()
      .single()

    if (errB || !cB) throw new Error(`Community B creation failed: ${errB?.message}`)
    commBId = cB.id
    console.log(`✓ Step 2 Passed: Community B created (ID: ${commBId})`)
    passed++

    // --------------------------------------------------------------------------
    // Step 3: Populate Community A with Data (Events, Tasks, Members)
    // --------------------------------------------------------------------------
    total++
    console.log('Step 3: Populating Community A with events, tasks, and members...')
    // Event in A
    await clientA.from('community_events').insert({
      community_id: commAId,
      title: 'Alpha AWS Kickoff & IAM Deep Dive',
      description: 'Hands-on session on IAM policies and roles',
      event_date: new Date(Date.now() + 86400000 * 2).toISOString(),
      location: 'Alpha Auditorium Lab 3',
      created_by: userAId,
    })

    // Task in A
    const { data: taskA } = await clientA
      .from('community_tasks')
      .insert({
        community_id: commAId,
        title: 'Deploy CloudFront CDN Distribution',
        points: 100,
        due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
        created_by: userAId,
      })
      .select()
      .single()

    // Member Alex joins Community A via code
    const { data: codeA } = await adminClient
      .from('community_codes')
      .select('code')
      .eq('community_id', commAId)
      .single()

    await clientA1.rpc('join_community_by_code', { p_code: codeA.code })

    // Assign task to Alex in Community A
    await clientA.from('community_task_assignments').insert({
      community_id: commAId,
      task_id: taskA.id,
      user_id: memberA1Id,
      status: 'pending',
    })

    console.log('✓ Step 3 Passed: Community A populated (1 event, 1 task, 1 assignment, 2 members)')
    passed++

    // --------------------------------------------------------------------------
    // Step 4: Populate Community B with Data (Projects, Events)
    // --------------------------------------------------------------------------
    total++
    console.log('Step 4: Populating Community B with project and event...')
    // Project in B
    await clientB.from('community_projects').insert({
      community_id: commBId,
      title: 'Beta Serverless Microservice Repo',
      description: 'AWS Lambda and DynamoDB e-commerce engine',
      github_url: 'https://github.com/aws-beta/microservice',
      created_by: userBId,
    })

    // Event in B
    await clientB.from('community_events').insert({
      community_id: commBId,
      title: 'Beta Cloud Summit 2026',
      description: 'Annual cloud tech summit',
      event_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      location: 'Beta Tech Park',
      created_by: userBId,
    })

    console.log('✓ Step 4 Passed: Community B populated (1 project, 1 event, 1 member)')
    passed++

    // --------------------------------------------------------------------------
    // Test 1: Community A Manager Sees Community A Data
    // --------------------------------------------------------------------------
    total++
    console.log('Test 1: Manager A queries get_community_dashboard_metrics for Community A...')
    const { data: metricsA, error: errMA } = await clientA.rpc('get_community_dashboard_metrics', {
      p_community_id: commAId,
    })
    if (errMA || !metricsA) throw new Error(`Manager A metrics query failed: ${errMA?.message}`)

    if (metricsA.total_members !== 2) {
      throw new Error(`Expected total_members = 2 in Community A, got ${metricsA.total_members}`)
    }
    if (metricsA.events_count !== 1) {
      throw new Error(`Expected events_count = 1 in Community A, got ${metricsA.events_count}`)
    }
    if (metricsA.upcoming_events[0].title !== 'Alpha AWS Kickoff & IAM Deep Dive') {
      throw new Error(`Expected Alpha event, got: ${metricsA.upcoming_events[0]?.title}`)
    }
    console.log(`✓ Test 1 Passed: Manager A sees Community A metrics (Members: ${metricsA.total_members}, Events: ${metricsA.events_count})`)
    passed++

    // --------------------------------------------------------------------------
    // Test 2: Community B Manager Sees Community B Data
    // --------------------------------------------------------------------------
    total++
    console.log('Test 2: Manager B queries get_community_dashboard_metrics for Community B...')
    const { data: metricsB, error: errMB } = await clientB.rpc('get_community_dashboard_metrics', {
      p_community_id: commBId,
    })
    if (errMB || !metricsB) throw new Error(`Manager B metrics query failed: ${errMB?.message}`)

    if (metricsB.total_members !== 1) {
      throw new Error(`Expected total_members = 1 in Community B, got ${metricsB.total_members}`)
    }
    if (metricsB.projects_count !== 1) {
      throw new Error(`Expected projects_count = 1 in Community B, got ${metricsB.projects_count}`)
    }
    if (metricsB.upcoming_events[0].title !== 'Beta Cloud Summit 2026') {
      throw new Error(`Expected Beta event, got: ${metricsB.upcoming_events[0]?.title}`)
    }
    console.log(`✓ Test 2 Passed: Manager B sees Community B metrics (Members: ${metricsB.total_members}, Projects: ${metricsB.projects_count})`)
    passed++

    // --------------------------------------------------------------------------
    // Test 3: Cross-Community Security Isolation (RLS / Access Denied)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 3: Manager A attempts cross-community access to Community B...')
    const { data: crossData, error: crossErr } = await clientA.rpc('get_community_dashboard_metrics', {
      p_community_id: commBId,
    })

    if (!crossErr) {
      throw new Error(`Security breach! Manager A was able to access Community B metrics: ${JSON.stringify(crossData)}`)
    }
    console.log(`✓ Test 3 Passed: Cross-community query blocked by security boundary: "${crossErr.message}"`)
    passed++

    // --------------------------------------------------------------------------
    // Test 4: Cross-Community Direct Table RLS Enforcement
    // --------------------------------------------------------------------------
    total++
    console.log('Test 4: Manager A attempts direct SELECT on Community B events table...')
    const { data: crossEvents } = await clientA
      .from('community_events')
      .select('*')
      .eq('community_id', commBId)

    if (crossEvents && crossEvents.length > 0) {
      throw new Error(`RLS breach! Manager A read ${crossEvents.length} events from Community B`)
    }
    console.log('✓ Test 4 Passed: Direct table query returned 0 rows (RLS isolated)')
    passed++

    // --------------------------------------------------------------------------
    // Test 5: Switching Communities Changes Scoped Data
    // --------------------------------------------------------------------------
    total++
    console.log('Test 5: Enroll Manager A into Community B and test clean data switching...')
    const { data: codeB } = await adminClient
      .from('community_codes')
      .select('code')
      .eq('community_id', commBId)
      .single()

    // Alice joins Community B
    await clientA.rpc('join_community_by_code', { p_code: codeB.code })

    // When Alice selects Community A:
    const { data: viewA } = await clientA.rpc('get_community_dashboard_metrics', {
      p_community_id: commAId,
    })
    // When Alice switches to Community B:
    const { data: viewB } = await clientA.rpc('get_community_dashboard_metrics', {
      p_community_id: commBId,
    })

    if (viewA.community_id === viewB.community_id) {
      throw new Error('Community IDs should differ')
    }
    if (viewA.events_count !== 1 || viewB.projects_count !== 1) {
      throw new Error('Metrics did not switch cleanly')
    }

    console.log(`✓ Test 5 Passed: Switching community cleanly updates dashboard context (View A Events: ${viewA.events_count}, View B Projects: ${viewB.projects_count})`)
    passed++

  } catch (err) {
    console.error(`\n❌ DASHBOARD VERIFICATION FAILED: ${err.message}`)
    process.exitCode = 1
  } finally {
    console.log('\n--- CLEANING UP DASHBOARD TEST DATA ---')
    if (commAId) {
      await adminClient.from('community_activities').delete().eq('community_id', commAId)
      await adminClient.from('community_task_assignments').delete().eq('community_id', commAId)
      await adminClient.from('community_tasks').delete().eq('community_id', commAId)
      await adminClient.from('community_events').delete().eq('community_id', commAId)
      await adminClient.from('community_projects').delete().eq('community_id', commAId)
      await adminClient.from('community_codes').delete().eq('community_id', commAId)
      await adminClient.from('community_members').delete().eq('community_id', commAId)
      await adminClient.from('communities').delete().eq('id', commAId)
      console.log(`Cleaned up Community A: ${commAId}`)
    }
    if (commBId) {
      await adminClient.from('community_activities').delete().eq('community_id', commBId)
      await adminClient.from('community_task_assignments').delete().eq('community_id', commBId)
      await adminClient.from('community_tasks').delete().eq('community_id', commBId)
      await adminClient.from('community_events').delete().eq('community_id', commBId)
      await adminClient.from('community_projects').delete().eq('community_id', commBId)
      await adminClient.from('community_codes').delete().eq('community_id', commBId)
      await adminClient.from('community_members').delete().eq('community_id', commBId)
      await adminClient.from('communities').delete().eq('id', commBId)
      console.log(`Cleaned up Community B: ${commBId}`)
    }
    if (userAId) await adminClient.auth.admin.deleteUser(userAId)
    if (userBId) await adminClient.auth.admin.deleteUser(userBId)
    if (memberA1Id) await adminClient.auth.admin.deleteUser(memberA1Id)

    console.log('\n========================================')
    console.log(`DASHBOARD TEST SUMMARY: ${passed}/${total} TESTS PASSED`)
    console.log('========================================\n')
  }
}

runManagerDashboardTests()
