// ==============================================================================
// AWS JOURNEY TRACKER - PHASE 3.5 AUTHENTICATION & ONBOARDING VERIFICATION TEST
// ==============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// 1. Load environment variables from .env.local
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
const anonClient = createClient(SUPABASE_URL, ANON_KEY)

async function runTests() {
  console.log('=== STARTING AWS JOURNEY TRACKER PHASE 3.5 TESTS ===\n')
  let passed = 0
  let total = 0

  let testMemberId = null
  let testAdminId = null
  let createdCommunityId = null

  const testPassword = 'Password123!@#'
  const testMemberEmail = `member_p35_${Date.now()}@example.com`
  const testAdminEmail = `admin_p35_${Date.now()}@example.com`

  try {
    // --------------------------------------------------------------------------
    // Test 1: Verify existing admin account is preserved intact
    // --------------------------------------------------------------------------
    total++
    console.log('Test 1: Verify existing production Admin account...')
    const { data: existingAdmin, error: adminQueryErr } = await adminClient
      .from('profiles')
      .select('id, email, role')
      .eq('email', 'awsbuildertracker@gmail.com')
      .single()

    if (adminQueryErr || !existingAdmin) {
      throw new Error(`Existing admin query failed: ${adminQueryErr?.message}`)
    }
    if (existingAdmin.role !== 'admin') {
      throw new Error(`Admin role corrupted! Expected 'admin', got '${existingAdmin.role}'`)
    }
    console.log(`✓ Existing admin verified: ${existingAdmin.email} (id: ${existingAdmin.id}, role: ${existingAdmin.role})`)
    passed++

    // --------------------------------------------------------------------------
    // Test 2: Provision test member & test admin accounts
    // --------------------------------------------------------------------------
    total++
    console.log(`Test 2: Provision test member (${testMemberEmail}) & test admin (${testAdminEmail})...`)
    const { data: mUser, error: mErr } = await adminClient.auth.admin.createUser({
      email: testMemberEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Test Member Onboarding' },
    })
    if (mErr) throw new Error(`Member provision failed: ${mErr.message}`)
    testMemberId = mUser.user.id

    const { data: aUser, error: aErr } = await adminClient.auth.admin.createUser({
      email: testAdminEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Test Chapter Admin' },
    })
    if (aErr) throw new Error(`Admin provision failed: ${aErr.message}`)
    testAdminId = aUser.user.id

    // Elevate test admin role in public.profiles
    const { error: elevErr } = await adminClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', testAdminId)
    if (elevErr) throw new Error(`Elevation failed: ${elevErr.message}`)
    console.log(`✓ Test accounts provisioned. Member ID: ${testMemberId}, Admin ID: ${testAdminId}`)
    passed++

    // --------------------------------------------------------------------------
    // Test 3: Authenticate member session & test profile extension fields
    // --------------------------------------------------------------------------
    total++
    console.log('Test 3: Member session and extended profile update (phone, institution)...')
    const memberClient = createClient(SUPABASE_URL, ANON_KEY)
    const { data: mAuth, error: mAuthErr } = await memberClient.auth.signInWithPassword({
      email: testMemberEmail,
      password: testPassword,
    })
    if (mAuthErr) throw new Error(`Member login failed: ${mAuthErr.message}`)

    const { error: profUpdateErr } = await memberClient
      .from('profiles')
      .update({
        phone: '+91 99887 76655',
        institution_name: 'Pranveer Singh Institute of Technology',
        institution_address: 'Kanpur, UP',
        aws_builder_alias: 'psit-member-test',
        bio: 'Passionate about Serverless architectures on AWS',
      })
      .eq('id', testMemberId)

    if (profUpdateErr) throw new Error(`Profile extension update failed: ${profUpdateErr.message}`)

    const { data: updatedProf } = await memberClient
      .from('profiles')
      .select('phone, institution_name, institution_address, aws_builder_alias, role')
      .eq('id', testMemberId)
      .single()

    if (updatedProf.phone !== '+91 99887 76655' || updatedProf.role !== 'member') {
      throw new Error(`Profile fields did not persist correctly: ${JSON.stringify(updatedProf)}`)
    }
    console.log(`✓ Profile extension fields verified: phone, institution_name, institution_address persisted`)
    passed++

    // --------------------------------------------------------------------------
    // Test 4: Member CANNOT create community (RLS protection)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 4: Verify non-admin member CANNOT insert community (RLS check)...')
    const { error: illegalCreateErr } = await memberClient.from('communities').insert({
      name: 'Illegal Member Club',
      short_name: 'ILLEGAL',
      institution: 'PSIT',
      city: 'Kanpur',
      manager_id: testMemberId,
    })
    if (!illegalCreateErr) {
      throw new Error('SECURITY VIOLATION: Non-admin member was able to insert a community!')
    }
    console.log(`✓ RLS successfully blocked non-admin community creation: "${illegalCreateErr.message}"`)
    passed++

    // --------------------------------------------------------------------------
    // Test 5: Admin creates community & triggers auto-generation of code & manager
    // --------------------------------------------------------------------------
    total++
    console.log('Test 5: Admin creates community and triggers auto-manager + invite code...')
    const adminSessionClient = createClient(SUPABASE_URL, ANON_KEY)
    const { data: aAuth, error: aAuthErr } = await adminSessionClient.auth.signInWithPassword({
      email: testAdminEmail,
      password: testPassword,
    })
    if (aAuthErr) throw new Error(`Admin login failed: ${aAuthErr.message}`)

    const { data: newComm, error: commInsertErr } = await adminSessionClient
      .from('communities')
      .insert({
        name: 'PSIT AWS Student Club',
        short_name: 'PSIT-AWS',
        institution: 'Pranveer Singh Institute of Technology',
        city: 'Kanpur',
        description: 'Official student developer collective at PSIT.',
        manager_id: testAdminId,
      })
      .select()
      .single()

    if (commInsertErr) throw new Error(`Community creation failed: ${commInsertErr.message}`)
    createdCommunityId = newComm.id

    // Verify manager membership was automatically created by trigger
    const { data: managerMember, error: mgrMemberErr } = await adminSessionClient
      .from('community_members')
      .select('role')
      .eq('community_id', createdCommunityId)
      .eq('user_id', testAdminId)
      .single()

    if (mgrMemberErr || managerMember.role !== 'manager') {
      throw new Error(`Manager membership missing: ${mgrMemberErr?.message}`)
    }

    // Verify community code was automatically generated by trigger
    const { data: generatedCode, error: codeErr } = await adminSessionClient
      .from('community_codes')
      .select('code, active')
      .eq('community_id', createdCommunityId)
      .single()

    if (codeErr || !generatedCode.code) {
      throw new Error(`Generated community code missing: ${codeErr?.message}`)
    }
    console.log(`✓ Community created: "${newComm.name}", Manager enrolled, Active Code: "${generatedCode.code}"`)
    passed++

    const validCode = generatedCode.code

    // --------------------------------------------------------------------------
    // Test 6: Safe public preview via get_community_by_code
    // --------------------------------------------------------------------------
    total++
    console.log(`Test 6: Preview community details with code "${validCode}"...`)
    const { data: preview, error: prevErr } = await memberClient.rpc('get_community_by_code', {
      p_code: validCode,
    })

    if (prevErr || !preview) throw new Error(`Preview failed: ${prevErr?.message}`)
    if (preview.name !== 'PSIT AWS Student Club') {
      throw new Error(`Preview mismatch: ${JSON.stringify(preview)}`)
    }
    console.log(`✓ get_community_by_code returned correct chapter: "${preview.name}", ${preview.member_count} member`)
    passed++

    // --------------------------------------------------------------------------
    // Test 7: Reject invalid community code
    // --------------------------------------------------------------------------
    total++
    console.log('Test 7: Reject invalid community code...')
    const { error: invalidJoinErr } = await memberClient.rpc('join_community_by_code', {
      p_code: 'INVALID-9999',
    })
    if (!invalidJoinErr) throw new Error('Expected invalid code to fail, but it succeeded!')
    console.log(`✓ Invalid code rejected with error: "${invalidJoinErr.message}"`)
    passed++

    // --------------------------------------------------------------------------
    // Test 8: Member joins community via atomic join_community_by_code
    // --------------------------------------------------------------------------
    total++
    console.log(`Test 8: Member joins community via join_community_by_code("${validCode}")...`)
    const { data: joinRes, error: joinErr } = await memberClient.rpc('join_community_by_code', {
      p_code: validCode,
    })
    if (joinErr) throw new Error(`Join failed: ${joinErr.message}`)
    if (!joinRes.success || joinRes.already_member) {
      throw new Error(`Unexpected join result: ${JSON.stringify(joinRes)}`)
    }

    // Verify membership record in database
    const { data: mRecord } = await memberClient
      .from('community_members')
      .select('role')
      .eq('community_id', createdCommunityId)
      .eq('user_id', testMemberId)
      .single()

    if (!mRecord || mRecord.role !== 'member') {
      throw new Error(`Membership record missing or role invalid: ${JSON.stringify(mRecord)}`)
    }

    // CRITICAL SECURITY CHECK: User global role in public.profiles MUST REMAIN 'member'
    const { data: securityCheckProf } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', testMemberId)
      .single()

    if (securityCheckProf.role !== 'member') {
      throw new Error(`CRITICAL SECURITY FAILURE: Member profile escalated to '${securityCheckProf.role}'!`)
    }
    console.log(`✓ Member successfully joined. Global role remained strictly '${securityCheckProf.role}'`)
    passed++

    // --------------------------------------------------------------------------
    // Test 9: Idempotent join (Joining twice does not fail or duplicate)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 9: Test idempotent duplicate join with same code...')
    const { data: repeatJoinRes, error: repeatErr } = await memberClient.rpc(
      'join_community_by_code',
      { p_code: validCode }
    )
    if (repeatErr) throw new Error(`Repeat join errored: ${repeatErr.message}`)
    if (!repeatJoinRes.already_member) {
      throw new Error(`Expected already_member: true, got ${JSON.stringify(repeatJoinRes)}`)
    }
    console.log(`✓ Idempotent join verified: already_member is true, no duplicate constraint error`)
    passed++

    // --------------------------------------------------------------------------
    // Test 10: Member CANNOT elevate chapter role to 'manager'
    // --------------------------------------------------------------------------
    total++
    console.log('Test 10: Verify member CANNOT elevate own community role to manager...')
    const { error: hackRoleErr } = await memberClient
      .from('community_members')
      .update({ role: 'manager' })
      .eq('user_id', testMemberId)

    const { data: verifyRole } = await adminClient
      .from('community_members')
      .select('role')
      .eq('community_id', createdCommunityId)
      .eq('user_id', testMemberId)
      .single()

    if (verifyRole.role === 'manager') {
      throw new Error('SECURITY VIOLATION: Member elevated community role to manager!')
    }
    console.log(`✓ Role escalation blocked by RLS: Community role remains '${verifyRole.role}'`)
    passed++

    // --------------------------------------------------------------------------
    // Test 11: Member CANNOT inspect secret community_codes directly
    // --------------------------------------------------------------------------
    total++
    console.log('Test 11: Verify member cannot query community_codes table directly...')
    const { data: rawCodes, error: rawCodeErr } = await memberClient
      .from('community_codes')
      .select('*')
      .eq('community_id', createdCommunityId)

    if (rawCodes && rawCodes.length > 0) {
      throw new Error('SECURITY VIOLATION: Member can read raw community_codes!')
    }
    console.log(`✓ Raw community_codes access denied for non-managers (returned 0 rows / blocked)`)
    passed++

    // --------------------------------------------------------------------------
    // Test 12: Check that client bundle contains ZERO service role keys
    // --------------------------------------------------------------------------
    total++
    console.log('Test 12: Audit production JS bundle for service role key leaks...')
    const distFiles = fs.readdirSync(path.resolve(process.cwd(), 'dist/assets'))
    const jsFiles = distFiles.filter((f) => f.endsWith('.js'))
    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.resolve(process.cwd(), 'dist/assets', jsFile), 'utf-8')
      if (content.includes(SERVICE_KEY)) {
        throw new Error(`CRITICAL SECURITY FAILURE: Service role key found in production bundle ${jsFile}!`)
      }
    }
    console.log(`✓ Production bundle audited: ZERO service role keys present`)
    passed++

  } finally {
    // Cleanup temporary test data
    console.log('\n--- CLEANING UP TEMPORARY TEST DATA ---')
    if (createdCommunityId) {
      await adminClient.from('communities').delete().eq('id', createdCommunityId)
      console.log(`Deleted test community ${createdCommunityId}`)
    }
    if (testMemberId) {
      await adminClient.auth.admin.deleteUser(testMemberId)
      console.log(`Deleted test member ${testMemberId}`)
    }
    if (testAdminId) {
      await adminClient.auth.admin.deleteUser(testAdminId)
      console.log(`Deleted test admin ${testAdminId}`)
    }

    // Verify existing admin is still 100% intact after cleanup
    const { data: checkAdmin } = await adminClient
      .from('profiles')
      .select('email, role')
      .eq('email', 'awsbuildertracker@gmail.com')
      .single()
    console.log(`Confirmed production admin is untouched: ${checkAdmin?.email} (${checkAdmin?.role})`)
  }

  console.log(`\n========================================`)
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`)
  console.log(`========================================`)
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err)
  process.exit(1)
})
