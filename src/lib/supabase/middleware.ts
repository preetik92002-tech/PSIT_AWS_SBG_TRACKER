import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { getSupabaseEnv } from './client'

/**
 * Standard session refresher for Next.js / Edge Middleware.
 * Refreshes auth tokens stored in cookies on incoming requests.
 */
export async function updateSession(
  request: {
    cookies: {
      get: (name: string) => { value: string } | undefined
      set: (options: { name: string; value: string } & CookieOptions) => void
    }
  },
  response: {
    cookies: {
      set: (options: { name: string; value: string } & CookieOptions) => void
    }
  }
) {
  const { url, key } = getSupabaseEnv()
  if (!url || !key) return

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options, maxAge: 0 })
        response.cookies.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
  })

  // Refresh user session safely
  await supabase.auth.getUser()
}
