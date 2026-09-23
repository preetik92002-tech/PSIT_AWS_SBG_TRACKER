import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getSupabaseEnv } from './client'

/**
 * Server-only Supabase client initialized with the SERVICE_ROLE_KEY.
 * WARNING: Bypasses Row Level Security (RLS). NEVER expose to browser.
 */
export function createAdminClient(): SupabaseClient<Database> {
  // Ensure this function is never executed in client-side browser contexts
  if (typeof window !== 'undefined') {
    throw new Error('FATAL SECURITY ERROR: createAdminClient cannot be invoked on the client side.')
  }

  const { url } = getSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables for admin client.'
    )
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
