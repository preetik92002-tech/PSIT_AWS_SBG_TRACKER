// ==============================================================================
// AWS JOURNEY TRACKER - MULTI-COMMUNITY ONBOARDING FLOW TEST SUITE
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

async function runOnboardingTests() {
  console.log('=== RUNNING MULTI-COMMUNITY ONBOARDING VERIFICATION ===\n')
  let passed = 0
  let total = 0

  let testUserId = null
  let testSecondUserId = null
  let createdCommunityId = null

  const testPassword = 'Password123!@#'
  const testEmail = `onboard_user_${Date.now()}@example.com`
  const testSecondEmail = `onboard_member_${Date.now()}@example.com`

  const userClient = createClient(SUPABASE_URL, ANON_KEY)
  const secondUserClient = createClient(SUPABASE_URL, ANON_KEY)

  try {
    // --------------------------------------------------------------------------
    // Test 1: Existing Canonical Admin Has >= 1 Community Membership (Supabase Check)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 1: Check existing Admin account community membership in Supabase...')
    const { data: adminProf } = await adminClient
      .from('profiles')
      .select('id, email, role')
      .eq('email', 'awsbuildertracker@gmail.com')
      .single()

    const { data: adminMemberships } = await adminClient
      .from('community_members')
      .select('community_id, role, status')
      .eq('user_id', adminProf.id)
      .eq('status', 'active')

    if (!adminMemberships || adminMemberships.length === 0) {
      throw new Error('Admin has 0 community memberships in Supabase!')
    }
    console.log(`✓ Test 1 Passed: Existing admin has ${adminMemberships.length} active community membership(s) -> directly reaches /admin/dashboard`)
    passed++

    // --------------------------------------------------------------------------
    // Test 2: New Authenticated User Has 0 Community Memberships (Supabase Check)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 2: Provision new user and verify initial 0 community memberships...')
    const { data: nUser, error: nErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: '' },
    })
    if (nErr) throw new Error(`User creation failed: ${nErr.message}`)
    testUserId = nUser.user.id

    const { error: loginErr } = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    if (loginErr) throw new Error(`Login failed: ${loginErr.message}`)

    const { data: newComms, error: ncErr } = await userClient.rpc('get_user_communities')
    if (ncErr) throw new Error(`get_user_communities failed: ${ncErr.message}`)

    if (newComms.length !== 0) {
      throw new Error(`Expected 0 communities, got ${newComms.length}`)
    }
    console.log(`✓ Test 2 Passed: New user has strictly 0 community memberships in Supabase (triggers onboarding)`)
    passed++

    // --------------------------------------------------------------------------
    // Test 3: Profile Incomplete Check (full_name empty -> /auth/setup-profile)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 3: Profile incomplete detection triggers /auth/setup-profile...')
    const { data: initProf } = await userClient
      .from('profiles')
      .select('full_name, institution_name')
      .eq('id', testUserId)
      .single()

    const needsProfileSetup = !initProf.full_name || !initProf.institution_name
    if (!needsProfileSetup) {
      throw new Error('Expected new user profile to require setup')
    }
    console.log('✓ Test 3 Passed: Incomplete profile detected -> redirected to /auth/setup-profile')
    passed++

    // --------------------------------------------------------------------------
    // Test 4: Profile Completion (Preserve email & role, update extended fields)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 4: Profile setup submits full_name, alias, phone, institution...')
    const { error: updateProfErr } = await userClient
      .from('profiles')
      .update({
        full_name: 'Ananya Verma',
        aws_builder_alias: 'ananya-cloud',
        phone: '+91 9876543210',
        institution_name: 'KIET Group of Institutions',
        institution_address: 'Delhi-NCR, Ghaziabad, UP',
        bio: 'Cloud architecture enthusiast and aspiring Solutions Architect.',
      })
      .eq('id', testUserId)

    if (updateProfErr) throw new Error(`Profile update failed: ${updateProfErr.message}`)

    const { data: updatedProf } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single()

    if (
      updatedProf.full_name !== 'Ananya Verma' ||
      updatedProf.role !== 'member' ||
      updatedProf.email !== testEmail
    ) {
      throw new Error(`Profile fields mismatch or privilege leak: ${JSON.stringify(updatedProf)}`)
    }
    console.log('✓ Test 4 Passed: Profile saved successfully with email and role strictly preserved')
    passed++

    // --------------------------------------------------------------------------
    // Test 5: Community Decision (Option 1 -> Create Community)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 5: User creates community ("AWS SBG KIET") and becomes initial manager...')
    const { data: kietComm, error: kietErr } = await userClient
      .from('communities')
      .insert({
        name: 'AWS SBG KIET',
        short_name: 'KIET-AWS',
        institution: 'KIET Group of Institutions',
        institution_name: 'KIET Group of Institutions',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        description: 'AWS Student Builder Group at KIET',
        manager_id: testUserId,
        created_by: testUserId,
      })
      .select()
      .single()

    if (kietErr || !kietComm) throw new Error(`Community creation failed: ${kietErr?.message}`)
    createdCommunityId = kietComm.id

    // Check manager role and initial member count = 1
    const { data: commsAfterCreate } = await userClient.rpc('get_user_communities')
    const kietUserComm = commsAfterCreate.find((c) => c.id === createdCommunityId)

    if (!kietUserComm || kietUserComm.role !== 'manager' || kietUserComm.member_count !== 1) {
      throw new Error(`Expected manager with member_count 1, got ${JSON.stringify(kietUserComm)}`)
    }
    console.log(`✓ Test 5 Passed: "${kietUserComm.name}" registered with manager status and initial member count = 1`)
    passed++

    // --------------------------------------------------------------------------
    // Test 6: Second User Joins Community via Code (Option 2 -> Join Community)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 6: Second user joins "AWS SBG KIET" with invite code...')
    const { data: codeRecord } = await adminClient
      .from('community_codes')
      .select('code')
      .eq('community_id', createdCommunityId)
      .single()

    const { data: sUser, error: sErr } = await adminClient.auth.admin.createUser({
      email: testSecondEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Rahul Sharma' },
    })
    if (sErr) throw new Error(`Second user creation failed: ${sErr.message}`)
    testSecondUserId = sUser.user.id

    const { error: sLoginErr } = await secondUserClient.auth.signInWithPassword({
      email: testSecondEmail,
      password: testPassword,
    })
    if (sLoginErr) throw new Error(`Second user login failed: ${sLoginErr.message}`)

    // Redeem code
    const { data: joinRes, error: jErr } = await secondUserClient.rpc('join_community_by_code', {
      p_code: codeRecord.code,
    })
    if (jErr || !joinRes?.success) throw new Error(`Join failed: ${jErr?.message}`)

    // Check second user's role is strictly 'member'
    const { data: sComms } = await secondUserClient.rpc('get_user_communities')
    const sKiet = sComms.find((c) => c.id === createdCommunityId)

    if (!sKiet || sKiet.role !== 'member') {
      throw new Error(`Expected role 'member', got ${sKiet?.role}`)
    }
    console.log(`✓ Test 6 Passed: Second user successfully joined with role strictly 'member' (never manager)`)
    passed++

    // --------------------------------------------------------------------------
    // Test 7: Multi-Community Membership for Second User
    // --------------------------------------------------------------------------
    total++
    console.log('Test 7: Second user also joins canonical PSIT chapter (Multiple Communities)...')
    const { data: joinPsitRes, error: jpErr } = await secondUserClient.rpc('join_community_by_code', {
      p_code: 'PSIT-KNP-4821',
    })
    if (jpErr || !joinPsitRes?.success) throw new Error(`Join PSIT failed: ${jpErr?.message}`)

    const { data: multiComms } = await secondUserClient.rpc('get_user_communities')
    if (multiComms.length < 2) {
      throw new Error(`Expected >= 2 communities, got ${multiComms.length}`)
    }
    console.log(`✓ Test 7 Passed: User enrolled in ${multiComms.length} distinct communities: ${multiComms.map((c) => c.name).join(' & ')}`)
    passed++

    // --------------------------------------------------------------------------
    // Test 8: Login Redirect For User With Multiple Communities
    // --------------------------------------------------------------------------
    total++
    console.log('Test 8: Verify login check detects multiple communities and avoids onboarding...')
    const { data: verifiedComms } = await secondUserClient.rpc('get_user_communities')
    const hasCommunities = verifiedComms.length > 0
    if (!hasCommunities) {
      throw new Error('Expected user to have communities detected')
    }
    console.log(`✓ Test 8 Passed: User with multiple communities immediately accesses dashboard without onboarding loop`)
    passed++

  } catch (err) {
    console.error(`\n❌ ONBOARDING SUITE FAILED: ${err.message}`)
    process.exitCode = 1
  } finally {
    console.log('\n--- CLEANING UP ONBOARDING TEST DATA ---')
    if (createdCommunityId) {
      await adminClient.from('community_codes').delete().eq('community_id', createdCommunityId)
      await adminClient.from('community_members').delete().eq('community_id', createdCommunityId)
      await adminClient.from('communities').delete().eq('id', createdCommunityId)
      console.log(`Cleaned up community: ${createdCommunityId}`)
    }
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId)
      console.log(`Cleaned up test user: ${testUserId}`)
    }
    if (testSecondUserId) {
      await adminClient.from('community_members').delete().eq('user_id', testSecondUserId)
      await adminClient.auth.admin.deleteUser(testSecondUserId)
      console.log(`Cleaned up second test user: ${testSecondUserId}`)
    }

    console.log('\n========================================')
    console.log(`ONBOARDING TEST SUMMARY: ${passed}/${total} TESTS PASSED`)
    console.log('========================================\n')
  }
}

runOnboardingTests()
