import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Resolves Supabase public environment variables safely across
 * both Vite (import.meta.env) and Next.js (process.env).
 */
export function getSupabaseEnv() {
  const url =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    ''

  const key =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    ''

  const isConfigured = Boolean(
    url &&
    key &&
    !url.includes('your-project-id') &&
    !key.includes('your-supabase-anon')
  )

  return { url, key, isConfigured }
}

let browserClient: SupabaseClient<Database> | null = null

/**
 * Creates or retrieves the singleton Supabase browser client for client-side execution.
 * Built using @supabase/ssr createBrowserClient with full Database TypeScript typings.
 */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient

  const { url, key } = getSupabaseEnv()

  // Fallback placeholder during Level 2 pre-configuration to prevent runtime crashes
  const safeUrl = url || 'https://placeholder.supabase.co'
  const safeKey = key || 'placeholder-anon-key'

  browserClient = createBrowserClient<Database>(safeUrl, safeKey)
  return browserClient
}

export const supabase = createClient()
