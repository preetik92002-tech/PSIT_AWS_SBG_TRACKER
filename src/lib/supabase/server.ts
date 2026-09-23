import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getSupabaseEnv } from './client'

export interface CookieHandler {
  get: (name: string) => string | undefined | Promise<string | undefined>
  set: (name: string, value: string, options: CookieOptions) => void | Promise<void>
  remove: (name: string, options: CookieOptions) => void | Promise<void>
}

/**
 * Creates a server-side Supabase client with cookie persistence.
 * Compatible with Next.js Server Components, Server Actions, and Route Handlers.
 */
export function createServerSupabaseClient(
  cookieHandler: CookieHandler
): SupabaseClient<Database> {
  const { url, key } = getSupabaseEnv()

  const safeUrl = url || 'https://placeholder.supabase.co'
  const safeKey = key || 'placeholder-anon-key'

  return createServerClient<Database>(safeUrl, safeKey, {
    cookies: {
      get(name: string) {
        return cookieHandler.get(name)
      },
      set(name: string, value: string, options: CookieOptions) {
        return cookieHandler.set(name, value, options)
      },
      remove(name: string, options: CookieOptions) {
        return cookieHandler.remove(name, options)
      },
    },
  })
}
