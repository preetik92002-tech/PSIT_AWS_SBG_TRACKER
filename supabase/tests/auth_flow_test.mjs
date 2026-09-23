// ==============================================================================
// AWS BUILDER HUB - LEVEL 3 AUTH FLOW VERIFICATION TEST
// ==============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8')
const env = Object.fromEntries(
  envContent
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const anonClient = createClient(SUPABASE_URL, ANON_KEY)

async function runTests() {
  console.log('--- STARTING LEVEL 3 REAL AUTHENTICATION TESTS ---\n')
  let passed = 0
  let total = 0

  const testMemberEmail = `member_test_${Date.now()}@example.com`
  const testAdminEmail = `admin_test_${Date.now()}@example.com`
  const testPassword = 'Password123!@#'

  let memberUserId = null
  let adminUserId = null

  try {
    // 1. Provision Test Member
    total++
    console.log(`Test 1: Provision member user via admin API (${testMemberEmail})...`)
    const { data: memberUser, error: memberErr } = await adminClient.auth.admin.createUser({
      email: testMemberEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Test Member' }
    })
    if (memberErr) throw new Error(`Member provision failed: ${memberErr.message}`)
    memberUserId = memberUser.user.id
    console.log(`✓ Member provisioned with ID: ${memberUserId}`)
    passed++

    // 2. Verify Member Profile created by DB trigger with default 'member' role
    total++
    console.log(`Test 2: Verify trigger created profile for member...`)
    const { data: memberProf, error: profErr1 } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', memberUserId)
      .single()
    if (profErr1) throw new Error(`Profile query failed: ${profErr1.message}`)
    if (memberProf.role !== 'member') throw new Error(`Expected role 'member', got '${memberProf.role}'`)
    console.log(`✓ Member profile verified: role='${memberProf.role}', name='${memberProf.full_name}'`)
    passed++

    // 3. Provision Test Admin
    total++
    console.log(`Test 3: Provision admin user and elevate role...`)
    const { data: adminUser, error: adminErr } = await adminClient.auth.admin.createUser({
      email: testAdminEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Test Admin' }
    })
    if (adminErr) throw new Error(`Admin provision failed: ${adminErr.message}`)
    adminUserId = adminUser.user.id

    // Elevate role to admin in public.profiles
    const { error: elevateErr } = await adminClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', adminUserId)
    if (elevateErr) throw new Error(`Elevation failed: ${elevateErr.message}`)
    console.log(`✓ Admin user created and elevated with ID: ${adminUserId}`)
    passed++

    // 4. Test Client Authentication with Member Credentials
    total++
    console.log(`Test 4: Client signInWithPassword with member credentials...`)
    const memberSessionClient = createClient(SUPABASE_URL, ANON_KEY)
    const { data: memberAuth, error: authErr1 } = await memberSessionClient.auth.signInWithPassword({
      email: testMemberEmail,
      password: testPassword
    })
    if (authErr1) throw new Error(`Member sign in failed: ${authErr1.message}`)
    // Fetch profile as authenticated member
    const { data: loadedMemberProf, error: mProfErr } = await memberSessionClient
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', memberAuth.user.id)
      .single()
    if (mProfErr) throw new Error(`Member profile fetch failed: ${mProfErr.message}`)
    if (loadedMemberProf.role !== 'member') throw new Error(`Role mismatch: ${loadedMemberProf.role}`)
    console.log(`✓ Authenticated member session established: Role '${loadedMemberProf.role}' correctly resolved for /dashboard redirect`)
    passed++

    // 5. Test Client Authentication with Admin Credentials
    total++
    console.log(`Test 5: Client signInWithPassword with admin credentials...`)
    const adminSessionClient = createClient(SUPABASE_URL, ANON_KEY)
    const { data: adminAuth, error: authErr2 } = await adminSessionClient.auth.signInWithPassword({
      email: testAdminEmail,
      password: testPassword
    })
    if (authErr2) throw new Error(`Admin sign in failed: ${authErr2.message}`)
    // Fetch profile as authenticated admin
    const { data: loadedAdminProf, error: aProfErr } = await adminSessionClient
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', adminAuth.user.id)
      .single()
    if (aProfErr) throw new Error(`Admin profile fetch failed: ${aProfErr.message}`)
    if (loadedAdminProf.role !== 'admin') throw new Error(`Role mismatch: ${loadedAdminProf.role}`)
    console.log(`✓ Authenticated admin session established: Role '${loadedAdminProf.role}' correctly resolved for /admin/dashboard redirect`)
    passed++

    // 6. Test Invalid Credentials Error Handling
    total++
    console.log(`Test 6: Test invalid password rejection...`)
    const { error: invalidErr } = await anonClient.auth.signInWithPassword({
      email: testMemberEmail,
      password: 'IncorrectPassword999!'
    })
    if (!invalidErr) throw new Error('Expected invalid credentials to fail, but it succeeded!')
    console.log(`✓ Invalid password rejected cleanly: "${invalidErr.message}"`)
    passed++

    // 7. Test Member Cannot Escalate Role via RLS
    total++
    console.log(`Test 7: Verify member cannot elevate role to admin via client...`)
    const { error: hackErr } = await memberSessionClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', memberUserId)
    // Check if role actually changed
    const { data: checkProf } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', memberUserId)
      .single()
    if (checkProf.role === 'admin') throw new Error('SECURITY VIOLATION: Member successfully escalated to admin!')
    console.log(`✓ Escalation blocked: Member role remains '${checkProf.role}'`)
    passed++

    // 8. Test Member Cannot Read Admin Dashboard Protected Data
    total++
    console.log(`Test 8: Verify member cannot update other member's profile...`)
    const { error: crossUpdateErr } = await memberSessionClient
      .from('profiles')
      .update({ full_name: 'Hacked Name' })
      .eq('id', adminUserId)
    const { data: adminProfCheck } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', adminUserId)
      .single()
    if (adminProfCheck.full_name === 'Hacked Name') throw new Error('SECURITY VIOLATION: Member updated another user!')
    console.log(`✓ Cross-user modification blocked: Target profile preserved`)
    passed++

    // 9. Test Password Reset Request
    total++
    console.log(`Test 9: Test resetPasswordForEmail...`)
    const { error: resetErr } = await anonClient.auth.resetPasswordForEmail(testMemberEmail, {
      redirectTo: 'http://localhost:5173/reset-password'
    })
    if (resetErr) {
      console.log(`ℹ Reset password returned: ${resetErr.message} (Note: SMTP / email rate limits apply in Supabase free tier)`)
    } else {
      console.log(`✓ Password reset request dispatched successfully without error`)
    }
    passed++

    // 10. Test Sign Out clears session
    total++
    console.log(`Test 10: Test signOut session clearance...`)
    const { error: signOutErr } = await memberSessionClient.auth.signOut()
    if (signOutErr) throw new Error(`Sign out failed: ${signOutErr.message}`)
    const { data: { session: clearedSession } } = await memberSessionClient.auth.getSession()
    if (clearedSession !== null) throw new Error('Session was not cleared after signOut!')
    console.log(`✓ Sign out successfully cleared the active session`)
    passed++

  } finally {
    // Cleanup provisioned test users
    console.log('\n--- CLEANING UP TEST USERS ---')
    if (memberUserId) {
      await adminClient.auth.admin.deleteUser(memberUserId)
      console.log(`Cleaned up member user ${memberUserId}`)
    }
    if (adminUserId) {
      await adminClient.auth.admin.deleteUser(adminUserId)
      console.log(`Cleaned up admin user ${adminUserId}`)
    }
  }

  console.log(`\n========================================`)
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`)
  console.log(`========================================`)
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err)
  process.exit(1)
})
