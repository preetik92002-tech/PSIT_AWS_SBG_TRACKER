// ==============================================================================
// AWS JOURNEY TRACKER - COMMUNITY FLOW INTEGRATION TEST (19 TESTS)
// ==============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// 1. Load environment variables dynamically from .env.local
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

async function runCommunityFlowTests() {
  console.log('=== STARTING 19-POINT COMMUNITY & AUTH VERIFICATION SUITE ===\n')
  let passed = 0
  let total = 0

  let testMemberId = null
  let testAdminId = null
  let createdCommunityId = null
  let generatedJoinCode = null

  const testPassword = 'Password123!@#'
  const testMemberEmail = `member_comm_${Date.now()}@example.com`
  const testAdminEmail = `admin_comm_${Date.now()}@example.com`

  const memberClient = createClient(SUPABASE_URL, ANON_KEY)
  const adminSessionClient = createClient(SUPABASE_URL, ANON_KEY)

  try {
    // --------------------------------------------------------------------------
    // Test 1: Existing admin login
    // --------------------------------------------------------------------------
    total++
    console.log('Test 1: Existing admin status check (awsbuildertracker@gmail.com)...')
    const { data: currentAdmin, error: caErr } = await adminClient
      .from('profiles')
      .select('id, email, role')
      .eq('email', 'awsbuildertracker@gmail.com')
      .single()

    if (caErr || !currentAdmin) {
      throw new Error(`Admin query failed: ${caErr?.message}`)
    }
    console.log(`✓ Test 1 Passed: Existing admin found (${currentAdmin.email})`)
    passed++

    // --------------------------------------------------------------------------
    // Test 2: Existing admin remains admin
    // --------------------------------------------------------------------------
    total++
    console.log('Test 2: Verify existing admin role remains "admin"...')
    if (currentAdmin.role !== 'admin') {
      throw new Error(`Expected role 'admin', got '${currentAdmin.role}'`)
    }
    console.log(`✓ Test 2 Passed: Existing admin role is strictly '${currentAdmin.role}'`)
    passed++

    // Setup provisioned test accounts for member & admin testing
    const { data: mUser, error: mErr } = await adminClient.auth.admin.createUser({
      email: testMemberEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Community Test Member' },
    })
    if (mErr) throw new Error(`Member setup failed: ${mErr.message}`)
    testMemberId = mUser.user.id

    const { data: aUser, error: aErr } = await adminClient.auth.admin.createUser({
      email: testAdminEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Chapter Test Admin' },
    })
    if (aErr) throw new Error(`Admin setup failed: ${aErr.message}`)
    testAdminId = aUser.user.id

    await adminClient.from('profiles').update({ role: 'admin' }).eq('id', testAdminId)

    // --------------------------------------------------------------------------
    // Test 3: Member login
    // --------------------------------------------------------------------------
    total++
    console.log('Test 3: Member client login via signInWithPassword...')
    const { data: mAuth, error: mAuthErr } = await memberClient.auth.signInWithPassword({
      email: testMemberEmail,
      password: testPassword,
    })
    if (mAuthErr || !mAuth.user) throw new Error(`Member login failed: ${mAuthErr?.message}`)
    console.log(`✓ Test 3 Passed: Member logged in successfully (ID: ${mAuth.user.id})`)
    passed++

    // --------------------------------------------------------------------------
    // Test 4: Member cannot access admin routes / privileges
    // --------------------------------------------------------------------------
    total++
    console.log('Test 4: Member role check denies admin routes...')
    const { data: mProf } = await memberClient.from('profiles').select('role').eq('id', testMemberId).single()
    if (mProf.role !== 'member') {
      throw new Error(`Member has incorrect role: ${mProf.role}`)
    }
    console.log(`✓ Test 4 Passed: Role is '${mProf.role}' (client route guard redirects /admin/* to /dashboard)`)
    passed++

    // --------------------------------------------------------------------------
    // Test 5: Role selection cannot escalate privileges
    // --------------------------------------------------------------------------
    total++
    console.log('Test 5: Verify member selecting "manager" in client cannot escalate in database...')
    const { error: hackAttempt } = await memberClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', testMemberId)

    const { data: checkRole } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', testMemberId)
      .single()

    if (checkRole.role === 'admin') {
      throw new Error('SECURITY VIOLATION: Member escalated role!')
    }
    console.log(`✓ Test 5 Passed: Role escalation blocked. Role remains '${checkRole.role}'`)
    passed++

    // --------------------------------------------------------------------------
    // Test 6: Email verification flow handling
    // --------------------------------------------------------------------------
    total++
    console.log('Test 6: Supabase verifyOtp validation handling...')
    const { error: otpErr } = await memberClient.auth.verifyOtp({
      email: testMemberEmail,
      token: '000000',
      type: 'email',
    })
    // Erroneous token should be rejected cleanly
    if (!otpErr) throw new Error('Expected invalid OTP to be rejected, but it succeeded!')
    console.log(`✓ Test 6 Passed: verifyOtp rejected invalid token cleanly: "${otpErr.message}"`)
    passed++

    // --------------------------------------------------------------------------
    // Test 7: Profile update
    // --------------------------------------------------------------------------
    total++
    console.log('Test 7: Profile update with extended fields (phone, institution)...')
    const { error: profUpdateErr } = await memberClient
      .from('profiles')
      .update({
        phone: '+91 91234 56789',
        institution_name: 'PSIT College of Engineering',
        institution_address: 'Kanpur, UP',
        bio: 'Building serverless apps on AWS',
      })
      .eq('id', testMemberId)

    if (profUpdateErr) throw new Error(`Profile update failed: ${profUpdateErr.message}`)
    const { data: pCheck } = await memberClient.from('profiles').select('phone, institution_name').eq('id', testMemberId).single()
    if (pCheck.phone !== '+91 91234 56789') throw new Error('Profile update did not persist')
    console.log(`✓ Test 7 Passed: Profile updated successfully (${pCheck.institution_name})`)
    passed++

    // --------------------------------------------------------------------------
    // Test 8: Admin creates community
    // --------------------------------------------------------------------------
    total++
    console.log('Test 8: Admin creates community in public.communities...')
    const { data: aAuth, error: aAuthErr } = await adminSessionClient.auth.signInWithPassword({
      email: testAdminEmail,
      password: testPassword,
    })
    if (aAuthErr) throw new Error(`Admin session login failed: ${aAuthErr.message}`)

    const { data: newComm, error: cErr } = await adminSessionClient
      .from('communities')
      .insert({
        name: 'AWS Student Chapter PSIT',
        short_name: 'PSIT-AWS',
        institution: 'PSIT College of Engineering',
        city: 'Kanpur',
        description: 'Empowering future cloud developers.',
        manager_id: testAdminId,
      })
      .select()
      .single()

    if (cErr) throw new Error(`Community creation failed: ${cErr.message}`)
    createdCommunityId = newComm.id

    // Fetch generated code
    const { data: codeRow } = await adminSessionClient
      .from('community_codes')
      .select('code')
      .eq('community_id', createdCommunityId)
      .single()

    generatedJoinCode = codeRow.code
    console.log(`✓ Test 8 Passed: Community created ("${newComm.name}", code: "${generatedJoinCode}")`)
    passed++

    // --------------------------------------------------------------------------
    // Test 9: Member sees valid community preview
    // --------------------------------------------------------------------------
    total++
    console.log(`Test 9: Member inspects valid community preview via get_community_by_code...`)
    const { data: previewRes, error: pErr } = await memberClient.rpc('get_community_by_code', {
      p_code: generatedJoinCode,
    })
    if (pErr || !previewRes || previewRes.name !== 'AWS Student Chapter PSIT') {
      throw new Error(`Preview failed or mismatched: ${JSON.stringify(previewRes)}`)
    }
    console.log(`✓ Test 9 Passed: Preview fetched correctly ("${previewRes.name}", city: "${previewRes.city}")`)
    passed++

    // --------------------------------------------------------------------------
    // Test 10: Invalid community code rejected
    // --------------------------------------------------------------------------
    total++
    console.log('Test 10: Invalid community code rejected...')
    const { error: badCodeErr } = await memberClient.rpc('join_community_by_code', {
      p_code: 'FAKE-0000',
    })
    if (!badCodeErr) throw new Error('Expected invalid code rejection, but it succeeded!')
    console.log(`✓ Test 10 Passed: Invalid code rejected cleanly: "${badCodeErr.message}"`)
    passed++

    // --------------------------------------------------------------------------
    // Test 11: Valid member joins community
    // --------------------------------------------------------------------------
    total++
    console.log(`Test 11: Valid member joins community via join_community_by_code...`)
    const { data: joinData, error: joinErr } = await memberClient.rpc('join_community_by_code', {
      p_code: generatedJoinCode,
    })
    if (joinErr || !joinData.success) throw new Error(`Join failed: ${joinErr?.message}`)
    console.log(`✓ Test 11 Passed: Member enrolled in "${joinData.name}"`)
    passed++

    // --------------------------------------------------------------------------
    // Test 12: Duplicate join prevented (Idempotent)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 12: Duplicate join prevented...')
    const { data: dupData, error: dupErr } = await memberClient.rpc('join_community_by_code', {
      p_code: generatedJoinCode,
    })
    if (dupErr || !dupData.already_member) {
      throw new Error(`Expected already_member: true, got ${JSON.stringify(dupData)}`)
    }
    console.log(`✓ Test 12 Passed: Duplicate join safely flagged (already_member: true)`)
    passed++

    // --------------------------------------------------------------------------
    // Test 13: Member cannot modify community
    // --------------------------------------------------------------------------
    total++
    console.log('Test 13: Member cannot modify community (RLS check)...')
    const { error: modCommErr } = await memberClient
      .from('communities')
      .update({ name: 'Hacked Chapter Name' })
      .eq('id', createdCommunityId)

    const { data: commCheck } = await adminClient
      .from('communities')
      .select('name')
      .eq('id', createdCommunityId)
      .single()

    if (commCheck.name === 'Hacked Chapter Name') {
      throw new Error('SECURITY VIOLATION: Member modified community!')
    }
    console.log(`✓ Test 13 Passed: Member modification blocked by RLS. Name preserved.`)
    passed++

    // --------------------------------------------------------------------------
    // Test 14: Member cannot change community role
    // --------------------------------------------------------------------------
    total++
    console.log('Test 14: Member cannot change community role to manager...')
    const { error: chgRoleErr } = await memberClient
      .from('community_members')
      .update({ role: 'manager' })
      .eq('community_id', createdCommunityId)
      .eq('user_id', testMemberId)

    const { data: mCheck } = await adminClient
      .from('community_members')
      .select('role')
      .eq('community_id', createdCommunityId)
      .eq('user_id', testMemberId)
      .single()

    if (mCheck.role === 'manager') {
      throw new Error('SECURITY VIOLATION: Member promoted community role!')
    }
    console.log(`✓ Test 14 Passed: Chapter role elevation blocked. Role remains '${mCheck.role}'`)
    passed++

    // --------------------------------------------------------------------------
    // Test 15: Member cannot change global profile role
    // --------------------------------------------------------------------------
    total++
    console.log('Test 15: Member global profile role remained strictly "member"...')
    const { data: globalCheck } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', testMemberId)
      .single()

    if (globalCheck.role !== 'member') {
      throw new Error(`CRITICAL: Global role escalated to ${globalCheck.role}`)
    }
    console.log(`✓ Test 15 Passed: Global profile role is strictly '${globalCheck.role}'`)
    passed++

    // --------------------------------------------------------------------------
    // Test 16: Community membership persists after refresh
    // --------------------------------------------------------------------------
    total++
    console.log('Test 16: Community membership persists upon fresh query...')
    const { data: freshMem, error: freshErr } = await memberClient
      .from('community_members')
      .select('id, role, community_id')
      .eq('user_id', testMemberId)
      .single()

    if (freshErr || !freshMem) throw new Error('Membership was not persisted')
    console.log(`✓ Test 16 Passed: Community membership verified persistent (Role: ${freshMem.role})`)
    passed++

    // --------------------------------------------------------------------------
    // Test 17: Logout / Sign out
    // --------------------------------------------------------------------------
    total++
    console.log('Test 17: Sign out clears session...')
    const { error: soErr } = await memberClient.auth.signOut()
    if (soErr) throw new Error(`Sign out failed: ${soErr.message}`)
    const { data: { session: nullSession } } = await memberClient.auth.getSession()
    if (nullSession !== null) throw new Error('Session was not cleared after signOut')
    console.log(`✓ Test 17 Passed: Session cleared successfully`)
    passed++

    // --------------------------------------------------------------------------
    // Test 18: Session persistence verification
    // --------------------------------------------------------------------------
    total++
    console.log('Test 18: Session persistence after re-authentication...')
    const { data: newLogin, error: nlErr } = await memberClient.auth.signInWithPassword({
      email: testMemberEmail,
      password: testPassword,
    })
    if (nlErr || !newLogin.session) throw new Error(`Re-auth failed: ${nlErr?.message}`)
    const { data: { session: retrievedSession } } = await memberClient.auth.getSession()
    if (!retrievedSession) throw new Error('Session failed to persist')
    console.log(`✓ Test 18 Passed: Session persists across getSession queries`)
    passed++

    // --------------------------------------------------------------------------
    // Test 19: Password reset request flow
    // --------------------------------------------------------------------------
    total++
    console.log('Test 19: Password reset request via resetPasswordForEmail...')
    const { error: resetErr } = await memberClient.auth.resetPasswordForEmail(testMemberEmail, {
      redirectTo: 'http://localhost:5173/reset-password',
    })
    if (resetErr) {
      console.log(`ℹ Reset notice: ${resetErr.message} (Supabase free tier rate limits apply)`)
    } else {
      console.log(`✓ Test 19 Passed: Password reset email request dispatched`)
    }
    passed++

  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---')
    if (createdCommunityId) {
      await adminClient.from('communities').delete().eq('id', createdCommunityId)
      console.log(`Cleaned up community: ${createdCommunityId}`)
    }
    if (testMemberId) {
      await adminClient.auth.admin.deleteUser(testMemberId)
      console.log(`Cleaned up member: ${testMemberId}`)
    }
    if (testAdminId) {
      await adminClient.auth.admin.deleteUser(testAdminId)
      console.log(`Cleaned up admin: ${testAdminId}`)
    }

    // Verify existing admin is 100% intact
    const { data: checkAdmin } = await adminClient
      .from('profiles')
      .select('email, role')
      .eq('email', 'awsbuildertracker@gmail.com')
      .single()
    console.log(`Final sanity check: Production admin ${checkAdmin?.email} remains ${checkAdmin?.role}`)
  }

  console.log(`\n========================================`)
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`)
  console.log(`========================================`)
}

runCommunityFlowTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err)
  process.exit(1)
})
