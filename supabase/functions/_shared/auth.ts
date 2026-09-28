import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

export interface AuthenticatedUser {
  id: string
  email: string
}

export function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

export async function verifyUserAndManagerRole(
  req: Request,
  communityId: string
): Promise<{ user: AuthenticatedUser; supabaseAdmin: ReturnType<typeof getSupabaseAdmin> }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Missing Authorization header')
  }

  const supabaseAdmin = getSupabaseAdmin()
  const token = authHeader.replace(/^Bearer\s+/i, '')

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    throw new Error(`Authentication failed: ${authError?.message || 'Invalid user'}`)
  }

  // Verify community membership & manager authorization
  const { data: memberRecord, error: memberError } = await supabaseAdmin
    .from('community_members')
    .select('role, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError || !memberRecord) {
    throw new Error('Forbidden: You are not a member of this community')
  }

  if (memberRecord.status !== 'active') {
    throw new Error('Forbidden: Your community membership is not active')
  }

  if (memberRecord.role !== 'manager') {
    // Check if user is the founder/creator
    const { data: comm } = await supabaseAdmin
      .from('communities')
      .select('created_by, manager_id')
      .eq('id', communityId)
      .maybeSingle()

    const isOwner = comm?.created_by === user.id || comm?.manager_id === user.id
    if (!isOwner) {
      throw new Error('Forbidden: Only community managers can perform this operation')
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email || '',
    },
    supabaseAdmin,
  }
}
