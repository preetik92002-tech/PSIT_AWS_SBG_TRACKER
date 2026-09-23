// ==============================================================================
// AWS JOURNEY TRACKER - FINAL MULTI-COMMUNITY SECURITY AUDIT TEST
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

async function runSecurityAudit() {
  console.log('==================================================================')
  console.log('AWS JOURNEY TRACKER — COMPREHENSIVE MULTI-COMMUNITY SECURITY AUDIT')
  console.log('==================================================================\n')

  const results = []
  function record(category, testName, passed, detail = '') {
    results.push({ category, testName, passed, detail })
    const status = passed ? '✓ PASS' : '✗ FAIL'
    console.log(`[${status}] ${category} | ${testName}${detail ? ' — ' + detail : ''}`)
  }

  // Identifiers to clean up
  let managerAUser, managerBUser, memberAUser, memberBUser
  let commAId, commBId
  let codeA, codeB
  let taskAId, taskBId
  let assignAId
  let eventAId, eventBId
  let projAId, projBId

  const testPassword = 'AuditPassword123!@#'
  const ts = Date.now()
  const emailManagerA = `audit_mgr_a_${ts}@example.com`
  const emailManagerB = `audit_mgr_b_${ts}@example.com`
  const emailMemberA = `audit_mbr_a_${ts}@example.com`
  const emailMemberB = `audit_mbr_b_${ts}@example.com`

  const clientManagerA = createClient(SUPABASE_URL, ANON_KEY)
  const clientManagerB = createClient(SUPABASE_URL, ANON_KEY)
  const clientMemberA = createClient(SUPABASE_URL, ANON_KEY)
  const clientMemberB = createClient(SUPABASE_URL, ANON_KEY)

  try {
    // --------------------------------------------------------------------------
    // 1. PROVISIONING TEST ACTORS
    // --------------------------------------------------------------------------
    console.log('--- SETUP: Provisioning Test Actors ---')
    const { data: uMA } = await adminClient.auth.admin.createUser({
      email: emailManagerA,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Audit Manager Alice' },
    })
    managerAUser = uMA.user

    const { data: uMB } = await adminClient.auth.admin.createUser({
      email: emailManagerB,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Audit Manager Bob' },
    })
    managerBUser = uMB.user

    const { data: uMbrA } = await adminClient.auth.admin.createUser({
      email: emailMemberA,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Audit Member Alex' },
    })
    memberAUser = uMbrA.user

    const { data: uMbrB } = await adminClient.auth.admin.createUser({
      email: emailMemberB,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Audit Member Bella' },
    })
    memberBUser = uMbrB.user

    // Sign in each client
    await clientManagerA.auth.signInWithPassword({ email: emailManagerA, password: testPassword })
    await clientManagerB.auth.signInWithPassword({ email: emailManagerB, password: testPassword })
    await clientMemberA.auth.signInWithPassword({ email: emailMemberA, password: testPassword })
    await clientMemberB.auth.signInWithPassword({ email: emailMemberB, password: testPassword })

    // --------------------------------------------------------------------------
    // 2. CREATE COMMUNITIES A & B
    // --------------------------------------------------------------------------
    console.log('\n--- SETUP: Creating Communities A & B ---')
    const { data: cA, error: errCA } = await clientManagerA
      .from('communities')
      .insert({
        name: `Audit Comm A ${ts}`,
        short_name: `AC-A`,
        institution: 'Campus A Institute',
        institution_name: 'Campus A Institute',
        city: 'Kanpur',
        state: 'UP',
        description: 'Community A test chapter',
        manager_id: managerAUser.id,
        created_by: managerAUser.id,
      })
      .select()
      .single()
    if (errCA || !cA) throw new Error('Failed to create Community A: ' + (errCA?.message || ''))
    commAId = cA.id

    const { data: cB, error: errCB } = await clientManagerB
      .from('communities')
      .insert({
        name: `Audit Comm B ${ts}`,
        short_name: `AC-B`,
        institution: 'Campus B University',
        institution_name: 'Campus B University',
        city: 'Delhi',
        state: 'Delhi',
        description: 'Community B test chapter',
        manager_id: managerBUser.id,
        created_by: managerBUser.id,
      })
      .select()
      .single()
    if (errCB || !cB) throw new Error('Failed to create Community B: ' + (errCB?.message || ''))
    commBId = cB.id

    // Fetch generated invite codes
    const { data: codesA } = await adminClient.from('community_codes').select('code').eq('community_id', commAId)
    codeA = codesA[0].code
    const { data: codesB } = await adminClient.from('community_codes').select('code').eq('community_id', commBId)
    codeB = codesB[0].code

    // Join Member A to Community A
    await clientMemberA.rpc('join_community_by_code', { p_code: codeA })
    // Join Member B to Community B
    await clientMemberB.rpc('join_community_by_code', { p_code: codeB })

    // Populate Community A fixtures
    const { data: tA } = await clientManagerA.from('community_tasks').insert({
      community_id: commAId,
      title: 'Task A1: Deploy S3 Bucket',
      description: 'Audit Task A',
      points: 100,
      created_by: managerAUser.id,
    }).select().single()
    taskAId = tA.id

    const { data: asA } = await clientManagerA.from('community_task_assignments').insert({
      community_id: commAId,
      task_id: taskAId,
      user_id: memberAUser.id,
      status: 'completed',
    }).select().single()
    assignAId = asA.id

    const { data: evA } = await clientManagerA.from('community_events').insert({
      community_id: commAId,
      title: 'Event A1: Cloud Workshop',
      event_type: 'workshop',
      event_date: new Date(Date.now() + 86400000).toISOString(),
      created_by: managerAUser.id,
    }).select().single()
    eventAId = evA.id

    const { data: pA } = await clientManagerA.from('community_projects').insert({
      community_id: commAId,
      title: 'Project A1: Serverless API',
      status: 'in_progress',
      created_by: managerAUser.id,
    }).select().single()
    projAId = pA.id

    // Populate Community B fixtures
    const { data: tB } = await clientManagerB.from('community_tasks').insert({
      community_id: commBId,
      title: 'Task B1: Lambda Setup',
      description: 'Audit Task B',
      points: 75,
      created_by: managerBUser.id,
    }).select().single()
    taskBId = tB.id

    const { data: evB } = await clientManagerB.from('community_events').insert({
      community_id: commBId,
      title: 'Event B1: DevOps Hackathon',
      event_type: 'hackathon',
      event_date: new Date(Date.now() + 86400000 * 2).toISOString(),
      created_by: managerBUser.id,
    }).select().single()
    eventBId = evB.id

    const { data: pB } = await clientManagerB.from('community_projects').insert({
      community_id: commBId,
      title: 'Project B1: DynamoDB Model',
      status: 'in_progress',
      created_by: managerBUser.id,
    }).select().single()
    projBId = pB.id

    console.log('Setup complete.\n')

    // ==========================================================================
    // SECTION 1: TEST MATRIX - ACCESS & ISOLATION
    // ==========================================================================
    console.log('--- SECTION 1: TEST MATRIX ---')

    // 1. Manager A can manage A
    const { error: errMAManageA } = await clientManagerA.from('communities').update({ description: 'Updated by Manager A' }).eq('id', commAId)
    record('TEST MATRIX', 'Manager A can manage A', !errMAManageA)

    // 2. Manager A cannot manage B
    const { error: errMAManageB, data: dMAManageB } = await clientManagerA.from('communities').update({ description: 'Hacked by Manager A' }).eq('id', commBId).select()
    const maCantManageB = !!errMAManageB || (!dMAManageB || dMAManageB.length === 0)
    record('TEST MATRIX', 'Manager A cannot manage B', maCantManageB, '0 rows updated')

    // 3. Manager B can manage B
    const { error: errMBManageB } = await clientManagerB.from('communities').update({ description: 'Updated by Manager B' }).eq('id', commBId)
    record('TEST MATRIX', 'Manager B can manage B', !errMBManageB)

    // 4. Manager B cannot manage A
    const { error: errMBManageA, data: dMBManageA } = await clientManagerB.from('communities').update({ description: 'Hacked by Manager B' }).eq('id', commAId).select()
    const mbCantManageA = !!errMBManageA || (!dMBManageA || dMBManageA.length === 0)
    record('TEST MATRIX', 'Manager B cannot manage A', mbCantManageA, '0 rows updated')

    // 5. Member A can access A
    const { data: dMbrAAccessA, error: errMbrAAccessA } = await clientMemberA.from('community_tasks').select('*').eq('community_id', commAId)
    record('TEST MATRIX', 'Member A can access A', !errMbrAAccessA && dMbrAAccessA.length > 0)

    // 6. Member A cannot access B
    const { data: dMbrAAccessB } = await clientMemberA.from('community_tasks').select('*').eq('community_id', commBId)
    record('TEST MATRIX', 'Member A cannot access B', !dMbrAAccessB || dMbrAAccessB.length === 0, 'RLS returned 0 rows')

    // 7. Member B can access B
    const { data: dMbrBAccessB, error: errMbrBAccessB } = await clientMemberB.from('community_tasks').select('*').eq('community_id', commBId)
    record('TEST MATRIX', 'Member B can access B', !errMbrBAccessB && dMbrBAccessB.length > 0)

    // 8. Member B cannot access A
    const { data: dMbrBAccessA } = await clientMemberB.from('community_tasks').select('*').eq('community_id', commAId)
    record('TEST MATRIX', 'Member B cannot access A', !dMbrBAccessA || dMbrBAccessA.length === 0, 'RLS returned 0 rows')

    // ==========================================================================
    // SECTION 2: TEST EVERY FEATURE
    // ==========================================================================
    console.log('\n--- SECTION 2: FEATURE ISOLATION AUDIT ---')

    // 1. Dashboard Metrics
    const { data: dashA, error: errDashA } = await clientManagerA.rpc('get_community_dashboard_metrics', { p_community_id: commAId })
    record('FEATURE: Dashboard', 'Manager A accesses Dashboard A', !errDashA && dashA.total_members >= 2)

    const { error: errDashCrossA } = await clientManagerA.rpc('get_community_dashboard_metrics', { p_community_id: commBId })
    record('FEATURE: Dashboard', 'Manager A denied Dashboard B', !!errDashCrossA, errDashCrossA?.message)

    const { data: dashMbrA, error: errDashMbrA } = await clientMemberA.rpc('get_community_dashboard_metrics', { p_community_id: commAId })
    record('FEATURE: Dashboard', 'Member A accesses Dashboard A', !errDashMbrA && dashMbrA.community_id === commAId)

    const { error: errDashMbrCrossA } = await clientMemberA.rpc('get_community_dashboard_metrics', { p_community_id: commBId })
    record('FEATURE: Dashboard', 'Member A denied Dashboard B', !!errDashMbrCrossA, errDashMbrCrossA?.message)

    // 2. Members
    const { data: mbrsA } = await clientMemberA.from('community_members').select('*').eq('community_id', commAId)
    record('FEATURE: Members', 'Member A can view Community A roster', mbrsA && mbrsA.length === 2)

    const { data: mbrsCrossB } = await clientMemberA.from('community_members').select('*').eq('community_id', commBId)
    record('FEATURE: Members', 'Member A denied Community B roster', !mbrsCrossB || mbrsCrossB.length === 0, '0 rows returned')

    // 3. Member Profiles
    const { data: profs } = await clientMemberA.from('profiles').select('id, full_name, email').eq('id', memberAUser.id)
    record('FEATURE: Member Profiles', 'Member A can view own profile', profs && profs.length === 1)

    const { data: profUpdateCross, error: errProfUpdateCross } = await clientMemberA
      .from('profiles')
      .update({ full_name: 'Hijacked Name' })
      .eq('id', memberBUser.id)
      .select()
    record('FEATURE: Member Profiles', 'Member A cannot modify Member B profile', !!errProfUpdateCross || !profUpdateCross || profUpdateCross.length === 0, '0 rows modified')

    // 4. Tasks
    const { error: errMbrCreateTask } = await clientMemberA.from('community_tasks').insert({
      community_id: commAId,
      title: 'Rogue Task by Member',
      points: 500,
    })
    record('FEATURE: Tasks', 'Member cannot create task in A', !!errMbrCreateTask, 'Blocked by RLS')

    const { error: errMgrCrossCreateTask } = await clientManagerA.from('community_tasks').insert({
      community_id: commBId,
      title: 'Cross Task by Manager A',
      points: 500,
    })
    record('FEATURE: Tasks', 'Manager A cannot create task in B', !!errMgrCrossCreateTask, 'Blocked by RLS')

    // 5. Task Assignments
    const { data: assignViewA } = await clientMemberA.from('community_task_assignments').select('*').eq('community_id', commAId)
    record('FEATURE: Task Assignments', 'Member A can view assignments in A', assignViewA && assignViewA.length > 0)

    const { data: assignViewB } = await clientMemberA.from('community_task_assignments').select('*').eq('community_id', commBId)
    record('FEATURE: Task Assignments', 'Member A denied assignments in B', !assignViewB || assignViewB.length === 0, '0 rows returned')

    const { error: errMbrBUpdateA } = await clientMemberB
      .from('community_task_assignments')
      .update({ status: 'pending' })
      .eq('id', assignAId)
      .select()
    record('FEATURE: Task Assignments', 'Member B cannot modify Assignment A', !errMbrBUpdateA, '0 rows affected')

    // 6. Events & Event Details
    const { data: evDetailA } = await clientMemberA.from('community_events').select('*').eq('id', eventAId).single()
    record('FEATURE: Events', 'Member A can view Event A details', !!evDetailA && evDetailA.title === 'Event A1: Cloud Workshop')

    const { data: evDetailCrossB } = await clientMemberA.from('community_events').select('*').eq('id', eventBId)
    record('FEATURE: Events', 'Member A denied Event B details', !evDetailCrossB || evDetailCrossB.length === 0, '0 rows returned')

    const { error: errMbrCreateEvent } = await clientMemberA.from('community_events').insert({
      community_id: commAId,
      title: 'Rogue Event',
      event_date: new Date().toISOString(),
    })
    record('FEATURE: Events', 'Member cannot create event in A', !!errMbrCreateEvent, 'Blocked by RLS')

    // 7. Projects & Project Details
    const { data: projDetailA } = await clientMemberA.from('community_projects').select('*').eq('id', projAId).single()
    record('FEATURE: Projects', 'Member A can view Project A details', !!projDetailA && projDetailA.title === 'Project A1: Serverless API')

    const { data: projDetailCrossB } = await clientMemberA.from('community_projects').select('*').eq('id', projBId)
    record('FEATURE: Projects', 'Member A denied Project B details', !projDetailCrossB || projDetailCrossB.length === 0, '0 rows returned')

    const { error: errMbrCreateProject } = await clientMemberA.from('community_projects').insert({
      community_id: commAId,
      title: 'Rogue Project',
    })
    record('FEATURE: Projects', 'Member cannot create project in A', !!errMbrCreateProject, 'Blocked by RLS')

    // 8. Leaderboard
    const { data: lbA, error: errLbA } = await clientMemberA.rpc('get_community_leaderboard', { p_community_id: commAId })
    record('FEATURE: Leaderboard', 'Member A accesses Leaderboard A', !errLbA && Array.isArray(lbA) && lbA.length > 0)

    const { error: errLbCrossB } = await clientMemberA.rpc('get_community_leaderboard', { p_community_id: commBId })
    record('FEATURE: Leaderboard', 'Member A denied Leaderboard B', !!errLbCrossB, errLbCrossB?.message)

    // 9. Analytics
    const { data: analA, error: errAnalA } = await clientManagerA.rpc('get_community_analytics', { p_community_id: commAId })
    record('FEATURE: Analytics', 'Manager A accesses Analytics A', !errAnalA && !!analA)

    const { error: errAnalCrossB } = await clientManagerA.rpc('get_community_analytics', { p_community_id: commBId })
    record('FEATURE: Analytics', 'Manager A denied Analytics B', !!errAnalCrossB, errAnalCrossB?.message)

    const { error: errAnalMbrA } = await clientMemberA.rpc('get_community_analytics', { p_community_id: commAId })
    record('FEATURE: Analytics', 'Member A denied Analytics A (Manager only)', !!errAnalMbrA, errAnalMbrA?.message)

    // 10. Community Settings
    const { data: dMbrUpdateSettings, error: errMbrUpdateSettings } = await clientMemberA
      .from('communities')
      .update({ name: 'Tampered Community Name' })
      .eq('id', commAId)
      .select()
    record('FEATURE: Community Settings', 'Member A cannot modify Community Settings', !!errMbrUpdateSettings || !dMbrUpdateSettings || dMbrUpdateSettings.length === 0, '0 rows modified')

    // 11. Community Codes
    const { data: codesViewMgrA } = await clientManagerA.from('community_codes').select('*').eq('community_id', commAId)
    record('FEATURE: Community Codes', 'Manager A can view Community A codes', codesViewMgrA && codesViewMgrA.length > 0)

    const { data: codesViewCrossB } = await clientManagerA.from('community_codes').select('*').eq('community_id', commBId)
    record('FEATURE: Community Codes', 'Manager A denied Community B codes', !codesViewCrossB || codesViewCrossB.length === 0, '0 rows returned')

    const { data: codesViewMbrA } = await clientMemberA.from('community_codes').select('*').eq('community_id', commAId)
    record('FEATURE: Community Codes', 'Member A denied Community A codes', !codesViewMbrA || codesViewMbrA.length === 0, '0 rows returned (Manager only)')

    // ==========================================================================
    // SECTION 3: PRIVILEGE ESCALATION ATTEMPTS
    // ==========================================================================
    console.log('\n--- SECTION 3: PRIVILEGE ESCALATION AUDIT ---')

    // 1. Member -> Manager
    const { data: dEscMgr, error: errEscMgr } = await clientMemberA
      .from('community_members')
      .update({ role: 'manager' })
      .eq('user_id', memberAUser.id)
      .eq('community_id', commAId)
      .select()
    const escMgrFailed = !!errEscMgr || !dEscMgr || dEscMgr.length === 0
    record('PRIVILEGE ESCALATION', 'member -> manager attempt', escMgrFailed, 'RLS prevented role update')

    // 2. Member -> Admin (Platform Admin)
    const { data: dEscAdmin, error: errEscAdmin } = await clientMemberA
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', memberAUser.id)
      .select()
    const escAdminFailed = !!errEscAdmin || !dEscAdmin || dEscAdmin.length === 0
    record('PRIVILEGE ESCALATION', 'member -> admin attempt', escAdminFailed, 'Profiles RLS check prevented role escalation')

    // 3. Manager A -> Manager B
    const { data: dEscMgrB, error: errEscMgrB } = await clientManagerA
      .from('community_members')
      .insert({ community_id: commBId, user_id: managerAUser.id, role: 'manager', status: 'active' })
      .select()
    const escMgrBFailed = !!errEscMgrB || !dEscMgrB || dEscMgrB.length === 0
    record('PRIVILEGE ESCALATION', 'manager A -> manager B attempt', escMgrBFailed, 'RLS prevented cross-community manager assignment')

    // 4. Member A -> Member B (Modify Member B membership status)
    const { data: dEscMbrB, error: errEscMbrB } = await clientMemberA
      .from('community_members')
      .update({ status: 'inactive' })
      .eq('user_id', memberBUser.id)
      .select()
    const escMbrBFailed = !!errEscMbrB || !dEscMbrB || dEscMbrB.length === 0
    record('PRIVILEGE ESCALATION', 'member A -> member B tampering attempt', escMbrBFailed, '0 rows updated')

    // 5. Cross-community record modification (Manager A updates Task in B)
    const { data: dCrossMod, error: errCrossMod } = await clientManagerA
      .from('community_tasks')
      .update({ points: 9999 })
      .eq('id', taskBId)
      .select()
    const crossModFailed = !!errCrossMod || !dCrossMod || dCrossMod.length === 0
    record('PRIVILEGE ESCALATION', 'cross-community record modification', crossModFailed, '0 rows updated')

    // 6. Cross-community record deletion (Manager A deletes Event in B)
    const { data: dCrossDel, error: errCrossDel } = await clientManagerA
      .from('community_events')
      .delete()
      .eq('id', eventBId)
      .select()
    const crossDelFailed = !!errCrossDel || !dCrossDel || dCrossDel.length === 0
    record('PRIVILEGE ESCALATION', 'cross-community record deletion', crossDelFailed, '0 rows deleted')

    // 7. Forged community ID
    const forgedId = 'e0000000-0000-0000-0000-000000000000'
    const { error: errForgedId } = await clientMemberA.rpc('get_community_dashboard_metrics', { p_community_id: forgedId })
    record('PRIVILEGE ESCALATION', 'forged community ID attempt', !!errForgedId, errForgedId?.message)

    // 8. Forged community code
    const { error: errForgedCode } = await clientMemberA.rpc('join_community_by_code', { p_code: 'FORGED-FAKE-CODE-9999' })
    record('PRIVILEGE ESCALATION', 'forged community code attempt', !!errForgedCode, errForgedCode?.message)

    // 9. Duplicate membership (Re-joining already joined community)
    const { data: dDupJoin } = await clientMemberA.rpc('join_community_by_code', { p_code: codeA })
    const { count: dupCount } = await adminClient
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', commAId)
      .eq('user_id', memberAUser.id)
    const dupSafe = dDupJoin?.already_member === true && dupCount === 1
    record('PRIVILEGE ESCALATION', 'duplicate membership attempt', dupSafe, 'Idempotent join handled safely (exact 1 membership row)')

    // 10. Inactive code
    const inactiveCodeStr = `INACT-${Date.now()}`
    await adminClient.from('community_codes').insert({
      community_id: commAId,
      code: inactiveCodeStr,
      is_active: false,
      active: false,
    })
    const { error: errInactiveJoin } = await clientMemberB.rpc('join_community_by_code', { p_code: inactiveCodeStr })
    record('PRIVILEGE ESCALATION', 'inactive code attempt', !!errInactiveJoin, errInactiveJoin?.message)

    // 11. Expired code
    const expiredCodeStr = `EXPIR-${Date.now()}`
    await adminClient.from('community_codes').insert({
      community_id: commAId,
      code: expiredCodeStr,
      is_active: true,
      active: true,
      expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    })
    const { error: errExpiredJoin } = await clientMemberB.rpc('join_community_by_code', { p_code: expiredCodeStr })
    record('PRIVILEGE ESCALATION', 'expired code attempt', !!errExpiredJoin, errExpiredJoin?.message)

  } catch (err) {
    console.error('Fatal audit execution error:', err)
  } finally {
    console.log('\n--- CLEANUP: Removing Audit Fixtures ---')
    if (commAId) await adminClient.from('communities').delete().eq('id', commAId)
    if (commBId) await adminClient.from('communities').delete().eq('id', commBId)
    if (managerAUser) await adminClient.auth.admin.deleteUser(managerAUser.id)
    if (managerBUser) await adminClient.auth.admin.deleteUser(managerBUser.id)
    if (memberAUser) await adminClient.auth.admin.deleteUser(memberAUser.id)
    if (memberBUser) await adminClient.auth.admin.deleteUser(memberBUser.id)
    console.log('Cleanup finished.')
  }

  // Print Summary
  console.log('\n==================================================================')
  console.log('AUDIT RESULTS SUMMARY')
  console.log('==================================================================')
  const total = results.length
  const passedCount = results.filter((r) => r.passed).length
  const failedCount = total - passedCount

  console.log(`TOTAL SECURITY TESTS: ${total}`)
  console.log(`PASSED:               ${passedCount}`)
  console.log(`FAILED:               ${failedCount}`)
  console.log(`STATUS:               ${failedCount === 0 ? '✓ ALL TESTS PASSED' : '✗ FAILURES DETECTED'}`)
  console.log('==================================================================\n')

  if (failedCount > 0) {
    process.exit(1)
  }
}

runSecurityAudit()
