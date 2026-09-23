// ==============================================================================
// AWS JOURNEY TRACKER — SIGNUP FLOW FOR MANAGERS & MEMBERS VERIFICATION TEST
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
const anonClient = createClient(SUPABASE_URL, ANON_KEY)

async function runSignupVerification() {
  console.log('==================================================================')
  console.log('AWS JOURNEY TRACKER — SIGNUP FLOW COMPREHENSIVE VERIFICATION')
  console.log('==================================================================\n')

  let passed = 0
  let total = 0

  function record(testName, ok, detail = '') {
    total++
    if (ok) passed++
    console.log(`[${ok ? '✓ PASS' : '✗ FAIL'}] ${testName}${detail ? ' — ' + detail : ''}`)
  }

  const ts = Date.now()
  const mgrEmail = `test_mgr_intent_${ts}@gmail.com`
  const mbrEmail = `test_mbr_intent_${ts}@gmail.com`
  const pwd = 'ValidPassword123!@#'

  let mgrUserId = null
  let mbrUserId = null

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Manager Signup Simulation (Intent = 'manager')
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Manager Signup via Supabase Auth ---')
    // We provision user through admin client with user_metadata to simulate signUp({ options: { data } })
    // without triggering 3rd party SMTP rate limits on free-tier Supabase
    const { data: mgrUser, error: mgrErr } = await adminClient.auth.admin.createUser({
      email: mgrEmail,
      password: pwd,
      email_confirm: true,
      user_metadata: {
        full_name: 'Alpha Manager',
        onboarding_intent: 'manager',
      },
    })
    record('Manager User Creation in Supabase Auth', !mgrErr && !!mgrUser?.user?.id, `UID: ${mgrUser?.user?.id}`)
    mgrUserId = mgrUser?.user?.id

    // Verify Profile trigger populated profile with 'member' role (NOT admin!)
    const { data: mgrProf } = await adminClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', mgrUserId)
      .single()

    record(
      'Manager Intent Security: No Automatic Admin Escalation',
      mgrProf?.role === 'member',
      `Profile role is safely initialized to: "${mgrProf?.role}" (not admin/manager)`
    )

    // Verify Manager Can Authenticate with Password
    const clientMgr = createClient(SUPABASE_URL, ANON_KEY)
    const { data: mgrLogin, error: mgrLoginErr } = await clientMgr.auth.signInWithPassword({
      email: mgrEmail,
      password: pwd,
    })
    record('Manager Login & Session Token', !mgrLoginErr && !!mgrLogin?.session, `Session active for ${mgrEmail}`)

    // -------------------------------------------------------------------------
    // TEST 2: Member Signup Simulation (Intent = 'member')
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Member Signup via Supabase Auth ---')
    const { data: mbrUser, error: mbrErr } = await adminClient.auth.admin.createUser({
      email: mbrEmail,
      password: pwd,
      email_confirm: true,
      user_metadata: {
        full_name: 'Beta Member',
        onboarding_intent: 'member',
      },
    })
    record('Member User Creation in Supabase Auth', !mbrErr && !!mbrUser?.user?.id, `UID: ${mbrUser?.user?.id}`)
    mbrUserId = mbrUser?.user?.id

    // Verify Profile trigger
    const { data: mbrProf } = await adminClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', mbrUserId)
      .single()

    record(
      'Member Profile Security: Verified Standard Member Role',
      mbrProf?.role === 'member',
      `Profile role: "${mbrProf?.role}"`
    )

    // Verify Member Can Authenticate
    const clientMbr = createClient(SUPABASE_URL, ANON_KEY)
    const { data: mbrLogin, error: mbrLoginErr } = await clientMbr.auth.signInWithPassword({
      email: mbrEmail,
      password: pwd,
    })
    record('Member Login & Session Token', !mbrLoginErr && !!mbrLogin?.session, `Session active for ${mbrEmail}`)

    // -------------------------------------------------------------------------
    // TEST 3: Validation & Error Handling
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Validation & Security Bounds ---')

    // 1. Duplicate Email
    const { error: dupErr } = await adminClient.auth.admin.createUser({
      email: mgrEmail,
      password: pwd,
      email_confirm: true,
    })
    record(
      'Duplicate Email Blocked',
      !!dupErr,
      dupErr ? dupErr.message : 'Blocked duplicate email'
    )

    // 2. Short / Weak Password
    const clientWeak = createClient(SUPABASE_URL, ANON_KEY)
    const { error: weakErr } = await clientWeak.auth.signUp({
      email: `weak_pwd_${ts}@gmail.com`,
      password: '123',
    })
    record(
      'Weak Password (< 6 chars) Rejected by Supabase',
      !!weakErr,
      weakErr ? weakErr.message : 'Rejected'
    )

    // 3. Invalid Email Format
    const { error: invErr } = await clientWeak.auth.signUp({
      email: 'not-an-email',
      password: 'ValidPassword123!@#',
    })
    record(
      'Invalid Email Format Rejected by Supabase',
      !!invErr,
      invErr ? invErr.message : 'Rejected'
    )

    // 4. Session Persistence after Sign In
    const { data: retainedSess } = await clientMgr.auth.getSession()
    record(
      'Session Persistence Check',
      retainedSess?.session?.user?.id === mgrUserId,
      `Retained session for user ID: ${mgrUserId}`
    )

    // -------------------------------------------------------------------------
    // TEST 4: Existing Users Still Function
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Existing Account Integrity ---')

    // Verify existing communities and members are intact
    const { count: commCount } = await adminClient.from('communities').select('*', { count: 'exact', head: true })
    const { count: memberCount } = await adminClient.from('community_members').select('*', { count: 'exact', head: true })

    record(
      'Existing Community Integrity',
      (commCount || 0) > 0,
      `Existing active communities count: ${commCount}`
    )
    record(
      'Existing Members Integrity',
      (memberCount || 0) > 0,
      `Existing enrolled members count: ${memberCount}`
    )

  } catch (err) {
    console.error('Verification error:', err)
  } finally {
    console.log('\n--- CLEANUP: Removing Test Users ---')
    if (mgrUserId) await adminClient.auth.admin.deleteUser(mgrUserId)
    if (mbrUserId) await adminClient.auth.admin.deleteUser(mbrUserId)
    console.log('Cleanup finished.')
  }

  console.log('\n==================================================================')
  console.log(`SIGNUP VERIFICATION: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`)
  console.log('==================================================================')
}

runSignupVerification()
