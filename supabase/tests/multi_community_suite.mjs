// ==============================================================================
// AWS JOURNEY TRACKER - MULTI-COMMUNITY ARCHITECTURE VERIFICATION TEST
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

async function runMultiCommunitySuite() {
  console.log('=== RUNNING MULTI-COMMUNITY ARCHITECTURE VERIFICATION ===\n')
  let passed = 0
  let total = 0

  let creatorUserId = null
  let joinerUserId = null
  let createdCommunityId = null

  const testPassword = 'Password123!@#'
  const creatorEmail = `creator_${Date.now()}@example.com`
  const joinerEmail = `joiner_${Date.now()}@example.com`

  const creatorClient = createClient(SUPABASE_URL, ANON_KEY)
  const joinerClient = createClient(SUPABASE_URL, ANON_KEY)

  try {
    // --------------------------------------------------------------------------
    // Test 1: Verify Canonical Chapter Seeded for Admin
    // --------------------------------------------------------------------------
    total++
    console.log('Test 1: Canonical PSIT chapter and invite code verification...')
    const { data: psitComm, error: psitErr } = await adminClient
      .from('communities')
      .select('id, name, short_name, city, created_by')
      .eq('short_name', 'PSIT-AWS')
      .single()

    if (psitErr || !psitComm) {
      throw new Error(`Canonical PSIT chapter missing: ${psitErr?.message}`)
    }

    const { data: psitCode } = await adminClient
      .from('community_codes')
      .select('code, is_active')
      .eq('community_id', psitComm.id)
      .eq('code', 'PSIT-KNP-4821')
      .single()

    if (!psitCode || !psitCode.is_active) {
      throw new Error('Canonical PSIT-KNP-4821 code missing or inactive')
    }
    console.log(`✓ Test 1 Passed: Found canonical chapter "${psitComm.name}" with code ${psitCode.code}`)
    passed++

    // --------------------------------------------------------------------------
    // Test 2: Provision Regular Member A (Creator)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 2: Provision regular Member A with role = "member"...')
    const { data: cUser, error: cErr } = await adminClient.auth.admin.createUser({
      email: creatorEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Community Creator' },
    })
    if (cErr) throw new Error(`Creator setup failed: ${cErr.message}`)
    creatorUserId = cUser.user.id

    // Check creator's public.profiles role is 'member'
    const { data: cProf } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', creatorUserId)
      .single()

    if (cProf.role !== 'member') {
      throw new Error(`Expected role 'member', got '${cProf.role}'`)
    }
    console.log(`✓ Test 2 Passed: Member A provisioned with role = '${cProf.role}'`)
    passed++

    // --------------------------------------------------------------------------
    // Test 3: Member A creates a community directly (RLS check)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 3: Member A creates their own community without admin privileges...')
    const { error: loginErr } = await creatorClient.auth.signInWithPassword({
      email: creatorEmail,
      password: testPassword,
    })
    if (loginErr) throw new Error(`Member A login failed: ${loginErr.message}`)

    const { data: newComm, error: createCommErr } = await creatorClient
      .from('communities')
      .insert({
        name: 'IIT Delhi AWS Builders',
        short_name: 'IITD-AWS',
        institution: 'IIT Delhi',
        institution_name: 'Indian Institute of Technology Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        description: 'Independent AWS student builder group at IIT Delhi',
        manager_id: creatorUserId,
        created_by: creatorUserId,
      })
      .select()
      .single()

    if (createCommErr || !newComm) {
      throw new Error(`Community creation failed: ${createCommErr?.message}`)
    }
    createdCommunityId = newComm.id
    console.log(`✓ Test 3 Passed: Community "${newComm.name}" successfully created by regular member`)
    passed++

    // --------------------------------------------------------------------------
    // Test 4: Member A's profile role remains strictly "member" (Zero privilege leak)
    // --------------------------------------------------------------------------
    total++
    console.log('Test 4: Verify Member A profile role remains "member" after community creation...')
    const { data: cProfAfter } = await creatorClient
      .from('profiles')
      .select('role')
      .eq('id', creatorUserId)
      .single()

    if (cProfAfter.role !== 'member') {
      throw new Error(`Privilege leak detected! Profile role escalated to '${cProfAfter.role}'`)
    }
    console.log(`✓ Test 4 Passed: Profile role strictly unchanged: '${cProfAfter.role}'`)
    passed++

    // --------------------------------------------------------------------------
    // Test 5: Verify trigger enrolled Member A as "manager" in community_members
    // --------------------------------------------------------------------------
    total++
    console.log('Test 5: Verify handle_community_created trigger enrolled Member A as manager...')
    const { data: mRecord, error: mErr } = await adminClient
      .from('community_members')
      .select('role, status')
      .eq('community_id', createdCommunityId)
      .eq('user_id', creatorUserId)
      .single()

    if (mErr || !mRecord || mRecord.role !== 'manager' || mRecord.status !== 'active') {
      throw new Error(`Expected active manager in community_members, got ${JSON.stringify(mRecord)}`)
    }
    console.log(`✓ Test 5 Passed: Creator auto-enrolled as '${mRecord.role}' (${mRecord.status})`)
    passed++

    // --------------------------------------------------------------------------
    // Test 6: Verify trigger generated active invite code
    // --------------------------------------------------------------------------
    total++
    console.log('Test 6: Verify auto-generated invite code for new community...')
    const { data: codeRecord, error: codeErr } = await adminClient
      .from('community_codes')
      .select('code, is_active')
      .eq('community_id', createdCommunityId)
      .single()

    if (codeErr || !codeRecord || !codeRecord.code) {
      throw new Error(`Invite code missing: ${codeErr?.message}`)
    }
    console.log(`✓ Test 6 Passed: Auto-generated code "${codeRecord.code}" (active: ${codeRecord.is_active})`)
    passed++

    // --------------------------------------------------------------------------
    // Test 7: Verify get_user_communities() RPC for Creator
    // --------------------------------------------------------------------------
    total++
    console.log('Test 7: Execute get_user_communities() RPC for creator...')
    const { data: creatorComms, error: rpcErr } = await creatorClient.rpc('get_user_communities')
    if (rpcErr) throw new Error(`get_user_communities failed: ${rpcErr.message}`)

    const foundInRpc = creatorComms.find((c) => c.id === createdCommunityId)
    if (!foundInRpc || foundInRpc.role !== 'manager') {
      throw new Error(`Expected community in get_user_communities with role manager`)
    }
    console.log(`✓ Test 7 Passed: get_user_communities returned "${foundInRpc.name}" with role '${foundInRpc.role}'`)
    passed++

    // --------------------------------------------------------------------------
    // Test 8: Member B Joins using Code
    // --------------------------------------------------------------------------
    total++
    console.log('Test 8: Provision Member B and join community using code...')
    const { data: jUser, error: jErr } = await adminClient.auth.admin.createUser({
      email: joinerEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Joining Student' },
    })
    if (jErr) throw new Error(`Joiner setup failed: ${jErr.message}`)
    joinerUserId = jUser.user.id

    const { error: jLoginErr } = await joinerClient.auth.signInWithPassword({
      email: joinerEmail,
      password: testPassword,
    })
    if (jLoginErr) throw new Error(`Joiner login failed: ${jLoginErr.message}`)

    const { data: joinRes, error: joinRpcErr } = await joinerClient.rpc('join_community_by_code', {
      p_code: codeRecord.code,
    })
    if (joinRpcErr || !joinRes?.success) {
      throw new Error(`Join failed: ${joinRpcErr?.message || JSON.stringify(joinRes)}`)
    }
    console.log(`✓ Test 8 Passed: Member B joined "${joinRes.name}" successfully`)
    passed++

    // --------------------------------------------------------------------------
    // Test 9: Member B gets role = "member" in get_user_communities
    // --------------------------------------------------------------------------
    total++
    console.log('Test 9: Verify Member B role in get_user_communities is "member"...')
    const { data: joinerComms, error: jCommsErr } = await joinerClient.rpc('get_user_communities')
    if (jCommsErr) throw new Error(`Joiner comms RPC error: ${jCommsErr.message}`)

    const joinedComm = joinerComms.find((c) => c.id === createdCommunityId)
    if (!joinedComm || joinedComm.role !== 'member') {
      throw new Error(`Expected role 'member', got '${joinedComm?.role}'`)
    }
    console.log(`✓ Test 9 Passed: Member B community role is '${joinedComm.role}' (Member count: ${joinedComm.member_count})`)
    passed++

    // --------------------------------------------------------------------------
    // Test 10: RLS Isolation: Member B cannot update Community A
    // --------------------------------------------------------------------------
    total++
    console.log('Test 10: Verify Member B cannot update Community A details...')
    const { data: badUpdate } = await joinerClient
      .from('communities')
      .update({ name: 'Hacked Community Name' })
      .eq('id', createdCommunityId)
      .select()

    if (badUpdate && badUpdate.length > 0) {
      throw new Error('RLS breach! Non-manager member was able to update community')
    }
    console.log('✓ Test 10 Passed: Update blocked by RLS for non-manager')
    passed++

    // --------------------------------------------------------------------------
    // Test 11: Manager can update their own Community
    // --------------------------------------------------------------------------
    total++
    console.log('Test 11: Verify Manager can update their own community...')
    const { data: goodUpdate, error: guErr } = await creatorClient
      .from('communities')
      .update({ description: 'Updated by chapter manager' })
      .eq('id', createdCommunityId)
      .select()

    if (guErr || !goodUpdate || goodUpdate.length === 0) {
      throw new Error(`Manager update failed: ${guErr?.message}`)
    }
    console.log(`✓ Test 11 Passed: Manager successfully updated description to "${goodUpdate[0].description}"`)
    passed++

  } catch (err) {
    console.error(`\n❌ TEST SUITE FAILED: ${err.message}`)
    process.exitCode = 1
  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---')
    if (createdCommunityId) {
      await adminClient.from('community_codes').delete().eq('community_id', createdCommunityId)
      await adminClient.from('community_members').delete().eq('community_id', createdCommunityId)
      await adminClient.from('communities').delete().eq('id', createdCommunityId)
      console.log(`Cleaned up community: ${createdCommunityId}`)
    }
    if (creatorUserId) {
      await adminClient.auth.admin.deleteUser(creatorUserId)
      console.log(`Cleaned up creator: ${creatorUserId}`)
    }
    if (joinerUserId) {
      await adminClient.auth.admin.deleteUser(joinerUserId)
      console.log(`Cleaned up joiner: ${joinerUserId}`)
    }

    console.log('\n========================================')
    console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`)
    console.log('========================================\n')
  }
}

runMultiCommunitySuite()
